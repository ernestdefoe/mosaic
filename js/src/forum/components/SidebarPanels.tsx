import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import extractText from 'flarum/common/utils/extractText';
import marketplaceUrlHelper from '../utils/marketplaceUrl';
import translate from '../utils/translate';

type IconStyle = Record<string, string | number>;

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
 * Each panel pulls real data when an obvious source exists and falls back to
 * sensible defaults otherwise. Hide a panel by setting the corresponding
 * mosaicHide* forum attribute to true.
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="MosaicSidebarPanels">
        {!app.forum.attribute<boolean>('mosaicHideMarketplacePromo') && this.marketplacePromo()}
        {!app.forum.attribute<boolean>('mosaicHideQuickActions') && this.quickActions()}
        {!app.forum.attribute<boolean>('mosaicHideTopContributors') && this.topContributors()}
        {!app.forum.attribute<boolean>('mosaicHideTrending') && this.trending()}
      </div>
    );
  }

  quickActions(): Mithril.Children {
    /* Admin-configured rows win; otherwise built-in defaults plus
     * auto-detected support/marketplace integrations. */
    const fromAttr = app.forum.attribute<QuickAction[]>('mosaicQuickActions');
    const configured = Array.isArray(fromAttr) ? fromAttr.filter((a) => a && (a.label || '').trim() && (a.href || '').trim()) : [];

    let links: QuickAction[];
    if (configured.length) {
      links = configured;
    } else {
      links = [
        {
          icon: 'fa-solid fa-plus',
          label: extractText(translate('sidebar.qa_start_discussion', 'Start a Discussion')),
          href: app.route('index') + '?composer',
        },
        {
          icon: 'fa-solid fa-tags',
          label: extractText(translate('sidebar.qa_browse_tags', 'Browse Tags')),
          href: app.route('tags') || '/tags',
        },
        {
          icon: 'fa-solid fa-clock',
          label: extractText(translate('sidebar.qa_recent_activity', 'Recent Activity')),
          href: '/all',
        },
      ];

      // Blog post compose — shown when the user has permission to write posts.
      if (app.forum.attribute<boolean>('canCreateBlogPost')) {
        links.splice(1, 0, {
          icon: 'fa-solid fa-pen-to-square',
          label: extractText(translate('sidebar.qa_write_blog', 'Write a Blog Post')),
          href: '/blog/compose',
        });
      }

      const supportUrl = app.forum.attribute<string>('supportUrl');
      if (supportUrl) {
        links.unshift({
          icon: 'fa-solid fa-headset',
          label: extractText(translate('sidebar.qa_support_ticket', 'Open a Support Ticket')),
          href: supportUrl,
        });
      }
      const shopPath = app.forum.attribute<string>('marketplace_shop_path');
      const marketplaceUrl = app.forum.attribute<string>('marketplaceUrl') || (shopPath ? '/' + String(shopPath).replace(/^\//, '') : null);
      if (marketplaceUrl) {
        links.push({
          icon: 'fa-solid fa-store',
          label: extractText(translate('sidebar.qa_marketplace', 'Visit the Marketplace')),
          href: marketplaceUrl,
        });
      }
    }

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-bolt', { color: 'var(--primary)' })}
          <span>{translate('sidebar.quick_actions_title', 'Quick Actions')}</span>
        </h3>
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
    // Forum-wide list, computed + cached server-side and exposed as the
    // mosaicTopContributors attribute — reliable on every page, unlike the old
    // store snapshot (which only held the current page's ~20 records). An admin
    // JSON override is honoured server-side. Tone (avatar colour) is assigned
    // per row here from a fixed palette.
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
          <span>{translate('sidebar.top_contributors_title', 'Top Contributors')}</span>
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
              <div className="MosaicContribRow-sub">{c.meta}</div>
            </div>
            <div className="MosaicContribRow-points">{c.points}</div>
          </a>
        ))}
      </div>
    );
  }

  trending(): Mithril.Children {
    // Forum-wide trending discussions, computed + cached server-side (against
    // guest visibility, so nothing private leaks) and exposed as the
    // mosaicTrending attribute. Reliable on every page, unlike the old store
    // snapshot of the current page's discussions.
    const items = app.forum.attribute<{ title: string; meta: string; href: string }[]>('mosaicTrending');

    if (!Array.isArray(items) || !items.length) return null;

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-fire', { color: 'var(--primary)' })}
          <span>{translate('sidebar.trending_title', 'Trending')}</span>
        </h3>
        {items.map((t, i) => (
          <a href={t.href} className="MosaicTrendRow">
            <span className={`MosaicTrendRow-num ${i < 2 ? 'is-top' : ''}`}>{i + 1}</span>
            <div>
              <div className="MosaicTrendRow-title">{t.title}</div>
              <div className="MosaicTrendRow-meta">{t.meta}</div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  marketplacePromo(): Mithril.Children {
    const url = marketplaceUrlHelper();
    return (
      <a className="MosaicSideCard MosaicMarketplacePromo" href={url}>
        <div className="MosaicMarketplacePromo-bg">{fa('fa-solid fa-store')}</div>
        <div className="MosaicMarketplacePromo-inner">
          <div className="MosaicMarketplacePromo-kicker">{translate('marketplace_promo.kicker', 'NEW · Marketplace')}</div>
          <div className="MosaicMarketplacePromo-title">{translate('marketplace_promo.title', 'Premium themes & extensions')}</div>
          <div className="MosaicMarketplacePromo-desc">
            {translate('marketplace_promo.desc', 'Digital products, services, subscriptions, and private extensions from trusted sellers.')}
          </div>
          <div className="MosaicMarketplacePromo-cta">
            {translate('marketplace_promo.cta', 'Browse the store')} {fa('fa-solid fa-arrow-right', { fontSize: '11px' })}
          </div>
        </div>
      </a>
    );
  }
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
