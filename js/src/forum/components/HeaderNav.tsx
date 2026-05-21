// @ts-nocheck — TODO: declare class properties + parameter types
// Transitional marker from the audit-driven TS conversion. The
// underlying JS uses Flarum's `this.foo = ...` initialiser pattern
// which TypeScript strict mode rejects. Remove once a follow-up pass
// adds explicit property declarations and vnode/callback types.
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

  /* Extension-contributed nav items (Support / Tickets, Marketplace /
   * Shop, Tags, etc.) are intentionally NOT hardcoded here. Every
   * well-behaved Flarum 2 extension registers its own entries into
   * IndexSidebar.navItems — MosaicHeroNav mirrors that list and wraps
   * each entry in a pill automatically. Hardcoding extension-specific
   * pills here produces duplicates (the extension's contribution +
   * mosaic's), which is the bug we're avoiding. */

  /* Tags intentionally omitted. flarum/tags adds its own 'tags' entry
   * to IndexSidebar.navItems; MosaicHeroNav filters that out so neither
   * Tags link surfaces in the hero pill row. The CategoryTiles grid
   * above the pill row is the canonical tag entry point. */

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
  if (existing instanceof HTMLElement) {
    existing.click();
    return;
  }
  m.route.set(app.route('index'));
  /* Poll for the IndexSidebar's newDiscussion button via rAF until it
   * appears in the DOM, with a 1.5 s ceiling. More reliable than a
   * fixed 350 ms setTimeout (slow devices / blocked main thread) and
   * the click lands on the frame the button actually mounts —
   * usually the first or second tick. */
  const deadline = performance.now() + 1500;
  const tick = () => {
    const btn = document.querySelector('.IndexPage-newDiscussion');
    if (btn instanceof HTMLElement) {
      btn.click();
      return;
    }
    if (performance.now() < deadline) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
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
