import app from 'flarum/admin/app';
import Admin from 'flarum/common/extenders/Admin';
import type Mithril from 'mithril';
import QuickActionsEditor from './components/QuickActionsEditor';

/**
 * The subset of the ExtensionPage instance the custom Quick Actions setting
 * needs: `setting(key, default)` returns a Stream-backed bidi accessor.
 */
interface SettingHost {
  setting(key: string, fallback?: string): (value?: string) => string;
}

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
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_marketplace_promo_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_marketplace_promo_help'),
    }))
    .setting(() => ({
      setting: 'mosaicHideQuickActions',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_quick_actions_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_quick_actions_help'),
    }))
    .setting(() => ({
      setting: 'mosaicHideTopContributors',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_top_contributors_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_top_contributors_help'),
    }))
    .setting(() => ({
      setting: 'mosaicHideTrending',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_trending_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_trending_help'),
    }))
    .setting(() => ({
      setting: 'mosaicHideOnlineUsers',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_online_users_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_online_users_help'),
    }))
    .setting(() => ({
      setting: 'mosaicHideTicketsTile',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_tickets_tile_label'),
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.hide_tickets_tile_help'),
    }))

    /* --- Section / route URL overrides --- */
    .setting(() => ({
      setting: 'supportUrl',
      type: 'text',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.support_url_label'),
      placeholder: '/support',
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.support_url_help'),
    }))
    .setting(() => ({
      setting: 'marketplaceUrl',
      type: 'text',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.marketplace_url_label'),
      placeholder: '/shop',
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.marketplace_url_help'),
    }))

    /* --- Quick Actions row editor (custom component slot) ---
     *
     * The outer arrow returns an inner function so buildSettingComponent
     * treats it as a callback (not an options object) and invokes it with
     * `this` bound to the ExtensionPage instance. `this.setting(key)`
     * returns a Mithril Stream we pass to the editor as a bidi
     * accessor — read with `bidi()`, write with `bidi(jsonString)`. */
    .customSetting(function (this: SettingHost): Mithril.Children {
      return <QuickActionsEditor valueStream={this.setting('mosaicQuickActions', '[]')} />;
    }),
];
