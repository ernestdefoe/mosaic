import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';

/**
 * Composer-trigger card that sits above the hero nav pills.
 *
 * Renders the actor's avatar (or a fallback edit-pencil for guests), a
 * "Tell everyone what you are working on…" prompt, and a primary
 * "+ New Discussion" button. Clicking anywhere on the card opens the
 * stock DiscussionComposer for logged-in users, or the LogInModal for
 * guests.
 *
 * Implementation: programmatically clicks the hidden
 * `.IndexPage-newDiscussion` button that IndexSidebar renders for
 * every index page (we leave it in the items list and rely on
 * layout.less to hide the sidebar nav block on desktop). That
 * delegates the whole open-composer flow — async chunk import for
 * DiscussionComposer, guest → LogInModal branch, focus management —
 * to Flarum's own handler. We don't reach into the prototype with
 * `.call({})` any more; if a future Flarum release rewires the
 * action, the click target continues to work because it's just a
 * DOM event.
 */
export default class MosaicComposerTrigger extends Component {
  view() {
    const user = app.session.user;
    const placeholder = translate(
      user ? 'home.start_discussion' : 'home.guest_prompt',
      user
        ? 'Tell everyone what you are working on…'
        : 'Sign in to start a discussion…'
    );
    const ctaLabel = translate('home.new_discussion', 'New Discussion');

    return (
      <div
        className="MosaicComposerTrigger"
        onclick={() => this.open()}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.open();
          }
        }}
      >
        <div className="MosaicComposerTrigger-inner">
          {user ? (
            <Avatar user={user} className="MosaicComposerTrigger-avatar" />
          ) : (
            <div className="MosaicComposerTrigger-logo" aria-hidden="true">
              <i className="fas fa-edit" />
            </div>
          )}
          <span className="MosaicComposerTrigger-placeholder">{placeholder}</span>
          <button
            className="MosaicComposerTrigger-newBtn"
            type="button"
            onclick={(e) => {
              e.stopPropagation();
              this.open();
            }}
          >
            <i className="fas fa-plus" aria-hidden="true" />
            <span className="MosaicComposerTrigger-newBtn-label">{ctaLabel}</span>
          </button>
        </div>
      </div>
    );
  }

  open() {
    /* IndexSidebar renders .IndexPage-newDiscussion as part of its
     * items list; layout.less hides the surrounding .IndexPage-nav
     * block but the button itself is in the DOM. Click it to reuse
     * Flarum's own composer-open flow. */
    const btn = document.querySelector('.IndexPage-newDiscussion');
    if (btn instanceof HTMLElement) {
      btn.click();
    }
  }
}

/* Safe wrapper around app.translator.trans() that returns the fallback
 * when the key is missing. Mirrors the helper in HeaderNav.js. */
function translate(suffix, fallback) {
  const key = `ernestdefoe-mosaic.forum.${suffix}`;
  try {
    const out = app.translator.trans(key);
    if (out == null) return fallback;
    if (typeof out === 'string' && out === key) return fallback;
    return out;
  } catch (e) {
    return fallback;
  }
}
