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

use Flarum\Settings\SettingsRepositoryInterface;
use Throwable;

/**
 * Reads the theme's admin-configured settings out of Flarum's
 * `settings` table and exposes the values to ForumResource Schema
 * fields in extend.php.
 *
 * The JS Admin extender (js/src/admin/extend.js) writes settings
 * under their literal keys when an admin saves the panel; the JS
 * forum frontend reads them via `app.forum.attribute(key)`. The two
 * sides are bridged here — without this resolver, the admin saves
 * would never reach the forum runtime.
 *
 * Exposed as static helpers so the closures in extend.php can call
 * them without managing a constructor chain.
 */
class AddForumSettings
{
    /** True when the operator has chosen to hide a widget. */
    public static function bool(string $key): bool
    {
        try {
            $val = self::settings()->get($key);
            if ($val === null || $val === '') {
                return false;
            }
            /* Flarum stores booleans as the strings "0" / "1". */
            return $val === '1' || $val === 1 || $val === true || $val === 'true';
        } catch (Throwable $e) {
            return false;
        }
    }

    /** Returns the string value or null when unset. */
    public static function str(string $key): ?string
    {
        try {
            $val = self::settings()->get($key);
            if ($val === null) {
                return null;
            }
            $val = trim((string) $val);
            return $val === '' ? null : $val;
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Returns a JSON-decoded array value (e.g. the Quick Actions list).
     * Falls back to the supplied default on missing/invalid/non-array
     * input — the frontend handles an empty array by using its own
     * built-in defaults, so returning [] is safe.
     */
    public static function json(string $key, array $default = []): array
    {
        try {
            $raw = self::settings()->get($key);
            if (! is_string($raw) || $raw === '') {
                return $default;
            }
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : $default;
        } catch (Throwable $e) {
            return $default;
        }
    }

    private static function settings(): SettingsRepositoryInterface
    {
        /** @var SettingsRepositoryInterface $settings */
        $settings = resolve(SettingsRepositoryInterface::class);
        return $settings;
    }
}
