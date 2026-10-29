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
  // fixed table: reading the computed colour here would force a full style recalc on every switch
  const fieldHex = { teal: '#14BDB6', coral: '#F07167', chalk: matchMedia('(prefers-color-scheme: dark)').matches ? '#0B2C36' : '#FAF7EA', night: '#05222C', peach: '#FED9B7', ocean: '#00657F' };
  const fieldIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || root.dataset.field === e.target.dataset.field) return;
    root.dataset.field = e.target.dataset.field;
    theme.content = fieldHex[root.dataset.field] || theme.content;
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
    // legend swatches (only the ones the caption actually has)
    $$('.matrix__x', matrix).forEach(s => { s.className = 'm m--x on'; });
    $$('.matrix__o', matrix).forEach(s => { s.className = 'm m--o on'; });
  }

  // Header turns solid once the hero copy scrolls under it; mobile dock shows between hero and packs.
  const top = $('[data-top]'), dock = $('[data-dock]');
  let pastHero = false;
  const busy = new Set(); // sections with their own CTA or full-screen content: no dock over them
  const syncDock = () => dock.classList.toggle('is-on', pastHero && !busy.size);
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting)).observe($('[data-hero-top]'));
  // watch the whole hero, not a 1px marker: a jump (menu link, shared link) from the hero to anywhere still registers
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; syncDock(); }).observe($('.hero'));
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
  // Only touch the cells and the number that actually change (scroll handlers run every frame).
  const crossedUpTo = []; // crossedUpTo[i] = crosses among the first i + 1 cells
  cells.reduce((n, c, i) => (crossedUpTo[i] = n + (c.classList.contains('m--x') ? 1 : 0)), 0);
  let statOn = -1;
  const setStat = p => {
    const on = Math.round(p * cells.length);
    if (on === statOn) return;
    const [a, b] = statOn < 0 ? [0, cells.length] : [Math.min(on, statOn), Math.max(on, statOn)];
    for (let i = a; i < b; i++) cells[i].classList.toggle('on', i < on);
    statOn = on;
    if (statN) statN.textContent = on ? crossedUpTo[on - 1] : 0;
  };

  // The semester, driven by one progress value: the line runs over the weeks, the big counter follows
  // (Semaine 1 to 14, Révisions, Session), each block lights up during its period, and "Tu es ici" turns on.
  const weekBig = $('[data-weekbig]');
  const bands = $$('.band').map(b => { const s = getComputedStyle(b); return [b, parseFloat(s.getPropertyValue('--from')), parseFloat(s.getPropertyValue('--to'))]; });
  const marks = $$('.axis__marks li').map(li => [li, parseFloat(li.style.getPropertyValue('--at'))]);
  let weekTxt = '';
  const setSemester = (p, you) => {
    axis.style.setProperty('--p', p.toFixed(4)); // playhead
    marks.forEach(([li, at]) => li.classList.toggle('is-past', p >= at - .001));
    const wk = Math.min(14, Math.floor(p / .7 * 14) + 1);
    const txt = p < .7 ? `Semaine ${wk}` : p < .9 ? 'Révisions' : 'Session';
    if (weekBig && txt !== weekTxt) weekBig.textContent = weekTxt = txt;
    bands.forEach(([b, from, to]) => b.classList.toggle('is-lit', p >= from - .001 && p <= to + .001));
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

  // Hero sheets enter only once their picture is decoded: no white card falling, no pop-in.
  $$('.hero .paper').forEach(pp => {
    const img = $('img', pp), ready = () => pp.classList.add('is-ready');
    (img.decode ? img.decode() : Promise.resolve()).then(ready, ready);
  });
  setTimeout(() => $$('.hero .paper').forEach(pp => pp.classList.add('is-ready')), 2500);
  // The reader's other pages are fetched quietly once the page is idle.
  addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => $$('.reader img, .closing__sheet img').forEach(i => { i.loading = 'eager'; i.decode?.().catch(() => {}); }), { timeout: 4000 }), { once: true });

  // In-page links keep the address bar in step (the link can be shared), and the skip link moves focus.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return;
    history.replaceState(null, '', a.getAttribute('href'));
    if (a.classList.contains('skip')) $('#contenu').focus({ preventScroll: true });
  });

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
  // Split after the brand font is in, so lines are measured once and never re-split mid-scroll.
  const h1 = $('.hero__title');
  const fontsIn = Promise.race([document.fonts.load('900 40px "Mona Sans"').then(() => document.fonts.ready), new Promise(r => setTimeout(r, 1800))]);
  fontsIn.then(() => { G.set(h1, { opacity: 1 }); if (!window.SplitText) return;
    const rise = (el, onScroll) => SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: s => G.from(s.lines, {
        yPercent: 112, rotation: 2, duration: 1.1, stagger: .08, ease: 'expo.out',
        scrollTrigger: onScroll ? { trigger: el, start: 'top 88%', once: true } : undefined,
      }),
    });
    rise(h1, false);
    $$('main .poster:not(.hero__title)').forEach(el => rise(el, true));
  });

  // Hero sheets: as the hero leaves, they tip back in 3D and slide down across the edge, so their
  // tips land on the next slide (under its text) before they glide away. Depth differs per sheet.
  const slide = (phoneish => ({
    1: { y: () => innerHeight * (phoneish ? .22 : .46), z: 140, rotationX: 48, rotationZ: -13, xPercent: -10 },
    2: { y: () => innerHeight * (phoneish ? .16 : .36), z: 50, rotationX: 40, rotationZ: 15, xPercent: 22 },
    3: { y: () => innerHeight * (phoneish ? .1 : .26), z: -70, rotationX: 32, rotationZ: -22, xPercent: -34 },
  }))(matchMedia('(max-width: 767px)').matches);
  Object.entries(slide).forEach(([n, to]) => G.to(`.paper--${n} .paper__in`, { ...to, transformPerspective: 1100, ease: 'power1.in', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8, invalidateOnRefresh: true } }));
  if (fine) {
    const tilt = $('.desk__tilt'), ry = G.quickTo(tilt, 'rotationY', { duration: 1.1, ease: 'power3' }), rx = G.quickTo(tilt, 'rotationX', { duration: 1.1, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { ry((e.clientX / innerWidth - .5) * 16); rx((e.clientY / innerHeight - .5) * -10); });
  }

  const phone = matchMedia('(max-width: 767px)').matches, short = matchMedia('(max-height: 520px)').matches;

  // Le constat: pinned while the number climbs and the class gets crossed out.
  const initStat = () => {
    if (short) return setStat(1);
    setStat(0);
    // the count starts while the slide comes up, so it never rests on 0 % and peaks soon after it pins
    ScrollTrigger.create({ trigger: '[data-stat]', start: 'top top', end: '+=75%', pin: true });
    ScrollTrigger.create({ trigger: '[data-stat]', start: 'top 70%', end: () => '+=' + Math.round(innerHeight * 1.15), scrub: true, onUpdate: st => setStat(st.progress) });
  };

  // Matières: the cards run sideways while the section is pinned.
  const initPan = () => {
    const pan = $('[data-hpan]'), track = $('.hpan__track', pan);
    if (!pan || short) return;
    pan.classList.add('is-live');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.subjects', start: 'top top', end: () => '+=' + Math.round(dist() * .8), pin: true, scrub: .6, invalidateOnRefresh: true } });
    // keyboard: focusing a link in a card that is off screen scrolls the page to that card
    pan.addEventListener('focusin', e => {
      const card = e.target.closest('.subj'); if (!card) return;
      const st = tw.scrollTrigger, want = Math.min(1, Math.max(0, (card.offsetLeft - innerWidth * .3) / dist()));
      scrollToY(st.start + (st.end - st.start) * want);
    });
  };

  // Le semestre: pinned on desktop while the line runs; on phones the vertical line follows the scroll.
  const initSemester = () => {
    if (!axis) return;
    axis.classList.add('is-scrub');
    const draw = $('.axis__draw', axis);
    const you = $('[data-you]', axis);
    const update = p => { G.set(draw, phone ? { scaleX: 1, scaleY: p } : { scaleX: p }); setSemester(p, you); };
    update(0);
    ScrollTrigger.create(phone || short
      ? { trigger: axis, start: 'top 75%', end: 'bottom 55%', scrub: .5, onUpdate: st => update(st.progress) }
      : { trigger: '[data-semester]', start: 'top top', end: '+=95%', pin: true, scrub: .5, onUpdate: st => update(st.progress) });
    // when the timeline is a little taller than the screen, the pinned view pans down with the weeks,
    // so the exam block (week 9 to the session) is seen while the week counter stays on screen
    const inner = $('.semester__pin > .wrap'), pinEl = $('[data-semester]');
    const pan = () => { // never further than keeps the counter 12px under the header
      const wkTop = weekBig.getBoundingClientRect().top - pinEl.getBoundingClientRect().top - G.getProperty(inner, 'y');
      return -Math.max(0, Math.min(pinEl.offsetHeight - innerHeight, wkTop - $('.top').offsetHeight - 12));
    };
    if (!(phone || short)) G.to(inner, { y: pan, ease: 'none',
      scrollTrigger: { trigger: '[data-semester]', start: 'top top', end: '+=95%', scrub: .5, invalidateOnRefresh: true } });
  };

  // Avis: the belt of stickers slides left as the page scrolls down.
  const initBelt = () => {
    const belt = $('[data-belt]'), track = $('.avis__track', belt);
    if (!belt) return;
    belt.classList.add('is-live');
    G.fromTo(track, { x: () => innerWidth * .15 }, { x: () => -(track.scrollWidth - innerWidth * .85), ease: 'none', scrollTrigger: { trigger: '.avis', start: 'top bottom', end: 'bottom top', scrub: .5, invalidateOnRefresh: true } });
  };

  // Tickers (hero and closing): drift on their own, speed up with the scroll and follow its direction.
  // The hero one arrives fast on load and settles into the drift (data-kick).
  const initTicker = () => $$('[data-ticker]').forEach(t => {
    const row = $('.ticker__row', t);
    const st = ScrollTrigger.create({ trigger: t.closest('section') || t, start: 'top bottom', end: 'bottom top' });
    let x = 0, dir = 1, half = row.scrollWidth / 2, kick = 'kick' in t.dataset ? 34 : 0;
    ScrollTrigger.addEventListener('refresh', () => { half = row.scrollWidth / 2; });
    G.ticker.add(() => {
      if (!st.isActive) return;
      const v = st.getVelocity();
      if (v) dir = v < 0 ? -1 : 1;
      x -= (1.1 + kick + Math.min(14, Math.abs(v) / 260)) * dir;
      kick *= .95;
      if (x <= -half) x += half; else if (x > 0) x -= half;
      row.style.transform = `translate3d(${x}px,0,0)`;
    });
  });

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
        trigger: stage, start: 'top top', end: () => '+=' + Math.round((steps.length - 1) * innerHeight * .65),
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
  };
  // Closing: the sheets rise back in on the right as the page ends.
  const initCloser = () => {
    [['.closing__sheet--a img', 140, -6], ['.closing__sheet--b img', 220, 8], ['.closing__sheet--c img', 300, -3]].forEach(([sel, y, r]) =>
      G.fromTo(sel, { y, rotation: r, transformPerspective: 1100, rotationX: 28 }, { y: 0, rotation: 0, rotationX: 0, ease: 'none', scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom bottom', scrub: .8 } }));
  };

  // Pins are created in page order so each one measures the space left by the previous ones.
  // One init per frame, then one measuring pass: no single long task if the visitor is already scrolling.
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  const start = () => fontsIn.then(async () => {
    for (const init of [initStat, startTour, initPan, initSemester, initBelt, initTicker]) { init(); await nextFrame(); }
    initCloser(); await nextFrame();
    ScrollTrigger.refresh();
    // a shared link (/#packs) is honoured once the pins exist: the browser's own jump happened before they did
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) {
      await nextFrame();
      lenis?.resize(); // its cached page height predates the pin spacers and would clamp the jump
      const y = target.getBoundingClientRect().top + scrollY - 80;
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y);
    }
  });
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();
