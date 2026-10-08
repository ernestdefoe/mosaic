<?php

namespace Ernestdefoe\Mosaic\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class ForumAttributesTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-mosaic');

        $now = Carbon::now();
        $users = [$this->normalUser()];

        // Six people online now (one hides it), so a query per user would
        // show as an N+1; all with posts, so they rank as contributors.
        for ($id = 10; $id < 16; $id++) {
            $users[] = [
                'id' => $id, 'username' => "online$id", 'email' => "online$id@machine.local", 'is_email_confirmed' => 1,
                'last_seen_at' => $now, 'comment_count' => $id, 'discussion_count' => 1, 'avatar_url' => "avatar$id.png",
                'preferences' => $id === 15 ? json_encode(['discloseOnline' => false]) : null,
            ];
        }

        $this->prepareDatabase([
            User::class => $users,
            'group_user' => [['user_id' => 14, 'group_id' => 4]],
            Discussion::class => [
                ['id' => 1, 'title' => 'Busy', 'created_at' => $now, 'user_id' => 10, 'first_post_id' => 1, 'comment_count' => 3, 'participant_count' => 3],
                ['id' => 2, 'title' => 'Quiet', 'created_at' => $now, 'user_id' => 10, 'first_post_id' => 4, 'comment_count' => 1, 'participant_count' => 1],
                ['id' => 3, 'title' => 'Hidden', 'created_at' => $now, 'user_id' => 10, 'first_post_id' => 5, 'comment_count' => 9, 'participant_count' => 9, 'hidden_at' => $now],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'created_at' => $now, 'user_id' => 10, 'type' => 'comment', 'content' => '<t><p>a</p></t>'],
                ['id' => 2, 'discussion_id' => 1, 'number' => 2, 'created_at' => $now, 'user_id' => 11, 'type' => 'comment', 'content' => '<t><p>b</p></t>'],
                ['id' => 3, 'discussion_id' => 1, 'number' => 3, 'created_at' => $now, 'user_id' => 12, 'type' => 'comment', 'content' => '<t><p>c</p></t>'],
                ['id' => 4, 'discussion_id' => 2, 'number' => 1, 'created_at' => $now, 'user_id' => 10, 'type' => 'comment', 'content' => '<t><p>d</p></t>'],
                ['id' => 5, 'discussion_id' => 3, 'number' => 1, 'created_at' => $now, 'user_id' => 10, 'type' => 'comment', 'content' => '<t><p>e</p></t>'],
                ['id' => 6, 'discussion_id' => 1, 'number' => 4, 'created_at' => $now, 'user_id' => 10, 'type' => 'discussionRenamed', 'content' => '[]'],
            ],
        ]);
    }

    private function forum(): array
    {
        // The stats are cached for a minute; a test must not read another's.
        $this->app()->getContainer()->make('cache.store')->flush();

        $response = $this->send($this->request('GET', '/api'));
        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['data']['attributes'];
    }

    #[Test]
    public function the_hero_stats_count_the_forum()
    {
        $forum = $this->forum();

        $this->assertSame(8, $forum['mosaicUserCount']);
        $this->assertSame(3, $forum['mosaicDiscussionCount']);
        $this->assertSame(5, $forum['mosaicPostCount'], 'Comments only, not event posts');
        $this->assertSame(6, $forum['mosaicOnlineCount']);
        $this->assertNull($forum['mosaicResolvedCount'], 'No support extension, no tile');
    }

    #[Test]
    public function online_users_carry_their_avatars_and_respect_privacy()
    {
        $online = array_column($this->forum()['mosaicOnlineUsers'], null, 'username');

        $this->assertCount(5, $online);
        $this->assertArrayNotHasKey('online15', $online, 'Chose not to disclose being online');
        $this->assertStringEndsWith('avatar10.png', $online['online10']['avatarUrl']);
    }

    #[Test]
    public function the_online_list_can_be_switched_off()
    {
        $this->setting('mosaicHideOnlineUsers', '1');

        $forum = $this->forum();

        $this->assertSame([], $forum['mosaicOnlineUsers']);
        $this->assertTrue($forum['mosaicHideOnlineUsers']);
    }

    #[Test]
    public function top_contributors_and_trending_come_from_the_forum()
    {
        $forum = $this->forum();

        $top = $forum['mosaicTopContributors'];
        $this->assertSame(['online15', 'online14', 'online13', 'online12', 'online11'], array_column($top, 'username'));
        $this->assertSame('Mod', $top[1]['role'], 'Staff groups are named');
        $this->assertStringEndsWith('avatar15.png', $top[0]['avatarUrl']);

        $this->assertSame(['Busy', 'Quiet'], array_column($forum['mosaicTrending'], 'title'), 'Hidden discussions do not trend');
    }

    #[Test]
    public function the_admin_settings_are_served()
    {
        $this->setting('mosaicTopContributors', json_encode([['name' => 'Pinned']]));
        $this->setting('mosaicQuickActions', json_encode([['label' => 'Rules', 'href' => '/rules']]));
        $this->setting('mosaicHideTrending', '1');
        $this->setting('supportUrl', '  https://help.example  ');

        $forum = $this->forum();

        $this->assertSame([['name' => 'Pinned']], $forum['mosaicTopContributors'], 'An admin override replaces the computed list');
        $this->assertSame([['label' => 'Rules', 'href' => '/rules']], $forum['mosaicQuickActions']);
        $this->assertTrue($forum['mosaicHideTrending']);
        $this->assertFalse($forum['mosaicHideQuickActions']);
        $this->assertSame('https://help.example', $forum['supportUrl']);
        $this->assertNull($forum['marketplaceUrl']);
    }
}
