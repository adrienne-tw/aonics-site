(function () {
  try {
    var sections = document.querySelectorAll(".home-team");
    if (!sections.length) return;

    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    sections.forEach(function (section) {
      if (!section.querySelector(".home-team-gradient")) return;

      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var restXRatio = 0.72;
      var restYRatio = 0.82;
      var tracking = false;
      var rafId = null;

      function sectionSize() {
        return section.getBoundingClientRect();
      }

      function setTarget(x, y) {
        targetX = x;
        targetY = y;
      }

      function applyPosition(x, y) {
        section.style.setProperty("--glow-x", x + "px");
        section.style.setProperty("--glow-y", y + "px");
      }

      function restPosition() {
        var rect = sectionSize();
        setTarget(rect.width * restXRatio, rect.height * restYRatio);
      }

      function tick() {
        if (reduce) {
          applyPosition(targetX, targetY);
          rafId = null;
          return;
        }

        var ease = tracking ? 0.11 : 0.06;
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        applyPosition(currentX, currentY);

        if (
          tracking ||
          Math.abs(targetX - currentX) > 0.4 ||
          Math.abs(targetY - currentY) > 0.4
        ) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      }

      function startLoop() {
        if (rafId == null) rafId = requestAnimationFrame(tick);
      }

      function onPointerMove(e) {
        var rect = sectionSize();
        setTarget(e.clientX - rect.left, e.clientY - rect.top);
        startLoop();
      }

      function onPointerEnter(e) {
        tracking = true;
        onPointerMove(e);
      }

      function onPointerLeave() {
        tracking = false;
      }

      restPosition();
      currentX = targetX;
      currentY = targetY;
      applyPosition(currentX, currentY);

      section.addEventListener("pointerenter", onPointerEnter);
      section.addEventListener("pointermove", onPointerMove);
      section.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("resize", function () {
        if (tracking) return;
        restPosition();
        currentX = targetX;
        currentY = targetY;
        applyPosition(currentX, currentY);
      });
    });
  } catch (e) {}
})();
