import app from 'flarum/forum/app';

/** Forum-wide counts the hero strip renders. null → the tile shows "—". */
export interface ForumStats {
  members: number | null;
  discussions: number | null;
  resolved: number | null;
  posts: number | null;
  online: number | null;
}

/**
 * The hero strip's figures: another extension's forum attribute when one
 * provides it (flarum/statistics and similar), else Mosaic's own `mosaic*`
 * attributes. A missing figure is null, so its tile shows "—" rather than 0.
 */
export default function forumStats(): ForumStats {
  const f = app.forum;

  return {
    members: firstNum(f.attribute('userCount'), f.attribute('totalUsers'), f.attribute('membersCount'), f.attribute('mosaicUserCount')),
    discussions: firstNum(f.attribute('discussionCount'), f.attribute('discussionsCount'), f.attribute('mosaicDiscussionCount')),
    resolved: firstNum(f.attribute('resolvedTicketCount'), f.attribute('supportResolvedCount'), f.attribute('mosaicResolvedCount')),
    posts: firstNum(f.attribute('postCount'), f.attribute('postsCount'), f.attribute('mosaicPostCount')),
    online: firstNum(f.attribute('onlineUserCount'), f.attribute('onlineUsersCount'), f.attribute('mosaicOnlineCount')),
  };
}

/** The first argument that is a finite number, or null. */
function firstNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  return null;
}
