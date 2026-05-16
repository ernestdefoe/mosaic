# Design Preview

This directory contains the static HTML mockup used to design the theme. It runs as a flat site with no build step.

## Pages
- [index.html](index.html) — Discussion list (forum landing) with hero, stats strip, category tiles, and sidebar
- [discussion.html](discussion.html) — Single discussion view with best-answer treatment
- [tickets.html](tickets.html) — Support ticket list (`linkrobins/support`) with 5-state workflow filters
- [ticket.html](ticket.html) — Single ticket view with staff control bar + internal note
- [marketplace.html](marketplace.html) — Marketplace storefront (`ramon/marketplace`) with product grid
- [product.html](product.html) — Product detail page with buy card, gallery, and reviews

## Running locally

Any static server works. For example:

```bash
npx serve .
# or
python -m http.server 5174
```

Open http://localhost:5174.

## Relationship to the Flarum theme

`theme.css` here is the **design source of truth**. The Flarum theme in
`../less/` ports the same tokens and component rules into modular LESS that
plugs into Flarum's pipeline. When the design changes, update both together
to keep them in sync.
