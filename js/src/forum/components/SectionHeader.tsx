import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import forumStats from '../utils/forumStats';
import { currentTag } from '../utils/links';
import abbreviate from '../utils/abbreviate';

/**
 * SectionHeader — the "Recent Discussions" title and count badge above the
 * IndexPage toolbar. The count is the tag's own count on a tag page, else the
 * hero's discussion figure; without either there is no badge.
 */
export default class SectionHeader extends Component {
  view() {
    const tag = currentTag();
    const count = tag ? (tag.discussionCount() ?? null) : forumStats().discussions;

    return (
      <div className="MosaicSectionHead">
        <h2 className="MosaicSectionHead-title">{app.translator.trans('ernestdefoe-mosaic.forum.home.recent_discussions')}</h2>
        {count != null && <span className="MosaicSectionHead-count">{abbreviate(count)}</span>}
      </div>
    );
  }
}
