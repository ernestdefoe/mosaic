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
use Ernestdefoe\Mosaic\Api\SupportForumAttributes;
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

    /* The statistics the hero and sidebar read, plus the admin settings. */
    (new Extend\ApiResource(ForumResource::class))
        ->fields(MosaicForumAttributes::class),

    (new Extend\Conditional())
        ->whenExtensionEnabled('linkrobins-support', fn () => [
            (new Extend\ApiResource(ForumResource::class))
                ->fields(SupportForumAttributes::class),
        ]),
];
