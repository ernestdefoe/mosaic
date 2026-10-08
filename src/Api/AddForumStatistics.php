<?php

/*
 * This file is part of ernestdefoe/mosaic.
 *
 * Copyright (c) Ernest Defoe.
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

namespace Ernestdefoe\Mosaic\Api;

use Carbon\Carbon;
use Ernestdefoe\Mosaic\SupportTicket;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\User\Guest;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\QueryException;
use Psr\Log\LoggerInterface;

/**
 * Computes the four count attributes the mosaic hero strip can't
 * otherwise resolve on a vanilla Flarum 2 install: member count,
 * current-online count, online-users list, and resolved-ticket count
 * from linkrobins/support.
 *
 * Instance class (not static) so the container can wire its
 * dependencies. Every read goes through a 60 s cache because these
 * stats are pulled on every forum-page bootstrap and used to be
 * recomputed for every visitor — a few hundred queries per minute
 * just to paint the hero. The cache TTL is short enough that the
 * "Online now" tile still feels live, long enough that the bulk of
 * concurrent requests during a traffic burst share one DB hit.
 */
class AddForumStatistics
{
    /**
     * Length of the rolling window used by the "online" indicator,
     * mirroring Flarum's stock 5-minute threshold.
     */
    private const ONLINE_WINDOW_MINUTES = 5;

    /** Cache TTL for every stat method, in seconds. */
    private const CACHE_TTL = 60;

    public function __construct(
        private CacheRepository $cache,
        private LoggerInterface $log,
    ) {}

    /** All registered (non-soft-deleted) users. */
    public function memberCount(): ?int
    {
        return $this->cache->remember('mosaic.stats.memberCount', self::CACHE_TTL, function () {
            try {
                return User::query()->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] memberCount query failed', ['exception' => $e]);
                return null;
            }
        });
    }

    /**
     * Forum-wide discussion total. The hero's "Discussions" tile reads this
     * instead of counting the ~20 discussions the SPA happens to have in its
     * store on the current page.
     */
    public function discussionCount(): ?int
    {
        return $this->cache->remember('mosaic.stats.discussionCount', self::CACHE_TTL, function () {
            try {
                return Discussion::query()->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] discussionCount query failed', ['exception' => $e]);
                return null;
            }
        });
    }

    /**
     * Forum-wide comment-post total. Counts only `comment`-type posts (the
     * real reply count), excluding event posts like renames and tag changes —
     * the same definition flarum/statistics uses.
     */
    public function postCount(): ?int
    {
        return $this->cache->remember('mosaic.stats.postCount', self::CACHE_TTL, function () {
            try {
                return Post::query()->where('type', 'comment')->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] postCount query failed', ['exception' => $e]);
                return null;
            }
        });
    }

    /**
     * Users seen in the last 5 minutes — the same threshold Flarum's
     * own "online" indicator uses.
     */
    public function onlineCount(): ?int
    {
        return $this->cache->remember('mosaic.stats.onlineCount', self::CACHE_TTL, function () {
            try {
                return User::query()
                    ->where('last_seen_at', '>=', Carbon::now()->subMinutes(self::ONLINE_WINDOW_MINUTES))
                    ->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] onlineCount query failed', ['exception' => $e]);
                return null;
            }
        });
    }

    /**
     * Returns the most-recently-active online users for the hero
     * dropdown. Each entry: {id, username, displayName, avatarUrl}.
     *
     * Privacy:
     *   - Filters out users with `preferences.discloseOnline = false`
     *     (Flarum's per-user opt-out for online visibility).
     *
     * Bounds:
     *   - Fetches a small over-quota (limit + 20) so the post-filter
     *     for opt-outs doesn't shrink the visible list below `$limit`
     *     on installs where many users opt out.
     *   - Capped at 100 either way — large communities should expose a
     *     dedicated "online users" page rather than ballooning the
     *     forum payload, which serializeToForum hands to every guest.
     *
     * Returns [] on any failure so the JS dropdown shows an
     * empty-state hint instead of breaking the hero render.
     */
    public function onlineUsers(int $limit = 50): array
    {
        $limit = max(1, min($limit, 100));
        $key   = sprintf('mosaic.stats.onlineUsers.%d', $limit);

        return $this->cache->remember($key, self::CACHE_TTL, function () use ($limit) {
            try {
                return User::query()
                    ->where('last_seen_at', '>=', Carbon::now()->subMinutes(self::ONLINE_WINDOW_MINUTES))
                    ->orderByDesc('last_seen_at')
                    ->limit($limit + 20)
                    ->get()
                    ->filter(fn (User $u) => $u->getPreference('discloseOnline', true))
                    ->take($limit)
                    ->map(fn (User $u) => $this->serializeOnlineUser($u))
                    ->values()
                    ->toArray();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] onlineUsers query failed', ['exception' => $e]);
                return [];
            }
        });
    }

    /**
     * Project a User into the shape the hero dropdown expects. A null
     * avatarUrl makes the frontend fall back to initials.
     */
    private function serializeOnlineUser(User $u): array
    {
        return [
            'id'          => (int) $u->id,
            'username'    => $u->username,
            'displayName' => $u->display_name ?: $u->username,
            // The avatar_url attribute: User has no avatarUrl() method, and
            // calling one threw (into a catch that hid it) for every user.
            'avatarUrl'   => $u->avatar_url,
        ];
    }

    /**
     * Count of tickets in the resolved state from linkrobins/support.
     *
     * Returns null when the support extension's table isn't present
     * (extension not installed or table name differs) so the hero
     * tile renders "—" rather than a misleading 0. The table-existence
     * probe is a single SHOW TABLES query cached for the full process
     * lifetime — the previous version threw a QueryException once per
     * candidate table and caught it as control flow, which is
     * expensive and indistinguishable from a real DB error.
     */
    public function resolvedTicketCount(): ?int
    {
        return $this->cache->remember('mosaic.stats.resolvedTicketCount', self::CACHE_TTL, function () {
            $table = $this->supportTable();
            if ($table === null) {
                return null;
            }

            try {
                return (int) SupportTicket::queryTable($table)
                    ->where('status', 'resolved')
                    ->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] resolvedTicketCount query failed', ['exception' => $e]);
                return null;
            }
        });
    }

    /**
     * Resolve the support-tickets table name once and cache for the
     * full process lifetime. linkrobins/support's canonical table is
     * `linkrobins_support_tickets`; very early installs used the
     * shorter `support_tickets`. Either gets returned if present,
     * with the canonical name preferred. Null when neither exists.
     *
     * Cached separately from the count so the schema lookup itself
     * doesn't run on every cache miss.
     */
    private function supportTable(): ?string
    {
        $cached = $this->cache->get('mosaic.stats.supportTable');
        if ($cached !== null) {
            return $cached === '' ? null : $cached;
        }

        $schema = SupportTicket::query()->getConnection()->getSchemaBuilder();
        $resolved = '';
        foreach (['linkrobins_support_tickets', 'support_tickets'] as $candidate) {
            try {
                if ($schema->hasTable($candidate)) {
                    $resolved = $candidate;
                    break;
                }
            } catch (QueryException $e) {
                // hasTable() on some drivers throws if the connection
                // is gone — log and keep walking the candidates.
                $this->log->warning('[mosaic] supportTable probe failed', [
                    'table'     => $candidate,
                    'exception' => $e,
                ]);
            }
        }

        /* Cache the negative result too — null means "extension not
         * installed" which doesn't change without an admin action. */
        $this->cache->put('mosaic.stats.supportTable', $resolved, self::CACHE_TTL);

        return $resolved === '' ? null : $resolved;
    }

    /**
     * Forum-wide top contributors by comment count (cached). The sidebar panel
     * reads this instead of ranking the handful of users that happen to be in
     * the SPA store on the current page. Only public profile data is exposed.
     *
     * @return list<array<string, mixed>>
     */
    public function topContributors(int $limit = 5): array
    {
        $limit = max(1, min($limit, 20));

        return $this->cache->remember('mosaic.stats.topContributors.v2.' . $limit, self::CACHE_TTL, function () use ($limit) {
            try {
                return User::query()
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('comment_count')
                    ->orderByDesc('discussion_count')
                    ->with('groups')
                    ->limit($limit)
                    ->get()
                    ->map(fn (User $u) => $this->serializeContributor($u))
                    ->values()
                    ->toArray();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] topContributors query failed', ['exception' => $e]);
                return [];
            }
        });
    }

    /** Project a User into the shape the contributor panel expects. */
    private function serializeContributor(User $u): array
    {
        $displayName = $u->display_name ?: $u->username;
        $avatarUrl = $u->avatar_url;

        $comments    = (int) $u->comment_count;
        $discussions = (int) $u->discussion_count;

        // Surface a role badge only for staff-ish primary groups, mirroring
        // the frontend's previous heuristic.
        $role  = null;
        $group = $u->groups->first();
        if ($group) {
            $name = $group->name_singular ?? null;
            if ($name && preg_match('/(staff|mod|admin|expert)/i', $name)) {
                $role = $name;
            }
        }

        return [
            'name'      => $displayName,
            'username'  => $u->username,
            'role'      => $role,
            'meta'      => $comments === 1 ? '1 post' : ($comments . ' posts'),
            'points'    => $comments + $discussions,
            'avatarUrl' => $avatarUrl,
            'href'      => '/u/' . rawurlencode((string) $u->username),
        ];
    }

    /**
     * Forum-wide trending discussions by participant count (cached). Computed
     * against GUEST visibility so the cached list is safe to serve to every
     * viewer — it never surfaces a discussion a guest couldn't already see.
     *
     * @return list<array<string, mixed>>
     */
    public function trending(int $limit = 4): array
    {
        $limit = max(1, min($limit, 10));

        return $this->cache->remember('mosaic.stats.trending.' . $limit, self::CACHE_TTL, function () use ($limit) {
            try {
                return Discussion::query()
                    ->whereVisibleTo(new Guest())
                    ->whereNull('hidden_at')
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('participant_count')
                    ->orderByDesc('comment_count')
                    ->limit($limit)
                    ->get()
                    ->map(fn (Discussion $d) => [
                        'title' => (string) $d->title,
                        'meta'  => ((int) $d->comment_count) . ' replies',
                        // /d/{id} redirects to the canonical slug URL, so we
                        // avoid invoking the slug driver here.
                        'href'  => '/d/' . (int) $d->id,
                    ])
                    ->values()
                    ->toArray();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] trending query failed', ['exception' => $e]);
                return [];
            }
        });
    }
}
