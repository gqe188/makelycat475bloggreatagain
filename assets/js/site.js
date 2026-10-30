/* lycat475 · 终末地交互：深浅切换 / 读数落定 / 视差 / 进入视口才入场 / 灯箱 / 网格 / 启动页
   读数、深浅揭幕、视差改写自终末地套件 fx.js；减弱动效时一律直接到终态。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MECH = 'cubic-bezier(0.7, 0, 0.2, 1)';

  /* ---------- 读数落定：数字和字母从左往右滚动后锁定 ---------- */
  function stand(ch) {
    if (/\d/.test(ch)) return String(Math.floor(Math.random() * 10));
    if (/[A-Za-z]/.test(ch)) return String.fromCharCode((ch < 'a' ? 65 : 97) + Math.floor(Math.random() * 26));
    return ch;
  }
  var running = new WeakMap();
  function scramble(el, ms) {
    if (still) return;
    ms = ms || 360;
    var before = running.get(el);
    if (before) cancelAnimationFrame(before.frame);
    var nodes = before ? before.nodes : textNodes(el).map(function (n) { return { n: n, final: n.data }; });
    var final = nodes.map(function (x) { return x.final; }).join('');
    if (!/[0-9A-Za-z]/.test(final)) return;
    var labelled = before ? before.labelled : el.hasAttribute('aria-label');
    if (!labelled) el.setAttribute('aria-label', final.trim());
    var started = performance.now();
    var state = { nodes: nodes, labelled: labelled, frame: 0 };
    running.set(el, state);
    function step(now) {
      var done = Math.min(1, (now - started) / ms);
      var locked = Math.floor(done * final.length);
      nodes.forEach(function (x) {
        var keep = Math.max(0, Math.min(x.final.length, locked));
        x.n.data = x.final.slice(0, keep) + Array.from(x.final.slice(keep)).map(stand).join('');
        locked -= x.final.length;
      });
      if (done < 1) state.frame = requestAnimationFrame(step);
      else {
        nodes.forEach(function (x) { x.n.data = x.final; });
        if (!labelled) el.removeAttribute('aria-label');
        running.delete(el);
      }
    }
    state.frame = requestAnimationFrame(step);
  }
  function textNodes(el) {
    var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) out.push(walk.currentNode);
    return out;
  }
  function settleReadouts() {
    var load = Array.prototype.slice.call(document.querySelectorAll('[data-fx-load]'));
    var gap = load.length > 1 ? Math.min(40, 180 / (load.length - 1)) : 0;
    load.forEach(function (el, i) { setTimeout(function () { scramble(el, 600); }, 120 + i * gap); });
  }
  document.querySelectorAll('[data-fx-host]').forEach(function (host) {
    function run() { host.querySelectorAll('[data-fx]').forEach(function (el) { scramble(el); }); }
    host.addEventListener('pointerenter', run);
    host.addEventListener('focus', run);
  });

  /* ---------- 深浅切换：从按钮处圆形揭幕 ---------- */
  var system = window.matchMedia('(prefers-color-scheme: dark)');
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-theme-toggle]'));
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : system.matches; }
  function syncTheme() { toggles.forEach(function (b) { b.setAttribute('aria-pressed', String(isDark())); }); }
  function flip() {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    syncTheme();
  }
  toggles.forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (still || !document.startViewTransition) return flip();
      var box = b.getBoundingClientRect();
      var x = e.clientX || box.left + box.width / 2, y = e.clientY || box.top + box.height / 2;
      var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('ef-theming');
      var t = document.startViewTransition(flip);
      t.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: Math.max(240, Math.min(600, r / 3)), easing: MECH, pseudoElement: '::view-transition-new(root)' }
        );
      });
      t.finished.finally(function () { root.classList.remove('ef-theming'); });
    });
  });
  if (system.addEventListener) system.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- 首屏视差：指针移动时画框与影子反向错开 ---------- */
  var hero = document.querySelector('[data-hero]');
  if (hero && !still && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var box = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - box.left) / box.width - 0.5).toFixed(3));
      hero.style.setProperty('--my', ((e.clientY - box.top) / box.height - 0.5).toFixed(3));
    });
  }

  /* ---------- 入场：首屏之外的进入视口才开始 ---------- */
  var ins = Array.prototype.slice.call(document.querySelectorAll('.ef-in-come, .ef-in-power'));
  function armEntrances() {
    if (still || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('ef-wait'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    ins.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('ef-wait'); io.observe(el); }
    });
  }

  /* ---------- 灯箱 ---------- */
  var lb = document.querySelector('dialog.lb');
  var shots = Array.prototype.slice.call(document.querySelectorAll('a[data-lb]'));
  if (lb && shots.length && typeof lb.showModal === 'function') {
    var lbImg = lb.querySelector('.lb-stage img');
    var lbNo = lb.querySelector('.lb-no');
    var lbMeta = lb.querySelector('.lb-meta');
    var cur = 0, opener = null;
    var show = function (i) {
      cur = (i + shots.length) % shots.length;
      var a = shots[cur];
      lbImg.classList.remove('swap'); void lbImg.offsetWidth; lbImg.classList.add('swap');
      lbImg.src = a.getAttribute('href');
      lbImg.width = +a.getAttribute('data-w');
      lbImg.height = +a.getAttribute('data-h');
      lbImg.alt = a.getAttribute('data-no');
      lbNo.textContent = a.getAttribute('data-no');
      lbMeta.textContent = (cur + 1) + ' / ' + shots.length + ' │ ' + a.getAttribute('data-size');
      scramble(lbNo, 240);
      var nx = shots[(cur + 1) % shots.length];
      if (nx) { var pre = new Image(); pre.src = nx.getAttribute('href'); }
    };
    shots.forEach(function (a, i) {
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
      if (e.target.closest('[data-lb-close]') || e.target === lb) lb.close();
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

  /* ---------- 网格叠加：按 G 显示 8px 网格，用来自查对齐 ---------- */
  var grid = null;
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'g' && e.key !== 'G') || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open]') || root.classList.contains('booting')) return;
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'grid-overlay';
      grid.setAttribute('aria-hidden', 'true');
      grid.innerHTML = '<span class="ef-tag">GRID 8PX │ G</span>';
      grid.hidden = true;
      document.body.appendChild(grid);
    }
    grid.hidden = !grid.hidden;
  });

  /* ---------- 启动页：首页、每会话一次；进度来自真实加载（字体 + 首屏报头图） ---------- */
  var boot = document.querySelector('.boot');
  function start() {
    armEntrances();
    settleReadouts();
  }
  if (boot && root.classList.contains('booting')) {
    try { sessionStorage.setItem('ef-boot', '1'); } catch (e) {}
    document.body.appendChild(boot);
    boot.hidden = false;
    var bar = boot.querySelector('.ef-progress');
    var readout = boot.querySelector('.readout');
    var tasks = [];
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);
    // 只等首屏真正要加载的图（懒加载的图在启动页盖着时不会开始加载）
    document.querySelectorAll('.hero img:not([loading="lazy"])').forEach(function (img) {
      if (img.complete) return;
      tasks.push(new Promise(function (ok) { img.addEventListener('load', ok); img.addEventListener('error', ok); }));
    });
    var total = Math.max(1, tasks.length), done = 0, shown = 0, t0 = performance.now(), ended = false;
    tasks.forEach(function (p) { p.then(function () { done++; }); });
    // 进度连续推进（每帧追向真实进度），至少显示 0.8 秒，避免一闪而过
    var tick = setInterval(function () {
      var target = Math.min(done / total, (performance.now() - t0) / 800);
      if (shown < target) shown = Math.min(target, shown + 0.03);
      bar.style.setProperty('--p', shown.toFixed(4));
      readout.textContent = ('00' + Math.round(shown * 100)).slice(-3) + '%';
      if (shown >= 1) finish();
    }, 16);
    // 最多等 4 秒：网络慢时不让人干等
    var cap = setTimeout(function () { done = total; }, 4000);
    var finish = function () {
      if (ended) return;
      ended = true;
      clearInterval(tick); clearTimeout(cap);
      bar.style.setProperty('--p', '1');
      readout.textContent = '100%';
      setTimeout(function () {
        boot.classList.add('out');
        root.classList.remove('booting');
        start();
        setTimeout(function () { boot.remove(); }, 380);
      }, 160);
    };
    boot.querySelector('.skip-boot').addEventListener('click', function () { done = total; shown = 1; finish(); });
  } else {
    if (boot) boot.remove();
    root.classList.remove('booting');
    start();
  }
})();
