import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import Link from 'flarum/common/components/Link';
import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import marketplaceUrl, { hasMarketplace } from '../utils/marketplaceUrl';
import { hasBlog, supportTarget } from '../utils/links';
import openComposer, { canStartDiscussion } from '../utils/openComposer';
import abbreviate from '../utils/abbreviate';

const t = (key: string, params: Record<string, unknown> = {}) => app.translator.trans(`ernestdefoe-mosaic.forum.${key}`, params);
/** Plain-string form, for labels built into data. */
const ts = (key: string) => app.translator.trans(`ernestdefoe-mosaic.forum.${key}`, {}, true);

interface QuickAction {
  icon?: string;
  label?: string;
  href?: string;
  /** One of the forum's own routes, followed in-app; admin-entered URLs are plain links. */
  route?: boolean;
  /** Run instead of following the link (Start a Discussion opens the composer). */
  onclick?: (e: MouseEvent) => void;
}

interface Contributor {
  name: string;
  username: string;
  role: string | null;
  posts: number;
  points: number;
  avatarUrl: string | null;
}

interface TrendingDiscussion {
  id: number;
  title: string;
  replies: number;
}

const TONES = ['blue', 'green', 'amber', 'rose', 'purple', 'teal', 'indigo', 'slate'];

/** A link followed in-app when it is one of the forum's own routes, else a plain link. */
const anyLink = (
  href: string,
  route: boolean,
  className: string,
  children: Mithril.Children,
  onclick?: (e: MouseEvent) => void
): Mithril.Children => (
  <Link className={className} href={href} external={!route} onclick={onclick}>
    {children}
  </Link>
);

const cardTitle = (icon: string, title: Mithril.Children): Mithril.Children => (
  <h3 className="MosaicSideCard-title">
    <Icon name={icon} style={{ color: 'var(--primary)' }} />
    <span>{title}</span>
  </h3>
);

/**
 * SidebarPanels — the stack of right-sidebar cards:
 *   Marketplace · Quick Actions · Top Contributors · Trending
 *
 * Each panel can be switched off in the admin. The Marketplace promo and Quick
 * Actions switches arrive as forum attributes; Top Contributors and Trending
 * arrive empty when switched off, and hide whenever they have nothing to show.
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="MosaicSidebarPanels">
        {!app.forum.attribute<boolean>('mosaicHideMarketplacePromo') && hasMarketplace() && this.marketplacePromo()}
        {!app.forum.attribute<boolean>('mosaicHideQuickActions') && this.quickActions()}
        {this.topContributors()}
        {this.trending()}
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
        {cardTitle('fa-solid fa-bolt', t('sidebar.quick_actions_title'))}
        {/* Unkeyed on purpose: the admin's JSON may repeat an href, and Mithril
            throws on duplicate keys; the list never reorders between redraws. */}
        {links.map((l) =>
          anyLink(
            l.href || '',
            !!l.route,
            'MosaicQuickAction',
            [
              <span className="MosaicQuickAction-ic">
                <Icon name={l.icon || 'fa-solid fa-link'} />
              </span>,
              <span>{l.label}</span>,
            ],
            l.onclick
          )
        )}
      </div>
    );
  }

  /** The server's forum-wide list, empty when the admin hid it. */
  topContributors(): Mithril.Children {
    const contributors = app.forum.attribute<Contributor[]>('mosaicTopContributors');
    if (!Array.isArray(contributors) || !contributors.length) return null;

    return (
      <div className="MosaicSideCard">
        {cardTitle('fa-solid fa-trophy', t('sidebar.top_contributors_title'))}
        {contributors.map((c, i) => {
          const row = [
            c.avatarUrl ? (
              <img className="MosaicContribRow-avatar MosaicContribRow-avatar--img" src={c.avatarUrl} alt="" />
            ) : (
              <div className={`MosaicContribRow-avatar av-${TONES[i % TONES.length]}`}>{initials(c.name)}</div>
            ),
            <div className="MosaicContribRow-meta">
              <div className="MosaicContribRow-name">
                {c.name}
                {c.role && <span className={`MosaicRoleBadge MosaicRoleBadge--${String(c.role).toLowerCase()}`}>{c.role}</span>}
              </div>
              <div className="MosaicContribRow-sub">{t('sidebar.contributor_posts', { count: c.posts })}</div>
            </div>,
            <div className="MosaicContribRow-points">{abbreviate(c.points)}</div>,
          ];

          return anyLink(app.route('user', { username: c.username }), true, 'MosaicContribRow', row);
        })}
      </div>
    );
  }

  /** The server's list, limited to discussions this visitor's groups can open; empty when hidden. */
  trending(): Mithril.Children {
    const items = app.forum.attribute<TrendingDiscussion[]>('mosaicTrending');
    if (!Array.isArray(items) || !items.length) return null;

    return (
      <div className="MosaicSideCard">
        {cardTitle('fa-solid fa-fire', t('sidebar.trending_title'))}
        {items.map((item, i) => (
          <Link key={item.id} href={app.route('discussion', { id: item.id })} className="MosaicTrendRow">
            <span className={`MosaicTrendRow-num ${i < 2 ? 'is-top' : ''}`}>{i + 1}</span>
            <div>
              <div className="MosaicTrendRow-title">{item.title}</div>
              <div className="MosaicTrendRow-meta">{t('sidebar.trending_replies', { count: item.replies })}</div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  marketplacePromo(): Mithril.Children {
    return anyLink(marketplaceUrl(), false, 'MosaicSideCard MosaicMarketplacePromo', [
      <div className="MosaicMarketplacePromo-bg">
        <Icon name="fa-solid fa-store" />
      </div>,
      <div className="MosaicMarketplacePromo-inner">
        <div className="MosaicMarketplacePromo-kicker">{t('marketplace_promo.kicker')}</div>
        <div className="MosaicMarketplacePromo-title">{t('marketplace_promo.title')}</div>
        <div className="MosaicMarketplacePromo-desc">{t('marketplace_promo.desc')}</div>
        <div className="MosaicMarketplacePromo-cta">
          {t('marketplace_promo.cta')} <Icon name="fa-solid fa-arrow-right" style={{ fontSize: '11px' }} />
        </div>
      </div>,
    ]);
  }
}

/**
 * The built-in Quick Actions: support first, then start a discussion, write a
 * blog post, browse tags, recent activity and the marketplace, each only when
 * its extension (or the visitor's permission) is there.
 */
function defaultQuickActions(): QuickAction[] {
  const support = supportTarget();
  const startDiscussion = (e: MouseEvent) => {
    e.preventDefault();
    openComposer();
  };
  const links: (QuickAction | false)[] = [
    !!support && { icon: 'fa-solid fa-headset', label: ts('sidebar.qa_support_ticket'), href: support.href, route: support.route },
    canStartDiscussion() && {
      icon: 'fa-solid fa-plus',
      label: ts('sidebar.qa_start_discussion'),
      href: app.route('index'),
      route: true,
      onclick: startDiscussion,
    },
    hasBlog() &&
      app.forum.attribute<boolean>('canCreateBlogPost') && {
        icon: 'fa-solid fa-pen-to-square',
        label: ts('sidebar.qa_write_blog'),
        href: app.route('linkrobins-blog.compose'),
        route: true,
      },
    'flarum-tags' in flarum.extensions && { icon: 'fa-solid fa-tags', label: ts('sidebar.qa_browse_tags'), href: app.route('tags'), route: true },
    { icon: 'fa-solid fa-clock', label: ts('sidebar.qa_recent_activity'), href: app.route('index'), route: true },
    hasMarketplace() && { icon: 'fa-solid fa-store', label: ts('sidebar.qa_marketplace'), href: marketplaceUrl() },
  ];

  return links.filter((link): link is QuickAction => !!link);
}

function initials(name: string): string {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}
