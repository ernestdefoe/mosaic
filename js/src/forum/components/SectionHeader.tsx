import Component, { ComponentAttrs } from 'flarum/common/Component';
import app from 'flarum/forum/app';

interface SectionHeaderAttrs extends ComponentAttrs {
  count?: number | null;
  title?: string;
}

/**
 * SectionHeader — the "Recent Discussions" title + count badge that sits above
 * the IndexPage toolbar/filter row.
 *
 * The count is another extension's discussion-count attribute when there is
 * one, else Mosaic's mosaicDiscussionCount, else the number of discussions
 * loaded on the page.
 */
export default class SectionHeader extends Component<SectionHeaderAttrs> {
  view() {
    const count = this.attrs.count ?? resolveCount();
    return (
      <div className="MosaicSectionHead">
        <h2 className="MosaicSectionHead-title">{this.attrs.title || app.translator.trans('ernestdefoe-mosaic.forum.home.recent_discussions')}</h2>
        {count != null && <span className="MosaicSectionHead-count">{format(count)}</span>}
      </div>
    );
  }
}

function resolveCount(): number | null {
  const f = app.forum;
  const fromAttr =
    f.attribute<number | string | undefined>('discussionCount') ??
    f.attribute<number | string | undefined>('discussionsCount') ??
    f.attribute<number | string | undefined>('mosaicDiscussionCount');
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

function format(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
}
