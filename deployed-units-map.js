/**
 * "Deployed units": pinned scroll distance + map pins revealed by scroll progress.
 * `data-deployed-steps`: viewport-heights for pin reveal (desktop).
 * `data-deployed-hold-vh`: extra viewport-heights to hold all pins visible before exit (desktop).
 * `data-deployed-scroll-mobile` / `data-deployed-hold-mobile`: same units on mobile.
 */
(function () {
  try {
    var host = document.getElementById("deployed-units-host");
    if (!host) return;

    var markers = host.querySelectorAll(".deployed-units-pin");
    var count = markers.length;
    if (count < 1) return;

    var scrollVh = parseFloat(host.getAttribute("data-deployed-steps") || "5", 10);
    var holdVh = parseFloat(host.getAttribute("data-deployed-hold-vh") || "1", 10);
    var scrollVhMobile = parseFloat(host.getAttribute("data-deployed-scroll-mobile") || "0.7", 10);
    var holdVhMobile = parseFloat(host.getAttribute("data-deployed-hold-mobile") || "0.6", 10);
    if (!scrollVh || scrollVh < 1) scrollVh = 3;
    if (!holdVh || holdVh < 0) holdVh = 1;
    if (!scrollVhMobile || scrollVhMobile < 0.2) scrollVhMobile = 0.7;
    if (!holdVhMobile || holdVhMobile < 0) holdVhMobile = 0.6;

    var mobileMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 900px)") : null;

    function revealVh() {
      if (mobileMq && mobileMq.matches) return scrollVhMobile;
      return scrollVh;
    }

    function holdVhForLayout() {
      if (mobileMq && mobileMq.matches) return holdVhMobile;
      return holdVh;
    }

    var defaultLabelOrder = ["bottom", "top"];
    var horizontalShifts = [0];
    var shiftStep = 14;
    var shiftMax = 160;

    for (var step = shiftStep; step <= shiftMax; step += shiftStep) {
      horizontalShifts.push(-step, step);
    }

    var reduceMq =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    var layoutQueued = false;

    function isReduced() {
      return reduceMq && reduceMq.matches;
    }

    function isMobileLayout() {
      return mobileMq && mobileMq.matches;
    }

    function ensureMobileLabelGrid() {
      var stage = host.querySelector(".deployed-units-map-stage");
      if (!stage) return null;

      var grid = stage.querySelector(".deployed-units-label-grid");
      if (!grid) {
        grid = document.createElement("ul");
        grid.className = "deployed-units-label-grid";
        grid.setAttribute("role", "list");
        grid.setAttribute("aria-label", "Deployment locations");
        stage.appendChild(grid);
      }

      if (grid.children.length !== markers.length) {
        grid.textContent = "";
        for (var i = 0; i < markers.length; i++) {
          var pin = markers[i];
          var labelEl = pin.querySelector(".deployed-units-pin-label");
          var chip = document.createElement("li");
          chip.className = "deployed-units-label-chip";
          chip.setAttribute("data-pin-index", String(i));
          chip.setAttribute("aria-hidden", "true");
          chip.textContent = labelEl ? labelEl.textContent : "";
          grid.appendChild(chip);
        }
      }

      return grid;
    }

    var labelGrid = null;
    var labelChips = [];

    function refreshLabelGridRefs() {
      labelGrid = ensureMobileLabelGrid();
      labelChips = labelGrid ? labelGrid.querySelectorAll(".deployed-units-label-chip") : [];
    }

    function syncHostHeight() {
      if (isReduced()) {
        host.style.height = "";
        host.classList.add("deployed-units-host--reduced");
        host.classList.remove("deployed-units-host--mobile");
        return;
      }
      host.classList.remove("deployed-units-host--reduced");
      host.classList.toggle("deployed-units-host--mobile", isMobileLayout());
      var h = window.innerHeight || document.documentElement.clientHeight || 600;

      if (isMobileLayout()) {
        var sticky = host.querySelector(".deployed-units-sticky");
        var stickyH = sticky ? sticky.offsetHeight : 0;
        var runway = h * (revealVh() + holdVhForLayout());
        var total = Math.ceil(stickyH + runway);
        host.style.height = Math.max(total, Math.ceil(h + runway * 0.85)) + "px";
        return;
      }

      host.style.height = Math.ceil(h * (revealVh() + holdVhForLayout())) + "px";
    }

    function revealProgress(t) {
      var reveal = revealVh();
      var hold = holdVhForLayout();
      var total = reveal + hold;
      if (total <= 0) return Math.min(Math.max(t, 0), 1);
      var revealPortion = reveal / total;
      if (t <= 0) return 0;
      return Math.min(t / revealPortion, 1);
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
      var revealT = revealProgress(t);
      return Math.min(count, Math.ceil(revealT * count - 1e-12));
    }

    function rectsOverlap(a, b, padding) {
      var gap = padding || 8;
      return !(
        a.right + gap < b.left ||
        a.left - gap > b.right ||
        a.bottom + gap < b.top ||
        a.top - gap > b.bottom
      );
    }

    function pinCoord(pin, axis) {
      var raw = pin.style.getPropertyValue(axis === "x" ? "--pin-x" : "--pin-y");
      return parseFloat(raw) || 0;
    }

    function labelOrderFor(pin) {
      var custom = pin.getAttribute("data-label-order");
      var order = custom
        ? custom.split(",").map(function (part) {
            return part.trim();
          })
        : defaultLabelOrder.slice();

      order = order.filter(function (value) {
        return value === "top" || value === "bottom";
      });

      return order.length ? order : defaultLabelOrder.slice();
    }

    function applyLabelLayout(label, vertical, shiftX) {
      label.setAttribute("data-label-offset", vertical);
      label.style.setProperty("--label-shift-x", shiftX + "px");
    }

    function computeAllLabelLayouts() {
      if (isMobileLayout()) return;

      var allPins = [];
      var placed = [];

      for (var i = 0; i < markers.length; i++) {
        var pin = markers[i];
        var label = pin.querySelector(".deployed-units-pin-label");
        if (!label) continue;
        allPins.push({ pin: pin, label: label, order: labelOrderFor(pin) });
      }

      allPins.sort(function (a, b) {
        var ay = pinCoord(a.pin, "y");
        var by = pinCoord(b.pin, "y");
        if (Math.abs(ay - by) < 1.5) return pinCoord(a.pin, "x") - pinCoord(b.pin, "x");
        return ay - by;
      });

      var rowBandCounts = {};

      allPins.forEach(function (entry) {
        var pinY = pinCoord(entry.pin, "y");
        var bandKey = Math.round(pinY / 1.5);
        var bandIndex = rowBandCounts[bandKey] || 0;
        rowBandCounts[bandKey] = bandIndex + 1;
        var alternate = bandIndex % 2 === 0 ? "bottom" : "top";

        if (entry.order.indexOf(alternate) !== -1) {
          entry.order = [alternate].concat(
            entry.order.filter(function (value) {
              return value !== alternate;
            })
          );
        }
      });

      host.classList.add("deployed-units-host--measure");

      allPins.forEach(function (entry) {
        var label = entry.label;
        var verticals = entry.order.slice();
        var fallbackVerticals = ["bottom", "top"];

        fallbackVerticals.forEach(function (value) {
          if (verticals.indexOf(value) === -1) verticals.push(value);
        });

        var chosenVertical = verticals[0];
        var chosenShift = 0;
        var labelRect;
        var found = false;

        for (var si = 0; si < horizontalShifts.length && !found; si++) {
          for (var vi = 0; vi < verticals.length; vi++) {
            applyLabelLayout(label, verticals[vi], horizontalShifts[si]);
            labelRect = label.getBoundingClientRect();
            var clashes = false;

            for (var k = 0; k < placed.length; k++) {
              if (rectsOverlap(labelRect, placed[k])) {
                clashes = true;
                break;
              }
            }

            if (!clashes) {
              chosenVertical = verticals[vi];
              chosenShift = horizontalShifts[si];
              found = true;
              break;
            }
          }
        }

        applyLabelLayout(label, chosenVertical, chosenShift);
        placed.push(label.getBoundingClientRect());
      });

      host.classList.remove("deployed-units-host--measure");
    }

    function syncMarkers() {
      var n = visibleFromScroll();
      for (var i = 0; i < markers.length; i++) {
        var on = i < n;
        markers[i].classList.toggle("is-visible", on);
        markers[i].setAttribute("aria-hidden", on ? "false" : "true");
        if (labelChips[i]) {
          labelChips[i].classList.toggle("is-visible", on);
          labelChips[i].setAttribute("aria-hidden", on ? "false" : "true");
        }
      }
    }

    function onScroll() {
      syncMarkers();
    }

    function onResizeOrInit() {
      refreshLabelGridRefs();
      syncHostHeight();
      computeAllLabelLayouts();
      syncMarkers();
    }

    function onResize() {
      if (layoutQueued) return;
      layoutQueued = true;
      requestAnimationFrame(function () {
        layoutQueued = false;
        refreshLabelGridRefs();
        syncHostHeight();
        computeAllLabelLayouts();
        syncMarkers();
      });
    }

    if (mobileMq && typeof mobileMq.addEventListener === "function") {
      mobileMq.addEventListener("change", onResizeOrInit);
    } else if (mobileMq && typeof mobileMq.addListener === "function") {
      mobileMq.addListener(onResizeOrInit);
    }

    if (reduceMq && typeof reduceMq.addEventListener === "function") {
      reduceMq.addEventListener("change", onResizeOrInit);
    } else if (reduceMq && typeof reduceMq.addListener === "function") {
      reduceMq.addListener(onResizeOrInit);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onResizeOrInit);
    } else {
      onResizeOrInit();
    }

    requestAnimationFrame(function () {
      onResizeOrInit();
      requestAnimationFrame(onResizeOrInit);
    });
  } catch (e) {}
})();
