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
 * One-shot rename: copy any setting key that starts with `edonline` to its
 * `mosaic`-prefixed counterpart so installs upgrading from the old
 * ernestdefoe/edonline package keep their hide-widget toggles, the support /
 * marketplace URL overrides, and any other persisted configuration.
 *
 * Skips rows where the target `mosaic*` key already exists — the operator's
 * post-rename edits win over the pre-rename snapshot. Leaves the original
 * `edonline*` rows in place so a rollback to the old package still finds
 * them; a follow-up migration can purge them once the rename is settled.
 *
 * Flarum's migrator passes Schema\Builder (NOT ConnectionInterface) into
 * closure migrations — reach the connection via $schema->getConnection().
 */
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();

        $rows = $db->table('settings')
            ->where('key', 'like', 'edonline%')
            ->get();

        foreach ($rows as $row) {
            $newKey = 'mosaic' . substr($row->key, strlen('edonline'));

            $exists = $db->table('settings')
                ->where('key', $newKey)
                ->exists();
            if ($exists) {
                continue;
            }

            $db->table('settings')->insert([
                'key' => $newKey,
                'value' => $row->value,
            ]);
        }
    },
    'down' => function (Builder $schema) {
        $db = $schema->getConnection();

        /* Only delete the mosaic.* rows that we COPIED from an edonline
         * counterpart — never delete a key whose original sibling is
         * missing, since that would orphan settings the operator may
         * have configured fresh on the new package. */
        $rows = $db->table('settings')
            ->where('key', 'like', 'edonline%')
            ->get();

        foreach ($rows as $row) {
            $newKey = 'mosaic' . substr($row->key, strlen('edonline'));
            $db->table('settings')
                ->where('key', $newKey)
                ->where('value', $row->value)
                ->delete();
        }
    },
];
