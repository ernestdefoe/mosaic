import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import Button from 'flarum/common/components/Button';
import type Mithril from 'mithril';
import type ItemList from 'flarum/common/utils/ItemList';

import HeroPanel from './components/HeroPanel';
import CategoryTiles from './components/CategoryTiles';
import MosaicHeroNav from './components/MosaicHeroNav';
import SidebarPanels from './components/SidebarPanels';
import SectionHeader from './components/SectionHeader';
import forumStats from './utils/forumStats';
import { hasBlog, onBlogPage } from './utils/links';

app.initializers.add('ernestdefoe-mosaic', () => {
  /*
   * Replace the IndexPage hero with Mosaic's panel, category tiles and
   * section pills, side by side in the hero slot above the page grid.
   */
  override(IndexPage.prototype, 'hero', function () {
    return [HeroPanel.component({ stats: forumStats() }), CategoryTiles.component(), MosaicHeroNav.component()];
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
