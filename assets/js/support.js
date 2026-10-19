// Support: instant search, topic filters, deep links and copyable links.
// Without JavaScript every article is a native <details> and still works.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const form = $("[data-search]"), input = $("#q"), filters = $("[data-filters]");
  const count = $("[data-count]"), empty = $("[data-empty]"), emptyQ = $("[data-empty-q]");
  const cats = $$(".kb-cat");
  const articles = $$(".article");
  form.hidden = false;
  filters.hidden = false;

  // Index once: title, answer text and extra keywords, lower-cased and without accents.
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
  const index = articles.map(a => ({
    a,
    title: $("summary span", a),
    titleText: $("summary span", a).textContent,
    // Words are matched from their start, so "cover" finds "covers" but not "recover".
    hay: " " + norm(`${$("summary", a).textContent} ${$(".answer", a).textContent} ${a.dataset.keywords || ""}`).replace(/[^a-z0-9']+/g, " "),
  }));

  let cat = "";
  const highlight = (el, text, words) => {
    if (!words.length) { el.textContent = text; return; }
    const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    el.innerHTML = text.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(re, "<mark>$1</mark>");
  };

  const apply = () => {
    const q = input.value.trim();
    const words = norm(q).replace(/[^a-z0-9']+/g, " ").split(" ").filter(Boolean);
    let shown = 0;
    for (const { a, hay, title, titleText } of index) {
      const inCat = !cat || a.closest(".kb-cat").dataset.cat === cat;
      const match = words.every(w => hay.includes(" " + w));
      a.hidden = !(inCat && match);
      if (!a.hidden) shown++;
      highlight(title, titleText, words.filter(w => w.length > 1));
    }
    for (const c of cats) c.hidden = !$$(".article", c).some(a => !a.hidden);
    empty.hidden = shown > 0;
    emptyQ.textContent = q;
    count.textContent = q || cat ? `${shown} ${shown === 1 ? "answer" : "answers"}${q ? ` for “${q}”` : ""}` : "";
  };

  input.addEventListener("input", apply);
  input.addEventListener("keydown", e => { if (e.key === "Escape" && input.value) { input.value = ""; apply(); } });
  addEventListener("keydown", e => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });
  filters.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    cat = b.dataset.cat;
    $$("button", filters).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    apply();
  });
  $("[data-clear]").addEventListener("click", () => {
    input.value = ""; cat = "";
    $$("button", filters).forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0)));
    apply(); input.focus();
  });

  /* Accordion: animate the answer's height when opening or closing. */
  for (const a of articles) {
    const summary = $("summary", a), answer = $(".answer", a);
    summary.addEventListener("click", e => {
      if (reduce.matches) return;
      e.preventDefault();
      if (a.open) {
        const h = answer.offsetHeight;
        answer.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.4, 0, 1, 1)" })
          .onfinish = () => { a.open = false; };
      } else {
        a.open = true;
        const h = answer.offsetHeight;
        answer.animate([{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2, 0, 0, 1)" });
      }
    });
  }

  /* Deep links: #article-id opens and scrolls to it; #category scrolls there. */
  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    if (!el || !el.classList.contains("article")) return;
    if (el.hidden) { input.value = ""; cat = ""; $$("button", filters).forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0))); apply(); }
    el.open = true;
    articles.forEach(a => a.classList.toggle("is-target", a === el));
    requestAnimationFrame(() => { el.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" }); $("summary", el).focus({ preventScroll: true }); });
  };
  addEventListener("hashchange", openFromHash);
  openFromHash();

  /* Copy a link to one answer. */
  for (const btn of $$("[data-copy]")) {
    btn.addEventListener("click", async () => {
      const a = btn.closest(".article");
      const url = `${location.origin}${location.pathname}#${a.id}`;
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch {
        const t = Object.assign(document.createElement("textarea"), { value: url });
        document.body.append(t); t.select(); ok = document.execCommand("copy"); t.remove();
      }
      history.replaceState(null, "", `#${a.id}`);
      btn.textContent = ok ? "Link copied" : "Copy failed";
      btn.classList.toggle("is-done", ok);
      setTimeout(() => { btn.textContent = "Copy link"; btn.classList.remove("is-done"); }, 1800);
    });
  }

  apply();
})();
