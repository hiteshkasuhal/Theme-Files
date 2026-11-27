/*
 * ess-pdp.js
 * ----------
 * General PDP interactions. Dependency-free.
 *
 * Rewritten from the jQuery version. What changed and why:
 *
 *  - jQuery and Slick are gone. They were ~115KB gzipped of blocking
 *    third-party JS loaded from two different CDNs, for an accordion, a
 *    scroll class, a video toggle and a slider. The slider is now CSS
 *    scroll-snap, which costs nothing and scrolls natively on touch.
 *
 *  - The scroll handler ran unthrottled on every scroll event and called
 *    jQuery's scrollTop(), forcing layout each time. It now runs inside
 *    requestAnimationFrame and only touches the DOM when the state flips.
 *
 *  - The FAQ used jQuery slideToggle(), which animates inline height and
 *    thrashes layout. It now toggles a class and animates with CSS grid-rows.
 *
 *  - Cart and add-to-cart logic moved to ess-cart.js, which also removed the
 *    hardcoded variant IDs this file used to carry.
 */
(function () {
  'use strict';

  function els(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* --------------------------------------------------------------- platform */

  document.body.classList.add(
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? 'mac-os' : 'window-os'
  );

  /* ----------------------------------------------------------------- scroll */

  (function stickyHeader() {
    var ticking = false;
    var isScrolled = false;

    function read() {
      var y = window.scrollY || window.pageYOffset;
      var next = y > 30;
      if (next !== isScrolled) {
        isScrolled = next;
        document.body.classList.toggle('remove_transparent', next);
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    }, { passive: true });

    read();
  })();

  /* -------------------------------------------------------------------- FAQ */

  document.addEventListener('click', function (e) {
    var q = e.target.closest('.ess-question');
    if (!q) return;

    var wasOpen = q.classList.contains('ess-active');

    // Accordion: close the rest.
    els('.ess-question.ess-active').forEach(function (other) {
      if (other === q) return;
      other.classList.remove('ess-active');
      other.setAttribute('aria-expanded', 'false');
      var panel = other.nextElementSibling;
      if (panel) panel.classList.remove('ess-open');
    });

    q.classList.toggle('ess-active', !wasOpen);
    q.setAttribute('aria-expanded', String(!wasOpen));
    var answer = q.nextElementSibling;
    if (answer) answer.classList.toggle('ess-open', !wasOpen);
  });

  /* ------------------------------------------------------------------ video */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ess-play-button');
    if (!btn) return;

    var wrapper = btn.closest('.ess-video-wrapper');
    var video = wrapper && wrapper.querySelector('video');
    if (!video) return;

    if (btn.classList.contains('ess-active')) {
      video.pause();
      btn.classList.remove('ess-active');
      wrapper.classList.remove('ess-active');
    } else {
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
      btn.classList.add('ess-active');
      wrapper.classList.add('ess-active');
    }
  });

  /* ------------------------------------------------------- anchor scrolling */

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"], a[href^="/#"]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (href === '#' || href === '#upgrade' || href === '#close_cart') return;

    var id = href.replace('/#', '').replace('#', '');
    // Support both #faq -> .ess-faq and a literal element id.
    var target = document.getElementById(id) || document.querySelector('.ess-' + id);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ------------------------------------------------------------ mobile menu */

  function setMenu(open) {
    els('.ess-drawer-menu').forEach(function (m) { m.classList.toggle('ess-active', open); });
    els('.ess-drawer-menu-bg').forEach(function (b) { b.style.display = open ? 'block' : 'none'; });
    document.body.classList.toggle('ess-overflow-hidden', open);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.ess-mobile-menu-button')) { setMenu(true); return; }
    if (e.target.closest('.ess-mobile-menu-close, .ess-drawer-menu-bg')) { setMenu(false); }
  });

  /* ---------------------------------------------------------------- sliders */

  /*
   * Scroll-snap slider that reads the EXISTING data-slider-config written for
   * Slick. This is deliberate: seven snippets already emit that markup
   * (product media, reviews, related products, video, scroll bar), so reading
   * the same config means none of them had to change.
   *
   * Supported from the old config: slidesToShow, slidesToScroll, vertical,
   * arrows + prevArrow/nextArrow selectors, dots, autoplay/autoplaySpeed,
   * asNavFor, focusOnSelect, responsive[breakpoint].settings, and "unslick".
   *
   * Dropped deliberately: infinite looping and cssEase. Native smooth
   * scrolling handles the easing, and infinite cloning was the single biggest
   * source of layout shift in the Slick build.
   */

  var MOBILE_BREAKPOINT = 915;

  function parseConfig(node) {
    var raw = node.getAttribute('data-slider-config');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[ess-pdp] bad slider config', err, node);
      return null;
    }
  }

  function responsiveSettings(config) {
    // Flatten the Slick responsive array down to one mobile override.
    var mobile = {};
    (config.responsive || []).forEach(function (r) {
      if (!r || r.breakpoint !== MOBILE_BREAKPOINT) return;
      if (r.settings === 'unslick') { mobile.unslick = true; return; }
      Object.assign(mobile, r.settings || {});
    });
    return mobile;
  }

  function initSliders(scope) {
    var nodes = els('.ess-slick-slider, [data-ess-slider]', scope);

    nodes.forEach(function (slider) {
      if (slider.dataset.essSliderBound === 'true') return;

      var config = parseConfig(slider) || {};
      if (config.settings === 'unslick') {
        slider.classList.add('ess-slider-static');
        slider.dataset.essSliderBound = 'true';
        return;
      }

      slider.dataset.essSliderBound = 'true';

      var mobile = responsiveSettings(config);
      var slidesDesktop = parseFloat(config.slidesToShow) || 1;
      var slidesMobile = parseFloat(mobile.slidesToShow) || slidesDesktop;
      var vertical = !!config.vertical;
      var verticalMobile = mobile.vertical === undefined ? vertical : !!mobile.vertical;

      slider.classList.add('ess-scroll-slider');
      slider.style.setProperty('--ess-slides', slidesDesktop);
      slider.style.setProperty('--ess-slides-mobile', slidesMobile);
      if (vertical) slider.classList.add('is-vertical');
      if (verticalMobile) slider.classList.add('is-vertical-mobile');

      var slides = els(':scope > *', slider);
      if (!slides.length) return;

      function isVertical() {
        return window.innerWidth <= MOBILE_BREAKPOINT ? verticalMobile : vertical;
      }

      function step() {
        var first = slides[0];
        if (!first) return 0;
        var rect = first.getBoundingClientRect();
        var style = getComputedStyle(slider);
        if (isVertical()) {
          return rect.height + (parseFloat(style.rowGap || style.gap) || 0);
        }
        return rect.width + (parseFloat(style.columnGap || style.gap) || 0);
      }

      function currentIndex() {
        var s = step();
        if (!s) return 0;
        return Math.round((isVertical() ? slider.scrollTop : slider.scrollLeft) / s);
      }

      function scrollToIndex(i, smooth) {
        var s = step();
        var max = slides.length - 1;
        var target = Math.max(0, Math.min(i, max));
        var opts = { behavior: smooth === false ? 'auto' : 'smooth' };
        if (isVertical()) { opts.top = target * s; } else { opts.left = target * s; }
        slider.scrollTo(opts);
      }

      var by = parseFloat(config.slidesToScroll) || 1;
      function go(dir) { scrollToIndex(currentIndex() + dir * by); }

      // ---- arrows. Slick took selectors; honour them, else look for ours.
      if (config.arrows !== false) {
        var prev = (config.prevArrow && document.querySelector(config.prevArrow)) ||
          slider.parentElement && slider.parentElement.querySelector('[data-slider-prev]');
        var next = (config.nextArrow && document.querySelector(config.nextArrow)) ||
          slider.parentElement && slider.parentElement.querySelector('[data-slider-next]');
        if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); go(-1); });
        if (next) next.addEventListener('click', function (e) { e.preventDefault(); go(1); });
      }

      // ---- dots
      var dots = [];
      if (config.dots) {
        var pages = Math.max(1, Math.ceil(slides.length - slidesDesktop + 1));
        var nav = document.createElement('div');
        nav.className = 'ess-slider-dots';
        for (var i = 0; i < pages; i++) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'ess-slider-dot';
          dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          (function (index) {
            dot.addEventListener('click', function () { scrollToIndex(index); });
          })(i);
          nav.appendChild(dot);
          dots.push(dot);
        }
        if (slider.parentElement) slider.parentElement.appendChild(nav);
      }

      // ---- asNavFor / focusOnSelect: keeps thumbs and main image in step.
      var partnerSelector = config.asNavFor;
      if (config.focusOnSelect !== false && partnerSelector) {
        slides.forEach(function (slide, index) {
          slide.addEventListener('click', function () {
            var partner = document.querySelector(partnerSelector);
            if (partner && partner.essScrollTo) partner.essScrollTo(index);
            slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
          });
        });
      }

      // Expose for the partner slider to drive this one.
      slider.essScrollTo = scrollToIndex;

      // ---- sync state on scroll
      var ticking = false;
      slider.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var index = currentIndex();
          dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });

          if (partnerSelector) {
            var partner = document.querySelector(partnerSelector);
            if (partner) {
              els(':scope > *', partner).forEach(function (s, i) {
                s.classList.toggle('is-active', i === index);
              });
            }
          }
          ticking = false;
        });
      }, { passive: true });

      if (dots[0]) dots[0].classList.add('is-active');
      if (slides[0]) slides[0].classList.add('is-active');

      // ---- autoplay, paused on hover and when off-screen
      if (config.autoplay) {
        var delay = parseInt(config.autoplaySpeed, 10) || 4000;
        var timer = null;
        function play() {
          stop();
          timer = setInterval(function () {
            var i = currentIndex();
            scrollToIndex(i + 1 >= slides.length ? 0 : i + 1);
          }, delay);
        }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }

        slider.addEventListener('mouseenter', stop);
        slider.addEventListener('mouseleave', play);

        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) { entry.isIntersecting ? play() : stop(); });
          }, { threshold: 0.2 }).observe(slider);
        } else {
          play();
        }
      }
    });
  }

  /* --------------------------------------------------- thumbnail -> main img */

  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-media-thumb]');
    if (!thumb) return;

    var wrap = thumb.closest('[data-product-media]');
    if (!wrap) return;

    var index = thumb.dataset.mediaThumb;
    els('[data-media-main]', wrap).forEach(function (main) {
      main.toggleAttribute('hidden', main.dataset.mediaMain !== index);
    });
    els('[data-media-thumb]', wrap).forEach(function (t) {
      t.classList.toggle('is-active', t === thumb);
    });
  });

  /* ------------------------------------------------------------------- boot */

  function boot() { initSliders(document); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) { initSliders(e.target); });

  window.ESSPdp = { initSliders: initSliders };
})();
