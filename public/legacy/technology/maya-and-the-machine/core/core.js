/* Core: utilities, learner model, routing, shell, shared components, and the non-module views. */
(function () {
  const MM = (window.MM = window.MM || {});
  const C = MM.course;

  /* ---------------------------------------------------------------- DOM helpers */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => add(el, x)); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  const $ = (q, r) => (r || document).querySelector(q);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pct = (p, d) => (p * 100).toFixed(d === undefined ? (p < 0.1 ? 1 : 0) : d) + "%";
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const today = () => new Date().toISOString().slice(0, 10);
  MM.h = h; MM.s = s; MM.$ = $; MM.clamp = clamp; MM.pct = pct; MM.esc = esc; MM.debounce = debounce;

  /* ---------------------------------------------------------------- icons (24px, stroke) */
  const ICONS = {
    map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
    atlas: "M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z",
    review: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2",
    words: "M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h6",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
    back: "M15 5l-7 7 7 7", next: "M9 5l7 7-7 7", up: "M5 15l7-7 7 7", close: "M6 6l12 12M18 6 6 18",
    play: "M7 5v14l12-7z", pause: "M7 5h4v14H7zM13 5h4v14h-4z", replay: "M4 12a8 8 0 1 0 3-6.2M4 4v5h5",
    speaker: "M4 9v6h4l5 4V5L8 9H4Zm12.5 0a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11",
    lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z", check: "M5 12.5l4.5 4.5L19 7.5",
    star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z",
    brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4H9Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4h1Z",
    wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
    hand: "M8 13V6a1.5 1.5 0 0 1 3 0v5V4.5a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 13a1.6 1.6 0 0 1 2.6-1.8z",
    cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
    camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21",
    info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    pencil: "M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3",
    dot: "M12 12h.01", flag: "M5 21V4h11l-1.5 4L16 12H5",
    skeptic: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9.5h.01M15 9.5h.01M8.5 15.5c1.8-1.2 5.2-1.2 7 0M7.5 7l3 1M16.5 7l-3 1",
    book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
    bolt: "M13 3 5 13h6l-1 8 8-10h-6z", stars: "M5 5h.01M19 7h.01M12 12h.01M6 18h.01M18 18h.01M5 5l7 7 7-5M12 12l-6 6M12 12l6 6",
    law: "M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM8 21h8",
    tool: "M4 7h16v12H4zM9 7V5h6v2M4 12h16",
  };
  function icon(name, cls) {
    const el = s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: cls || null });
    el.append(s("path", { d: ICONS[name] || ICONS.dot }));
    if (name === "play" || name === "star") el.querySelector("path").setAttribute("fill", "currentColor");
    return el;
  }
  MM.icon = icon;

  /* ---------------------------------------------------------------- script loading */
  const loaded = {};
  MM.load = function (src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => res();
      el.onerror = () => { delete loaded[src]; rej(new Error("Could not load " + src)); };
      document.head.append(el);
    });
    return loaded[src];
  };
  MM.loadData = (name) => MM.load("data/" + name + ".js").then(() => window.MM_DATA[name]);

  /* ---------------------------------------------------------------- rich text */
  const SPINE_COL = { Maya: "var(--llm)", her: "var(--llm)", umbrella: "var(--data)", forecast: "var(--person)", Paris: "var(--line2)", would: "var(--ink-2)", rain: "var(--real)", sunglasses: "var(--pos)" };
  MM.tokColor = (w) => SPINE_COL[String(w).trim()] || null;
  function rich(text) {
    let t = esc(text);
    t = t.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (m, id, label) => {
      const e = C.glossary[id];
      const lab = label || (e ? e.term.replace(/ \(.*\)$/, "") : id);
      return e ? `<button type="button" class="term" data-term="${id}">${lab}</button>` : lab;
    });
    t = t.replace(/\{tok:([^}]*)\}/g, (m, w) => {
      const col = MM.tokColor(w);
      const shown = w.replace(/^ /, '<span class="sp">·</span>');
      return `<span class="tok"${col ? ` style="--tc:${col}"` : ""}>${shown}</span>`;
    });
    t = t.replace(/\{law:([a-z0-9]+)\}/g, (m, id) => `<button type="button" class="chip law${C.lawById[id] && C.lawById[id].phase === 2 ? " p2" : ""}" data-law="${id}">${C.lawLabel(id)}</button>`);
    t = t.replace(/\{mod:([a-z0-9]+)\}/g, (m, id) => `<a href="#${id}" class="modlink">${C.byId[id] ? C.byId[id].code + " " + C.byId[id].title : id}</a>`);
    t = t.replace(/\{tool:([a-z0-9]+)\}/g, (m, id) => `<button type="button" class="chip" data-tool="${id}">${C.toolById[id] ? "Toolkit " + id.toUpperCase() : id}</button>`);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => p.startsWith("- ") ? "<ul>" + p.split(/\n- /).map((li) => "<li>" + li.replace(/^- /, "") + "</li>").join("") + "</ul>" : "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
  }
  MM.rich = rich;
  MM.richEl = (text, tag, cls) => h(tag || "div", { class: "rich " + (cls || ""), html: rich(text) });
  MM.plain = (text) => String(text).replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (m, id, l) => l || (C.glossary[id] ? C.glossary[id].term.replace(/ \(.*\)$/, "") : id)).replace(/\{(tok|law|mod|tool):([^}]*)\}/g, (m, k, v) => k === "law" ? C.lawLabel(v) : v).replace(/[*`]/g, "");

  /* ---------------------------------------------------------------- learner model */
  const KEY = "maya-machine-v1";
  const blank = () => ({ v: 1, updated: 0, settings: { theme: "system", depth: "expert", motion: "full", size: "normal", path: "full" },
    mods: {}, preds: {}, answers: {}, boxes: {}, notes: {}, ticks: {}, laws: {}, pictures: {}, extra: {}, last: null });
  const store = (MM.store = { state: blank(), listeners: new Set(), remote: null, status: "local" });
  try { const raw = localStorage.getItem(KEY); if (raw) store.state = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage unavailable: run in memory */ }
  store.on = (fn) => (store.listeners.add(fn), () => store.listeners.delete(fn));
  const saveLocal = debounce(() => { try { localStorage.setItem(KEY, JSON.stringify(store.state)); } catch (e) {} }, 250);
  let pushing = false, pushAgain = false;
  const saveRemote = debounce(async function push() {
    if (!store.remote) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true;
    try { await store.remote.set({ json: JSON.stringify(store.state), updated: store.state.updated }); store.status = "synced"; }
    catch (e) { store.status = "local"; }
    pushing = false;
    if (pushAgain) { pushAgain = false; saveRemote(); }
  }, 2500);
  store.update = function (fn, quiet) {
    fn(store.state);
    store.state.updated = Date.now();
    saveLocal(); saveRemote();
    if (!quiet) store.listeners.forEach((l) => { try { l(store.state); } catch (e) { console.error(e); } });
  };
  store.mod = (id) => (store.state.mods[id] = store.state.mods[id] || { done: {}, beat: 0, tab: "story" });
  function mergeStates(a, b) {
    const o = JSON.parse(JSON.stringify(a.updated >= b.updated ? a : b));
    const other = a.updated >= b.updated ? b : a;
    for (const id in other.mods || {}) {
      const m = (o.mods[id] = o.mods[id] || { done: {}, beat: 0 });
      Object.assign(m.done, other.mods[id].done || {}, m.done);
      m.beat = Math.max(m.beat || 0, other.mods[id].beat || 0);
      m.completed = m.completed || other.mods[id].completed;
    }
    for (const q in other.answers || {}) {
      const seen = new Set((o.answers[q] || []).map((x) => x.t));
      o.answers[q] = (o.answers[q] || []).concat(other.answers[q].filter((x) => !seen.has(x.t))).sort((x, y) => x.t - y.t).slice(-8);
    }
    for (const k of ["boxes", "notes", "preds", "laws", "ticks", "pictures"]) for (const q in other[k] || {}) if (!(q in (o[k] || {}))) (o[k] = o[k] || {})[q] = other[k][q];
    return o;
  }
  store.connect = async function () {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const ref = db.doc("data/users/" + uid + "/progress");
      const snap = await ref.get();
      store.remote = ref;
      if (snap.exists && snap.data() && snap.data().json) {
        const remote = Object.assign(blank(), JSON.parse(snap.data().json));
        store.state = mergeStates(store.state, remote);
        saveLocal();
        store.listeners.forEach((l) => l(store.state));
      }
      store.status = "synced";
      saveRemote();
    } catch (e) { store.remote = null; store.status = "local"; }
  };
  store.exportText = () => JSON.stringify(store.state, null, 1);
  store.importText = (txt) => { const d = JSON.parse(txt); if (!d || d.v !== 1) throw new Error("This is not a progress file from this course."); store.update((st) => Object.assign(st, mergeStates(st, Object.assign(blank(), d)))); };

  /* status of a station on the map */
  MM.STEPS = ["mystery", "where", "predict", "story", "spotlight", "lab", "breakit", "clinic", "explain", "skeptic", "recall", "connect"];
  MM.stepNames = { mystery: "Mystery", where: "Where we are", predict: "Predict", story: "Guided story", spotlight: "Spotlight", lab: "Lab", breakit: "Break-it", clinic: "Misconception clinic", explain: "Explain-back", skeptic: "Skeptic's corner", recall: "Recall check", connect: "Connect and unlock" };
  MM.modStatus = function (id) {
    const m = store.state.mods[id];
    if (!m) return "new";
    const n = Object.keys(m.done || {}).length;
    if (m.completed) {
      const qs = Object.keys(store.state.answers).filter((q) => q.startsWith(id + "."));
      const strong = qs.length >= 3 && qs.every((q) => new Set((store.state.answers[q] || []).filter((a) => a.ok).map((a) => a.d)).size >= 2);
      return strong ? "mastered" : "done";
    }
    return n ? "started" : "new";
  };

  /* ---------------------------------------------------------------- settings */
  MM.applySettings = function () {
    const st = store.state.settings, root = document.documentElement;
    if (st.theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", st.theme);
    root.setAttribute("data-size", st.size || "normal");
    root.setAttribute("data-motion", st.motion === "reduced" ? "reduced" : "full");
  };
  MM.reducedMotion = () => store.state.settings.motion === "reduced" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------------------------------------------------------- read aloud */
  MM.speak = function (text, btn) {
    const synth = window.speechSynthesis;
    if (!synth) { MM.toast("Read Aloud is not available in this browser."); return; }
    if (synth.speaking) { synth.cancel(); if (btn) btn.setAttribute("aria-pressed", "false"); return; }
    const u = new SpeechSynthesisUtterance(MM.plain(text));
    const v = synth.getVoices().find((x) => /en-GB/i.test(x.lang)) || synth.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 0.95;
    if (btn) { btn.setAttribute("aria-pressed", "true"); u.onend = u.onerror = () => btn.setAttribute("aria-pressed", "false"); }
    synth.speak(u);
  };

  /* ---------------------------------------------------------------- live AI (optional, with scripted fallback) */
  let samplePromise = null;
  MM.ai = {
    get() { if (!samplePromise) samplePromise = window.claude && window.claude.use ? window.claude.use("sample").catch(() => null) : Promise.resolve(null); return samplePromise; },
    disabled: false,
    async available() { return !this.disabled && !!(await this.get()); },
    async ask(prompt, opts) {
      const fn = await this.get();
      if (!fn || this.disabled) throw { code: "unavailable" };
      try { return opts && opts.json ? await fn.json(prompt, Object.assign({ modelTier: "default" }, opts.options || {})) : await fn(prompt, Object.assign({ modelTier: "default" }, opts && opts.options || {})); }
      catch (e) { if (e && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) this.disabled = true; throw e; }
    },
    message(e) {
      const c = e && e.code;
      if (c === "rate_limited") return "Claude is busy for you right now. Try again in a little while.";
      if (c === "not_granted" || c === "unavailable" || this.disabled) return "Live feedback is off for this page, so the scripted model answer is shown instead.";
      if (c === "session_expired") return "Please sign in again to use live feedback.";
      return "Live feedback did not come through. The scripted model answer is shown instead.";
    }};

  /* ---------------------------------------------------------------- small components */
  const TRUTH = {
    REAL: "Numbers from a real model, a real tokeniser or a real LangGraph run.",
    TOY: "Real maths on Maya-LM, a tiny model trained for this course. Big models behave the same way at far larger scale.",
    SKETCH: "A simplified drawing with chosen numbers. A REAL or TOY view of the same idea follows somewhere in this module." };
  MM.truth = function (kind, note) {
    const b = h("span", { class: "truth " + kind, title: TRUTH[kind] + (note ? " " + note : ""), tabindex: "0", role: "note", "aria-label": kind + ": " + TRUTH[kind] });
    const ic = s("svg", { viewBox: "0 0 12 12", "aria-hidden": "true" });
    if (kind === "REAL") ic.append(s("circle", { cx: 6, cy: 6, r: 4.5, fill: "currentColor" }));
    else if (kind === "TOY") ic.append(s("path", { d: "M6 1.5 10.5 6 6 10.5 1.5 6z", fill: "currentColor" }));
    else ic.append(s("path", { d: "M2 10l1.5-.4 6-6-1.1-1.1-6 6zM8 2.5l1.5 1.5", fill: "none", stroke: "currentColor", "stroke-width": 1.4 }));
    b.append(ic, kind);
    return b;
  };
  MM.tok = function (text, opts) {
    opts = opts || {};
    const col = opts.color || MM.tokColor(text);
    const el = h(opts.button ? "button" : "span", { class: "tok" + (opts.cls ? " " + opts.cls : ""), style: col ? "--tc:" + col : null, type: opts.button ? "button" : null, title: opts.title || null });
    const t = String(text);
    if (t.startsWith(" ")) el.append(h("span", { class: "sp", "aria-hidden": "true" }, "·"), t.slice(1));
    else el.append(t === "<s>" ? "⟨start⟩" : t);
    if (opts.sub !== undefined) el.append(h("small", null, String(opts.sub)));
    return el;
  };
  MM.toks = (list, opts) => h("div", { class: "toks" }, list.map((t) => MM.tok(t, opts)));
  MM.vec = function (values, opts) {
    opts = opts || {};
    const mx = opts.max || Math.max(1e-9, ...values.map(Math.abs));
    const el = h("span", { class: "vec" + (opts.wide ? " wide" : ""), role: "img", "aria-label": "vector of " + values.length + " numbers" });
    values.forEach((v) => {
      const a = clamp(Math.abs(v) / mx, 0, 1);
      el.append(h("i", { style: `background: color-mix(in srgb, ${v < 0 ? "var(--neg)" : "var(--pos)"} ${Math.round(a * 100)}%, var(--zero))`, title: v.toFixed(3) }));
    });
    return el;
  };
  /* sorted probability bars with a visible 100% total */
  MM.bars = function (items, opts) {
    opts = opts || {};
    const max = opts.scale || Math.max(...items.map((x) => x.p), 1e-9);
    const wrap = h("div", { class: "bars", role: "list" });
    items.forEach((it, i) => {
      const row = h("div", { class: "bar" + (i === 0 && !opts.plain ? " top" : "") + (it.cut ? " cut" : ""), role: "listitem", style: opts.labelW ? `grid-template-columns:${opts.labelW} minmax(0,1fr) ${opts.valueW || "4.2rem"}` : null },
        h("span", { class: "lbl", title: it.label }, it.label),
        h("span", { class: "track" }, h("span", { class: "fill", style: { width: (100 * it.p / max).toFixed(2) + "%", background: it.color || null } })),
        h("span", { class: "v" }, opts.fmt ? opts.fmt(it) : pct(it.p, it.p < 0.01 ? 2 : 1)));
      wrap.append(row);
    });
    if (opts.total !== false) {
      const tot = items.reduce((a, b) => a + (b.cut ? 0 : b.p), 0);
      wrap.append(h("div", { class: "bars-total" }, opts.totalLabel || (opts.rest !== undefined && opts.rest >= 0.0005 ? `others ${pct(opts.rest, 1)} · total 100%` : `total ${pct(opts.rest !== undefined ? 1 : tot, 0)}`)));
    }
    return wrap;
  };
  MM.slider = function (o) {
    const id = "sl-" + Math.random().toString(36).slice(2, 8);
    const inp = h("input", { type: "range", id: o.id || id, min: o.min, max: o.max, step: o.step || 1, value: o.value, "aria-label": o.label });
    const out = h("output", { for: inp.id }, o.fmt ? o.fmt(+o.value) : o.value);
    inp.addEventListener("input", () => { out.textContent = o.fmt ? o.fmt(+inp.value) : inp.value; o.onInput && o.onInput(+inp.value); });
    const el = h("label", { class: "slider" }, h("span", { class: "eyebrow", style: "min-width:5.5rem" }, o.label), inp, out);
    el.input = inp; el.set = (v) => { inp.value = v; out.textContent = o.fmt ? o.fmt(+v) : v; };
    return el;
  };
  MM.seg = function (options, value, onChange, label) {
    const el = h("div", { class: "seg", role: "group", "aria-label": label || null });
    options.forEach((o) => {
      const b = h("button", { type: "button", "aria-pressed": String(o.value === value) }, o.label);
      b.onclick = () => { el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onChange(o.value); };
      el.append(b);
    });
    return el;
  };
  MM.toast = function (msg) {
    const t = h("div", { class: "toast", role: "status" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  };
  MM.copy = function (text, btn) {
    const done = () => MM.toast("Copied");
    try { navigator.clipboard.writeText(text).then(done, () => fallback()); } catch (e) { fallback(); }
    function fallback() { const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { MM.toast("Select the text and copy it yourself."); } ta.remove(); }
  };
  /* a confidence picker: 1–4 */
  MM.confidence = function (onPick, value) {
    const names = ["Guessing", "Unsure", "Fairly sure", "Certain"];
    const el = h("div", { class: "conf", role: "group", "aria-label": "How sure are you?" }, h("span", { class: "eyebrow" }, "How sure?"));
    names.forEach((n, i) => {
      const b = h("button", { type: "button", "aria-pressed": String(value === i + 1) }, n);
      b.onclick = () => { el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onPick(i + 1); };
      el.append(b);
    });
    return el;
  };

  /* ---------------------------------------------------------------- recall questions and spaced review */
  const DAYS = [0, 1, 3, 7, 16, 35];
  MM.recordAnswer = function (qid, ok, conf) {
    store.update((st) => {
      (st.answers[qid] = st.answers[qid] || []).push({ t: Date.now(), d: today(), ok, c: conf || 0 });
      st.answers[qid] = st.answers[qid].slice(-8);
      const b = st.boxes[qid] || { box: 0 };
      if (ok) { b.box = Math.min(5, b.box + 1); b.due = Date.now() + DAYS[b.box] * 864e5; b.flag = false; }
      else { b.box = 1; b.due = Date.now() + (conf >= 3 ? 6 * 36e5 : 20 * 36e5); b.flag = conf >= 3; }
      st.boxes[qid] = b;
    }, true);
  };
  MM.dueCount = function () {
    const now = Date.now();
    return Object.values(store.state.boxes).filter((b) => b.due && b.due <= now).length;
  };
  /* one question card: choose, rate confidence, reveal */
  MM.question = function (q, opts) {
    opts = opts || {};
    let choice = null, conf = 0, answered = false;
    const card = h("div", { class: "qcard" });
    const head = h("div", { class: "row" }, opts.label ? h("span", { class: "eyebrow" }, opts.label) : null, q.level ? h("span", { class: "pill" }, "Level " + q.level + " · " + ["", "Recognise", "Explain why", "Predict", "Defend", "Connect"][q.level]) : null);
    const stem = MM.richEl(q.q, "div", "qstem");
    const optsEl = h("div", { class: "opts", role: "group" });
    const btns = q.options.map((o, i) => {
      const b = h("button", { type: "button", class: "opt", "aria-pressed": "false" }, h("span", { class: "k" }, String.fromCharCode(65 + i)), MM.richEl(o, "span", "grow"));
      b.onclick = () => { if (answered) return; choice = i; btns.forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); check.disabled = !conf; };
      optsEl.append(b);
      return b;
    });
    const confEl = MM.confidence((c) => { conf = c; check.disabled = choice === null; });
    const out = h("div", { "aria-live": "polite" });
    const check = h("button", { type: "button", class: "btn primary small", disabled: true }, "Check");
    check.onclick = () => {
      if (answered || choice === null) return;
      answered = true;
      const ok = choice === q.answer;
      btns.forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("right"); else if (i === choice) b.classList.add("wrong"); });
      check.remove(); confEl.remove();
      out.append(h("div", { class: "callout " + (ok ? "ok" : "bad") },
        h("div", { class: "row" }, h("strong", null, ok ? "Right." : "Not quite."), !ok && conf >= 3 ? h("span", { class: "flag surewrong" }, "Sure but wrong · comes back soon") : null),
        MM.richEl(q.why || "", "div")));
      if (q.id && !opts.noRecord) MM.recordAnswer(q.id, ok, conf);
      opts.onAnswer && opts.onAnswer(ok, conf);
    };
    card.append(head, stem, optsEl, h("div", { class: "row" }, confEl, check), out);
    return card;
  };

  /* ---------------------------------------------------------------- popovers and sheets */
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  MM.closePop = closePop;
  function showTerm(btn) {
    const e = C.glossary[btn.dataset.term];
    if (!e) return;
    closePop();
    pop = h("div", { class: "pop", role: "dialog", "aria-label": e.term },
      h("h4", null, e.term), MM.richEl(e.def, "div"), e.ex ? h("div", { class: "muted", style: "margin-top:6px;font-size:.9rem" }, "Example: " + e.ex) : null,
      h("div", { class: "from" }, C.byId[e.mod] ? h("a", { href: "#" + e.mod, onclick: closePop }, "Taught in " + C.byId[e.mod].code + " · " + C.byId[e.mod].title) : null,
        " · ", h("a", { href: "#words", onclick: () => { closePop(); MM.wordFocus = e.id; } }, "Word Bank")));
    document.body.append(pop);
    const r = btn.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    let top = r.bottom + 8;
    if (top + pr.height > innerHeight - 12) top = Math.max(12, r.top - pr.height - 8);
    pop.style.top = top + "px";
    pop.style.left = clamp(r.left, 16, innerWidth - pr.width - 16) + "px";
  }
  document.addEventListener("click", (ev) => {
    const term = ev.target.closest(".term");
    if (term) { ev.preventDefault(); if (pop && pop.dataset.for === term.dataset.term) closePop(); else { showTerm(term); pop && (pop.dataset.for = term.dataset.term); } return; }
    const law = ev.target.closest("[data-law]");
    if (law) { ev.preventDefault(); MM.openSheet("laws", law.dataset.law); return; }
    const tool = ev.target.closest("[data-tool]");
    if (tool) { ev.preventDefault(); MM.openSheet("toolkit", tool.dataset.tool); return; }
    if (pop && !ev.target.closest(".pop")) closePop();
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { closePop(); MM.closeSheet(); } });
  window.addEventListener("scroll", closePop, { passive: true });

  let sheetEl = null;
  MM.closeSheet = function () { if (sheetEl) { sheetEl.remove(); sheetEl = null; } };
  MM.openSheet = function (kind, focus) {
    MM.closeSheet(); closePop();
    const titles = { laws: "The Laws of the Machine", words: "Word Bank", toolkit: "The Maths Toolkit", notebook: "My Explanations" };
    const body = h("div", { class: "body" });
    const sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": titles[kind] },
      h("header", null, h("h2", { style: "font-size:1.3rem" }, titles[kind]), h("span", { class: "grow" }),
        h("a", { href: "#" + (kind === "words" ? "words" : kind), class: "btn small ghost", onclick: MM.closeSheet }, "Open page"),
        h("button", { class: "iconbtn", "aria-label": "Close", onclick: MM.closeSheet }, icon("close"))), body);
    sheetEl = h("div", null, h("div", { class: "scrim", onclick: MM.closeSheet }), sheet);
    document.body.append(sheetEl);
    VIEWS[kind === "words" ? "words" : kind](body, { focus, inSheet: true });
    const f = focus && body.querySelector(`[data-id="${focus}"]`);
    if (f) { f.scrollIntoView({ block: "start" }); f.classList.add("fade-in"); }
    sheet.querySelector(".iconbtn").focus();
  };

  /* ---------------------------------------------------------------- shell & routing */
  const app = { main: null, route: "hub" };
  MM.app = app;
  const NAV = [["hub", "Map", "map"], ["atlas", "Atlas", "atlas"], ["review", "Review", "review"], ["words", "Words", "words"], ["more", "More", "more"]];
  function shell() {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const mark = s("svg", { class: "mark", viewBox: "0 0 30 30", "aria-hidden": "true" },
      s("rect", { x: 1, y: 1, width: 28, height: 28, rx: 8, fill: "var(--ink)" }),
      s("path", { d: "M7 21V9l4 6 4-6v12", fill: "none", stroke: "var(--line1)", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }),
      s("circle", { cx: 21.5, cy: 18.5, r: 2.6, fill: "var(--line2)" }));
    const nav = h("nav", { class: "nav", "aria-label": "Main" });
    [["hub", "Map", "map"], ["atlas", "Atlas", "atlas"], ["review", "Review", "review"], ["words", "Word Bank", "words"], ["laws", "Laws", "law"], ["toolkit", "Toolkit", "tool"], ["stars", "Concepts", "stars"], ["notebook", "Notebook", "book"]].forEach(([r, label, ic]) => {
      const b = h("button", { type: "button", "data-route": r }, icon(ic), label);
      if (r === "review") b.append(h("span", { class: "count", hidden: true }));
      b.onclick = () => go(r);
      nav.append(b);
    });
    const top = h("header", { class: "topbar wrap" }, h("div", { class: "in" },
      h("button", { class: "brand", type: "button", onclick: () => go("hub"), "aria-label": "Maya and the Machine, back to the map" }, mark, h("b", null, "Maya and the Machine")),
      nav, h("button", { class: "iconbtn", type: "button", "aria-label": "Settings", onclick: () => go("prefs") }, icon("gear"))));
    const tabbar = h("nav", { class: "tabbar", "aria-label": "Sections" });
    NAV.forEach(([r, label, ic]) => {
      const b = h("button", { type: "button", "data-route": r }, icon(ic), label);
      if (r === "review") b.append(h("span", { class: "count", hidden: true }));
      b.onclick = () => (r === "more" ? go("more") : go(r));
      tabbar.append(b);
    });
    app.main = h("main", { id: "main", class: "wrap", tabindex: "-1" });
    root.append(top, app.main, tabbar);
  }
  function go(route) { if (location.hash.slice(1) === route) render(); else location.hash = route; }
  MM.go = go;
  function updateNav() {
    const due = MM.dueCount();
    document.querySelectorAll("[data-route]").forEach((b) => {
      const r = b.dataset.route;
      const cur = r === app.route || (r === "more" && ["laws", "toolkit", "stars", "notebook", "prefs", "more"].includes(app.route)) || (r === "hub" && C.byId[app.route]);
      if (cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      const c = b.querySelector(".count");
      if (c) { c.hidden = !due; c.textContent = due > 9 ? "9+" : due; }
    });
  }
  function render() {
    MM.closeSheet(); closePop();
    if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel();
    if (MM.cleanup) { try { MM.cleanup(); } catch (e) {} MM.cleanup = null; }
    let route = location.hash.slice(1) || "hub";
    if (!VIEWS[route] && !C.byId[route]) route = "hub";
    app.route = route;
    document.body.classList.toggle("in-module", !!C.byId[route]);
    app.main.innerHTML = "";
    const page = h("div", { class: "page" });
    app.main.append(page);
    try {
      if (C.byId[route]) MM.renderModule(page, route);
      else VIEWS[route](page, {});
    } catch (e) { console.error(e); page.append(errorBox(e)); }
    updateNav();
    window.scrollTo(0, 0);
    if (route !== "hub") store.update((st) => { st.lastRoute = route; }, true);
  }
  MM.render = render;
  function errorBox(e) { return h("div", { class: "callout bad" }, h("strong", null, "This part did not load. "), "Other stations still work. Details: " + (e && e.message || e)); }
  MM.errorBox = errorBox;

  /* ---------------------------------------------------------------- views */
  const VIEWS = (MM.views = {});

  VIEWS.hub = function (page) {
    const st = store.state;
    const doneCount = C.modules.filter((m) => ["done", "mastered"].includes(MM.modStatus(m.id))).length;
    const lawsCount = Object.keys(st.laws).length;
    const mastered = C.modules.filter((m) => MM.modStatus(m.id) === "mastered").length;
    const lastId = st.lastRoute && C.byId[st.lastRoute] ? st.lastRoute : null;
    const firstOpen = C.order.find((id) => !["done", "mastered"].includes(MM.modStatus(id))) || "m00";
    const resumeId = lastId || firstOpen;
    const rm = C.byId[resumeId];
    const spine = ["Maya", " packed", " her", " umbrella", " because", " the", " forecast", " for", " Paris", " said", " it", " would"];
    const hero = h("section", { class: "hero" },
      h("div", null,
        h("div", { class: "eyebrow" }, "Generative AI, LLMs and agent teams, from first principles"),
        h("h1", { style: "margin-top:8px" }, "Maya and the Machine"),
        h("p", { class: "lede" }, "One sentence travels through a real language model, then Maya's trip to Paris is planned by a team of agents. You will rebuild the machine from the problems it solves, predict what it does when something changes, and say what breaks when a part is removed."),
        h("div", { class: "spine-line", "aria-label": "Maya packed her umbrella because the forecast for Paris said it would, blank" }, spine.map((w) => MM.tok(w)), MM.tok("___", { cls: "blank" })),
        h("div", { class: "card", style: "margin-top:14px;max-width:30rem;padding:12px 14px" },
          h("div", { class: "row", style: "margin-bottom:8px" }, h("span", { class: "eyebrow" }, "Maya-LM's real guess for the blank"), MM.truth("TOY")),
          MM.bars([{ label: "rain", p: 0.5465 }, { label: "be", p: 0.1785 }, { label: "drizzle", p: 0.1248 }, { label: "pour", p: 0.104 }], { rest: 0.0462 }))),
      h("div", { class: "resume" },
        h("div", { class: "card", style: "--lc:" + (rm.line === 2 ? "var(--line2)" : "var(--line1)") },
          h("div", { class: "eyebrow" }, lastId ? "Continue where you stopped" : doneCount ? "Next station" : "Start here"),
          h("div", { class: "row", style: "margin:8px 0 6px" }, h("span", { class: "roundel " + (rm.line === 2 ? "l2" : "l1") }, rm.line), h("h2", null, rm.code + " · " + rm.title)),
          h("p", { class: "muted" }, rm.q),
          h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn primary", onclick: () => go(resumeId) }, lastId ? "Continue" : "Start", icon("next")), h("button", { class: "btn", onclick: () => go("atlas") }, "See the whole system"))),
        reviewCard(),
        h("div", { class: "stats" },
          h("div", { class: "stat" }, h("b", { class: "num" }, doneCount + "/" + C.modules.length), h("span", null, "stations done")),
          h("div", { class: "stat" }, h("b", { class: "num" }, lawsCount + "/20"), h("span", null, "Laws unlocked")),
          h("div", { class: "stat" }, h("b", { class: "num" }, String(mastered)), h("span", null, "stations mastered")))));
    page.append(hero);
    const lines = h("section", { class: "lines", "aria-label": "Course map" });
    C.phases.forEach((ph) => lines.append(metroLine(ph)));
    page.append(h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;margin-top:8px" }, h("h2", null, "The map"), h("span", { class: "muted", style: "font-size:.92rem" }, "Each station is about an hour. Stations fill in as you finish them; a ring means mastered.")), lines);
    page.append(howItWorks());
  };
  function reviewCard() {
    const due = MM.dueCount();
    return h("div", { class: "card" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Daily Five"), h("span", { class: "grow" }), due ? h("span", { class: "count" }, String(due)) : null),
      h("p", { style: "margin:6px 0 10px" }, due ? `${due} question${due > 1 ? "s are" : " is"} ready. Five mixed questions keep what you learned from fading.` : "Answer recall questions in any station and they come back here after growing gaps: 1, 3, 7, 16 and 35 days."),
      h("button", { class: "btn small" + (due ? " primary" : ""), onclick: () => go("review") }, due ? "Start the Daily Five" : "Open Review"));
  }
  function metroLine(ph) {
    const col = ph.line === 2 ? "var(--line2)" : "var(--line1)";
    const box = h("div", { class: "metro", style: "--lc:" + col });
    box.append(h("div", { class: "line-head" }, h("span", { class: "roundel l" + ph.line }, ph.line), h("div", null, h("h3", null, ph.name.split(" · ")[1]), h("div", { class: "faint", style: "font-size:.9rem" }, ph.short))));
    const ids = ph.acts.flatMap((a) => a.modules);
    ph.acts.forEach((a) => {
      const act = h("div", { class: "act" }, h("div", { class: "act-name" }, a.name));
      a.modules.forEach((id) => {
        const m = C.byId[id];
        const st = MM.modStatus(id);
        const stop = h("span", { class: "stop " + st + (m.finale ? " term" : ""), "aria-hidden": "true" }, st === "done" || st === "mastered" ? icon("check") : null);
        const needs = (m.needs || []).filter((n) => !["done", "mastered"].includes(MM.modStatus(n))).map((n) => C.byId[n].code);
        act.append(h("div", { class: "station" + (m.side ? " side" : "") + (id === ids[0] ? " first" : "") + (id === ids[ids.length - 1] ? " last" : "") },
          h("div", { class: "track" }, stop),
          h("button", { class: "st-card", type: "button", onclick: () => go(id), "aria-label": `${m.code} ${m.title}. ${m.q} Status: ${st}.` },
            h("span", { class: "code" }, m.code + (m.side ? " · side quest" : "")), h("span", { class: "t" }, m.title), h("span", { class: "q" }, m.q),
            h("span", { class: "meta" }, h("span", null, m.mins + " min"), st !== "new" ? h("span", null, { started: "In progress", done: "Done", mastered: "Mastered" }[st]) : null, needs.length && st === "new" ? h("span", null, "Builds on " + needs.join(", ")) : null))));
      });
      box.append(act);
    });
    return box;
  }
  function howItWorks() {
    const rows = [["Predict, then reveal", "Every animation starts with your guess and how sure you are. Wrong guesses teach the most."],
      ["Three depths on every screen", "The core explanation, a simpler picture one tap away, and the exact expert version. Research frontiers are optional."],
      ["Truth labels", "REAL means numbers from a real model or a real LangGraph run. TOY means real maths on Maya-LM, a tiny model trained for this course. SKETCH means a simplified drawing."],
      ["Break it to understand it", "Every station has a lab where you remove a part and explain what fails."],
      ["Defend it", "The Skeptic challenges you, and the Laws of the Machine are your answers."]];
    return h("section", { style: "margin-top:34px" }, h("h2", null, "How each station works"),
      h("div", { class: "three", style: "margin-top:12px" }, rows.map(([t, d]) => h("div", { class: "card" }, h("h4", null, t), h("p", { class: "muted", style: "margin-top:6px;font-size:.96rem" }, d)))),
      h("div", { class: "row", style: "margin-top:12px" }, MM.truth("REAL"), MM.truth("TOY"), MM.truth("SKETCH"), h("span", { class: "faint", style: "font-size:.88rem" }, "Tap a label to read what it promises.")));
  }

  VIEWS.more = function (page) {
    page.append(h("h1", null, "Tools"), h("p", { class: "muted", style: "margin:8px 0 18px" }, "Everything you can open from any station."));
    const items = [["laws", "The Laws of the Machine", "20 laws. Every challenge can be answered by combining them.", "law"], ["toolkit", "The Maths Toolkit", "11 short cards with one worked example and a mini-lab each.", "tool"], ["words", "Word Bank", "Every term in plain words, and where it is taught.", "words"], ["stars", "Concept Constellation", "Every concept, lit by how well you know it.", "stars"], ["notebook", "My Explanations", "Everything you have explained in your own words.", "book"], ["atlas", "Architecture Atlas", "The whole system on one page, then zoom in.", "atlas"], ["prefs", "Settings", "Depth, motion, text size, theme, and your progress file.", "gear"]];
    page.append(h("div", { class: "two" }, items.map(([r, t, d, ic]) => h("button", { class: "card", style: "text-align:left;cursor:pointer;display:flex;gap:12px;align-items:flex-start", onclick: () => go(r) }, h("span", { class: "iconbtn", "aria-hidden": "true" }, icon(ic)), h("span", null, h("h3", null, t), h("span", { class: "muted", style: "display:block;margin-top:4px;font-size:.95rem" }, d))))));
  };

  VIEWS.words = function (page, o) {
    const inSheet = o && o.inSheet;
    if (!inSheet) page.append(h("h1", null, "Word Bank"), h("p", { class: "muted", style: "margin:8px 0 14px" }, "Every technical term in plain words. Tap any dotted word anywhere in the course to see its entry."));
    const q = h("input", { type: "search", id: "word-search", placeholder: "Search terms…", "aria-label": "Search the Word Bank" });
    const list = h("div", { class: "stack", style: "--gap:8px;margin-top:12px" });
    const all = Object.values(C.glossary).sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
    function draw() {
      const t = q.value.trim().toLowerCase();
      list.innerHTML = "";
      const hits = all.filter((e) => !t || (e.term + " " + e.def).toLowerCase().includes(t));
      hits.forEach((e) => list.append(h("div", { class: "card", "data-id": e.id, style: "padding:12px 14px" },
        h("div", { class: "row", style: "justify-content:space-between" }, h("h4", null, e.term), C.byId[e.mod] ? h("a", { href: "#" + e.mod, class: "faint", style: "font-size:.85rem", onclick: MM.closeSheet }, C.byId[e.mod].code) : null),
        h("p", { style: "margin-top:4px" }, e.def), e.ex ? h("p", { class: "muted", style: "font-size:.92rem;margin-top:4px" }, "Example: " + e.ex) : null)));
      if (!hits.length) list.append(h("div", { class: "empty" }, "No term matches “" + q.value + "”."));
    }
    q.addEventListener("input", draw);
    page.append(q, h("div", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, all.length + " terms"), list);
    draw();
    const f = MM.wordFocus || (o && o.focus);
    if (f) { MM.wordFocus = null; setTimeout(() => { const el = list.querySelector(`[data-id="${f}"]`); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("glow"); } }, 30); }
  };

  VIEWS.laws = function (page, o) {
    const inSheet = o && o.inSheet;
    if (!inSheet) page.append(h("h1", null, "The Laws of the Machine"), h("p", { class: "muted reading", style: "margin:8px 0 16px" }, "A law here is a rule that holds for the systems we study. Each has a simple version (how you remember it), an exact version (how you defend it) and a note on where it bends. Laws unlock in the station that teaches them."));
    [1, 2].forEach((ph) => {
      page.append(h("h2", { style: "margin:18px 0 10px" }, ph === 1 ? "Line 1 · The laws of LLMs" : "Line 2 · The laws of agent systems"));
      C.laws.filter((l) => l.phase === ph).forEach((l) => {
        const open = !!store.state.laws[l.id];
        page.append(h("article", { class: "card", "data-id": l.id, style: "margin-bottom:10px" },
          h("div", { class: "row" }, h("span", { class: "roundel l" + ph, style: "width:28px;height:28px;font-size:.95rem" }, l.n), h("h3", { class: "grow" }, l.name), h("span", { class: "pill" + (open ? " ok" : "") }, open ? "Unlocked" : "Unlocks in " + C.byId[l.mod].code)),
          h("p", { style: "margin-top:8px" }, l.simple),
          h("div", { class: "two", style: "margin-top:10px" },
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Exact version"), h("p", { style: "margin-top:4px;font-size:.96rem" }, l.exact)),
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Where it bends"), h("p", { style: "margin-top:4px;font-size:.96rem" }, l.bends))),
          h("a", { href: "#" + l.mod, style: "display:inline-block;margin-top:8px;font-size:.9rem", onclick: MM.closeSheet }, "Taught in " + C.byId[l.mod].code + " · " + C.byId[l.mod].title)));
      });
    });
  };

  VIEWS.toolkit = function (page, o) {
    const inSheet = o && o.inSheet;
    if (!inSheet) page.append(h("h1", null, "The Maths Toolkit"), h("p", { class: "muted reading", style: "margin:8px 0 16px" }, "Eleven small tools carry all the maths. None needs more than school arithmetic, and none is watered down. Each is taught when it is first needed, then reused."));
    C.toolkit.forEach((t) => {
      const lab = h("div", { class: "lab", style: "margin-top:10px" });
      const card = h("article", { class: "card", "data-id": t.id, style: "margin-bottom:12px" },
        h("div", { class: "row" }, h("span", { class: "pill" }, t.id.toUpperCase()), h("h3", { class: "grow" }, t.name)),
        h("p", { style: "margin-top:8px" }, t.idea),
        h("div", { class: "panel", style: "margin-top:8px" }, h("div", { class: "eyebrow" }, "Worked example"), h("p", { class: "mono", style: "margin-top:4px;font-size:.92rem" }, t.example)),
        lab,
        h("div", { class: "faint", style: "font-size:.88rem;margin-top:8px" }, "First needed in ", h("a", { href: "#" + t.mod, onclick: MM.closeSheet }, C.byId[t.mod].code), " · reused in ", t.used.map((u, i) => [i ? ", " : "", h("a", { href: "#" + u, onclick: MM.closeSheet }, C.byId[u].code)])));
      page.append(card);
      if (MM.toolLabs && MM.toolLabs[t.id]) { try { MM.toolLabs[t.id](lab); } catch (e) { lab.remove(); } } else lab.remove();
    });
  };

  VIEWS.notebook = function (page, o) {
    const inSheet = o && o.inSheet;
    if (!inSheet) page.append(h("h1", null, "My Explanations"), h("p", { class: "muted reading", style: "margin:8px 0 16px" }, "Everything you have written in your own words. Saying an idea yourself exposes the gaps; these notes become your book in the Phase 2 finale."));
    const notes = store.state.notes;
    const ids = C.order.filter((id) => notes[id] && notes[id].text);
    if (!ids.length) { page.append(h("div", { class: "empty" }, "No explanations yet. Each station ends with an explain-back box; what you write appears here.")); return; }
    ids.forEach((id) => {
      const m = C.byId[id], n = notes[id];
      page.append(h("article", { class: "card", style: "margin-bottom:10px" }, h("div", { class: "row" }, h("span", { class: "roundel l" + m.line, style: "width:26px;height:26px;font-size:.85rem" }, m.line), h("h3", { class: "grow" }, m.code + " · " + m.title), h("span", { class: "faint", style: "font-size:.82rem" }, new Date(n.ts).toLocaleDateString("en-GB"))),
        h("p", { style: "margin-top:8px;white-space:pre-wrap" }, n.text), n.ticks ? h("div", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, n.ticks.filter(Boolean).length + " of " + n.ticks.length + " key points covered") : null));
    });
    if (!inSheet) page.append(h("button", { class: "btn", style: "margin-top:8px", onclick: (ev) => MM.copy(ids.map((id) => "## " + C.byId[id].code + " " + C.byId[id].title + "\n\n" + notes[id].text).join("\n\n"), ev.target) }, "Copy all as text"));
  };

  VIEWS.prefs = function (page) {
    const st = store.state.settings;
    const set = (k, v) => { store.update((s_) => { s_.settings[k] = v; }); MM.applySettings(); };
    page.append(h("h1", null, "Settings"));
    const rows = [
      ["Depth", "Expert shows the exact version on every screen, with the simpler picture one tap away. Lighter shows the simpler picture first.", MM.seg([{ label: "Expert path", value: "expert" }, { label: "Lighter path", value: "light" }], st.depth, (v) => set("depth", v), "Default depth")],
      ["Theme", "Follows your device unless you choose.", MM.seg([{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }], st.theme, (v) => set("theme", v), "Theme")],
      ["Text size", "Larger text for easier reading.", MM.seg([{ label: "Normal", value: "normal" }, { label: "Large", value: "large" }], st.size, (v) => set("size", v), "Text size")],
      ["Motion", "Reduced motion keeps every visual but removes animation.", MM.seg([{ label: "Full", value: "full" }, { label: "Reduced", value: "reduced" }], st.motion, (v) => set("motion", v), "Motion")],
      ["Path", "Express skips the two side quests; everything else stays.", MM.seg([{ label: "Full path", value: "full" }, { label: "Express", value: "express" }], st.path, (v) => set("path", v), "Path")]];
    page.append(h("div", { class: "stack", style: "--gap:12px;margin-top:14px;max-width:46rem" }, rows.map(([t, d, c]) => h("div", { class: "card" }, h("h3", null, t), h("p", { class: "muted", style: "margin:4px 0 10px;font-size:.95rem" }, d), c))));
    const status = h("p", { class: "muted", style: "font-size:.95rem;margin:4px 0 10px" }, store.remote ? "Your progress is saved to your Claude account, so it follows you to other devices." : "Your progress is saved in this browser. Copy it to move it to another device.");
    const ta = h("textarea", { id: "progress-io", placeholder: "Paste a progress file here to import it", "aria-label": "Progress file" });
    page.append(h("div", { class: "card", style: "margin-top:12px;max-width:46rem" }, h("h3", null, "Your progress"), status,
      h("div", { class: "row" }, h("button", { class: "btn", onclick: (e) => MM.copy(store.exportText(), e.target) }, "Copy progress file"),
        h("button", { class: "btn", onclick: () => { try { store.importText(ta.value); MM.toast("Progress imported"); } catch (e) { MM.toast(e.message || "That file could not be read."); } } }, "Import")), h("div", { style: "margin-top:10px" }, ta)));
    let armed = false;
    const reset = h("button", { class: "btn ghost", style: "margin-top:12px" }, "Reset all progress");
    reset.onclick = () => { if (!armed) { armed = true; reset.textContent = "Tap again to erase everything"; return; } store.update((s_) => Object.assign(s_, blank(), { settings: s_.settings })); MM.toast("Progress reset"); go("hub"); };
    page.append(reset);
  };

  VIEWS.review = function (page) {
    page.append(h("h1", null, "Review"), h("p", { class: "muted reading", style: "margin:8px 0 16px" }, "The Daily Five mixes questions from every station you have visited. Right answers come back after growing gaps; “sure but wrong” answers come back first, because they reveal hidden misconceptions."));
    const box = h("div", { class: "stack", style: "--gap:14px" });
    page.append(box, calibration());
    const ids = C.order.filter((id) => MM.modStatus(id) !== "new");
    if (!ids.length) { box.append(h("div", { class: "empty" }, "Visit a station first. Its recall questions will start your review queue.")); return; }
    box.append(h("div", { class: "faint" }, "Loading questions…"));
    Promise.all(ids.map((id) => MM.loadModule(id).catch(() => null))).then(() => {
      box.innerHTML = "";
      const bank = [];
      ids.forEach((id) => { const d = MM.defs[id]; if (d && d.recall) d.recall.forEach((q, i) => bank.push(Object.assign({ id: id + ".r" + (i + 1), mod: id }, q))); });
      const now = Date.now(), B = store.state.boxes;
      const due = bank.filter((q) => B[q.id] && B[q.id].due <= now).sort((a, b) => (B[b.id].flag - B[a.id].flag) || (B[a.id].due - B[b.id].due));
      const fresh = bank.filter((q) => !B[q.id]);
      const pick = due.slice(0, 5);
      for (const q of fresh) { if (pick.length >= 5) break; if (!pick.includes(q)) pick.push(q); }
      if (!pick.length) { box.append(h("div", { class: "empty" }, "Nothing is due. Come back tomorrow, or visit a new station.")); return; }
      box.append(h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Today's set"), h("span", { class: "faint" }, pick.length + " questions · " + due.length + " were due")));
      pick.forEach((q, i) => box.append(h("div", { class: "card" }, MM.question(q, { label: (i + 1) + " / " + pick.length + " · " + C.byId[q.mod].code, onAnswer: () => updateNav() }))));
    });
  };
  function calibration() {
    const all = Object.values(store.state.answers).flat().filter((a) => a.c);
    const wrap = h("section", { class: "card", style: "margin-top:20px" }, h("h3", null, "Calibration"), h("p", { class: "muted", style: "font-size:.95rem;margin:4px 0 10px" }, "Does your confidence match your accuracy? A calibrated learner who says “certain” is right almost every time."));
    if (all.length < 4) { wrap.append(h("div", { class: "faint" }, "Answer a few more questions with a confidence rating to see your chart.")); return wrap; }
    const names = ["Guessing", "Unsure", "Fairly sure", "Certain"];
    const rows = names.map((n, i) => { const xs = all.filter((a) => a.c === i + 1); return { label: n, p: xs.length ? xs.filter((a) => a.ok).length / xs.length : 0, n: xs.length }; });
    wrap.append(MM.bars(rows.map((r) => ({ label: r.label, p: r.p })), { scale: 1, plain: true, total: false, fmt: (it) => { const r = rows.find((x) => x.label === it.label); return r.n ? pct(r.p, 0) + " of " + r.n : "–"; } }));
    return wrap;
  }

  VIEWS.stars = function (page) {
    page.append(h("h1", null, "Concept Constellation"), h("p", { class: "muted reading", style: "margin:8px 0 14px" }, "Every concept in the course, grouped by the station that teaches it. A star brightens when you finish its station and glows when you have mastered it. Lines show which stations build on which."));
    const W = 1000, H = 760;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "Concept map of all stations" });
    const ids = C.order.filter((id) => C.concepts[id] || C.byId[id].finale);
    const pos = {};
    const p1 = ids.filter((id) => C.byId[id].line === 1), p2 = ids.filter((id) => C.byId[id].line === 2);
    const place = (list, cy, amp) => list.forEach((id, i) => { const t = list.length > 1 ? i / (list.length - 1) : 0.5; pos[id] = [70 + t * (W - 140), cy + Math.sin(t * Math.PI * 3) * amp]; });
    place(p1, 200, 70); place(p2, 560, 70);
    ids.forEach((id) => (C.byId[id].needs || []).forEach((n) => { if (pos[n]) svg.append(s("line", { x1: pos[n][0], y1: pos[n][1], x2: pos[id][0], y2: pos[id][1], stroke: "var(--rule)", "stroke-width": 1.5 })); }));
    ids.forEach((id) => {
      const m = C.byId[id], st = MM.modStatus(id), [x, y] = pos[id];
      const col = m.line === 2 ? "var(--line2)" : "var(--line1)";
      const list = C.concepts[id] || [];
      const g = s("g", { class: "box", tabindex: "0", role: "link", "aria-label": m.code + " " + m.title, style: "cursor:pointer", onclick: () => go(id), onkeydown: (e) => { if (e.key === "Enter") go(id); } });
      list.forEach((c, i) => {
        const a = (i / list.length) * Math.PI * 2, r = 30 + (i % 3) * 9;
        const lit = st === "mastered" ? 1 : st === "done" ? 0.75 : st === "started" ? 0.4 : 0.16;
        g.append(s("circle", { cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r, r: st === "mastered" ? 3.6 : 2.8, fill: col, opacity: lit }, s("title", { text: c })));
      });
      g.append(s("circle", { cx: x, cy: y, r: 13, fill: st === "new" ? "var(--sheet)" : col, stroke: col, "stroke-width": 3 }));
      g.append(s("text", { x, y: y + 52, "text-anchor": "middle", class: "t-disp", "font-size": 15, text: m.code }));
      svg.append(g);
    });
    svg.append(s("text", { x: 20, y: 40, class: "t-disp", "font-size": 18, fill: "var(--ink-3)", text: "Line 1 · LLMs" }), s("text", { x: 20, y: 410, class: "t-disp", "font-size": 18, fill: "var(--ink-3)", text: "Line 2 · Agent teams" }));
    page.append(h("div", { class: "bp scroll-x" }, svg));
    const total = Object.values(C.concepts).reduce((a, b) => a + b.length, 0);
    page.append(h("p", { class: "faint", style: "margin-top:8px;font-size:.9rem" }, total + " concepts across " + ids.length + " stations. Hover or long-press a star to see its concept."));
  };

  VIEWS.atlas = function (page) { MM.load("core/atlas.js").then(() => MM.atlas.page(page)).catch((e) => page.append(errorBox(e))); };

  /* ---------------------------------------------------------------- module loading */
  MM.defs = {};
  MM.defineModule = (def) => { MM.defs[def.id] = def; };
  MM.loadModule = (id) => (MM.defs[id] ? Promise.resolve(MM.defs[id]) : MM.load("modules/" + id + ".js").then(() => MM.defs[id]));

  /* ---------------------------------------------------------------- boot */
  MM.boot = function () {
    MM.applySettings();
    shell();
    window.addEventListener("hashchange", render);
    render();
    store.on(() => updateNav());
    store.connect();
    MM.ai.get();
    if (window.speechSynthesis) speechSynthesis.getVoices();
  };
})();
