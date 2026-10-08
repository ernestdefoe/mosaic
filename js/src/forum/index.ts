import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Component from 'flarum/common/Component';
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
   * Blog compose button — injected into the persistent site header so it
   * appears on the /blog page (which uses the blog extension's own layout,
   * not IndexPage, so Mosaic's hero/sidebar overrides don't reach it).
   * Only rendered when the actor has canCreateBlogPost and is on a /blog route.
   */
  extend(HeaderSecondary.prototype, 'items', function (items: ItemList<Mithril.Children>) {
    if (!app.forum.attribute<boolean>('canCreateBlogPost')) return;

    const path = (window.location?.pathname || '').replace(/\/+$/, '');
    const onBlog = path === '/blog' || path.startsWith('/blog/');
    if (!onBlog) return;

    items.add(
      'mosaic-blog-compose',
      m(Button, { className: 'Button Button--primary', icon: 'fas fa-feather-alt', onclick: () => m.route.set('/blog/compose') }, 'Write a Post'),
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
 * Blog-page nav pills — extend the blog index and category route components
 * to prepend MosaicHeroNav so the section pills are present when /blog is set
 * as the home page or when users navigate directly to the blog section.
 *
 * Runs at priority -5 so the blog extension's initializer (which registers
 * its routes into app.routes) has already completed before we reach in.
 */
app.initializers.add(
  'ernestdefoe-mosaic-blog-nav',
  () => {
    // Replace the blog's route components with a Component subclass that
    // prepends MosaicHeroNav pills then delegates to the original blog
    // component. A plain object cannot be used here because Flarum's router
    // calls the static .component() method inherited from Component.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes = app.routes as any;
    const OriginalBlogComponent = routes?.['linkrobins-blog.index']?.component;
    if (!OriginalBlogComponent) return;

    class MosaicBlogNavWrapper extends Component {
      view() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blogVnode = m(OriginalBlogComponent, (this.attrs ?? {}) as any);

        // Mithril forbids mixed keyed/unkeyed vnodes within one fragment.
        // On SPA route transitions Flarum keys the route component, so the
        // blog vnode inherits a key while the bare nav vnode has none —
        // that mismatch throws "vnodes must either all have keys or none"
        // and blanks the page. Match the nav's keying to the blog vnode's.
        const navVnode = blogVnode.key != null ? m(MosaicHeroNav, { key: 'mosaic-blog-nav' }) : m(MosaicHeroNav);

        return [navVnode, blogVnode];
      }
    }

    ['linkrobins-blog.index', 'linkrobins-blog.category'].forEach((routeName) => {
      if (routes[routeName]) {
        routes[routeName].component = MosaicBlogNavWrapper;
      }
    });
  },
  -5
);

export { default as extend } from './extend';

/**
 * Reads forum-wide stats for the hero strip. Members / discussions / posts /
 * online counts are computed server-side and exposed as `mosaic*` forum
 * attributes by AddForumStatistics (see extend.php); flarum/statistics names
 * are tried first for installs that ship it. Each falls back to null so the
 * tile renders "—" instead of a misleading 0.
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
