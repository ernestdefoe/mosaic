import app from 'flarum/forum/app';
import { override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import MarketplacePromoCard from './components/MarketplacePromoCard';

app.initializers.add('ernestdefoe-edonline', () => {
  /*
   * Replace the IndexPage hero with our branded panel.
   *
   * We also tack the category tiles and marketplace promo onto the same
   * return value (as an array) — Mithril treats arrays of vnodes as
   * sibling children, so all three slot into wherever Flarum renders
   * the hero. This is more reliable than trying to inject into the
   * IndexPage view tree separately, which broke when Flarum 2 renamed
   * IndexPage-results to Page-hero/Page-main.
   */
  override(IndexPage.prototype, 'hero', function () {
    return [
      HeroPanel.component({ stats: getForumStats() }),
      CategoryTiles.component(),
      MarketplacePromoCard.component(),
    ];
  });
});

export { default as extend } from './extend';

/**
 * Reads forum-wide stats from `app.forum.attributes`.
 *
 * Flarum core exposes `discussionCount` out of the box. The other counts
 * (`userCount`, `postCount`, `onlineUserCount`, `resolvedTicketCount`)
 * come from either:
 *   1. A small backend extension that adds them via
 *      Extend\ApiSerializer(ForumSerializer)->attributes(...), or
 *   2. An existing stats extension (e.g. flarum-ext-statistics).
 *
 * Missing values fall through to 0 — the stat tile still renders so the
 * layout never breaks.
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
