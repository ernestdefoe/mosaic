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
 * Mosaic's admin settings. They are saved under their literal keys and served
 * to the forum by src/Api/MosaicForumAttributes.php.
 *
 * The Quick Actions editor is a custom setting: customSetting() calls it with
 * `this` bound to the extension page, whose `setting(key)` stream the editor
 * reads and writes.
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
      setting: 'mosaicSupportUrl',
      type: 'text',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.support_url_label'),
      placeholder: '/support',
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.support_url_help'),
    }))
    .setting(() => ({
      setting: 'mosaicMarketplaceUrl',
      type: 'text',
      label: app.translator.trans('ernestdefoe-mosaic.admin.settings.marketplace_url_label'),
      placeholder: '/shop',
      help: app.translator.trans('ernestdefoe-mosaic.admin.settings.marketplace_url_help'),
    }))

    /* --- Quick Actions row editor --- */
    .customSetting(function (this: SettingHost): Mithril.Children {
      return <QuickActionsEditor valueStream={this.setting('mosaicQuickActions', '[]')} />;
    }),
];
