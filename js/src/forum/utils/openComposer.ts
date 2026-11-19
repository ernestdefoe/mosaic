import app from 'flarum/forum/app';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

/**
 * Open the new-discussion composer the way the sidebar's Start a Discussion
 * button does, through IndexSidebar's own action: it lazy-loads the composer,
 * shows the log-in modal to guests, and picks up flarum/tags' current-tag
 * preselection. Members who may not start discussions get nothing, as the
 * sidebar button is disabled for them.
 */
export default function openComposer(): void {
  if (app.session.user && !app.forum.attribute<boolean>('canStartDiscussion')) return;

  IndexSidebar.prototype.newDiscussionAction().catch(() => {
    /* Rejected for guests once the log-in modal is shown; nothing else to do. */
  });
}
