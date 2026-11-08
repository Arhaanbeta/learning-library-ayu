/* A8 · Memory — checkpoints and threads (short-term memory, recovery, time travel) and the Store (long-term memory). */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const SRC = { input: "var(--ink-3)", loop: "var(--seine)", update: "var(--person)", fork: "var(--line2)" };
  /* the checkpoint history as a tree: x = step, y = branch */
  function tree(list, opts) {
    opts = opts || {};
    const lane = {}, kids = {};
    let lanes = 0;
    list.forEach((c) => { if (!c.parent || lane[c.parent] === undefined) lane[c.id] = c.parent ? lanes++ : (lanes = Math.max(lanes, 1), 0); else { kids[c.parent] = (kids[c.parent] || 0) + 1; lane[c.id] = kids[c.parent] === 1 ? lane[c.parent] : lanes++; } });
    const steps = list.map((c) => c.step), minS = Math.min(...steps), maxS = Math.max(...steps);
    const dx = 74, dy = 46, W = Math.max(320, (maxS - minS) * dx + 90), H = Math.max(1, lanes) * dy + 36;
    const X = (c) => 40 + (c.step - minS) * dx, Y = (c) => 26 + lane[c.id] * dy;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", style: `max-width:${W * 1.15}px;min-width:${Math.min(W, 520)}px`, role: "img", "aria-label": "Checkpoint tree" });
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    list.forEach((c) => { const p = byId[c.parent]; if (p) svg.append(s("path", { d: `M${X(p)} ${Y(p)} C ${X(p) + dx / 2} ${Y(p)} ${X(c) - dx / 2} ${Y(c)} ${X(c)} ${Y(c)}`, fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5 })); });
    list.forEach((c) => {
      const g = s("g", { style: opts.onPick ? "cursor:pointer" : "" });
      const sel = opts.selected === c.id;
      g.append(s("circle", { cx: X(c), cy: Y(c), r: sel ? 15 : 13, fill: "var(--sheet)", stroke: SRC[c.source] || "var(--ink-3)", "stroke-width": sel ? 4 : 2.5 }), s("text", { x: X(c), y: Y(c) + 4, "text-anchor": "middle", "font-size": 10.5, class: "t-mono", text: c.id }));
      g.append(s("text", { x: X(c), y: Y(c) + 26, "text-anchor": "middle", "font-size": 8.5, fill: "var(--ink-2)", text: c.next.length ? "→ " + c.next.join(",") : "done" }));
      if (opts.onPick) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", `Checkpoint ${c.id}, step ${c.step}, ${c.source}`); g.onclick = () => opts.onPick(c.id); g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onPick(c.id); } }; }
      svg.append(g);
    });
    const legend = h("div", { class: "row", style: "--gap:10px;font-size:.8rem;margin-top:4px" }, Object.entries(SRC).map(([k, c]) => h("span", { class: "row", style: "--gap:4px" }, h("span", { style: `width:10px;height:10px;border-radius:50%;border:2.5px solid ${c};display:inline-block` }), k)));
    return h("div", null, h("div", { class: "scroll-x" }, svg), legend);
  }
  const histList = (app, thread) => app.history(thread).map((c) => ({ id: c.id, parent: c.parent, step: c.step, source: c.source, next: c.tasks.map((t) => t.name).filter((n) => n !== "__start__"), values: c.values }));

  MM.defineModule({
    id: "a08",
    mystery: { title: "The assistant that forgot", text: "On Monday, Maya tells her assistant she loves crêpes. On Friday she asks where to eat on Saturday, and it has no idea. Same app, same model.\n\nThen her friend Tom opens the app on his phone and sees Maya's Monday conversation. Two opposite bugs, too little memory and too much. Can one design mistake cause both?" },
    where: { text: "Below the waterline: the SAVE phase from A5. What exactly is saved, under which name, and what can be done with it later?" },
    predict: { q: "A graph is compiled with no checkpointer. Maya sends a second message. What does the graph know about her first one?", options: ["Everything: graphs remember", "Nothing: every run starts from its input alone", "Only the last answer", "It depends on the model"], answer: 1, why: "Without a checkpointer nothing survives a run. Each invoke starts from the input it is given, and asking for the saved state fails with LangGraph's real error: “No checkpointer set”." },
    story: [
      { title: "A snapshot after every round", truth: "REAL",
        text: "A [[checkpointer]] (the part that saves the run) writes a [[checkpoint]] (a snapshot of the whole state at the end of a round, plus which nodes run next) after every super-step. Each checkpoint is filed under a [[thread|thread]] ID (the name of one conversation or job). Here are the real checkpoints of A0's team run: one per round, each pointing back to the one before ({law:g5}).",
        visual: async (el, api) => {
          const G = await api.graph(); const side = []; const app = G.teamGraph({ side }).compile({ checkpointer: G.MemorySaver() }); app.run(G.teamInput(), { thread: "maya-paris" });
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["team"])), tree(histList(app, "maya-paris")), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "c0 holds only the empty starting values; c1 the input; each later checkpoint, the state after one more round. The last one is waiting at “approve”."));
        } },
      { title: "Threads keep conversations apart", truth: "TOY",
        text: "The thread ID is the key to everything. Run again with the **same** thread ID and the graph continues from its latest checkpoint: that is short-term memory. Use a **new** thread ID and it starts empty. So each conversation needs its own thread, and two people must never share one.",
        visual: (el) => el.append(h("div", { class: "two" }, [["thread “maya-paris”", ["c0 … c7: the Paris plan", "resume: continues at “approve”"]], ["thread “tom-rome”", ["c0: empty", "nothing from Maya's thread"]]].map(([t, l]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, t), h("div", { class: "stack mono", style: "--gap:3px;font-size:.85rem;margin-top:4px" }, l.map((x) => h("div", null, x))))))) },
      { title: "Short-term memory is just the thread", truth: "REAL",
        text: "A chat remembers earlier messages only because its messages field lives in the thread's checkpoints. New input on the same thread continues from the saved state, so each message is added to the saved list (add_messages, A3), and the model re-reads it (A6). New thread, empty list, no memory. That is why Maya's Friday chat forgot Monday: it was a new thread. These three runs are real.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.same_thread();
          const col = (t, run, note) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, t), h("div", { class: "stack", style: "--gap:4px;margin-top:4px" }, run.state.messages.map((m) => h("div", { style: "font-size:.85rem" }, h("strong", null, m.type === "human" ? "Maya: " : "AI: "), m.content))), h("p", { class: "faint", style: "font-size:.8rem;margin:6px 0 0" }, note));
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["same_thread"])), h("div", { class: "two" }, col("Same thread (“monday”), second message", r.monday2, `This run's checkpoints start at step ${r.monday2.steps[0].step - 1}: it continued the saved thread.`), col("New thread (“friday”)", r.friday, "Starts at step −1 with an empty list.")));
        } },
      { kind: "spotlight", title: "Time travel: replay and fork", truth: "REAL",
        text: "Every checkpoint stays, so you can go back. **Replay**: resume from an old checkpoint, and every node after it runs again. **Fork**: first change a value at that checkpoint (update_state), then resume: a new branch grows, and the original stays untouched. In these real runs, Maya's budget is changed from 150 to 200 before the hotel is chosen, and the history becomes a tree. This is [[time-travel|time travel]].",
        intuition: "Save points in a video game: load an old save, make a different choice, and a new story begins; the old save is still there.",
        breaks: "A game's world rewinds with you. The real world does not: an email that was sent or a card that was charged stays sent and charged, and a replay may do it again.",
        visual: async (el, api) => {
          const G = await api.graph(); const d = await MM.loadData("lgtraces"); const tt = G.scenarios.time_travel(), rp = G.scenarios.replay();
          const fix = (list) => list.map((c) => Object.assign({}, c, { next: c.next.filter((n) => n !== "__start__") }));
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["time_travel", "replay"])), h("div", { class: "two" },
            h("div", null, h("div", { class: "eyebrow" }, "Fork: budget 150 → 200 at c2"), tree(fix(tt.tree)), h("p", { class: "mono", style: "font-size:.8rem" }, "original: " + tt.original.state.hotel), h("p", { class: "mono", style: "font-size:.8rem;color:var(--line2)" }, "fork: " + tt.fork.state.hotel)),
            h("div", null, h("div", { class: "eyebrow" }, "Replay from c2, nothing changed"), tree(fix(rp.tree)), h("p", { class: "mono", style: "font-size:.8rem" }, `choose_hotel ran ${d.scenarios.replay.choose_hotel_runs} times in LangGraph (and ${rp.choose_hotel_runs} here)`))));
        } },
      { title: "Surviving a crash", truth: "REAL",
        text: "Because progress is saved after every round, a crashed run can simply be resumed on the same thread, from the last checkpoint, and finished tasks are not repeated (A5's crash run). This is [[durable-execution|durable execution]]: a run that survives crashes, restarts and deployments. A run paused for a person (A9) is the same trick: everything is in the checkpoint, so nothing needs to stay running while it waits.",
        visual: async (el, api) => { const G = await api.graph(); const c = G.scenarios.crash_resume(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["crash_resume"])), h("div", { class: "log" }, h("div", { class: "err" }, `run 1: ${c.first.outcome.error}: ${c.first.outcome.message} (round 2)`), h("div", null, "saved: checkpoint " + c.first.steps.find((x) => x.cp && x.step === 1).cp + " + pending writes for " + c.first.steps[2].pendingSaved.join(", ")), h("div", { class: "ok" }, `run 2 (same thread, input = nothing): finished, plan = “${c.second.state.plan}”`))); } },
      { title: "Long-term memory: the Store", truth: "REAL",
        text: "A thread is one conversation. Facts about Maya that should outlive it, “she loves crêpes”, belong in the [[store|Store]] (memory shared across all threads, filed by namespace and key). In this real run, Monday's chat saves the fact under the namespace (“maya”, “preferences”); Friday's chat, a brand-new thread, reads it back. Tom's namespace is separate, so he never sees it.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.store();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["store"])), h("div", { class: "three" },
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "thread “monday-chat”"), h("p", { style: "font-size:.86rem" }, "Maya: " + r.thread1.state.said), h("p", { style: "font-size:.86rem" }, "AI: " + r.thread1.state.reply)),
            h("div", { class: "panel", style: "border-color:var(--data)" }, h("div", { class: "eyebrow" }, "the Store"), h("div", { class: "stack mono", style: "--gap:3px;font-size:.78rem" }, r.search_maya.concat(r.search_tom).map((i) => h("div", null, `(${i.namespace.join(", ")}) ${i.key}: ${JSON.stringify(i.value)}`)))),
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "thread “friday-chat”"), h("p", { style: "font-size:.86rem" }, "Maya: " + r.thread2.state.said), h("p", { style: "font-size:.86rem" }, "AI: " + r.thread2.state.reply))));
        } },
      { title: "Finding memories by meaning", truth: "TOY",
        text: "A store can also be searched by meaning (semantic search with embeddings, as in M12): “what food does she enjoy?” can find “loves crêpes” without sharing a word. Try it below with small real word vectors (GloVe). Notice it is a ranking by closeness, not a lookup, and sometimes the ranking is wrong: real stores use stronger embedding models, filters and namespaces.",
        visual: async (el) => {
          el.append(h("div", { class: "faint" }, "Loading word vectors…"));
          await MM.load("core/rag.js"); const R = MM.rag; await R.load(); el.innerHTML = "";
          const MEM = ["loves crêpes and hot chocolate", "prefers museums with impressionist paintings", "is allergic to cats", "always takes the train and never flies", "hates long queues"];
          const vecs = MEM.map((m) => R.glove(m.replace("ê", "e")));
          const inp = h("input", { type: "text", value: "what food does she enjoy", "aria-label": "Search Maya's memories" }), out = h("div");
          const go = () => { const q = inp.value.trim(); out.innerHTML = ""; if (!q) return; const v = R.glove(q), unk = R.known(q).unknown; out.append(MM.bars(MEM.map((m, i) => ({ label: m, p: Math.max(0, R.dot(v, vecs[i])) })).sort((a, b) => b.p - a.p), { scale: 1, plain: true, total: false, labelW: "15rem", fmt: (it) => it.p.toFixed(2) }), unk.length ? h("p", { class: "faint", style: "font-size:.82rem" }, "Words the vectors don't know (ignored): " + unk.join(", ")) : null); };
          inp.addEventListener("input", go);
          el.append(h("div", { class: "row", style: "--gap:6px;margin-bottom:8px" }, ["what food does she enjoy", "which museum to visit", "where to eat dinner", "how to travel to Paris"].map((q) => h("button", { class: "chip", onclick: () => { inp.value = q; go(); } }, q))), inp, h("div", { style: "margin-top:8px" }, out));
          go();
        } },
      { title: "What is worth remembering", truth: "SKETCH",
        text: "Long-term memory comes in three kinds. **Semantic**: facts (“Maya loves crêpes”). **Episodic**: past events (“last trip, the Louvre queue took two hours”). **Procedural**: how to behave (instructions improved from her feedback). An agent can save memories while it talks (in the hot path) or a separate process can save them later (in the background): faster replies versus fresher memory.",
        visual: (el) => el.append(h("div", { class: "three" }, [["Semantic", "facts", "loves crêpes · allergic to cats"], ["Episodic", "events", "Louvre queue: 2 hours, last March"], ["Procedural", "behaviour", "“Always give prices in euros”"]].map(([a, b, c]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, a + " · " + b), h("p", { style: "font-size:.86rem;margin:4px 0 0" }, c))))) },
      { title: "Checkpointers for real use", truth: "SKETCH",
        text: "The in-memory saver used in this course forgets everything when the program stops: fine for tests. Real systems use a database-backed checkpointer (SQLite for small apps, Postgres for production), and LangSmith Deployment provides one automatically. Checkpoints grow with every round, so decide how long to keep old threads.",
        precision: "Each checkpoint stores channel values, version numbers for each channel (so the engine knows what changed), the next tasks, and metadata (step, source: input, loop, update or fork). Pending writes are stored beside it.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["In memory", "tests and demos; lost when the program stops"], ["SQLite", "one machine, small apps"], ["Postgres", "production; many workers share one database"], ["LangSmith Deployment", "hosted; checkpointer and store included"]].map(([a, b]) => h("div", { class: "note" }, h("strong", null, a), " · ", h("span", { class: "muted" }, b))))) },
      { kind: "snap", title: "Stage F: Maya's planner remembers", truth: "SKETCH",
        text: "Now the two bugs from the start have one fix. Each conversation gets its own thread (Tom never sees Maya's chats). Facts about Maya go into the Store under her namespace (Friday remembers Monday). The checkpointer gives the rest for free: resuming after a crash, pausing for approval, and rewinding to try another budget.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Per conversation: thread"), h("p", { style: "font-size:.88rem" }, "the plan, the messages, the pause; checkpoints c0…c9")), h("div", { class: "panel", style: "border-color:var(--data)" }, h("div", { class: "eyebrow" }, "Per person: Store namespace"), h("p", { style: "font-size:.88rem" }, "(“maya”, “preferences”): food, museums, travel")))) }],
    lab: {
      title: "The Checkpoint Time Machine", truth: "REAL",
      intro: "Part 1: run Maya's hotel chooser with a checkpointer, then rewind it. Click any checkpoint to inspect it, replay from it, or change the budget and fork. The engine follows LangGraph's checkpoint rules (checked against real runs). Part 2: the Memory Explorer, with threads, the Store, and a bug you can switch on.",
      tries: ["Run with a budget of 150 euros. Which hotel is chosen?", "Click the checkpoint before choose_hotel and fork it with a budget of 200. Where does the new branch start?", "Replay the same checkpoint without changes. How many times has choose_hotel now run?", "In the Memory Explorer, turn on “everyone shares one thread” and send Tom's message. What does he see?"],
      async mount(el, api) {
        const G = await api.graph();
        /* part 1 · the time machine */
        let saver, app, ran, sel = null, budget = 150;
        const THREAD = "maya-trip";
        const treeBox = h("div"), info = h("div"), counter = h("div", { class: "row", style: "--gap:16px;margin:8px 0" });
        function fresh() { saver = G.MemorySaver(); ran = 0; app = G.graph({ budget: {}, research: {}, hotel: {}, summary: {} }).node("research", () => ({ research: "museums, cafes, rain on Saturday" }), { kind: "llm" }).node("choose_hotel", (st) => { ran++; return { hotel: st.budget >= 190 ? "Hotel Lumiere (EUR 190)" : "Hotel Soleil (EUR 140)" }; }, { kind: "llm" }).node("summary", (st) => ({ summary: `${st.hotel} + ${st.research}` }), { kind: "fn" }).edge(G.START, "research").edge("research", "choose_hotel").edge("choose_hotel", "summary").edge("summary", G.END).compile({ checkpointer: saver }); sel = null; }
        function draw() {
          const list = histList(app, THREAD);
          treeBox.innerHTML = ""; info.innerHTML = ""; counter.innerHTML = "";
          if (!list.length) { treeBox.append(h("p", { class: "faint" }, "No checkpoints yet: run the graph.")); return; }
          treeBox.append(tree(list, { selected: sel, onPick: (id) => { sel = id; draw(); } }));
          const latest = app.getState(THREAD);
          counter.append(...[[list.length, "checkpoints"], [ran, "times choose_hotel ran"], [latest.values.hotel || "—", "latest hotel"]].map(([n, l]) => h("div", null, h("div", { class: "t-disp", style: "font-size:1.25rem" }, String(n)), h("div", { class: "faint", style: "font-size:.8rem" }, l))));
          if (!sel) { info.append(h("p", { class: "faint", style: "font-size:.9rem" }, "Click a checkpoint in the tree to inspect it.")); return; }
          const c = list.find((x) => x.id === sel);
          const bud = MM.slider({ label: "budget for the fork", min: 100, max: 300, step: 10, value: c.values.budget || 150, fmt: (v) => v + " €" });
          info.append(h("div", { class: "eyebrow" }, `Checkpoint ${c.id} · step ${c.step} · source “${c.source}” · next: ${c.next.join(", ") || "nothing (finished)"}`), G.board(app.b.schema, c.values, null),
            c.next.length ? h("div", { class: "stack", style: "--gap:8px;margin-top:10px" },
              h("div", null, h("button", { class: "btn small", onclick: () => { app.run(null, { thread: THREAD, checkpoint: c.id }); sel = null; draw(); api.done(); } }, MM.icon("play"), "Replay from here")),
              bud, h("div", null, h("button", { class: "btn small primary", onclick: () => { const f = app.updateState(THREAD, c.id, { budget: +bud.input.value }); app.run(null, { thread: THREAD, checkpoint: f.id }); sel = null; draw(); api.done(); } }, MM.icon("pencil"), "Change the budget and fork"))) : h("p", { class: "faint", style: "font-size:.88rem;margin-top:8px" }, "This checkpoint is finished: nothing left to run from here."));
        }
        const budIn = MM.slider({ label: "budget", min: 100, max: 300, step: 10, value: budget, fmt: (v) => v + " €", onInput: (v) => { budget = v; } });
        el.append(h("h3", null, "1 · Rewind the hotel choice"), h("div", { class: "row", style: "--gap:10px;align-items:center" }, h("div", { class: "grow", style: "min-width:220px" }, budIn), h("button", { class: "btn primary", onclick: () => { fresh(); app.run({ budget, research: "", hotel: "", summary: "" }, { thread: THREAD }); draw(); api.done(); } }, MM.icon("play"), "Start over and run")),
          counter, h("div", { class: "bp", style: "padding:8px" }, treeBox), h("div", { style: "margin-top:10px" }, info));
        fresh(); app.run({ budget, research: "", hotel: "", summary: "" }, { thread: THREAD }); draw();
        /* part 2 · the memory explorer */
        const ex = { shared: false, store: G.Store(), saver: G.MemorySaver() };
        const chatApp = () => G.graph({ user: {}, messages: { reducer: "add_messages" } }).node("assistant", (st, ctx) => {
          const human = st.messages.filter((m) => m.type === "human"), last = human[human.length - 1].content;
          if (/love|like/i.test(last)) { const food = (last.match(/crêpes|ramen|pizza/i) || ["that"])[0]; ctx.store.put([st.user, "preferences"], "food", { likes: food }); return { messages: [{ type: "ai", content: `Noted, ${st.user === "tom" ? "Tom" : "Maya"}: you like ${food}. Saved to your memory.` }] }; }
          const it = ctx.store.get([st.user, "preferences"], "food");
          const earlier = human.slice(0, -1).map((m) => m.content).filter((x) => /love|like/i.test(x));
          return { messages: [{ type: "ai", content: (it ? `From your memory: you like ${it.value.likes}.` : "I don't know your tastes yet.") + (earlier.length ? ` Earlier in this conversation someone said: “${earlier[0]}”.` : "") }] };
        }, { kind: "llm" }).edge(G.START, "assistant").edge("assistant", G.END).compile({ checkpointer: ex.saver, store: ex.store });
        let capp = chatApp();
        const log = h("div", { class: "stack", style: "--gap:6px" }), storeBox = h("div");
        const send = (user, thread, text) => {
          const th = ex.shared ? "the-only-thread" : thread;
          const r = capp.run({ user, messages: [{ type: "human", content: text }] }, { thread: th });
          const msgs = r.state.messages;
          log.prepend(h("div", { class: "panel" }, h("div", { class: "eyebrow" }, `${user === "tom" ? "Tom" : "Maya"} · thread “${th}” · ${msgs.length} messages in this thread`), h("div", { style: "font-size:.88rem" }, h("strong", null, "says: "), text), h("div", { style: "font-size:.88rem" }, h("strong", null, "AI: "), msgs[msgs.length - 1].content)));
          storeBox.innerHTML = ""; storeBox.append(h("div", { class: "eyebrow" }, "The Store"), h("div", { class: "log", style: "font-size:.8rem" }, ex.store.search([]).length ? ex.store.search([]).map((i) => h("div", null, `(${i.namespace.join(", ")}) ${i.key}: ${JSON.stringify(i.value)}`)) : h("div", { class: "dim" }, "empty")));
          api.done();
        };
        const shareCb = h("input", { type: "checkbox", id: "mx-share" });
        shareCb.onchange = () => { ex.shared = shareCb.checked; };
        el.append(h("hr", { class: "rule" }), h("h3", null, "2 · The Memory Explorer"),
          h("div", { class: "row", style: "--gap:6px" },
            h("button", { class: "btn small", onclick: () => send("maya", "maya-monday", "I love crêpes.") }, "Maya, Monday: “I love crêpes.”"),
            h("button", { class: "btn small", onclick: () => send("maya", "maya-friday", "Where should I eat on Saturday?") }, "Maya, Friday (new chat): “Where should I eat?”"),
            h("button", { class: "btn small", onclick: () => send("tom", "tom-chat", "Where should I eat tonight?") }, "Tom, his own phone: “Where should I eat?”")),
          h("label", { for: "mx-share", class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem;margin:10px 0" }, shareCb, "Bug: the app gives everyone the same thread ID"),
          h("div", null, h("button", { class: "btn small ghost", onclick: () => { ex.store = G.Store(); ex.saver = G.MemorySaver(); capp = chatApp(); log.innerHTML = ""; storeBox.innerHTML = ""; } }, "Clear all memory")),
          h("div", { class: "two", style: "margin-top:10px" }, log, storeBox));
      } },
    breakit: {
      title: "Break the memory", truth: "REAL",
      intro: "Memory bugs are quiet: nothing crashes, the assistant just knows too little or too much.",
      cases: [
        { name: "No checkpointer", what: "The graph is compiled without one. Maya asks to see the saved state of her conversation.", action: "Ask for the state", result: "ValueError: No checkpointer set. Nothing was saved; the next message starts from scratch.", why: "Memory, pausing, resuming and time travel all need a checkpointer. Attach one when you compile." },
        { name: "Two users, one thread", what: "The app uses the same thread ID for everyone (try it in the Memory Explorer).", action: "Tom sends a message", result: "Tom's request is added to Maya's conversation, and the assistant can quote what Maya said earlier.", why: "The thread ID decides whose conversation continues. Derive it from the user and the conversation, never from a constant." },
        { name: "A replay repeats the side effects", what: "Maya replays from a checkpoint before choose_hotel, without changing anything.", action: "Replay", result: "choose_hotel runs again (twice in total, in the real recorded run). If that node had charged a card, it would charge again.", why: "Time travel rewinds the state, not the world. Keep side effects in nodes that are safe to repeat, or behind an approval (A9).", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["replay"])); } }],
      explain: { q: "Maya's Friday chat forgot Monday. What is the best fix?", options: ["Use a bigger model", "Put both chats in one thread forever", "Save lasting facts in the Store under Maya's namespace, and give each chat its own thread", "Turn off the checkpointer"], answer: 2, why: "Threads are per conversation; the Store is for facts that should outlive any one conversation." } },
    clinic: [
      { belief: "A graph remembers past runs automatically.", test: "The Predict question: with no checkpointer, nothing survives a run.", truth: "Only a checkpointer gives a graph memory, and only within the same thread ID." },
      { belief: "Time travel undoes what the agent did.", test: "Replay in the Time Machine: choose_hotel runs again; the counter goes up.", truth: "It rewinds the saved state. Actions in the outside world stay done, and a replay may repeat them." },
      { belief: "Long conversations are the way to give an agent long-term memory.", test: "The Store beat: Friday's new thread knew Monday's fact without the old messages.", truth: "Lasting facts belong in the Store, searched when needed; threads hold one conversation." }],
    explain: { prompt: "Explain how a LangGraph system remembers: checkpoints, threads, time travel, crash recovery and the Store.", points: ["A checkpointer saves a checkpoint after every super-step", "Checkpoints are filed under a thread ID; same thread = continue, new thread = empty", "Short-term memory is the thread's state, such as its messages", "Replay re-runs from an old checkpoint; fork changes a value first and branches", "A crashed or paused run resumes from the latest checkpoint", "The Store holds long-term facts across threads, by namespace and key"] },
    skeptic: [
      { q: "Isn't saving the whole state every round wasteful?", laws: ["g5"], a: "It costs storage and time, which is why durability modes exist ({law:g5}). In return you get crash recovery, pauses that can last days, debugging by inspection and time travel, all from one mechanism. For growing fields, newer channel types save only the changes." },
      { q: "Why have both threads and a Store? Isn't memory just memory?", laws: ["g5", "g8"], a: "They answer different questions. A thread is “where was this conversation?”: exact, ordered, private to one job. The Store is “what do we know about Maya?”: facts chosen and searched across all her conversations, and put into the context only when relevant ({law:g8})." },
      { q: "If I can fork any checkpoint, can't I fix any bad run after the fact?", laws: ["g5"], a: "You can re-run the reasoning, not undo the world. A fork from before a booking can choose another hotel, but the first booking still happened. That is why actions with real effects deserve their own nodes, idempotency keys and approvals." }],
    recall: [
      { q: "What does a checkpointer save, and when?", options: ["The model's weights, nightly", "A snapshot of the state after every super-step", "Only the final answer", "The prompt"], answer: 1, level: 1, why: "One checkpoint per round, under a thread ID." },
      { q: "What decides which saved conversation a run continues?", options: ["The model", "The thread ID", "The node names", "The Store"], answer: 1, level: 2, why: "Same thread continues; a new one starts empty." },
      { q: "What is the difference between replay and fork?", options: ["None", "A fork changes a value at the checkpoint first, creating a new branch", "Replay deletes later checkpoints", "Fork needs a new thread"], answer: 1, level: 3, why: "update_state, then resume from the new checkpoint." },
      { q: "Where should “Maya loves crêpes” live so a new conversation can use it?", options: ["In the thread's messages", "In the Store, under Maya's namespace", "In the system prompt for everyone", "In a checkpoint"], answer: 1, level: 4, why: "The Store is shared across threads." },
      { q: "From A7: what are the four moves of context engineering?", options: ["Write, select, compress, isolate", "Plan, act, observe, stop", "Send, join, defer, merge", "Save, load, fork, replay"], answer: 0, level: 5, why: "Memory is the “write” and “select” moves." }],
    depth: [
      ["What a checkpoint holds", "Channel values, per-channel version numbers, the next tasks, and metadata (step, source: input, loop, update or fork, and the parent checkpoint). Pending writes are stored beside it."],
      ["get_state and history", "get_state shows the latest checkpoint with its pending writes applied; get_state_history lists every checkpoint, newest first."],
      ["update_state", "Writes values at a chosen checkpoint, as if a node had produced them (reducers apply), creating a new checkpoint whose source is “update”."],
      ["Replay versus fork", "Resuming from an old checkpoint first creates a “fork” checkpoint one step later and re-runs everything after it (REAL)."],
      ["The Store", "put(namespace, key, value), get(namespace, key), search(namespace prefix, query, filter). With an embedding index configured, query is a semantic search."],
      ["Memory types", "Semantic (facts), episodic (past events, often as examples), procedural (instructions); written in the hot path or in the background."],
      ["Durability modes", "durability = “async” (default), “sync” or “exit”: how carefully checkpoints are written during a run."]],
    connect: { links: ["Pausing a run for days and resuming it with a person's answer, using these same checkpoints: {mod:a09}.", "The crash and the pending writes, round by round: {mod:a05}.", "Tracing, evaluating and securing what is saved, in production: {mod:a10}."], line: "The planner can now remember, recover and rewind. Next: how it stops and waits for Maya before spending her money." }
  });
})();
