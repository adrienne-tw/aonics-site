/**
 * Premium scroll behavior for .site-header (static site / file://).
 * Glassmorphism on scroll, compress, hide-on-scroll-down / show-on-scroll-up.
 */
(function () {
  try {
    var header = document.querySelector(".site-header");
    if (!header) return;

    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var isDigitalPlatform =
      document.body && document.body.classList.contains("page-digital-platform");
    var lastY = window.scrollY || 0;
    var hidden = false;
    var ticking = false;

    var BLEND_END = 140;
    var HIDE_AFTER = 72;
    var DELTA = 6;

    function apply() {
      var y = window.scrollY || 0;
      var blend = reduce ? Math.min(1, y / BLEND_END) : Math.min(1, Math.max(0, y / BLEND_END));

      if (reduce) {
        header.classList.remove("is-scrolled", "is-elevated", "is-header-hidden");
        document.documentElement.style.setProperty("--site-header-h", "4.25rem");
      } else {
        header.classList.toggle("is-scrolled", y > 12);
        header.classList.toggle("is-elevated", y > 48);
        var dy = y - lastY;
        if (y < HIDE_AFTER) hidden = false;
        else if (dy > DELTA) hidden = true;
        else if (dy < -DELTA) hidden = false;
        header.classList.toggle("is-header-hidden", hidden);
        if (!isDigitalPlatform) {
          var h = blend > 0.35 ? "3.35rem" : "4.25rem";
          document.documentElement.style.setProperty("--site-header-h", h);
        } else {
          document.documentElement.style.setProperty("--site-header-h", "4.25rem");
        }
      }

      lastY = y;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        apply();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    apply();
  } catch (e) {}
})();
