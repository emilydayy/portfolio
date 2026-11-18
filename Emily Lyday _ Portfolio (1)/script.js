/* Emily Lyday portfolio: small, dependency-free helpers */
(function () {
  "use strict";

  /* 0. Opening a page lands at the very top (title + cover), unless the link has a #section */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  if (!location.hash) {
    var toTop = function () { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); };
    toTop();
    /* keep pinning to the top while the page is still loading, until the visitor scrolls on their own */
    var stopPin = false, t0 = Date.now();
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function () { stopPin = true; }, { passive: true, once: true }); });
    (function pin() {
      if (stopPin) return;
      if (window.scrollY !== 0) toTop();
      if (Date.now() - t0 < 6000 && (Date.now() - t0 < 1500 || document.readyState !== "complete")) requestAnimationFrame(pin);
    })();
    window.addEventListener("load", function () { toTop(); setTimeout(function () { document.documentElement.classList.remove("no-smooth"); }, 120); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) toTop(); });
  }

  /* 1. Image slots: show the real image if the file exists ---------------- */
  /* data-src is a base path with no extension; png, jpg, jpeg and webp are tried in turn. */
  var exts = [".png", ".jpg", ".jpeg", ".webp"];
  document.querySelectorAll(".shot[data-src]").forEach(function (slot) {
    var base = slot.getAttribute("data-src");
    var n = 0;
    (function tryNext() {
      if (n >= exts.length) return;
      var img = new Image();
      img.alt = slot.getAttribute("data-alt") || "";
      img.decoding = "async";
      img.onload = function () {
        slot.innerHTML = "";
        slot.appendChild(img);
        if (slot.classList.contains("zoomable")) slot.setAttribute("tabindex", "0");
        slot.classList.add("loaded");
      };
      img.onerror = tryNext;
      img.src = base + exts[n++];
    })();
  });

  /* 2. Click-to-zoom lightbox for case study screens ---------------------- */
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Enlarged image");
  document.body.appendChild(box);
  var boxBack = null, boxSrc = null, closing = false;
  var EASE = "cubic-bezier(.2,.8,.2,1)";
  var motionOK = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) && !!Element.prototype.animate;

  function flipFrom(el, rect, dur) {
    var to = el.getBoundingClientRect();
    if (!to.width || !to.height) return null;
    var dx = rect.left - to.left, dy = rect.top - to.top, sx = rect.width / to.width, sy = rect.height / to.height;
    el.style.transformOrigin = "top left";
    return el.animate([
      { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")" },
      { transform: "none" }
    ], { duration: dur, easing: EASE });
  }
  function finishClose() {
    var v = box.querySelector("video");
    if (v && boxBack) {
      try { boxBack.video.currentTime = v.currentTime; } catch (e) {}
      if (boxBack.wasPlaying) boxBack.video.play().catch(function () {});
    }
    boxBack = null; boxSrc = null; closing = false;
    box.classList.remove("on"); box.innerHTML = "";
    tipHide();
  }
  function closeBox() {
    if (closing || !box.classList.contains("on")) return;
    var big = box.querySelector("img, video");
    if (!motionOK || !big) { finishClose(); return; }
    closing = true;
    var r = boxSrc && boxSrc.getBoundingClientRect();
    var visible = r && r.width && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    var fade = box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease", fill: "forwards" });
    if (visible) {
      var to = big.getBoundingClientRect();
      big.style.transformOrigin = "top left";
      big.animate([
        { transform: "none" },
        { transform: "translate(" + (r.left - to.left) + "px," + (r.top - to.top) + "px) scale(" + (r.width / to.width) + "," + (r.height / to.height) + ")" }
      ], { duration: 280, easing: EASE, fill: "forwards" });
    } else {
      big.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }], { duration: 240, easing: "ease", fill: "forwards" });
    }
    fade.onfinish = function () { fade.cancel(); finishClose(); };
  }
  function showBox(big, srcEl, captionText) {
    box.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "lb-wrap";
    wrap.appendChild(big);
    if (captionText) {
      var cap = document.createElement("p");
      cap.className = "lb-cap"; cap.textContent = captionText;
      wrap.classList.add("has-cap");
      wrap.appendChild(cap);
      cap.addEventListener("click", function (e) { e.stopPropagation(); });
    }
    box.appendChild(wrap);
    boxSrc = srcEl; closing = false;
    box.classList.add("on");
    if (typeof tip !== "undefined" && tip && tip.classList.contains("on") && !(big.tagName === "VIDEO")) tip.textContent = "Zoom out";
    if (motionOK) {
      box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease" });
      var r = srcEl && srcEl.getBoundingClientRect();
      if (r && r.width) flipFrom(big, r, 420);
      else big.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: EASE });
    }
  }
  box.addEventListener("click", closeBox);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && box.classList.contains("on")) closeBox();
  });

  /* the caption that goes with an image: its own figcaption, or its note in the research collage */
  function captionFor(slot) {
    var fig = slot.closest("figure"), cap = fig && fig.querySelector("figcaption");
    if (cap) return cap.textContent.trim();
    if (slot.closest(".collage-r")) {
      var alt = slot.getAttribute("data-alt"), found = "";
      slot.closest(".collage-r").querySelectorAll(".c-notes p").forEach(function (p) {
        var b = p.querySelector("b");
        if (b && b.textContent.trim() === alt) found = p.textContent.replace(b.textContent, "").trim();
      });
      return found;
    }
    return "";
  }
  function openBox(slot) {
    var img = slot.querySelector("img");
    if (!img) return;
    var big = new Image();
    big.src = img.src;
    big.alt = img.alt;
    showBox(big, img, captionFor(slot));
  }
  /* Videos: play/pause button, double-click to enlarge */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".vid").forEach(function (fig) {
    var vid = fig.querySelector("video"), btn = fig.querySelector(".vid-btn");
    if (!vid) return;
    function sync() {
      fig.classList.toggle("paused", vid.paused);
      if (btn) btn.setAttribute("aria-label", vid.paused ? "Play video" : "Pause video");
    }
    vid.addEventListener("play", sync); vid.addEventListener("pause", sync);
    if (reduceMotion) { vid.removeAttribute("autoplay"); vid.pause(); }
    sync();
    if (btn) btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (vid.paused) vid.play().catch(function () {}); else vid.pause();
    });
    vid.addEventListener("dblclick", function () {
      var big = document.createElement("video");
      big.src = vid.currentSrc || vid.src;
      big.poster = vid.poster;
      big.controls = true; big.loop = true; big.muted = true; big.playsInline = true;
      big.setAttribute("aria-label", vid.getAttribute("aria-label") || "Enlarged video");
      big.addEventListener("click", function (e) { e.stopPropagation(); });
      boxBack = { video: vid, wasPlaying: !vid.paused };
      vid.pause();
      if (vid.videoWidth) big.style.aspectRatio = vid.videoWidth + " / " + vid.videoHeight;
      showBox(big, vid);
      big.addEventListener("loadedmetadata", function () {
        try { big.currentTime = vid.currentTime; } catch (e) {}
        big.play().catch(function () {});
      });
    });
  });

  /* Cursor label: a small "Zoom in" bar follows the pointer over zoomable images */
  var tip = null, tipX = 0, tipY = 0, tipRaf = 0;
  function tipHide() { if (tip) tip.classList.remove("on"); }
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    tip = document.createElement("div");
    tip.className = "zoom-tip"; tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);
    root0().classList.add("has-tip");
    var place = function () { tipRaf = 0; tip.style.transform = "translate(" + (tipX + 16) + "px," + (tipY + 18) + "px)"; };
    document.addEventListener("mousemove", function (e) {
      tipX = e.clientX; tipY = e.clientY;
      var t = e.target, label = "";
      if (box.classList.contains("on")) {
        if (t.closest && t.closest(".lightbox") && !(t.tagName === "VIDEO")) label = "Zoom out";
      } else if (t.closest) {
        if (t.closest(".shot.zoomable.loaded")) label = "Zoom in";
        else if (t.closest(".vid video")) label = "Double-click to zoom";
      }
      if (label) { tip.textContent = label; tip.classList.add("on"); } else tip.classList.remove("on");
      if (!tipRaf) tipRaf = requestAnimationFrame(place);
    }, { passive: true });
    document.addEventListener("mouseleave", tipHide);
    window.addEventListener("blur", tipHide);
  }
  function root0() { return document.documentElement; }

  document.querySelectorAll(".shot.zoomable").forEach(function (slot) {
    slot.addEventListener("click", function () { openBox(slot); });
    slot.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBox(slot); }
    });
  });

  /* 4. Sidebar highlights the section in view on the home page ------------ */
  var spyLinks = [].slice.call(document.querySelectorAll(".nav a[href^='index.html#'], .nav a[href^='#']"));
  var spySecs = spyLinks.map(function (a) { return document.getElementById(a.getAttribute("href").split("#")[1]); });
  if (spyLinks.length && spySecs.every(Boolean)) {
    var spy = function () {
      var line = window.innerHeight * 0.4, cur = 0;
      spySecs.forEach(function (sec, i) { if (sec.getBoundingClientRect().top <= line) cur = i; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = spySecs.length - 1;
      spyLinks.forEach(function (a, i) {
        if (i === cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
  }

  /* 5. Sun / moon next to the name toggles dark mode ---------------------- */
  var root = document.documentElement;
  var modeBtn = document.querySelector(".mode-btn");
  var dayWord = document.querySelector(".brand .word");
  function setTheme(dark, save) {
    if (dark) root.setAttribute("data-mode", "dark"); else root.removeAttribute("data-mode");
    if (dayWord) dayWord.textContent = dark ? "night" : "day";
    var brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("aria-label", "Emily Ly" + (dark ? "night" : "day") + ", home");
    if (modeBtn) modeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    if (save) { try { localStorage.setItem("ely-theme", dark ? "dark" : "light"); } catch (e) {} }
  }
  if (modeBtn) {
    var saved = null;
    try { saved = localStorage.getItem("ely-theme"); } catch (e) {}
    setTheme(saved ? saved === "dark" : root.getAttribute("data-mode") === "dark", false);
    modeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-mode") !== "dark";
      var calmMode = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (calmMode) { setTheme(next, true); return; }
      if (document.startViewTransition) {
        /* the whole page cross-fades between the two themes */
        document.startViewTransition(function () { setTheme(next, true); });
      } else {
        /* fallback: briefly let colors ease instead of snapping */
        root.classList.add("theming");
        setTheme(next, true);
        setTimeout(function () { root.classList.remove("theming"); }, 800);
      }
    });
    /* clicking the name never changes the theme; on the home page it just scrolls to the top */
    var nameLink = document.querySelector(".brand");
    if (nameLink && document.getElementById("work")) {
      nameLink.addEventListener("click", function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* 6. Fade in (once) as sections scroll into view -------------- */
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!calm && "IntersectionObserver" in window) {
    var targets = [].slice.call(document.querySelectorAll(
      ".intro h1, .intro .now, .group > h2, .tile, .about-text, .collage > div, .footer, " +
      ".cs-head, .cs section > h2, .cs section > p, .cs section > ul, .cs figure, .cs .fig-row, .wk, " +
      ".cs .quote, .cs .insight, .cs .persona, .cs .next-up"));
    targets = targets.filter(function (el) {
      return !targets.some(function (o) { return o !== el && o.contains(el); });
    });
    root.classList.add("js-reveal");
    var seen = {};
    targets.forEach(function (el) {
      el.setAttribute("data-rv", "");
      var p = el.parentNode;
      var key = targets.indexOf(p);
      var n = (p.__rv = (p.__rv || 0) + 1) - 1;
      el.style.setProperty("--rv-d", Math.min(n, 4) * 0.09 + "s");
    });
    /* settle the hidden/blurred starting state without animating into it */
    root.classList.add("rv-init");
    void root.offsetHeight;
    requestAnimationFrame(function () { root.classList.remove("rv-init"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target); /* reveal once; never fade out and back in */
      });
    }, { rootMargin: "-7% 0px -7% 0px", threshold: 0 });
    targets.forEach(function (el) { io.observe(el); });
  }
})();

/* Cross-stitch lotus behind the homepage headline: a pixel grid of little x stitches that sways, breathes,
   twinkles, and scatters away from the pointer before springing back. */
(function () {
  var canvas = document.querySelector(".ascii-flower");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = true;   // header lotus is a still drawing (no animation)
  var COLS = 84, ROWS = 44, BX = 42, BY = 33;           // grid size and the lotus base point
  var stitches = [], W = 0, H = 0, cell = 0, dpr = 1, running = false, raf = 0, t0 = performance.now();
  var mouse = { x: -9999, y: -9999, on: false };

  function css(name, fb) { var v = getComputedStyle(canvas).getPropertyValue(name).trim(); return v || fb; }

  /* ---- design the lotus on the grid ---- */
  function design() {
    var g = {}; function put(x, y, k) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < COLS && y < ROWS) g[x + "," + y] = k; }
    function clear(x, y) { delete g[x + "," + y]; }

    // one pointed petal rising from (bx, by), tilted `deg` from vertical; hides whatever is behind it
    function petal(bx, by, deg, L, Wd, veins) {
      var a = deg * Math.PI / 180, sa = Math.sin(a), ca = Math.cos(a);
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var rx = x + 0.5 - bx, ry = by - (y + 0.5);
        var along = rx * sa + ry * ca, b = rx * ca - ry * sa, tt = along / L;
        if (tt <= 0 || tt >= 1) continue;
        var hw = Wd * Math.pow(Math.sin(Math.PI * Math.pow(tt, 0.72)), 0.85), ab = Math.abs(b);
        if (ab < hw) {
          clear(x, y);
          if (ab > hw - 1.05) put(x, y, "p");
          else if (veins && ab < 0.5 && tt > 0.22 && tt < 0.72) put(x, y, "v");
        }
      }
    }
    [[-82, 17, 5], [82, 17, 5], [-55, 23, 6], [55, 23, 6], [-28, 28, 6.4], [28, 28, 6.4], [0, 31, 6.4]].forEach(function (p) {
      petal(BX, BY, p[0], p[1], p[2], p[0] === 0);
    });
    // small buds standing on the water either side
    [[-27, -10], [27, 10], [-36, 8], [36, -8]].forEach(function (b) { petal(BX + b[0], BY + 2, b[1], 11, 3, false); });

    // seed pod / stamens
    for (var y2 = 0; y2 < ROWS; y2++) for (var x2 = 0; x2 < COLS; x2++) {
      var dx = (x2 + 0.5 - BX) / 2.8, dy = (y2 + 0.5 - (BY - 2.5)) / 1.7;
      if (dx * dx + dy * dy < 1) put(x2, y2, "c");
    }
    // water ripples: wide lower arcs that run most of the way across
    [[13, 2], [22, 3.4], [32, 4.8], [40, 6.2]].forEach(function (r) {
      for (var y3 = BY; y3 < ROWS; y3++) for (var x3 = 0; x3 < COLS; x3++) {
        var ex = (x3 + 0.5 - BX) / r[0], ey = (y3 + 0.5 - (BY + 0.5)) / r[1], d = ex * ex + ey * ey;
        if (d > 0.84 && d < 1.12 && (x3 + y3) % 2 === 0) put(x3, y3, "w");
      }
    });
    // lily pads
    [[-25, 3.5], [25, 3.5], [-35, 6], [35, 6], [-12, 5.5], [12, 5.5]].forEach(function (pd) {
      for (var y4 = 0; y4 < ROWS; y4++) for (var x4 = 0; x4 < COLS; x4++) {
        var qx = (x4 + 0.5 - (BX + pd[0])) / 4.2, qy = (y4 + 0.5 - (BY + pd[1])) / 1.4, dd = qx * qx + qy * qy;
        if (dd > 0.6 && dd < 1.05) put(x4, y4, "w");
      }
    });
    // embellishments: corner scrolls, sparkles, tiny stitched dots
    var scroll = ["..XXXXX", ".X....X", "X..XX.X", "X.X..XX", "X.X.X..", "X.X.XXX", ".X.X..."];
    function stamp(pat, ox, oy, fx, fy, k) {
      for (var r = 0; r < pat.length; r++) for (var c = 0; c < pat[r].length; c++) if (pat[r][c] === "X")
        put(ox + (fx ? pat[r].length - 1 - c : c), oy + (fy ? pat.length - 1 - r : r), k);
    }
    stamp(scroll, 1, 1, false, false, "g"); stamp(scroll, COLS - 8, 1, true, false, "g");
    stamp(scroll, 1, ROWS - 8, false, true, "g"); stamp(scroll, COLS - 8, ROWS - 8, true, true, "g");
    var spark = [".X.", "XXX", ".X."];
    [[12, 12], [24, 5], [60, 5], [72, 12], [8, 24], [75, 24], [20, 22], [62, 21], [30, 38], [52, 38]].forEach(function (p, i) { stamp(spark, p[0], p[1], false, false, i % 2 ? "t1" : "t2"); });
    [[16, 3], [34, 8], [49, 8], [67, 3], [4, 14], [79, 14], [26, 15], [57, 15], [14, 33], [69, 33], [41, 40], [43, 40]].forEach(function (p, i) { put(p[0], p[1], i % 2 ? "t1" : "t2"); });
    // a stitched border line along the top and bottom edges between the corner scrolls
    for (var bx = 11; bx < COLS - 11; bx += 3) { put(bx, 1, "g"); put(bx, ROWS - 2, "g"); }
    return g;
  }

  function build() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    cell = Math.min(W / COLS, H / ROWS);
    var ox = (W - cell * COLS) / 2, oy = (H - cell * ROWS) / 2, g = design();
    stitches = [];
    Object.keys(g).forEach(function (key) {
      var xy = key.split(","), x = +xy[0], y = +xy[1];
      stitches.push({
        k: g[key], x: ox + (x + 0.5) * cell, y: oy + (y + 0.5) * cell,
        lift: Math.max(0, Math.min(1, (BY - y) / 31)),                  // how far above the water (sways more)
        rx: (x + 0.5 - BX), ry: (BY - y - 0.5),
        ph: (x * 7 + y * 13) % 6.28, ox: 0, oy: 0, vx: 0, vy: 0
      });
    });
  }

  var GROUPS = { p: 1, v: 0.6, f: 0.42, c: 1, w: 0.8, g: 0.9, t1: 1, t2: 1 };
  function colorFor(k, col) { return k === "p" || k === "f" ? col.p : k === "v" || k === "c" || k === "g" || k === "t1" || k === "t2" ? col.c : col.l; }

  function frame(now) {
    var t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var col = { p: css("--fl-petal", "#f0b6c4"), c: css("--fl-center", "#f8d9a0"), l: css("--fl-leaf", "#b9d3a8") };
    var R = Math.max(70, H * 0.13), R2 = R * R, calm = reduce ? 0 : 1, half = cell * 0.36;
    var breathe = Math.sin(t * 0.5) * 0.18 * calm;
    var buckets = {};
    for (var i = 0; i < stitches.length; i++) {
      var s = stitches[i];
      var tx = Math.sin(t * 0.5 + (1 - s.lift) * 2.2) * cell * 0.3 * s.lift * s.lift * calm;   // sway
      var ty = Math.cos(t * 0.45 + s.ph) * cell * 0.04 * calm;
      if (s.k === "p" || s.k === "f" || s.k === "v") {                                           // petals breathe open and closed
        var rl = Math.sqrt(s.rx * s.rx + s.ry * s.ry) / 31;
        tx += (s.rx / 31) * breathe * cell * rl; ty -= (s.ry / 31) * breathe * cell * rl * 0.4;
      }
      if (mouse.on) {
        var dx = s.x - mouse.x, dy = s.y - mouse.y, dd = dx * dx + dy * dy;
        if (dd < R2) { var d = Math.sqrt(dd) + 0.001, f = 1 - d / R; tx += (dx / d) * f * f * cell * 0.9; ty += (dy / d) * f * f * cell * 0.9; }
      }
      s.vx += (tx - s.ox) * 0.09; s.vy += (ty - s.oy) * 0.09; s.vx *= 0.78; s.vy *= 0.78; s.ox += s.vx; s.oy += s.vy;
      var key = s.k;
      if (s.k === "t1" || s.k === "t2") key = (Math.sin(t * 1.7 + s.ph * 2 + (s.k === "t1" ? 0 : 3)) > 0.2) ? "tOn" : "tOff";
      (buckets[key] || (buckets[key] = [])).push(s);
    }
    ctx.lineCap = "round"; ctx.lineWidth = Math.max(1, cell * 0.2);
    Object.keys(buckets).forEach(function (key) {
      var k = key === "tOn" ? "t1" : key === "tOff" ? "t2" : key;
      ctx.strokeStyle = colorFor(k, col);
      ctx.globalAlpha = key === "tOn" ? 1 : key === "tOff" ? 0.28 : GROUPS[key];
      ctx.beginPath();
      buckets[key].forEach(function (s) {
        var x = s.x + s.ox, y = s.y + s.oy;
        ctx.moveTo(x - half, y - half); ctx.lineTo(x + half, y + half);
        ctx.moveTo(x + half, y - half); ctx.lineTo(x - half, y + half);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (running && !reduce) raf = requestAnimationFrame(frame);
  }

  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setMouse(e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; }
  window.addEventListener("pointermove", setMouse, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.on = false; });
  window.addEventListener("blur", function () { mouse.on = false; });
  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { build(); if (reduce) frame(performance.now()); }, 120); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(canvas);
  } else start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  build();
  if (reduce) frame(performance.now()); else start();
})();

/* Sidebar text turns light while the homepage's navy header band sits behind it. */
(function () {
  var band = document.querySelector(".intro"), side = document.querySelector(".sidebar");
  if (!band || !side) return;
  var root = document.documentElement, ticking = false;
  function check() {
    ticking = false;
    var fixed = getComputedStyle(side).position === "fixed";
    var on = fixed && band.getBoundingClientRect().bottom > 140;
    root.classList.toggle("over-band", on);
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req);
  check();
})();


/* Subtle ASCII sparkle trail that follows the cursor. */
(function () {
  if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (document.querySelector(".cs")) return;                        // no trail on the case-study pages themselves
  var cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60";
  document.body.appendChild(cv);
  var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
  function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
  size(); addEventListener("resize", size);
  var GL = ["ring", "dot", "star", "dot", "ring", "star"], NAVY = "#343d6d", CREAM = "#f4ecdb", ps = [], lx = -1, ly = -1, last = 0, running = false;
  addEventListener("mousemove", function (e) {
    var hb = document.querySelector(".intro.top");
    if (hb) { var br = hb.getBoundingClientRect(); if (e.clientY >= br.top && e.clientY <= br.bottom) { lx = -1; return; } }
    if (e.target && e.target.closest && e.target.closest("img, video, .shot, .wk-media, .foot-band")) { lx = -1; return; }   // none over images or the footer
    var now = performance.now();
    if (lx >= 0 && Math.hypot(e.clientX - lx, e.clientY - ly) < 9 || now - last < 22) return;
    lx = e.clientX; ly = e.clientY; last = now;
    ps.push({ x: lx + (Math.random() - .5) * 18, y: ly + (Math.random() - .5) * 18,       g: GL[(Math.random() * GL.length) | 0], c: (overNavy(ly) || overFoot(ly)) ? CREAM : NAVY, s: 2 + Math.random() * 2.2, bs: 3 + Math.pow(Math.random(), 1.6) * 13, life: 0, max: 700 + Math.random() * 400 });
    if (ps.length > 90) ps.shift();
    if (!running) { running = true; prev = now; requestAnimationFrame(tick); }
  }, { passive: true });
  var prev = 0;
  function overNavy(y) {
    if (document.documentElement.getAttribute("data-mode") === "dark") return true;
    var b = document.querySelector(".intro.top");
    return !!b && b.getBoundingClientRect().top <= y && b.getBoundingClientRect().bottom >= y;
  }
  function overFoot(y) {
    var f = document.querySelector(".foot-band");
    return !!f && f.getBoundingClientRect().top <= y;
  }
  function tick(t) {
    var dt = Math.min(48, t - prev); prev = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i]; p.life += dt;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      var k = p.life / p.max;
      ctx.globalAlpha = .42 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * .3);
      ctx.fillStyle = p.c;
      if (p.g === "star") {                       // hand-drawn asterisk sparkle: long cross plus shorter diagonal spokes
        var R = p.bs * (1 - k * .3);
        ctx.strokeStyle = p.c; ctx.lineWidth = .9 + R * .06; ctx.lineCap = "round";
        var L = [1, .62, 1, .78, 1, .62, 1, .78];
        ctx.beginPath();
        for (var m = 0; m < 8; m++) { var an = m * Math.PI / 4 - Math.PI / 2, ln = R * L[m]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(an) * ln, p.y + Math.sin(an) * ln); }
        ctx.stroke();
      } else if (p.g === "diam") {                // hand-drawn outlined diamond sparkle (tall, pointed top)
        var D = p.bs * 1.1 * (1 - k * .3), w = D * .5, c = D * .12;
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.1; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y - D * 1.15);
        ctx.quadraticCurveTo(p.x + c, p.y - c, p.x + w, p.y + D * .05);
        ctx.quadraticCurveTo(p.x + c, p.y + c * 1.5, p.x, p.y + D * .95);
        ctx.quadraticCurveTo(p.x - c, p.y + c * 1.5, p.x - w, p.y + D * .05);
        ctx.quadraticCurveTo(p.x - c, p.y - c, p.x, p.y - D * 1.15);
        ctx.stroke();
      } else if (p.g === "ring") {                // hollow dot
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 1.15 * (1 - k * .3) + .6, 0, 6.2832); ctx.stroke();
      } else {                                    // filled dot
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - k * .4), 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (ps.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, W, H); }
  }
})();

/* Footer bouquet: a stitched tulip bouquet (cross-stitch, same style as the header lotus).
   Hover lifts a tulip; click (or tap) to pick one: it floats away, then a new one grows back. */
(function () {
  var cv = document.querySelector(".bouquet");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d"), sub = document.querySelector(".foot-sub");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLS = 56, ROWS = 104;
  // '.' empty, '#' fixed stitch, '1'-'4' stitches of the four pickable tulips
  var MAP = [
    "........................................................",
    "........................................................",
    "...............111..11111...............................",
    "..............11111111111.....22222.222.................",
    "...........11111111111111....2222.222.22................",
    "...........1111..111..111....22222222..2222.............",
    "...........1111111....1111...2222...22.22.2.............",
    "...........1111111...11111...2.22...2222222.............",
    "...........11111111.111.11..22.222..222.222.............",
    "...........111.1.111111.111.2...22.222..222.............",
    "...........111....1111...1..2....2222...222...3.........",
    "............11....111....1..22...222....222.333333333...",
    "............11.....11...11...2...222....22..33333333333.",
    ".............11....11...1....2...222....22..3333.3333333",
    "........44411.11...11..11.....22.22....22..23333.3333333",
    "....444444411..11..1111........2222...22...23333.333333.",
    "....4.44444444.4#######.....###########....333333333333.",
    "..444.44..44.4......##......###..##.##.....333.333...33.",
    "..444444..44.44.....##.....####..##..####..333.33..333..",
    "..444444..44..4.....##....#####..##.....##..33.33...33..",
    "..444.44444...4......##..######.###.....###3.33333333...",
    "...4....444..........##.#######.##....####.33.33333.....",
    "...44....44..44...##.####.#####.##...######.3333333.....",
    "....4.....44.4....######.######.#...#######...333.......",
    "....444...4444...#######.########..########...33333333..",
    ".....444..444....#######.######.#..########...#...###...",
    ".......444444....#######.########.##########.##..####...",
    "............4....#######.#####.##.##########.##.#####...",
    "............##...###########################.########...",
    ".....###.....#...#############.#######.#######.####..#..",
    ".....#####...##..#####################.############..#..",
    "......#####...#.#############..#######..##########...#..",
    ".......#####..###############.#######...##########.###..",
    ".......######.##.###########...######....#######..####..",
    "........######.############...######.##..#######.###....",
    ".........#################.#..#####.###...###..####.....",
    ".........################.##..#####.###....#.####.......",
    "........##############.##.###.###...###....#####.....#..",
    "........##############.##.######...####...#####......#..",
    "........#############..##.######..#####.#####.#......#..",
    ".........#..#########..##.######..#########...#.........",
    ".........#..##.#######.##.######..#######...............",
    ".........##..#....#############...#####.............##..",
    ".........##..#......##################..............##..",
    "..........#..##......##...##########................#...",
    "..........#...#.......#....###..##..................#...",
    "..............#.......##.####.......................#...",
    "..........##..##...#.#######.......................##...",
    "..........##..###..................................#....",
    "..........###......................................##...",
    ".........##........................................#....",
    "..........#.................................#......#....",
    "..........#.......................................##....",
    "..........##......................................#.....",
    "...........#......................................#.....",
    "...........##...##................................#.....",
    "............#...##................................#.....",
    "............#....#.........................#.....#......",
    ".............#...#...............................#......",
    ".............#...##........................#....##......",
    ".............##...#.............................#.......",
    "..............#..###......................#....##.......",
    "..............#...##.....................##....#........",
    "...............#..##.....................##...##........",
    "...............#...#.....................#....#.........",
    "...............##..##...................##...##.........",
    "................#..##...................#...##..........",
    "................##..#..................##...#...........",
    "................##..#..................##..##...........",
    ".................#..##.................#...#............",
    ".................##..#................##..##............",
    "..................##.##...............#...#.............",
    "...................#..#..............##..##.............",
    "....................#.##.............##..#..............",
    "....................##.#............###.##..............",
    ".....................#.##...........##..#...............",
    ".....................####...........##.##...............",
    ".................###..####.........##..#................",
    "................##.#######.........##.#.................",
    "................#....####.#........####.................",
    "................####..###.#.......####..................",
    ".................####..#####....######..................",
    "...................###############.##...................",
    "....................##########...####...................",
    "..................#################.##..................",
    "..................##.###.######......#..................",
    ".................######..####....##..#..................",
    "........................####.....##..#..................",
    "........................#####....##..#..................",
    "........................#####.....##..#.................",
    ".......................####.##....##..#.................",
    ".......................##.#.#.##......#.................",
    ".......................##.#.####......#.................",
    "......................##....##.#...#...#................",
    ".....................####....#.#...#...#................",
    ".....................##.###..#.#....#.##................",
    "...................###...##..###...####.................",
    "..........................#..##.####....................",
    "...........................####.........................",
    ".............................##.........................",
    ".............................##.........................",
    ".............................##.........................",
    "........................................................",
    "........................................................"
  ];
  var W = 0, H = 0, cell = 0, ox = 0, oy = 0, dpr = 1, fixed = [], flowers = [], running = false, raf = 0, last = 0, t0 = performance.now();
  function css(n, fb) { var v = getComputedStyle(cv).getPropertyValue(n).trim(); return v || fb; }

  /* Lily: six pointed petals with recurved tips, ribs and three stamens, in the same stitch grid. */
  function lily(cx, cy, R, rot, sq) {
    var g = {}, pet = [];
    for (var k = 0; k < 6; k++) {
      var ang = rot + k * Math.PI / 3, len = R * (k % 2 ? 0.86 : 1), cells = {}, ux = Math.cos(ang), uy = Math.sin(ang) * sq, nx = -Math.sin(ang), ny = Math.cos(ang) * sq;
      for (var i = 0; i <= 60; i++) {
        var t = i / 60, w = R * 0.28 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9), curl = R * 0.38 * t * t * (k % 2 ? -1 : 1);
        for (var j = -12; j <= 12; j++) {
          var off = w * j / 12, x = cx + ux * len * t + nx * (off + curl), y = cy + uy * len * t + ny * (off + curl);
          cells[Math.floor(x) + "," + Math.floor(y)] = 1;
        }
      }
      pet.push({ ang: ang, len: len, cells: cells, k: k });
    }
    pet.sort(function (a, b) { return Math.sin(a.ang) - Math.sin(b.ang); });       // upper petals first, front ones on top
    pet.forEach(function (p) {
      var ribs = [];
      for (var i = 6; i <= 40; i++) {
        var t = i / 60, curl = R * 0.38 * t * t * (p.k % 2 ? -1 : 1), ux2 = Math.cos(p.ang), uy2 = Math.sin(p.ang) * sq, nx2 = -Math.sin(p.ang), ny2 = Math.cos(p.ang) * sq;
        ribs.push(Math.floor(cx + ux2 * p.len * t + nx2 * curl) + "," + Math.floor(cy + uy2 * p.len * t + ny2 * curl));
      }
      Object.keys(p.cells).forEach(function (key) {
        var q = key.split(","), x = +q[0], y = +q[1]; delete g[key];
        var edge = !p.cells[(x + 1) + "," + y] || !p.cells[(x - 1) + "," + y] || !p.cells[x + "," + (y + 1)] || !p.cells[x + "," + (y - 1)];
        if (edge) g[key] = "p"; else if ((x + y) % 2 === 0) g[key] = "f";          // dotted halftone body, solid outline
      });
      ribs.forEach(function (key) { if (p.cells[key] && g[key] !== "p") g[key] = "v"; });   // pale stripe down the petal
    });
    for (var n = 0; n < 5; n++) {                                                  // stamens: pale filaments radiating out, warm anthers at the tips
      var a2 = -Math.PI / 2 + n * 1.2566 + 0.3, L = R * (0.5 + 0.06 * (n % 2));
      for (var i = 0; i <= L; i++) g[Math.floor(cx + Math.cos(a2) * i) + "," + Math.floor(cy + Math.sin(a2) * i * sq)] = "a";
      var ex = Math.floor(cx + Math.cos(a2) * L), ey = Math.floor(cy + Math.sin(a2) * L * sq);
      g[ex + "," + ey] = "y"; g[(ex + 1) + "," + ey] = "y"; g[ex + "," + (ey + 1)] = "y"; g[(ex + 1) + "," + (ey + 1)] = "y";
    }
    g[Math.floor(cx) + "," + Math.floor(cy)] = "y";
    return g;
  }
  function bud(g, bx, by, ang, len, wd) {                                          // pointed teardrop bud, same outline + dotted fill
    var cells = {};
    for (var i = 0; i <= 50; i++) {
      var t = i / 50, w = wd * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9), bend = len * 0.12 * t * t;
      for (var j = -10; j <= 10; j++) {
        var off = w * j / 10, x = bx + Math.cos(ang) * len * t + Math.cos(ang + 1.5708) * (off + bend), y = by + Math.sin(ang) * len * t + Math.sin(ang + 1.5708) * (off + bend);
        cells[Math.floor(x) + "," + Math.floor(y)] = 1;
      }
    }
    Object.keys(cells).forEach(function (key) {
      var q = key.split(","), x = +q[0], y = +q[1], edge = !cells[(x + 1) + "," + y] || !cells[(x - 1) + "," + y] || !cells[x + "," + (y + 1)] || !cells[x + "," + (y - 1)];
      if (edge) g[key] = "p"; else if ((x + y) % 2 === 0) g[key] = "f";
      if (!edge && ((x - Math.round(bx)) % 3 === 0)) g[key] = "v";                  // lengthwise stripes on the bud
    });
  }
  function stemTo(g, x0, y0, cx, cy, x1, y1) {
    for (var i = 0; i <= 60; i++) { var t = i / 60, u = 1 - t; g[Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1) + "," + Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1)] = "s"; }
  }

  /* Lily of the valley: an arching green stem with little white bells hanging from it, plus a couple of pointed leaves. */
  var BELL = ["..XXX..", ".XXXXX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XX.X.XX"];
  function bell(g, tx, ty) {                                       // (tx,ty) is the top-centre of the bell
    for (var r = 0; r < BELL.length; r++) for (var c = 0; c < 7; c++) {
      if (BELL[r].charAt(c) !== "X") continue;
      var edge = c === 0 || c === 6 || r === 0 || r === 7 || BELL[r].charAt(c - 1) !== "X" || BELL[r].charAt(c + 1) !== "X" || (r > 0 && BELL[r - 1].charAt(c) !== "X") || (r < 7 && BELL[r + 1].charAt(c) !== "X");
      g[(tx - 3 + c) + "," + (ty + r)] = edge ? "wc" : ((r + c) % 5 === 0 ? "wh" : "w");
    }
    g[(tx - 2) + "," + (ty + 8)] = "br"; g[(tx + 2) + "," + (ty + 8)] = "br";    // two tiny stamens peeking out of the hem
  }
  function blade(g, bx, by, ang, len, wd) {                        // pointed leaf blade, outline + fill
    var cells = {};
    for (var i = 0; i <= 50; i++) {
      var t = i / 50, w = wd * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.9), bend = len * 0.1 * t * t;
      for (var j = -10; j <= 10; j++) {
        var off = w * j / 10, x = bx + Math.cos(ang) * len * t + Math.cos(ang + 1.5708) * (off + bend), y = by + Math.sin(ang) * len * t + Math.sin(ang + 1.5708) * (off + bend);
        cells[Math.floor(x) + "," + Math.floor(y)] = 1;
      }
    }
    Object.keys(cells).forEach(function (key) {
      var q = key.split(","), x = +q[0], y = +q[1];
      g[key] = (!cells[(x + 1) + "," + y] || !cells[(x - 1) + "," + y] || !cells[x + "," + (y + 1)] || !cells[x + "," + (y - 1)]) ? "le" : "lf";
    });
  }
  function sprig(S) {
    var g = {}, n = S.bells.length;
    blade(g, S.x0, S.y0, -2.15, 12, 2.4); blade(g, S.x0 + 1, S.y0, -0.95, 9, 2);
    for (var i = 0; i <= 90; i++) { var t = i / 90, u = 1 - t; g[Math.round(u * u * S.x0 + 2 * u * t * S.cx + t * t * S.x1) + "," + Math.round(u * u * S.y0 + 2 * u * t * S.cy + t * t * S.y1)] = "s"; }
    S.bells.forEach(function (t) {
      var u = 1 - t, px = Math.round(u * u * S.x0 + 2 * u * t * S.cx + t * t * S.x1), py = Math.round(u * u * S.y0 + 2 * u * t * S.cy + t * t * S.y1);
      g[px + "," + (py + 1)] = "s"; g[px + "," + (py + 2)] = "s";
      bell(g, px, py + 3);
    });
    return g;
  }

  function design() {
    var groups = {};
    fixed = [];
    MAP.forEach(function (row, y) {
      for (var x = 0; x < COLS; x++) {
        var ch = row.charAt(x);
        if (ch === ".") continue;
        if (ch === "#") fixed.push([x, y, (y >= 44 || (x >= 50 && y >= 36) || (x <= 11 && y >= 40)) ? 1 : 0]);   // 1 = paper and bow (green)
        else if (ch === "2" || ch === "3") continue;                       // these two tulips are replaced by lilies below
        else (groups[ch] = groups[ch] || []).push({ x: x, y: y });
      }
    });
    var lowest = {};                                                      // paper's top rim = the lower edge of the leaf mass, in cream too
    fixed.forEach(function (p) { if (p[1] >= 36 && p[1] <= 47 && p[0] >= 8 && p[0] <= 53) lowest[p[0]] = Math.max(lowest[p[0]] || 0, p[1]); });
    fixed.forEach(function (p) { if (lowest[p[0]] !== undefined && p[1] >= lowest[p[0]] - 1 && p[1] <= lowest[p[0]]) p[2] = 1; });
    Object.keys(groups).forEach(function (id) {                          // colour in the tulip heads: fill the gaps between outline stitches in each row
      var rows = {}, have = {};
      groups[id].forEach(function (p) { (rows[p.y] = rows[p.y] || []).push(p.x); have[p.x + "," + p.y] = 1; });
      Object.keys(rows).forEach(function (y) {
        var xs = rows[y].sort(function (a, b) { return a - b; });
        for (var i = 0; i + 1 < xs.length; i++) {
          if (xs[i + 1] - xs[i] > 1 && xs[i + 1] - xs[i] <= 8) for (var x = xs[i] + 1; x < xs[i + 1]; x++) if (!have[x + "," + y]) { have[x + "," + y] = 1; groups[id].push({ x: x, y: +y }); }
        }
      });
    });
    Object.keys(groups).forEach(function (id) {                          // close any blank lines left inside the heads (gaps between stitches, across and down)
      var have = {}, g = groups[id], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      g.forEach(function (p) { have[p.x + "," + p.y] = 1; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      for (var pass = 0; pass < 2; pass++) for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
        if (have[x + "," + y]) continue;
        var near = function (dx, dy) { for (var k = 1; k <= 12; k++) if (have[(x + dx * k) + "," + (y + dy * k)]) return true; return false; };
        if ((near(-1, 0) && near(1, 0)) || (near(0, -1) && near(0, 1))) { have[x + "," + y] = 1; g.push({ x: x, y: y }); }
      }
    });
    Object.keys(groups).forEach(function (id) {                          // shading: darker edge, lighter body, a few bright highlights (like the bells)
      var set = {}; groups[id].forEach(function (p) { set[p.x + "," + p.y] = 1; });
      groups[id].forEach(function (p) {
        var edge = !set[(p.x + 1) + "," + p.y] || !set[(p.x - 1) + "," + p.y] || !set[p.x + "," + (p.y + 1)] || !set[p.x + "," + (p.y - 1)];
        p.k = edge ? "e" : "f";
      });
      var g = groups[id], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;       // petal detail: a heart-shaped inner petal, with a short stroke down toward the stem
      g.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      var w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2;
      var lines = [                                                      // petal seams: left petal edge, right petal edge, and the bud peeking out between them
        [[0.24, 0.1], [0.4, 0.24], [0.54, 0.4], [0.64, 0.55], [0.67, 0.7], [0.62, 0.9]],
        [[0.66, 0.16], [0.6, 0.3], [0.62, 0.45], [0.67, 0.55]],
        [[0.4, 0.22], [0.48, 0.14], [0.58, 0.14], [0.66, 0.22]]
      ];
      lines.forEach(function (poly) {
        for (var i = 0; i < poly.length - 1; i++) {
          for (var t = 0; t <= 1.001; t += 0.03) {
            var lx = Math.round(x0 + w * (poly[i][0] + (poly[i + 1][0] - poly[i][0]) * t)), ly = Math.round(y0 + h * (poly[i][1] + (poly[i + 1][1] - poly[i][1]) * t));
            g.forEach(function (p) { if (p.x === lx && p.y === ly) p.k = "l"; });
          }
        }
      });
    });
    var occ = {}, top = {}, rmin = {}, rmax = {};                        // fill the paper cone with a slightly darker cream
    fixed.forEach(function (p) { occ[p[0] + "," + p[1]] = 1; });
    Object.keys(groups).forEach(function (id) { groups[id].forEach(function (p) { occ[p.x + "," + p.y] = 1; }); });
    fixed.forEach(function (p) { if (p[2] !== 1) return; top[p[0]] = top[p[0]] === undefined ? p[1] : Math.min(top[p[0]], p[1]); rmin[p[1]] = rmin[p[1]] === undefined ? p[0] : Math.min(rmin[p[1]], p[0]); rmax[p[1]] = rmax[p[1]] === undefined ? p[0] : Math.max(rmax[p[1]], p[0]); });
    var fillCells = [];
    for (var yy = 0; yy < ROWS; yy++) if (rmin[yy] !== undefined) for (var xx = rmin[yy]; xx <= rmax[yy]; xx++) if (top[xx] !== undefined && yy > top[xx] && !occ[xx + "," + yy]) fillCells.push([xx, yy, 2]);
    fillCells.forEach(function (p) { fixed.push(p); occ[p[0] + "," + p[1]] = 1; });
    var minTop = 1e9; fixed.forEach(function (p) { if (p[2] === 1) minTop = Math.min(minTop, p[1]); });
    var paper = {}; fixed.forEach(function (p) { if (p[2] === 1 || p[2] === 2) paper[p[0] + "," + p[1]] = 1; });
    for (var pass = 0; pass < 3; pass++) {                              // close the little gaps (up to 3 cells wide) left inside the wrap
      var add = [];
      for (var y2 = minTop; y2 < ROWS; y2++) for (var x2 = 0; x2 < COLS; x2++) {
        if (occ[x2 + "," + y2]) continue;
        var hit = function (dx, dy) { for (var k = 1; k <= 3; k++) if (paper[(x2 + dx * k) + "," + (y2 + dy * k)]) return true; return false; };
        if ((hit(-1, 0) && hit(1, 0)) || (hit(0, -1) && hit(0, 1))) add.push([x2, y2, 2]);
      }
      add.forEach(function (p) { fixed.push(p); occ[p[0] + "," + p[1]] = 1; paper[p[0] + "," + p[1]] = 1; });
    }
    var solid = {}; fixed.forEach(function (p) { solid[p[0] + "," + p[1]] = 1; });   // leaves + paper: gaps boxed in by these get the paper colour too (the wrap goes around the stems)
    for (var pass2 = 0; pass2 < 3; pass2++) {
      var add2 = [];
      for (var y3 = 0; y3 < ROWS; y3++) for (var x3 = 0; x3 < COLS; x3++) {
        if (occ[x3 + "," + y3]) continue;
        var seen = function (dx, dy, n) { for (var k = 1; k <= n; k++) if (solid[(x3 + dx * k) + "," + (y3 + dy * k)]) return true; return false; };
        if (seen(-1, 0, 3) && seen(1, 0, 3) && seen(0, -1, 9) && seen(0, 1, 9)) add2.push([x3, y3, 2]);
      }
      add2.forEach(function (p) { fixed.push(p); occ[p[0] + "," + p[1]] = 1; solid[p[0] + "," + p[1]] = 1; });
    }
    var all = {}; fixed.forEach(function (p) { if (!p[2]) all[p[0] + "," + p[1]] = 1; });
    fixed.forEach(function (p) {                                          // same for the leaves: outlined blade, soft body, light highlights
      if (p[2]) return;
      var edge = !all[(p[0] + 1) + "," + p[1]] || !all[(p[0] - 1) + "," + p[1]] || !all[p[0] + "," + (p[1] + 1)] || !all[p[0] + "," + (p[1] - 1)];
      p[3] = edge ? "e" : "f";
    });
    var phases = { 1: 0.3, 2: 1.7, 3: 3.1, 4: 4.6 };
    var lilies = [{ x0: 31, y0: 33, cx: 33, cy: -7, x1: 51, y1: 8, bells: [0.5, 0.76, 1.0], ph: 1.7, hx: 43, hy: 14 },
                  { x0: 36, y0: 37, cx: 50, cy: 12, x1: 52, y1: 21, bells: [0.62, 0.97], ph: 3.1, hx: 49, hy: 22 }];
    var lilyMask = {};
    var lilyFlowers = lilies.map(function (L) {
      var g = sprig(L), st = [], minY = 1e9, maxY = -1e9;
      Object.keys(g).forEach(function (key) { var q = key.split(","), x = +q[0], y = +q[1]; if (x < 0 || x >= COLS || y < 0) return; minY = Math.min(minY, y); maxY = Math.max(maxY, y); st.push({ x: x, y: y, k: g[key] }); });
      st.forEach(function (p) { p.lift = 0.35 + 0.65 * (maxY - p.y) / Math.max(1, maxY - minY); });
      st.forEach(function (p) { lilyMask[p.x + "," + p.y] = 1; });
      return { st: st, lily: true, ph: L.ph, hover: 0, target: 0, pick: 0, picked: false, pickT: 0, head: { x: L.hx, y: L.hy, r: 11 } };
    });
    fixed = fixed.filter(function (p) { return p[2] === 1 || !lilyMask[p[0] + "," + p[1]]; });   // drop the bitmap leaves that sat behind the sprigs...
    (function () {                                                       // ...and where that leaves a hole inside the leaf mass, the sprig carries wrap-coloured filler that shows once it's picked
      var sol = {}, leafy = {}; fixed.forEach(function (p) { sol[p[0] + "," + p[1]] = 1; if (!p[2]) leafy[p[0] + "," + p[1]] = 1; });
      var seen = function (x, y, dx, dy, n, set) { set = set || sol; for (var k = 1; k <= n; k++) if (set[(x + dx * k) + "," + (y + dy * k)]) return true; return false; };
      lilyFlowers.forEach(function (f) {
        var zone = {}, under = {};
        f.st.forEach(function (p) { for (var dx = -4; dx <= 4; dx++) for (var dy = -4; dy <= 4; dy++) zone[(p.x + dx) + "," + (p.y + dy)] = 1; });
        for (var pass = 0; pass < 3; pass++) {
          var add = [];
          Object.keys(zone).forEach(function (key) {
            var q = key.split(","), x = +q[0], y = +q[1];
            if (x < 0 || x >= COLS || y < 0 || y >= ROWS || sol[key]) return;
            if (seen(x, y, -1, 0, 12) && seen(x, y, 1, 0, 12) && seen(x, y, 0, -1, 14, leafy) && seen(x, y, 0, 1, 14)) add.push([x, y]);
          });
          add.forEach(function (p) { under[p[0] + "," + p[1]] = p; sol[p[0] + "," + p[1]] = 1; });
        }
        f.under = Object.keys(under).map(function (k) { return under[k]; });
      });
    })();
    flowers = Object.keys(groups).map(function (id) {
      var st = groups[id], minY = 1e9, maxY = -1e9, sx = 0, sy = 0;
      st.forEach(function (p) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); sx += p.x; sy += p.y; });
      var head = { x: sx / st.length, y: sy / st.length, r: Math.max(9, (maxY - minY) * 0.6) };
      st.forEach(function (p) { p.lift = 0.35 + 0.65 * (maxY - p.y) / Math.max(1, maxY - minY); });
      var bx = 0, bn = 0; st.forEach(function (p) { if (p.y >= maxY - 2) { bx += p.x; bn++; } });      // stem: grows from the base of the head into the wrap, and comes away with the flower
      var cx = Math.round(bx / bn), yEnd = 50, stem = {}, rim = {}, have = {};
      fixed.forEach(function (p) { have[p[0] + "," + p[1]] = 1; if (p[2] === 1 && p[1] > maxY + 4) rim[p[0] + "," + p[1]] = 1; });
      for (var yy = maxY; yy <= yEnd; yy++) {
        var sxp = Math.round(cx + (28 - cx) * 0.12 * (yy - maxY) / (yEnd - maxY));
        if (rim[sxp + "," + yy] || rim[(sxp + 1) + "," + yy]) break;                // the stem ends where the paper begins; it never goes over the wrap
        [sxp, sxp + 1].forEach(function (xx) {
          stem[xx + "," + yy] = 1; st.push({ x: xx, y: yy, k: "s", lift: 0.12 + 0.2 * (yEnd - yy) / (yEnd - maxY) });
          if (!have[xx + "," + yy] && (have[(xx - 2) + "," + yy] || have[(xx + 2) + "," + yy] || have[(xx - 3) + "," + yy] || have[(xx + 3) + "," + yy])) fixed.push([xx, yy, 2]);   // leaves behind wrap-coloured filler, so picking a flower leaves no hole
        });
      }
      return { st: st, ph: phases[id] || 0, hover: 0, target: 0, pick: 0, picked: false, pickT: 0, head: head };
    }).concat(lilyFlowers);
  }

  function build() {
    var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cell = Math.min(W / COLS, H / ROWS); ox = (W - cell * COLS) / 2; oy = (H - cell * ROWS) / 2;
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function strokeSet(list, color, alpha) {
    if (!list.length || alpha < 0.02) return;
    var half = cell * 0.42;
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
    list.forEach(function (s) { var x = s[0], y = s[1]; ctx.moveTo(x - half, y - half); ctx.lineTo(x + half, y + half); ctx.moveTo(x + half, y - half); ctx.lineTo(x - half, y + half); });
    ctx.stroke();
  }

  function frame(now) {
    var dt = Math.min(48, now - last); last = now; var t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineWidth = Math.max(0.8, cell * 0.3);
    var pink = css("--bq-a", "#f58fb4"), pale = css("--bq-b", "#ffd3e2"), blue = css("--bq-lily", "#a9d4f7"), blueLt = css("--bq-lily-lt", "#e4f1fd");
    var fg = [], le = [], lf = [], lh = [], pf = [];
    fixed.forEach(function (p) {
      var pt = [ox + (p[0] + 0.5) * cell, oy + (p[1] + 0.5) * cell];
      if (p[2] === 2) pf.push(pt); else if (p[2]) fg.push(pt); else (p[3] === "e" ? le : p[3] === "h" ? lh : lf).push(pt);
    });
    var green = css("--bq-leaf", "#8fd3a6");
    strokeSet(lf, green, 0.55); strokeSet(lh, "#d2f5df", 0.9); strokeSet(le, green, 0.98); strokeSet(pf, "#cdb98a", 1); strokeSet(fg, css("--bq-cream", "#f4ecdb"), 0.95);
    flowers.forEach(function (f) {
      f.hover += ((f.picked ? 0 : f.target) - f.hover) * 0.14;
      if (f.picked) { f.pick = reduce ? 1 : Math.min(1, f.pick + dt / 700); if (now - f.pickT > 4200) f.picked = false; }
      else if (f.pick > 0) f.pick = reduce ? 0 : Math.max(0, f.pick - dt / 1000);
      var e = ease(f.pick), alpha = 1 - e;
      if (f.under && e > 0.01) strokeSet(f.under.map(function (u) { return [ox + (u[0] + 0.5) * cell, oy + (u[1] + 0.5) * cell]; }), "#cdb98a", e);   // wrap shows where the sprig was
      if (alpha < 0.02) return;
      var P = [], K = {};
      f.st.forEach(function (s) {
        var sway = reduce ? 0 : Math.sin(t * 0.8 + f.ph) * cell * 0.7 * s.lift;
        var dx = sway + e * cell * 6 * (f.ph > 2.5 ? 1 : -1);
        var dy = -f.hover * cell * 3 * s.lift - e * cell * 34 * (0.5 + 0.5 * s.lift);
        var pt = [ox + (s.x + 0.5) * cell + dx, oy + (s.y + 0.5) * cell + dy];
        (K[s.k || "e"] = K[s.k || "e"] || []).push(pt);
      });
      if (f.lily) {                                   // lily of the valley: green stems and leaves, light-blue bells
        var g1 = css("--bq-leaf", "#8fd3a6");
        strokeSet(K.lf || [], g1, alpha * 0.55); strokeSet(K.le || [], g1, alpha); strokeSet(K.s || [], g1, alpha);
        strokeSet(K.wc || [], css("--bq-lily", "#a9d4f7"), alpha); strokeSet(K.w || [], f.hover > 0.5 ? "#e4f1fd" : "#c5e0f8", alpha); strokeSet(K.wh || [], "#ffffff", alpha); strokeSet(K.br || [], css("--bq-c", "#f8d9a0"), alpha);
      }
      else {                                          // tulip stem + head
        strokeSet(K.s || [], css("--bq-leaf", "#8fd3a6"), alpha * 0.95);
        strokeSet(K.f || [], f.hover > 0.5 ? "#fbc4d8" : "#f9a9c4", alpha * 0.75); strokeSet(K.l || [], "#ffe3ee", alpha); strokeSet(K.e || [], pink, alpha);
      }
    });
    ctx.globalAlpha = 1;
    if (running) raf = requestAnimationFrame(frame);
  }

  function hitTest(px, py) {
    var cx = (px - ox) / cell, cy = (py - oy) / cell, best = null, bd = 1e9;
    flowers.forEach(function (f) {
      if (f.picked) return;
      var d = Math.hypot(cx - f.head.x, cy - f.head.y);
      if (d < f.head.r && d < bd) { bd = d; best = f; }
    });
    return best;
  }
  var subTimer = 0, subText = sub ? sub.textContent : "";
  cv.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect(), hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    flowers.forEach(function (f) { f.target = f === hit ? 1 : 0; });
    cv.style.cursor = hit ? "pointer" : "";
  });
  cv.addEventListener("pointerleave", function () { flowers.forEach(function (f) { f.target = 0; }); cv.style.cursor = ""; });
  cv.addEventListener("click", function (e) {
    var r = cv.getBoundingClientRect(), hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    hit.picked = true; hit.pickT = performance.now(); hit.target = 0; cv.style.cursor = "";
    /* the "take a flower to-go?" line stays as is */
    if (!running) frame(performance.now());
  });

  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { build(); if (!running) frame(performance.now()); }, 120); });
  design(); build();
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(cv);
  else start();
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (cv.getBoundingClientRect().top < innerHeight) start(); });
  frame(performance.now());
})();
