import app from 'flarum/forum/app';

/** A path on this forum, prefixed with its base URL so sub-folder installs link right. */
export function forumPath(path: string): string {
  return String(app.forum.attribute<string>('baseUrl') || '').replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/** linkrobins/blog is enabled, so its routes (linkrobins-blog.*) exist. */
export function hasBlog(): boolean {
  return 'linkrobins-blog' in flarum.extensions;
}

/**
 * Where the Tickets pill and support quick action point: the Mosaic admin's
 * override, else linkrobins/support's own index page, else nothing.
 */
export function supportUrl(): string | null {
  const override = app.forum.attribute<string | null>('mosaicSupportUrl');
  if (override) return override;

  return 'linkrobins-support' in flarum.extensions ? app.route('linkrobins-support.index') : null;
}

/** The current page is one of linkrobins/blog's. */
export function onBlogPage(): boolean {
  return String(app.current.get('routeName') || '').startsWith('linkrobins-blog.');
}
