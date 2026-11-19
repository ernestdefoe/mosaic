import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LinkButton from 'flarum/common/components/LinkButton';
import type Mithril from 'mithril';
import marketplaceUrl, { hasMarketplace } from '../utils/marketplaceUrl';
import { hasBlog, supportUrl } from '../utils/links';

interface ContentType {
  slug: string;
  name: string;
  name_plural?: string;
  icon?: string;
}

const pill = (href: string, icon: string, label: Mithril.Children): Mithril.Children => (
  <LinkButton href={href} icon={icon} className="MosaicHeaderNav-item">
    {label}
  </LinkButton>
);

/**
 * The pill row under the hero: Discussions, then Tickets, Blog, Marketplace
 * and each Page Builder content type when those extensions are there.
 * Hidden on phones, where Flarum's own title dropdown is the nav.
 */
export default class MosaicHeroNav extends Component {
  view(): Mithril.Children {
    return (
      <nav className="MosaicHeroNav" aria-label={app.translator.trans('ernestdefoe-mosaic.forum.nav.sections_label', {}, true)}>
        {pill(app.route('index'), 'fa-solid fa-comments', app.translator.trans('ernestdefoe-mosaic.forum.nav.discussions'))}
        {this.supportPill()}
        {this.blogPill()}
        {hasMarketplace() && pill(marketplaceUrl(), 'fa-solid fa-store', app.translator.trans('ernestdefoe-mosaic.forum.nav.marketplace'))}
        {this.contentTypePills()}
      </nav>
    );
  }

  supportPill(): Mithril.Children {
    const url = supportUrl();

    return url ? pill(url, 'fa-solid fa-headset', app.translator.trans('ernestdefoe-mosaic.forum.nav.tickets')) : null;
  }

  /** linkrobins/blog's own nav label and icon, when its admin set them. */
  blogPill(): Mithril.Children {
    if (!hasBlog()) return null;

    const label = app.forum.attribute<string | null>('linkrobinsBlogNavLabel') || app.translator.trans('ernestdefoe-mosaic.forum.nav.blog');
    const icon = app.forum.attribute<string | null>('linkrobinsBlogNavIcon') || 'fas fa-feather-alt';

    return pill(app.route('linkrobins-blog.index'), icon, label);
  }

  /** ernestdefoe/page-builder serves the content types a visitor may view as `pagebuilderContentTypes`. */
  contentTypePills(): Mithril.Children {
    const types = app.forum.attribute<ContentType[] | undefined>('pagebuilderContentTypes');
    if (!Array.isArray(types) || !('ernestdefoe-page-builder' in flarum.extensions)) return null;

    return types
      .filter((type) => type?.slug)
      .map((type) =>
        pill(
          app.route('pagebuilder.content.list', { type: type.slug }),
          type.icon || 'fa-solid fa-newspaper',
          type.name_plural || type.name || type.slug
        )
      );
  }
}
