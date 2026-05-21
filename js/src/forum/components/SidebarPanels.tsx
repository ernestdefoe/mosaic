// @ts-nocheck — TODO: declare class properties + parameter types
// Transitional marker from the audit-driven TS conversion. The
// underlying JS uses Flarum's `this.foo = ...` initialiser pattern
// which TypeScript strict mode rejects. Remove once a follow-up pass
// adds explicit property declarations and vnode/callback types.
import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import marketplaceUrlHelper from '../utils/marketplaceUrl';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name, style) => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

/**
 * SidebarPanels — the stack of right-sidebar cards that match the render:
 *   Marketplace · Quick Actions · Top Contributors · Trending
 *
 * Rendered after Flarum's stock IndexPage sidebar nav via an override
 * on IndexPage.prototype.sidebar(). Each panel is intentionally
 * placeholder-friendly: it pulls real data when an obvious source
 * exists (e.g. top discussions for Trending), and falls back to
 * sensible defaults otherwise so the layout never shows empty cards.
 *
 * Hide a panel by setting the corresponding forum attribute to true:
 *   mosaicHideMarketplacePromo
 *   mosaicHideQuickActions
 *   mosaicHideTopContributors
 *   mosaicHideTrending
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="MosaicSidebarPanels">
        {!app.forum.attribute('mosaicHideMarketplacePromo') && this.marketplacePromo()}
        {!app.forum.attribute('mosaicHideQuickActions') && this.quickActions()}
        {!app.forum.attribute('mosaicHideTopContributors') && this.topContributors()}
        {!app.forum.attribute('mosaicHideTrending') && this.trending()}
      </div>
    );
  }

  quickActions() {
    /* Three layers of fallback so the panel is useful on a vanilla
     * Flarum install AND fully customizable by the admin:
     *
     *   1. Admin-configured rows (mosaicQuickActions attribute, written
     *      by the dynamic row editor in admin/extend.js). Wins outright
     *      when at least one row has a label + href.
     *   2. Built-in generic forum defaults — Start a Discussion / Browse
     *      Tags / Recent Activity. Work on any Flarum install.
     *   3. Auto-detected integrations APPENDED to the defaults — Support
     *      and Marketplace links surface only when those extensions
     *      expose their URL attributes.
     *
     * The Hide-Quick-Actions toggle in admin short-circuits this entire
     * panel before we get here (see view()). */
    const fromAttr = app.forum.attribute('mosaicQuickActions');
    const configured =
      Array.isArray(fromAttr)
        ? fromAttr.filter((a) => a && (a.label || '').trim() && (a.href || '').trim())
        : [];

    let links;
    if (configured.length) {
      links = configured;
    } else {
      links = [
        { icon: 'fa-solid fa-plus', label: 'Start a Discussion', href: app.route('index') + '?composer' },
        { icon: 'fa-solid fa-tags', label: 'Browse Tags', href: app.route('tags') || '/tags' },
        { icon: 'fa-solid fa-clock', label: 'Recent Activity', href: '/all' },
      ];

      /* Conditionally append support/marketplace ONLY when those
       * extensions are detected via their forum attributes. */
      const supportUrl = app.forum.attribute('supportUrl');
      if (supportUrl) {
        links.unshift({ icon: 'fa-solid fa-headset', label: 'Open a Support Ticket', href: supportUrl });
      }
      const marketplaceUrl =
        app.forum.attribute('marketplaceUrl') ||
        (app.forum.attribute('marketplace_shop_path')
          ? '/' + String(app.forum.attribute('marketplace_shop_path')).replace(/^\//, '')
          : null);
      if (marketplaceUrl) {
        links.push({ icon: 'fa-solid fa-store', label: 'Visit the Marketplace', href: marketplaceUrl });
      }
    }

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-bolt', { color: 'var(--primary)' })}<span>Quick Actions</span>
        </h3>
        {links.map((l) => (
          <a className="MosaicQuickAction" href={l.href}>
            <span className="MosaicQuickAction-ic">{fa(l.icon)}</span>
            <span>{l.label}</span>
          </a>
        ))}
      </div>
    );
  }

  topContributors() {
    /* Operator-provided list wins. Each item shape:
     *   { name, role?, meta?, points, tone?, avatarUrl?, href? } */
    const fromAttr = app.forum.attribute('mosaicTopContributors');
    if (Array.isArray(fromAttr) && fromAttr.length) {
      return this.renderContribCard(fromAttr.map((c) => ({ ...c })));
    }

    /* Otherwise pull real users from the store (those who've posted
     * comments) and rank by commentCount. The store only contains users
     * who've been referenced by loaded data — usually enough on the
     * index page since each discussion row pulls in its author and last
     * poster. */
    const users = app.store.all('users') || [];
    const ranked = users
      .filter((u) => u && typeof u.commentCount === 'function' && (u.commentCount() || 0) > 0)
      .sort((a, b) => (b.commentCount() || 0) - (a.commentCount() || 0))
      .slice(0, 5);

    /* If nothing meaningful, hide the panel entirely rather than show
     * fake names. Operators wanting placeholder content can populate
     * mosaicTopContributors above. */
    if (ranked.length < 1) return null;

    const tones = ['blue', 'green', 'amber', 'rose', 'purple', 'teal', 'indigo', 'slate'];
    const data = ranked.map((u, i) => {
      const c = (typeof u.commentCount === 'function' && u.commentCount()) || 0;
      const d = (typeof u.discussionCount === 'function' && u.discussionCount()) || 0;
      const group = u.groups?.()?.[0];
      const role = group ? group.nameSingular?.() : null;
      return {
        name: u.displayName?.() || u.username?.() || '—',
        role: role && /(staff|mod|admin|expert)/i.test(role) ? role : null,
        meta: c === 1 ? '1 post' : `${formatCount(c)} posts`,
        points: formatCount(c + d),
        tone: tones[i % tones.length],
        avatarUrl: u.avatarUrl?.() || null,
        href: app.route.user?.(u) || '#',
      };
    });

    return this.renderContribCard(data);
  }

  renderContribCard(contributors) {
    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-trophy', { color: 'var(--primary)' })}<span>Top Contributors</span>
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

  trending() {
    /* Pull whatever's in the discussions store, rank by participantCount,
     * and only render the panel when we have at least one real discussion
     * to show. Mirrors topContributors()' "no fake placeholders" stance:
     * better an absent widget than four fabricated rows that confuse the
     * operator about whether their forum is actually trending anything. */
    let items = [];
    try {
      const discussions = app.store.all('discussions') || [];
      items = discussions
        .filter((d) => typeof d.title === 'function')
        .sort((a, b) => (b.participantCount?.() ?? 0) - (a.participantCount?.() ?? 0))
        .slice(0, 4)
        .map((d) => ({
          title: d.title(),
          meta: `${d.commentCount?.() ?? 0} replies`,
          href: app.route.discussion(d),
        }));
    } catch (e) { /* ignore — empty items array hides the panel below */ }

    if (!items.length) return null;

    return (
      <div className="MosaicSideCard">
        <h3 className="MosaicSideCard-title">
          {fa('fa-solid fa-fire', { color: 'var(--primary)' })}<span>Trending</span>
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

  marketplacePromo() {
    /* Delegated to utils/marketplaceUrl so this duplicate of the
     * MarketplacePromoCard markup can't drift on the default URL.
     * Was '/marketplace' which 404'd on ramon/marketplace installs
     * (the real mount is /shop). */
    const url = marketplaceUrlHelper();
    return (
      <a className="MosaicSideCard MosaicMarketplacePromo" href={url}>
        <div className="MosaicMarketplacePromo-bg">{fa('fa-solid fa-store')}</div>
        <div className="MosaicMarketplacePromo-inner">
          <div className="MosaicMarketplacePromo-kicker">NEW · Marketplace</div>
          <div className="MosaicMarketplacePromo-title">Premium themes &amp; extensions</div>
          <div className="MosaicMarketplacePromo-desc">
            Digital products, services, subscriptions, and private extensions from trusted sellers.
          </div>
          <div className="MosaicMarketplacePromo-cta">
            Browse the store {fa('fa-solid fa-arrow-right', { fontSize: '11px' })}
          </div>
        </div>
      </a>
    );
  }
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}

function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
}
