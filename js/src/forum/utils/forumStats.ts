import app from 'flarum/forum/app';

/** Forum-wide counts the hero strip renders. null → the tile shows "—". */
export interface ForumStats {
  members: number | null;
  discussions: number | null;
  resolved: number | null;
  posts: number | null;
  online: number | null;
}

const count = (key: string): number | null => {
  const value = app.forum.attribute<number | null | undefined>(key);

  return typeof value === 'number' ? value : null;
};

/** The hero strip's figures, from Mosaic's own forum attributes. */
export default function forumStats(): ForumStats {
  return {
    members: count('mosaicUserCount'),
    discussions: count('mosaicDiscussionCount'),
    resolved: count('mosaicResolvedCount'),
    posts: count('mosaicPostCount'),
    online: count('mosaicOnlineCount'),
  };
}
