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
use Illuminate\Database\ConnectionInterface;
use Throwable;

/**
 * Computes the three count attributes the mosaic hero strip can't
 * otherwise resolve on a vanilla Flarum 2 install: member count,
 * current-online count, and resolved-ticket count from
 * linkrobins/support.
 *
 * We deliberately avoid the Schema and DB facades here — depending on
 * how Flarum 2's container is set up during the ForumResource fields
 * closure, the facade root may not be registered, and a call to
 * `Schema::hasTable()` will throw "A facade root has not been set."
 * The try/catch swallowed that silently and the tile rendered "—"
 * even when the tickets table did in fact exist.
 *
 * Resolving Illuminate\Database\ConnectionInterface from the container
 * gives us a Connection directly and bypasses facade registration.
 */
class AddForumStatistics
{
    /** All registered (non-soft-deleted) users. */
    public static function memberCount(): ?int
    {
        try {
            return User::query()->count();
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Users seen in the last 5 minutes — the same threshold Flarum's
     * own "online" indicator uses.
     */
    public static function onlineCount(): ?int
    {
        try {
            return User::query()
                ->where('last_seen_at', '>=', Carbon::now()->subMinutes(5))
                ->count();
        } catch (Throwable $e) {
            return null;
        }
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
    public static function onlineUsers(int $limit = 50): array
    {
        $limit = max(1, min($limit, 100));

        try {
            return User::query()
                ->where('last_seen_at', '>=', Carbon::now()->subMinutes(5))
                ->orderByDesc('last_seen_at')
                ->limit($limit + 20)
                ->get()
                ->filter(fn (User $u) => $u->getPreference('discloseOnline', true))
                ->take($limit)
                ->map(fn (User $u) => self::serializeOnlineUser($u))
                ->values()
                ->toArray();
        } catch (Throwable $e) {
            error_log('[mosaic] onlineUsers failed: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return [];
        }
    }

    /**
     * Project a User into the shape the hero dropdown expects.
     *
     * Each accessor is wrapped because the Schema-field closure can
     * run in contexts where the DisplayName driver or UrlGenerator
     * isn't bound yet (avatarUrl()/display_name throw). A per-user
     * catch lets one bad accessor produce a partial row instead of
     * collapsing the entire list to [].
     */
    private static function serializeOnlineUser(User $u): array
    {
        $displayName = $u->username;
        try { $displayName = $u->display_name ?: $u->username; } catch (Throwable $e) { /* keep username */ }

        $avatarUrl = null;
        try { $avatarUrl = $u->avatarUrl(); } catch (Throwable $e) { /* leave null, frontend uses initials fallback */ }

        return [
            'id' => (int) $u->id,
            'username' => $u->username,
            'displayName' => $displayName,
            'avatarUrl' => $avatarUrl,
        ];
    }

    /**
     * Count of tickets in the resolved state from linkrobins/support.
     *
     * Returns null when the table can't be queried (extension not
     * installed, table name differs, DB error) so the hero tile
     * renders "—" rather than a misleading 0.
     */
    public static function resolvedTicketCount(): ?int
    {
        try {
            /** @var ConnectionInterface $db */
            $db = resolve(ConnectionInterface::class);

            /*
             * Try the table name documented in linkrobins/support's
             * migration first; fall back to a bare 'support_tickets'
             * in case an older install used the shorter name. If both
             * queries throw (typical sign of a missing table) we
             * resolve to null and the JS renders "—".
             */
            $candidates = ['linkrobins_support_tickets', 'support_tickets'];

            foreach ($candidates as $table) {
                try {
                    return (int) $db->table($table)
                        ->where('status', 'resolved')
                        ->count();
                } catch (Throwable $tableErr) {
                    /* This table didn't exist — try the next candidate. */
                    continue;
                }
            }

            return null;
        } catch (Throwable $e) {
            return null;
        }
    }
}
