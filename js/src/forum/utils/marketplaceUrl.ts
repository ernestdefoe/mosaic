import app from 'flarum/forum/app';
import { forumPath } from './links';

/**
 * The marketplace storefront: the Mosaic admin's Marketplace URL, else the
 * path ramon/marketplace serves its shop on (`marketplace_shop_path`, `shop`
 * by default).
 */
export default function marketplaceUrl(): string {
  const override = app.forum.attribute<string | null>('mosaicMarketplaceUrl');
  if (override) return override;

  return forumPath(app.forum.attribute<string | null>('marketplace_shop_path') || 'shop');
}

/**
 * Is there a marketplace to link to? The admin set a Marketplace URL, or
 * ramon/marketplace is enabled. Without one, every marketplace link and the
 * promo card stay hidden.
 */
export function hasMarketplace(): boolean {
  return !!app.forum.attribute<string | null>('mosaicMarketplaceUrl') || 'ramon-marketplace' in flarum.extensions;
}
