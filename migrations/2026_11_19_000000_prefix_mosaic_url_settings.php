<?php

/*
 * This file is part of ernestdefoe/mosaic.
 *
 * Copyright (c) Ernest Defoe.
 *
 * For the full copyright and license information, please view the LICENSE file
 * that was distributed with this source code.
 */

use Illuminate\Database\Schema\Builder;

/*
 * The Support and Marketplace URL settings were saved as `supportUrl` and
 * `marketplaceUrl`; they now live under Mosaic's own prefix. The old rows are
 * moved, and moved back on rollback.
 */
$renames = ['supportUrl' => 'mosaicSupportUrl', 'marketplaceUrl' => 'mosaicMarketplaceUrl'];

$move = function (Builder $schema, array $map) {
    $db = $schema->getConnection();

    $rows = $db->table('settings')->whereIn('key', array_keys($map))->get();

    $db->table('settings')->insertOrIgnore(
        $rows->map(fn ($row) => ['key' => $map[$row->key], 'value' => $row->value])->all()
    );
    $db->table('settings')->whereIn('key', $rows->pluck('key')->all())->delete();
};

return [
    'up' => fn (Builder $schema) => $move($schema, $renames),
    'down' => fn (Builder $schema) => $move($schema, array_flip($renames)),
];
