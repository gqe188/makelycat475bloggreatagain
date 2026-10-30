/* lycat475 · 档案册交互：主题切换 / 压印入场 / 网点制版 / 双螺旋 / 灯箱 / 开场 */
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
  /* 大标题、栏目标题、镂空巨字：逐字淡入上滑（拉丁词整体不断行） */
  if (motionOn) document.querySelectorAll('.t-display, .page-title, .t-outline').forEach(function (h) {
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
    // 标题逐字先显成墨条，再依次翻成字（中文的“解码”方式，不做乱码）
    if (!h.classList.contains('t-outline')) {
      var chs = h.querySelectorAll('.ch');
      chs.forEach(function (c) { c.classList.add('bar'); });
      whenSeen(h.closest('[data-rev]') || h, function () {
        chs.forEach(function (c, j) { setTimeout(function () { c.classList.remove('bar'); }, 140 + j * 30); });
      });
    }
    // 不带 data-rev 的（镂空巨字）跟随所在的入场块一起触发
    if (!h.hasAttribute('data-rev')) {
      whenSeen(h.closest('[data-rev]') || h, function () { h.classList.add('in'); });
    }
  });

  /* 镂空巨字逐位解码：每一位先闪乱码，再从左到右依次锁定 */
  var DIGITS = '0123456789#%&*+=/<>';
  function decodeChar(span, lockAt) {
    var final = span.textContent, t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      if (t - t0 >= lockAt) { span.textContent = final; return; }
      span.textContent = DIGITS[Math.floor(hash2(final.charCodeAt(0) + lockAt, Math.floor(t / 40)) * DIGITS.length)];
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (motionOn) document.querySelectorAll('.t-outline').forEach(function (h) {
    whenSeen(h.closest('[data-rev]') || h, function () {
      var cs = h.querySelectorAll('.ch');
      // 先锁住每一位的宽度，乱码字形宽窄不一，不锁会把旁边的图注挤得跳动
      cs.forEach(function (c) { c.style.width = c.getBoundingClientRect().width + 'px'; c.style.textAlign = 'center'; });
      cs.forEach(function (c, i) { decodeChar(c, 420 + i * 160); });
    });
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
        // 中文不做乱码：遇到非拉丁字符就停，它等到被“解锁”时才原样出现
        if (!/[ -~]/.test(txt[i])) break;
        tail += txt[i] === ' ' ? ' ' : GLYPHS[Math.floor(hash2(i + seed * 31, tick) * GLYPHS.length)];
      }
      var rest = txt.slice(solved + tail.length);
      el.innerHTML = esc(txt.slice(0, solved)) + esc(tail) + (rest ? '<span style="visibility:hidden">' + esc(rest) + '</span>' : '');
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (motionOn) {
    var decodeSel = '.t-cover, .rh .no, .rh .ti, .rh .en, .plate-tag, .toc .no, .figcap b, .folio span, .t-cap';
    document.querySelectorAll(decodeSel).forEach(function (el) {
      var txt = el.textContent;
      if (!txt.trim() || el.children.length || !/[A-Za-z0-9]/.test(txt)) return;
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
    whenSeen(dd.closest('[data-rev]') || dd, function () {
      dd.classList.add('roll');
      // 滚完后换回纯文本：小数行高（1.2em）逐行累计会有亚像素偏差，最后几位会歪
      setTimeout(function () { target.textContent = txt; }, 120 + k * 70 + 1150);
    });
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
    // 图片就绪且进入视口后才制版（开场序列期间等待）
    whenSeen(cv, function () {
      p.seen = true;
      if (p.ready) drawHalftone(p, motionOn);
      // 网点显影 780ms 后，清晰原片接着曝光
      var plate = cv.parentNode;
      setTimeout(function () { plate.classList.add('exposed'); }, motionOn ? 1300 : 0);
    });
    img.onload = function () {
      p.ready = true;
      if (p.seen) drawHalftone(p, motionOn);
    };
    img.onerror = p.fallback;
    img.src = cv.getAttribute('data-src');
    plates.push(p);
  });

  /* ---------- 双螺旋背景：滚动时拧转（相位随滚动），并以 0.25 倍速上移 ---------- */
  var hx = document.querySelector('canvas.helix');
  var hctx = hx && hx.getContext ? hx.getContext('2d') : null;
  var hq = false;
  function drawHelix() {
    hq = false;
    if (!hctx || getComputedStyle(hx).display === 'none') return;
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (hx.width !== Math.round(w * dpr) || hx.height !== Math.round(h * dpr)) {
      hx.width = Math.round(w * dpr); hx.height = Math.round(h * dpr);
    }
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hctx.clearRect(0, 0, w, h);
    hctx.strokeStyle = cssVar('--ink');
    var sy = reduce ? 0 : (window.pageYOffset || 0);
    // 拧转放慢：滚一屏（约 900px）转大约 130°；上移 0.2 倍速
    var twist = sy * 0.0025, drift = sy * 0.2;
    // 螺旋居中放在版心外的页边里，振幅随页边宽度收放
    var mar = (w - Math.min(1180, w - 32)) / 2;
    var k = Math.PI * 2 / 560, A = Math.max(12, Math.min(36, mar / 2 - 12)), step = 3, rung = 18;
    var ink = cssVar('--ink');
    [[mar / 2, 0], [w - mar / 2, Math.PI]].forEach(function (side) {
      var cx = side[0], off = side[1];
      function phase(y) { return (y + drift) * k + twist + off; }
      // 一股链在 y 处的横坐标与深度（cos 为正 = 朝向读者）
      function strand(sgn, y) { var t = phase(y); return { x: cx + sgn * A * Math.sin(t), z: sgn * Math.cos(t) }; }
      function strands(front) {
        [1, -1].forEach(function (sgn) {
          for (var y = -step; y < h + step; y += step) {
            var p0 = strand(sgn, y), p1 = strand(sgn, y + step);
            if ((p0.z >= 0) !== front) continue;
            var d = (p0.z + 1) / 2;
            hctx.globalAlpha = front ? 0.12 + 0.1 * d : 0.04 + 0.05 * d;
            hctx.lineWidth = front ? 1.8 + 0.8 * d : 1 + 0.4 * d;
            hctx.beginPath(); hctx.moveTo(p0.x, y); hctx.lineTo(p1.x, y + step); hctx.stroke();
          }
        });
      }
      hctx.strokeStyle = ink; hctx.fillStyle = ink; hctx.lineCap = 'round';
      strands(false);
      // 碱基对：每一档分成两半，各自跟随所连那股链的深度，中间留 3px 缝；两端各一个核苷酸点
      var first = -((drift % rung) + rung) % rung;
      for (var ry = first; ry < h + rung; ry += rung) {
        var a1 = strand(1, ry), a2 = strand(-1, ry);
        if (Math.abs(a1.x - a2.x) < 6) continue;
        var mid = (a1.x + a2.x) / 2, dir = a1.x < mid ? 1 : -1;
        [[a1, 1], [a2, -1]].forEach(function (end) {
          var pt = end[0], d = (pt.z + 1) / 2, toward = pt.x < mid ? 1 : -1;
          hctx.globalAlpha = 0.035 + 0.08 * d;
          hctx.lineWidth = 1.4;
          hctx.beginPath(); hctx.moveTo(pt.x, ry); hctx.lineTo(mid - toward * 1.5, ry); hctx.stroke();
          hctx.globalAlpha = 0.05 + 0.14 * d;
          hctx.beginPath(); hctx.arc(pt.x, ry, 1.2 + 1.2 * d, 0, 6.2832); hctx.fill();
        });
      }
      strands(true);
    });
    hctx.globalAlpha = 1;
  }
  function queueHelix() { if (!hq) { hq = true; requestAnimationFrame(drawHelix); } }
  if (hctx) {
    drawHelix();
    if (!reduce) window.addEventListener('scroll', queueHelix, { passive: true });
    new MutationObserver(queueHelix).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', queueHelix);
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(function () { redrawPlates(); drawHelix(); }, 160);
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

  /* ---------- 网格叠加：按 G 显示 12 栏与 8px 基线，用来自查版式 ---------- */
  var grid = null;
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'g' && e.key !== 'G') || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open], .boot:not([hidden])')) return;
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'grid-overlay';
      grid.setAttribute('aria-hidden', 'true');
      grid.innerHTML = '<div class="cols">' + new Array(13).join('<i></i>') + '</div><div class="base"></div><span class="tag">GRID 12 / 8PX · G</span>';
      grid.hidden = true;
      document.body.appendChild(grid);
    }
    grid.hidden = !grid.hidden;
  });

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
    at(4100, finish);
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  } else {
    if (boot) boot.remove();
    arm();
  }
})();
