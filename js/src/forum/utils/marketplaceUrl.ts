import app from 'flarum/forum/app';

/**
 * Resolve the URL of the marketplace storefront, in priority order:
 *
 *   1. `marketplaceUrl` — the Mosaic admin's explicit override
 *      (admin/extend.js, written by Admin → Extensions → Mosaic).
 *   2. `marketplace_shop_path` — ramon/marketplace's own forum
 *      attribute. The extension lets the operator change its mount
 *      point in its admin settings; the configured path lives here.
 *   3. `/shop` — ramon/marketplace's documented default mount.
 *      Previously this fallback was `/marketplace`, which was a
 *      reasonable-sounding guess but doesn't exist in the
 *      ramon/marketplace install — clicking "Browse the store"
 *      404'd unless the admin manually configured the override.
 *
 * Returned URL is always rooted with a leading "/" so it's safe to
 * drop into <a href>.
 */
export default function marketplaceUrl() {
  const override = app.forum.attribute('marketplaceUrl');
  if (typeof override === 'string' && override.trim() !== '') {
    return override.trim();
  }

  const configuredPath = app.forum.attribute('marketplace_shop_path');
  if (typeof configuredPath === 'string' && configuredPath.trim() !== '') {
    return '/' + configuredPath.trim().replace(/^\//, '');
  }

  return '/shop';
}

/**
 * Is there a marketplace to link to? Either the Mosaic admin set a
 * Marketplace URL, or ramon/marketplace is enabled (it serialises
 * `marketplace_shop_path`). Without one, every marketplace link and the
 * promo card stay hidden instead of pointing at a /shop that 404s.
 */
export function hasMarketplace(): boolean {
  return !!(app.forum.attribute<string>('marketplaceUrl') || app.forum.attribute<string>('marketplace_shop_path'));
}
