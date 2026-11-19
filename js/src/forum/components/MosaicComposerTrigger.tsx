import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import openComposer from '../utils/openComposer';

/**
 * Composer-trigger card that sits above the hero nav pills.
 *
 * Renders the actor's avatar (or a fallback edit-pencil for guests), a prompt,
 * and a primary "+ New Discussion" button. Clicking anywhere on the card opens
 * the composer through IndexSidebar's own action (see utils/openComposer).
 */
export default class MosaicComposerTrigger extends Component {
  view() {
    const user = app.session.user;
    const placeholder = app.translator.trans(`ernestdefoe-mosaic.forum.home.${user ? 'start_discussion' : 'guest_prompt'}`);
    const ctaLabel = app.translator.trans('ernestdefoe-mosaic.forum.home.new_discussion');

    return (
      <div
        className="MosaicComposerTrigger"
        onclick={() => this.open()}
        role="button"
        tabindex="0"
        onkeydown={(e: KeyboardEvent) => {
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
            onclick={(e: MouseEvent) => {
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
    openComposer();
  }
}
