import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import marketplaceUrl, { hasMarketplace } from '../utils/marketplaceUrl';
import { hasBlog, supportUrl } from '../utils/links';

type IconStyle = Record<string, string | number>;

const t = (key: string, params: Record<string, unknown> = {}) => app.translator.trans(`ernestdefoe-mosaic.forum.${key}`, params);
/** Plain-string form, for labels built into data. */
const ts = (key: string) => app.translator.trans(`ernestdefoe-mosaic.forum.${key}`, {}, true);

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name: string, style?: IconStyle): Mithril.Children => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

interface QuickAction {
  icon?: string;
  label?: string;
  href?: string;
}

interface Contributor {
  name: string;
  role?: string | null;
  /** Comment count from the server; an admin-pinned entry may give `meta` text instead. */
  posts?: number;
  meta?: string;
  points?: string | number;
  tone?: string;
  avatarUrl?: string | null;
  href?: string;
}

/**
 * SidebarPanels — the stack of right-sidebar cards:
 *   Marketplace · Quick Actions · Top Contributors · Trending
 *
 * Each panel can be switched off in the admin (the mosaicHide* attributes), and
 * Top Contributors and Trending hide themselves when they have nothing to show.
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="MosaicSidebarPanels">
        {!app.forum.attribute<boolean>('mosaicHideMarketplacePromo') && hasMarketplace() && this.marketplacePromo()}
        {!app.forum.attribute<boolean>('mosaicHideQuickActions') && this.quickActions()}
        {!app.forum.attribute<boolean>('mosaicHideTopContributors') && this.topContributors()}
        {!app.forum.attribute<boolean>('mosaicHideTrending') && this.trending()}
      </div>
    );
  }

  quickActions(): Mithril.Children {
    /* Admin-configured rows win over the built-in ones. */
    const fromAttr = app.forum.attribute<QuickAction[]>('mosaicQuickActions');
    const configured = Array.isArray(fromAttr) ? fromAttr.filter((a) => a && (a.label || '').trim() && (a.href || '').trim()) : [];
    const links = configured.length ? configured : defaultQuickActions();

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-bolt', { color: 'var(--primary)' })}
          <span>{t('sidebar.quick_actions_title')}</span>
        </h3>
        {/* Unkeyed on purpose: the admin's JSON may repeat an href, and Mithril
            throws on duplicate keys; the list never reorders between redraws. */}
        {links.map((l) => (
          <a className="MosaicQuickAction" href={l.href}>
            <span className="MosaicQuickAction-ic">{fa(l.icon || 'fa-solid fa-link')}</span>
            <span>{l.label}</span>
          </a>
        ))}
      </div>
    );
  }

  topContributors(): Mithril.Children {
    // The server's forum-wide list (or the admin's pinned one). Each row gets an
    // avatar colour from a fixed palette.
    const fromAttr = app.forum.attribute<Contributor[]>('mosaicTopContributors');
    if (!Array.isArray(fromAttr) || !fromAttr.length) return null;

    const tones = ['blue', 'green', 'amber', 'rose', 'purple', 'teal', 'indigo', 'slate'];
    const data: Contributor[] = fromAttr.map((c, i) => ({
      ...c,
      points: typeof c.points === 'number' ? formatCount(c.points) : c.points,
      tone: c.tone || tones[i % tones.length],
    }));

    return this.renderContribCard(data);
  }

  renderContribCard(contributors: Contributor[]): Mithril.Children {
    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-trophy', { color: 'var(--primary)' })}
          <span>{t('sidebar.top_contributors_title')}</span>
        </h3>
        {contributors.map((c) => (
          <a className="MosaicContribRow" href={c.href || '#'}>
            {c.avatarUrl ? (
              <img className="MosaicContribRow-avatar MosaicContribRow-avatar--img" src={c.avatarUrl} alt="" />
            ) : (
              <div className={`MosaicContribRow-avatar av-${c.tone || 'slate'}`}>{initials(c.name)}</div>
            )}
            <div className="MosaicContribRow-meta">
              <div className="MosaicContribRow-name">
                {c.name}
                {c.role && <span className={`MosaicRoleBadge MosaicRoleBadge--${String(c.role).toLowerCase()}`}>{c.role}</span>}
              </div>
              <div className="MosaicContribRow-sub">{c.meta ?? (c.posts != null ? t('sidebar.contributor_posts', { count: c.posts }) : null)}</div>
            </div>
            <div className="MosaicContribRow-points">{c.points}</div>
          </a>
        ))}
      </div>
    );
  }

  trending(): Mithril.Children {
    // The server's list, limited to discussions this visitor's groups can open.
    const items = app.forum.attribute<{ title: string; replies: number; href: string }[]>('mosaicTrending');

    if (!Array.isArray(items) || !items.length) return null;

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-fire', { color: 'var(--primary)' })}
          <span>{t('sidebar.trending_title')}</span>
        </h3>
        {items.map((item, i) => (
          <a key={item.href} href={item.href} className="MosaicTrendRow">
            <span className={`MosaicTrendRow-num ${i < 2 ? 'is-top' : ''}`}>{i + 1}</span>
            <div>
              <div className="MosaicTrendRow-title">{item.title}</div>
              <div className="MosaicTrendRow-meta">{t('sidebar.trending_replies', { count: item.replies })}</div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  marketplacePromo(): Mithril.Children {
    const url = marketplaceUrl();
    return (
      <a className="MosaicSideCard MosaicMarketplacePromo" href={url}>
        <div className="MosaicMarketplacePromo-bg">{fa('fa-solid fa-store')}</div>
        <div className="MosaicMarketplacePromo-inner">
          <div className="MosaicMarketplacePromo-kicker">{t('marketplace_promo.kicker')}</div>
          <div className="MosaicMarketplacePromo-title">{t('marketplace_promo.title')}</div>
          <div className="MosaicMarketplacePromo-desc">{t('marketplace_promo.desc')}</div>
          <div className="MosaicMarketplacePromo-cta">
            {t('marketplace_promo.cta')} {fa('fa-solid fa-arrow-right', { fontSize: '11px' })}
          </div>
        </div>
      </a>
    );
  }
}

/**
 * The built-in Quick Actions: support first, then start a discussion, write a
 * blog post, browse tags, recent activity and the marketplace, each only when
 * its extension (or permission) is there.
 */
function defaultQuickActions(): QuickAction[] {
  const support = supportUrl();
  const links: (QuickAction | false)[] = [
    !!support && { icon: 'fa-solid fa-headset', label: ts('sidebar.qa_support_ticket'), href: support },
    { icon: 'fa-solid fa-plus', label: ts('sidebar.qa_start_discussion'), href: app.route('index') + '?composer' },
    hasBlog() &&
      app.forum.attribute<boolean>('canCreateBlogPost') && {
        icon: 'fa-solid fa-pen-to-square',
        label: ts('sidebar.qa_write_blog'),
        href: app.route('linkrobins-blog.compose'),
      },
    'flarum-tags' in flarum.extensions && { icon: 'fa-solid fa-tags', label: ts('sidebar.qa_browse_tags'), href: app.route('tags') },
    { icon: 'fa-solid fa-clock', label: ts('sidebar.qa_recent_activity'), href: app.route('index') },
    hasMarketplace() && { icon: 'fa-solid fa-store', label: ts('sidebar.qa_marketplace'), href: marketplaceUrl() },
  ];

  return links.filter((link): link is QuickAction => !!link);
}

function initials(name: string): string {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}

function formatCount(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
}
