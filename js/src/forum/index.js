import app from 'flarum/forum/app';
import { override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import SidebarPanels from './components/SidebarPanels';

app.initializers.add('ernestdefoe-edonline', () => {
  /*
   * Replace the IndexPage hero with our branded panel + category tiles.
   * The two render as siblings in the hero slot above the page grid.
   */
  override(IndexPage.prototype, 'hero', function () {
    return [
      HeroPanel.component({ stats: getForumStats() }),
      CategoryTiles.component(),
    ];
  });

  /*
   * Append our widget stack (Quick Actions / System Status / Top
   * Contributors / Trending / Marketplace promo) to the existing
   * IndexPage sidebar so Flarum's tag nav stays at the top and our
   * panels follow.
   *
   * Returning an array makes Mithril render the original sidebar plus
   * our panels as siblings — same DOM container (.Page-sidebar), no
   * vdom archaeology, no extra wrapper.
   */
  override(IndexPage.prototype, 'sidebar', function (original) {
    return [original(), SidebarPanels.component()];
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
