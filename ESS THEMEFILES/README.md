# ESS Theme Files — Universal Product Section

A reusable Shopify PDP section set. Drop it on any store, configure it in the
theme editor, and nothing needs editing in code.

---

## What changed in this update

### 1. Buy Options is now a real bundle / quantity-break selector

The old `ess-element-options.liquid` hardcoded almost everything:

| Was hardcoded | Now |
|---|---|
| Exactly 3 tiers (a literal `1..3` loop) | Any number of **Bundle Tier** blocks |
| Quantities 1 / 3 / 5 | Per-tier **Quantity** setting |
| "Buy 2, Get 1 FREE" copy | Per-tier **Title** / **Sub-label** |
| "Most Popular" / "Best Value" badges | Per-tier **Badge** |
| A 20% subscription saving | Real selling-plan prices from Shopify |
| Products pulled from one collection, used as pseudo-variants | Works with the product's own variants **or** a collection |
| Metafields `custom.scent`, `scent_image`, `best_seller`, `new_scent` | No metafield assumptions |
| The label "Inspired by:" | Removed |

### 2. Two cart bugs fixed

- **Add-to-cart always sent `quantity: 1`.** The bundle tiers were visual
  only — picking "Buy 3, Get 2 FREE" still added a single unit. Quantity now
  comes from the selected tier.
- **`selling_plan` was never sent** on the main add-to-cart path, so the
  subscription toggle changed the displayed price but added a one-time item.

### 3. Store-specific variant IDs removed

`53900035981639` (shipping protection) appeared in four places and
`53900196479303` (gift) in one, across `ess-pdp.js` and
`ess-element-checkout-button.liquid`. That is what stopped these files being
reusable. Both are now section settings under **Cart add-ons**.

### 4. A cart-clearing bug

`removeShippingProtection()` called `/cart/clear.js` whenever the cart held
items but the non-protection total was under one cent. With a 100%-off
discount or an all-free-gift cart, that wiped a real cart. It now removes only
the orphaned protection line.

### 5. Performance

| Change | Why |
|---|---|
| Removed the jQuery CDN script and Slick CSS + JS | ~115KB gzipped of render-blocking JS from two extra origins, for an accordion, a scroll class, a video toggle and a slider |
| Sliders now use CSS scroll-snap | Native momentum scrolling, no cloned slides, no layout shift |
| Cart drawer uses the Section Rendering API | `refreshCartDrawer()` used to refetch the **entire current page** with `$.get(window.location.href)` on every cart change, then scrape the drawer out of it |
| Scroll handler wrapped in `requestAnimationFrame` | Ran unthrottled and called `scrollTop()` each time, forcing layout |
| FAQ animates with `grid-template-rows` | Replaces jQuery `slideToggle()`, which animates inline height and thrashes layout |
| Main product image preloaded with `fetchpriority="high"` | It is almost always the LCP element on a PDP |
| Fonts use `display=swap` + preload | Without swap the browser hides text for up to 3s during the font fetch |
| Scripts use `defer`, not `async` | Defer preserves execution order; async would race `ess-bundle` against `ess-cart` |

### 6. SEO

- Product **JSON-LD** structured data with real per-variant price and
  availability, so it cannot drift from what the store charges. Toggleable, to
  avoid duplicating an app's markup.
- Open Graph and Twitter card tags.
- A skip link, `role="radio"` / `aria-checked` on the selectors, visible focus
  rings, and `prefers-reduced-motion` support.

### 7. Other fixes

- **Container Width** is a number input instead of a slider that was capped at
  1500–1600px. Applied to all three theme sets.
- **A trailing comma in the header section schema** (`"default":"body"},]}`)
  broke strict JSON parsing, so that section failed to load in the theme
  editor. Present in all three sets; fixed in all three.
- `.ess-error` / `.ess-success` had no CSS rules despite being referenced by
  the newsletter form. Added, along with the `hk-` and `el-` equivalents.

---

## Important: how the discount actually applies

Kaching Bundles applies its discount with **Shopify Functions**, which is an
app-level feature. A theme section cannot discount at checkout. So tiers come
in two modes:

**`Variant` mode (recommended).** The tier maps to a real variant — a "3-pack"
with its own price. The price on the card *is* the price charged. Nothing can
drift.

**`Quantity` mode.** The tier adds N of one variant and the price shown is
`base × N`. This is honest arithmetic, but it is **not a discount**. For the
savings to be real you need a Shopify automatic discount or a Function behind
it. Otherwise set `Compare-at override` only if it reflects a genuine former
price.

> Showing a discount the checkout will not honour is the single most common way
> these sections go wrong, which is why the price here is always derived from
> variant data rather than calculated in JavaScript.

---

## Setup

### Add the section

1. Theme editor → **Add section** → **Product Stabilizer**.
2. Pick your **Product**.

### Build the tiers

Add a **Bundle Tier** block per price point. For a 1 / 3 / 5 ladder on a store
with real multipack variants:

| Setting | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Tier type | Variant | Variant | Variant |
| Variant position | 1 | 2 | 3 |
| Units received | 1 | 3 | 5 |
| Title | Single | Triple pack | Five pack |
| Badge | — | MOST POPULAR | BEST VALUE |
| Unit noun | bottle | bottle | bottle |
| Preselected | — | ✓ | — |

Tick **Preselected** on exactly one tier.

**Variant position vs Variant ID.** Position (1 = first variant) keeps the
section portable — the same config works on another store with the same variant
ordering. Variant ID is exact but store-specific, so leave it blank if you
reuse this section elsewhere.

### Subscriptions

Under **Buy Options → Purchase type**, choose one of:

- One-time + Subscription (toggle)
- One-time + Subscription (subscription preselected)
- One-time only
- Subscription only

The toggle hides itself automatically when the product has no selling plans, so
"both" is safe to leave on. **Delivery frequency** lists the product's real
selling plans and only appears when there is more than one.

Per tier, **Selling plan group** takes a group ID or part of a plan name. Leave
it blank to use the product's first available plan.

### Mix-and-match bundles

On a tier with 2+ units, tick **Let the customer choose each item** to get one
dropdown per unit. Set **Options source** to a collection to choose between
products, or leave it blank to choose between the product's own variants. Each
pick becomes its own cart line, merged by variant.

### Cart add-ons

Under the section's **Cart add-ons**:

- **Shipping protection variant ID** — added once per cart. Blank disables it.
- **Free gift variant ID** — used by the cart drawer's upgrade link.
- **Cart drawer section filename** — defaults to `ess-cart-drawer`. Used by the
  Section Rendering API.

### Quantity stepper

Off by default. It *multiplies* the selected tier, so leave it off if your tiers
already cover the quantities you sell.

---

## Files

| File | Role |
|---|---|
| `snippets/ess-element-options.liquid` | Buy Options container: purchase toggle, frequency, tier list, stepper |
| `snippets/ess-bundle-tier.liquid` | One tier. All pricing maths, with every division guarded |
| `assets/ess-bundle.js` | Tier selection, purchase mode, price sync. Broadcasts `ess:selection:change` |
| `assets/ess-cart.js` | Add-to-cart, drawer, line changes. Reads `#ess-cart-config` |
| `assets/ess-pdp.js` | Accordion, video, sliders, menu. No jQuery |
| `sections/ess-product.liquid` | Section, schema, cart config, JSON-LD, LCP preload |

### Slider compatibility

`ess-pdp.js` reads the **existing** `data-slider-config` that was written for
Slick, so the seven snippets already emitting that markup did not change. It
supports `slidesToShow`, `slidesToScroll`, `vertical`, `arrows` with
`prevArrow`/`nextArrow` selectors, `dots`, `autoplay`/`autoplaySpeed`,
`asNavFor`, `focusOnSelect`, `responsive[breakpoint].settings`, and `unslick`.

Dropped deliberately: `infinite` (slide cloning was the biggest source of layout
shift) and `cssEase` (native smooth scrolling handles it).

---

## JS hooks

```js
// React to the customer changing bundle or purchase type
document.addEventListener('ess:selection:change', (e) => {
  e.detail.selection; // { items, mode, tier, price, comparePrice }
});

// React to any cart change
document.addEventListener('ess:cart:updated', (e) => {
  e.detail.cart; e.detail.count;
});

ESSCart.refresh();  // re-render the drawer
ESSCart.open();
```

Markup hooks: `[data-ess-atc]` on a button makes it an add-to-cart.
`[data-ess-price]` with `[data-ess-price-current]` / `[data-ess-price-compare]`
inside makes a price readout track the selection.

---

## Still worth doing

- **Theme check.** Run `shopify theme check` against a real store. Static
  validation here covered schema JSON, Liquid tag balance, render targets and
  asset references, but not runtime behaviour on live product data.
- **Test the tiers against a real product** with selling plans attached — the
  subscription path is the part most sensitive to how a store's plans are set up.
- **`snippets/meta-tags.liquid`** is referenced by the layout but is not in this
  repo. It comes from the parent theme (Dawn ships one). Confirm it exists on
  the target store.
- **`components.js`** is empty in the HK and EL sets. Either populate or remove.
- **Decide on EL vs HK.** They are 98% identical — the same files with `el-`/`hk-`
  prefixes and a different preset category. Maintaining both means every fix
  happens twice. This update treated HK as current and left EL in place.
