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

use Ernestdefoe\Mosaic\Api\MosaicForumAttributes;
use Flarum\Api\Resource\ForumResource;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->css(__DIR__.'/less/forum.less')
        ->js(__DIR__.'/js/dist/forum.js'),

    (new Extend\Frontend('admin'))
        ->css(__DIR__.'/less/admin.less')
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    /*
     * Forum payload extensions — statistics the hero/sidebar read, plus the
     * admin settings bridge. Built by the container-resolved
     * MosaicForumAttributes invokable (constructor-injected services, no
     * resolve() calls).
     */
    (new Extend\ApiResource(ForumResource::class))
        ->fields(MosaicForumAttributes::class),
];
