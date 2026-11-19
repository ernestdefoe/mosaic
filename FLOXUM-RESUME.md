# Mosaic Floxum fix wave: resume notes (paused 2026-11-19)

Paused at Ernest's request ("Yes, pause rewrites") until the weekly usage reset on 2026-11-26.
This branch is NOT released: nothing is pushed to main or tagged. Delete this file before the release commit.

## Where it stands
- Released: 3.4.10 (Floxum review 96, 2 findings: optional-dependencies; `'linkrobins-blog' in flarum.extensions` guard). Both fixed here.
- On this branch: 5 `fix:` commits, e3fba81..3ec8360 (on top of d8b8de7 = 3.4.10).
- Tests: 17 tests, 81 assertions, green on SQLite, PostgreSQL and MySQL at 3ec8360 (driver confirmed from tmp/config.php each run). PHPStan clean, tsc clean, prettier clean, js/dist built.
- Browser checks on the local forum ~/Herd/mosaicdev (Mosaic symlinked from this repo; admin and member1 logins in ~/Herd/mosaicdev-admin.txt):
  guest + admin, 1280 + 390px. Composer card and Start a Discussion open the composer (guests get the log-in modal),
  tiles, contributors and online rows route in-app, tag pages keep TagHero with the tag's count, search results have
  no count badge, and Online now is a plain figure for guests without searchUsers. A member without startDiscussion
  sees the card disabled ("Can't Start Discussion"). The phone row's tag pill no longer covers the reply count.
  Puppeteer scripts: scratchpad/ui/check.mjs and perm.mjs from the paused session (re-create if gone).

## Pre-floxum trend
pass 2 (e3fba81) 62/77/91 → pass 3 (3da19a5) 86/92/97 → pass 4 (9fed1af) 86/91/96 → pass 5 (888cef0) 82/89/96
(worst / point / expected). Pass 6 on 3ec8360 was STOPPED before it finished, so 3ec8360 is unreviewed.

## Pass 5 findings: all three addressed in 3ec8360, still to verify
1. LESS comments contradicting code (header.less nav comments, support.less HeaderPrimary/StatusPill/verify notes,
   marketplace.less verify/Free/:has notes, post.less ::before banner/duplicate/"moved" notes, layout.less container quote).
2. History-narrating LESS comments (admin.less, reactions.less, post.less, colored.less).
3. Dead LESS rules (.StatusPill, .MosaicSideCard-title .accent, .Sidebar > .item, MosaicHeroNav display:contents
   wrappers, .Post--bestAnswer::before, [data-free]).
Also in 3ec8360: Start a Discussion follows currentTag().canStartDiscussion() on tag pages (was a watch item),
and the phone padding-right on .DiscussionListItem-main.

## Open watch items (each under 3 files; not charged by the skill)
- SupportTicket reads linkrobins/support's table directly (own read model, inside Extend\Conditional).
- Google Fonts @import in base.less and admin.less.
- Settings migrations use raw up/down (no helper renames settings).
- Contributor role badge picked by an English regex; LESS styles only staff/mod/expert.
- The 2026_11_19 migration's down doesn't restore the deleted mosaicTopContributors row.
- Placeholder category tiles when the forum has no tags.
- Forum-wide counts rebuilt every 60 s with no cache lock.
- Online now count includes members who hid their online status.

## To resume
1. Check weekly usage first (rule: at 65%+ finish only the current release, then pause).
2. Run pre-floxum on this branch's HEAD; fix until zero findings; rerun the three-database tests.
3. Send the Command Center the commit range, pre-floxum score and test results; wait for approval.
4. Then: drop this file, fast-forward main, push, publish the drafted release (behaviour-change notes: Tickets resolved
   is staff-only; supportUrl/marketplaceUrl settings become mosaicSupportUrl/mosaicMarketplaceUrl, copied on migrate;
   the pinned mosaicTopContributors setting is removed), deploy (showcase bin/deploy, dev composer), edonline changelog only.
