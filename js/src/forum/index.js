import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import SidebarPanels from './components/SidebarPanels';
import SectionHeader from './components/SectionHeader';
import { navItems, startDiscussionButton } from './components/HeaderNav';

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
   * Append our widget stack (Quick Actions / Top Contributors /
   * Trending / Marketplace promo) to the existing IndexPage sidebar.
   *
   * Returning an array makes Mithril render the original sidebar plus
   * our panels as siblings — same DOM container (.Page-sidebar), no
   * vdom archaeology, no extra wrapper.
   */
  override(IndexPage.prototype, 'sidebar', function (original) {
    return [original(), SidebarPanels.component()];
  });

  /*
   * Add a "Recent Discussions" title above the toolbar. contentItems()
   * is the ItemList that becomes .Page-content; high priority puts our
   * header before everything else.
   */
  extend(IndexPage.prototype, 'contentItems', function (items) {
    items.add('edonline-section-header', SectionHeader.component(), 200);
  });

  /*
   * Promote the top-level destinations (Discussions / Tickets /
   * Marketplace / Categories) into HeaderPrimary so the header
   * becomes the navigation surface — matches the render. The stock
   * IndexPage-nav is hidden by layout.less.
   */
  extend(HeaderPrimary.prototype, 'items', function (items) {
    navItems().forEach((vnode, i) =>
      items.add(`edonline-nav-${i}`, vnode, 100 - i)
    );
  });

  /*
   * Move "Start a Discussion" into HeaderSecondary, just before the
   * sign-up / log-in / avatar items.
   */
  extend(HeaderSecondary.prototype, 'items', function (items) {
    items.add('edonline-start-discussion', startDiscussionButton(), 50);
  });
});

export { default as extend } from './extend';

/**
 * Reads forum-wide stats from whatever sources happen to be available.
 *
 * Live-install probe showed Flarum 2's core ForumSerializer does NOT
 * expose discussionCount / userCount / postCount as attributes by
 * default — only permission booleans and per-extension settings. So
 * each stat tries, in order:
 *   1. An attribute Flarum or an installed extension may have set
 *      (multiple common names tried — flarum/statistics, edonline-
 *      prefixed overrides, etc.)
 *   2. A best-effort computation from app.store (only sees data
 *      already loaded on this page — fine for non-empty forums where
 *      the IndexPage warms the store with recent discussions + their
 *      authors)
 *   3. null, which makes the tile render "—" instead of a misleading 0.
 *
 * Operators who want exact numbers can ship a 10-line backend
 * extension that adds attributes via Extend\ApiSerializer on
 * Flarum\Api\Serializer\ForumSerializer.
 */
function getForumStats() {
  const f = app.forum;
  return {
    members: firstNum(
      f.attribute('userCount'),
      f.attribute('totalUsers'),
      f.attribute('membersCount'),
      f.attribute('edonlineUserCount')
    ),
    discussions: firstNum(
      f.attribute('discussionCount'),
      f.attribute('discussionsCount'),
      f.attribute('edonlineDiscussionCount'),
      storeCount('discussions')
    ),
    resolved: firstNum(
      f.attribute('resolvedTicketCount'),
      f.attribute('supportResolvedCount'),
      f.attribute('edonlineResolvedCount')
    ),
    posts: firstNum(
      f.attribute('postCount'),
      f.attribute('postsCount'),
      f.attribute('edonlinePostCount'),
      sumOf('discussions', 'commentCount')
    ),
    online: firstNum(
      f.attribute('onlineUserCount'),
      f.attribute('onlineUsersCount'),
      f.attribute('edonlineOnlineCount')
    ),
  };
}

/** Returns the first non-null/non-undefined finite number from args, or null. */
function firstNum(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function storeCount(type) {
  try {
    const arr = app.store.all(type);
    return Array.isArray(arr) ? arr.length : null;
  } catch (e) {
    return null;
  }
}

function sumOf(type, method) {
  try {
    return (app.store.all(type) || []).reduce((sum, m) => {
      const fn = m?.[method];
      return sum + (typeof fn === 'function' ? Number(fn.call(m)) || 0 : 0);
    }, 0);
  } catch (e) {
    return null;
  }
}
