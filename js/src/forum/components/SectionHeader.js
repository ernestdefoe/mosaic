import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/**
 * SectionHeader — the "Recent Discussions" title + count badge that
 * sits above the IndexPage toolbar/filter row. Matches the render.
 *
 * The count tries the same multi-source resolution as the hero stats:
 * a forum attribute if present, else loaded-store size, else hidden.
 */
export default class SectionHeader extends Component {
  view() {
    const count = this.attrs.count ?? resolveCount();
    return (
      <div className="MosaicSectionHead">
        <h2 className="MosaicSectionHead-title">
          {this.attrs.title || 'Recent Discussions'}
        </h2>
        {count != null && <span className="MosaicSectionHead-count">{format(count)}</span>}
      </div>
    );
  }
}

function resolveCount() {
  const f = app.forum;
  const fromAttr = f.attribute('discussionCount') ?? f.attribute('discussionsCount');
  if (fromAttr != null) {
    const n = Number(fromAttr);
    if (Number.isFinite(n)) return n;
  }
  try {
    const arr = app.store.all('discussions');
    return Array.isArray(arr) ? arr.length : null;
  } catch (e) {
    return null;
  }
}

function format(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString('en-US');
}
