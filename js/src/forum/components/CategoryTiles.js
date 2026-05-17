import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name) => <i className={`icon ${name}`} aria-hidden="true" />;

/**
 * CategoryTiles — grid of help-topic tiles below the hero.
 *
 * When `flarum/tags` is installed, pulls the top-level tags and renders
 * one tile per tag using the tag's REAL icon (set via admin) and the
 * tag's REAL color (faded for the icon bubble background, solid for the
 * icon itself). Falls back to a hardcoded support-category set when no
 * tags exist so the layout never goes empty.
 */
export default class CategoryTiles extends Component {
  view() {
    const tiles = this.collectTiles();
    if (!tiles.length) return null;

    return (
      <div className="MosaicCategoryTiles">
        {tiles.map((t) => {
          const colored = !!t.color;
          const iconStyle = colored
            ? { background: hexToRgba(t.color, 0.12), color: t.color }
            : null;
          return (
            <a className="MosaicCategoryTile" href={t.href}>
              <div
                className={
                  'MosaicCategoryTile-icon' +
                  (colored ? '' : ` MosaicCategoryTile-icon--${t.tone}`)
                }
                style={iconStyle}
              >
                {fa(t.icon)}
              </div>
              <div>
                <div className="MosaicCategoryTile-title">{t.title}</div>
                <div className="MosaicCategoryTile-meta">{t.meta}</div>
              </div>
            </a>
          );
        })}
      </div>
    );
  }

  collectTiles() {
    /* Prefer real tags when flarum/tags is installed. */
    const tagsStore = app.store.all('tags');
    if (tagsStore?.length) {
      return tagsStore
        .filter((t) => typeof t.name === 'function' && !t.parent?.())
        .sort((a, b) => (a.position?.() ?? 999) - (b.position?.() ?? 999))
        .slice(0, 6)
        .map((t, i) => {
          const count = t.discussionCount?.() ?? 0;
          return {
            title: t.name(),
            meta: count === 1 ? '1 topic' : `${count} topics`,
            href: app.route.tag ? app.route.tag(t) : `/t/${t.slug?.()}`,
            /* Tag.icon() returns the full FA classes Flarum stored
             * (e.g. "fa-solid fa-bullhorn"). Default to fa-folder when
             * the operator left the icon field blank. */
            icon: t.icon?.() || 'fa-solid fa-folder',
            color: t.color?.() || null,
            tone: ['blue', 'rose', 'purple', 'green', 'amber', 'teal'][i % 6],
          };
        });
    }

    /* Fallback: opinionated default category set for support forums. */
    return [
      { title: 'General Help', meta: 'Ask anything', icon: 'fa-solid fa-circle-question', tone: 'blue', href: '#' },
      { title: 'Bug Reports', meta: 'Something broken?', icon: 'fa-solid fa-bug', tone: 'rose', href: '#' },
      { title: 'Feature Requests', meta: 'Shape the roadmap', icon: 'fa-solid fa-lightbulb', tone: 'purple', href: '#' },
      { title: 'Tutorials & Guides', meta: 'Curated by staff', icon: 'fa-solid fa-graduation-cap', tone: 'green', href: '#' },
      { title: 'Account & Billing', meta: 'Plan & payment help', icon: 'fa-solid fa-credit-card', tone: 'amber', href: '#' },
      { title: 'Announcements', meta: 'Official updates', icon: 'fa-solid fa-bullhorn', tone: 'teal', href: '#' },
    ];
  }
}

/**
 * Converts a #rrggbb hex string into an rgba() with the given alpha.
 * Used to fade the tag's solid color into a soft icon-bubble background
 * while keeping the icon itself at full saturation.
 */
function hexToRgba(hex, alpha) {
  const m = String(hex || '')
    .trim()
    .replace('#', '')
    .match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
