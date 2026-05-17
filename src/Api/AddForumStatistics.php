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
