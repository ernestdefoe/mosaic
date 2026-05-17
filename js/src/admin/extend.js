import { Admin } from 'flarum/common/extenders';

/**
 * Admin settings for the edonline theme.
 *
 * Pattern per Flarum 2's Admin extender (replaces the 1.x
 * app.extensionData API). Each .setting() takes a FUNCTION that
 * returns the config object — not the object directly, which is the
 * common 1.x→2.x migration gotcha.
 *
 * These settings are saved into Flarum's `settings` table under their
 * literal keys (edonlineHideQuickActions, etc.). For them to take
 * effect at render time on the forum frontend, the same keys are
 * also exposed as attributes on ForumResource in extend.php (search
 * for AddForumStatistics + future setting-exposure resource).
 */
export default [
  new Admin()
    /* --- Sidebar widget visibility --- */
    .setting(() => ({
      setting: 'edonlineHideMarketplacePromo',
      type: 'boolean',
      label: 'Hide the Marketplace promo sidebar widget',
      help: 'Removes the purple Marketplace promo card from the index sidebar.',
    }))
    .setting(() => ({
      setting: 'edonlineHideQuickActions',
      type: 'boolean',
      label: 'Hide the Quick Actions sidebar widget',
      help: 'Removes the Quick Actions card (Open a Support Ticket / Visit the Marketplace links).',
    }))
    .setting(() => ({
      setting: 'edonlineHideTopContributors',
      type: 'boolean',
      label: 'Hide the Top Contributors sidebar widget',
      help: 'Removes the contributor leaderboard card. Auto-hides when no qualifying users exist.',
    }))
    .setting(() => ({
      setting: 'edonlineHideTrending',
      type: 'boolean',
      label: 'Hide the Trending sidebar widget',
      help: 'Removes the trending-discussions card from the index sidebar.',
    }))

    /* --- Section / route URL overrides --- */
    .setting(() => ({
      setting: 'supportUrl',
      type: 'text',
      label: 'Support extension URL',
      placeholder: '/support',
      help: 'Base URL for linkrobins/support (auto-detected; override if you mount it elsewhere).',
    }))
    .setting(() => ({
      setting: 'marketplaceUrl',
      type: 'text',
      label: 'Marketplace URL',
      placeholder: '/shop',
      help: 'Base URL for ramon/marketplace (auto-detected from marketplace_shop_path).',
    })),
];
