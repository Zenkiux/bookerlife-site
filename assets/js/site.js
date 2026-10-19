// BookerLife site. Progressive enhancement only: every page reads fine
// without this file. Motion follows one language (see site.css): a long,
// critically damped settle for things arriving, the app's precise curve for
// UI, transforms and opacity only, and nothing moves under reduced motion.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const SETTLE = "cubic-bezier(.16, 1, .3, 1)";

  /* Navigation: a quiet background once the page scrolls, a menu on phones,
     and the current section marked in the bar. */
  const nav = $("[data-nav]");
  if (nav) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { nav.classList.toggle("is-scrolled", scrollY > 8); ticking = false; });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const btn = $("[data-menu]", nav);
    const links = $("#nav-links", nav);
    const setOpen = open => {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.querySelector(".sr-only").textContent = open ? "Close menu" : "Menu";
    };
    btn?.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    links?.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    addEventListener("keydown", e => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    document.addEventListener("click", e => { if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false); });
  }

  // Scroll spy for any link with data-spy="<section id>".
  const spies = $$("[data-spy]");
  if (spies.length && "IntersectionObserver" in window) {
    const byId = new Map(spies.map(a => [a.dataset.spy, a]));
    const visible = new Set();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
      const order = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const current = order.find(el => visible.has(el.id));
      for (const [id, a] of byId) id === current?.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
    }, { rootMargin: "-18% 0px -72% 0px" });
    for (const id of byId.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
  }

  /* Reveals: only elements that ask for it, once each. */
  const revealables = $$("[data-reveal], [data-chart], [data-page-reveal], [data-stage]");
  const reveal = el => el.classList.add("is-in");
  if (reduce.matches || !("IntersectionObserver" in window)) revealables.forEach(reveal);
  else {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealables.forEach(el => io.observe(el));
  }

  // Hero books settle in one after another.
  $$(".hero .book").forEach((b, i) => b.style.setProperty("--i", i));

  /* Signature shelf: looks, sorting and taking a book down. */
  const stage = $("[data-stage]");
  if (stage) {
    const shelf = $("[data-shelf]", stage);
    const rows = $$("[data-row]", stage);
    const controls = $("[data-shelf-controls]");
    const detail = $("[data-detail]");
    const lookName = $("[data-look-name]");
    const books = () => rows.flatMap(r => [...r.children]);
    const handOrder = books();
    controls.hidden = false;
    detail.hidden = false;
    handOrder.forEach((b, i) => b.style.setProperty("--i", i));
    stage.addEventListener("transitionend", () => stage.classList.add("is-settled"), { once: true });

    const press = (group, btn) => $$("button", group).forEach(b => b.setAttribute("aria-pressed", String(b === btn)));

    $("[data-looks]").addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      press(e.currentTarget, btn);
      shelf.dataset.look = btn.dataset.look;
      lookName.textContent = `${btn.firstChild.textContent.trim()}: ${btn.dataset.name}${btn.dataset.look === "gallery" ? "" : ". Included with Plus."}`;
    });

    const hue = hex => {
      const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
      if (d < 0.08) return 400 + l * 100; // greys and creams sort after the colours, dark to light
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const surname = s => s.split(" ").pop();
    const sorts = {
      hand: () => handOrder.slice(),
      author: () => books().sort((a, b) => surname(a.dataset.author).localeCompare(surname(b.dataset.author)) || a.dataset.title.localeCompare(b.dataset.title)),
      title: () => books().sort((a, b) => a.dataset.title.replace(/^The /, "").localeCompare(b.dataset.title.replace(/^The /, ""))),
      colour: () => books().sort((a, b) => hue(a.dataset.color) - hue(b.dataset.color)),
      height: () => books().sort((a, b) => b.dataset.h - a.dataset.h),
    };

    // FLIP: measure, move the nodes, then play each book from where it was.
    const reorder = order => {
      const first = new Map(books().map(b => [b, b.getBoundingClientRect()]));
      const half = Math.ceil(order.length / 2);
      order.forEach((b, i) => rows[i < half ? 0 : 1].appendChild(b));
      if (reduce.matches) return;
      order.forEach((b, i) => {
        const a = first.get(b), z = b.getBoundingClientRect();
        const dx = a.left - z.left, dy = a.top - z.top;
        if (!dx && !dy) return;
        b.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 700, delay: Math.min(i * 12, 240), easing: SETTLE, fill: "backwards" });
      });
    };
    $("[data-sorts]").addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      press(e.currentTarget, btn);
      reorder(sorts[btn.dataset.sort]());
    });

    const show = li => {
      const d = li.dataset;
      detail.innerHTML = `<img src="assets/covers/${d.k}.jpg" alt="" width="84">
        <div><h3>${d.title}</h3><p class="by">${d.author}</p>
        <dl><div><dt>Pages</dt><dd>${d.pages}</dd></div><div><dt>First published</dt><dd>${d.year}</dd></div>
        <div><dt>Publisher</dt><dd>${d.publisher}</dd></div><div><dt>Genre</dt><dd>${d.subject}</dd></div></dl></div>`;
      if (!reduce.matches) detail.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: SETTLE });
    };
    stage.addEventListener("click", e => {
      const btn = e.target.closest(".book-btn");
      if (!btn) return;
      const li = btn.parentElement;
      const was = li.classList.contains("is-picked");
      books().forEach(b => { b.classList.remove("is-picked"); b.firstElementChild.setAttribute("aria-pressed", "false"); });
      if (!was) { li.classList.add("is-picked"); btn.setAttribute("aria-pressed", "true"); show(li); }
      else detail.innerHTML = `<p class="body">Choose a book to take it off the shelf.</p>`;
    });
  }

  /* Reading demo: start → track → finish. User-driven, with a gentle
     autoplay only while it is on screen, the tab is visible and motion is allowed. */
  const demo = $("[data-demo]");
  if (demo) {
    const steps = $("[data-steps]");
    steps.hidden = false;
    const STATES = {
      start: { page: 332, today: 0, year: 15 },
      track: { page: 352, today: 20, year: 15 },
      finish: { page: 476, today: 144, year: 16 },
    };
    const TOTAL = 476;
    const out = { page: $("[data-page]", demo), pct: $("[data-pct]", demo), bar: $("[data-bar]", demo), today: $("[data-today]", demo), year: $("[data-year]", demo), clock: $("[data-clock]", demo) };
    let shown = { ...STATES.start };
    let state = "start";
    let tween = 0;

    const paint = v => {
      const page = Math.round(v.page);
      out.page.textContent = `Page ${page} of ${TOTAL}`;
      out.pct.textContent = `${Math.round(page / TOTAL * 100)}%`;
      out.today.textContent = Math.round(v.today);
      out.year.textContent = Math.round(v.year);
    };
    const go = (next, user) => {
      if (user) autoplay = false;
      state = next;
      demo.dataset.state = next;
      press(next);
      for (const el of $$("[data-when]", demo)) el.setAttribute("aria-hidden", String(el.dataset.when !== next));
      const target = STATES[next];
      out.bar.style.setProperty("--p", (target.page / TOTAL).toFixed(3));
      cancelAnimationFrame(tween);
      if (reduce.matches) { shown = { ...target }; paint(shown); }
      else {
        const from = { ...shown }, t0 = performance.now(), dur = 1000;
        const step = now => {
          const t = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - t, 3);
          for (const key in target) shown[key] = from[key] + (target[key] - from[key]) * k;
          paint(shown);
          if (t < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
      }
      seconds = 0; out.clock.textContent = "00:00";
    };
    const press = name => $$("button", steps).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.step === name)));
    steps.addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.step, true); });

    // The session clock and the autoplay run only while the demo can be seen.
    let onScreen = false, seconds = 0, autoplay = !reduce.matches, since = 0;
    const order = ["start", "track", "finish"];
    setInterval(() => {
      if (!onScreen || document.hidden) return;
      if (state === "start") {
        seconds++;
        out.clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      }
      if (autoplay && ++since >= 4) { since = 0; go(order[(order.indexOf(state) + 1) % 3]); }
    }, 1000);
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.4 }).observe(demo);
    paint(shown);
  }

  // Spoilers stay blurred until asked.
  for (const b of $$("[data-spoiler]")) b.addEventListener("click", () => b.setAttribute("aria-expanded", String(b.getAttribute("aria-expanded") !== "true")));

  /* Tabs (WAI-ARIA tabs pattern, automatic activation). */
  for (const list of $$("[data-tabs]")) {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      }
      if (focus) tab.focus();
    };
    list.addEventListener("click", e => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener("keydown", e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  }
})();
