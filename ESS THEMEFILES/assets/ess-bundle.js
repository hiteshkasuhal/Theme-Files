/*
 * ess-bundle.js
 * -------------
 * Controller for the universal bundle / quantity-break selector.
 *
 * Dependency-free (no jQuery). Idempotent: safe to run again after a
 * shopify:section:load in the theme editor.
 *
 * Fixes the two cart bugs in the previous build:
 *   1. add-to-cart always sent quantity: 1, so the selected tier never
 *      reached the cart. Quantity now comes from the selected tier.
 *   2. selling_plan was never sent on the main ATC path, so the subscription
 *      toggle changed the displayed price but bought a one-time item.
 *
 * Store-specific variant IDs are read from data attributes rendered by
 * Liquid from section settings. Nothing is hardcoded here.
 */
(function () {
  'use strict';

  var MONEY_FORMAT = (window.ESS_MONEY_FORMAT || '${{amount}}');

  /* ------------------------------------------------------------------ utils */

  function formatMoney(cents) {
    if (typeof cents !== 'number' || isNaN(cents)) return '';
    var value = (cents / 100).toFixed(2);
    // Match Shopify's common placeholders. Falls back to a plain number.
    return MONEY_FORMAT
      .replace(/\{\{\s*amount\s*\}\}/g, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(cents / 100))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value.replace('.', ','))
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, Math.round(cents / 100));
  }

  function el(root, sel) { return root.querySelector(sel); }
  function els(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  /* ------------------------------------------------------- the options block */

  function OptionsBlock(root) {
    if (root.dataset.essBound === 'true') return;
    root.dataset.essBound = 'true';

    this.root = root;
    this.tiers = els(root, '.ess-bundle-tier');
    this.toggleOptions = els(root, '[data-purchase-option]');
    this.frequencyWrap = el(root, '[data-frequency-wrap]');
    this.frequencySelect = el(root, '[data-frequency-select]');
    this.qtyInput = el(root, '[data-qty-input]');

    this.mode = root.dataset.purchaseMode || 'onetime';

    this.bind();
    this.applyMode(this.mode, true);
    this.publish();
  }

  OptionsBlock.prototype.bind = function () {
    var self = this;

    // ---- tier selection
    this.tiers.forEach(function (tier) {
      tier.addEventListener('click', function (e) {
        // Let the per-item dropdowns work without hijacking the click.
        if (e.target.closest('[data-item-select]')) return;
        if (tier.hasAttribute('disabled')) return;
        self.selectTier(tier);
      });
    });

    // ---- per-item pickers just need to re-publish the payload
    els(this.root, '[data-item-select]').forEach(function (sel) {
      sel.addEventListener('change', function () { self.publish(); });
    });

    // ---- purchase type toggle
    this.toggleOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        self.applyMode(opt.dataset.purchaseOption);
      });
    });

    // ---- frequency
    if (this.frequencySelect) {
      this.frequencySelect.addEventListener('change', function () { self.publish(); });
    }

    // ---- quantity stepper
    var minus = el(this.root, '[data-qty-minus]');
    var plus = el(this.root, '[data-qty-plus]');
    if (minus) minus.addEventListener('click', function () { self.stepQty(-1); });
    if (plus) plus.addEventListener('click', function () { self.stepQty(1); });
    if (this.qtyInput) {
      this.qtyInput.addEventListener('change', function () { self.stepQty(0); });
      this.qtyInput.addEventListener('input', function () { self.publish(); });
    }
  };

  OptionsBlock.prototype.stepQty = function (delta) {
    if (!this.qtyInput) return;
    var min = parseInt(this.qtyInput.min, 10) || 1;
    var max = parseInt(this.qtyInput.max, 10) || 99;
    var next = (parseInt(this.qtyInput.value, 10) || min) + delta;
    if (next < min) next = min;
    if (next > max) next = max;
    this.qtyInput.value = next;
    this.publish();
  };

  OptionsBlock.prototype.selectTier = function (tier) {
    this.tiers.forEach(function (t) {
      t.classList.remove('is-selected');
      t.setAttribute('aria-checked', 'false');
    });
    tier.classList.add('is-selected');
    tier.setAttribute('aria-checked', 'true');
    this.publish();
  };

  OptionsBlock.prototype.selectedTier = function () {
    return el(this.root, '.ess-bundle-tier.is-selected') || this.tiers[0] || null;
  };

  /*
   * Switch between one-time and subscription pricing. Every price on the card
   * is rendered twice by Liquid (one span per mode) and we flip visibility,
   * so the numbers always come from Shopify rather than client-side maths.
   */
  OptionsBlock.prototype.applyMode = function (mode, silent) {
    if (!mode) return;
    this.mode = mode;
    this.root.dataset.purchaseMode = mode;

    this.toggleOptions.forEach(function (opt) {
      var on = opt.dataset.purchaseOption === mode;
      opt.classList.toggle('is-selected', on);
      opt.setAttribute('aria-checked', on ? 'true' : 'false');
    });

    els(this.root, '.ess-price-mode').forEach(function (span) {
      var on = span.dataset.priceMode === mode;
      if (on) { span.removeAttribute('hidden'); } else { span.setAttribute('hidden', ''); }
    });

    if (this.frequencyWrap) {
      if (mode === 'subscription') {
        this.frequencyWrap.removeAttribute('hidden');
      } else {
        this.frequencyWrap.setAttribute('hidden', '');
      }
    }

    if (!silent) this.publish();
  };

  /*
   * Build the cart payload for the current selection and broadcast it.
   * The add-to-cart button listens for this instead of reading the DOM itself.
   */
  OptionsBlock.prototype.payload = function () {
    var tier = this.selectedTier();
    if (!tier) return null;

    var d = tier.dataset;
    var quantity = parseInt(d.quantity, 10) || 1;

    // A standalone stepper multiplies the tier.
    if (this.qtyInput) {
      quantity = quantity * (parseInt(this.qtyInput.value, 10) || 1);
    }

    var items = [];
    var pickers = els(tier, '[data-item-select]');

    if (pickers.length) {
      // Each picked item becomes its own cart line, merged by variant id.
      var counts = {};
      pickers.forEach(function (sel) {
        var id = sel.value;
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
      Object.keys(counts).forEach(function (id) {
        items.push({ id: parseInt(id, 10), quantity: counts[id] });
      });
    } else {
      items.push({ id: parseInt(d.variantId, 10), quantity: quantity });
    }

    // Attach the selling plan when buying a subscription.
    if (this.mode === 'subscription') {
      var plan = d.sellingPlan;
      if (this.frequencySelect && this.frequencySelect.value) {
        plan = this.frequencySelect.value;
      }
      if (plan) {
        items.forEach(function (it) { it.selling_plan = parseInt(plan, 10); });
      }
    }

    return {
      items: items,
      mode: this.mode,
      tier: d.tier,
      price: parseInt(this.mode === 'subscription' ? d.priceSubscription : d.priceOnetime, 10),
      comparePrice: parseInt(d.comparePrice, 10)
    };
  };

  OptionsBlock.prototype.publish = function () {
    var data = this.payload();
    if (!data) return;

    this.root.dataset.essPayload = JSON.stringify(data.items);

    document.dispatchEvent(new CustomEvent('ess:selection:change', {
      detail: { sectionId: this.root.dataset.sectionId, selection: data, source: this.root }
    }));
  };

  /* ------------------------------------------------------------- price sync */

  /*
   * Keep any [data-ess-price] readout (the checkout button label, a sticky
   * bar) in step with the chosen tier. Prices come from the tier's data
   * attributes, which Liquid rendered from real variant data.
   */
  document.addEventListener('ess:selection:change', function (e) {
    var sel = e.detail.selection;
    if (!sel) return;

    els(document, '[data-ess-price]').forEach(function (wrap) {
      var current = wrap.querySelector('[data-ess-price-current]');
      var compare = wrap.querySelector('[data-ess-price-compare]');

      if (current && !isNaN(sel.price)) current.textContent = formatMoney(sel.price);

      if (compare) {
        if (!isNaN(sel.comparePrice) && sel.comparePrice > sel.price) {
          compare.textContent = formatMoney(sel.comparePrice);
          compare.removeAttribute('hidden');
        } else {
          compare.setAttribute('hidden', '');
        }
      }
    });

    // Mirror the selection onto the buttons as a no-JS-selection fallback.
    els(document, '[data-ess-atc]').forEach(function (btn) {
      var first = sel.items && sel.items[0];
      if (!first) return;
      btn.dataset.variantId = first.id;
      btn.dataset.quantity = first.quantity;
      if (first.selling_plan) {
        btn.dataset.sellingPlan = first.selling_plan;
      } else {
        delete btn.dataset.sellingPlan;
      }
    });
  });

  /* --------------------------------------------------------------- bootstrap */

  function init(scope) {
    els(scope || document, '[data-ess-options]').forEach(function (root) {
      new OptionsBlock(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // Theme editor: re-bind when a section is re-rendered.
  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });

  window.ESSBundle = { init: init, formatMoney: formatMoney };
})();
