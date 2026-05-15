/**
 * Digital platform hero — scroll-pinned viewport; each step forward fades the next frame in as an overlay.
 */
(function () {
  try {
    var host = document.getElementById("platform-pin-host");
    if (!host) return;

    var slides = host.querySelectorAll(".platform-ui-slide");
    var steps = parseInt(host.getAttribute("data-platform-steps") || String(slides.length || 1), 10);
    if (!steps || steps < 1) steps = slides.length || 1;

    var reduceMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function isReduced() {
      return reduceMq && reduceMq.matches;
    }

    var settledIdx = 0;
    var animating = false;
    var animTo = -1;
    var animTimer = null;
    var animEndHandler = null;

    function clearAnimTimer() {
      if (animTimer) {
        clearTimeout(animTimer);
        animTimer = null;
      }
    }

    function stripOverlayState() {
      clearAnimTimer();
      if (animEndHandler) {
        slides.forEach(function (img) {
          img.removeEventListener("transitionend", animEndHandler);
        });
        animEndHandler = null;
      }
      slides.forEach(function (img) {
        img.classList.remove("is-beneath", "is-overlay", "is-overlay-visible", "is-active");
        img.setAttribute("aria-hidden", "true");
      });
    }

    function applyInstant(index) {
      stripOverlayState();
      settledIdx = index;
      animating = false;
      animTo = -1;
      slides[index].classList.add("is-active");
      slides[index].setAttribute("aria-hidden", "false");
    }

    function finishForwardOverlay(from, to) {
      if (!animating || animTo !== to) return;
      var fromEl = slides[from];
      var toEl = slides[to];
      fromEl.classList.remove("is-beneath");
      fromEl.setAttribute("aria-hidden", "true");
      toEl.classList.remove("is-overlay", "is-overlay-visible");
      toEl.classList.add("is-active");
      settledIdx = to;
      animating = false;
      animTo = -1;
      clearAnimTimer();
      if (animEndHandler) {
        toEl.removeEventListener("transitionend", animEndHandler);
        animEndHandler = null;
      }
    }

    function startForwardOverlay(from, to) {
      if (from === to || animating) return;

      var fromEl = slides[from];
      var toEl = slides[to];

      stripOverlayState();
      animating = true;
      animTo = to;
      settledIdx = from;

      fromEl.classList.remove("is-active");
      fromEl.classList.add("is-beneath");
      fromEl.setAttribute("aria-hidden", "false");

      toEl.classList.add("is-overlay");
      toEl.setAttribute("aria-hidden", "false");

      function onEnd(e) {
        if (e.target !== toEl || e.propertyName !== "opacity") return;
        finishForwardOverlay(from, to);
      }
      animEndHandler = onEnd;
      toEl.addEventListener("transitionend", onEnd, { once: true });

      animTimer = setTimeout(function () {
        if (animating && animTo === to) finishForwardOverlay(from, to);
      }, 600);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          toEl.classList.add("is-overlay-visible");
        });
      });
    }

    function syncToScrollTarget(targetIdx) {
      if (isReduced()) {
        host.classList.add("platform-pin-host--reduced");
        applyInstant(steps - 1);
        return;
      }

      host.classList.remove("platform-pin-host--reduced");

      var pinEnd = host.offsetHeight - window.innerHeight;
      if (pinEnd < 1) {
        applyInstant(0);
        return;
      }

      if (targetIdx === settledIdx && !animating) return;

      if (animating) {
        if (targetIdx === animTo) return;
        applyInstant(targetIdx);
        return;
      }

      if (targetIdx === settledIdx + 1) {
        startForwardOverlay(settledIdx, targetIdx);
        return;
      }

      if (targetIdx !== settledIdx) {
        applyInstant(targetIdx);
      }
    }

    function onScroll() {
      var pinEnd = host.offsetHeight - window.innerHeight;
      var targetIdx = 0;
      if (pinEnd >= 1) {
        var rect = host.getBoundingClientRect();
        var scrolled = Math.min(Math.max(0, -rect.top), pinEnd);
        var t = scrolled / pinEnd;
        targetIdx = Math.min(steps - 1, Math.floor(t * steps + 1e-9));
      }
      syncToScrollTarget(targetIdx);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    if (reduceMq && typeof reduceMq.addEventListener === "function") {
      reduceMq.addEventListener("change", onScroll);
    } else if (reduceMq && typeof reduceMq.addListener === "function") {
      reduceMq.addListener(onScroll);
    }

    onScroll();
  } catch (e) {}
})();
