/* F2 · Phase 2 Finale — the Architect's Studio, the Debugger Challenge, the Defense, and your book. */
(function () {
  const MM = window.MM, h = MM.h, C = MM.course;
  const store = MM.store;
  const blank = () => ({ studio: {}, debug: {}, defense: {}, ladder: {} });
  const F = () => (store.state.extra.f2 = store.state.extra.f2 || blank());
  const save = (fn, quiet) => store.update((st) => { st.extra.f2 = st.extra.f2 || blank(); fn(st.extra.f2); }, quiet);
  const section = (n, title, ...kids) => h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, n), h("h2", null, title)), ...kids);
  const f0 = () => ({});

  /* ================================================================ 01 · the Architect's Studio */
  const DEFAULT = { research: "single", merge: "replace", loop: false, maxTries: 0, approval: false, charge: "before", saver: false, memory: false, reader: "full", limit: 25 };
  const COSTS = [690, 640, 590];
  function buildDesign(G, d, side, store_) {
    const sch = { request: {}, budget: {}, prefs: {}, research: d.merge === "append" ? { reducer: "append" } : {}, draft: {}, cost: {}, tries: {}, approved: {}, booking: {}, note: {} };
    const g = G.graph(sch);
    const food = (st) => "food: " + (st.prefs ? "vegetarian trattoria in Trastevere" : "steakhouse near the Pantheon");
    g.node("lead", (st, ctx) => { const p = d.memory && ctx.store ? ctx.store.get(["tom", "preferences"], "food") : null; return { prefs: p ? p.value.likes : "" }; }, { kind: "llm" });
    if (d.research === "parallel") {
      g.node("weather", () => ({ research: ["weather: rain on Saturday afternoon"] }), { kind: "llm" }).node("trains", () => ({ research: ["trains: Milan-Rome return, 120 euros"] }), { kind: "llm" }).node("food", (st) => ({ research: [food(st)] }), { kind: "llm" });
      g.edge(G.START, "lead").cond("lead", (st) => [G.Send("weather", {}), G.Send("trains", {}), G.Send("food", { prefs: st.prefs })], ["weather", "trains", "food"], { send: true });
      ["weather", "trains", "food"].forEach((n) => g.edge(n, "writer"));
    } else {
      g.node("research", (st) => ({ research: ["weather: rain on Saturday afternoon; trains: Milan-Rome return, 120 euros; " + food(st)] }), { kind: "llm" });
      g.edge(G.START, "lead").edge("lead", "research").edge("research", "writer");
    }
    g.node("writer", (st) => ({ draft: `draft ${(st.tries || 0) + 1}`, cost: COSTS[Math.min(st.tries || 0, 2)], tries: (st.tries || 0) + 1 }), { kind: "llm" });
    const after = d.approval ? "approve" : "book";
    if (d.loop) {
      g.node("critic", (st) => ({ approved: st.cost <= st.budget }), { kind: "llm" }).edge("writer", "critic");
      const paths = { fits: after, over: "writer" };
      if (d.maxTries > 0) { paths["out of tries"] = "give_up"; g.node("give_up", (st) => ({ note: `No plan fits ${st.budget} euros after ${st.tries} drafts: ask Tom.` }), { kind: "fn", label: "give up" }).edge("give_up", G.END); }
      g.cond("critic", (st) => (st.approved ? "fits" : d.maxTries > 0 && st.tries >= d.maxTries ? "out of tries" : "over"), paths);
    } else g.edge("writer", after);
    if (d.approval) {
      g.node("approve", (st, ctx) => {
        if (d.charge === "before") side.push(`charged Tom's card ${st.cost} euros`);
        side.push("prepared the summary for Tom");
        const ans = ctx.interrupt({ question: `Book the Rome trip? Total ${st.cost} euros (budget ${st.budget}).` });
        return ans === "approve" ? G.Command({ update: { approved: true }, goto: "book" }) : G.Command({ update: { approved: false }, goto: G.END });
      }, { kind: "human", label: "Tom approves", destinations: ["book", G.END], commandOnly: true });
    }
    g.node("book", (st) => { if (!(d.approval && d.charge === "before")) side.push(`charged Tom's card ${st.cost} euros`); side.push("BOOKED the train and hotel"); return { booking: `confirmed, ${st.cost} euros` }; }, { kind: "tool" }).edge("book", G.END);
    return g.compile({ checkpointer: d.saver ? G.MemorySaver() : null, store: store_ });
  }
  function designSpec(d) {
    const par = d.research === "parallel", nodes = { lead: { x: 150, y: 70, kind: "llm" } };
    if (par) Object.assign(nodes, { weather: { x: 310, y: 22, kind: "llm" }, trains: { x: 310, y: 80, kind: "llm" }, food: { x: 310, y: 138, kind: "llm" } });
    else nodes.research = { x: 310, y: 70, kind: "llm" };
    nodes.writer = { x: 470, y: 70, kind: "llm" };
    if (d.loop) nodes.critic = { x: 620, y: 70, kind: "llm" };
    if (d.loop && d.maxTries > 0) nodes.give_up = { x: 620, y: 160, kind: "fn", label: "give up" };
    if (d.approval) nodes.approve = { x: 620, y: 245, kind: "human", label: "Tom approves", w: 128 };
    nodes.book = { x: 420, y: 245, kind: "tool" };
    return { W: 720, H: 290, nodes, start: { x: 45, y: 70 }, end: { x: 220, y: 245 }, labels: { "critic>writer": "over budget", "critic>approve": "fits", "critic>book": "fits", "critic>give_up": "out of tries" }, via: { "critic>writer": [[620, 16], [470, 16]], "give_up>__end__": [[700, 160], [700, 282], [220, 282]], "approve>__end__": [[620, 282], [220, 282]], "writer>book": d.loop ? undefined : [[470, 245]], "writer>approve": d.loop ? undefined : [[620, 130]] } };
  }
  const RUBRIC = [
    ["merge", "Parallel results can merge", "A3", (d) => d.research !== "parallel" || d.merge === "append", "Three researchers wrote the same field in one round. With no reducer that is an InvalidUpdateError; it needs append."],
    ["budget", "The budget is checked in code", "A4", (d) => d.loop, "Without a critic step, the first draft (690 euros) goes straight to booking."],
    ["exit", "The loop has a planned exit", "A4", (d) => !d.loop || d.maxTries > 0, "Only the recursion limit stops a stubborn loop. Count the tries in the state and give up politely."],
    ["gate", "Tom approves before money moves", "A9", (d) => d.approval, "Booking and paying are consequential actions: they need a human gate."],
    ["after", "The charge happens after approval", "A9", (d) => !d.approval || d.charge === "after", "The approve node re-runs from its first line on resume, so a charge before interrupt() happens twice."],
    ["saver", "The pause can be resumed", "A8", (d) => !d.approval || d.saver, "Without a checkpointer: “Cannot use Command(resume=...) without checkpointer”."],
    ["memory", "It knows Tom is vegetarian", "A8", (d) => d.memory, "Tom said it in another chat. Lasting facts belong in the Store, read by namespace."],
    ["reader", "The review reader has least privilege", "A10", (d) => d.reader === "none", "Researchers read untrusted reviews. Give them no booking or email tools."]];

  function studio(root, api) {
    const d = Object.assign({}, DEFAULT, F().studio.design || {});
    const ctl = h("div", { class: "two" }), pic = h("div", { class: "bp", style: "padding:6px" }), out = h("div"), runBox = h("div"), rub = h("div"), aiBox = h("div");
    const seg = (key, opts, label) => h("div", { class: "stack", style: "--gap:4px" }, h("div", { class: "eyebrow" }, label), MM.seg(opts.map(([v, l]) => ({ value: v, label: l })), d[key], (v) => { d[key] = v; changed(); }));
    const cb = (key, label) => { const i = h("input", { type: "checkbox", id: "st-" + key, checked: !!d[key] }); i.onchange = () => { d[key] = i.checked; changed(); }; return h("label", { for: "st-" + key, class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, i, label); };
    const tries = h("select", { "aria-label": "Maximum drafts", style: "width:auto" }, [0, 1, 2, 3, 4, 5].map((n) => h("option", { value: n, selected: n === d.maxTries }, n ? n + " drafts at most" : "no counter")));
    tries.onchange = () => { d.maxTries = +tries.value; changed(); };
    ctl.append(
      h("div", { class: "stack", style: "--gap:10px" }, seg("research", [["single", "One researcher"], ["parallel", "Three in parallel (Send)"]], "Research"), seg("merge", [["replace", "replace"], ["append", "append"]], "research field: merge rule"),
        h("div", { class: "stack", style: "--gap:4px" }, h("div", { class: "eyebrow" }, "Budget"), cb("loop", "Writer–critic loop (budget check in code)"), h("div", { class: "row", style: "--gap:6px" }, h("span", { class: "faint", style: "font-size:.88rem" }, "counter:"), tries))),
      h("div", { class: "stack", style: "--gap:10px" }, h("div", { class: "stack", style: "--gap:4px" }, h("div", { class: "eyebrow" }, "Approval and memory"), cb("approval", "Tom approves before booking (interrupt)"), cb("saver", "Checkpointer attached"), cb("memory", "Read Tom's preferences from the Store")),
        seg("charge", [["before", "Charge inside the approval node"], ["after", "Charge in the book node"]], "Where the card is charged"), seg("reader", [["full", "Researchers have all tools"], ["none", "Review readers: no tools"]], "Least privilege")));
    function changed() { save((f) => { f.studio.design = Object.assign({}, d); }, true); draw(); out.innerHTML = ""; runBox.innerHTML = ""; rub.innerHTML = ""; aiBox.innerHTML = ""; }
    let G;
    function draw() { if (!G) return; pic.innerHTML = ""; try { const side = []; pic.append(G.draw(buildDesign(G, d, side, G.Store()).b, designSpec(d), { maxW: 740 })); } catch (e) { pic.append(h("p", { class: "note bad" }, e.message)); } }
    function run() {
      const side = [], st_ = G.Store(); st_.put(["tom", "preferences"], "food", { likes: "vegetarian" });
      const app = buildDesign(G, d, side, st_), thread = "tom-rome";
      const input = { request: "A weekend in Rome", budget: 600, prefs: "", research: [], draft: "", cost: 0, tries: 0, approved: false, booking: "", note: "" };
      let res = app.run(input, { thread, limit: d.limit }), resumed = null, resumeErr = null;
      if (res.outcome.status === "interrupted") { try { resumed = app.run(G.Command({ resume: "approve" }), { thread }); } catch (e) { resumeErr = e.name + ": " + e.message; } }
      const final = resumed || res, state = final.state || final.values;
      const charges = side.filter((x) => /charged/.test(x)).length;
      const llmCalls = [res, resumed].filter(Boolean).reduce((a, r) => a + r.steps.reduce((b, x) => b + x.tasks.filter((t) => app.b.nodes[t.name] && app.b.nodes[t.name].kind === "llm").length, 0), 0);
      const veg = /vegetarian/.test(JSON.stringify(state.research || ""));
      const okTrip = state.booking && state.cost <= 600 && charges === 1 && d.approval && veg;
      out.innerHTML = "";
      out.append(...[h("div", { class: "row", style: "--gap:16px;margin:8px 0" }, [[final.outcome.status === "done" ? (state.booking ? "booked" : state.note ? "gave up" : "ended") : final.outcome.error || final.outcome.status, "outcome"], [state.cost ? state.cost + " €" : "—", "cost (budget 600)"], [charges, "card charges"], [llmCalls, "LLM node runs"], [veg ? "vegetarian" : "steakhouse", "dinner pick"]].map(([n, l]) => h("div", null, h("div", { class: "t-disp", style: "font-size:1.2rem" }, String(n)), h("div", { class: "faint", style: "font-size:.8rem" }, l)))),
        resumeErr ? h("div", { class: "callout bad" }, h("strong", null, "Tom tapped Approve, but: "), resumeErr) : null,
        final.outcome.status === "error" ? G.outcomeBox(final.outcome) : null,
        side.length ? h("div", { class: "log", style: "margin-top:8px" }, side.map((x) => h("div", { class: /charged/.test(x) ? "err" : /BOOKED/.test(x) ? "ok" : "" }, x))) : null,
        h("div", { class: "callout " + (okTrip ? "ok" : "warn"), style: "margin-top:8px" }, okTrip ? "Tom's trip works: approved, within budget, charged once, and dinner he can eat." : "The brief is not met yet. Read the review below.")].filter(Boolean));
      runBox.innerHTML = "";
      G.player(runBox, { builder: app.b, spec: designSpec(d), run: resumed || res, schema: app.b.schema, boardOpts: { max: 60 }, builderNoSaver: !d.saver });
      const results = RUBRIC.map(([k, t, st, test, why]) => ({ k, t, st, ok: test(d), why }));
      rub.innerHTML = "";
      rub.append(h("div", { class: "eyebrow", style: "margin-top:12px" }, `Design review: ${results.filter((r) => r.ok).length} of ${results.length}`), h("div", { class: "stack", style: "--gap:6px;margin-top:6px" }, results.map((r) => h("div", { class: "note " + (r.ok ? "ok" : "bad") }, h("strong", null, (r.ok ? "✓ " : "✗ ") + r.t), h("span", { class: "faint" }, ` · ${r.st}`), r.ok ? null : h("div", { class: "muted", style: "font-size:.9rem" }, r.why)))));
      save((f) => { f.studio.design = Object.assign({}, d); f.studio.score = results.filter((r) => r.ok).length; f.studio.ok = !!okTrip; f.studio.ran = Date.now(); });
      MM.markDone("f2", "lab"); api.refresh();
      MM.ai.available().then((ok) => {
        aiBox.innerHTML = ""; if (!ok) return;
        const b = h("button", { class: "btn small" }, MM.icon("bolt"), "Ask Claude to review this design"), live = h("div", { "aria-live": "polite" });
        b.onclick = async () => {
          b.disabled = true; live.innerHTML = ""; live.append(h("div", { class: "faint pulse" }, "Reviewing…"));
          const desc = `research: ${d.research} (merge ${d.merge}); writer-critic loop: ${d.loop ? "on, " + (d.maxTries ? d.maxTries + " drafts max" : "no counter") : "off"}; approval: ${d.approval ? "on, charge " + d.charge + " approval node" : "off"}; checkpointer: ${d.saver}; Store memory: ${d.memory}; researchers' tools: ${d.reader}. Run outcome: ${final.outcome.status}${resumeErr ? " (" + resumeErr + ")" : ""}, cost ${state.cost}, charges ${charges}.`;
          const prompt = `You review a learner's LangGraph design for Tom's Rome weekend (budget 600 euros, Tom must approve before booking, Tom is vegetarian, researchers read untrusted reviews). The learner is 14-15 and English is not their first language: use very simple English and short sentences.\nDesign: ${desc}\nFailed checks: ${results.filter((r) => !r.ok).map((r) => r.t).join("; ") || "none"}.\nIn under 120 words: name the single most important weakness and why it matters in real life, say one thing that is well designed, and ask one "what would happen if…" question.`;
          try { await MM.ai.ask(prompt, { options: { cache: false, onText: ({ text }) => { live.innerHTML = ""; live.append(h("div", { class: "bubble", style: "margin-top:8px" }, text)); } } }); }
          catch (e) { live.innerHTML = ""; live.append(h("p", { class: "note warn" }, MM.ai.message(e))); }
          b.disabled = false;
        };
        aiBox.append(h("div", { class: "row", style: "margin-top:10px" }, b), live);
      });
    }
    root.append(h("div", { class: "card", style: "margin-bottom:12px" }, h("div", { class: "eyebrow" }, "The brief"), h("p", { style: "margin:6px 0 0" }, "Tom wants a weekend in Rome for at most 600 euros. Rain is possible on Saturday. He mentioned last month, in another chat, that he is vegetarian. Nothing may be booked or paid until Tom approves. The researchers will read hotel reviews written by strangers."), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "The writer's drafts cost 690, 640, then 590 euros. Design the system, run it, and read the review. Every choice maps to a station.")),
      ctl, h("div", { style: "margin-top:12px" }, pic), h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "btn primary", onclick: run }, MM.icon("play"), "Run my design"), h("button", { class: "btn small ghost", onclick: () => { Object.assign(d, DEFAULT); root.innerHTML = ""; studio(root, api); } }, "Start from the simplest design")), out, rub, aiBox, h("div", { style: "margin-top:12px" }, runBox));
    api.graph().then((g_) => { G = g_; draw(); });
  }

  /* ================================================================ 02 · the Debugger Challenge */
  const CASES = (G) => {
    const join = G.graph({ weather: {}, trains: { reducer: "append" }, drafts: { reducer: "append" } }).node("weather", f0, { kind: "tool" }).node("trains_a", f0, { kind: "tool" }).node("trains_b", f0, { kind: "tool" }).node("writer", f0, { kind: "llm" }).edge(G.START, "weather").edge(G.START, "trains_a").edge("trains_a", "trains_b").edge("weather", "writer").edge("trains_b", "writer").edge("writer", G.END);
    const two = G.graph({ request: {}, hotel: {} }).node("travel", f0, { kind: "llm" }).node("budget", f0, { kind: "llm" }).edge(G.START, "travel").edge(G.START, "budget").edge("travel", G.END).edge("budget", G.END);
    const loop = G.graph({ budget: {}, cost: {}, revisions: {}, approved: {} }).node("writer", f0, { kind: "llm" }).node("critic", f0, { kind: "llm" }).edge(G.START, "writer").edge("writer", "critic").cond("critic", f0, ["writer", G.END]);
    const book = G.graph({ plan: {}, approved: {}, booking: {} }).node("plan", f0, { kind: "llm" }).node("approve", f0, { kind: "human" }).node("book", f0, { kind: "tool" }).edge(G.START, "plan").edge("plan", "approve").edge("approve", "book").edge("book", G.END);
    const agent = G.graph({ messages: { reducer: "add_messages" } }).node("llm", f0, { kind: "llm" }).node("tools", f0, { kind: "tool" }).edge(G.START, "llm").cond("llm", f0, ["tools", G.END]).edge("tools", "llm");
    const ap = G.graph({ approved: {}, booking: {} }).node("approve", f0, { kind: "human" }).node("book", f0, { kind: "tool" }).edge(G.START, "approve").edge("approve", "book").edge("book", G.END);
    const line = (W, ns) => ({ W, H: 110, nodes: ns, start: { x: 45, y: 55 }, end: { x: W - 40, y: 55 } });
    return [
      { key: "join_separate", title: "The writer who couldn't wait", symptom: "Two drafts appear. The first says “plan with weather=rain and 1 trains”: one train is missing.", builder: join, spec: { W: 600, H: 175, nodes: { weather: { x: 205, y: 42 }, trains_a: { x: 205, y: 132 }, trains_b: { x: 345, y: 132 }, writer: { x: 470, y: 87 } }, start: { x: 50, y: 87 }, end: { x: 570, y: 22 } }, run: () => G.scenarios.join_separate(),
        q: { q: "What is the cause?", options: ["The trains tool sometimes returns one train", "Normal edges don't wait: weather woke the writer in round 2, before the second train lookup finished", "The append reducer lost a train", "The writer's model is unreliable"], answer: 1, why: "Each normal edge wakes the writer on its own. Use a join edge from both branches, or a deferred writer (A5)." } },
      { key: "no_reducer", title: "The clash over the hotel", symptom: "The run stops in round 1 with: At key 'hotel': Can receive only one value per step.", builder: two, spec: { W: 520, H: 150, nodes: { travel: { x: 260, y: 40 }, budget: { x: 260, y: 110 } }, start: { x: 50, y: 75 }, end: { x: 470, y: 75 } }, run: () => G.scenarios.no_reducer(),
        q: { q: "What is the cause?", options: ["The hotel name is too long", "Two nodes in the same round wrote a field that has no reducer", "The graph has no END", "travel ran twice"], answer: 1, why: "A replace field accepts one write per round. Add a reducer, give each writer its own field, or put them in different rounds (A3)." } },
      { key: "never_satisfied", title: "Eight rounds, no plan", symptom: "GraphRecursionError after 8 rounds. Four drafts were written and paid for; nothing came out.", builder: loop, spec: { W: 600, H: 130, nodes: { writer: { x: 210, y: 70 }, critic: { x: 400, y: 70 } }, start: { x: 60, y: 70 }, end: { x: 548, y: 70 }, via: { "critic>writer": [[400, 18], [210, 18]] } }, run: () => G.scenarios.never_satisfied(),
        q: { q: "What is the cause?", options: ["The recursion limit is too low", "The critic never approves and nothing in the state counts the drafts: the loop has no planned exit", "The writer crashed", "Checkpoints filled up"], answer: 1, why: "Raising the limit only spends more. Count tries in the state and route to a polite ending (A4)." } },
      { key: "charge_before_interrupt", title: "The double charge", symptom: "Maya approved once. Her card shows two charges of 570 euros.", builder: book, spec: line(620, { plan: { x: 170, y: 55 }, approve: { x: 330, y: 55, label: "Maya approves", w: 130 }, book: { x: 490, y: 55 } }), run: () => G.scenarios.charge_before_interrupt().second, side: () => G.scenarios.charge_before_interrupt().side_effects,
        q: { q: "What is the cause?", options: ["Maya tapped twice", "The bank made an error", "The approve node charged before interrupt(); on resume the node ran again from its first line", "book ran twice"], answer: 2, why: "Code before interrupt() repeats on resume. Charge after approval, in its own node, or make the charge idempotent (A9)." } },
      { key: "toolnode_default", title: "The agent that crashed on “Mon”", symptom: "The model asked for opening hours with day = “Mon”; the run stopped with ValueError, and Maya got no answer.", builder: agent, spec: { W: 600, H: 160, nodes: { llm: { x: 205, y: 62 }, tools: { x: 455, y: 62 } }, start: { x: 55, y: 62 }, end: { x: 205, y: 138 } }, run: () => G.scenarios.toolnode_default(),
        q: { q: "What is the cause?", options: ["The model is too small", "The default ToolNode sends only invalid-argument errors back; an exception inside the tool ends the run", "The tool doesn't exist", "The recursion limit"], answer: 1, why: "Set handle_tool_errors = True (or return helpful errors from the tool) so the model can fix “Mon” itself (A6)." } },
      { key: "interrupt_try_except", title: "Booked without asking", symptom: "The hotel is booked. Nobody was ever asked to approve.", builder: ap, spec: line(460, { approve: { x: 180, y: 55 }, book: { x: 320, y: 55 } }), run: () => G.scenarios.interrupt_try_except(),
        q: { q: "What is the cause?", options: ["The checkpointer is missing", "A bare try/except around interrupt() caught its pause signal and fell back to “approve”", "Maya approved in advance", "The edge to book is wrong"], answer: 1, why: "interrupt() pauses by raising a special signal. Never wrap it in a bare try/except (A9)." } }];
  };
  function debuggerChallenge(root, api, onChange) {
    api.graph().then((G) => {
      CASES(G).forEach((c, i) => {
        const box = h("div", { hidden: true, style: "margin-top:8px" });
        const show = h("button", { class: "btn small", type: "button" }, MM.icon("search"), "Open the trace");
        show.onclick = () => { box.hidden = !box.hidden; if (!box.dataset.done) { box.dataset.done = "1"; const r = c.run(); box.append(h("div", { style: "margin-bottom:6px" }, G.verified([c.key]))); G.player(box, { builder: c.builder, spec: c.spec, run: r, schema: c.builder.schema, boardOpts: { max: 60 } }); if (c.side) box.append(h("div", { class: "log", style: "margin-top:8px" }, c.side().map((x) => h("div", { class: /charged/.test(x) ? "err" : "" }, x)))); } };
        const rec = F().debug[c.key];
        const q = MM.question(Object.assign({}, c.q), { label: "Diagnose it", noRecord: true, onAnswer: (ok) => { save((f) => { f.debug[c.key] = { ok, ts: Date.now() }; }); onChange(); } });
        root.append(h("div", { class: "card", style: "margin-top:12px" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, `Broken run ${i + 1} of 6`), rec ? h("span", { class: "pill" + (rec.ok ? " ok" : "") }, rec.ok ? "solved" : "answered") : null), h("h3", { style: "margin:4px 0" }, c.title), h("p", { class: "muted" }, c.symptom), h("div", { class: "row" }, show), box, h("div", { style: "margin-top:10px" }, q)));
      });
    });
  }

  /* ================================================================ 03 · the Defense */
  const PICKS = [["a01", 0], ["a02", 2], ["a03", 0], ["a03", 2], ["a04", 2], ["a05", 0], ["a06", 1], ["a07", 1], ["a07", 2], ["a08", 1], ["a09", 0], ["a10", 0]];
  const LADDERS = [
    { id: "a09", q: "A paused run is resumed the next day, and the code before the question runs again. Why does LangGraph work this way?", laws: ["g5", "g6"], ladder: ["Why can't LangGraph continue from the line just after interrupt()? A half-finished function call cannot be written to a database and brought back later on another machine; only data can be saved.", "So what does LangGraph save, and when? The state at the end of every super-step, plus the pending writes of finished tasks: checkpoints sit between nodes ({law:g5}).", "What rule follows for the code you write? Everything before interrupt() must be safe to repeat; actions with real effects go after the approval, in their own node, or must be idempotent."] },
    { id: "a05", q: "Three researchers finish in a different order on every run, yet the merged state is identical every time. Why?", laws: ["g3", "g4"], ladder: ["Why can't one researcher see another's notes during the round? Every task in a round reads the same snapshot, and its writes wait in a buffer until the round ends ({law:g4}).", "So when are the notes combined, and in what order? At the end of the round, through each field's reducer, in task order (by node name; Send tasks by creation), never in finish order ({law:g3}).", "Why does that matter for building real systems? The same inputs and the same scripted model replies give the same state, so runs can be tested, compared and replayed exactly."] }];
  function lawChips(laws) { return (laws || []).map((l) => h("button", { class: "chip law p2", "data-law": l, type: "button" }, C.lawLabel(l))); }
  function gradeSeg(key, onChange, where) {
    const rec = F()[where][key] || {};
    return MM.seg([{ label: "Nailed it", value: "good" }, { label: "Partly", value: "part" }, { label: "Missed", value: "miss" }], rec.grade || null, (v) => { save((f) => { f[where][key] = Object.assign({}, f[where][key], { grade: v }); }); onChange(); }, "How did your answer hold up?");
  }
  function challenge(n, id, sk, onChange) {
    const key = id + "." + n, rec = F().defense[key] || {};
    const ta = h("textarea", { placeholder: "Answer the Skeptic in your own words, using the Laws…", "aria-label": "Your answer", style: "min-height:80px" });
    ta.value = rec.text || "";
    ta.addEventListener("input", MM.debounce(() => save((f) => { f.defense[key] = Object.assign({}, f.defense[key], { text: ta.value, q: MM.plain(sk.q) }); }, true), 500));
    const ans = h("div", { hidden: !rec.open, class: "stack", style: "--gap:8px;margin-top:8px" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "An answer built from the Laws"), ...lawChips(sk.laws)), MM.richEl(sk.a), h("div", { class: "row", style: "margin-top:4px" }, h("span", { class: "eyebrow" }, "your verdict"), gradeSeg(key, onChange, "defense")));
    const reveal = h("button", { class: "btn small", type: "button", hidden: !!rec.open }, "Show an answer");
    reveal.onclick = () => { if (ta.value.trim().length < 15) { MM.toast("Write your own answer first."); ta.focus(); return; } ans.hidden = false; reveal.hidden = true; save((f) => { f.defense[key] = Object.assign({}, f.defense[key], { text: ta.value, q: MM.plain(sk.q), open: Date.now() }); }); };
    const live = h("div", { "aria-live": "polite" }), push = h("button", { class: "btn small", type: "button", hidden: true }, MM.icon("bolt"), "Let the Skeptic push back");
    MM.ai.available().then((ok) => { push.hidden = !ok; });
    push.onclick = async () => {
      if (ta.value.trim().length < 20) { MM.toast("Write your own answer first."); return; }
      push.disabled = true; live.innerHTML = ""; live.append(h("div", { class: "faint pulse" }, "The Skeptic is thinking…"));
      const prompt = `Play "the Skeptic": a friendly but sharp challenger in an AI course for a 14-15-year-old whose English is not their first language. Use very simple English, short sentences.\nChallenge: ${MM.plain(sk.q)}\nModel answer (do not just repeat it): ${MM.plain(sk.a)}\nLaws it uses: ${(sk.laws || []).map((l) => (C.lawById[l] ? C.lawById[l].name + ": " + C.lawById[l].simple : l)).join(" | ")}\nLearner's answer: """${ta.value.slice(0, 1500)}"""\n\nReply in under 90 words: first say plainly whether the learner's answer holds up and name any error. Then ask ONE harder follow-up "why?" question.`;
      try { await MM.ai.ask(prompt, { options: { cache: false, onText: ({ text }) => { live.innerHTML = ""; live.append(h("div", { class: "bubble", style: "margin-top:8px" }, text)); } } }); }
      catch (e) { live.innerHTML = ""; live.append(h("p", { class: "note warn" }, MM.ai.message(e))); }
      push.disabled = false;
    };
    return h("div", { class: "skeptic", style: "margin-top:14px" }, h("div", { class: "face", "aria-hidden": "true" }, MM.icon("skeptic")), h("div", { class: "stack", style: "--gap:8px" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, `Challenge ${n} · from ${C.byId[id].code}`)), h("div", { class: "bubble" }, MM.richEl(sk.q)), ta, h("div", { class: "row" }, reveal, push), ans, live));
  }
  function ladder(n, L, onChange) {
    const key = L.id + ".ladder", rec = F().ladder[key] || {};
    const rungs = L.ladder.map((r) => { const k_ = r.indexOf("?"); return [r.slice(0, k_ + 1), r.slice(k_ + 1).trim()]; });
    const body = h("div", { class: "stack", style: "--gap:10px" });
    const done = h("div", { hidden: true }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "your verdict on the whole climb"), gradeSeg(key, onChange, "ladder")));
    function rung(j) {
      if (j >= rungs.length) { done.hidden = false; return; }
      const ta = h("textarea", { placeholder: "Your answer to this rung…", "aria-label": "Your answer to rung " + (j + 1), style: "min-height:70px" });
      ta.value = (rec.rungs || {})[j] || "";
      const ans = h("div", { class: "callout", hidden: true, style: "margin-top:6px" }, MM.richEl(rungs[j][1], "div"));
      const go = h("button", { class: "btn small", type: "button" }, "Check this rung");
      go.onclick = () => { if (ta.value.trim().length < 10) { MM.toast("Climb it yourself first."); ta.focus(); return; } save((f) => { f.ladder[key] = f.ladder[key] || { rungs: {} }; f.ladder[key].q = L.q; f.ladder[key].rungs = Object.assign({}, f.ladder[key].rungs, { [j]: ta.value }); }); ans.hidden = false; go.remove(); rung(j + 1); };
      body.append(h("div", null, h("div", { class: "eyebrow" }, `Rung ${j + 1} of ${rungs.length}`), h("p", { style: "margin:4px 0 6px;font-weight:700" }, rungs[j][0]), ta, h("div", { class: "row", style: "margin-top:6px" }, go), ans));
    }
    const start = h("button", { class: "btn small primary", type: "button" }, "Start climbing");
    start.onclick = () => { start.remove(); rung(0); };
    return h("div", { class: "card", style: "margin-top:14px" }, h("div", { class: "eyebrow" }, `Challenge ${n} · why-ladder, no help · from ${C.byId[L.id].code}`), h("div", { class: "bubble", style: "margin-top:8px" }, L.q), h("p", { class: "muted", style: "margin:8px 0" }, "Answer each “why?” yourself before you see the next step."), h("div", { class: "row" }, ...lawChips(L.laws)), h("div", { style: "margin-top:10px" }, start), body, done);
  }

  /* ================================================================ 04 · your book */
  function book(root) {
    const notes = store.state.notes, f1 = (store.state.extra.f1 || {}).defense || {}, f2 = F();
    const ids = C.order.filter((id) => notes[id] && notes[id].text);
    const doc = h("div", { class: "book-print" });
    doc.append(h("div", { class: "card", style: "text-align:center;padding:28px 16px" }, h("div", { class: "eyebrow" }, "My book"), h("h2", { style: "margin:6px 0" }, "How LLMs and agent teams work"), h("p", { class: "muted" }, "Explained in my own words, station by station, following Maya's trip to Paris."), h("p", { class: "faint", style: "font-size:.86rem" }, new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))));
    if (!ids.length) doc.append(h("div", { class: "empty", style: "margin-top:10px" }, "Your book is empty so far. Every station ends with an explain-back box; each answer becomes a chapter here."));
    ids.forEach((id, i) => { const m = C.byId[id]; doc.append(h("article", { class: "card", style: "margin-top:10px;break-inside:avoid" }, h("div", { class: "eyebrow" }, `Chapter ${i + 1} · ${m.code}`), h("h3", { style: "margin:4px 0" }, m.title), h("p", { class: "faint", style: "font-size:.86rem;margin:0 0 6px" }, m.q), h("p", { style: "white-space:pre-wrap" }, notes[id].text))); });
    const answers = Object.values(f1).concat(Object.values(f2.defense)).filter((a) => a && a.text && a.q);
    if (answers.length) doc.append(h("h3", { style: "margin-top:18px" }, "My Defense"), ...answers.map((a) => h("div", { class: "card", style: "margin-top:8px;break-inside:avoid" }, h("p", { style: "font-weight:700;margin:0 0 4px" }, a.q), h("p", { style: "white-space:pre-wrap;margin:0" }, a.text))));
    const laws = C.laws.filter((l) => store.state.laws[l.id]);
    if (laws.length) doc.append(h("h3", { style: "margin-top:18px" }, "The Laws I have unlocked"), h("div", { class: "stack", style: "--gap:6px;margin-top:6px" }, laws.map((l) => h("div", { class: "note" }, h("strong", null, C.lawLabel(l.id) + " · " + l.name), h("div", { class: "muted", style: "font-size:.92rem" }, l.simple)))));
    const text = () => ["# How LLMs and agent teams work", ...ids.map((id) => `## ${C.byId[id].code} · ${C.byId[id].title}\n\n${notes[id].text}`), ...(answers.length ? ["## My Defense", ...answers.map((a) => `**${a.q}**\n\n${a.text}`)] : [])].join("\n\n");
    root.append(h("div", { class: "row", style: "margin-bottom:10px" }, h("button", { class: "btn", type: "button", onclick: () => window.print() }, "Print or save as PDF"), h("button", { class: "btn", type: "button", onclick: (ev) => MM.copy(text(), ev.currentTarget) }, "Copy as text"), h("span", { class: "faint", style: "font-size:.86rem" }, `${ids.length} chapter${ids.length === 1 ? "" : "s"} · ${answers.length} defended answers`)), doc);
  }

  /* ================================================================ page */
  function custom(root, api) {
    const id = "f2";
    root.append(h("section", { class: "section" }, h("div", { class: "card reading", style: "max-width:46rem" },
      h("div", { class: "eyebrow" }, "Phase 2 finale"),
      h("p", { style: "margin-top:8px;font-size:1.08rem" }, "Ten stations ago you watched a finished team plan Maya's trip, and the engine was hidden below the waterline. Now you can build that engine, break it and defend it. Four parts: design a system for a new brief and run it; diagnose six broken runs from real LangGraph traces; face the Skeptic with only the Laws; then collect everything you have written into your own book."),
      h("p", { class: "muted", style: "margin-top:8px" }, "Nothing is timed. Your designs, diagnoses and answers are saved as you go."))));
    const status = h("div", { class: "card", style: "margin:0 0 4px" });
    root.append(h("section", { class: "section" }, status));
    const s1 = section("01", "The Architect's Studio"), s1b = h("div");
    s1.append(h("p", { class: "muted reading" }, "A new brief, the same building blocks. Every switch is a decision from a station. Run the design in the engine, then read the design review."), s1b);
    root.append(s1);
    const s2 = section("02", "The Debugger Challenge"), s2b = h("div");
    s2.append(h("p", { class: "muted reading" }, "Six runs went wrong. Each trace is a real LangGraph 1.2.17 run, replayed here. Read the symptom, open the trace, and name the cause."), s2b);
    root.append(s2);
    const s3 = section("03", "The Defense"), s3b = h("div");
    s3.append(h("p", { class: "muted reading" }, "Fourteen challenges from every station of Line 2. Answer in your own words, compare with an answer built from the Laws, and give yourself an honest verdict. The last two are why-ladders, climbed without help."), s3b);
    root.append(s3);
    const s4 = section("04", "Your book"), s4b = h("div");
    s4.append(h("p", { class: "muted reading" }, "Every explanation you wrote, on both lines, as one book: the proof that you can explain it all yourself."), s4b);
    root.append(s4);
    const fin = section("05", "Finish Line 2");
    const finBtn = h("button", { class: "btn primary", type: "button" }, MM.icon("check"), "Finish Phase 2"), finNote = h("p", { class: "muted", style: "margin-top:8px" });
    fin.append(h("p", { class: "muted reading" }, "Finishing unlocks the nine Agent Laws in your collection. The Daily Five will keep bringing back the ideas you marked as missed."), h("div", { class: "row", style: "margin-top:10px" }, finBtn), finNote);
    root.append(fin);
    const DEF_KEYS = PICKS.map(([m], i) => m + "." + (i + 1));
    function refresh() {
      const f = F();
      const dbg = Object.keys(f.debug).length, dbgOk = Object.values(f.debug).filter((x) => x.ok).length;
      const graded = DEF_KEYS.filter((k) => f.defense[k] && f.defense[k].grade).length + LADDERS.filter((L) => f.ladder[L.id + ".ladder"] && f.ladder[L.id + ".ladder"].grade).length;
      status.innerHTML = "";
      status.append(h("div", { class: "meter" }, h("span", null, "studio ", h("b", null, f.studio.ran ? `${f.studio.score} / 8` : "not run")), h("span", null, "broken runs diagnosed ", h("b", null, `${dbg} / 6`), dbgOk < dbg ? ` (${dbgOk} right)` : ""), h("span", null, "challenges answered ", h("b", null, `${graded} / 14`))));
      if (dbg >= 6) MM.markDone(id, "breakit");
      if (graded >= 14) { MM.markDone(id, "skeptic"); MM.markDone(id, "explain"); }
      const ready = !!f.studio.ran && dbg >= 6 && graded >= 14;
      finBtn.disabled = !ready || !!store.mod(id).completed;
      if (store.mod(id).completed) { finBtn.textContent = "Phase 2 complete"; finNote.textContent = "Both lines are complete. Your book is yours to keep."; }
      else finNote.textContent = ready ? "Everything is done. Finish when you are ready." : "To finish: run a design in the Studio, diagnose all six broken runs, and answer all fourteen challenges.";
    }
    finBtn.onclick = () => {
      MM.STEPS.forEach((st) => MM.markDone(id, st));
      store.update((st) => { st.mods[id].completed = Date.now(); C.laws.filter((l) => l.phase === 2).forEach((l) => { st.laws[l.id] = st.laws[l.id] || Date.now(); }); });
      MM.toast("Phase 2 complete. Every Law is yours.");
      refresh(); s4b.innerHTML = ""; book(s4b);
    };
    const api2 = Object.assign({}, api, { refresh });
    studio(s1b, api2);
    debuggerChallenge(s2b, api2, refresh);
    Promise.all(["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10"].map((m) => MM.loadModule(m))).then(() => {
      let n = 0;
      PICKS.forEach(([m, k]) => { n++; s3b.append(challenge(n, m, MM.defs[m].skeptic[k], refresh)); });
      s3b.append(h("h3", { style: "margin-top:24px" }, "Two why-ladders, no help"));
      LADDERS.forEach((L) => { n++; s3b.append(ladder(n, L, refresh)); });
      refresh();
    }).catch((err) => s3b.append(MM.errorBox(err)));
    book(s4b);
    MM.markDone(id, "mystery"); MM.markDone(id, "story");
    refresh();
  }

  MM.defineModule({ id: "f2", custom });
})();
