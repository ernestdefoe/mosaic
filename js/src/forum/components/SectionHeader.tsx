import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import forumStats from '../utils/forumStats';
import abbreviate from '../utils/abbreviate';

/**
 * SectionHeader — the "Recent Discussions" title and count badge above the
 * IndexPage toolbar. The count is the hero's discussion figure, else the
 * number of discussions loaded on the page.
 */
export default class SectionHeader extends Component {
  view() {
    const count = forumStats().discussions ?? app.store.all('discussions').length;

    return (
      <div className="MosaicSectionHead">
        <h2 className="MosaicSectionHead-title">{app.translator.trans('ernestdefoe-mosaic.forum.home.recent_discussions')}</h2>
        <span className="MosaicSectionHead-count">{abbreviate(count)}</span>
      </div>
    );
  }
}
