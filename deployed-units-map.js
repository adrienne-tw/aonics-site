/**
 * Hardware page — "Deployed units": pinned scroll distance + grid cells revealed by scroll progress.
 * `data-deployed-steps`: viewport-heights of pin host height (smaller = less scrolling to reveal all cells).
 */
(function () {
  try {
    var host = document.getElementById("deployed-units-host");
    if (!host) return;

    var markers = host.querySelectorAll(".deployed-units-cell");
    var count = markers.length;
    if (count < 1) return;

    var scrollVh = parseInt(host.getAttribute("data-deployed-steps") || "6", 10);
    if (!scrollVh || scrollVh < 2) scrollVh = 6;

    var reduceMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function isReduced() {
      return reduceMq && reduceMq.matches;
    }

    function syncHostHeight() {
      if (isReduced()) {
        host.style.height = "";
        host.classList.add("deployed-units-host--reduced");
        return;
      }
      host.classList.remove("deployed-units-host--reduced");
      var h = window.innerHeight || document.documentElement.clientHeight || 600;
      host.style.height = Math.ceil(h * scrollVh) + "px";
    }

    function pinDistance() {
      return Math.max(0, host.offsetHeight - window.innerHeight);
    }

    function visibleFromScroll() {
      if (isReduced()) return count;
      var pd = pinDistance();
      if (pd < 1) return 0;
      var rect = host.getBoundingClientRect();
      var scrolled = Math.min(Math.max(0, -rect.top), pd);
      var t = scrolled / pd;
      if (t <= 0) return 0;
      return Math.min(count, Math.ceil(t * count - 1e-12));
    }

    function syncMarkers() {
      var n = visibleFromScroll();
      for (var i = 0; i < markers.length; i++) {
        var on = i < n;
        markers[i].classList.toggle("is-visible", on);
        markers[i].setAttribute("aria-hidden", on ? "false" : "true");
      }
    }

    function onScrollOrResize() {
      syncHostHeight();
      syncMarkers();
    }

    if (reduceMq && typeof reduceMq.addEventListener === "function") {
      reduceMq.addEventListener("change", onScrollOrResize);
    } else if (reduceMq && typeof reduceMq.addListener === "function") {
      reduceMq.addListener(onScrollOrResize);
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onScrollOrResize);
    } else {
      onScrollOrResize();
    }

    requestAnimationFrame(function () {
      onScrollOrResize();
      requestAnimationFrame(onScrollOrResize);
    });
  } catch (e) {}
})();
