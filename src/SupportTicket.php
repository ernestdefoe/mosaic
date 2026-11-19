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

use Flarum\Database\AbstractModel;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Read-only view of linkrobins/support's tickets, for the hero's resolved-ticket
 * count. Only queried when that extension is enabled (see extend.php), so the
 * table always exists; soft-deleted tickets are left out, as they are there.
 *
 * @property string $status
 */
class SupportTicket extends AbstractModel
{
    use SoftDeletes;

    protected $table = 'linkrobins_support_tickets';

    public $timestamps = false;
}
