import app from 'flarum/admin/app';

app.initializers.add('ernestdefoe-edonline', () => {
  /*
   * Theme settings can be registered here via app.extensionData if needed.
   * Per Flarum 2: use the JS admin extender, not extend.php Extend\Admin.
   *
   * Example:
   *   app.extensionData
   *     .for('ernestdefoe-edonline')
   *     .registerSetting(() => <Switch state={...}>Hide marketplace promo</Switch>);
   */
});

export { default as extend } from './extend';
