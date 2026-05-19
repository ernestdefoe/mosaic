import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

/**
 * Composer-trigger card that sits above the hero nav pills.
 *
 * Renders the actor's avatar (or a fallback edit-pencil for guests), a
 * "Tell everyone what you are working on…" prompt, and a primary
 * "+ New Discussion" button. Clicking anywhere on the card opens the
 * stock DiscussionComposer for logged-in users, or the LogInModal for
 * guests.
 *
 * Mirrors ramon/avocado's AvocadoHome-postInput. We don't reimplement
 * the composer open path — IndexSidebar.prototype.newDiscussionAction
 * already wraps the async chunk import for both DiscussionComposer and
 * LogInModal, and works whether or not the IndexSidebar component
 * itself is mounted in the DOM (it only touches app.session,
 * app.composer, and app.modal — all globals).
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
    try {
      IndexSidebar.prototype.newDiscussionAction.call({}).catch(() => {});
    } catch (e) {
      /* Promise rejects for guest users — the modal is already shown. */
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
