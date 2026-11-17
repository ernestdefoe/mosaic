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
use Flarum\Extension\ExtensionManager;
use Flarum\Http\UrlGenerator;

/**
 * Builds the mosaic fields added to ForumResource.
 *
 * Invokable class (resolved by the container via
 * Extend\ApiResource::fields(self::class)) so AddForumStatistics and
 * AddForumSettings arrive through constructor injection instead of resolve()
 * calls inside a closure — the dependency graph is explicit and the class is
 * unit-testable.
 *
 * Two groups of fields:
 *   1. Statistics — counts + lists the hero strip and sidebar panels read,
 *      computed for what the viewer may see and cached per audience in
 *      AddForumStatistics.
 *   2. Settings bridge — admin-saved booleans/strings exposed so the forum
 *      frontend can read them via app.forum.attribute(key).
 */
class MosaicForumAttributes
{
    public function __construct(
        private AddForumStatistics $stats,
        private AddForumSettings $settings,
        private ExtensionManager $extensions,
        private UrlGenerator $url,
    ) {
    }

    public function __invoke(): array
    {
        $hideOnlineUsers = $this->settings->bool('mosaicHideOnlineUsers');

        return [
            /* -- Statistics (hero stats strip) -- */

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

            /* Recently-active users for the hero "Online now" dropdown.
             * Capped + privacy-filtered server-side; empty when disabled.
             * These lists ride the forum bootstrap on every page on purpose:
             * the hero + sidebar render on the index, which members reach by
             * SPA navigation from any page, so index-only data would vanish
             * there. All three lists are capped (50 / 5 / 4) and cached 60 s,
             * and each is empty for a viewer who can't see the forum (or, for
             * the user lists, can't search users), so a members-only forum
             * never hands them to a guest. */
            Schema\Arr::make('mosaicOnlineUsers')
                ->get(fn ($forum, Context $context) => $hideOnlineUsers ? [] : $this->stats->onlineUsers($context->getActor())),

            Schema\Integer::make('mosaicResolvedCount')
                ->nullable()
                ->get(fn ($forum, Context $context) => $this->stats->resolvedTicketCount($context->getActor())),

            /* Forum-wide top contributors + trending discussions, computed and
             * cached server-side so the sidebar panels reflect the whole forum
             * rather than the ~20 records in the current page's store. An admin
             * JSON override (mosaicTopContributors setting) wins when set. */
            Schema\Arr::make('mosaicTopContributors')
                ->get(function ($forum, Context $context) {
                    $override = $this->settings->json('mosaicTopContributors', []);

                    if (! empty($override)) {
                        return $context->getActor()->can('viewForum') ? $override : [];
                    }

                    return $this->stats->topContributors($context->getActor());
                }),

            Schema\Arr::make('mosaicTrending')
                ->get(fn ($forum, Context $context) => $this->stats->trending($context->getActor())),

            /* -- Sidebar widget visibility (admin-saved booleans) -- */

            Schema\Boolean::make('mosaicHideMarketplacePromo')
                ->get(fn () => $this->settings->bool('mosaicHideMarketplacePromo')),

            Schema\Boolean::make('mosaicHideQuickActions')
                ->get(fn () => $this->settings->bool('mosaicHideQuickActions')),

            Schema\Boolean::make('mosaicHideTopContributors')
                ->get(fn () => $this->settings->bool('mosaicHideTopContributors')),

            Schema\Boolean::make('mosaicHideTrending')
                ->get(fn () => $this->settings->bool('mosaicHideTrending')),

            /* Suppress the hero "Online now" payload entirely. */
            Schema\Boolean::make('mosaicHideOnlineUsers')
                ->get(fn () => $hideOnlineUsers),

            /* Hide the "Tickets resolved" hero tile (auto-hides when
             * linkrobins/support isn't installed). */
            Schema\Boolean::make('mosaicHideTicketsTile')
                ->get(fn () => $this->settings->bool('mosaicHideTicketsTile')),

            /* -- Section URL overrides (admin-saved strings) -- */

            /* The admin's override, else linkrobins/support's own /support
             * page when that extension is enabled (no query: the enabled list
             * is already loaded). Null hides the Tickets pill + quick action. */
            Schema\Str::make('supportUrl')
                ->nullable()
                ->get(fn () => $this->settings->str('supportUrl')
                    ?? ($this->extensions->isEnabled('linkrobins-support') ? $this->url->to('forum')->path('support') : null)),

            Schema\Str::make('marketplaceUrl')
                ->nullable()
                ->get(fn () => $this->settings->str('marketplaceUrl')),

            /* Quick Actions list (JSON array of {icon,label,href}); empty array
             * signals "use built-in defaults" on the frontend. */
            Schema\Arr::make('mosaicQuickActions')
                ->get(fn () => $this->settings->json('mosaicQuickActions', [])),
        ];
    }
}
