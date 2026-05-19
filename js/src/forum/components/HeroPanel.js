import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import User from 'flarum/common/models/User';
import app from 'flarum/forum/app';
import MosaicComposerTrigger from './MosaicComposerTrigger';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name, style) => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

/**
 * HeroPanel — replaces Flarum's stock IndexPage hero.
 *
 * Renders the brand gradient panel with a title, subtitle, search bar,
 * and a forum-wide stats strip (Members / Discussions / Tickets Resolved
 * / Posts / Online Now).
 *
 * The Online Now tile is interactive — clicking it toggles a popover
 * listing the recently-active users (data from the
 * `mosaicOnlineUsers` forum attribute, populated server-side by
 * AddForumStatistics::onlineUsers() which honors per-user discloseOnline
 * preferences).
 *
 * Stats are passed in via attrs.stats from IndexPage's hero override.
 */
export default class HeroPanel extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.onlineOpen = false;

    /* Close the popover on any outside click (incl. Escape). Bound
     * here so the same reference is added in oncreate and removed in
     * onremove. */
    this.onDocClick = (e) => {
      if (!this.onlineOpen) return;
      const popoverRoot = this.element?.querySelector?.('.MosaicHero-onlineWrap');
      if (popoverRoot && !popoverRoot.contains(e.target)) {
        this.onlineOpen = false;
        m.redraw();
      }
    };
    this.onKeydown = (e) => {
      if (e.key === 'Escape' && this.onlineOpen) {
        this.onlineOpen = false;
        m.redraw();
      }
    };
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKeydown);
  }

  onremove(vnode) {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKeydown);
    super.onremove(vnode);
  }

  view() {
    const stats = this.attrs.stats ?? {};
    return (
      <section className="MosaicHero">
        <h1 className="MosaicHero-title">
          {app.forum.attribute('welcomeTitle') || 'How can we help?'}
        </h1>
        <p className="MosaicHero-sub">
          {app.forum.attribute('welcomeMessage') ||
            'Search the community for answers, or start a new topic to get help from our team and other users.'}
        </p>

        {MosaicComposerTrigger.component()}

        <div className="MosaicHero-stats">
          {this.renderStat('fa-solid fa-users', formatNumber(stats.members), 'Members')}
          {this.renderStat('fa-regular fa-comments', formatNumber(stats.discussions), 'Discussions')}
          {this.renderStat('fa-solid fa-ticket', formatNumber(stats.resolved), 'Tickets resolved')}
          {this.renderStat('fa-regular fa-pen-to-square', formatNumber(stats.posts), 'Posts')}
          {this.renderOnlineNowStat(stats.online)}
        </div>
      </section>
    );
  }

  renderStat(iconName, value, label, { iconStyle = {} } = {}) {
    return (
      <div className="MosaicHero-stat">
        <div className="MosaicHero-stat-ic">{fa(iconName, iconStyle)}</div>
        <div>
          <div className="MosaicHero-stat-val">{value}</div>
          <div className="MosaicHero-stat-lbl">{label}</div>
        </div>
      </div>
    );
  }

  /* Return a User model instance for one online-user payload. Prefer
   * the store's hydrated record (richer attrs from other parts of the
   * SPA) when available; otherwise build a standalone model from the
   * forum-attribute shape. Memoize per render to avoid re-constructing
   * on every redraw caused by the popover toggle. */
  userFor(u) {
    if (!this._userCache) this._userCache = new Map();
    if (this._userCache.has(u.id)) return this._userCache.get(u.id);

    const fromStore = app.store.getById('users', u.id);
    const user = fromStore || new User({
      id: String(u.id),
      type: 'users',
      attributes: {
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || null,
      },
    });
    this._userCache.set(u.id, user);
    return user;
  }

  renderOnlineNowStat(rawCount) {
    const users = app.forum.attribute('mosaicOnlineUsers') || [];
    const value = formatNumber(rawCount);

    return (
      <div className={`MosaicHero-stat MosaicHero-onlineWrap ${this.onlineOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="MosaicHero-stat-trigger"
          aria-expanded={this.onlineOpen}
          aria-haspopup="true"
          onclick={(e) => {
            e.stopPropagation();
            this.onlineOpen = !this.onlineOpen;
          }}
        >
          <div className="MosaicHero-stat-ic">
            {fa('fa-solid fa-circle', { fontSize: '8px', color: '#4ade80' })}
          </div>
          <div>
            <div className="MosaicHero-stat-val">
              {value} <span className="MosaicHero-stat-live">live</span>
            </div>
            <div className="MosaicHero-stat-lbl">
              Online now{' '}
              {fa('fa-solid fa-chevron-down', {
                fontSize: '9px',
                marginLeft: '4px',
                transition: 'transform 0.15s',
                transform: this.onlineOpen ? 'rotate(180deg)' : 'none',
                opacity: 0.7,
              })}
            </div>
          </div>
        </button>

        {this.onlineOpen && (
          <div className="MosaicHero-onlinePopover" role="menu">
            {users.length === 0 ? (
              <div className="MosaicHero-onlinePopover-empty">
                No one's online right now.
              </div>
            ) : (
              <ul className="MosaicHero-onlineList">
                {users.map((u) => {
                  /* Build a User model (or fetch a hydrated one from the
                   * store) so Flarum's stock Avatar component paints the
                   * same auto-colored initial circle it draws everywhere
                   * else — matches DiscussionListItem, Post, profile.
                   *
                   * Why not just <img src={u.avatarUrl}>: when avatarUrl
                   * is null (the common case — most accounts don't upload
                   * an image), the previous render fell through to a
                   * neutral gray initials box that didn't match the rest
                   * of the forum. Avatar.color() derives a per-user color
                   * from displayName via stringToColor(), so the dropdown
                   * row now visually matches the post-card avatar for the
                   * same user. */
                  const userModel = this.userFor(u);
                  return (
                    <li key={u.id}>
                      <a
                        href={'/u/' + encodeURIComponent(u.username || '')}
                        className="MosaicHero-onlineRow"
                        role="menuitem"
                        onclick={() => { this.onlineOpen = false; }}
                      >
                        <Avatar user={userModel} className="MosaicHero-onlineAvatar" />
                        <span className="MosaicHero-onlineName">
                          {u.displayName || u.username}
                        </span>
                        <span className="MosaicHero-onlineDot" aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
}

/** Formats large numbers with thousand separators. Returns '—' for null/undefined. */
function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US');
}

