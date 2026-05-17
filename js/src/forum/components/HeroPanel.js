import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name, style) => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

/**
 * HeroPanel — replaces Flarum's stock IndexPage hero.
 *
 * Renders the brand gradient panel with a title, subtitle, search bar,
 * and a forum-wide stats strip (Members / Discussions / Tickets Resolved
 * / Posts / Online Now).
 *
 * Stats are passed in via attrs.stats from IndexPage's hero override.
 */
export default class HeroPanel extends Component {
  view() {
    const stats = this.attrs.stats ?? {};
    return (
      <section className="EdonlineHero">
        <h1 className="EdonlineHero-title">
          {app.forum.attribute('welcomeTitle') || 'How can we help?'}
        </h1>
        <p className="EdonlineHero-sub">
          {app.forum.attribute('welcomeMessage') ||
            'Search the community for answers, or start a new topic to get help from our team and other users.'}
        </p>

        <form
          className="EdonlineHero-search"
          onsubmit={(e) => {
            e.preventDefault();
            const q = e.target.querySelector('input').value.trim();
            if (q) m.route.set(app.route('index', { q }));
          }}
        >
          {fa('fa-solid fa-magnifying-glass', { color: 'var(--text-muted)' })}
          <input
            type="text"
            placeholder={'Try "2FA not working" or "export data"…'}
          />
          <button type="submit" className="EdonlineHero-searchBtn">
            Search
          </button>
        </form>

        <div className="EdonlineHero-stats">
          {this.renderStat('fa-solid fa-users', formatNumber(stats.members), 'Members')}
          {this.renderStat('fa-regular fa-comments', formatNumber(stats.discussions), 'Discussions')}
          {this.renderStat('fa-solid fa-circle-check', formatNumber(stats.resolved), 'Tickets resolved')}
          {this.renderStat('fa-regular fa-pen-to-square', formatNumber(stats.posts), 'Posts')}
          {this.renderStat(
            'fa-solid fa-circle',
            [formatNumber(stats.online), ' ', <span className="EdonlineHero-stat-live">live</span>],
            'Online now',
            { iconStyle: { fontSize: '8px', color: '#4ade80' } }
          )}
        </div>
      </section>
    );
  }

  renderStat(iconName, value, label, { iconStyle = {} } = {}) {
    return (
      <div className="EdonlineHero-stat">
        <div className="EdonlineHero-stat-ic">{fa(iconName, iconStyle)}</div>
        <div>
          <div className="EdonlineHero-stat-val">{value}</div>
          <div className="EdonlineHero-stat-lbl">{label}</div>
        </div>
      </div>
    );
  }
}

/** Formats large numbers with thousand separators. Returns '—' for null/undefined. */
function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US');
}
