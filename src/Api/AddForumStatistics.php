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
use Flarum\Http\UrlGenerator;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Psr\Log\LoggerInterface;

/**
 * Computes the hero strip's counts and the sidebar's lists for the viewer:
 * nothing for someone who can't view the forum, no user lists for someone
 * who can't search users, and only what the viewer's groups may see.
 *
 * Every read goes through a 60 s cache keyed by audience (guest, member,
 * admin for user stats; the permission group set for discussion stats), so
 * concurrent page loads share one query and one audience's result is never
 * served to another.
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
        private UrlGenerator $url,
    ) {
    }

    /** All registered users the actor may see; null when it can't view the forum. */
    public function memberCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum')) {
            return null;
        }

        return $this->cache->remember($this->audienceKey('memberCount', $actor), self::CACHE_TTL, function () use ($actor) {
            try {
                return User::query()->whereVisibleTo($actor)->count();
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
    public function discussionCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum')) {
            return null;
        }

        return $this->cache->remember($this->groupKey('discussionCount', $actor), self::CACHE_TTL, function () use ($actor) {
            try {
                return $this->publicDiscussions($actor)->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] discussionCount query failed', ['exception' => $e]);

                return null;
            }
        });
    }

    /**
     * Comment total across the public discussions the viewer's groups can
     * see: the sum of each discussion's comment_count, which already leaves
     * out event posts (renames, tag changes) and hidden replies. One indexed
     * query instead of a visibility-scoped scan of every post.
     */
    public function postCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum')) {
            return null;
        }

        return $this->cache->remember($this->groupKey('postCount', $actor), self::CACHE_TTL, function () use ($actor) {
            try {
                return (int) $this->publicDiscussions($actor)->sum('comment_count');
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
    public function onlineCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum')) {
            return null;
        }

        return $this->cache->remember($this->audienceKey('onlineCount', $actor), self::CACHE_TTL, function () use ($actor) {
            try {
                return User::query()
                    ->whereVisibleTo($actor)
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
     *   - Empty unless the viewer can see the forum and search users,
     *     the permission core gates its own user directory on.
     *   - Capped at 100 either way — large communities should expose a
     *     dedicated "online users" page rather than ballooning the
     *     forum payload, which rides every page.
     *
     * Returns [] on any failure so the JS dropdown shows an
     * empty-state hint instead of breaking the hero render.
     */
    public function onlineUsers(User $actor, int $limit = 50): array
    {
        if (! $this->canListUsers($actor)) {
            return [];
        }

        $limit = max(1, min($limit, 100));

        return $this->cache->remember($this->audienceKey('onlineUsers.'.$limit, $actor), self::CACHE_TTL, function () use ($actor, $limit) {
            try {
                return User::query()
                    ->whereVisibleTo($actor)
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
            'id' => (int) $u->id,
            'username' => $u->username,
            'displayName' => $u->display_name ?: $u->username,
            // The avatar_url attribute: User has no avatarUrl() method, and
            // calling one threw (into a catch that hid it) for every user.
            'avatarUrl' => $u->avatar_url,
        ];
    }

    /**
     * Count of tickets in the resolved state from linkrobins/support.
     *
     * Returns null when the support extension's table isn't present
     * (extension not installed or table name differs) so the hero
     * tile renders "—" rather than a misleading 0. The table lookup is
     * cached on its own (see supportTable()).
     */
    public function resolvedTicketCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum')) {
            return null;
        }

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
     * Resolve the support-tickets table name, cached for the same 60 s
     * as the stats. linkrobins/support's canonical table is
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
                    'table' => $candidate,
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
    public function topContributors(User $actor, int $limit = 5): array
    {
        if (! $this->canListUsers($actor)) {
            return [];
        }

        $limit = max(1, min($limit, 20));

        return $this->cache->remember($this->audienceKey('topContributors.v2.'.$limit, $actor), self::CACHE_TTL, function () use ($actor, $limit) {
            try {
                return User::query()
                    ->whereVisibleTo($actor)
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('comment_count')
                    ->orderByDesc('discussion_count')
                    ->with(['groups' => fn ($q) => $q->where('is_hidden', false)])
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

        $comments = (int) $u->comment_count;
        $discussions = (int) $u->discussion_count;

        // Surface a role badge only for staff-ish groups the public can see;
        // hidden groups are filtered out when the relation is loaded.
        $role = null;
        $group = $u->groups->first();
        if ($group) {
            $name = $group->name_singular ?? null;
            if ($name && preg_match('/(staff|mod|admin|expert)/i', $name)) {
                $role = $name;
            }
        }

        return [
            'name' => $displayName,
            'username' => $u->username,
            'role' => $role,
            'meta' => $comments === 1 ? '1 post' : ($comments.' posts'),
            'points' => $comments + $discussions,
            'avatarUrl' => $avatarUrl,
            'href' => $this->url->to('forum')->path('u/'.rawurlencode((string) $u->username)),
        ];
    }

    /**
     * Trending discussions by participant count, among the public discussions
     * the viewer's groups can see (cached per group set), so members-only
     * forums still have a list and no viewer gets a discussion they couldn't
     * open.
     *
     * @return list<array<string, mixed>>
     */
    public function trending(User $actor, int $limit = 4): array
    {
        if ($actor->cannot('viewForum')) {
            return [];
        }

        $limit = max(1, min($limit, 10));

        return $this->cache->remember($this->groupKey('trending.'.$limit, $actor), self::CACHE_TTL, function () use ($actor, $limit) {
            try {
                return $this->publicDiscussions($actor)
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('participant_count')
                    ->orderByDesc('comment_count')
                    ->limit($limit)
                    ->get()
                    ->map(fn (Discussion $d) => [
                        'title' => (string) $d->title,
                        'meta' => ((int) $d->comment_count).' replies',
                        // d/{id} redirects to the canonical slug URL, so we
                        // avoid invoking the slug driver here. Built from the
                        // forum's base URL so sub-directory installs link right.
                        'href' => $this->url->to('forum')->path('d/'.(int) $d->id),
                    ])
                    ->values()
                    ->toArray();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] trending query failed', ['exception' => $e]);

                return [];
            }
        });
    }

    /**
     * Listing users is the same permission core gates its user directory on,
     * on top of being allowed into the forum at all.
     */
    private function canListUsers(User $actor): bool
    {
        return $actor->can('viewForum') && $actor->can('searchUsers');
    }

    /**
     * Cache key for a user list or user count. Core's user visibility depends
     * only on the audience, so guests, members and admins each get their own
     * entry and one audience's list is never served to another.
     */
    private function audienceKey(string $stat, User $actor): string
    {
        $audience = $actor->isGuest() ? 'guest' : ($actor->isAdmin() ? 'admin' : 'member');

        return 'mosaic.stats.'.$stat.'.'.$audience;
    }

    /**
     * Discussions the viewer can see that look the same to everyone with the
     * same groups: private discussions (recipients) and hidden ones (their
     * authors, moderators) depend on the person, so they are left out and
     * the result can be cached per group set.
     *
     * @return Builder<Discussion>
     */
    private function publicDiscussions(User $actor): Builder
    {
        return Discussion::query()
            ->whereVisibleTo($actor)
            ->where('discussions.is_private', false)
            ->whereNull('discussions.hidden_at');
    }

    /**
     * Cache key for a discussion stat. Tag permissions follow the groups a
     * viewer's permissions come from, so everyone in the same groups shares
     * one entry: a handful per forum, not one per member.
     */
    private function groupKey(string $stat, User $actor): string
    {
        $groups = array_unique(array_map('intval', $actor->permissionGroupIds()));
        sort($groups);

        return 'mosaic.stats.'.$stat.'.g'.implode('-', $groups);
    }
}
