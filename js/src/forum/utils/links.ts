import app from 'flarum/forum/app';

/** A path on this forum, prefixed with its base URL so sub-folder installs link right. */
export function forumPath(path: string): string {
  return String(app.forum.attribute<string>('baseUrl') || '').replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/** linkrobins/blog is enabled, so its routes (linkrobins-blog.*) exist. */
export function hasBlog(): boolean {
  return 'linkrobins-blog' in flarum.extensions;
}

/** A link target, and whether it is one of the forum's own routes (followed in-app) or a plain URL. */
export interface Target {
  href: string;
  route: boolean;
}

/**
 * Where the Tickets pill and support quick action point: the Mosaic admin's
 * URL, else linkrobins/support's own index page, else nothing.
 */
export function supportTarget(): Target | null {
  const override = app.forum.attribute<string | null>('mosaicSupportUrl');
  if (override) return { href: override, route: false };

  return 'linkrobins-support' in flarum.extensions ? { href: app.route('linkrobins-support.index'), route: true } : null;
}

/** The current page is one of linkrobins/blog's. */
export function onBlogPage(): boolean {
  return String(app.current.get('routeName') || '').startsWith('linkrobins-blog.');
}

/** What flarum/tags tells about the tag page being shown, when it is enabled. */
interface CurrentTag {
  discussionCount(): number | undefined;
}

/** The tag page being shown, when flarum/tags is enabled and this is one. */
export function currentTag(): CurrentTag | null {
  if (!('flarum-tags' in flarum.extensions)) return null;

  return (app as typeof app & { currentTag?: () => CurrentTag | undefined }).currentTag?.() ?? null;
}
