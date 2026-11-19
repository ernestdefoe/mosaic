import app from 'flarum/forum/app';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import { currentTag } from './links';

/**
 * Whether the composer can open: guests get the log-in modal, members need
 * permission to start discussions, in the tag on a tag page (core disables
 * its own button otherwise).
 */
export function canStartDiscussion(): boolean {
  if (!app.session.user) return true;

  const tag = currentTag();

  return tag ? tag.canStartDiscussion() : !!app.forum.attribute<boolean>('canStartDiscussion');
}

/**
 * Open the new-discussion composer the way the sidebar's Start a Discussion
 * button does, through IndexSidebar's own action: it lazy-loads the composer,
 * shows the log-in modal to guests, and picks up flarum/tags' current-tag
 * preselection.
 */
export default function openComposer(): void {
  IndexSidebar.prototype.newDiscussionAction().catch(() => {
    /* Rejected for guests once the log-in modal is shown; nothing else to do. */
  });
}
