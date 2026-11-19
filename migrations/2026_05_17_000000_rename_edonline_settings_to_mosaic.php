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
 * Copies every `edonline*` setting to its `mosaic*` key, so installs upgrading
 * from the old ernestdefoe/edonline package keep their configuration. A
 * `mosaic*` key that already exists wins, and the `edonline*` rows stay so a
 * rollback to the old package still finds them.
 */
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();

        $copies = $db->table('settings')
            ->where('key', 'like', 'edonline%')
            ->get()
            ->map(fn ($row) => ['key' => 'mosaic'.substr($row->key, strlen('edonline')), 'value' => $row->value])
            ->all();

        $db->table('settings')->insertOrIgnore($copies);
    },
    'down' => function (Builder $schema) {
        $db = $schema->getConnection();

        /* Remove only the copies still identical to their `edonline*` original. */
        $originals = $db->table('settings')
            ->where('key', 'like', 'edonline%')
            ->pluck('value', 'key')
            ->mapWithKeys(fn ($value, $key) => ['mosaic'.substr($key, strlen('edonline')) => $value]);

        $copied = $db->table('settings')
            ->whereIn('key', $originals->keys()->all())
            ->get()
            ->filter(fn ($row) => $originals[$row->key] === $row->value)
            ->pluck('key')
            ->all();

        $db->table('settings')->whereIn('key', $copied)->delete();
    },
];
