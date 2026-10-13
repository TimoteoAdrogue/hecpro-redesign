(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header turns solid once the hero copy scrolls under it; mobile dock shows between hero and packs.
  const top = $('[data-top]'), dock = $('[data-dock]');
  let pastHero = false;
  const busy = new Set(); // sections with their own CTA or full-screen content: no dock over them
  const syncDock = () => dock.classList.toggle('is-on', pastHero && !busy.size);
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting)).observe($('[data-hero-top]'));
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; syncDock(); }).observe($('[data-hero-end]'));
  const quiet = new IntersectionObserver(es => { es.forEach(e => busy[e.isIntersecting ? 'add' : 'delete'](e.target)); syncDock(); }, { rootMargin: '0px 0px -30% 0px' });
  $$('#apercu .tour__stage, #packs, .closing, .foot').forEach(el => quiet.observe(el));

  // One-shot reveals and highlighter swipes.
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .hl, [data-axis]').forEach(el => io.observe(el));

  // "Tu es ici": week of the semester, only while the semester runs.
  const axis = $('[data-axis]');
  if (axis) {
    const weeks = +axis.dataset.weeks;
    const days = Math.floor((Date.now() - new Date(axis.dataset.start + 'T00:00:00')) / 864e5);
    const wk = Math.floor(days / 7) + 1;
    if (days >= 0 && wk <= weeks) {
      const you = $('[data-you]', axis);
      $('[data-week]', you).textContent = wk;
      you.style.setProperty('--you', ((wk - .5) / weeks * .7).toFixed(4));
      you.hidden = false;
    }
  }

  // Dialogs: mobile menu and the 8-page reader.
  const wire = (dialog, openSel) => {
    $$(openSel).forEach(b => b.addEventListener('click', () => dialog.showModal()));
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.closest('[data-close]') || e.target.closest('a')) dialog.close();
    });
  };
  wire($('[data-menu]'), '[data-open-menu]');
  wire($('[data-reader]'), '[data-open-reader]');

  // The fiche tour: pinned stage, a camera glides over the real page while captions change.
  const stage = $('[data-tour]');
  const start = () => {
    if (calm || !window.gsap || !window.ScrollTrigger || !stage) return;
    gsap.registerPlugin(ScrollTrigger);
    const tour = stage.closest('.tour');
    tour.classList.add('is-live');

    const win = $('.tour__win', stage), cam = $('[data-cam]', stage), spot = $('[data-spot]', stage);
    const pg3 = $('[data-pg="3"]', stage);
    const steps = $$('.tour__steps li', stage);
    const css = getComputedStyle(document.documentElement);
    const tone = li => {
      const t = [...$('.tab', li).classList].find(c => c.startsWith('tab--')).slice(5);
      return t === 'ink' ? 'rgba(0,0,0,0)' : css.getPropertyValue('--' + t).trim();
    };
    const regions = steps.map(li => {
      const [x, y, w, h] = li.dataset.r.split(',').map(Number);
      return { x, y, w, h, page: +li.dataset.page, tone: tone(li) };
    });

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
      return { left: (r.x + pad) * 100 + '%', top: (r.y - pad) * 100 + '%', width: (r.w - 2 * pad) * 100 + '%', height: (r.h + 2 * pad) * 100 + '%', borderColor: r.tone };
    };
    const sizeCam = () => { cam.style.width = win.clientWidth + 'px'; };
    sizeCam();
    ScrollTrigger.addEventListener('refreshInit', sizeCam);

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: () => '+=' + Math.round((steps.length - 1) * innerHeight * .9),
        pin: true, scrub: .6, invalidateOnRefresh: true,
      },
    });
    tl.set(cam, { transformOrigin: '0 0', x: () => pos(0).x, y: () => pos(0).y, scale: () => pos(0).s }, 0)
      .set(spot, box(0), 0)
      .addLabel('s0', 0);
    for (let i = 1; i < steps.length; i++) {
      tl.to(cam, { x: () => pos(i).x, y: () => pos(i).y, scale: () => pos(i).s, duration: 1 }, '+=.6')
        .to(spot, { ...box(i), duration: 1 }, '<')
        .to(steps[i - 1], { autoAlpha: 0, y: -14, duration: .35 }, '<')
        .fromTo(steps[i], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .4 }, '<+=.55');
      if (regions[i].page !== regions[i - 1].page) tl.to(pg3, { opacity: regions[i].page === 3 ? 1 : 0, duration: .45 }, '<-=.5');
      tl.addLabel('s' + i, tl.duration()); // hold point: camera settled, caption shown
    }
    tl.to({}, { duration: .6 });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();
