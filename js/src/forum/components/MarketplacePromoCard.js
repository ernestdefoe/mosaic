import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';

/**
 * MarketplacePromoCard — purple-gradient CTA in the IndexPage sidebar
 * pointing visitors at the marketplace storefront.
 *
 * Auto-hides if the marketplace extension isn't installed (detected via
 * `app.forum.attribute('marketplaceUrl')` — set by ramon/marketplace).
 */
export default class MarketplacePromoCard extends Component {
  view() {
    const url = app.forum.attribute('marketplaceUrl') || '/marketplace';

    /* If the operator opts out, hide. */
    if (app.forum.attribute('edonlineHideMarketplacePromo')) return null;

    return (
      <a className="EdonlineSideCard EdonlineMarketplacePromo" href={url}>
        <div className="EdonlineMarketplacePromo-bg">{icon('fas fa-store')}</div>
        <div className="EdonlineMarketplacePromo-inner">
          <div className="EdonlineMarketplacePromo-kicker">NEW · Marketplace</div>
          <div className="EdonlineMarketplacePromo-title">Premium themes &amp; extensions</div>
          <div className="EdonlineMarketplacePromo-desc">
            Digital products, services, subscriptions, and private extensions from trusted sellers.
          </div>
          <div className="EdonlineMarketplacePromo-cta">
            Browse the store {icon('fas fa-arrow-right', { style: { fontSize: '11px' } })}
          </div>
        </div>
      </a>
    );
  }
}
