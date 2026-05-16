import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name, style) => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

/**
 * SidebarPanels — the stack of right-sidebar cards that match the render:
 *   Quick Actions · System Status · Top Contributors · Trending · Marketplace
 *
 * Rendered after Flarum's stock IndexPage sidebar nav via an override
 * on IndexPage.prototype.sidebar(). Each panel is intentionally
 * placeholder-friendly: it pulls real data when an obvious source
 * exists (e.g. top discussions for Trending), and falls back to
 * sensible defaults otherwise so the layout never shows empty cards.
 *
 * Hide a panel by setting the corresponding forum attribute to true:
 *   edonlineHideQuickActions
 *   edonlineHideSystemStatus
 *   edonlineHideTopContributors
 *   edonlineHideTrending
 *   edonlineHideMarketplacePromo
 */
export default class SidebarPanels extends Component {
  view() {
    return (
      <div className="EdonlineSidebarPanels">
        {!app.forum.attribute('edonlineHideQuickActions') && this.quickActions()}
        {!app.forum.attribute('edonlineHideSystemStatus') && this.systemStatus()}
        {!app.forum.attribute('edonlineHideTopContributors') && this.topContributors()}
        {!app.forum.attribute('edonlineHideTrending') && this.trending()}
        {!app.forum.attribute('edonlineHideMarketplacePromo') && this.marketplacePromo()}
      </div>
    );
  }

  quickActions() {
    const links = [
      { icon: 'fas fa-headset', label: 'Open a Support Ticket', href: app.forum.attribute('supportUrl') || '/support' },
      { icon: 'fas fa-store', label: 'Visit the Marketplace', href: app.forum.attribute('marketplaceUrl') || '/marketplace' },
      { icon: 'fas fa-book', label: 'Knowledge Base', href: app.forum.attribute('knowledgeBaseUrl') || '/kb' },
      { icon: 'fas fa-signal', label: 'Check Service Status', href: app.forum.attribute('statusUrl') || '/status' },
    ];
    return (
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fas fa-bolt', { color: 'var(--primary)' })}<span>Quick Actions</span>
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

  systemStatus() {
    /* Hardcoded placeholder set — operators can replace with a real
     * status integration (statuspage.io, instatus, etc.) by overriding
     * this component or piping data through a forum attribute. */
    const services = app.forum.attribute('edonlineServiceStatus') || [
      { label: 'API', state: 'ok', value: 'Operational' },
      { label: 'Dashboard', state: 'ok', value: 'Operational' },
      { label: 'Webhooks', state: 'warn', value: 'Degraded' },
      { label: 'SSO', state: 'ok', value: 'Operational' },
    ];
    return (
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fas fa-server', { color: 'var(--primary)' })}<span>System Status</span>
        </h3>
        {services.map((s) => (
          <div className="EdonlineStatusRow">
            <span className={`ind ind--${s.state}`} />
            <span className="label">{s.label}</span>
            <span className={`val val--${s.state}`}>{s.value}</span>
          </div>
        ))}
      </div>
    );
  }

  topContributors() {
    const fromAttr = app.forum.attribute('edonlineTopContributors');
    const contributors =
      Array.isArray(fromAttr) && fromAttr.length
        ? fromAttr
        : [
            { name: 'Sara Reyes', role: 'Expert', meta: '312 helpful answers', points: '2.4k', tone: 'green' },
            { name: 'Alex Karim', role: 'Staff', meta: '198 helpful answers', points: '1.8k', tone: 'blue' },
            { name: 'Lina Marchetti', role: 'Mod', meta: '156 helpful answers', points: '1.5k', tone: 'purple' },
            { name: 'Devon Ng', meta: '142 helpful answers', points: '1.3k', tone: 'amber' },
            { name: 'Eve Lindgren', meta: '98 helpful answers', points: '980', tone: 'rose' },
          ];
    return (
      <div className="EdonlineSideCard">
        <h3 className="EdonlineSideCard-title">
          {fa('fas fa-trophy', { color: 'var(--primary)' })}<span>Top Contributors</span>
        </h3>
        {contributors.map((c) => (
          <div className="EdonlineContribRow">
            <div className={`EdonlineContribRow-avatar av-${c.tone || 'slate'}`}>{initials(c.name)}</div>
            <div className="EdonlineContribRow-meta">
              <div className="EdonlineContribRow-name">
                {c.name}
                {c.role && <span className={`EdonlineRoleBadge EdonlineRoleBadge--${c.role.toLowerCase()}`}>{c.role}</span>}
              </div>
              <div className="EdonlineContribRow-sub">{c.meta}</div>
            </div>
            <div className="EdonlineContribRow-points">{c.points}</div>
          </div>
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
          {fa('fas fa-fire', { color: 'var(--primary)' })}<span>Trending</span>
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
        <div className="EdonlineMarketplacePromo-bg">{fa('fas fa-store')}</div>
        <div className="EdonlineMarketplacePromo-inner">
          <div className="EdonlineMarketplacePromo-kicker">NEW · Marketplace</div>
          <div className="EdonlineMarketplacePromo-title">Premium themes &amp; extensions</div>
          <div className="EdonlineMarketplacePromo-desc">
            Digital products, services, subscriptions, and private extensions from trusted sellers.
          </div>
          <div className="EdonlineMarketplacePromo-cta">
            Browse the store {fa('fas fa-arrow-right', { fontSize: '11px' })}
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
