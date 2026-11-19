import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import Icon from 'flarum/common/components/Icon';
import Link from 'flarum/common/components/Link';

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
}

/** app.route.tag is added by flarum/tags. */
type RouteWithTag = typeof app.route & { tag: (tag: TagLike) => string };

/** Locale key, icon and colour of each tile shown before the forum has tags. */
const FALLBACK_TILES: [string, string, string][] = [
  ['general_help', 'fa-solid fa-circle-question', 'blue'],
  ['bug_reports', 'fa-solid fa-bug', 'rose'],
  ['feature_requests', 'fa-solid fa-lightbulb', 'purple'],
  ['tutorials', 'fa-solid fa-graduation-cap', 'green'],
  ['account', 'fa-solid fa-credit-card', 'amber'],
  ['announcements', 'fa-solid fa-bullhorn', 'teal'],
];

/**
 * CategoryTiles — grid of help-topic tiles below the hero.
 *
 * One tile per top-level tag (up to six) with the tag's own icon and colour
 * when flarum/tags is enabled; otherwise a starter set of support categories
 * linking to the index, so the grid is never empty.
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
            <Link className="MosaicCategoryTile" href={t.href}>
              <div className={'MosaicCategoryTile-icon' + (colored ? '' : ` MosaicCategoryTile-icon--${t.tone}`)} style={iconStyle}>
                <Icon name={t.icon} />
              </div>
              <div>
                <div className="MosaicCategoryTile-title">{t.title}</div>
                <div className="MosaicCategoryTile-meta">{t.meta}</div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  collectTiles(): Tile[] {
    /* The forum's own top-level tags when flarum/tags is enabled. */
    const tagsStore = 'flarum-tags' in flarum.extensions ? (app.store.all('tags') as unknown as TagLike[]) : [];
    if (tagsStore.length) {
      const routeTag = (app.route as RouteWithTag).tag;
      return tagsStore
        .filter((t) => typeof t.name === 'function' && !t.parent?.())
        .sort((a, b) => (a.position?.() ?? 999) - (b.position?.() ?? 999))
        .slice(0, 6)
        .map((t, i) => {
          const count = t.discussionCount?.() ?? 0;
          return {
            title: t.name?.() ?? '—',
            meta: app.translator.trans('ernestdefoe-mosaic.forum.categories.topic_count', { count }, true),
            href: routeTag(t),
            /* Tag.icon() returns the full FA classes; default to fa-folder
             * when the operator left the icon field blank. */
            icon: t.icon?.() || 'fa-solid fa-folder',
            color: t.color?.() || null,
            tone: ['blue', 'rose', 'purple', 'green', 'amber', 'teal'][i % 6],
          };
        });
    }

    /* No tags yet: a starter set of support categories, linking to the index. */
    const home = app.route('index');
    return FALLBACK_TILES.map(([key, icon, tone]) => ({
      title: app.translator.trans(`ernestdefoe-mosaic.forum.categories.${key}`, {}, true),
      meta: app.translator.trans(`ernestdefoe-mosaic.forum.categories.${key}_meta`, {}, true),
      icon,
      tone,
      href: home,
    }));
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
