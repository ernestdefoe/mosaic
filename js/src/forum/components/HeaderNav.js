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
    <LinkButton href={app.route('index')} icon="fas fa-comments" className="EdonlineHeaderNav-item">
      {translate('nav.discussions', 'Discussions')}
    </LinkButton>
  );

  if (hasExt('linkrobins-support')) {
    items.push(
      <LinkButton
        href={app.forum.attribute('supportUrl') || '/support'}
        icon="fas fa-headset"
        className="EdonlineHeaderNav-item"
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
      <LinkButton href={marketHref} icon="fas fa-store" className="EdonlineHeaderNav-item">
        {translate('nav.marketplace', 'Marketplace')}
      </LinkButton>
    );
  }

  if (hasExt('flarum-tags')) {
    items.push(
      <LinkButton href="/t" icon="fas fa-folder" className="EdonlineHeaderNav-item">
        {translate('nav.categories', 'Categories')}
      </LinkButton>
    );
  }

  /* Operator-configured extras: set `edonlineHeaderNavExtras` on the
   * forum serializer to an array of {label, href, icon} for e.g.
   * Knowledge Base / Status links to external systems. */
  const extras = app.forum.attribute('edonlineHeaderNavExtras');
  if (Array.isArray(extras)) {
    extras.forEach((x) =>
      items.push(
        <LinkButton href={x.href} icon={x.icon || 'fas fa-link'} className="EdonlineHeaderNav-item">
          {x.label}
        </LinkButton>
      )
    );
  }

  return items;
}

/**
 * The "Start a Discussion" header button. Triggers Flarum's discussion
 * composer for logged-in users, or the login modal for guests.
 */
export function startDiscussionButton() {
  return (
    <Button
      className="Button Button--primary EdonlineHeaderNav-start"
      icon="fas fa-edit"
      onclick={startDiscussion}
    >
      {translate('nav.start_discussion', 'Start a Discussion')}
    </Button>
  );
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
  const key = `ernestdefoe-edonline.forum.${suffix}`;
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

function startDiscussion() {
  if (app.session.user) {
    /* Defer the heavy composer module until the user actually clicks. */
    import(
      /* webpackChunkName: "discussion-composer" */
      'flarum/forum/components/DiscussionComposer'
    ).then(({ default: DiscussionComposer }) => {
      app.composer.load(DiscussionComposer, { user: app.session.user });
      app.composer.show();
    });
  } else {
    import(
      /* webpackChunkName: "login-modal" */
      'flarum/forum/components/LogInModal'
    ).then(({ default: LogInModal }) => {
      app.modal.show(LogInModal);
    });
  }
}

function hasExt(id) {
  /* `window.flarum.extensions` is keyed by extension id (e.g.
   * "ramon-marketplace"). Presence in this object means the JS bundle
   * loaded, which is a reliable signal that the extension is enabled. */
  return Boolean(window.flarum?.extensions?.[id]);
}
