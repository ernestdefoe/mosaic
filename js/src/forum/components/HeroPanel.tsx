import Component, { ComponentAttrs } from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import User from 'flarum/common/models/User';
import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import MosaicComposerTrigger from './MosaicComposerTrigger';
import translate from '../utils/translate';

/** Forum-wide counts the hero strip renders. null → the tile shows "—". */
export interface ForumStats {
  members: number | null;
  discussions: number | null;
  resolved: number | null;
  posts: number | null;
  online: number | null;
}

/** One entry of the server-provided `mosaicOnlineUsers` payload. */
interface OnlineUser {
  id: number | string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface HeroPanelAttrs extends ComponentAttrs {
  stats?: Partial<ForumStats>;
}

type IconStyle = Record<string, string | number>;

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name: string, style?: IconStyle): Mithril.Children => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

/**
 * HeroPanel — replaces Flarum's stock IndexPage hero.
 *
 * Renders the brand gradient panel with a title, subtitle, and a forum-wide
 * stats strip (Members / Discussions / Tickets Resolved / Posts / Online Now).
 * The Online Now tile is interactive — clicking it toggles a popover listing
 * recently-active users (data from the `mosaicOnlineUsers` forum attribute,
 * populated server-side by AddForumStatistics::onlineUsers() which honors
 * per-user discloseOnline preferences).
 */
export default class HeroPanel extends Component<HeroPanelAttrs> {
  onlineOpen: boolean = false;

  private onDocClick!: (e: MouseEvent) => void;
  private onKeydown!: (e: KeyboardEvent) => void;
  private userCache?: Map<number | string, User>;

  oninit(vnode: Mithril.Vnode<HeroPanelAttrs, this>) {
    super.oninit(vnode);
    this.onlineOpen = false;

    /* Close the popover on any outside click (incl. Escape). Bound here so
     * the same reference is added in oncreate and removed in onremove. */
    this.onDocClick = (e: MouseEvent) => {
      if (!this.onlineOpen) return;
      const popoverRoot = this.element?.querySelector?.('.MosaicHero-onlineWrap');
      if (popoverRoot && e.target instanceof Node && !popoverRoot.contains(e.target)) {
        this.onlineOpen = false;
        m.redraw();
      }
    };
    this.onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.onlineOpen) {
        this.onlineOpen = false;
        m.redraw();
      }
    };
  }

  oncreate(vnode: Mithril.VnodeDOM<HeroPanelAttrs, this>) {
    super.oncreate(vnode);
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKeydown);
  }

  onremove(vnode: Mithril.VnodeDOM<HeroPanelAttrs, this>) {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKeydown);
    super.onremove(vnode);
  }

  view() {
    const stats = this.attrs.stats ?? {};
    /* Hero text resolution: Flarum's welcomeTitle/welcomeMessage admin
     * attributes first, then translator keys, then hardcoded English. */
    const heroTitle = app.forum.attribute<string | undefined>('welcomeTitle') || translate('hero.title', 'How can we help?');
    const heroSub =
      app.forum.attribute<string | undefined>('welcomeMessage') ||
      translate('hero.subtitle', 'Search the community for answers, or start a new topic to get help from our team and other users.');

    return (
      <section className="MosaicHero">
        <h1 className="MosaicHero-title">{heroTitle}</h1>
        <p className="MosaicHero-sub">{heroSub}</p>

        {MosaicComposerTrigger.component()}

        <div className="MosaicHero-stats">
          {this.renderStat('fa-solid fa-users', formatNumber(stats.members), translate('hero.stat_members', 'Members'))}
          {this.renderStat('fa-regular fa-comments', formatNumber(stats.discussions), translate('hero.stat_discussions', 'Discussions'))}
          {/* Tickets tile auto-hides when stats.resolved is null (support
           * extension not installed) and can be suppressed via the
           * mosaicHideTicketsTile admin toggle. */}
          {stats.resolved != null && !app.forum.attribute<boolean>('mosaicHideTicketsTile')
            ? this.renderStat('fa-solid fa-ticket', formatNumber(stats.resolved), translate('hero.stat_resolved', 'Tickets resolved'))
            : null}
          {this.renderStat('fa-regular fa-pen-to-square', formatNumber(stats.posts), translate('hero.stat_posts', 'Posts'))}
          {this.renderOnlineNowStat(stats.online ?? null)}
        </div>
      </section>
    );
  }

  renderStat(iconName: string, value: Mithril.Children, label: Mithril.Children, { iconStyle }: { iconStyle?: IconStyle } = {}): Mithril.Children {
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

  /* Return a User model instance for one online-user payload. Prefer the
   * store's hydrated record when available; otherwise build a standalone
   * model from the forum-attribute shape. Memoized per render. */
  userFor(u: OnlineUser): User {
    if (!this.userCache) this.userCache = new Map();
    const cached = this.userCache.get(u.id);
    if (cached) return cached;

    const fromStore = app.store.getById<User>('users', String(u.id));
    const user =
      fromStore ||
      new User({
        id: String(u.id),
        type: 'users',
        attributes: {
          username: u.username,
          displayName: u.displayName || u.username,
          avatarUrl: u.avatarUrl || null,
        },
      });
    this.userCache.set(u.id, user);
    return user;
  }

  renderOnlineNowStat(rawCount: number | null): Mithril.Children {
    const users = (app.forum.attribute<OnlineUser[]>('mosaicOnlineUsers') || []) as OnlineUser[];
    const value = formatNumber(rawCount);

    return (
      <div className={`MosaicHero-stat MosaicHero-onlineWrap ${this.onlineOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="MosaicHero-stat-trigger"
          aria-expanded={this.onlineOpen}
          aria-haspopup="true"
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            this.onlineOpen = !this.onlineOpen;
          }}
        >
          <div className="MosaicHero-stat-ic">{fa('fa-solid fa-circle', { fontSize: '8px', color: '#4ade80' })}</div>
          <div>
            <div className="MosaicHero-stat-val">
              {value} <span className="MosaicHero-stat-live">live</span>
            </div>
            <div className="MosaicHero-stat-lbl">
              {translate('hero.stat_online', 'Online now')}{' '}
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
              <div className="MosaicHero-onlinePopover-empty">No one's online right now.</div>
            ) : (
              <ul className="MosaicHero-onlineList">
                {users.map((u) => {
                  const userModel = this.userFor(u);
                  return (
                    <li key={u.id}>
                      <a
                        href={'/u/' + encodeURIComponent(u.username || '')}
                        className="MosaicHero-onlineRow"
                        role="menuitem"
                        onclick={() => {
                          this.onlineOpen = false;
                        }}
                      >
                        <Avatar user={userModel} className="MosaicHero-onlineAvatar" />
                        <span className="MosaicHero-onlineName">{u.displayName || u.username}</span>
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
function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  // No fixed locale — group digits per the visitor's own locale.
  return Number(n).toLocaleString();
}
