<?php

/*
 * This file is part of ernestdefoe/edonline.
 *
 * Copyright (c) Ernest Defoe.
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

namespace Ernestdefoe\Edonline\Api;

use Carbon\Carbon;
use Flarum\User\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Computes the three count attributes the edonline hero strip can't
 * otherwise resolve on a vanilla Flarum 2 install: member count,
 * current-online count, and resolved-ticket count from
 * linkrobins/support.
 *
 * Exposed as static helpers so they can be called directly from the
 * Schema::Integer->get() closures in extend.php without a constructor
 * dependency chain.
 *
 * Each value is computed in its own try/catch — any failure (missing
 * table, renamed column, DB hiccup) returns null for that one
 * attribute rather than poisoning the whole forum payload. The
 * Schema fields are declared ->nullable() so null renders as "—" on
 * the front-end tile instead of 0.
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
     * Returns null when the support extension isn't installed (no
     * table) so the hero tile renders "—" instead of a misleading 0.
     */
    public static function resolvedTicketCount(): ?int
    {
        try {
            if (! Schema::hasTable('linkrobins_support_tickets')) {
                return null;
            }
            return DB::table('linkrobins_support_tickets')
                ->where('status', 'resolved')
                ->count();
        } catch (Throwable $e) {
            return null;
        }
    }
}
