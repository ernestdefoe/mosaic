import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import MosaicHeroNav from './components/MosaicHeroNav';
import SidebarPanels from './components/SidebarPanels';
import SectionHeader from './components/SectionHeader';
import { navItems } from './components/HeaderNav';

app.initializers.add('ernestdefoe-mosaic', () => {
  /*
   * Replace the IndexPage hero with our branded panel + category tiles.
   * The two render as siblings in the hero slot above the page grid.
   */
  override(IndexPage.prototype, 'hero', function () {
    return [
      HeroPanel.component({ stats: getForumStats() }),
      CategoryTiles.component(),
      MosaicHeroNav.component(),
    ];
  });

  /*
   * Sidebar: keep IndexSidebar mounted (its App-titleControl is the
   * phone nav surface — see the @media (min-width:768px) hide rule in
   * layout.less for the desktop side). The stock newDiscussion button
   * is stripped above. Append our widget stack (Quick Actions / Top
   * Contributors / Trending / Marketplace promo) below.
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
    items.add('mosaic-section-header', SectionHeader.component(), 200);
  });

  /*
   * Nav destinations live in Flarum's canonical IndexSidebar.navItems
   * ItemList — the same list flarum/tags, flarum/subscriptions, and any
   * future extension adds to. Adding our own mosaic bridges (Tickets,
   * Marketplace) here means they show up alongside extension items
   * automatically.
   *
   * Flarum 2 renders this list responsively without any extra work from
   * us:
   *   - desktop  → vertical sidebar to the left of the page content
   *   - tablet   → horizontal scrolling pill row above the content
   *   - phone    → SelectDropdown attached to the page-title bar; tap
   *                opens a bottom-sheet menu with every nav item
   *
   * On phone the hamburger DRAWER keeps Flarum's stock contents (search,
   * notifications, auth) — the page title dropdown is the nav surface.
   * Same pattern Avocado uses.
   */
  extend(IndexSidebar.prototype, 'navItems', function (items) {
    navItems().forEach((vnode, i) =>
      items.add(`mosaic-nav-${i}`, vnode, 95 - i)
    );
  });

  /*
   * Mobile nav surface: Flarum's native phone pattern. IndexSidebar's
   * top-level Dropdown--select has class App-titleControl, which core's
   * @phone CSS positions absolute to the top of the screen — it becomes
   * the centered tappable page title that opens a bottom-sheet menu of
   * all nav destinations.
   *
   * For this to work we just need IndexSidebar mounted somewhere; its
   * desktop rendering is hidden by CSS (only the phone-escaped
   * title-control surfaces visually). The "+ Start a Discussion" button
   * is removed below — the composer trigger inside the hero handles
   * that affordance.
   */
  /*
   * Note: we deliberately KEEP IndexSidebar's stock 'newDiscussion'
   * item in the items list. It would otherwise render in the
   * IndexPage sidebar, but layout.less already hides the entire
   * .IndexPage-nav on desktop. Keeping the button in the DOM (just
   * hidden) gives MosaicComposerTrigger a stable click target —
   * `document.querySelector('.IndexPage-newDiscussion')?.click()`
   * reuses Flarum's own composer-open path, which lazy-loads the
   * DiscussionComposer chunk and handles guests → LogInModal for us
   * with no risk of a broken `.call({})` on the prototype.
   */
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
 *      (multiple common names tried — flarum/statistics, mosaic-
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
      f.attribute('mosaicUserCount')
    ),
    discussions: firstNum(
      f.attribute('discussionCount'),
      f.attribute('discussionsCount'),
      f.attribute('mosaicDiscussionCount'),
      storeCount('discussions')
    ),
    resolved: firstNum(
      f.attribute('resolvedTicketCount'),
      f.attribute('supportResolvedCount'),
      f.attribute('mosaicResolvedCount')
    ),
    posts: firstNum(
      f.attribute('postCount'),
      f.attribute('postsCount'),
      f.attribute('mosaicPostCount'),
      sumOf('discussions', 'commentCount')
    ),
    online: firstNum(
      f.attribute('onlineUserCount'),
      f.attribute('onlineUsersCount'),
      f.attribute('mosaicOnlineCount')
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
