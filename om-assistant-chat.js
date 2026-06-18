/**
 * O&M Assistant demo — scroll-driven chat, carousel, and future maintenance slide.
 * Mobile (≤767px): discrete panel segments with reveal + hold per slide.
 */
(function () {
  try {
    var scrollHost = document.getElementById("om-assistant-scroll");
    if (!scrollHost) return;

    var carousel = document.getElementById("om-assistant-carousel");
    var steps = scrollHost.querySelectorAll("[data-chat-step]");
    var futureSlides = scrollHost.querySelectorAll(".future-visual-slide");
    var futureBullets = scrollHost.querySelectorAll(".future-copy-step");
    var dots = scrollHost.querySelectorAll("[data-carousel-dot]");
    if (!steps.length || !carousel) return;

    var chatSteps = steps.length;
    var panelCount = 3;
    var scrollAnchor = scrollHost.querySelector(".om-assistant-scroll-anchor");

    var mobileMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 767px)") : null;
    var reduceMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    var scrollModel = null;

    function isMobile() {
      return mobileMq && mobileMq.matches;
    }

    function isReduced() {
      return reduceMq && reduceMq.matches;
    }

    function numAttr(name, fallback) {
      var value = parseFloat(scrollHost.getAttribute(name) || String(fallback), 10);
      return isNaN(value) ? fallback : value;
    }

    function rebuildScrollModel() {
      if (isMobile()) {
        var panelVh = numAttr("data-mobile-panel-vh", 1.9);
        var exitHoldVh = numAttr("data-mobile-exit-hold-vh", 0.85);
        var revealRatio = numAttr("data-mobile-panel-reveal-ratio", 0.52);
        if (panelVh < 0.75) panelVh = 1.9;
        if (exitHoldVh < 0) exitHoldVh = 0.85;
        if (revealRatio <= 0.1 || revealRatio >= 0.9) revealRatio = 0.52;

        return {
          mobileMode: true,
          scrollVh: panelCount * panelVh + exitHoldVh,
          panelVh: panelVh,
          exitHoldVh: exitHoldVh,
          revealRatio: revealRatio,
        };
      }

      var carouselSteps = parseInt(scrollHost.getAttribute("data-carousel-steps") || "2", 10);
      var carouselHoldVh = parseFloat(scrollHost.getAttribute("data-carousel-hold-vh") || "0", 10);
      var futureSteps = parseFloat(scrollHost.getAttribute("data-future-steps") || "1.25", 10);
      var vhPerStep = parseFloat(scrollHost.getAttribute("data-vh-per-step") || "1.5", 10);
      var holdVh = parseFloat(scrollHost.getAttribute("data-hold-vh") || "3", 10);
      if (!carouselSteps || carouselSteps < 1) carouselSteps = panelCount - 1;
      if (!futureSteps || futureSteps < 1) futureSteps = 3;
      if (!vhPerStep || vhPerStep < 1) vhPerStep = 1;
      if (!holdVh || holdVh < 0) holdVh = 0;
      if (!carouselHoldVh || carouselHoldVh < 0) carouselHoldVh = 0;

      var carouselVh = carouselSteps * vhPerStep + carouselHoldVh;
      var contentVh = chatSteps * vhPerStep + carouselVh + futureSteps * vhPerStep;

      return {
        mobileMode: false,
        scrollVh: contentVh + holdVh,
        contentVh: contentVh,
        chatSteps: chatSteps,
        vhPerStep: vhPerStep,
        carouselVh: carouselVh,
        carouselHoldVh: carouselHoldVh,
        futureSteps: futureSteps,
        holdVh: holdVh,
      };
    }

    function syncHostHeight() {
      scrollModel = rebuildScrollModel();

      if (isReduced()) {
        scrollHost.style.height = "";
        scrollHost.classList.add("om-assistant-scroll--reduced");
        scrollHost.classList.remove("om-assistant-scroll--mobile");
        if (scrollAnchor) scrollAnchor.style.setProperty("--om-scroll-anchor-top", "0%");
        return;
      }

      scrollHost.classList.remove("om-assistant-scroll--reduced");
      scrollHost.classList.toggle("om-assistant-scroll--mobile", scrollModel.mobileMode);

      var h = window.innerHeight || document.documentElement.clientHeight || 600;
      scrollHost.style.height = Math.ceil(h * scrollModel.scrollVh) + "px";

      if (scrollAnchor && scrollModel.scrollVh > 0 && !scrollModel.mobileMode) {
        var futureStartPct =
          ((scrollModel.chatSteps * scrollModel.vhPerStep + scrollModel.carouselVh) / scrollModel.scrollVh) * 100;
        scrollAnchor.style.setProperty("--om-scroll-anchor-top", futureStartPct + "%");
      } else if (scrollAnchor && scrollModel.mobileMode) {
        var mobileFuturePct = ((scrollModel.panelVh * 2) / scrollModel.scrollVh) * 100;
        scrollAnchor.style.setProperty("--om-scroll-anchor-top", mobileFuturePct + "%");
      }
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function scrollProgress() {
      if (isReduced()) return 1;
      var range = scrollHost.offsetHeight - window.innerHeight;
      if (range < 1) return 0;
      var rect = scrollHost.getBoundingClientRect();
      return clamp(-rect.top / range, 0, 1);
    }

    function setTypedText(el, count) {
      var full = el.getAttribute("data-typed-text") || "";
      el.textContent = full.slice(0, count);
      return full.length;
    }

    function activePanelFromCarouselPosition(pos) {
      if (pos < 0.35) return 0;
      if (pos < 1.35) return 1;
      return 2;
    }

    function panelContentT(panelIndex) {
      if (!scrollModel || scrollModel.mobileMode) {
        var panelFraction = scrollModel.panelVh / scrollModel.scrollVh;
        return panelIndex * panelFraction + panelFraction * 0.3;
      }

      var contentVh = scrollModel.contentVh;
      var chatPortion = (scrollModel.chatSteps * scrollModel.vhPerStep) / contentVh;
      var carouselPortion = scrollModel.carouselVh / contentVh;
      var futurePortion = (scrollModel.futureSteps * scrollModel.vhPerStep) / contentVh;
      var carouselEnd = chatPortion + carouselPortion;

      if (panelIndex === 0) return chatPortion * 0.2;
      if (panelIndex === 1) {
        var transVh = scrollModel.vhPerStep;
        var trans1End = scrollModel.carouselVh > 0 ? transVh / scrollModel.carouselVh : 0;
        var holdEnd =
          scrollModel.carouselVh > 0 ? (transVh + scrollModel.carouselHoldVh) / scrollModel.carouselVh : 0.5;
        var carouselT = (trans1End + holdEnd) / 2;
        return chatPortion + carouselPortion * carouselT;
      }
      return carouselEnd + futurePortion * 0.35;
    }

    function updateDots(panelIndex) {
      dots.forEach(function (dot, index) {
        var on = index === panelIndex;
        dot.classList.toggle("is-active", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function applyPanelState(panelIndex) {
      if (panelIndex === 0) {
        applyChatProgress(0.35);
        carousel.style.setProperty("--carousel-position", "0");
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
        updateDots(0);
        return;
      }
      if (panelIndex === 1) {
        applyChatProgress(1);
        carousel.style.setProperty("--carousel-position", "1");
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
        updateDots(1);
        return;
      }
      applyChatProgress(1);
      carousel.style.setProperty("--carousel-position", "2");
      applyFutureProgress(0.35);
      updateDots(2);
    }

    function scrollToPanel(panelIndex) {
      if (isReduced()) {
        applyPanelState(panelIndex);
        return;
      }

      var range = scrollHost.offsetHeight - window.innerHeight;
      if (range < 1) {
        applyPanelState(panelIndex);
        return;
      }

      var targetT;
      if (scrollModel.mobileMode) {
        var panelFraction = scrollModel.panelVh / scrollModel.scrollVh;
        targetT = panelIndex * panelFraction + panelFraction * 0.28;
      } else {
        var contentEnd = scrollModel.contentVh / scrollModel.scrollVh;
        targetT = panelContentT(panelIndex) * contentEnd;
      }

      var top = scrollHost.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + targetT * range, behavior: "smooth" });
    }

    function setFutureSlideIndex(index) {
      futureSlides.forEach(function (el, j) {
        var on = j === index;
        el.classList.toggle("is-active", on);
        el.setAttribute("aria-hidden", on ? "false" : "true");
      });
    }

    function setFutureBulletHighlight(activeIndex) {
      futureBullets.forEach(function (li, j) {
        li.classList.add("is-visible");
        li.classList.toggle("is-highlighted", j === activeIndex);
      });
    }

    function applyReducedState() {
      steps.forEach(function (step) {
        step.classList.add("is-active", "is-complete");
        step.querySelectorAll("[data-typed-text]").forEach(function (el) {
          setTypedText(el, (el.getAttribute("data-typed-text") || "").length);
        });
        var bar = step.querySelector(".om-chat-tool-progress span");
        if (bar) bar.style.width = "100%";
      });
      carousel.style.setProperty("--carousel-position", String(panelCount - 1));
      setFutureSlideIndex(0);
      setFutureBulletHighlight(0);
      updateDots(2);
    }

    function applyChatProgress(chatT) {
      var stepCount = steps.length;

      steps.forEach(function (step, index) {
        var stepStart = index / stepCount;
        var stepEnd = (index + 1) / stepCount;
        var stepT = (chatT - stepStart) / (stepEnd - stepStart);
        stepT = clamp(stepT, 0, 1);

        var active = chatT >= stepStart - 0.001;
        step.classList.toggle("is-active", active);
        step.classList.toggle("is-complete", stepT >= 1);

        var typing = false;
        var typedEls = step.querySelectorAll("[data-typed-text]");
        var totalChars = 0;
        typedEls.forEach(function (el) {
          totalChars += (el.getAttribute("data-typed-text") || "").length;
        });
        var typedBudget = Math.floor(stepT * totalChars);
        var remaining = typedBudget;

        if (active && index === 0) {
          typedEls.forEach(function (el) {
            setTypedText(el, (el.getAttribute("data-typed-text") || "").length);
          });
        } else {
          typedEls.forEach(function (el, elIndex) {
            var full = el.getAttribute("data-typed-text") || "";
            var count = 0;
            if (active) {
              count = Math.min(full.length, Math.max(0, remaining));
              remaining -= count;
            }
            setTypedText(el, count);
            if (active && count > 0 && count < full.length) typing = true;
            if (active && count === full.length && elIndex < typedEls.length - 1 && remaining > 0) {
              typing = true;
            }
          });
        }

        step.classList.toggle("is-typing", typing);

        var bar = step.querySelector(".om-chat-tool-progress span");
        if (bar) bar.style.width = active ? stepT * 100 + "%" : "0%";
      });
    }

    function carouselPositionFromT(carouselT) {
      if (!scrollModel || scrollModel.mobileMode) return carouselT * (panelCount - 1);

      if (scrollModel.carouselHoldVh <= 0 || scrollModel.carouselVh <= 0) {
        return carouselT * (panelCount - 1);
      }

      var transVh = scrollModel.vhPerStep;
      var trans1End = transVh / scrollModel.carouselVh;
      var holdEnd = (transVh + scrollModel.carouselHoldVh) / scrollModel.carouselVh;

      if (carouselT <= trans1End) {
        return trans1End > 0 ? carouselT / trans1End : 1;
      }
      if (carouselT <= holdEnd) return 1;

      var t2 = holdEnd < 1 ? (carouselT - holdEnd) / (1 - holdEnd) : 1;
      return 1 + t2;
    }

    function applyFutureProgress(futureT) {
      var idx = 0;
      if (futureT >= 2 / 3) idx = 2;
      else if (futureT >= 1 / 3) idx = 1;
      setFutureSlideIndex(idx);
      setFutureBulletHighlight(idx);
    }

    function onScrollMobile(t) {
      var panelFraction = scrollModel.panelVh / scrollModel.scrollVh;
      var panelIndex = Math.min(panelCount - 1, Math.floor(t / panelFraction));
      var localT = panelFraction > 0 ? (t - panelIndex * panelFraction) / panelFraction : 0;
      localT = clamp(localT, 0, 1);

      var revealEnd = scrollModel.revealRatio;
      var revealT = clamp(localT / revealEnd, 0, 1);

      if (panelIndex === 0) {
        applyChatProgress(revealT);
        carousel.style.setProperty("--carousel-position", "0");
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
        updateDots(0);
        return;
      }

      if (panelIndex === 1) {
        applyChatProgress(1);
        carousel.style.setProperty(
          "--carousel-position",
          String(localT < revealEnd ? revealT : 1)
        );
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
        updateDots(1);
        return;
      }

      applyChatProgress(1);
      if (localT < revealEnd) {
        carousel.style.setProperty("--carousel-position", String(1 + revealT));
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
      } else {
        carousel.style.setProperty("--carousel-position", "2");
        var futureT = (localT - revealEnd) / (1 - revealEnd);
        applyFutureProgress(clamp(futureT, 0, 1));
      }
      updateDots(2);
    }

    function onScrollDesktop(t) {
      var contentEnd = scrollModel.contentVh / scrollModel.scrollVh;
      var contentT = contentEnd > 0 ? clamp(t / contentEnd, 0, 1) : 0;
      var chatPortion = (scrollModel.chatSteps * scrollModel.vhPerStep) / scrollModel.contentVh;
      var carouselPortion = scrollModel.carouselVh / scrollModel.contentVh;
      var futurePortion = (scrollModel.futureSteps * scrollModel.vhPerStep) / scrollModel.contentVh;
      var carouselEnd = chatPortion + carouselPortion;

      var chatT = clamp(contentT / chatPortion, 0, 1);
      var carouselT = contentT <= chatPortion ? 0 : clamp((contentT - chatPortion) / carouselPortion, 0, 1);
      var futureT = contentT <= carouselEnd ? 0 : clamp((contentT - carouselEnd) / futurePortion, 0, 1);
      var carouselPosition = carouselPositionFromT(carouselT);

      applyChatProgress(chatT);
      carousel.style.setProperty("--carousel-position", String(carouselPosition));

      if (futureT > 0) {
        applyFutureProgress(futureT);
      } else if (contentT < carouselEnd) {
        setFutureSlideIndex(0);
        setFutureBulletHighlight(0);
      }

      updateDots(activePanelFromCarouselPosition(carouselPosition));
    }

    function onScroll() {
      if (!scrollModel) scrollModel = rebuildScrollModel();

      if (isReduced()) {
        applyReducedState();
        return;
      }

      var t = scrollProgress();
      if (scrollModel.mobileMode) onScrollMobile(t);
      else onScrollDesktop(t);
    }

    function onLayoutChange() {
      syncHostHeight();
      onScroll();
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var panelIndex = parseInt(dot.getAttribute("data-carousel-dot") || "0", 10);
        if (panelIndex < 0 || panelIndex > panelCount - 1) return;
        scrollToPanel(panelIndex);
      });
    });

    syncHostHeight();
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayoutChange, { passive: true });

    if (mobileMq && typeof mobileMq.addEventListener === "function") {
      mobileMq.addEventListener("change", onLayoutChange);
    } else if (mobileMq && typeof mobileMq.addListener === "function") {
      mobileMq.addListener(onLayoutChange);
    }

    if (reduceMq && typeof reduceMq.addEventListener === "function") {
      reduceMq.addEventListener("change", onLayoutChange);
    } else if (reduceMq && typeof reduceMq.addListener === "function") {
      reduceMq.addListener(onLayoutChange);
    }
  } catch (e) {}
})();
