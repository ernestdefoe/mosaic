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

use Flarum\Api\Context;
use Flarum\Api\Schema;

/**
 * The hero's "Tickets resolved" figure, registered only while
 * linkrobins/support is enabled. It is null when the admin hid the tile or the
 * viewer isn't support staff, and the tile is then left out.
 */
class SupportForumAttributes
{
    public function __construct(
        private AddForumStatistics $stats,
        private AddForumSettings $settings,
    ) {
    }

    public function __invoke(): array
    {
        return [
            Schema\Integer::make('mosaicResolvedCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->settings->bool('mosaicHideTicketsTile') ? null : $this->stats->resolvedTicketCount($context->getActor())),
        ];
    }
}
