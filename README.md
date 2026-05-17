# Mosaic

A polished, configurable Flarum 2 theme. Works as a standalone visual upgrade on any forum, with opt-in integrations for `fof/best-answer`, `fof/reactions`, `ram0ng1/colored`, and (when installed) `linkrobins/support` and `ramon/marketplace`.

> **Status:** active development. LESS theme is complete, JS components are in place, design preview ships in [`preview/`](preview/).

---

## What you get

- **Tiled hero panel** with title, search, and a configurable stats strip (Members / Discussions / Posts / Online Now — and Tickets Resolved when `linkrobins/support` is detected)
- **Category tiles** below the hero — auto-populated from `flarum/tags` when installed
- **Configurable sidebar** — Marketplace promo, **Quick Actions** (admin-editable rows: icon, label, URL), Top Contributors, Trending. Each panel can be hidden from the admin UI
- **Optional support-ticket styling** — when `linkrobins/support` is enabled, the 5-state workflow (Open → In Progress → Awaiting You → Resolved → Closed), staff control bar, internal notes, and SLA pills all light up
- **Optional marketplace styling** — when `ramon/marketplace` is enabled, the storefront, product cards, and cart get themed (verified against the real `.MpShop-*` DOM)
- **Best-answer highlight** for `fof/best-answer` — full-width banner on the chosen reply
- **Reactions popup** styled after `ram0ng1/avocado`'s cascade pattern
- **Tag-coloured borders** for `ram0ng1/colored` on the discussion list and posts
- **Full dark mode** via Flarum 2's native `[data-theme^=dark]` selector
- **DM Sans typography**, organic 14px radii, calm primary palette

## Install

```bash
composer require ernestdefoe/mosaic
php flarum cache:clear
```

Then enable in **Admin → Extensions → Mosaic**.

### Configure

All theme settings live in **Admin → Extensions → Mosaic**:

- **Hide sidebar widgets** — toggle Marketplace promo / Quick Actions / Top Contributors / Trending individually
- **Quick Actions editor** — dynamic row editor for the sidebar's Quick Actions card. Each row is an icon class, a label, and a URL. Defaults to `Start a Discussion / Browse Tags / Recent Activity` for any Flarum install, and surfaces `Open a Support Ticket` / `Visit the Marketplace` extras when those extensions are detected
- **Section URL overrides** — point the auto-detected support / marketplace links elsewhere if you've mounted them on non-default paths

## Develop

```bash
cd js
npm install
npm run dev      # watch mode
npm run build    # production
```

The frontend uses `flarum-webpack-config` v3 — `js/forum.js` and `js/admin.js` are auto-discovered, with webpack running from `js/` and emitting to `js/dist/`. Compiled bundles in `js/dist/` are committed because Flarum extensions installed via Composer ship prebuilt assets.

## Structure

```
mosaic/
├── composer.json       # Flarum 2 extension manifest
├── extend.php          # PHP extender — registers forum/admin frontends + settings bridge
├── src/Api/
│   ├── AddForumSettings.php       # SettingsRepositoryInterface helpers
│   └── AddForumStatistics.php     # Member/online/resolved counts
├── js/
│   ├── package.json
│   ├── webpack.config.js
│   ├── forum.js / admin.js        # entries (discovered by webpack)
│   ├── dist/                      # compiled bundles, committed
│   └── src/
│       ├── forum/
│       │   ├── index.js                       # initializer + IndexPage hooks
│       │   └── components/
│       │       ├── HeroPanel.js               # branded hero + stats strip
│       │       ├── CategoryTiles.js           # category grid
│       │       ├── SidebarPanels.js           # Marketplace promo / QA / contributors / trending
│       │       ├── MarketplacePromoCard.js    # sidebar CTA
│       │       ├── HeaderNav.js               # primary nav items
│       │       └── SectionHeader.js
│       └── admin/
│           ├── index.js
│           └── extend.js                      # Admin settings (visibility, URLs, QA editor)
├── less/
│   ├── forum.less / admin.less    # entries
│   ├── tokens.less                # CSS custom properties
│   ├── base.less, header.less, hero.less, categories.less, discussions.less,
│   │   post.less, sidebar.less, composer.less, support.less, marketplace.less,
│   │   reactions.less, colored.less, layout.less, dark.less
├── locale/en.yml
└── preview/                       # static HTML mockup (design source of truth)
```

## Pairing with optional extensions

| Surface | Source | Where styled |
|---|---|---|
| Discussion list / detail | Flarum core | `discussions.less`, `post.less` |
| Tags (coloured borders) | `ram0ng1/colored` | `colored.less` |
| Reactions popup | `fof/reactions` | `reactions.less` |
| Best-answer highlight | `fof/best-answer` | `post.less` `.Post--bestAnswer` |
| Tickets (5-state workflow, internal notes) | `linkrobins/support` *(optional)* | `support.less` |
| Marketplace storefront / cards / cart | `ramon/marketplace` *(optional, paid)* | `marketplace.less` |

Each integration's LESS is a no-op when the source extension isn't installed — Mosaic stays clean on a vanilla Flarum.

## Design preview

The [`preview/`](preview/) directory ships a static HTML mockup of every surface — open `preview/index.html` directly or run `npx serve preview/` to inspect the design without a Flarum install. Treat that mockup as the visual source of truth.

## Credits

- **DM Sans** by Colophon Foundry, via Google Fonts
- **Font Awesome 7** for iconography
- Visual cues borrowed from [Avocado](https://discuss.flarum.org/d/27126) by ramon

## License

MIT — see [LICENSE](LICENSE).
