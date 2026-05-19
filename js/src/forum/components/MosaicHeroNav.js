import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

/**
 * Renders an inline pill-row nav under the hero. Source of items is
 * Flarum's IndexSidebar.navItems ItemList — the SAME canonical list
 * flarum/tags, flarum/subscriptions, and our own HeaderNav.js
 * bridges add into. Anything an installed extension contributes
 * appears here automatically.
 *
 * Hidden on phone — Flarum's stock .App-titleControl SelectDropdown
 * already provides the phone nav surface (it escapes via
 * position:absolute to sit next to the page title). Duplicating the
 * pills on phone would just clutter the hero.
 *
 * Mirrors the renderInlineNav() pattern from ramon/avocado.
 */
export default class MosaicHeroNav extends Component {
  view() {
    let itemList;
    try {
      itemList = IndexSidebar.prototype.navItems.call({});
    } catch (e) {
      return null;
    }

    /* Drop entries that don't belong in a horizontal pill row:
     *   - 'allDiscussions' is implicit (we ARE on the home page)
     *   - 'loading' is the placeholder
     *   - 'tags' (the top-level Tags link from flarum/tags) — the
     *     CategoryTiles grid above the pill row is the canonical
     *     tag-browse surface in the mosaic design
     *   - per-tag rows from flarum/tags pollute the bar
     *   - the 'more' / 'moreTags' overflow link from flarum/tags
     *   - any separator added between tag groups */
    ['allDiscussions', 'loading', 'tags', 'moreTags', 'separator'].forEach((k) => itemList.remove(k));

    const items = itemList.toArray().filter((vnode) => {
      if (!vnode || typeof vnode.tag === 'string') return false;
      const attrs = vnode.attrs || {};
      /* Strip per-tag entries — they ship with a `model` attr. */
      if ('model' in attrs) return false;
      const href = String(attrs.href || '');
      if (/\/t\//.test(href)) return false;
      return true;
    });

    if (!items.length) return null;

    return (
      <nav className="MosaicHeroNav" aria-label="Sections">
        {items}
      </nav>
    );
  }
}
