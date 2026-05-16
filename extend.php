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
     * Adds edonlineUserCount, edonlineOnlineCount and edonlineResolvedCount
     * to the forum payload. The hero stats strip reads these via
     * app.forum.attribute(...) — Flarum 2 core exposes none of them by
     * default and we don't want the hero to lie with zeros.
     *
     * Flarum 2 replaced Extend\ApiSerializer with Extend\ApiResource +
     * Schema field definitions. Each field declares ->nullable() so
     * if the underlying computation can't resolve (e.g. linkrobins/
     * support isn't installed) the JS tile renders "—" instead of 0.
     */
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Integer::make('edonlineUserCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::memberCount()),

            Schema\Integer::make('edonlineOnlineCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::onlineCount()),

            Schema\Integer::make('edonlineResolvedCount')
                ->nullable()
                ->get(fn () => AddForumStatistics::resolvedTicketCount()),
        ]),
];
