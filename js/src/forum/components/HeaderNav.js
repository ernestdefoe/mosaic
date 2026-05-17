import app from 'flarum/forum/app';
import LinkButton from 'flarum/common/components/LinkButton';
import Button from 'flarum/common/components/Button';

/**
 * Builds the items injected into HeaderPrimary + HeaderSecondary.
 *
 * Top-level destinations (Discussions / Tickets / Marketplace / etc.)
 * move into the header to match the render. Items only appear when the
 * underlying extension is actually installed — checked via
 * `flarum.extensions[id]`, so a fresh install with neither support nor
 * marketplace just shows "Discussions".
 *
 * The "Start a Discussion" CTA moves from the (now-hidden) IndexPage-nav
 * into HeaderSecondary, right before sign-up/log-in for guests, or
 * right before the avatar for logged-in users.
 */
export function navItems() {
  const items = [];

  items.push(
    <LinkButton href={app.route('index')} icon="fa-solid fa-comments" className="MosaicHeaderNav-item">
      {translate('nav.discussions', 'Discussions')}
    </LinkButton>
  );

  if (hasExt('linkrobins-support')) {
    items.push(
      <LinkButton
        href={app.forum.attribute('supportUrl') || '/support'}
        icon="fa-solid fa-headset"
        className="MosaicHeaderNav-item"
      >
        {translate('nav.tickets', 'Tickets')}
      </LinkButton>
    );
  }

  if (hasExt('ramon-marketplace')) {
    /* Honor the marketplace extension's configured shop path so
     * a non-default /shop URL still works. */
    const marketHref =
      app.forum.attribute('marketplaceUrl') ||
      '/' + String(app.forum.attribute('marketplace_shop_path') || 'shop').replace(/^\//, '');
    items.push(
      <LinkButton href={marketHref} icon="fa-solid fa-store" className="MosaicHeaderNav-item">
        {translate('nav.marketplace', 'Marketplace')}
      </LinkButton>
    );
  }

  if (hasExt('flarum-tags')) {
    items.push(
      <LinkButton href="/t" icon="fa-solid fa-folder" className="MosaicHeaderNav-item">
        {translate('nav.categories', 'Categories')}
      </LinkButton>
    );
  }

  /* Operator-configured extras: set `mosaicHeaderNavExtras` on the
   * forum serializer to an array of {label, href, icon} for e.g.
   * Knowledge Base / Status links to external systems. */
  const extras = app.forum.attribute('mosaicHeaderNavExtras');
  if (Array.isArray(extras)) {
    extras.forEach((x) =>
      items.push(
        <LinkButton href={x.href} icon={x.icon || 'fa-solid fa-link'} className="MosaicHeaderNav-item">
          {x.label}
        </LinkButton>
      )
    );
  }

  return items;
}

/**
 * The primary CTA in the header.
 *
 * Context-aware: when the visitor is on a /support* route, the button
 * reads "Start a Ticket" and navigates to /support/new (the ticket
 * composition page exposed by linkrobins/support). Otherwise it reads
 * "Start a Discussion" and opens Flarum's stock DiscussionComposer
 * — or the login modal for guests.
 */
export function startDiscussionButton() {
  const inTickets = isTicketsRoute();
  return (
    <Button
      className="Button Button--primary MosaicHeaderNav-start"
      icon={inTickets ? 'fa-solid fa-headset' : 'fa-solid fa-edit'}
      onclick={inTickets ? startTicket : startDiscussion}
    >
      {inTickets
        ? translate('nav.start_ticket', 'Start a Ticket')
        : translate('nav.start_discussion', 'Start a Discussion')}
    </Button>
  );
}

/** True when the current URL is the support extension's section. */
function isTicketsRoute() {
  try {
    const path = (window.location?.pathname || '').replace(/\/+$/, '');
    if (!path) return false;
    return path === '/support' || path.startsWith('/support/');
  } catch (e) {
    return false;
  }
}

/**
 * Safe wrapper around app.translator.trans() that returns the fallback
 * string when the key isn't registered.
 *
 * Flarum's translator returns the lookup key unchanged when no
 * translation exists, so `trans('foo') || 'bar'` evaluates to 'foo'
 * (truthy) and the fallback never fires. We compare against the key
 * and substitute on miss.
 */
function translate(suffix, fallback) {
  const key = `ernestdefoe-mosaic.forum.${suffix}`;
  try {
    const out = app.translator.trans(key);
    if (out == null) return fallback;
    /* If trans() returned the raw key (no translation), fall back. */
    if (typeof out === 'string' && out === key) return fallback;
    return out;
  } catch (e) {
    return fallback;
  }
}

/**
 * Open the new-discussion composer.
 *
 * Flarum 2 chunk-splits forum/components/DiscussionComposer and
 * forum/components/LogInModal — they aren't in flarum.reg at boot.
 * A static `import DiscussionComposer from 'flarum/forum/components/DiscussionComposer'`
 * externalizes to `flarum.reg.get('core', '...')` which returns
 * undefined until something triggers the chunk to load, after which
 * passing that undefined to app.composer.load() throws on .prototype.
 *
 * Rather than re-implement the chunk loader (which would couple us
 * to Flarum internals), we delegate to Flarum's own working button:
 * .IndexPage-newDiscussion is rendered (and hidden by our layout
 * CSS) whenever IndexPage is the current route. Programmatically
 * clicking that button uses Flarum's bundled handler, which lazy-
 * loads the composer chunk and handles the logged-out → LogInModal
 * branch for us. No exports needed.
 *
 * If the user isn't on IndexPage, we route them to it first and then
 * click after the next render tick.
 */
function startDiscussion() {
  const existing = document.querySelector('.IndexPage-newDiscussion');
  if (existing) {
    existing.click();
    return;
  }
  m.route.set(app.route('index'));
  /* Wait two macrotasks: one for Mithril to swap pages, one for the
   * IndexPage to populate its action items into the DOM. */
  setTimeout(() => {
    document.querySelector('.IndexPage-newDiscussion')?.click();
  }, 350);
}

/**
 * Navigate to the support extension's new-ticket page.
 *
 * linkrobins/support exposes /support/new as the composition surface
 * (per its README) — we use the public URL rather than poking at
 * their internal components. supportUrl forum attribute is honored
 * if set.
 */
function startTicket() {
  const base = String(app.forum.attribute('supportUrl') || '/support').replace(/\/+$/, '');
  m.route.set(`${base}/new`);
}

function hasExt(id) {
  /* `window.flarum.extensions` is keyed by extension id (e.g.
   * "ramon-marketplace"). Presence in this object means the JS bundle
   * loaded, which is a reliable signal that the extension is enabled. */
  return Boolean(window.flarum?.extensions?.[id]);
}
