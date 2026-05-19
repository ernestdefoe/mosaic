import { Admin } from 'flarum/common/extenders';
import QuickActionsEditor from './components/QuickActionsEditor';

/**
 * Admin settings for the Mosaic theme.
 *
 * Pattern per Flarum 2's Admin extender (replaces the 1.x
 * app.extensionData API). Each .setting() takes a FUNCTION that
 * returns the config object — not the object directly, which is the
 * common 1.x→2.x migration gotcha.
 *
 * The Quick Actions row at the bottom is a CUSTOM component slot:
 * Flarum 2's buildSettingComponent accepts either an options object
 * OR a callback that returns Mithril children. The outer arrow returns
 * an inner function (NOT an options object) so buildSettingComponent
 * recognizes it as the callback form and invokes it with `this`
 * bound to the page instance — which exposes `this.setting(key)`,
 * the Stream-backed bidi accessor the editor needs.
 *
 * These settings are saved into Flarum's `settings` table under their
 * literal keys (mosaicHideQuickActions, mosaicQuickActions, etc.). For
 * them to take effect at render time on the forum frontend, the same
 * keys are exposed as attributes on ForumResource in extend.php.
 */
export default [
  new Admin()
    /* --- Sidebar widget visibility --- */
    .setting(() => ({
      setting: 'mosaicHideMarketplacePromo',
      type: 'boolean',
      label: 'Hide the Marketplace promo sidebar widget',
      help: 'Removes the purple Marketplace promo card from the index sidebar.',
    }))
    .setting(() => ({
      setting: 'mosaicHideQuickActions',
      type: 'boolean',
      label: 'Hide the Quick Actions sidebar widget',
      help: 'Removes the entire Quick Actions card from the sidebar regardless of how many rows are configured below.',
    }))
    .setting(() => ({
      setting: 'mosaicHideTopContributors',
      type: 'boolean',
      label: 'Hide the Top Contributors sidebar widget',
      help: 'Removes the contributor leaderboard card. Auto-hides when no qualifying users exist.',
    }))
    .setting(() => ({
      setting: 'mosaicHideTrending',
      type: 'boolean',
      label: 'Hide the Trending sidebar widget',
      help: 'Removes the trending-discussions card from the index sidebar.',
    }))
    .setting(() => ({
      setting: 'mosaicHideOnlineUsers',
      type: 'boolean',
      label: 'Suppress the Online Users payload',
      help: 'Stops the forum bootstrap from including the list of recently-active usernames. The "Online now" count tile still works; only the user-list popover goes empty. Useful on large communities where the extra payload bytes matter, or on forums that prefer not to surface usernames to guests.',
    }))
    .setting(() => ({
      setting: 'mosaicHideTicketsTile',
      type: 'boolean',
      label: 'Hide the Tickets resolved hero tile',
      help: 'Removes the "Tickets resolved" stat tile from the hero strip. The tile auto-hides when linkrobins/support is not installed, so you only need this toggle if you DO run the support extension but prefer not to surface the resolved-ticket count.',
    }))

    /* --- Section / route URL overrides --- */
    .setting(() => ({
      setting: 'supportUrl',
      type: 'text',
      label: 'Support extension URL',
      placeholder: '/support',
      help: 'Base URL for linkrobins/support (auto-detected; override if you mount it elsewhere). Leave blank if you do not run a support extension.',
    }))
    .setting(() => ({
      setting: 'marketplaceUrl',
      type: 'text',
      label: 'Marketplace URL',
      placeholder: '/shop',
      help: 'Base URL for ramon/marketplace (auto-detected from marketplace_shop_path). Leave blank if you do not run a marketplace extension.',
    }))

    /* --- Quick Actions row editor (custom component slot) ---
     *
     * The outer arrow returns an inner function so buildSettingComponent
     * treats it as a callback (not an options object) and invokes it with
     * `this` bound to the ExtensionPage instance. `this.setting(key)`
     * returns a Mithril Stream we pass to the editor as a bidi
     * accessor — read with `bidi()`, write with `bidi(jsonString)`. */
    .customSetting(function () {
      return <QuickActionsEditor valueStream={this.setting('mosaicQuickActions', '[]')} />;
    }),
];
