# Index Page — Framed Card Design

**Date:** 2026-04-10  
**Scope:** index.html only

## Problem

The landing page has the right typography, color, and voice, but the content floats in a void. No visual anchoring. No navigation to the rest of the site.

## Decision

Wrap the centered content in a `--surface` card with a `--hl-med` border. Add a vertical bare-text nav at the bottom of the card, separated by a `border-top`. Email link drops below the card.

## Structure

```
body (--base background, centered)
  .card (--surface bg, 1px solid --hl-med, border-radius 12px, max-width 520px)
    .card-body (padding 36px 40px)
      .who + animated dots
      .name (gold j)
      .divider (32px line)
      .answer (tagline)
    .card-nav (border-top: 1px solid --hl-med, padding 20px 40px)
      Work
      Writing
      Projects
  .card-footer (email, --muted, small, below card)
```

## Design tokens used

- `--surface` (#2a273f) — card background
- `--hl-med` (#44415a) — card border, internal divider
- `--subtle` — nav link default color
- `--text` — nav link hover color
- `--base` — page background (unchanged)

## What does not change

- Typography, font sizes, line heights
- The animated dots on "Who is"
- The gold `j` in the name
- The tagline copy
- The voice
