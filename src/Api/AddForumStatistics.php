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
 * Adds the three count attributes the edonline hero strip can't otherwise
 * resolve on a vanilla Flarum 2 install: member count, current-online
 * count, and resolved-ticket count (from linkrobins/support).
 *
 * Wired in extend.php via:
 *   (new Extend\ApiSerializer(ForumSerializer::class))
 *       ->attributes(AddForumStatistics::class),
 *
 * Each value is computed defensively — any failure returns null for that
 * one attribute rather than poisoning the whole forum payload, so an
 * outdated extension or a missing table never breaks the IndexPage load.
 */
class AddForumStatistics
{
    public function __invoke($serializer, $forum, $attributes): array
    {
        return [
            'edonlineUserCount' => $this->memberCount(),
            'edonlineOnlineCount' => $this->onlineCount(),
            'edonlineResolvedCount' => $this->resolvedTicketCount(),
        ];
    }

    /** All registered (non-deleted) users. */
    private function memberCount(): ?int
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
    private function onlineCount(): ?int
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
    private function resolvedTicketCount(): ?int
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
