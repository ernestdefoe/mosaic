<?php

/*
 * This file is part of ernestdefoe/mosaic.
 *
 * Copyright (c) Ernest Defoe.
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

namespace Ernestdefoe\Mosaic;

use Ernestdefoe\Mosaic\Api\AddForumSettings;
use Ernestdefoe\Mosaic\Api\AddForumStatistics;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->css(__DIR__ . '/less/forum.less')
        ->js(__DIR__ . '/js/dist/forum.js'),

    (new Extend\Frontend('admin'))
        ->css(__DIR__ . '/less/admin.less')
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    /*
     * Forum payload extensions.
     *
     * Flarum 2 replaced 1.x's Extend\ApiSerializer with
     * Extend\ApiResource + Schema field definitions. Two groups of
     * fields here:
     *
     *   1. Statistics — count integers the hero strip reads. Each
     *      is ->nullable() so a failing computation renders "—" on
     *      the front-end tile instead of a misleading 0.
     *
     *   2. Settings bridge — boolean + string values the admin
     *      saves via the JS Admin extender (js/src/admin/extend.js)
     *      become readable from `app.forum.attribute(key)` on the
     *      forum frontend. Without this bridge, admin saves never
     *      reach the live forum runtime.
     */
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            /* -- Statistics (hero stats strip) -- */

            Schema\Integer::make('mosaicUserCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::memberCount()),

            Schema\Integer::make('mosaicOnlineCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::onlineCount()),

            /* List of recently-active users for the hero's "Online now"
             * dropdown. Capped + privacy-filtered server-side. Empty
             * array when no one's online or all online users opted out
             * of discloseOnline. */
            Schema\Arr::make('mosaicOnlineUsers')
                ->get(fn () => AddForumStatistics::onlineUsers()),

            Schema\Integer::make('mosaicResolvedCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::resolvedTicketCount()),

            /* -- Sidebar widget visibility (admin-saved booleans) -- */

            Schema\Boolean::make('mosaicHideMarketplacePromo')
                ->get(fn () => AddForumSettings::bool('mosaicHideMarketplacePromo')),

            Schema\Boolean::make('mosaicHideQuickActions')
                ->get(fn () => AddForumSettings::bool('mosaicHideQuickActions')),

            Schema\Boolean::make('mosaicHideTopContributors')
                ->get(fn () => AddForumSettings::bool('mosaicHideTopContributors')),

            Schema\Boolean::make('mosaicHideTrending')
                ->get(fn () => AddForumSettings::bool('mosaicHideTrending')),

            /* -- Section URL overrides (admin-saved strings) -- */

            Schema\Str::make('supportUrl')
                ->nullable()
                ->get(fn () => AddForumSettings::str('supportUrl')),

            Schema\Str::make('marketplaceUrl')
                ->nullable()
                ->get(fn () => AddForumSettings::str('marketplaceUrl')),

            /* -- Quick Actions list (JSON array of {icon,label,href}) --
             *
             * Stored as a JSON string under the literal `mosaicQuickActions`
             * setting key (the dynamic row editor in admin extend.js writes
             * it). Exposed here as a JSON-decoded array so the frontend can
             * iterate without re-parsing. Empty array signals "use built-in
             * defaults" (handled in SidebarPanels.js). */
            Schema\Arr::make('mosaicQuickActions')
                ->get(fn () => AddForumSettings::json('mosaicQuickActions', [])),
        ]),
];
