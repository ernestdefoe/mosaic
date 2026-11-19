import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import Icon from 'flarum/common/components/Icon';
import openComposer, { canStartDiscussion } from '../utils/openComposer';

/**
 * Composer-trigger card that sits above the hero nav pills.
 *
 * Renders the actor's avatar (or a fallback edit-pencil for guests), a prompt,
 * and a primary "+ New Discussion" button. Clicking anywhere on the card opens
 * the composer through IndexSidebar's own action (see utils/openComposer).
 * For members who may not start discussions it is disabled and says so, as
 * core's sidebar button does.
 */
export default class MosaicComposerTrigger extends Component {
  view() {
    const user = app.session.user;
    const enabled = canStartDiscussion();
    const placeholder = enabled
      ? app.translator.trans(`ernestdefoe-mosaic.forum.home.${user ? 'start_discussion' : 'guest_prompt'}`)
      : app.translator.trans('core.forum.index.cannot_start_discussion_button');

    return (
      <div
        className={'MosaicComposerTrigger' + (enabled ? '' : ' is-disabled')}
        onclick={enabled ? openComposer : undefined}
        role="button"
        tabindex={enabled ? 0 : -1}
        aria-disabled={!enabled}
        onkeydown={(e: KeyboardEvent) => {
          if (enabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openComposer();
          }
        }}
      >
        <div className="MosaicComposerTrigger-inner">
          {user ? (
            <Avatar user={user} className="MosaicComposerTrigger-avatar" />
          ) : (
            <div className="MosaicComposerTrigger-logo" aria-hidden="true">
              <Icon name="fas fa-edit" />
            </div>
          )}
          <span className="MosaicComposerTrigger-placeholder">{placeholder}</span>
          <button
            className="MosaicComposerTrigger-newBtn"
            type="button"
            disabled={!enabled}
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              openComposer();
            }}
          >
            <Icon name="fas fa-plus" />
            <span className="MosaicComposerTrigger-newBtn-label">{app.translator.trans('ernestdefoe-mosaic.forum.home.new_discussion')}</span>
          </button>
        </div>
      </div>
    );
  }
}
