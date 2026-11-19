import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import forumStats from '../utils/forumStats';
import { currentTag } from '../utils/links';
import abbreviate from '../utils/abbreviate';

/**
 * SectionHeader — the "Recent Discussions" title and count badge above the
 * IndexPage toolbar. The badge shows the tag's own count on a tag page and the
 * forum-wide figure on the unfiltered index; filtered lists (Following,
 * search results) get no badge, since neither figure would match them.
 */
export default class SectionHeader extends Component {
  view() {
    const count = listCount();

    return (
      <div className="MosaicSectionHead">
        <h2 className="MosaicSectionHead-title">{app.translator.trans('ernestdefoe-mosaic.forum.home.recent_discussions')}</h2>
        {count != null && <span className="MosaicSectionHead-count">{abbreviate(count)}</span>}
      </div>
    );
  }
}

function listCount(): number | null {
  const tag = currentTag();
  if (tag) return tag.discussionCount() ?? null;

  const filtered = Object.keys(m.route.param() || {}).some((key) => key !== 'sort');

  return app.current.get('routeName') === 'index' && !filtered ? forumStats().discussions : null;
}
