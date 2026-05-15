/**
 * Story rail scrollytelling (About + Digital platform): tall host + sticky full-viewport panel.
 * Vertical document scroll maps to horizontal translate on the track.
 * Each root: .about-story-rail containing .about-story-rail-host, .about-story-rail-stage, .about-story-rail-track.
 */
(function () {
  try {
    var reduceMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function isReduced() {
      return reduceMq && reduceMq.matches;
    }

    function initStoryRail(root) {
      var host = root.querySelector(".about-story-rail-host");
      var stage = root.querySelector(".about-story-rail-stage");
      var track = root.querySelector(".about-story-rail-track");
      if (!host || !stage || !track) return;

      /** Extra px so rounding / scrollWidth quirks never clip the last card edge */
      var SAFETY_PX = 28;

      var cards = track.querySelectorAll(".about-story-card");
      var slides = cards.length;
      if (slides < 1) slides = 1;

      var lastFocusIndex = -1;

      function parseGapPx(el) {
        var g = window.getComputedStyle(el).gap;
        if (!g || g === "normal") return 0;
        return parseFloat(g.split(/\s+/)[0]) || 0;
      }

      function horizontalOverflowPx() {
        var w = stage.clientWidth;
        if (w <= 0) return 0;

        var fromScroll = Math.max(0, track.scrollWidth - w);

        var nodes = track.children;
        var n = nodes.length;
        var fromLayout = 0;
        if (n > 0) {
          var gap = parseGapPx(track);
          var sum = 0;
          for (var k = 0; k < n; k++) {
            sum += nodes[k].offsetWidth;
            if (k < n - 1) sum += gap;
          }
          fromLayout = Math.max(0, Math.ceil(sum) - w);
        }

        return Math.max(fromScroll, fromLayout) + SAFETY_PX;
      }

      function syncHostHeight() {
        if (isReduced()) {
          host.style.height = "";
          return;
        }
        var h = window.innerHeight || document.documentElement.clientHeight || 600;
        var w = stage.clientWidth;
        var ox = horizontalOverflowPx();
        if (w <= 0) {
          host.style.height = Math.ceil(h * slides) + "px";
          return;
        }
        host.style.height = Math.ceil(h + ox) + "px";
      }

      function pinDistance() {
        return Math.max(0, host.offsetHeight - window.innerHeight);
      }

      function getPinProgress() {
        var pd = pinDistance();
        if (pd <= 0) return 0;
        var rect = host.getBoundingClientRect();
        var scrolledIn = Math.min(Math.max(0, -rect.top), pd);
        return scrolledIn / pd;
      }

      function syncStoryCardMediaBorderRadius() {
        cards = track.querySelectorAll(".about-story-card");
        var n = cards.length || 1;
        var i;
        var media;

        if (isReduced()) {
          for (i = 0; i < cards.length; i++) {
            media = cards[i].querySelector(".about-story-card-media");
            if (media) media.style.removeProperty("border-radius");
          }
          return;
        }

        var t = getPinProgress();

        for (i = 0; i < cards.length; i++) {
          media = cards[i].querySelector(".about-story-card-media");
          if (!media) continue;
          var u = t * n - i;
          var r = 0;
          if (u >= 0 && u <= 1) {
            r = 12 * Math.sin(Math.PI * u);
          }
          media.style.borderRadius = Math.round(r * 100) / 100 + "px";
        }
      }

      function updateStoryCardFocus() {
        cards = track.querySelectorAll(".about-story-card");
        slides = cards.length || 1;

        if (isReduced()) {
          root.classList.add("about-story-rail--motion-reduced");
          root.classList.remove("is-story-rail-ready");
          for (var r = 0; r < cards.length; r++) {
            cards[r].classList.remove("is-story-focused");
          }
          lastFocusIndex = -1;
          syncStoryCardMediaBorderRadius();
          return;
        }

        root.classList.remove("about-story-rail--motion-reduced");

        var t = getPinProgress();
        var best = slides <= 1 ? 0 : Math.min(slides - 1, Math.floor(t * slides + 1e-9));

        if (best !== lastFocusIndex) {
          lastFocusIndex = best;
          for (var j = 0; j < cards.length; j++) {
            cards[j].classList.toggle("is-story-focused", j === best);
          }
        }

        root.classList.add("is-story-rail-ready");
        syncStoryCardMediaBorderRadius();
      }

      function onScrollOrResize() {
        if (isReduced()) {
          track.style.transform = "";
          updateStoryCardFocus();
          return;
        }

        var w = stage.clientWidth;
        if (w <= 0) {
          return;
        }

        var t = getPinProgress();

        var offsetMax = horizontalOverflowPx();
        var offsetPx = offsetMax > 0 ? Math.min(t * offsetMax, offsetMax) : 0;
        track.style.transform = "translate3d(" + -offsetPx + "px, 0, 0)";

        updateStoryCardFocus();
      }

      function remeasure() {
        syncHostHeight();
        onScrollOrResize();
      }

      function init() {
        if (isReduced()) {
          track.style.transform = "";
        }
        lastFocusIndex = -1;
        remeasure();
        requestAnimationFrame(function () {
          remeasure();
          requestAnimationFrame(remeasure);
        });
      }

      if (reduceMq && typeof reduceMq.addEventListener === "function") {
        reduceMq.addEventListener("change", init);
      } else if (reduceMq && typeof reduceMq.addListener === "function") {
        reduceMq.addListener(init);
      }

      window.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.addEventListener(
        "resize",
        function () {
          remeasure();
        },
        { passive: true }
      );

      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function () {
          remeasure();
        });
        ro.observe(stage);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        init();
      }
    }

    var roots = document.querySelectorAll(".about-story-rail");
    for (var i = 0; i < roots.length; i++) {
      initStoryRail(roots[i]);
    }
  } catch (e) {}
})();
