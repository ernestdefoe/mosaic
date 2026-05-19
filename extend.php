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
    /*
     * AddForumStatistics + AddForumSettings used to be pure-static
     * classes that called resolve() inside every method. They're now
     * regular injectable services — instantiated once via the
     * container, dependencies (cache, db, settings, logger) wired
     * automatically. The fields closure runs lazily, so resolve() is
     * safe to call here.
     */
    (new Extend\ApiResource(ForumResource::class))
        ->fields(function () {
            /** @var AddForumStatistics $stats */
            $stats = resolve(AddForumStatistics::class);
            /** @var AddForumSettings $settings */
            $settings = resolve(AddForumSettings::class);

            $hideOnlineUsers = $settings->bool('mosaicHideOnlineUsers');

            return [
                /* -- Statistics (hero stats strip) -- */

                Schema\Integer::make('mosaicUserCount')
                    ->nullable()
                    ->get(fn () => $stats->memberCount()),

                Schema\Integer::make('mosaicOnlineCount')
                    ->nullable()
                    ->get(fn () => $stats->onlineCount()),

                /* List of recently-active users for the hero's "Online
                 * now" dropdown. Capped + privacy-filtered server-side.
                 * Empty when the admin disabled it via the new
                 * mosaicHideOnlineUsers toggle, or when no one's online,
                 * or when every online user opted out of discloseOnline. */
                Schema\Arr::make('mosaicOnlineUsers')
                    ->get(fn () => $hideOnlineUsers ? [] : $stats->onlineUsers()),

                Schema\Integer::make('mosaicResolvedCount')
                    ->nullable()
                    ->get(fn () => $stats->resolvedTicketCount()),

                /* -- Sidebar widget visibility (admin-saved booleans) -- */

                Schema\Boolean::make('mosaicHideMarketplacePromo')
                    ->get(fn () => $settings->bool('mosaicHideMarketplacePromo')),

                Schema\Boolean::make('mosaicHideQuickActions')
                    ->get(fn () => $settings->bool('mosaicHideQuickActions')),

                Schema\Boolean::make('mosaicHideTopContributors')
                    ->get(fn () => $settings->bool('mosaicHideTopContributors')),

                Schema\Boolean::make('mosaicHideTrending')
                    ->get(fn () => $settings->bool('mosaicHideTrending')),

                /* Suppress the hero "Online now" payload entirely. Admin
                 * can flip this on for communities where the user-list
                 * shouldn't be pushed to every guest, or where the bytes
                 * of 50 user records matter. */
                Schema\Boolean::make('mosaicHideOnlineUsers')
                    ->get(fn () => $hideOnlineUsers),

                /* -- Section URL overrides (admin-saved strings) -- */

                Schema\Str::make('supportUrl')
                    ->nullable()
                    ->get(fn () => $settings->str('supportUrl')),

                Schema\Str::make('marketplaceUrl')
                    ->nullable()
                    ->get(fn () => $settings->str('marketplaceUrl')),

                /* -- Quick Actions list (JSON array of {icon,label,href}) --
                 *
                 * Stored as a JSON string under the literal
                 * `mosaicQuickActions` setting key (the dynamic row editor
                 * in admin extend.js writes it). Exposed here as a
                 * JSON-decoded array so the frontend can iterate without
                 * re-parsing. Empty array signals "use built-in
                 * defaults" (handled in SidebarPanels.js). */
                Schema\Arr::make('mosaicQuickActions')
                    ->get(fn () => $settings->json('mosaicQuickActions', [])),
            ];
        }),
];
