import app from 'flarum/admin/app';

/**
 * Admin initializer — minimal, just registers our extension hook.
 *
 * Settings (sidebar visibility toggles + section URL overrides) are
 * declared via the JS Admin extender in ./extend.js — the Flarum 2
 * pattern that replaced the 1.x `app.extensionData.for(...).registerSetting()`
 * API. See flarum2_admin_extender.md memory note.
 */
app.initializers.add('ernestdefoe-mosaic', () => {
  /* No frontend-only behavior needed; everything's declarative via
   * the Admin extender. Initializer kept so we can hang any future
   * admin-side dashboard / preview-pane logic off it without
   * re-registering the extension. */
});

export { default as extend } from './extend';
