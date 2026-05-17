import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';

/* Inline icon helper — Flarum 2 removed flarum/common/helpers/icon. */
const fa = (name, style) => <i className={`icon ${name}`} style={style} aria-hidden="true" />;

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
    if (app.forum.attribute('mosaicHideMarketplacePromo')) return null;

    return (
      <a className="MosaicSideCard MosaicMarketplacePromo" href={url}>
        <div className="MosaicMarketplacePromo-bg">{fa('fa-solid fa-store')}</div>
        <div className="MosaicMarketplacePromo-inner">
          <div className="MosaicMarketplacePromo-kicker">NEW · Marketplace</div>
          <div className="MosaicMarketplacePromo-title">Premium themes &amp; extensions</div>
          <div className="MosaicMarketplacePromo-desc">
            Digital products, services, subscriptions, and private extensions from trusted sellers.
          </div>
          <div className="MosaicMarketplacePromo-cta">
            Browse the store {fa('fa-solid fa-arrow-right', { fontSize: '11px' })}
          </div>
        </div>
      </a>
    );
  }
}
