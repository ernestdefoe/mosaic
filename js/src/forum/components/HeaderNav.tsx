import app from 'flarum/forum/app';
import LinkButton from 'flarum/common/components/LinkButton';
import type Mithril from 'mithril';

/**
 * Mosaic's own entries in IndexSidebar.navItems: only Discussions. Support,
 * Marketplace and Tags add their own entries there, and MosaicHeroNav renders
 * its pills separately, so listing them here would duplicate them.
 */
export function navItems(): Mithril.Children[] {
  return [
    <LinkButton href={app.route('index')} icon="fa-solid fa-comments" className="MosaicHeaderNav-item">
      {app.translator.trans('ernestdefoe-mosaic.forum.nav.discussions')}
    </LinkButton>,
  ];
}
