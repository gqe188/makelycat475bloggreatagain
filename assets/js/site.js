/* lycat475 · 档案册交互：主题切换 / 压印入场 / 网点制版 / 灯箱 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkMq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(darkMq && darkMq.matches);
  }

  /* ---------- 主题切换 ---------- */
  var themeBtn = document.querySelector('.theme-btn');
  function syncThemeBtn() {
    if (themeBtn) themeBtn.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
  }
  if (themeBtn) {
    syncThemeBtn();
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeBtn();
      redrawPlates();
    });
  }
  if (darkMq && darkMq.addEventListener) {
    darkMq.addEventListener('change', function () { syncThemeBtn(); redrawPlates(); });
  }

  /* ---------- 进入视口时触发一次：所有入场动效共用 ---------- */
  var motionOn = root.classList.contains('js-motion') && 'IntersectionObserver' in window;
  var seenCbs = new Map();
  var seenIO = motionOn ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var fns = seenCbs.get(en.target);
      seenIO.unobserve(en.target); seenCbs.delete(en.target);
      if (fns) fns.forEach(function (fn) { fn(); });
    });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  // 开场序列播放期间先登记、不观察，序列结束再统一放行
  var armed = false, held = [];
  function observe(el) {
    if (!seenCbs.has(el)) { seenCbs.set(el, []); seenIO.observe(el); }
  }
  function whenSeen(el, fn) {
    if (!seenIO) { fn(); return; }
    if (!seenCbs.has(el) && !armed) held.push(el);
    if (armed) observe(el);
    else if (!seenCbs.has(el)) seenCbs.set(el, []);
    seenCbs.get(el).push(fn);
  }
  function arm() {
    if (armed || !seenIO) return;
    armed = true;
    held.forEach(function (el) { if (seenCbs.has(el)) seenIO.observe(el); });
    held = [];
    // 保险：若观察器迟迟不回调，首屏内的元素直接触发，不留空白页
    setTimeout(function () {
      seenCbs.forEach(function (fns, el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          seenIO.unobserve(el); seenCbs.delete(el);
          fns.forEach(function (fn) { fn(); });
        }
      });
    }, 1200);
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* 大标题拆字：逐字淡入上滑（拉丁词整体不断行） */
  if (motionOn) document.querySelectorAll('.t-display').forEach(function (h) {
    var txt = h.textContent.trim(), i = 0;
    h.setAttribute('aria-label', txt);
    h.innerHTML = txt.split(/(\s+)/).map(function (tok) {
      if (/^\s+$/.test(tok)) return ' ';
      var chars = Array.from(tok).map(function (c) {
        return '<span class="ch" aria-hidden="true" style="--i:' + (i++) + '">' + esc(c) + '</span>';
      }).join('');
      return /^[\u0000-ɏ]+$/.test(tok) ? '<span class="w">' + chars + '</span>' : chars;
    }).join('');
    h.classList.add('chars');
  });

  /* 压印入场 */
  document.querySelectorAll('[data-rev]').forEach(function (el) {
    whenSeen(el, function () { el.classList.add('in'); });
  });

  /* 乱码解码：只用于拉丁编号与标签，中文不做乱码 */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
  function hash2(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
  function decode(el, delay) {
    var txt = el.textContent, n = txt.length, seed = (Math.random() * 97) | 0, t0 = null;
    var dur = Math.min(900, 360 + n * 45);
    function frame(t) {
      if (t0 === null) t0 = t + delay;
      var k = Math.max(0, Math.min(1, (t - t0) / dur));
      if (k >= 1) { el.textContent = txt; return; }
      var solved = Math.floor((1 - Math.pow(1 - k, 3)) * n), tick = Math.floor(t / 32), tail = '';
      for (var i = solved; i < Math.min(n, solved + 3); i++) {
        tail += txt[i] === ' ' ? ' ' : GLYPHS[Math.floor(hash2(i + seed * 31, tick) * GLYPHS.length)];
      }
      var rest = txt.slice(solved + tail.length);
      el.innerHTML = esc(txt.slice(0, solved)) + esc(tail) + (rest ? '<span style="visibility:hidden">' + esc(rest) + '</span>' : '');
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (motionOn) {
    var decodeSel = '.t-cover, .rh .no, .rh .en, .plate-tag, .toc .no, .figcap b, .folio span, .t-cap';
    document.querySelectorAll(decodeSel).forEach(function (el) {
      var txt = el.textContent;
      if (!txt.trim() || el.children.length || !/^[\x20-\x7e·×–]+$/.test(txt)) return;
      el.setAttribute('aria-label', txt);
      var host = el.closest('[data-rev]') || el;
      var delay = el.classList.contains('t-cover') ? 160 : 60;
      whenSeen(host, function () { decode(el, delay); });
    });
  }

  /* 里程计：规格表里的纯数字逐位滚动 */
  if (motionOn) document.querySelectorAll('.spec dd').forEach(function (dd) {
    var target = dd.querySelector('time') || dd;
    var txt = target.textContent.trim();
    if (!/^[0-9.]+$/.test(txt)) return;
    var k = 0;
    target.innerHTML = '<span class="vh">' + txt + '</span>' + Array.from(txt).map(function (c) {
      if (!/[0-9]/.test(c)) return '<span class="odo-p" aria-hidden="true">' + c + '</span>';
      var strip = '';
      for (var d = 0; d <= 9; d++) strip += '<i>' + d + '</i>';
      return '<span class="odo" aria-hidden="true"><span class="odo-s" style="--n:' + c + ';--k:' + (k++) + '">' + strip + '</span></span>';
    }).join('');
    whenSeen(dd.closest('[data-rev]') || dd, function () { dd.classList.add('roll'); });
  });

  /* 阅读进度：按文章区域的滚动比例 */
  var readbar = document.querySelector('.readbar');
  var article = document.querySelector('article.spread');
  if (readbar && article) {
    var rq = false;
    var updateBar = function () {
      rq = false;
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      // 一屏放得下的文章不需要进度
      readbar.hidden = total <= 0;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      readbar.style.setProperty('--p', p.toFixed(4));
    };
    window.addEventListener('scroll', function () { if (!rq) { rq = true; requestAnimationFrame(updateBar); } }, { passive: true });
    updateBar();
  }

  /* ---------- 网点制版：45° 单色网点，按行显影 780ms ---------- */
  var plates = [];
  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function drawHalftone(p, animate) {
    var cv = p.canvas, img = p.img;
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 采样图：与画布同尺寸的灰度
    var sw = Math.max(1, Math.round(w)), sh = Math.max(1, Math.round(h));
    var off = document.createElement('canvas');
    off.width = sw; off.height = sh;
    var octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, sw, sh);
    var data;
    try { data = octx.getImageData(0, 0, sw, sh).data; } catch (e) { p.fallback(); return; }

    var paper = cssVar('--sheet-2'), ink = cssVar('--ink');
    var dark = isDark();
    var cell = w < 360 ? 3.6 : 4.4;
    var rMax = cell * 0.63;
    var diag = Math.ceil(Math.hypot(w, h) / cell) + 2;
    var c = Math.SQRT1_2;

    // 先按 45° 网格算出每一行的点
    var rows = [];
    for (var j = -diag; j <= diag; j++) {
      var row = [];
      for (var i = -diag; i <= diag; i++) {
        var u = i * cell, v = j * cell;
        var x = w / 2 + (u - v) * c, y = h / 2 + (u + v) * c;
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
        var sx = Math.min(sw - 1, Math.max(0, x | 0)), sy = Math.min(sh - 1, Math.max(0, y | 0));
        var k = (sy * sw + sx) * 4;
        var lum = (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
        // 浅色纸：暗处出点；深色纸：亮处出点。留出 15–25% 纸白
        var d = dark ? lum : 1 - lum;
        d = Math.max(0, d * 0.92 - 0.04);
        var r = Math.min(rMax, Math.sqrt(d) * rMax);
        if (r > 0.25) row.push(x, y, r);
      }
      if (row.length) rows.push(row);
    }

    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ink;
    function paintRows(from, to) {
      ctx.beginPath();
      for (var n = from; n < to; n++) {
        var rw = rows[n];
        for (var q = 0; q < rw.length; q += 3) {
          ctx.moveTo(rw[q] + rw[q + 2], rw[q + 1]);
          ctx.arc(rw[q], rw[q + 1], rw[q + 2], 0, 6.2832);
        }
      }
      ctx.fill();
    }
    if (!animate || reduce) { paintRows(0, rows.length); return; }
    var t0 = 0, done = 0, dur = 780;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3); // outCubic
      var upto = Math.round(e * rows.length);
      if (upto > done) { paintRows(done, upto); done = upto; }
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function redrawPlates() { plates.forEach(function (p) { if (p.ready) drawHalftone(p, false); }); }

  document.querySelectorAll('canvas.ht[data-src]').forEach(function (cv) {
    var img = new Image();
    var p = { canvas: cv, img: img, ready: false };
    p.fallback = function () {
      var el = document.createElement('img');
      el.src = cv.getAttribute('data-src'); el.alt = '';
      cv.replaceWith(el);
    };
    img.decoding = 'async';
    // 图片就绪且进入视口后才制版（开场序列期间等待）
    whenSeen(cv, function () { p.seen = true; if (p.ready) drawHalftone(p, motionOn); });
    img.onload = function () {
      p.ready = true;
      if (p.seen) drawHalftone(p, motionOn);
    };
    img.onerror = p.fallback;
    img.src = cv.getAttribute('data-src');
    plates.push(p);
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(redrawPlates, 160);
  });

  /* ---------- 灯箱 ---------- */
  var lb = document.querySelector('dialog.lb');
  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lb]'));
  if (lb && links.length && typeof lb.showModal === 'function') {
    var lbImg = lb.querySelector('.lb-stage img');
    var lbNo = lb.querySelector('.lb-no');
    var lbMeta = lb.querySelector('.lb-meta');
    var cur = 0, opener = null;

    function show(i) {
      cur = (i + links.length) % links.length;
      var a = links[cur];
      lbImg.classList.remove('swap'); void lbImg.offsetWidth; lbImg.classList.add('swap');
      lbImg.src = a.getAttribute('href');
      lbImg.width = +a.getAttribute('data-w');
      lbImg.height = +a.getAttribute('data-h');
      lbImg.alt = a.getAttribute('data-no');
      // 编号快切：先闪成黑条，120ms 后换上新编号
      var no = a.getAttribute('data-no');
      if (motionOn && lb.open) {
        lbNo.classList.add('bar');
        clearTimeout(lbNo._t);
        lbNo._t = setTimeout(function () { lbNo.textContent = no; lbNo.classList.remove('bar'); }, 120);
      } else lbNo.textContent = no;
      lbMeta.textContent = (cur + 1) + ' / ' + links.length + '  ·  ' + a.getAttribute('data-size') + ' PX';
      var nx = links[(cur + 1) % links.length];
      if (nx) { var pre = new Image(); pre.src = nx.getAttribute('href'); }
    }

    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        opener = a;
        show(i);
        lb.showModal();
      });
    });
    lb.addEventListener('click', function (e) {
      var step = e.target.closest('[data-lb-step]');
      if (step) { show(cur + (+step.getAttribute('data-lb-step'))); return; }
      if (e.target.closest('[data-lb-close]') || e.target === lb || e.target.classList.contains('lb-stage')) lb.close();
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    });
    lb.addEventListener('close', function () {
      lbImg.removeAttribute('src');
      if (opener) opener.focus();
    });
  }

  /* ---------- 开场装载序列：首页、每个会话一次；点击或按键跳过 ---------- */
  var boot = document.querySelector('.boot');
  var played = true;
  if (boot && motionOn) {
    try { played = sessionStorage.getItem('rl-boot') === '1'; sessionStorage.setItem('rl-boot', '1'); } catch (e) { played = true; }
  }
  if (boot && motionOn && !played) {
    var msg = boot.querySelector('.boot-msg');
    var timers = [], ended = false;
    var say = function (t) { msg.textContent = t; decode(msg, 0); };
    var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
    var finish = function () {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      boot.classList.add('out');
      root.classList.remove('booting');
      arm();
      setTimeout(function () { boot.remove(); }, 700);
      document.removeEventListener('keydown', finish);
    };
    root.classList.add('booting');
    document.body.appendChild(boot); // 移出 .doc 的层叠上下文，盖住报头与装订孔
    boot.hidden = false;
    at(0, function () { say('Access'); });
    at(160, function () { boot.classList.add('s-lock'); });
    at(520, function () { boot.classList.add('s-ring'); say('› Loading archive'); });
    at(1150, function () { say('› ' + boot.dataset.entries + ' entries / ' + boot.dataset.plates + ' plates'); });
    at(1800, function () { say('› Access authorized'); });
    at(2300, function () { boot.classList.add('s-welcome'); });
    at(3400, finish);
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  } else {
    if (boot) boot.remove();
    arm();
  }
})();
