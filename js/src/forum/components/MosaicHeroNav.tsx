import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LinkButton from 'flarum/common/components/LinkButton';
import type Mithril from 'mithril';
import translate from '../utils/translate';
import marketplaceUrlHelper from '../utils/marketplaceUrl';

/**
 * Inline pill-row nav under the hero.
 *
 * Built from mosaic's own destinations — Discussions always, plus Tickets /
 * Marketplace when those extensions are detected via their forum attributes.
 * This replaces the previous approach of imperatively `new IndexSidebar()`-ing
 * to harvest its navItems list, which bypassed the Mithril component contract
 * (a constructor/navItems that read this.attrs/this.state would silently
 * misbehave) and hid failures behind a try/catch. Mirrors how index.ts
 * populates IndexSidebar.navItems with mosaic's own items.
 *
 * Hidden on phone — Flarum's stock .App-titleControl SelectDropdown already
 * provides the phone nav surface.
 */
export default class MosaicHeroNav extends Component {
  view(): Mithril.Children {
    const pills: Mithril.Children[] = [
      <LinkButton href={app.route('index')} icon="fa-solid fa-comments" className="MosaicHeaderNav-item">
        {translate('nav.discussions', 'Discussions')}
      </LinkButton>,
    ];

    const supportUrl = app.forum.attribute<string>('supportUrl');
    if (supportUrl) {
      pills.push(
        <LinkButton href={supportUrl} icon="fa-solid fa-headset" className="MosaicHeaderNav-item">
          {translate('nav.tickets', 'Tickets')}
        </LinkButton>
      );
    }

    // Blog — present whenever linkrobins/blog is installed. The extension
    // always serializes linkrobinsBlogNavLabel to the forum payload (null when
    // the admin hasn't set a custom label). We detect presence by checking
    // that canCreateBlogPost exists in the payload (defined for all actors).
    const blogInstalled = app.forum.attribute<boolean | undefined>('canCreateBlogPost') !== undefined;
    if (blogInstalled) {
      const blogLabel = app.forum.attribute<string | null>('linkrobinsBlogNavLabel') || 'Blog';
      const blogIcon = app.forum.attribute<string | null>('linkrobinsBlogNavIcon') || 'fas fa-feather-alt';
      pills.push(
        <LinkButton href="/blog" icon={blogIcon} className="MosaicHeaderNav-item">
          {blogLabel}
        </LinkButton>
      );
    }

    const hasMarketplace = !!(app.forum.attribute<string>('marketplaceUrl') || app.forum.attribute<string>('marketplace_shop_path'));
    if (hasMarketplace) {
      pills.push(
        <LinkButton href={marketplaceUrlHelper()} icon="fa-solid fa-store" className="MosaicHeaderNav-item">
          {translate('nav.marketplace', 'Marketplace')}
        </LinkButton>
      );
    }

    // Page Builder content types (Articles, etc.) — ernestdefoe/page-builder
    // serializes the viewable types to the forum payload as
    // `pagebuilderContentTypes`; surface each as a pill linking to /c/{slug}.
    const contentTypes = app.forum.attribute<Array<{ slug: string; name: string; name_plural: string; icon?: string }>>('pagebuilderContentTypes');
    if (Array.isArray(contentTypes)) {
      contentTypes.forEach((type) => {
        if (!type || !type.slug) return;
        pills.push(
          <LinkButton href={`/c/${type.slug}`} icon={type.icon || 'fa-solid fa-newspaper'} className="MosaicHeaderNav-item">
            {type.name_plural || type.name || type.slug}
          </LinkButton>
        );
      });
    }

    return (
      <nav className="MosaicHeroNav" aria-label="Sections">
        {pills}
      </nav>
    );
  }
}
