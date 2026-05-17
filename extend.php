<?php

/*
 * This file is part of ernestdefoe/edonline.
 *
 * Copyright (c) Ernest Defoe.
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

namespace Ernestdefoe\Edonline;

use Ernestdefoe\Edonline\Api\AddForumSettings;
use Ernestdefoe\Edonline\Api\AddForumStatistics;
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

            Schema\Integer::make('edonlineUserCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::memberCount()),

            Schema\Integer::make('edonlineOnlineCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::onlineCount()),

            Schema\Integer::make('edonlineResolvedCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::resolvedTicketCount()),

            /* -- Sidebar widget visibility (admin-saved booleans) -- */

            Schema\Boolean::make('edonlineHideMarketplacePromo')
                ->get(fn () => AddForumSettings::bool('edonlineHideMarketplacePromo')),

            Schema\Boolean::make('edonlineHideQuickActions')
                ->get(fn () => AddForumSettings::bool('edonlineHideQuickActions')),

            Schema\Boolean::make('edonlineHideTopContributors')
                ->get(fn () => AddForumSettings::bool('edonlineHideTopContributors')),

            Schema\Boolean::make('edonlineHideTrending')
                ->get(fn () => AddForumSettings::bool('edonlineHideTrending')),

            /* -- Section URL overrides (admin-saved strings) -- */

            Schema\Str::make('supportUrl')
                ->nullable()
                ->get(fn () => AddForumSettings::str('supportUrl')),

            Schema\Str::make('marketplaceUrl')
                ->nullable()
                ->get(fn () => AddForumSettings::str('marketplaceUrl')),
        ]),
];
