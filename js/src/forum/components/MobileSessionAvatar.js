import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import Avatar from 'flarum/common/components/Avatar';

/**
 * MobileSessionAvatar — a tiny floating session control mounted to
 * document.body so it lives outside #drawer (which is transform-
 * translated off-screen on mobile, trapping any position:fixed
 * descendant inside its containing block).
 *
 * Renders:
 *   - Authenticated: a circular avatar button linking to the user's
 *     profile. Tapping the user's profile is the most common mobile
 *     action; the full session dropdown still lives in the drawer
 *     (hamburger → user row) for log-out / preferences.
 *   - Guest: a "Log In" pill that opens Flarum's LogInModal.
 *
 * Visibility is gated by CSS @media (max-width: 767px) on
 * .MosaicMobileSession — desktop never sees this element.
 */
export default class MobileSessionAvatar extends Component {
  view() {
    /* `app.session` may be transiently undefined during very early
     * renders before the SPA has hydrated — defensive optional-chain
     * so the body-mounted component never crashes the whole forum. */
    const user = app?.session?.user;

    if (user) {
      return (
        <div className="MosaicMobileSession">
          <a
            className="MosaicMobileSession-trigger"
            href={app.route.user(user)}
            aria-label="Your profile"
            onclick={(e) => {
              /* Let Mithril's router handle SPA navigation when possible. */
              if (e.shiftKey || e.ctrlKey || e.metaKey || e.button === 1) return;
              e.preventDefault();
              m.route.set(app.route.user(user));
            }}
          >
            <Avatar user={user} />

          </a>
        </div>
      );
    }

    return (
      <div className="MosaicMobileSession">
        <button
          type="button"
          className="MosaicMobileSession-trigger"
          aria-label="Log in"
          onclick={async () => {
            /* In Flarum 2 the LogInModal is chunk-split — dynamic import. */
            try {
              const mod = await import('flarum/forum/components/LogInModal');
              app.modal.show(mod.default);
            } catch (e) {
              /* Last-ditch fallback: navigate to /login route */
              window.location.href = '/login';
            }
          }}
        >
          <span className="MosaicMobileSession-loginLabel">Log In</span>
        </button>
      </div>
    );
  }
}
