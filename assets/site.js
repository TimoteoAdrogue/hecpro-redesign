(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  if (G) G.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));

  // Smooth scroll on desktop, driven by GSAP's ticker so pins and scrubs stay in sync.
  let lenis = null;
  if (G && !calm && fine && window.Lenis) {
    lenis = new Lenis({ lerp: .11, anchors: { offset: -80 } });
    lenis.on('scroll', ScrollTrigger.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const scrollToY = y => lenis ? lenis.scrollTo(y, { duration: 1.3 }) : scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' });

  // Hand-drawn shapes: seeded jitter so a frame looks the same on every visit.
  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const f = n => n.toFixed(1);
  const roughRect = (x, y, w, h, seed = 7) => {
    const r = rng(seed), j = a => (r() - .5) * 2 * a, k = Math.min(9, Math.max(2.5, Math.min(w, h) * .045));
    // corners clockwise from top-left, back up the left edge, then a short overshoot along the top
    const p = [[x + j(k), y + j(k)], [x + w + j(k), y + j(k)], [x + w + j(k), y + h + j(k)], [x + j(k), y + h + j(k)], [x + j(k * .6), y + j(k * .6)], [x + Math.min(w * .12, 60), y - k * .5 + j(k * .4)]];
    let d = `M${f(p[0][0])},${f(p[0][1])}`;
    for (let i = 1; i < p.length; i++) {
      const [a, b] = [p[i - 1], p[i]];
      d += `Q${f((a[0] + b[0]) / 2 + j(k))},${f((a[1] + b[1]) / 2 + j(k))} ${f(b[0])},${f(b[1])}`;
    }
    return d;
  };
  const roughEllipse = (cx, cy, rx, ry, seed = 3) => {
    const r = rng(seed), ph = r() * 6, a0 = -2.3, n = 64;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = a0 + i / n * Math.PI * 2.16, q = 1 + .05 * Math.sin(3 * t + ph) + .025 * i / n;
      d += (i ? 'L' : 'M') + f(cx + Math.cos(t) * rx * q) + ',' + f(cy + Math.sin(t) * ry * q);
    }
    return d;
  };
  const pathIn = (svg, d, c) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    if (c) p.dataset.c = c;
    svg.appendChild(p);
    return p;
  };

  // Count-ups start from zero; each keeps its final width so nothing shifts while it climbs.
  if (!calm) $$('[data-count]').forEach(el => { el.style.display = 'inline-block'; el.style.minWidth = el.offsetWidth + 'px'; el.style.textAlign = 'right'; el.textContent = '0'; });

  // [data-annot]: a pen box or red circle drawn around the element when it comes into view.
  $$('[data-annot]').forEach((el, i) => {
    const svg = document.createElementNS(NS, 'svg'), base = +(el.dataset.pad || 10);
    svg.setAttribute('class', 'annot annot--' + (el.dataset.c || 'pen'));
    svg.setAttribute('aria-hidden', 'true');
    const p = pathIn(svg, '');
    const draw = () => {
      const pad = innerWidth < 768 ? Math.round(base * .55) : base; // tighter on phones so it stays off the next words
      const py = el.dataset.annot === 'circle' ? Math.round(pad * .35) : pad; // a circle stays within its own line
      const w = el.offsetWidth + pad * 2, h = el.offsetHeight + py * 2;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      Object.assign(svg.style, { left: -pad + 'px', top: -py + 'px', width: w + 'px', height: h + 'px' });
      p.setAttribute('d', el.dataset.annot === 'circle' ? roughEllipse(w / 2, h / 2, w / 2 - 2, h / 2 - 4, 11 + i) : roughRect(3, 3, w - 6, h - 6, 5 + i));
    };
    el.appendChild(svg);
    new ResizeObserver(draw).observe(el);
  });

  // 100-student grid next to the 68 %: crossed out in red pen, the rest in teal (seeded order).
  const matrix = $('[data-matrix]');
  if (matrix) {
    const n = +matrix.dataset.n, fail = +matrix.dataset.fail, r = rng(68), order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [order[i], order[k]] = [order[k], order[i]]; }
    const failed = new Set(order.slice(0, fail)), grid = $('.matrix__grid', matrix);
    for (let i = 0; i < n; i++) {
      const m = document.createElement('i');
      m.className = 'm ' + (failed.has(i) ? 'm--x' : 'm--o');
      m.style.setProperty('--d', (calm ? 0 : order.indexOf(i) * .013 + .3).toFixed(3) + 's');
      grid.appendChild(m);
    }
    $('.matrix__x', matrix).className = 'm m--x';
    $('.matrix__o', matrix).className = 'm m--o';
  }

  // Header turns solid once the hero copy scrolls under it; mobile dock shows between hero and packs.
  const top = $('[data-top]'), dock = $('[data-dock]');
  let pastHero = false;
  const busy = new Set(); // sections with their own CTA or full-screen content: no dock over them
  const syncDock = () => dock.classList.toggle('is-on', pastHero && !busy.size);
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting)).observe($('[data-hero-top]'));
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; syncDock(); }).observe($('[data-hero-end]'));
  const quiet = new IntersectionObserver(es => { es.forEach(e => busy[e.isIntersecting ? 'add' : 'delete'](e.target)); syncDock(); }, { rootMargin: '0px 0px -30% 0px' });
  $$('#apercu .tour__stage, #packs, .closing, .foot').forEach(el => quiet.observe(el));

  const count = el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1400;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Typed code in the Informatique tile.
  const typer = code => {
    const nodes = [];
    const walk = n => n.nodeType === 3 ? nodes.push([n, n.data]) : n.childNodes.forEach(walk);
    walk(code);
    nodes.forEach(([n]) => { n.data = ''; });
    const total = nodes.reduce((a, [, t]) => a + t.length, 0);
    return () => {
      let i = 0;
      code.classList.add('is-typing');
      const tick = () => {
        let left = ++i;
        for (const [n, t] of nodes) { n.data = t.slice(0, Math.max(0, Math.min(t.length, left))); left -= t.length; }
        if (i < total) setTimeout(tick, 34); else setTimeout(() => code.classList.remove('is-typing'), 900);
      };
      setTimeout(tick, 500);
    };
  };
  const typeCode = !calm && $('[data-type]') ? typer($('[data-type]')) : null;

  // One-shot reveals: fades, highlighter swipes, pen drawings, counters, typing.
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('is-in');
    if (el.hasAttribute('data-annot') && !el.hasAttribute('data-manual')) el.classList.add('is-drawn');
    if (el.classList.contains('packs__grid')) el.classList.add('is-seen');
    if (!calm && el.dataset.count) count(el);
    if (typeCode && el.querySelector?.('[data-type]')) typeCode();
    io.unobserve(el);
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .hl, .band, [data-axis], [data-annot]:not([data-manual]), [data-count], .packs__grid, [data-matrix]').forEach(el => io.observe(el));

  // "Tu es ici": week of the semester, only while the semester runs.
  const axis = $('[data-axis]');
  let youAt = -1;
  if (axis) {
    const weeks = +axis.dataset.weeks;
    const days = Math.floor((Date.now() - new Date(axis.dataset.start + 'T00:00:00')) / 864e5);
    const wk = Math.floor(days / 7) + 1;
    if (days >= 0 && wk <= weeks) {
      const you = $('[data-you]', axis);
      youAt = (wk - .5) / weeks * .7;
      $('[data-week]', you).textContent = wk;
      you.style.setProperty('--you', youAt.toFixed(4));
      you.hidden = false;
    }
  }

  // Dialogs: mobile menu and the 8-page reader. Smooth scroll pauses while one is open.
  const wire = (dialog, openSel) => {
    $$(openSel).forEach(b => b.addEventListener('click', () => { dialog.showModal(); lenis?.stop(); }));
    dialog.addEventListener('close', () => lenis?.start());
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.closest('[data-close]') || e.target.closest('a')) { lenis?.start(); dialog.close(); }
    });
  };
  wire($('[data-menu]'), '[data-open-menu]');
  wire($('[data-reader]'), '[data-open-reader]');

  // Hero: pen frame on the top sheet once the stack has landed.
  const heroInk = $('[data-hero-ink]');
  if (heroInk) {
    const svg = $('.ink', heroInk), [x, y, w, h] = svg.dataset.rect.split(',').map(Number);
    pathIn(svg, roughRect(x, y, w, h, 21));
    setTimeout(() => heroInk.classList.add('is-drawn'), calm ? 0 : 1500);
  }

  if (!G || calm) { $('.hero .display').style.opacity = 1; return; }

  // Headlines rise line by line (masked): the hero one on load, the others as they enter.
  const h1 = $('.hero .display');
  G.set(h1, { opacity: 1 });
  if (window.SplitText) {
    const rise = (el, onScroll) => SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      // a split rebuilds the line markup, so highlighter marks inside are re-triggered from here
      onSplit: s => G.from(s.lines, {
        yPercent: 108, duration: 1.15, stagger: .09, ease: 'expo.out',
        scrollTrigger: onScroll ? { trigger: el, start: 'top 88%', once: true } : undefined,
        onStart: () => $$('.hl', el).forEach(m => m.classList.add('is-in')),
      }),
    });
    rise(h1, false);
    $$('main .h2, .closing .display').forEach(el => rise(el, true));
  }

  // Hero sheets: fan apart as the page scrolls, lean toward the pointer on desktop.
  const fan = { 1: { yPercent: -12, rotation: -2.5 }, 2: { yPercent: 8, xPercent: 14, rotation: 4 }, 3: { yPercent: 18, xPercent: -10, rotation: -5 } };
  Object.entries(fan).forEach(([n, to]) => G.to(`.paper--${n} .paper__in`, { ...to, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } }));
  if (fine) {
    const desk = $('.hero__desk'), qx = G.quickTo(desk, 'x', { duration: .9, ease: 'power3' }), qy = G.quickTo(desk, 'y', { duration: .9, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { qx((e.clientX / innerWidth - .5) * -22); qy((e.clientY / innerHeight - .5) * -14); });
  }

  // Closing: the sheets from the hero drift back in as a bookend.
  [['.closing__sheet--l img', -60], ['.closing__sheet--r img', 70]].forEach(([sel, y]) => G.fromTo(sel, { y: -y }, { y, ease: 'none', scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom top', scrub: .6 } }));

  // Semester axis fills with the scroll; the "Tu es ici" flag pops when the line reaches it.
  if (axis) {
    axis.classList.add('is-scrub');
    const you = $('[data-you]', axis);
    const down = matchMedia('(max-width: 767px)').matches; // phones: the line runs down the page
    G.fromTo($('.axis__draw', axis), down ? { scaleX: 1, scaleY: 0 } : { scaleX: 0 }, { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: {
      trigger: axis, start: 'top 78%', end: 'bottom 62%', scrub: .5,
      onUpdate: st => you.classList.toggle('is-on', youAt >= 0 && st.progress >= youAt),
    } });
  }

  // The fiche tour: pinned stage, a camera glides over the real page, a pen frames each box.
  const stage = $('[data-tour]');
  const startTour = () => {
    // too short to pin (phone in landscape): keep the static list with the full page
    if (!stage || matchMedia('(max-height: 520px)').matches) return;
    stage.closest('.tour').classList.add('is-live');

    const win = $('.tour__win', stage), cam = $('[data-cam]', stage), spot = $('[data-spot]', stage), ink = $('[data-ink]', stage);
    const pg3 = $('[data-pg="3"]', stage);
    const steps = $$('.tour__steps li', stage), dots = $$('.tour__index button', stage);
    const regions = steps.map(li => {
      const [x, y, w, h] = li.dataset.r.split(',').map(Number);
      return { x, y, w, h, page: +li.dataset.page, c: $('.tab', li).dataset.c };
    });
    const frames = regions.map((r, i) => i === 0 ? null :
      pathIn(ink, roughRect((r.x + .008) * 1083, (r.y - .005) * 1726, (r.w - .016) * 1083, (r.h + .01) * 1726, 30 + i), r.c));

    // Camera position for a region, in px, from the window's current size.
    const pos = i => {
      const W = win.clientWidth, H = win.clientHeight, P = W * 1726 / 1083;
      const r = regions[i];
      const whole = Math.min(1, H * .96 / P);
      const s = i === 0 ? whole : Math.min(1.9, Math.max(whole, Math.min(.97 / r.w, H * .8 / (r.h * P))));
      const fit = (size, view, c) => size * s <= view ? (view - size * s) / 2 : Math.min(0, Math.max(view - size * s, view / 2 - s * c));
      return { s, x: fit(W, W, (r.x + r.w / 2) * W), y: fit(P, H, (r.y + r.h / 2) * P) };
    };
    const box = i => {
      const r = regions[i], pad = i === 0 ? 0 : .006;
      return { left: (r.x + pad) * 100 + '%', top: (r.y - pad) * 100 + '%', width: (r.w - 2 * pad) * 100 + '%', height: (r.h + 2 * pad) * 100 + '%' };
    };
    const sizeCam = () => { cam.style.width = win.clientWidth + 'px'; };
    sizeCam();
    ScrollTrigger.addEventListener('refreshInit', sizeCam);

    const setDot = i => dots.forEach((d, k) => k === i ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current'));
    const tl = G.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: () => '+=' + Math.round((steps.length - 1) * innerHeight * .9),
        pin: true, scrub: .6, invalidateOnRefresh: true,
      },
      onUpdate() {
        const t = this.time() + .45;
        setDot(Math.max(0, steps.findLastIndex((_, i) => this.labels['s' + i] <= t)));
      },
    });
    tl.set(cam, { transformOrigin: '0 0', x: () => pos(0).x, y: () => pos(0).y, scale: () => pos(0).s }, 0)
      .set(spot, box(0), 0)
      .addLabel('s0', 0);
    for (let i = 1; i < steps.length; i++) {
      const m = tl.duration() + .6; // hold on the previous step, then move
      tl.to(cam, { x: () => pos(i).x, y: () => pos(i).y, scale: () => pos(i).s, duration: 1 }, m)
        .to(spot, { ...box(i), duration: 1 }, m)
        .to(steps[i - 1], { autoAlpha: 0, y: -14, duration: .35 }, m)
        .fromTo(steps[i], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .4 }, m + .55)
        .fromTo(frames[i], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .75, ease: 'power1.inOut' }, m + .45);
      if (frames[i - 1]) tl.to(frames[i - 1], { opacity: 0, duration: .3 }, m);
      if (regions[i].page !== regions[i - 1].page) tl.to(pg3, { opacity: regions[i].page === 3 ? 1 : 0, duration: .45 }, m + .05);
      tl.addLabel('s' + i, tl.duration()); // camera settled, frame drawn, caption shown
    }
    tl.to({}, { duration: .6 });
    setDot(0);

    // Step index: jump straight to a step.
    dots.forEach((d, i) => d.addEventListener('click', () => {
      const st = tl.scrollTrigger;
      scrollToY(st.start + (st.end - st.start) * tl.labels['s' + i] / tl.duration() + 2);
    }));
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  };
  if (document.readyState === 'complete') startTour(); else addEventListener('load', startTour, { once: true });
})();
