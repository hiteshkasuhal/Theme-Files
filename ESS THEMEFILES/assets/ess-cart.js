/*
 * ess-cart.js
 * -----------
 * Cart drawer + add-to-cart, dependency-free.
 *
 * What this replaces, and why:
 *
 *  - Hardcoded variant IDs. The old build had 53900035981639 (shipping
 *    protection) in four places and 53900196479303 (upgrade gift) in one,
 *    across ess-pdp.js and ess-element-checkout-button.liquid. Those are
 *    store-specific, so the files could not be reused on another store.
 *    Both now come from section settings via #ess-cart-config.
 *
 *  - refreshCartDrawer() refetched the ENTIRE current page with
 *    $.get(window.location.href) and scraped the drawer out of the response.
 *    That downloads and parses the whole PDP on every cart change. Replaced
 *    with the Section Rendering API, which returns only the drawer markup.
 *
 *  - A cart-clearing branch that ran /cart/clear.js whenever the cart had
 *    items but "other products total" was under 1 cent. With a 100%-off
 *    discount or an all-free-gift cart that wipes a legitimate cart. It now
 *    only removes the orphaned protection line.
 *
 *  - quantity: 1 hardcoded on add-to-cart, ignoring the chosen bundle.
 */
(function () {
  'use strict';

  /* ----------------------------------------------------------------- config */

  var CONFIG = { protectionVariantId: null, giftVariantId: null, cartDrawerSection: 'ess-cart-drawer', cartCountExcludesProtection: true };

  (function readConfig() {
    var node = document.getElementById('ess-cart-config');
    if (!node) return;
    try {
      var parsed = JSON.parse(node.textContent);
      Object.keys(parsed).forEach(function (k) {
        if (parsed[k] !== null && parsed[k] !== '') CONFIG[k] = parsed[k];
      });
    } catch (err) {
      console.warn('[ess-cart] config parse failed', err);
    }
  })();

  function toId(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  var PROTECTION_ID = toId(CONFIG.protectionVariantId);
  var GIFT_ID = toId(CONFIG.giftVariantId);

  /* ------------------------------------------------------------------ utils */

  function els(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw Object.assign(new Error(data.description || 'Cart error'), { data: data, status: res.status });
        return data;
      });
    });
  }

  function getCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
  }

  /* ------------------------------------------------------------ drawer state */

  var drawer = {
    open: function () {
      els('.ess-cart-drawer').forEach(function (d) { d.classList.add('ess-active'); });
      els('.ess-drawer-cart-bg').forEach(function (b) { b.style.display = 'block'; });
      document.body.classList.add('ess-overflow-hidden');
    },
    close: function () {
      els('.ess-cart-drawer').forEach(function (d) { d.classList.remove('ess-active'); });
      els('.ess-drawer-cart-bg').forEach(function (b) { b.style.display = 'none'; });
      document.body.classList.remove('ess-overflow-hidden');
    },
    busy: function (on) {
      els('.ess-cart-drawer-js').forEach(function (d) { d.classList.toggle('ess-loading-cart', !!on); });
    }
  };

  /*
   * Refresh just the drawer markup. One small request instead of a full page.
   */
  function refreshDrawer() {
    var section = CONFIG.cartDrawerSection;
    return fetch('/?sections=' + encodeURIComponent(section), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var html = data[section];
        if (!html) return;
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var fresh = parsed.querySelector('.ess-cart-drawer-js');
        if (!fresh) return;
        els('.ess-cart-drawer-js').forEach(function (node) { node.innerHTML = fresh.innerHTML; });
      })
      .catch(function (err) {
        console.warn('[ess-cart] section render failed, falling back', err);
        // Fallback keeps the drawer correct even if section rendering is off.
        return fetch(window.location.href)
          .then(function (r) { return r.text(); })
          .then(function (text) {
            var parsed = new DOMParser().parseFromString(text, 'text/html');
            var fresh = parsed.querySelector('.ess-cart-drawer-js');
            if (!fresh) return;
            els('.ess-cart-drawer-js').forEach(function (node) { node.innerHTML = fresh.innerHTML; });
          });
      })
      .then(function () {
        drawer.busy(false);
        return updateCartCount();
      })
      .then(function () { return pruneOrphanedProtection(); });
  }

  /* -------------------------------------------------------------- cart count */

  function updateCartCount() {
    return getCart().then(function (cart) {
      var count = 0;
      (cart.items || []).forEach(function (item) {
        if (CONFIG.cartCountExcludesProtection && PROTECTION_ID && item.variant_id === PROTECTION_ID) return;
        count += item.quantity;
      });
      els('.ess-cart-count').forEach(function (node) {
        node.textContent = count;
        node.style.display = count > 0 ? '' : 'none';
      });
      document.dispatchEvent(new CustomEvent('ess:cart:updated', { detail: { cart: cart, count: count } }));
      return count;
    }).catch(function (err) { console.warn('[ess-cart] count failed', err); });
  }

  /*
   * If shipping protection is the ONLY thing left, remove that one line.
   * Deliberately narrower than the old behaviour, which cleared the cart.
   */
  function pruneOrphanedProtection() {
    if (!PROTECTION_ID) return Promise.resolve();
    return getCart().then(function (cart) {
      var items = cart.items || [];
      if (!items.length) return;
      var others = items.filter(function (i) { return i.variant_id !== PROTECTION_ID; });
      var protection = items.filter(function (i) { return i.variant_id === PROTECTION_ID; });
      if (protection.length && others.length === 0) {
        return postJSON('/cart/change.js', { id: protection[0].key, quantity: 0 })
          .then(function () { return refreshDrawer(); });
      }
    }).catch(function (err) { console.warn('[ess-cart] prune failed', err); });
  }

  /* ------------------------------------------------------------- add to cart */

  // Latest selection broadcast by ess-bundle.js, keyed by section id.
  var selections = {};
  document.addEventListener('ess:selection:change', function (e) {
    selections[e.detail.sectionId] = e.detail.selection;
    selections.__last = e.detail.selection;
  });

  function selectionFor(button) {
    var scope = button.closest('[data-section-id]') || button.closest('.shopify-section');
    var id = scope && (scope.dataset.sectionId || (scope.id || '').replace('shopify-section-', ''));
    return (id && selections[id]) || selections.__last || null;
  }

  /*
   * Resolve what to add. Order of preference:
   *   1. the live bundle selection (correct quantity + selling plan)
   *   2. explicit data-variant-id / data-quantity on the button
   */
  function itemsForButton(button) {
    var sel = selectionFor(button);
    if (sel && sel.items && sel.items.length) {
      return sel.items.map(function (i) { return Object.assign({}, i); });
    }

    var variantId = toId(button.dataset.variantId || button.getAttribute('variant_id'));
    if (!variantId) return [];

    var item = { id: variantId, quantity: toId(button.dataset.quantity) || 1 };
    var plan = toId(button.dataset.sellingPlan || button.getAttribute('selling_plan'));
    if (plan) item.selling_plan = plan;
    return [item];
  }

  function addToCart(button) {
    var items = itemsForButton(button);
    if (!items.length) {
      console.warn('[ess-cart] nothing to add: no selection and no data-variant-id');
      return Promise.resolve();
    }

    button.classList.add('ess-loading');
    button.setAttribute('aria-busy', 'true');
    drawer.busy(true);

    // Append any configured free gift / shipping protection, once.
    var extras = [];
    if (button.dataset.addGift === 'true' && GIFT_ID) extras.push({ id: GIFT_ID, quantity: 1 });

    var pre = PROTECTION_ID ? getCart() : Promise.resolve(null);

    return pre
      .then(function (cart) {
        if (PROTECTION_ID) {
          var present = cart && (cart.items || []).some(function (i) { return i.variant_id === PROTECTION_ID; });
          if (!present) extras.push({ id: PROTECTION_ID, quantity: 1 });
        }
        return postJSON('/cart/add.js', { items: items.concat(extras) });
      })
      .then(function () { return refreshDrawer(); })
      .then(function () { drawer.open(); })
      .catch(function (err) {
        console.error('[ess-cart] add failed', err);
        var msg = (err.data && err.data.description) || 'Could not add to cart.';
        els('[data-cart-error]').forEach(function (n) { n.textContent = msg; n.removeAttribute('hidden'); });
      })
      .then(function () {
        button.classList.remove('ess-loading');
        button.removeAttribute('aria-busy');
        drawer.busy(false);
      });
  }

  /* ------------------------------------------------------- line item changes */

  function changeLine(key, quantity) {
    drawer.busy(true);
    return postJSON('/cart/change.js', { id: key, quantity: quantity })
      .then(function () { return refreshDrawer(); })
      .catch(function (err) {
        console.error('[ess-cart] change failed', err);
        drawer.busy(false);
      });
  }

  /*
   * Swap a one-time line for its subscription equivalent ("upgrade" link).
   * Reads ids off the line item rather than from a hardcoded constant.
   */
  function upgradeToSubscription(trigger) {
    var line = document.querySelector('.ess-without-sub');
    if (!line) return Promise.resolve();

    var variantId = toId(line.dataset.variantId || line.getAttribute('variant_id'));
    var plan = toId(line.dataset.sellingPlan || line.getAttribute('selling_plan'));
    var quantity = toId(line.dataset.quantity || line.getAttribute('quantity')) || 1;
    var key = line.dataset.key || line.getAttribute('data-key');

    if (!variantId || !key) return Promise.resolve();

    drawer.busy(true);

    var add = [{ id: variantId, quantity: quantity }];
    if (plan) add[0].selling_plan = plan;

    var giftId = toId(trigger && trigger.dataset.giftVariantId) || GIFT_ID;
    if (giftId) add.push({ id: giftId, quantity: 1 });

    return postJSON('/cart/change.js', { id: key, quantity: 0 })
      .then(function () { return postJSON('/cart/add.js', { items: add }); })
      .then(function () { return refreshDrawer(); })
      .catch(function (err) {
        console.error('[ess-cart] upgrade failed', err);
        drawer.busy(false);
      });
  }

  /* --------------------------------------------------------------- delegation */

  document.addEventListener('click', function (e) {
    var t = e.target;

    var atc = t.closest('.ess-atc-js, .ess-checkout-button, [data-ess-atc]');
    if (atc) {
      e.preventDefault();
      if (!atc.classList.contains('ess-loading')) addToCart(atc);
      return;
    }

    if (t.closest('.ess-cart-button')) { drawer.open(); return; }

    if (t.closest('.ess-mobile-cart-close, .ess-drawer-cart-bg, a[href="#close_cart"]')) {
      e.preventDefault();
      drawer.close();
      return;
    }

    var step = t.closest('.ess-cart-drawer-js .ess-quantity-plus, .ess-cart-drawer-js .ess-quantity-minus');
    if (step) {
      var wrap = step.closest('.ess-line-item');
      var input = wrap && wrap.querySelector('.ess-quantity-input');
      if (!wrap || !input) return;
      var key = wrap.dataset.key;
      var qty = (parseInt(input.value, 10) || 1) + (step.classList.contains('ess-quantity-plus') ? 1 : -1);
      if (qty < 0) qty = 0;
      input.value = qty;
      changeLine(key, qty);
      return;
    }

    var fakeRemove = t.closest('.ess-remove-fake');
    if (fakeRemove) {
      var li = fakeRemove.closest('.ess-line-item');
      var minus = li && li.querySelector('.ess-quantity-minus');
      if (minus) minus.click();
      return;
    }

    var upgrade = t.closest('a[href="#upgrade"], [data-ess-upgrade]');
    if (upgrade) {
      e.preventDefault();
      upgradeToSubscription(upgrade);
      return;
    }
  });

  /* ------------------------------------------------------------------- boot */

  function boot() {
    updateCartCount();
    pruneOrphanedProtection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ESSCart = {
    refresh: refreshDrawer,
    count: updateCartCount,
    open: drawer.open,
    close: drawer.close,
    config: CONFIG
  };
})();
