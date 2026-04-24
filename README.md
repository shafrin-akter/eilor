# Eilor — Premium DTC Shopify Theme

A heavily-customised Dawn 15.x theme built for single-product DTC brands (skincare / supplements / fitness). Ships with a conversion-focused product page (bundle selector, sticky ATC, urgency, trust), an AJAX cart drawer with free-shipping progress bar, a metafield-driven content system, three reusable sections, and a dynamic cart-based upsell engine that fetches from Shopify's recommendations API.

## Feature map

| Requirement | Implementation | Files |
| --- | --- | --- |
| Custom theme (Dawn base, heavily customised) | Dawn 15.4.1 + custom sections/snippets/JS/CSS | all below |
| Sticky Add to Cart | Fixed bottom bar, slides in when main form exits viewport, variant-reactive CTA | `snippets/sticky-atc.liquid`, `sections/sticky-atc.liquid`, `assets/sticky-atc.js` |
| Variant-based dynamic content | Dawn's `product-info` publishes to a shared pubsub; a bridge script translates those to `variant:change` DOM events consumed by sticky-atc + bundle | `assets/dtc-event-bridge.js` |
| Bundle selector (1/2/3 pack, auto discount) | Radio bundle w/ live discount %, strikethrough, per-unit, AJAX add-to-cart preserving `_bundle` line-item property | `sections/product-bundle.liquid`, `assets/bundle-selector.js` |
| Real-time price updates | Recalculates all bundle totals on variant change without page reload | `assets/bundle-selector.js` |
| Urgency (low-stock + countdown) | Real low-stock (policy-aware), mock fallback, mock live viewers, sessionStorage-backed countdown | `sections/urgency-bar.liquid`, `assets/countdown-timer.js` |
| Trust badges | Reusable section w/ icon library + schema | `sections/trust-badges.liquid` |
| Cart Drawer (AJAX, not a page) | Dawn `cart-drawer` kept; added free-shipping progress bar that auto-updates each cart mutation via the existing section-render flow | `snippets/cart-drawer.liquid`, `snippets/free-shipping-bar.liquid` |
| Free-shipping progress bar | Dynamic % fill, remaining amount, "unlocked" state | `snippets/free-shipping-bar.liquid` |
| Metafield-driven FAQ | Renders from `product.metafields.custom.faqs` (JSON list) OR section blocks — emits FAQPage JSON-LD for SEO | `sections/product-faq.liquid` |
| Metafield-driven ingredients | Renders from `custom.key_ingredients` (metaobject list), `custom.ingredients` (tag list), or `custom.full_ingredients` (rich text) | `sections/product-ingredients.liquid` |
| Dynamic section rendering | Metafield → conditional render inside FAQ/Ingredients | above |
| Reusable section #1 — Testimonials slider | Autoplay, pause-on-hover, touch swipe, dots, overall-rating header, verified badges | `sections/testimonials-slider.liquid`, `assets/testimonials-slider.js` |
| Reusable section #2 — Comparison table | Configurable columns + rows, highlight column, yes/no/text values | `sections/comparison-table.liquid` |
| Reusable section #3 — Icon text grid | Preset icons + custom image override, responsive columns | `sections/icon-text-grid.liquid` |
| Performance | `loading="lazy"` on every `image_tag`, `decoding="async"`, `defer` on every script, one consolidated CSS file (`custom-dtc.css`), `prefers-reduced-motion` respected, no render-blocking inline scripts | all |
| Reusable snippets / clean code | Shared `custom-dtc.css`, one `dtc-event-bridge.js` translating internal pubsub to DOM events so new components don't couple to Dawn internals | as listed |
| **Advanced requirement — Dynamic upsell** | Fetches from `/recommendations/products.json?intent=complementary` based on the first item in the cart, re-fetches on every `cart:updated` event, AJAX add-to-cart that re-renders the drawer | `sections/dynamic-upsell.liquid`, `assets/dynamic-upsell.js` |

## Metafield setup

All metafields live under the `custom` namespace. Create them in **Settings → Custom data → Products**.

### 1. `custom.faqs`
- **Type:** JSON (or `list.metaobject` pointing to an "FAQ item" metaobject w/ `question` + `answer` fields)
- **Shape when using JSON:**
  ```json
  [
    { "question": "How long until I see results?", "answer": "Most customers notice a difference in 2–4 weeks." },
    { "question": "Is it safe for sensitive skin?", "answer": "Yes — dermatologist-tested and fragrance-free." }
  ]
  ```
- **Used by:** `sections/product-faq.liquid` when the section's FAQ source is set to "Product metafield".

### 2. `custom.key_ingredients`
- **Type:** `list.metaobject`, pointing to a metaobject named `ingredient` with fields:
  - `name` — single line text
  - `benefit` — single line text (short tagline, e.g. "Hydrates 24h")
  - `description` — multi-line text / rich text
  - `image` — file reference (image)
- **Used by:** `sections/product-ingredients.liquid` (preferred rendering).

### 3. `custom.ingredients`
- **Type:** `list.single_line_text_field`
- **Example:** `["Hyaluronic Acid", "Niacinamide", "Peptide Complex", "Vitamin B5"]`
- **Used by:** `sections/product-ingredients.liquid` as a tag-pill fallback when `key_ingredients` is empty.

### 4. `custom.full_ingredients`
- **Type:** `rich_text_field`
- **Used by:** `sections/product-ingredients.liquid` — renders inside an expandable `<details>` for the full INCI list.

### 5. `descriptors.subtitle` (optional, Dawn-native)
- **Type:** single line text — the product tagline used by the "caption" block in `main-product`.

## Theme settings

| Setting | Location | Purpose |
| --- | --- | --- |
| Free shipping threshold | Theme settings → Cart | Cart total (in cents) required for free shipping. Drives the progress bar. |
| Show free-shipping progress bar | Theme settings → Cart | Toggle the bar in the cart drawer. |

## Install

1. Zip this directory (`eilor/`) and upload via **Online Store → Themes → Upload theme**, or use `shopify theme push` from the Shopify CLI.
2. In the theme customiser, switch your product template to **product.premium** (Online Store → Themes → Customize → Product → Change template).
3. Create the metafields above under **Settings → Custom data → Products**.
4. Populate `custom.key_ingredients` / `custom.faqs` for your hero product.
5. (Optional) Adjust the bundle discount %, countdown, and trust row labels in the customiser.

## Architecture notes

### How real-time variant updates work

Dawn's `product-info.js` already publishes a `variantChange` event through its internal pubsub on every variant swap. Rather than forking `product-info.js`, a tiny bridge (`dtc-event-bridge.js`, loaded once in `theme.liquid`) subscribes to that internal event and re-dispatches a `variant:change` DOM `CustomEvent` on `document`. The bundle selector and sticky ATC listen for that event and recompute their prices / input values. Same pattern for `cart:updated`.

This keeps the custom code decoupled from Dawn internals — if Dawn ships an update, only the bridge needs to be checked.

### Cart drawer re-render flow

Dawn's cart drawer already does a `/cart/add.js` request with `sections=cart-drawer,cart-icon-bubble&sections_url=...` and swaps the returned HTML into `.drawer__inner`. Because the free-shipping progress bar snippet is rendered *inside* `.drawer__inner`, it is re-rendered on every cart mutation with the latest totals — no extra JS required.

The bundle selector, sticky ATC and dynamic upsell all use the same `sections` query trick so adds from any of them refresh the drawer consistently.

### Dynamic upsell logic

1. On mount and on every `cart:updated` event, the component calls `/cart.js`.
2. Using the first item's `product_id` as the seed, it hits `/recommendations/products.json?intent=complementary&limit=...`.
3. If the cart is empty it falls back to the seed product configured in the section settings.
4. Products already in the cart are filtered out so we never recommend an item the user already has.
5. Each card has its own AJAX-add button that re-renders the cart drawer on success.

### Performance posture

- Every `<img>` uses `loading="lazy"` + `decoding="async"` (except above-the-fold hero images that Dawn handles).
- Every custom script is `defer`-loaded and gated behind `customElements.get(...)` to prevent double-definition.
- CSS is consolidated into one `custom-dtc.css` rather than one file per section.
- `prefers-reduced-motion` disables slider autoplay / transitions.
- Countdown uses `sessionStorage` so deep-linked users don't see a fresh 6-hour timer on every refresh (anti-dark-pattern).

## File tree (additions only)

```
assets/
  bundle-selector.js
  countdown-timer.js
  custom-dtc.css
  dtc-event-bridge.js
  dynamic-upsell.js
  sticky-atc.js
  testimonials-slider.js
sections/
  comparison-table.liquid
  dynamic-upsell.liquid
  icon-text-grid.liquid
  product-bundle.liquid
  product-faq.liquid
  product-ingredients.liquid
  sticky-atc.liquid
  testimonials-slider.liquid
  trust-badges.liquid
  urgency-bar.liquid
snippets/
  free-shipping-bar.liquid
  sticky-atc.liquid
templates/
  product.premium.json
```

## Files modified from stock Dawn

- `config/settings_schema.json` — added free-shipping threshold + toggle in the Cart section.
- `layout/theme.liquid` — added `dtc-event-bridge.js` immediately after `global.js`.
- `snippets/cart-drawer.liquid` — inserted `{% render 'free-shipping-bar' %}` between the drawer header and item list.

## Rejection-criteria checklist

- [x] AJAX / Cart drawer (no full-page cart reloads; all add/remove/qty updates go through the drawer).
- [x] No hardcoded content — every section has a full `{% schema %}`, plus a metafield path for FAQ / ingredients.
- [x] Mobile responsive — every section uses CSS grid `auto-fit` or explicit mobile breakpoints.
- [x] Logic and functionality, not just UI — bundle pricing math, cart AJAX, countdown state, upsell fetch/filter.
