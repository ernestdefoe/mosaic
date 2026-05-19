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
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\ConnectionInterface;
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
        private ConnectionInterface $db,
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
     * Project a User into the shape the hero dropdown expects.
     *
     * Each accessor is wrapped because the Schema-field closure can
     * run in contexts where the DisplayName driver or UrlGenerator
     * isn't bound yet (avatarUrl()/display_name throw). A per-user
     * catch lets one bad accessor produce a partial row instead of
     * collapsing the entire list to []. The catch is narrow on
     * purpose — only the framework-binding gaps surface here.
     */
    private function serializeOnlineUser(User $u): array
    {
        $displayName = $u->username;
        try { $displayName = $u->display_name ?: $u->username; } catch (\BadFunctionCallException | \RuntimeException $e) { /* keep username */ }

        $avatarUrl = null;
        try { $avatarUrl = $u->avatarUrl(); } catch (\BadFunctionCallException | \RuntimeException $e) { /* leave null, frontend uses initials fallback */ }

        return [
            'id'          => (int) $u->id,
            'username'    => $u->username,
            'displayName' => $displayName,
            'avatarUrl'   => $avatarUrl,
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
                return (int) $this->db->table($table)
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

        $schema = $this->db->getSchemaBuilder();
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
}
