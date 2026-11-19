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
 * The mosaic fields added to ForumResource: the statistics the hero strip and
 * sidebar panels read (computed for what the viewer may see and cached per
 * audience in AddForumStatistics), and the admin settings the forum frontend
 * reads with app.forum.attribute(key).
 */
class MosaicForumAttributes
{
    public function __construct(
        private AddForumStatistics $stats,
        private AddForumSettings $settings,
    ) {
    }

    public function __invoke(): array
    {
        return [...$this->statistics(), ...$this->settingFields()];
    }

    /**
     * Counts and lists. They ride the forum payload on every page because the
     * hero and sidebar render on the index, which members reach by SPA
     * navigation from anywhere. Each list is capped (50 / 5 / 4), cached 60 s,
     * not computed at all when the admin hid its widget, and empty for a
     * viewer who can't see the forum; the user lists also need searchUsers.
     */
    private function statistics(): array
    {
        $hidden = fn (string $key) => $this->settings->bool($key);

        return [
            Schema\Integer::make('mosaicUserCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->memberCount($context->getActor())),

            Schema\Integer::make('mosaicDiscussionCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->discussionCount($context->getActor())),

            Schema\Integer::make('mosaicPostCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->postCount($context->getActor())),

            Schema\Integer::make('mosaicOnlineCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->onlineCount($context->getActor())),

            Schema\Arr::make('mosaicOnlineUsers')
                ->get(fn ($forum, Context $context) => $hidden('mosaicHideOnlineUsers') ? [] : $this->stats->onlineUsers($context->getActor())),

            Schema\Arr::make('mosaicTopContributors')
                ->get(fn ($forum, Context $context) => $hidden('mosaicHideTopContributors') ? [] : $this->stats->topContributors($context->getActor())),

            Schema\Arr::make('mosaicTrending')
                ->get(fn ($forum, Context $context) => $hidden('mosaicHideTrending') ? [] : $this->stats->trending($context->getActor())),
        ];
    }

    /**
     * Admin settings the frontend reads: the two widget switches it applies
     * itself (the other widgets are left out on the server), the section URLs
     * and the Quick Actions list.
     */
    private function settingFields(): array
    {
        $fields = [];
        foreach (['mosaicHideMarketplacePromo', 'mosaicHideQuickActions'] as $key) {
            $fields[] = Schema\Boolean::make($key)->get(fn () => $this->settings->bool($key));
        }

        $fields[] = Schema\Str::make('mosaicSupportUrl')->nullable()->get(fn () => $this->settings->str('mosaicSupportUrl'));
        $fields[] = Schema\Str::make('mosaicMarketplaceUrl')->nullable()->get(fn () => $this->settings->str('mosaicMarketplaceUrl'));

        /* An empty list tells the frontend to use its built-in Quick Actions. */
        $fields[] = Schema\Arr::make('mosaicQuickActions')->get(fn () => $this->settings->json('mosaicQuickActions'));

        return $fields;
    }
}
