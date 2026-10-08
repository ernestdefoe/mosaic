import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import type Mithril from 'mithril';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name: string): Mithril.Children => <i className={`icon ${name}`} aria-hidden="true" />;

interface Tile {
  title: string;
  meta: string;
  href: string;
  icon: string;
  color?: string | null;
  tone?: string;
}

/**
 * Minimal shape of a flarum/tags Tag model. The extension is optional, so we
 * don't import its types; only the accessors we read are declared here.
 */
interface TagLike {
  name?: () => string;
  parent?: () => unknown;
  position?: () => number | null | undefined;
  discussionCount?: () => number | null | undefined;
  icon?: () => string | null | undefined;
  color?: () => string | null | undefined;
  slug?: () => string;
}

/** app.route.tag is registered by flarum/tags, so it's optional here. */
type RouteWithTag = typeof app.route & { tag?: (tag: TagLike) => string };

/**
 * CategoryTiles — grid of help-topic tiles below the hero.
 *
 * When `flarum/tags` is installed, pulls the top-level tags and renders one
 * tile per tag using the tag's real icon and color. Falls back to a hardcoded
 * support-category set when no tags exist so the layout never goes empty; the
 * fallback tiles route to the index (rather than a dead '#') on fresh installs.
 */
export default class CategoryTiles extends Component {
  view() {
    const tiles = this.collectTiles();
    if (!tiles.length) return null;

    return (
      <div className="MosaicCategoryTiles">
        {tiles.map((t) => {
          const colored = !!t.color;
          const iconStyle = colored ? { background: hexToRgba(t.color as string, 0.12), color: t.color } : undefined;
          return (
            <a className="MosaicCategoryTile" href={t.href}>
              <div className={'MosaicCategoryTile-icon' + (colored ? '' : ` MosaicCategoryTile-icon--${t.tone}`)} style={iconStyle}>
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

  collectTiles(): Tile[] {
    /* Prefer real tags when flarum/tags is installed. */
    const tagsStore = app.store.all('tags') as unknown as TagLike[];
    if (tagsStore?.length) {
      const routeTag = (app.route as RouteWithTag).tag;
      return tagsStore
        .filter((t) => typeof t.name === 'function' && !t.parent?.())
        .sort((a, b) => (a.position?.() ?? 999) - (b.position?.() ?? 999))
        .slice(0, 6)
        .map((t, i) => {
          const count = t.discussionCount?.() ?? 0;
          return {
            title: t.name?.() ?? '—',
            meta: count === 1 ? '1 topic' : `${count} topics`,
            href: routeTag ? routeTag(t) : `/t/${t.slug?.()}`,
            /* Tag.icon() returns the full FA classes; default to fa-folder
             * when the operator left the icon field blank. */
            icon: t.icon?.() || 'fa-solid fa-folder',
            color: t.color?.() || null,
            tone: ['blue', 'rose', 'purple', 'green', 'amber', 'teal'][i % 6],
          };
        });
    }

    /* Fallback: opinionated default category set for support forums. Tiles
     * route to the index so a click on a fresh (tag-less) install navigates
     * somewhere sensible instead of scrolling to the top of the page. */
    const home = app.route('index');
    return [
      {
        title: 'General Help',
        meta: 'Ask anything',
        icon: 'fa-solid fa-circle-question',
        tone: 'blue',
        href: home,
      },
      {
        title: 'Bug Reports',
        meta: 'Something broken?',
        icon: 'fa-solid fa-bug',
        tone: 'rose',
        href: home,
      },
      {
        title: 'Feature Requests',
        meta: 'Shape the roadmap',
        icon: 'fa-solid fa-lightbulb',
        tone: 'purple',
        href: home,
      },
      {
        title: 'Tutorials & Guides',
        meta: 'Curated by staff',
        icon: 'fa-solid fa-graduation-cap',
        tone: 'green',
        href: home,
      },
      {
        title: 'Account & Billing',
        meta: 'Plan & payment help',
        icon: 'fa-solid fa-credit-card',
        tone: 'amber',
        href: home,
      },
      {
        title: 'Announcements',
        meta: 'Official updates',
        icon: 'fa-solid fa-bullhorn',
        tone: 'teal',
        href: home,
      },
    ];
  }
}

/**
 * Converts a #rrggbb hex string into an rgba() with the given alpha. Fades the
 * tag's solid color into a soft icon-bubble background while keeping the icon
 * itself at full saturation.
 */
function hexToRgba(hex: string, alpha: number): string {
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
