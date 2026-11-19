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

/**
 * Reads Mosaic's admin settings for MosaicForumAttributes. The admin panel
 * saves them under their literal keys (mosaicHideTrending, mosaicQuickActions,
 * …) and the forum frontend reads the matching forum attributes.
 */
class AddForumSettings
{
    public function __construct(
        private SettingsRepositoryInterface $settings,
        private LoggerInterface $log,
    ) {
    }

    /** A switch the admin turned on. The settings table stores booleans as "1" / "0". */
    public function bool(string $key): bool
    {
        return in_array($this->settings->get($key), ['1', 'true'], true);
    }

    /** The trimmed value, or null when it is unset or blank. */
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
     * A JSON list setting (the Quick Actions), or [] when it
     * is unset or not a JSON array. Malformed JSON is logged.
     */
    public function json(string $key): array
    {
        $raw = $this->settings->get($key);
        if (! is_string($raw) || $raw === '') {
            return [];
        }

        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            $this->log->warning('[mosaic] settings JSON decode failed', [
                'key' => $key,
                'exception' => $e,
            ]);

            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }
}
