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
 * Every read goes through a 60 s cache, so concurrent page loads share one
 * query. User stats are cached per audience (guest, member, admin) and
 * discussion stats per permission group set, so one audience's result is
 * never served to another; the resolved-ticket count, shown to support staff
 * only, has one shared entry.
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
     * out event posts (renames, tag changes) and hidden replies. One query
     * over discussions instead of a visibility-scoped scan of every post.
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
     * Returns [] on a query failure (logged); the hero then shows Online
     * now as a plain figure, without the list.
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
            'avatarUrl' => $u->avatar_url,
        ];
    }

    /**
     * Resolved tickets in linkrobins/support, for its support staff only (its
     * `handleTickets` ability), as that extension shows its own ticket counts.
     * Only called while it is enabled (SupportForumAttributes is conditional).
     */
    public function resolvedTicketCount(User $actor): ?int
    {
        if ($actor->cannot('viewForum') || $actor->cannot('handleTickets')) {
            return null;
        }

        return $this->cache->remember('mosaic.stats.resolvedTicketCount', self::CACHE_TTL, function () {
            try {
                return SupportTicket::query()->where('status', 'resolved')->count();
            } catch (QueryException $e) {
                $this->log->warning('[mosaic] resolvedTicketCount query failed', ['exception' => $e]);

                return null;
            }
        });
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

        return $this->cache->remember($this->audienceKey('topContributors.v4.'.$limit, $actor), self::CACHE_TTL, function () use ($actor, $limit) {
            try {
                return User::query()
                    ->whereVisibleTo($actor)
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('comment_count')
                    ->orderByDesc('discussion_count')
                    ->with(['groups' => fn ($q) => $q->where('is_hidden', false)->orderBy('groups.id')])
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

        // A role badge for the first staff-ish group the public can see;
        // hidden groups are filtered out when the relation is loaded.
        $role = $u->groups
            ->map(fn ($group) => (string) $group->name_singular)
            ->first(fn (string $name) => (bool) preg_match('/(staff|mod|admin|expert)/i', $name));

        return [
            'name' => $displayName,
            'username' => $u->username,
            'role' => $role,
            'posts' => $comments,
            'points' => $comments + $discussions,
            'avatarUrl' => $avatarUrl,
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

        return $this->cache->remember($this->groupKey('trending.v3.'.$limit, $actor), self::CACHE_TTL, function () use ($actor, $limit) {
            try {
                return $this->publicDiscussions($actor)
                    ->where('comment_count', '>', 0)
                    ->orderByDesc('participant_count')
                    ->orderByDesc('comment_count')
                    ->limit($limit)
                    ->get()
                    ->map(fn (Discussion $d) => [
                        'id' => (int) $d->id,
                        'title' => (string) $d->title,
                        'replies' => (int) $d->comment_count,
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
