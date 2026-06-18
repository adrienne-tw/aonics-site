/**
 * "Deployed units": pinned scroll distance + map pins revealed by scroll progress.
 * `data-deployed-steps`: viewport-heights of pin host height (smaller = less scrolling to reveal all pins).
 */
(function () {
  try {
    var host = document.getElementById("deployed-units-host");
    if (!host) return;

    var markers = host.querySelectorAll(".deployed-units-pin");
    var count = markers.length;
    if (count < 1) return;

    var scrollVh = parseInt(host.getAttribute("data-deployed-steps") || "5", 10);
    if (!scrollVh || scrollVh < 2) scrollVh = 5;

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
      }
    }

    function onScroll() {
      syncMarkers();
    }

    function onResizeOrInit() {
      syncHostHeight();
      computeAllLabelLayouts();
      syncMarkers();
    }

    function onResize() {
      if (layoutQueued) return;
      layoutQueued = true;
      requestAnimationFrame(function () {
        layoutQueued = false;
        syncHostHeight();
        computeAllLabelLayouts();
        syncMarkers();
      });
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
