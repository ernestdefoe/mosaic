import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name) => <i className={`icon ${name}`} aria-hidden="true" />;

/**
 * CategoryTiles — grid of help-topic tiles below the hero.
 *
 * If `flarum/tags` is installed, this pulls the top-level tags and renders
 * one tile per tag with the tag's color and discussion count. Otherwise
 * falls back to a hardcoded set of common support categories so the layout
 * stays intact.
 */
export default class CategoryTiles extends Component {
  view() {
    const tiles = this.collectTiles();
    if (!tiles.length) return null;

    return (
      <div className="EdonlineCategoryTiles">
        {tiles.map((t) => (
          <a className="EdonlineCategoryTile" href={t.href}>
            <div className={`EdonlineCategoryTile-icon EdonlineCategoryTile-icon--${t.tone}`}>
              {fa(t.icon)}
            </div>
            <div>
              <div className="EdonlineCategoryTile-title">{t.title}</div>
              <div className="EdonlineCategoryTile-meta">{t.meta}</div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  collectTiles() {
    /* Prefer real tags when flarum/tags is installed. */
    const tagsStore = app.store.all('tags');
    if (tagsStore?.length) {
      return tagsStore
        .filter((t) => !t.isChild?.())
        .slice(0, 6)
        .map((t, i) => ({
          title: t.name(),
          meta: `${t.discussionCount?.() ?? 0} topics`,
          href: app.route.tag(t),
          icon: 'fas fa-folder',
          tone: ['blue', 'rose', 'purple', 'green', 'amber', 'teal'][i % 6],
        }));
    }

    /* Fallback: opinionated default category set for support forums. */
    return [
      { title: 'General Help', meta: 'Ask anything', icon: 'fas fa-circle-question', tone: 'blue', href: '#' },
      { title: 'Bug Reports', meta: 'Something broken?', icon: 'fas fa-bug', tone: 'rose', href: '#' },
      { title: 'Feature Requests', meta: 'Shape the roadmap', icon: 'fas fa-lightbulb', tone: 'purple', href: '#' },
      { title: 'Tutorials & Guides', meta: 'Curated by staff', icon: 'fas fa-graduation-cap', tone: 'green', href: '#' },
      { title: 'Account & Billing', meta: 'Plan & payment help', icon: 'fas fa-credit-card', tone: 'amber', href: '#' },
      { title: 'Announcements', meta: 'Official updates', icon: 'fas fa-bullhorn', tone: 'teal', href: '#' },
    ];
  }
}
