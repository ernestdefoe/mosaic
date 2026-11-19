<?php

namespace Ernestdefoe\Mosaic\Tests\integration\api;

use Carbon\Carbon;
use Ernestdefoe\Mosaic\Api\AddForumStatistics;
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

    private function forum(?int $as = 1): array
    {
        // The stats are cached for a minute; a test must not read another's.
        $this->app()->getContainer()->make('cache.store')->flush();

        $response = $this->send($this->request('GET', '/api', $as === null ? [] : ['authenticatedAs' => $as]));
        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['data']['attributes'];
    }

    #[Test]
    public function the_hero_stats_count_the_forum()
    {
        $forum = $this->forum();

        $this->assertSame(8, $forum['mosaicUserCount']);
        $this->assertSame(2, $forum['mosaicDiscussionCount'], 'Hidden discussions are left out');
        $this->assertSame(4, $forum['mosaicPostCount'], 'Comments only, not event posts');
        $this->assertSame(7, $forum['mosaicOnlineCount'], 'Six members plus the admin reading the page');
        $this->assertArrayNotHasKey('mosaicResolvedCount', $forum, 'No support extension, no tile');
    }

    #[Test]
    public function online_users_carry_their_avatars_and_respect_privacy()
    {
        $online = array_column($this->forum()['mosaicOnlineUsers'], null, 'username');

        $this->assertCount(6, $online, 'Five who disclose it plus the admin reading the page');
        $this->assertArrayNotHasKey('online15', $online, 'Chose not to disclose being online');
        $this->assertStringEndsWith('avatar10.png', $online['online10']['avatarUrl']);
    }

    #[Test]
    public function the_online_list_can_be_switched_off()
    {
        $this->setting('mosaicHideOnlineUsers', '1');

        $forum = $this->forum();

        $this->assertSame([], $forum['mosaicOnlineUsers']);
        $this->assertArrayNotHasKey('mosaicHideOnlineUsers', $forum, 'Applied on the server, so not sent');
    }

    #[Test]
    public function top_contributors_and_trending_come_from_the_forum()
    {
        $forum = $this->forum();

        $top = $forum['mosaicTopContributors'];
        $this->assertSame(['online15', 'online14', 'online13', 'online12', 'online11'], array_column($top, 'username'));
        $this->assertSame('Mod', $top[1]['role'], 'Staff groups are named');
        $this->assertStringEndsWith('avatar15.png', $top[0]['avatarUrl']);
        $this->assertSame(15, $top[0]['posts'], 'A number, worded by the frontend');

        $this->assertSame(['Busy', 'Quiet'], array_column($forum['mosaicTrending'], 'title'), 'Hidden discussions do not trend');
        $this->assertSame([3, 1], array_column($forum['mosaicTrending'], 'replies'));
    }

    #[Test]
    public function contributors_and_trending_carry_what_the_frontend_routes_by()
    {
        $forum = $this->forum();

        $this->assertArrayNotHasKey('href', $forum['mosaicTopContributors'][0], 'The frontend builds user links with app.route');
        $this->assertSame([1, 2], array_column($forum['mosaicTrending'], 'id'));
    }

    #[Test]
    public function the_admin_settings_are_served()
    {
        $this->setting('mosaicTopContributors', json_encode([['name' => 'Pinned']]));
        $this->setting('mosaicQuickActions', json_encode([['label' => 'Rules', 'href' => '/rules']]));
        $this->setting('mosaicHideTrending', '1');
        $this->setting('mosaicSupportUrl', '  https://help.example  ');

        $forum = $this->forum();

        $this->assertSame([['name' => 'Pinned']], $forum['mosaicTopContributors'], 'An admin override replaces the computed list');
        $this->assertSame([['label' => 'Rules', 'href' => '/rules']], $forum['mosaicQuickActions']);
        $this->assertArrayNotHasKey('mosaicHideTrending', $forum);
        $this->assertSame([], $forum['mosaicTrending'], 'A hidden widget is not computed or sent');
        $this->assertFalse($forum['mosaicHideQuickActions']);
        $this->assertSame('https://help.example', $forum['mosaicSupportUrl']);
        $this->assertNull($forum['mosaicMarketplaceUrl']);
    }

    #[Test]
    public function the_resolved_ticket_count_reads_linkrobins_support_and_skips_deleted_tickets()
    {
        $schema = $this->database()->getSchemaBuilder();
        // Temporary: a real CREATE TABLE commits the test's transaction on MySQL.
        $schema->create('linkrobins_support_tickets', function ($table) {
            $table->temporary();
            $table->increments('id');
            $table->string('status', 32);
            $table->timestamp('deleted_at')->nullable();
        });
        $this->database()->table('linkrobins_support_tickets')->insert([
            ['status' => 'resolved', 'deleted_at' => null],
            ['status' => 'resolved', 'deleted_at' => null],
            ['status' => 'resolved', 'deleted_at' => Carbon::now()],
            ['status' => 'open', 'deleted_at' => null],
        ]);

        $stats = $this->app()->getContainer()->make(AddForumStatistics::class);

        $this->assertSame(2, $stats->resolvedTicketCount(User::find(1)));
        $this->assertNull($stats->resolvedTicketCount(User::find(2)), 'Only support staff (handleTickets) see it, as in linkrobins/support');

        $this->revoke('viewForum');
        $this->assertNull($stats->resolvedTicketCount(new \Flarum\User\Guest()), 'Nothing for a visitor who cannot view the forum');
    }

    #[Test]
    public function the_url_settings_move_to_mosaic_prefixed_keys_and_back()
    {
        $this->setting('supportUrl', '/help');
        $this->setting('mosaicMarketplaceUrl', '/store');
        $this->setting('marketplaceUrl', '/old-store');
        $this->app();

        $migration = require __DIR__.'/../../../migrations/2026_11_19_000000_prefix_mosaic_url_settings.php';
        $schema = $this->database()->getSchemaBuilder();
        $settings = fn () => $this->database()->table('settings')->whereIn('key', ['supportUrl', 'marketplaceUrl', 'mosaicSupportUrl', 'mosaicMarketplaceUrl'])->pluck('value', 'key')->sortKeys()->all();

        $migration['up']($schema);
        $this->assertSame(['mosaicMarketplaceUrl' => '/store', 'mosaicSupportUrl' => '/help'], $settings(), 'An existing prefixed value wins');

        $migration['down']($schema);
        $this->assertSame(['marketplaceUrl' => '/store', 'supportUrl' => '/help'], $settings());
    }

    #[Test]
    public function the_edonline_rename_copies_in_one_pass_and_keeps_newer_values()
    {
        $this->setting('edonlineHideTrending', '1');
        $this->setting('edonlineHideQuickActions', '1');
        $this->setting('mosaicHideQuickActions', '0');
        $this->app();

        $migration = require __DIR__.'/../../../migrations/2026_05_17_000000_rename_edonline_settings_to_mosaic.php';
        $schema = $this->database()->getSchemaBuilder();
        $mosaic = fn () => $this->database()->table('settings')->whereIn('key', ['mosaicHideTrending', 'mosaicHideQuickActions'])->pluck('value', 'key')->sortKeys()->all();

        $migration['up']($schema);
        $this->assertSame(['mosaicHideQuickActions' => '0', 'mosaicHideTrending' => '1'], $mosaic());

        $migration['down']($schema);
        $this->assertSame(['mosaicHideQuickActions' => '0'], $mosaic(), 'Only the untouched copy is removed');
    }

    /** Revoke a permission from guests (2) and, optionally, members (3). */
    private function revoke(string $permission, array $groups = [2]): void
    {
        $this->database()->table('group_permission')->where('permission', $permission)->whereIn('group_id', $groups)->delete();
    }

    #[Test]
    public function a_guest_who_cannot_view_the_forum_gets_no_users_and_no_counts()
    {
        $this->revoke('viewForum');

        $forum = $this->forum(null);

        $this->assertSame([], $forum['mosaicOnlineUsers']);
        $this->assertSame([], $forum['mosaicTopContributors']);
        $this->assertSame([], $forum['mosaicTrending']);
        $this->assertNull($forum['mosaicUserCount']);
        $this->assertNull($forum['mosaicOnlineCount']);
        $this->assertNull($forum['mosaicDiscussionCount']);
        $this->assertNull($forum['mosaicPostCount']);
        $this->assertStringNotContainsString('online1', json_encode($forum));

        $this->setting('mosaicTopContributors', json_encode([['name' => 'Pinned']]));
        $this->assertSame([], $this->forum(null)['mosaicTopContributors'], 'Nor the admin-pinned list');
    }

    #[Test]
    public function a_guest_who_cannot_search_users_sees_counts_but_no_user_lists()
    {

        $forum = $this->forum(null);

        $this->assertSame([], $forum['mosaicOnlineUsers']);
        $this->assertSame([], $forum['mosaicTopContributors']);
        $this->assertStringNotContainsString('online1', json_encode($forum));
        $this->assertSame(2, $forum['mosaicDiscussionCount'], 'The hidden discussion is not counted for a guest');
        $this->assertSame(4, $forum['mosaicPostCount']);
        $this->assertSame(['Busy', 'Quiet'], array_column($forum['mosaicTrending'], 'title'));
    }

    #[Test]
    public function a_member_who_can_search_users_gets_the_lists_a_guest_does_not()
    {
        // Core grants searchUsers to members only, so a guest's list is empty.
        $guest = $this->forum(null);
        $this->assertSame([], $guest['mosaicOnlineUsers']);

        // Neither audience's cached list may be served to the other.
        $member = json_decode((string) $this->send($this->request('GET', '/api', ['authenticatedAs' => 2]))->getBody(), true)['data']['attributes'];
        $this->assertCount(6, $member['mosaicOnlineUsers']);
        $this->assertCount(5, $member['mosaicTopContributors']);
        $this->assertSame(2, $member['mosaicDiscussionCount']);

        $again = json_decode((string) $this->send($this->request('GET', '/api'))->getBody(), true)['data']['attributes'];
        $this->assertSame([], $again['mosaicOnlineUsers'], 'A member\'s cached list is never served to a guest');
        $this->assertSame([], $again['mosaicTopContributors']);
    }

    #[Test]
    public function a_member_on_a_members_only_forum_sees_what_a_guest_does_not()
    {
        $this->revoke('viewForum');
        $this->database()->table('group_permission')->insert(['group_id' => 3, 'permission' => 'viewForum']);

        $member = $this->forum(2);
        $this->assertCount(6, $member['mosaicOnlineUsers']);
        $this->assertSame(8, $member['mosaicUserCount']);
        $this->assertSame(['Busy', 'Quiet'], array_column($member['mosaicTrending'], 'title'), 'Trending works on a members-only forum');

        $guest = json_decode((string) $this->send($this->request('GET', '/api'))->getBody(), true)['data']['attributes'];
        $this->assertSame([], $guest['mosaicOnlineUsers'], 'Cached for the member, not served to a guest');
        $this->assertNull($guest['mosaicUserCount']);
    }

    #[Test]
    public function private_discussions_and_hidden_groups_stay_out_of_the_shared_stats()
    {
        $this->database()->table('discussions')->where('id', 2)->update(['is_private' => true]);
        $this->database()->table('groups')->where('id', 4)->update(['is_hidden' => true]);

        $forum = $this->forum(1);

        $this->assertSame(1, $forum['mosaicDiscussionCount'], 'Cached per group set, so a private discussion is never counted');
        $this->assertSame(['Busy'], array_column($forum['mosaicTrending'], 'title'));
        $this->assertNull($forum['mosaicTopContributors'][1]['role'], 'A hidden group is not shown as a role');
    }
}
