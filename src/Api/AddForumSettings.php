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
use Psr\Log\LoggerInterface;
use RuntimeException;

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
 * Instance class with constructor-injected dependencies so the
 * container can wire it up (audit feedback — the previous version
 * used pure-static methods that resolve()'d at every call, which
 * hid the dependency on SettingsRepositoryInterface and made the
 * class unmockable in unit tests).
 */
class AddForumSettings
{
    public function __construct(
        private SettingsRepositoryInterface $settings,
        private LoggerInterface $log,
    ) {}

    /** True when the operator has chosen to hide a widget. */
    public function bool(string $key): bool
    {
        $val = $this->settings->get($key);
        if ($val === null || $val === '') {
            return false;
        }
        /* Flarum stores booleans as the strings "0" / "1". */
        return $val === '1' || $val === 1 || $val === true || $val === 'true';
    }

    /** Returns the string value or null when unset. */
    public function str(string $key): ?string
    {
        $val = $this->settings->get($key);
        if ($val === null) {
            return null;
        }
        $val = trim((string) $val);
        return $val === '' ? null : $val;
    }

    /**
     * Returns a JSON-decoded array value (e.g. the Quick Actions list).
     * Falls back to the supplied default on missing/invalid/non-array
     * input — the frontend handles an empty array by using its own
     * built-in defaults, so returning [] is safe.
     *
     * Narrow catch: JSON malformation is the only error class we
     * expect here. Wider failures (settings repo unavailable, store
     * down) bubble up to Flarum's error handler so they show in the
     * log instead of degrading silently.
     */
    public function json(string $key, array $default = []): array
    {
        $raw = $this->settings->get($key);
        if (! is_string($raw) || $raw === '') {
            return $default;
        }
        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            $this->log->warning('[mosaic] settings JSON decode failed', [
                'key'       => $key,
                'exception' => $e,
            ]);
            return $default;
        }
        return is_array($decoded) ? $decoded : $default;
    }
}
