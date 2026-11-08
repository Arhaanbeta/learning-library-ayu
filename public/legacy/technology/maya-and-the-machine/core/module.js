/* The module renderer: one familiar twelve-step shape for every station. */
(function () {
  const MM = window.MM, C = MM.course, h = MM.h, icon = MM.icon, store = MM.store;
  const TABS = { story: ["mystery", "where", "predict", "story", "spotlight"], lab: ["lab", "breakit"], check: ["clinic", "explain", "skeptic", "recall", "connect"] };

  MM.renderModule = function (page, id) {
    const meta = C.byId[id];
    const lc = meta.line === 2 ? "var(--line2)" : "var(--line1)";
    page.style.setProperty("--lc", lc);
    const ms = store.mod(id);
    const head = h("header", { class: "mhead" },
      h("div", null,
        h("div", { class: "row", style: "--gap:10px" },
          h("button", { class: "btn small ghost", onclick: () => MM.go("hub"), "aria-label": "Back to the map" }, icon("back"), "Map"),
          h("span", { class: "roundel l" + meta.line, style: "width:30px;height:30px;font-size:1rem" }, meta.line),
          h("span", { class: "eyebrow" }, meta.code + " · " + meta.act.replace(/^Act [IVX]+ · /, ""))),
        h("h1", { style: "margin-top:10px" }, meta.title),
        h("p", { class: "q" }, meta.q),
        h("div", { class: "row faint", style: "margin-top:10px;font-size:.88rem" }, h("span", null, "About " + meta.mins + " minutes"), lawsOf(id).length ? h("span", null, "Unlocks " + lawsOf(id).map(C.lawLabel).join(" and ")) : null)),
      h("div", { class: "card minimap", role: "link", tabindex: "0", "aria-label": "You are here. Open the Architecture Atlas.", onclick: () => MM.go("atlas") },
        h("div", null, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "You are here"), h("span", { class: "grow" }), h("span", { class: "faint", style: "font-size:.8rem" }, "Open Atlas")), h("div", { class: "parts" })), h("div", { class: "mini-slot" })));
    page.append(head);
    MM.load("core/atlas.js").then(() => MM.atlas.mini(head.querySelector(".mini-slot"), id, head.querySelector(".parts"))).catch(() => {});
    const body = h("div", null, h("div", { class: "faint", style: "padding:30px 0" }, "Loading the station…"));
    page.append(body);
    MM.loadModule(id).then((def) => {
      body.innerHTML = "";
      if (!def) throw new Error("Station content missing.");
      if (def.custom) { def.custom(body, makeApi(id, def)); return; }
      drawStandard(body, id, def, ms);
    }).catch((e) => {
      body.innerHTML = "";
      if (/Could not load modules/.test(e && e.message)) body.append(h("div", { class: "card reading", style: "margin-top:16px" }, h("h3", null, "This station is still being built"), h("p", { class: "muted", style: "margin-top:6px" }, "It will appear here soon, in the same shape as the finished stations. Meanwhile, its place in the whole system is shown in the Atlas."), h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn", onclick: () => MM.go("hub") }, "Back to the map"), h("button", { class: "btn ghost", onclick: () => MM.go("atlas") }, "Open the Atlas"))));
      else body.append(MM.errorBox(e));
    });
  };

  function lawsOf(id) { return C.laws.filter((l) => l.mod === id).map((l) => l.id); }

  function markDone(id, step) {
    const m = store.mod(id);
    if (m.done[step]) return;
    store.update((st) => { st.mods[id].done[step] = Date.now(); });
    document.querySelectorAll(`.dots i[data-step="${step}"]`).forEach((d) => d.classList.add("done"));
  }
  MM.markDone = markDone;

  function makeApi(id, def) {
    return { id, def, h, s: MM.s, MM, rich: MM.rich, richEl: MM.richEl, truth: MM.truth, tok: MM.tok, toks: MM.toks, vec: MM.vec, bars: MM.bars,
      slider: MM.slider, seg: MM.seg, question: MM.question, icon: MM.icon, lm: () => MM.loadMayaLM(), data: (n) => MM.loadData(n),
      done: (step) => markDone(id, step || "lab"), store, rng: MM.rng, pct: MM.pct, clamp: MM.clamp, speak: MM.speak, toast: MM.toast,
      graph: () => MM.load("core/graph.js").then(() => MM.graph), kernels: MM.k };
  }
  MM.makeApi = makeApi;

  function drawStandard(body, id, def, ms) {
    const api = makeApi(id, def);
    let tab = ms.tab || "story";
    const tabBtns = {};
    const tabsEl = h("div", { class: "seg", role: "tablist", "aria-label": "Station sections" });
    [["story", "Story"], ["lab", "Lab"], ["check", "Check"]].forEach(([k, label]) => {
      const b = h("button", { type: "button", role: "tab", "aria-pressed": String(k === tab), "aria-selected": String(k === tab) }, label);
      b.onclick = () => show(k);
      tabBtns[k] = b; tabsEl.append(b);
    });
    const dots = h("div", { class: "dots", "aria-label": "Steps done" });
    MM.STEPS.forEach((st) => dots.append(h("i", { "data-step": st, class: ms.done[st] ? "done" : "", title: MM.stepNames[st] })));
    const depthSeg = MM.seg([{ label: "Expert", value: "expert" }, { label: "Lighter", value: "light" }], store.state.settings.depth, (v) => { store.update((st) => { st.settings.depth = v; }, true); show(tab, true); }, "Depth");
    const bar = h("div", { class: "steps" }, h("div", { class: "in" }, tabsEl, dots));
    MM._depthSeg = depthSeg;
    const content = h("div");
    body.append(bar, content);

    function show(k, keepScroll) {
      tab = k;
      Object.entries(tabBtns).forEach(([kk, b]) => { b.setAttribute("aria-pressed", String(kk === k)); b.setAttribute("aria-selected", String(kk === k)); });
      store.update((st) => { st.mods[id].tab = k; }, true);
      if (MM.cleanup) { try { MM.cleanup(); } catch (e) {} MM.cleanup = null; }
      content.innerHTML = "";
      try {
        if (k === "story") drawStory(content, id, def, api);
        else if (k === "lab") drawLab(content, id, def, api);
        else drawCheck(content, id, def, api);
      } catch (e) { console.error(e); content.append(MM.errorBox(e)); }
      content.append(nextTabNav(k));
      if (!keepScroll) { const y = body.getBoundingClientRect().top + scrollY - 60; if (scrollY > y) scrollTo(0, y); }
    }
    function nextTabNav(k) {
      const order = ["story", "lab", "check"], i = order.indexOf(k);
      const names = { story: "Story", lab: "Lab", check: "Check" };
      return h("div", { class: "row", style: "margin-top:26px;justify-content:space-between;border-top:1px solid var(--rule);padding-top:14px" },
        i > 0 ? h("button", { class: "btn ghost", onclick: () => show(order[i - 1]) }, icon("back"), names[order[i - 1]]) : h("span"),
        i < 2 ? h("button", { class: "btn primary", onclick: () => show(order[i + 1]) }, "Go to " + names[order[i + 1]], icon("next")) : h("button", { class: "btn", onclick: () => MM.go("hub") }, "Back to the map"));
    }
    show(tab, true);
  }

  function section(n, title, extra) {
    return h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, String(n).padStart(2, "0")), h("h2", null, title), extra || null));
  }

  /* ---------------------------------------------------------------- Story tab */
  function drawStory(root, id, def, api) {
    markDone(id, "mystery");
    const sec1 = section(1, "Mystery");
    sec1.append(h("div", { class: "card reading" }, def.mystery.title ? h("h3", { style: "margin-bottom:8px" }, def.mystery.title) : null, MM.richEl(def.mystery.text)));
    if (def.mystery.visual) { const box = h("div", { class: "lab", style: "margin-top:12px" }); sec1.append(box); runVisual(def.mystery.visual, box, api); }
    root.append(sec1);

    const sec2 = section(2, "Where we are");
    const zoom = h("div");
    sec2.append(MM.richEl(def.where && def.where.text || "This station zooms into one part of the whole system.", "div", "reading muted"), zoom);
    root.append(sec2);
    MM.load("core/atlas.js").then(() => { MM.atlas.zoom(zoom, id); markDone(id, "where"); }).catch(() => markDone(id, "where"));

    const sec3 = section(3, "Predict");
    const player = h("div");
    if (def.predict) {
      const p = def.predict, saved = store.state.preds[id];
      const card = h("div", { class: "card reading" });
      if (saved) card.append(h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Your locked-in guess"), h("span", { class: "pill" }, ["Guessing", "Unsure", "Fairly sure", "Certain"][saved.conf - 1] || "")), MM.richEl(p.q, "div", "qstem"), h("div", { class: "opt", "aria-pressed": "true", style: "margin-top:8px" }, MM.richEl(p.options[saved.choice], "span")), h("p", { class: "faint", style: "margin-top:8px;font-size:.9rem" }, "The story below reveals the answer."));
      else {
        let choice = null, conf = 0;
        const btns = p.options.map((o, i) => { const b = h("button", { type: "button", class: "opt", "aria-pressed": "false" }, h("span", { class: "k" }, String.fromCharCode(65 + i)), MM.richEl(o, "span", "grow")); b.onclick = () => { choice = i; btns.forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); lock.disabled = !conf; }; return b; });
        const lock = h("button", { class: "btn primary", disabled: true }, "Lock in my guess");
        lock.onclick = () => { store.update((st) => { st.preds[id] = { choice, conf, t: Date.now() }; }); markDone(id, "predict"); MM.recordAnswer(id + ".p", choice === p.answer, conf); card.replaceWith(h("div", { class: "callout reading" }, "Locked in. Now watch what really happens.")); };
        card.append(MM.richEl(p.q, "div", "qstem"), h("div", { class: "opts", style: "margin:10px 0" }, btns), h("div", { class: "row" }, MM.confidence((c) => { conf = c; lock.disabled = choice === null; }), lock),
          h("button", { class: "btn ghost small", style: "margin-top:6px", onclick: () => { markDone(id, "predict"); card.replaceWith(h("p", { class: "faint" }, "Prediction skipped.")); } }, "Skip the prediction"));
      }
      sec3.append(card);
    } else markDone(id, "predict");
    root.append(sec3);

    const sec4 = section(4, "Guided story", h("span", { class: "faint", style: "font-size:.9rem" }, def.story.length + " beats · one idea each"));
    if (MM._depthSeg) sec4.querySelector("header").append(h("span", { class: "grow" }), h("span", { class: "eyebrow" }, "Depth"), MM._depthSeg);
    sec4.append(player);
    root.append(sec4);
    beatPlayer(player, id, def, api);
  }

  function runVisual(fn, box, api, state) {
    try {
      const r = fn(box, api, state);
      if (r && typeof r.then === "function") r.then((c) => { if (typeof c === "function") MM.cleanup = c; }).catch((e) => { console.error(e); box.append(MM.errorBox(e)); });
      else if (typeof r === "function") MM.cleanup = r;
    } catch (e) { console.error(e); box.append(MM.errorBox(e)); }
  }
  MM.runVisual = runVisual;

  function beatPlayer(root, id, def, api) {
    const list = def.story;
    let i = MM.clamp(store.mod(id).beat || 0, 0, list.length - 1);
    const stage = h("div", { class: "stage" });
    const narr = h("div", { class: "narr", "aria-live": "polite" });
    const pos = h("span", { class: "pos" });
    const back = h("button", { class: "btn", "aria-label": "Previous beat" }, icon("back"), "Back");
    const next = h("button", { class: "btn primary", "aria-label": "Next beat" }, "Next", icon("next"));
    const wrap = h("div", { class: "beat" }, stage, h("div", null, narr));
    const nav = h("div", { class: "beatnav" }, pos, back, next);
    root.append(wrap, nav);
    back.onclick = () => show(i - 1);
    next.onclick = () => (i < list.length - 1 ? show(i + 1) : MM.toast("End of the story. The Lab is next."));
    const key = (ev) => {
      if (ev.target.closest("input, textarea, select, [contenteditable]")) return;
      if (ev.key === "ArrowRight") { ev.preventDefault(); if (i < list.length - 1) show(i + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); if (i > 0) show(i - 1); }
    };
    document.addEventListener("keydown", key);
    const prevCleanup = MM.cleanup;
    MM.cleanup = () => { document.removeEventListener("keydown", key); if (beatCleanup) beatCleanup(); if (prevCleanup) prevCleanup(); };
    let beatCleanup = null;

    function show(n) {
      if (beatCleanup) { try { beatCleanup(); } catch (e) {} beatCleanup = null; }
      i = MM.clamp(n, 0, list.length - 1);
      const b = list[i];
      store.update((st) => { st.mods[id].beat = i; }, true);
      if (b.kind === "spotlight") markDone(id, "spotlight");
      if (i === list.length - 1) { markDone(id, "story"); if (!list.some((x) => x.kind === "spotlight")) markDone(id, "spotlight"); }
      pos.textContent = (i + 1) + " / " + list.length;
      back.disabled = i === 0;
      next.textContent = ""; next.append(i === list.length - 1 ? "Done" : "Next", icon("next"));
      stage.innerHTML = "";
      const box = h("div", { class: "lab fade-in" });
      stage.append(box);
      if (b.visual) {
        try {
          const r = b.visual(box, api, { beat: i });
          if (r && typeof r.then === "function") r.then((c) => { if (typeof c === "function") beatCleanup = c; }).catch((e) => { console.error(e); box.append(MM.errorBox(e)); });
          else if (typeof r === "function") beatCleanup = r;
        } catch (e) { console.error(e); box.append(MM.errorBox(e)); }
      } else box.append(h("div", { class: "faint" }, "…"));
      narr.innerHTML = "";
      const kinds = { story: "Story", spotlight: "Spotlight · a cleaner example", snap: "Snap back to Maya", real: "The real thing", recap: "Put it together" };
      narr.append(h("div", { class: "kind" }, h("span", { class: "eyebrow" }, kinds[b.kind || "story"]), b.truth ? MM.truth(b.truth) : null, h("span", { class: "grow" }),
        h("button", { class: "iconbtn", "aria-label": "Read aloud", "aria-pressed": "false", onclick: (ev) => MM.speak((b.title ? b.title + ". " : "") + b.text, ev.currentTarget) }, icon("speaker"))));
      if (b.title) narr.append(h("h3", null, b.title));
      narr.append(MM.richEl(b.text, "div", "text"));
      if (b.reveal && def.predict) narr.append(revealPrediction(id, def.predict));
      const layers = h("div", { class: "layers" });
      const light = store.state.settings.depth === "light";
      if (b.intuition) layers.append(layer("intuition", "Simpler picture", b.intuition + (b.breaks ? "" : ""), light, b.breaks));
      if (b.precision) layers.append(layer("precision", "Exact version", b.precision, !light));
      if (b.frontier) layers.append(layer("frontier", "Frontier", b.frontier, false, null, "optional"));
      if (layers.childNodes.length) narr.append(layers);
    }
    show(i);
  }

  function layer(cls, label, text, open, breaks, tag) {
    const body = h("div", { hidden: !open }, MM.richEl(text), breaks ? h("div", { class: "breaks" }, h("strong", null, "Where the picture breaks: "), MM.richEl(breaks, "span")) : null);
    const btn = h("button", { type: "button", "aria-expanded": String(!!open) }, label, h("span", { class: "tag" }, tag || (open ? "hide" : "show")));
    btn.onclick = () => { body.hidden = !body.hidden; btn.setAttribute("aria-expanded", String(!body.hidden)); btn.querySelector(".tag").textContent = tag || (body.hidden ? "show" : "hide"); };
    return h("div", { class: "layer " + cls }, btn, body);
  }
  MM.layer = layer;

  function revealPrediction(id, p) {
    const saved = store.state.preds[id];
    const right = p.options[p.answer];
    if (!saved) return h("div", { class: "callout" }, h("strong", null, "The answer: "), MM.richEl(right, "span"), p.why ? MM.richEl(p.why) : null);
    const ok = saved.choice === p.answer;
    return h("div", { class: "callout " + (ok ? "ok" : "warn") }, h("strong", null, ok ? "Your prediction was right. " : "Your prediction: "), ok ? null : MM.richEl(p.options[saved.choice], "span"), ok ? null : h("div", null, h("strong", null, "What happens: "), MM.richEl(right, "span")), p.why ? MM.richEl(p.why) : null,
      !ok && saved.conf >= 3 ? h("div", { class: "flag surewrong", style: "margin-top:6px;display:inline-block" }, "Sure but wrong · this is where the learning is") : null);
  }

  /* ---------------------------------------------------------------- Lab tab */
  function drawLab(root, id, def, api) {
    const L = def.lab;
    const sec = section(6, L.title || "Lab", L.truth ? MM.truth(L.truth) : null);
    if (L.intro) sec.append(MM.richEl(L.intro, "div", "reading"));
    if (L.tries && L.tries.length) {
      const tries = h("div", { class: "card", style: "margin:12px 0;padding:12px 14px" }, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Try this"));
      L.tries.forEach((t, i) => {
        const key = id + ".try" + i;
        const cb = h("input", { type: "checkbox", id: key, checked: !!store.state.ticks[key] });
        cb.onchange = () => { store.update((st) => { st.ticks[key] = cb.checked; }, true); markDone(id, "lab"); };
        tries.append(h("label", { for: key, style: "display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;padding:4px 0;cursor:pointer" }, cb, MM.richEl(t, "span")));
      });
      sec.append(tries);
    }
    const box = h("div", { class: "lab" });
    sec.append(box);
    root.append(sec);
    runVisual(L.mount, box, Object.assign({}, api, { done: () => markDone(id, "lab") }));
    if (def.breakit) {
      const B = def.breakit;
      const sb = section(7, B.title || "Break-it", B.truth ? MM.truth(B.truth) : null);
      if (B.intro) sb.append(MM.richEl(B.intro, "div", "reading"));
      if (B.mount) { const bb = h("div", { class: "lab", style: "margin-top:12px" }); sb.append(bb); runVisual(B.mount, bb, Object.assign({}, api, { done: () => markDone(id, "breakit") })); }
      if (B.cases) B.cases.forEach((c, i) => sb.append(breakCase(id, c, i)));
      if (B.explain) sb.append(h("div", { class: "card", style: "margin-top:12px" }, MM.question(B.explain, { label: "Explain what failed", noRecord: true, onAnswer: () => markDone(id, "breakit") })));
      root.append(sb);
    } else markDone(id, "breakit");
  }
  function breakCase(id, c, i) {
    const out = h("div", { hidden: true, style: "margin-top:10px" });
    const btn = h("button", { class: "btn small" }, c.action || "Break it");
    btn.onclick = () => { out.hidden = false; btn.disabled = true; markDone(id, "breakit"); };
    out.append(h("div", { class: "callout bad" }, h("strong", null, "What fails: "), MM.richEl(c.result, "span")), h("div", { class: "note", style: "margin-top:8px" }, h("strong", null, "Why: "), MM.richEl(c.why, "span")));
    if (c.visual) { const v = h("div", { class: "lab", style: "margin-top:8px" }); out.prepend(v); setTimeout(() => runVisual(c.visual, v, MM.makeApi(id, MM.defs[id])), 0); }
    return h("div", { class: "card", style: "margin-top:12px" }, h("div", { class: "row" }, h("h3", { class: "grow" }, c.name), btn), MM.richEl(c.what, "div", "muted"), out);
  }

  /* ---------------------------------------------------------------- Check tab */
  function drawCheck(root, id, def, api) {
    // 8 · misconception clinic
    const s8 = section(8, "Misconception clinic");
    s8.append(h("p", { class: "muted reading" }, "Wrong beliefs must be broken, not just covered over. Decide first, then run the test."));
    let mythsDone = 0;
    (def.clinic || []).forEach((m, i) => {
      const out = h("div", { hidden: true, class: "stack", style: "--gap:8px;margin-top:6px" });
      const ask = h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Do you believe it?"));
      ["It's true", "It's false", "Not sure"].forEach((lab, j) => ask.append(h("button", { class: "btn small", onclick: () => { ask.remove(); out.hidden = false; out.prepend(h("div", { class: "callout " + (j === 1 ? "ok" : "warn") }, j === 1 ? "Right: it is false. Here is the test that breaks it." : "It is false. Here is the test that breaks it.")); if (++mythsDone === def.clinic.length) markDone(id, "clinic"); } }, lab)));
      out.append(h("div", { class: "note" }, h("strong", null, "The test: "), MM.richEl(m.test, "span")));
      if (m.visual) { const v = h("div", { class: "lab" }); out.append(v); const run = () => runVisual(m.visual, v, api); ask.addEventListener("click", run, { once: true }); }
      out.append(h("div", { class: "note ok" }, h("strong", null, "The truth: "), MM.richEl(m.truth, "span")));
      s8.append(h("div", { class: "card myth", style: "margin-top:10px" }, h("div", { class: "belief" }, m.belief), ask, out));
    });
    if (!def.clinic || !def.clinic.length) markDone(id, "clinic");
    root.append(s8);

    // 9 · explain-back
    const s9 = section(9, "Explain it back");
    s9.append(explainBack(id, def));
    root.append(s9);

    // 10 · skeptic
    const s10 = section(10, "The Skeptic's corner");
    s10.append(h("p", { class: "muted reading" }, "The Skeptic doubts everything. Answer in your own words first, then compare with an answer built from the Laws."));
    let opened = 0;
    (def.skeptic || []).forEach((sk, i) => s10.append(skepticCard(id, sk, () => { if (++opened === def.skeptic.length) markDone(id, "skeptic"); })));
    root.append(s10);

    // 11 · recall
    const s11 = section(11, "Recall check");
    s11.append(h("p", { class: "muted reading" }, "Five quick questions, some from earlier stations. Rate how sure you are before you check: “sure but wrong” answers come back first in your Daily Five."));
    let answered = 0;
    (def.recall || []).forEach((q, i) => s11.append(h("div", { class: "card", style: "margin-top:10px" }, MM.question(Object.assign({ id: id + ".r" + (i + 1) }, q), { label: "Question " + (i + 1), onAnswer: () => { if (++answered === def.recall.length) markDone(id, "recall"); } }))));
    root.append(s11);

    // 12 · connect & unlock
    const s12 = section(12, "Connect and unlock");
    s12.append(connect(id, def));
    root.append(s12);
  }

  function explainBack(id, def) {
    const E = def.explain || { prompt: "Explain the big idea of this station in two or three sentences.", points: [] };
    const saved = store.state.notes[id] || {};
    const ta = h("textarea", { id: "explain-" + id, placeholder: "Write it as if to a friend who has never heard of it…", "aria-label": E.prompt });
    ta.value = saved.text || "";
    const save = MM.debounce(() => store.update((st) => { st.notes[id] = Object.assign({}, st.notes[id], { text: ta.value, ts: Date.now() }); }, true), 600);
    ta.addEventListener("input", save);
    const check = h("div", { hidden: !saved.checked, style: "margin-top:12px" });
    const ticks = (saved.ticks || E.points.map(() => false)).slice();
    check.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Mark your own answer: did you cover…"));
    E.points.forEach((p, i) => {
      const cb = h("input", { type: "checkbox", id: `pt-${id}-${i}`, checked: !!ticks[i] });
      cb.onchange = () => { ticks[i] = cb.checked; store.update((st) => { st.notes[id] = Object.assign({}, st.notes[id], { ticks }); }, true); };
      check.append(h("label", { for: cb.id, style: "display:grid;grid-template-columns:22px 1fr;gap:8px;padding:3px 0;cursor:pointer" }, cb, MM.richEl(p, "span")));
    });
    const fb = h("div", { "aria-live": "polite" });
    const live = h("button", { class: "btn small", hidden: true }, icon("bolt"), "Get feedback from Claude");
    MM.ai.available().then((ok) => { live.hidden = !ok; });
    live.onclick = async () => {
      if (ta.value.trim().length < 40) { MM.toast("Write two or three sentences first."); return; }
      live.disabled = true; fb.innerHTML = ""; fb.append(h("div", { class: "faint pulse", style: "margin-top:8px" }, "Thinking…"));
      const prompt = `You are a warm, exact tutor. A learner (14-15 years old, English is not their first language) explained an AI concept in their own words.\nTopic: ${C.byId[id].title}. Question: ${E.prompt}\nKey points a strong answer covers:\n${E.points.map((p, i) => i + 1 + ". " + MM.plain(p)).join("\n")}\n\nLearner's explanation:\n"""${ta.value.slice(0, 2500)}"""\n\nReply with only JSON: {"covered": [numbers of key points covered], "missing": [numbers missing], "mistake": "one sentence naming any factual error, or empty string", "feedback": "2-3 short sentences in very simple English: what is good, then the single most useful improvement"}`;
      try {
        const r = await MM.ai.ask(prompt, { json: true });
        fb.innerHTML = "";
        fb.append(h("div", { class: "callout", style: "margin-top:10px" }, h("div", { class: "row" }, h("strong", null, "Claude's feedback"), MM.truth("REAL", "Generated live by Claude for your answer.")), h("p", { style: "margin-top:6px" }, String(r.feedback || "")), r.mistake ? h("p", { class: "note bad", style: "margin-top:6px" }, String(r.mistake)) : null,
          Array.isArray(r.missing) && r.missing.length ? h("p", { class: "muted", style: "margin-top:6px;font-size:.92rem" }, "Not yet covered: " + r.missing.map((n) => MM.plain(E.points[n - 1] || "")).filter(Boolean).join(" · ")) : null));
      } catch (e) { fb.innerHTML = ""; fb.append(h("p", { class: "note warn", style: "margin-top:8px" }, MM.ai.message(e))); }
      live.disabled = false;
    };
    const btn = h("button", { class: "btn primary small" }, "Save and check");
    btn.onclick = () => {
      if (ta.value.trim().length < 40) { MM.toast("Write two or three sentences first."); ta.focus(); return; }
      store.update((st) => { st.notes[id] = Object.assign({}, st.notes[id], { text: ta.value, ts: Date.now(), checked: true, ticks }); });
      check.hidden = false; markDone(id, "explain"); MM.toast("Saved to My Explanations");
    };
    return h("div", { class: "card reading" }, MM.richEl(E.prompt, "div", "qstem"), h("div", { style: "margin-top:10px" }, ta), h("div", { class: "row", style: "margin-top:10px" }, btn, live), check, fb);
  }

  function skepticCard(id, sk, onOpen) {
    const face = h("div", { class: "face", "aria-hidden": "true" }, icon("skeptic"));
    const ta = h("textarea", { placeholder: "Your answer (optional)", "aria-label": "Your answer to the Skeptic", style: "min-height:80px" });
    const ans = h("div", { hidden: true, class: "stack", style: "--gap:8px;margin-top:8px" });
    ans.append(h("div", { class: "row" }, h("span", { class: "eyebrow" }, "An answer built from the Laws"), (sk.laws || []).map((l) => h("button", { class: "chip law" + (C.lawById[l] && C.lawById[l].phase === 2 ? " p2" : ""), "data-law": l, type: "button" }, C.lawLabel(l)))), MM.richEl(sk.a));
    if (sk.ladder) ans.append(h("div", { class: "eyebrow", style: "margin-top:6px" }, "Why-ladder"), h("ol", { class: "ladder" }, sk.ladder.map((r) => h("li", null, MM.richEl(r, "span")))));
    const live = h("div", { "aria-live": "polite" });
    const push = h("button", { class: "btn small", hidden: true }, icon("bolt"), "Let the Skeptic push back");
    MM.ai.available().then((ok) => { push.hidden = !ok; });
    push.onclick = async () => {
      if (ta.value.trim().length < 20) { MM.toast("Write your own answer first."); return; }
      push.disabled = true; live.innerHTML = ""; live.append(h("div", { class: "faint pulse" }, "The Skeptic is thinking…"));
      const prompt = `Play "the Skeptic": a friendly but sharp challenger in an AI course for a 14-15-year-old whose English is not their first language. Use very simple English, short sentences.\nChallenge: ${MM.plain(sk.q)}\nModel answer (do not just repeat it): ${MM.plain(sk.a)}\nLaws it uses: ${(sk.laws || []).map((l) => C.lawById[l] ? C.lawById[l].name + ": " + C.lawById[l].simple : l).join(" | ")}\nLearner's answer: """${ta.value.slice(0, 1500)}"""\n\nReply in under 90 words: first say plainly whether the learner's answer holds up and name any error. Then ask ONE harder follow-up "why?" question that climbs one step deeper.`;
      try {
        await MM.ai.ask(prompt, { options: { cache: false, onText: ({ text }) => { live.innerHTML = ""; live.append(h("div", { class: "bubble", style: "margin-top:8px" }, text)); } } });
      } catch (e) { live.innerHTML = ""; live.append(h("p", { class: "note warn" }, MM.ai.message(e))); }
      push.disabled = false;
    };
    const reveal = h("button", { class: "btn small" }, "Show the answer");
    reveal.onclick = () => { ans.hidden = false; reveal.remove(); onOpen(); };
    return h("div", { class: "skeptic", style: "margin-top:14px" }, face, h("div", { class: "stack", style: "--gap:8px" }, h("div", { class: "bubble" }, MM.richEl(sk.q)), ta, h("div", { class: "row" }, reveal, push), ans, live));
  }

  function connect(id, def) {
    const meta = C.byId[id];
    const laws = lawsOf(id);
    const wrap = h("div", { class: "stack", style: "--gap:14px" });
    if (def.depth && def.depth.length) {
      const list = h("div", { class: "depth" });
      def.depth.forEach(([t, d], i) => {
        const key = id + ".d" + i;
        const cb = h("input", { type: "checkbox", checked: !!store.state.ticks[key], "aria-label": "I can explain: " + MM.plain(t), onclick: (e) => e.stopPropagation() });
        cb.onchange = () => store.update((st) => { st.ticks[key] = cb.checked; }, true);
        list.append(h("details", null, h("summary", null, cb, MM.richEl(t, "span")), h("div", null, MM.richEl(d))));
      });
      wrap.append(h("div", null, h("h3", null, "Expert depth"), h("p", { class: "muted", style: "margin:4px 0 10px;font-size:.95rem" }, "The real syllabus of this station: the precise ideas you must be able to explain. Open each one, and tick it when you could explain it to someone else."), list));
    }
    if (def.connect && def.connect.links) wrap.append(h("div", { class: "card" }, h("h3", null, "Connections"), h("ul", { style: "margin:8px 0 0;padding-left:20px" }, def.connect.links.map((l) => h("li", { style: "margin:4px 0" }, MM.richEl(l, "span"))))));
    const nextId = (def.connect && def.connect.next) || C.order[C.order.indexOf(id) + 1];
    const next = C.byId[nextId];
    const status = h("div");
    const finish = h("button", { class: "btn primary" }, icon("check"), "Finish this station");
    finish.onclick = () => {
      const missing = MM.STEPS.filter((s_) => s_ !== "connect" && !store.mod(id).done[s_]);
      store.update((st) => { st.mods[id].done.connect = Date.now(); st.mods[id].completed = Date.now(); laws.forEach((l) => { st.laws[l] = st.laws[l] || Date.now(); }); });
      document.querySelectorAll('.dots i[data-step="connect"]').forEach((d) => d.classList.add("done"));
      status.innerHTML = "";
      status.append(h("div", { class: "callout ok fade-in" }, h("strong", null, "Station complete. "), laws.length ? "You unlocked " + laws.map((l) => C.lawLabel(l) + ", " + C.lawById[l].name).join(" and ") + ". " : "", missing.length ? "You skipped: " + missing.map((x) => MM.stepNames[x]).join(", ") + ". You can come back to them any time." : "Every step is done.",
        laws.map((l) => h("div", { class: "note", style: "margin-top:8px" }, h("strong", null, C.lawById[l].name + ": "), C.lawById[l].simple))));
      finish.textContent = "Station complete";
      finish.disabled = true;
    };
    if (store.mod(id).completed) { finish.disabled = true; finish.textContent = "Station complete"; }
    wrap.append(h("div", { class: "row" }, finish), status);
    if (next) wrap.append(h("div", { class: "card", style: "--lc:" + (next.line === 2 ? "var(--line2)" : "var(--line1)") }, h("div", { class: "eyebrow" }, "Next station"),
      h("div", { class: "row", style: "margin:6px 0" }, h("span", { class: "roundel l" + next.line, style: "width:28px;height:28px;font-size:.95rem" }, next.line), h("h3", null, next.code + " · " + next.title)),
      def.connect && def.connect.line ? MM.richEl(def.connect.line, "div", "muted") : h("p", { class: "muted" }, next.q), h("button", { class: "btn", style: "margin-top:10px", onclick: () => MM.go(nextId) }, "Go to " + next.code, icon("next"))));
    return wrap;
  }
})();
