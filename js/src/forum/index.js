import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import MarketplacePromoCard from './components/MarketplacePromoCard';

app.initializers.add('ernestdefoe-edonline', () => {
  /*
   * Replace the IndexPage hero with our branded panel
   * (title + search + forum-wide stats strip).
   */
  override(IndexPage.prototype, 'hero', function () {
    return HeroPanel.component({
      stats: getForumStats(),
    });
  });

  /*
   * Inject the category tiles between the hero and the discussion list.
   */
  extend(IndexPage.prototype, 'view', function (vdom) {
    const results = vdom.children?.find?.((c) => c?.attrs?.className?.includes?.('IndexPage-results'));
    if (results && results.children) {
      results.children.unshift(CategoryTiles.component());
    }
  });

  /*
   * Add the marketplace promo card to the sidebar.
   */
  extend(IndexPage.prototype, 'sidebarItems', function (items) {
    items.add(
      'edonline-marketplace-promo',
      MarketplacePromoCard.component(),
      -50 /* low priority, ends up near the bottom of the sidebar */
    );
  });
});

export { default as extend } from './extend';

/**
 * Reads forum-wide stats from `app.forum.attributes`.
 *
 * Stats not exposed by Flarum core can be wired in two ways:
 *  1. Backend extender: `Extend\ApiSerializer(ForumSerializer)->attributes(...)`
 *  2. Install flarum-ext-statistics / similar for richer metrics
 *
 * For now we read what core exposes and fall back to sensible defaults.
 * Replace the fallbacks with real attributes from your stack.
 */
function getForumStats() {
  const f = app.forum;
  return {
    members: f.attribute('userCount') ?? 0,
    discussions: f.attribute('discussionCount') ?? 0,
    resolved: f.attribute('resolvedTicketCount') ?? 0,
    posts: f.attribute('postCount') ?? 0,
    online: f.attribute('onlineUserCount') ?? 0,
  };
}
