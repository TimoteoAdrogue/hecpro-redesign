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
  const pathIn = (svg, d, c) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    if (c) p.dataset.c = c;
    svg.appendChild(p);
    return p;
  };

  // Colour fields: the page takes the colour of the section crossing the middle of the screen.
  const root = document.documentElement, theme = $('meta[name="theme-color"]');
  const fieldIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    root.dataset.field = e.target.dataset.field;
    requestAnimationFrame(() => { theme.content = getComputedStyle(root).getPropertyValue('--bg').trim() || theme.content; });
  }), { rootMargin: '-50% 0px -50% 0px' });
  $$('main [data-field]').forEach(s => fieldIO.observe(s)); // the footer carries its own night background

  // 100-student grid next to the 68 %, filled in a seeded order (crosses = do not make it).
  const matrix = $('[data-matrix]');
  let cells = [];
  if (matrix) {
    const n = +matrix.dataset.n, fail = +matrix.dataset.fail, r = rng(68), order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [order[i], order[k]] = [order[k], order[i]]; }
    const failed = new Set(order.slice(0, fail)), grid = $('.matrix__grid', matrix);
    for (let i = 0; i < n; i++) {
      const m = document.createElement('i');
      m.className = 'm ' + (failed.has(i) ? 'm--x' : 'm--o');
      grid.appendChild(m);
    }
    cells = order.map(i => grid.children[i]);
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

  // One-shot reveals: fades, formulas written in, ticks drawn, code typed.
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('is-in');
    if (typeCode && el.querySelector?.('[data-type]')) typeCode();
    io.unobserve(el);
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .band, [data-axis]').forEach(el => io.observe(el));

  // The 68 % and its grid, driven by one progress value (scroll on desktop and phone, static when calm).
  const statN = $('[data-stat-n]');
  const setStat = p => {
    const on = Math.round(p * cells.length);
    let crossed = 0;
    cells.forEach((c, i) => { const v = i < on; c.classList.toggle('on', v); if (v && c.classList.contains('m--x')) crossed++; });
    if (statN) statN.textContent = crossed;
  };

  // The semester, driven by one progress value: the line, the big week, the lit band, the flag.
  const weekBig = $('[data-weekbig]');
  const bands = $$('.band');
  const setSemester = (p, you) => {
    const wk = Math.min(14, Math.floor(p / .7 * 14) + 1);
    if (weekBig) weekBig.textContent = p < .7 ? `Semaine ${wk}` : p < .9 ? 'Révisions' : 'Session';
    bands.forEach(b => { const s = getComputedStyle(b); b.classList.toggle('is-lit', p >= parseFloat(s.getPropertyValue('--from')) - .001 && p <= parseFloat(s.getPropertyValue('--to')) + .001); });
    if (you) you.classList.toggle('is-on', youAt >= 0 && p >= youAt);
  };

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

  if (!G || calm) { $('.hero__title').style.opacity = 1; setStat(1); if (weekBig) weekBig.textContent = '14 semaines'; return; }

  // Headlines rise line by line (masked): the hero one on load, the others as they enter.
  const h1 = $('.hero__title');
  G.set(h1, { opacity: 1 });
  if (window.SplitText) {
    const rise = (el, onScroll) => SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: s => G.from(s.lines, {
        yPercent: 112, rotation: 2, duration: 1.1, stagger: .08, ease: 'expo.out',
        scrollTrigger: onScroll ? { trigger: el, start: 'top 88%', once: true } : undefined,
      }),
    });
    rise(h1, false);
    $$('main .poster:not(.hero__title)').forEach(el => rise(el, true));
  }

  // Hero sheets: fan apart as the page scrolls, lean toward the pointer on desktop.
  const fan = { 1: { yPercent: -12, rotation: -2.5 }, 2: { yPercent: 8, xPercent: 14, rotation: 4 }, 3: { yPercent: 18, xPercent: -10, rotation: -5 } };
  Object.entries(fan).forEach(([n, to]) => G.to(`.paper--${n} .paper__in`, { ...to, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } }));
  if (fine) {
    const desk = $('.hero__desk'), qx = G.quickTo(desk, 'x', { duration: .9, ease: 'power3' }), qy = G.quickTo(desk, 'y', { duration: .9, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { qx((e.clientX / innerWidth - .5) * -22); qy((e.clientY / innerHeight - .5) * -14); });
  }

  const phone = matchMedia('(max-width: 767px)').matches, short = matchMedia('(max-height: 520px)').matches;

  // Le constat: pinned while the number climbs and the class gets crossed out.
  const initStat = () => {
    if (short) return setStat(1);
    setStat(0);
    ScrollTrigger.create({ trigger: '[data-stat]', start: 'top top', end: '+=110%', pin: true, scrub: true, onUpdate: st => setStat(st.progress) });
  };

  // Matières: the cards run sideways while the section is pinned.
  const initPan = () => {
    const pan = $('[data-hpan]'), track = $('.hpan__track', pan);
    if (!pan || short) return;
    pan.classList.add('is-live');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.subjects', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
  };

  // Le semestre: pinned on desktop while the line runs; on phones the vertical line follows the scroll.
  const initSemester = () => {
    if (!axis) return;
    axis.classList.add('is-scrub');
    const you = $('[data-you]', axis), draw = $('.axis__draw', axis);
    const update = p => { G.set(draw, phone ? { scaleX: 1, scaleY: p } : { scaleX: p }); setSemester(p, you); };
    update(0);
    ScrollTrigger.create(phone || short
      ? { trigger: axis, start: 'top 75%', end: 'bottom 55%', scrub: .5, onUpdate: st => update(st.progress) }
      : { trigger: '[data-semester]', start: 'top top', end: '+=130%', pin: true, scrub: .5, onUpdate: st => update(st.progress) });
  };

  // Avis: the belt of stickers slides left as the page scrolls down.
  const initBelt = () => {
    const belt = $('[data-belt]'), track = $('.avis__track', belt);
    if (!belt) return;
    belt.classList.add('is-live');
    G.fromTo(track, { x: () => innerWidth * .15 }, { x: () => -(track.scrollWidth - innerWidth * .85), ease: 'none', scrollTrigger: { trigger: '.avis', start: 'top bottom', end: 'bottom top', scrub: .5, invalidateOnRefresh: true } });
  };

  // Closing ticker: drifts on its own, speeds up with the scroll and follows its direction.
  const initTicker = () => {
    const row = $('[data-ticker] .ticker__row');
    if (!row) return;
    const st = ScrollTrigger.create({ trigger: '.closing', start: 'top bottom', end: 'bottom top' });
    let x = 0, dir = 1;
    G.ticker.add(() => {
      if (!st.isActive) return;
      const v = st.getVelocity();
      if (v) dir = v < 0 ? -1 : 1;
      x -= (1.1 + Math.min(14, Math.abs(v) / 260)) * dir;
      const half = row.scrollWidth / 2;
      if (x <= -half) x += half; else if (x > 0) x -= half;
      row.style.transform = `translate3d(${x}px,0,0)`;
    });
  };

  // The fiche tour: pinned stage, a camera glides over the real page, a pen frames each box.
  const stage = $('[data-tour]');
  const startTour = () => {
    // too short to pin (phone in landscape): keep the static list with the full page
    if (!stage || short) return;
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
  // Pins are created in page order so each one measures the space left by the previous ones.
  const start = () => { initStat(); startTour(); initPan(); initSemester(); initBelt(); initTicker(); ScrollTrigger.refresh(); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();
