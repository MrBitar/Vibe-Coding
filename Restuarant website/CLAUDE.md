# CLAUDE.md

Guidance for Claude Code when working on this repository.

## Project Overview

A marketing website for **Restaurant Makki** (مطعم مكي) — a Lebanese charcoal-grilled
chicken ("فروج مشوي على الفحم") restaurant. The site has three pages: **Home**
(`index.html`), **About** (`about.html`), and **Menu** (`menu.html`), sharing
`css/style.css` and `js/script.js`. Plain HTML/CSS/JS, no build step.

- `logo/logo.png` — the restaurant logo (cartoon rooster mascot + "مطعم مكي"
  banner, black background) — used as favicon and in the navbar/hero/footer
- `menu.txt` — raw menu data (Arabic, prices in Lebanese Lira), source of truth
  for the Menu page (see [Menu page](#menu-page) below); update the Menu page
  whenever this file changes
- `logo/مكي.png` — earlier/unused logo version, kept in the repo but no longer
  referenced by any page

## Brand & Theme

**Vibe:** playful and cartoonish — bold outlines, rounded shapes, slightly
exaggerated icons/illustrations, echoing the mascot's comic-book style in the
logo. Avoid a stiff/corporate feel.

**Color palette** (use as CSS variables, e.g. `--color-black`, etc.):

| Color | Hex | Usage |
|---|---|---|
| Black | `#000000` | Navbar background, footer background, body text on white |
| White | `#FFFFFF` | Body/page background, text on navbar & footer |
| Amber/Gold | `#f19d11` | Primary brand accent — headings, buttons, borders, icons, hover states |
| Red | `#ff3131` | Sparing accent only — CTAs, small highlights, badges (matches the red in the logo); do not use as a dominant color |

**Navbar**
- Background: black, text: white
- Logo (`logo/logo.png`) on the left, nav links (Home / About / Menu) on the right
- Active/hover link state can use `#f19d11`

**Body**
- Page background: white
- Headings/accents in `#f19d11`, occasional `#ff3131` touches (e.g. a "spicy"
  badge, a hover glow, a small flame icon)

**Footer**
- Background: black, text: white
- Contact line: `Call us: +961 81 119 530`
- Copyright line: `© [current year] Restaurant Makki — Created by Bitar`

## Pages

### Home page

Hero section: logo/mascot art, restaurant name, a short tagline (e.g. "Fire-Grilled
Since Day One" / charcoal-chicken themed), a CTA button to the Menu page.

Below the hero, a **"History of Charcoal-Grilled Chicken"** section — this is
general food-history flavor content (not the restaurant's own story, that's the
About page), told in 3–4 short narrative blocks alternating text and image,
cartoon-illustrated rather than photographic to match the site's theme:

1. **Ancient fire cooking** — grilling meat over open coals is one of the
   oldest cooking methods, going back to when humans first controlled fire;
   the smoky char became a flavor people specifically sought out, not just a
   byproduct of cooking.
2. **The Levantine charcoal-chicken tradition** — in Lebanon and the wider
   Levant, marinating whole chickens in garlic, lemon, and spices before
   slow-turning them over charcoal became a street-food staple in the
   mid-20th century, with rotisserie-style "farrouj mshawi" stalls becoming
   neighborhood fixtures.
3. **Why charcoal, not gas** — charcoal burns hotter and drier than gas,
   rendering the skin crisp while the smoke perfumes the meat; this is the
   detail that separates "grilled chicken" from "charcoal-grilled chicken."
4. **A dish that travelled** — from roadside grills to family tables, charcoal
   chicken became a shared Lebanese comfort food, always served with garlic
   sauce, chili sauce, pickles, and fries — the same lineup Restaurant Makki serves
   today.

Each block should pair with an illustration (flame/charcoal motif, a spinning
rotisserie, a cartoon chicken, a family table) — use placeholder illustrations
in the brand palette (black/white/gold, red accents) until real artwork is
sourced; there are no image assets in the repo yet beyond the logo.

### About page

**"Our Story"** — the restaurant's own (invented) origin story:

> Restaurant Makki was founded in **2023 in Jibsheet, Lebanon**, when **Abbass
> Makki**, a charcoal-grill cook who had spent a decade perfecting his
> marinade at a small roadside stall, opened the first Restaurant Makki
> storefront. The family recipe — garlic, lemon, and a secret spice blend
> rubbed into the chicken the night before grilling — became known
> neighborhood-wide, and the little stall grew into the restaurant it is
> today. Three years later, the Makki family still runs Restaurant Makki, still
> grilling over real charcoal, still using Abbass's original marinade.

Layout: a short intro line, the story card (heading + a **Jibsheet, Main
Street** location chip + the narrative above) in the white body — not the
dark page-header banner — and a "Why Charcoal" strip (freshness, real
charcoal fire, family recipe, fast service) as 3–4 icon+text cards using the
gold/black palette.

### Menu page

Source of truth is `menu.txt`. Present items grouped by category, Arabic name
first with an English gloss, price formatted with thousands separators in LBP.
Update this table whenever `menu.txt` changes.

**Grilled Chicken**
- فروج مشوي على الفحم (Whole Charcoal-Grilled Chicken) — 1,200,000 LBP
- نص فروج مشوي على الفحم (Half Charcoal-Grilled Chicken) — 650,000 LBP

**Sandwiches**
- ساندويش دجاج عالفحم كبير (Large Charcoal Chicken Sandwich) — 400,000 LBP
- ساندويش دجاج عالفحم صغير (Small Charcoal Chicken Sandwich) — 250,000 LBP

**Sides**
- علبة بطاطا (Box of Fries) — 200,000 LBP
- صحن بطاطا (Plate of Fries) — 400,000 LBP

**Meals**
- وجبة دجاج عالفحم (Charcoal Chicken Meal) — 550,000 LBP
  — includes: large chicken sandwich + fries + garlic sauce + chili sauce

Menu cards should use the cartoonish theme too (rounded cards, gold borders,
small chili/garlic icons on the meal item), white background, black text,
price highlighted in `#f19d11`.

## Internationalization / Auto-Translate

The site is English-only — there are **no separate Arabic pages**
(`*-ar.html` does not exist and should not be added without an explicit
ask). The Arabic dish names on the Menu page are inline bilingual content
(`<span class="ar" lang="ar">`), not a translated version of the site.

Browser/extension auto-translate (Chrome's built-in "Translate this page?",
Google Translate extensions, etc.) is deliberately **disabled outright** on
every page, via two tags in `<head>`/`<html>`:

- `<meta name="google" content="notranslate">` — the documented way to stop
  Google Translate (and Chrome's built-in translate, which uses the same
  backend) from even offering to translate the page.
- `<html translate="no">` — the HTML spec's generic signal, as a fallback for
  any other translation tool that doesn't check the Google-specific meta tag.

Keep both on every page. **Do not** try to make the page "safely
translatable" instead by marking individual names/prices `translate="no"`
while leaving the rest of the text translatable — that was tried first and
caused Chrome's translator to drop text outright: once a sentence has
several alternating protected/unprotected fragments, the translator can
fail to reinsert some of them and they vanish instead of staying
untranslated. Blocking translation entirely avoids that failure mode.

`.ltr-nums` (in `css/style.css`) is still applied to the footer phone number
and every menu price as a harmless extra — pure CSS (`direction: ltr;
unicode-bidi: isolate`), no `translate` attribute involved. The seven
already-Arabic `.ar` menu spans still carry `translate="no"` +
`class="notranslate"` too, redundant now that translation is blocked
page-wide, but left in as defense-in-depth. The `[lang="ar"]` CSS rule (Noto
Kufi Arabic font + `direction: rtl`) makes those spans render correctly
regardless.

## Contact Info (use in footer / About / Menu CTAs)

- Phone: **+961 81 119 530** — footer contact link, `tel:+96181119530`
- Ordering: the Menu page's "Order on WhatsApp" button opens a WhatsApp chat
  via `https://wa.me/96181119530` (pre-filled greeting text) rather than
  dialing — WhatsApp is the actual ordering channel, phone is for contact only
- Location: **Jibsheet, Main Street** — shown as a chip in the About page story card (white body, not the dark header)
- Copyright: **Created by Bitar**
