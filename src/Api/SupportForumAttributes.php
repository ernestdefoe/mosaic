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
 * linkrobins/support is enabled. Without it the attribute is absent and the
 * tile stays hidden.
 */
class SupportForumAttributes
{
    public function __construct(
        private AddForumStatistics $stats,
    ) {
    }

    public function __invoke(): array
    {
        return [
            Schema\Integer::make('mosaicResolvedCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->resolvedTicketCount($context->getActor())),
        ];
    }
}
