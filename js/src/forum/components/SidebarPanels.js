import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

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
 *   edonlineHideMarketplacePromo
 *   edonlineHideQuickActions
 *   edonlineHideTopContributors
 *   edonlineHideTrending
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="EdonlineSidebarPanels">
        {!app.forum.attribute('edonlineHideMarketplacePromo') && this.marketplacePromo()}
        {!app.forum.attribute('edonlineHideQuickActions') && this.quickActions()}
        {!app.forum.attribute('edonlineHideTopContributors') && this.topContributors()}
        {!app.forum.attribute('edonlineHideTrending') && this.trending()}
      </div>
    );
  }

  quickActions() {
    /* Built-in defaults pick up the marketplace shop path and the
     * support extension's path from forum attributes when present.
     * Operators can override either via supportUrl / marketplaceUrl
     * attributes, or replace the whole list via edonlineQuickActions
     * (array of {label, href, icon}). */
    const fromAttr = app.forum.attribute('edonlineQuickActions');
    const links =
      Array.isArray(fromAttr) && fromAttr.length
        ? fromAttr
        : [
            {
              icon: 'fa-solid fa-headset',
              label: 'Open a Support Ticket',
              href: app.forum.attribute('supportUrl') || '/support',
            },
            {
              icon: 'fa-solid fa-store',
              label: 'Visit the Marketplace',
              href:
                app.forum.attribute('marketplaceUrl') ||
                '/' + (app.forum.attribute('marketplace_shop_path') || 'shop').replace(/^\//, ''),
            },
          ];
    return (
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fa-solid fa-bolt', { color: 'var(--primary)' })}<span>Quick Actions</span>
        </h3>
        {links.map((l) => (
          <a className="EdonlineQuickAction" href={l.href}>
            <span className="EdonlineQuickAction-ic">{fa(l.icon)}</span>
            <span>{l.label}</span>
          </a>
        ))}
      </div>
    );
  }

  topContributors() {
    /* Operator-provided list wins. Each item shape:
     *   { name, role?, meta?, points, tone?, avatarUrl?, href? } */
    const fromAttr = app.forum.attribute('edonlineTopContributors');
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
     * edonlineTopContributors above. */
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
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fa-solid fa-trophy', { color: 'var(--primary)' })}<span>Top Contributors</span>
        </h3>
        {contributors.map((c) => (
          <a className="EdonlineContribRow" href={c.href || '#'}>
            {c.avatarUrl ? (
              <img className="EdonlineContribRow-avatar EdonlineContribRow-avatar--img" src={c.avatarUrl} alt="" />
            ) : (
              <div className={`EdonlineContribRow-avatar av-${c.tone || 'slate'}`}>{initials(c.name)}</div>
            )}
            <div className="EdonlineContribRow-meta">
              <div className="EdonlineContribRow-name">
                {c.name}
                {c.role && <span className={`EdonlineRoleBadge EdonlineRoleBadge--${String(c.role).toLowerCase()}`}>{c.role}</span>}
              </div>
              <div className="EdonlineContribRow-sub">{c.meta}</div>
            </div>
            <div className="EdonlineContribRow-points">{c.points}</div>
          </a>
        ))}
      </div>
    );
  }

  trending() {
    /* Pull whatever's in the discussions store sorted by participantCount,
     * fall back to a placeholder list when the store is empty. */
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
    } catch (e) { /* ignore — fall through to fallback */ }

    if (!items.length) {
      items = [
        { title: 'Login broken on Safari 17', meta: '14 replies · bug', href: '#' },
        { title: 'Bulk-edit tags feature request', meta: '23 replies · feature', href: '#' },
        { title: 'Webhook payloads missing fields', meta: '11 replies · api', href: '#' },
        { title: 'CSV export truncation', meta: '9 replies · export', href: '#' },
      ];
    }

    return (
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fa-solid fa-fire', { color: 'var(--primary)' })}<span>Trending</span>
        </h3>
        {items.map((t, i) => (
          <a href={t.href} className="EdonlineTrendRow">
            <span className={`EdonlineTrendRow-num ${i < 2 ? 'is-top' : ''}`}>{i + 1}</span>
            <div>
              <div className="EdonlineTrendRow-title">{t.title}</div>
              <div className="EdonlineTrendRow-meta">{t.meta}</div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  marketplacePromo() {
    const url = app.forum.attribute('marketplaceUrl') || '/marketplace';
    return (
      <a className="EdonlineSideCard EdonlineMarketplacePromo" href={url}>
        <div className="EdonlineMarketplacePromo-bg">{fa('fa-solid fa-store')}</div>
        <div className="EdonlineMarketplacePromo-inner">
          <div className="EdonlineMarketplacePromo-kicker">NEW · Marketplace</div>
          <div className="EdonlineMarketplacePromo-title">Premium themes &amp; extensions</div>
          <div className="EdonlineMarketplacePromo-desc">
            Digital products, services, subscriptions, and private extensions from trusted sellers.
          </div>
          <div className="EdonlineMarketplacePromo-cta">
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
