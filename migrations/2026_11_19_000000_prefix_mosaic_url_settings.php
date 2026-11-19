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
 * `marketplaceUrl`; they now live under Mosaic's own prefix. Their values are
 * copied (an existing prefixed value wins) and the old rows are left alone,
 * since those generic keys may belong to another extension. Rolling back
 * removes only copies that still match their original.
 *
 * The pinned Top Contributors list (`mosaicTopContributors`) had no admin
 * setting and is no longer read, so its row is removed.
 */
$renames = ['supportUrl' => 'mosaicSupportUrl', 'marketplaceUrl' => 'mosaicMarketplaceUrl'];

return [
    'up' => function (Builder $schema) use ($renames) {
        $db = $schema->getConnection();

        $copies = $db->table('settings')
            ->whereIn('key', array_keys($renames))
            ->get()
            ->map(fn ($row) => ['key' => $renames[$row->key], 'value' => $row->value])
            ->all();

        $db->table('settings')->insertOrIgnore($copies);
        $db->table('settings')->where('key', 'mosaicTopContributors')->delete();
    },
    'down' => function (Builder $schema) use ($renames) {
        $db = $schema->getConnection();

        $originals = $db->table('settings')->whereIn('key', array_keys($renames))->pluck('value', 'key');

        $copied = $db->table('settings')
            ->whereIn('key', array_values($renames))
            ->get()
            ->filter(fn ($row) => $originals->get(array_search($row->key, $renames, true)) === $row->value)
            ->pluck('key')
            ->all();

        $db->table('settings')->whereIn('key', $copied)->delete();
    },
];
