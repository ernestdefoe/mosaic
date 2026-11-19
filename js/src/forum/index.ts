import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import Button from 'flarum/common/components/Button';
import type Mithril from 'mithril';
import type ItemList from 'flarum/common/utils/ItemList';

import HeroPanel, { ForumStats } from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import MosaicHeroNav from './components/MosaicHeroNav';
import SidebarPanels from './components/SidebarPanels';
import SectionHeader from './components/SectionHeader';
import { navItems } from './components/HeaderNav';
import { hasBlog, onBlogPage } from './utils/links';

app.initializers.add('ernestdefoe-mosaic', () => {
  /*
   * Replace the IndexPage hero with our branded panel + category tiles.
   * The two render as siblings in the hero slot above the page grid.
   */
  override(IndexPage.prototype, 'hero', function () {
    return [HeroPanel.component({ stats: getForumStats() }), CategoryTiles.component(), MosaicHeroNav.component()];
  });

  /*
   * Sidebar: keep IndexSidebar mounted (its App-titleControl is the
   * phone nav surface — see the @media (min-width:768px) hide rule in
   * layout.less for the desktop side). Append our widget stack below.
   */
  override(IndexPage.prototype, 'sidebar', function (original: () => Mithril.Children) {
    return [original(), SidebarPanels.component()];
  });

  /*
   * Add a "Recent Discussions" title above the toolbar. contentItems()
   * is the ItemList that becomes .Page-content; high priority puts our
   * header before everything else.
   */
  extend(IndexPage.prototype, 'contentItems', function (items: ItemList<Mithril.Children>) {
    items.add('mosaic-section-header', SectionHeader.component(), 200);
  });

  /*
   * A "Write a Post" button in the site header on linkrobins/blog's pages,
   * which use their own layout, so the hero and sidebar don't reach them.
   */
  extend(HeaderSecondary.prototype, 'items', function (items: ItemList<Mithril.Children>) {
    if (!hasBlog() || !onBlogPage() || !app.forum.attribute<boolean>('canCreateBlogPost')) return;

    items.add(
      'mosaic-blog-compose',
      m(
        Button,
        { className: 'Button Button--primary', icon: 'fas fa-feather-alt', onclick: () => m.route.set(app.route('linkrobins-blog.compose')) },
        app.translator.trans('ernestdefoe-mosaic.forum.nav.write_post')
      ),
      10
    );
  });

  /*
   * Nav destinations live in Flarum's canonical IndexSidebar.navItems
   * ItemList — the same list flarum/tags, flarum/subscriptions, and any
   * future extension adds to. Adding our own mosaic bridges here means
   * they show up alongside extension items automatically, and Flarum 2
   * renders the list responsively (desktop sidebar / tablet pill row /
   * phone title dropdown) without any extra work from us.
   */
  extend(IndexSidebar.prototype, 'navItems', function (items: ItemList<Mithril.Children>) {
    navItems().forEach((vnode, i) => items.add(`mosaic-nav-${i}`, vnode, 95 - i));
  });
});

/*
 * The section pills on linkrobins/blog's index and category pages (one page
 * component serves both), so they're there when the blog is the home page or
 * someone lands on it directly.
 */
app.initializers.add('ernestdefoe-mosaic-blog-nav', () => {
  if (!hasBlog()) return;

  override('ext:linkrobins/blog/forum/components/BlogIndexPage', 'view', function (original: () => Mithril.Children) {
    return [m(MosaicHeroNav), original()];
  });
});

export { default as extend } from './extend';

/**
 * The hero strip's figures: another extension's forum attribute when one
 * provides it (flarum/statistics and similar), else Mosaic's own `mosaic*`
 * attributes. A missing figure is null, so its tile shows "—" rather than 0.
 */
function getForumStats(): ForumStats {
  const f = app.forum;
  return {
    members: firstNum(f.attribute('userCount'), f.attribute('totalUsers'), f.attribute('membersCount'), f.attribute('mosaicUserCount')),
    discussions: firstNum(f.attribute('discussionCount'), f.attribute('discussionsCount'), f.attribute('mosaicDiscussionCount')),
    resolved: firstNum(f.attribute('resolvedTicketCount'), f.attribute('supportResolvedCount'), f.attribute('mosaicResolvedCount')),
    posts: firstNum(f.attribute('postCount'), f.attribute('postsCount'), f.attribute('mosaicPostCount')),
    online: firstNum(f.attribute('onlineUserCount'), f.attribute('onlineUsersCount'), f.attribute('mosaicOnlineCount')),
  };
}

/** Returns the first non-null/non-undefined finite number from args, or null. */
function firstNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
