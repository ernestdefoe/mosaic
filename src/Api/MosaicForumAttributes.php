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

use Flarum\Api\Schema;

/**
 * Builds the mosaic fields added to ForumResource.
 *
 * Invokable class (resolved by the container via
 * Extend\ApiResource::fields(self::class)) so AddForumStatistics and
 * AddForumSettings arrive through constructor injection instead of resolve()
 * calls inside a closure — the dependency graph is explicit and the class is
 * unit-testable.
 *
 * Two groups of fields:
 *   1. Statistics — counts + lists the hero strip and sidebar panels read,
 *      computed forum-wide and cached server-side in AddForumStatistics.
 *   2. Settings bridge — admin-saved booleans/strings exposed so the forum
 *      frontend can read them via app.forum.attribute(key).
 */
class MosaicForumAttributes
{
    public function __construct(
        private AddForumStatistics $stats,
        private AddForumSettings $settings,
    ) {
    }

    public function __invoke(): array
    {
        $hideOnlineUsers = $this->settings->bool('mosaicHideOnlineUsers');

        return [
            /* -- Statistics (hero stats strip) -- */

            Schema\Integer::make('mosaicUserCount')
                ->nullable()
                ->get(fn () => $this->stats->memberCount()),

            Schema\Integer::make('mosaicDiscussionCount')
                ->nullable()
                ->get(fn () => $this->stats->discussionCount()),

            Schema\Integer::make('mosaicPostCount')
                ->nullable()
                ->get(fn () => $this->stats->postCount()),

            Schema\Integer::make('mosaicOnlineCount')
                ->nullable()
                ->get(fn () => $this->stats->onlineCount()),

            /* Recently-active users for the hero "Online now" dropdown.
             * Capped + privacy-filtered server-side; empty when disabled. */
            Schema\Arr::make('mosaicOnlineUsers')
                ->get(fn () => $hideOnlineUsers ? [] : $this->stats->onlineUsers()),

            Schema\Integer::make('mosaicResolvedCount')
                ->nullable()
                ->get(fn () => $this->stats->resolvedTicketCount()),

            /* Forum-wide top contributors + trending discussions, computed and
             * cached server-side so the sidebar panels reflect the whole forum
             * rather than the ~20 records in the current page's store. An admin
             * JSON override (mosaicTopContributors setting) wins when set. */
            Schema\Arr::make('mosaicTopContributors')
                ->get(function () {
                    $override = $this->settings->json('mosaicTopContributors', []);

                    return ! empty($override) ? $override : $this->stats->topContributors();
                }),

            Schema\Arr::make('mosaicTrending')
                ->get(fn () => $this->stats->trending()),

            /* -- Sidebar widget visibility (admin-saved booleans) -- */

            Schema\Boolean::make('mosaicHideMarketplacePromo')
                ->get(fn () => $this->settings->bool('mosaicHideMarketplacePromo')),

            Schema\Boolean::make('mosaicHideQuickActions')
                ->get(fn () => $this->settings->bool('mosaicHideQuickActions')),

            Schema\Boolean::make('mosaicHideTopContributors')
                ->get(fn () => $this->settings->bool('mosaicHideTopContributors')),

            Schema\Boolean::make('mosaicHideTrending')
                ->get(fn () => $this->settings->bool('mosaicHideTrending')),

            /* Suppress the hero "Online now" payload entirely. */
            Schema\Boolean::make('mosaicHideOnlineUsers')
                ->get(fn () => $hideOnlineUsers),

            /* Hide the "Tickets resolved" hero tile (auto-hides when
             * linkrobins/support isn't installed). */
            Schema\Boolean::make('mosaicHideTicketsTile')
                ->get(fn () => $this->settings->bool('mosaicHideTicketsTile')),

            /* -- Section URL overrides (admin-saved strings) -- */

            Schema\Str::make('supportUrl')
                ->nullable()
                ->get(fn () => $this->settings->str('supportUrl')),

            Schema\Str::make('marketplaceUrl')
                ->nullable()
                ->get(fn () => $this->settings->str('marketplaceUrl')),

            /* Quick Actions list (JSON array of {icon,label,href}); empty array
             * signals "use built-in defaults" on the frontend. */
            Schema\Arr::make('mosaicQuickActions')
                ->get(fn () => $this->settings->json('mosaicQuickActions', [])),
        ];
    }
}
