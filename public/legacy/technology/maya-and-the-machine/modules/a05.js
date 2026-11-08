/* A5 · The Engine Room — super-steps: plan, execute, update, save; Send, joins, failures, retries, streaming. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const f = () => ({});
  /* structure-only builders, for drawing the recorded scenarios */
  const B = {
    fan: (G) => G.graph({ days: {}, notes: { reducer: "append" }, plan: {} }).node("planner", f, { kind: "llm" }).node("research_day", f, { kind: "llm" }).node("joiner", f, { kind: "fn" })
      .edge(G.START, "planner").cond("planner", f, ["research_day"], { send: true }).edge("research_day", "joiner").edge("joiner", G.END),
    join: (G, mode) => { const g = G.graph({ weather: {}, trains: { reducer: "append" }, drafts: { reducer: "append" } }).node("weather", f, { kind: "tool" }).node("trains_a", f, { kind: "tool" }).node("trains_b", f, { kind: "tool" }).node("writer", f, { kind: "llm", defer: mode === "deferred" }).edge(G.START, "weather").edge(G.START, "trains_a").edge("trains_a", "trains_b"); if (mode === "wait") g.edge(["weather", "trains_b"], "writer"); else g.edge("weather", "writer").edge("trains_b", "writer"); return g.edge("writer", G.END); },
    command: (G) => G.graph({ question: {}, route: {}, answer: {} }).node("router", f, { kind: "llm", destinations: ["weather_desk", "planner_desk"], commandOnly: true }).node("weather_desk", f, { kind: "llm" }).node("planner_desk", f, { kind: "llm" }).edge(G.START, "router").edge("weather_desk", G.END).edge("planner_desk", G.END),
    loop: (G) => G.graph({ budget: {}, cost: {}, revisions: {}, approved: {} }).node("writer", f, { kind: "llm" }).node("critic", f, { kind: "llm" }).edge(G.START, "writer").edge("writer", "critic").cond("critic", f, { done: G.END, give_up: G.END, revise: "writer" }),
    agent: (G) => G.graph({ messages: { reducer: "add_messages" } }).node("llm", f, { kind: "llm" }).node("tools", f, { kind: "tool" }).edge(G.START, "llm").cond("llm", f, ["tools", G.END]).edge("tools", "llm") };
  const SP = {
    fan: { W: 650, H: 110, nodes: { planner: { x: 140, y: 55, kind: "llm" }, research_day: { x: 335, y: 55, kind: "llm", label: "research day", w: 130 }, joiner: { x: 497, y: 55, kind: "fn" } }, start: { x: 45, y: 55 }, end: { x: 606, y: 55 } },
    join: { W: 600, H: 175, nodes: { weather: { x: 205, y: 42, kind: "tool" }, trains_a: { x: 205, y: 132, kind: "tool" }, trains_b: { x: 345, y: 132, kind: "tool" }, writer: { x: 470, y: 87, kind: "llm" } }, start: { x: 50, y: 87 }, end: { x: 570, y: 22 } },
    command: { W: 600, H: 170, nodes: { router: { x: 200, y: 85, kind: "llm" }, weather_desk: { x: 390, y: 40, kind: "llm", label: "weather desk" }, planner_desk: { x: 390, y: 130, kind: "llm", label: "planner desk" } }, start: { x: 60, y: 85 }, end: { x: 548, y: 85 } },
    loop: { W: 600, H: 130, nodes: { writer: { x: 210, y: 70, kind: "llm" }, critic: { x: 400, y: 70, kind: "llm" } }, start: { x: 60, y: 70 }, end: { x: 548, y: 70 }, labels: { "critic>__end__": "done", "critic>writer": "revise" }, via: { "critic>writer": [[400, 18], [210, 18]] } },
    agent: { W: 560, H: 150, nodes: { llm: { x: 220, y: 55, kind: "llm" }, tools: { x: 420, y: 55, kind: "tool" } }, start: { x: 55, y: 55 }, end: { x: 220, y: 128 }, labels: { "llm>tools": "tool calls", "llm>__end__": "no tool calls" } } };

  /* the four-phase loop, drawn as a cycle */
  function cycle(active) {
    const svg = s("svg", { viewBox: "0 0 520 275", class: "figure", style: "max-width:560px;margin:0 auto", role: "img", "aria-label": "The super-step loop: plan, execute, update, save, then plan again; stop when nothing is triggered" });
    svg.append(s("defs", null, s("marker", { id: "cyc-a", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0 10 5 0 10z", fill: "var(--ink-3)" }))));
    const P = [["PLAN", "which nodes did the last round's writes wake?", 260, 42], ["EXECUTE", "run them side by side, all on one snapshot; buffer their writes", 410, 136], ["UPDATE", "merge every buffered write, in task order, with the reducers", 260, 230], ["SAVE", "write a checkpoint (if a checkpointer is attached)", 110, 136]];
    [[330, 72, 405, 106], [405, 166, 330, 200], [190, 200, 115, 166], [115, 106, 190, 72]].forEach(([x1, y1, x2, y2]) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = mx - 260, dy = my - 135, L = Math.hypot(dx, dy) || 1;
      svg.append(s("path", { d: `M${x1} ${y1} Q ${mx + dx / L * 22} ${my + dy / L * 22} ${x2} ${y2}`, fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.6, "marker-end": "url(#cyc-a)" }));
    });
    P.forEach(([t, d, x, y], i) => {
      const on = active === i;
      svg.append(s("rect", { x: x - 88, y: y - 27, width: 176, height: 60, rx: 10, fill: on ? "color-mix(in srgb, var(--seine) 16%, var(--sheet))" : "var(--sheet)", stroke: on ? "var(--seine)" : "var(--rule)", "stroke-width": on ? 2.5 : 1.2 }));
      svg.append(s("text", { x, y: y - 8, "text-anchor": "middle", "font-size": 13, class: "t-disp", text: t }));
      const words = d.split(" "), lines = [""];
      words.forEach((w) => { if ((lines[lines.length - 1] + " " + w).length > 32) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim(); });
      lines.slice(0, 3).forEach((l, j) => svg.append(s("text", { x, y: y + 6 + j * 11, "text-anchor": "middle", "font-size": 9.2, fill: "var(--ink-2)", text: l })));
    });
    svg.append(s("text", { x: 430, y: 30, "font-size": 10.5, fill: "var(--ink-2)", text: "nothing woken?" }), s("text", { x: 430, y: 44, "font-size": 10.5, fill: "var(--ok)", text: "→ the run ends" }));
    return svg;
  }

  MM.defineModule({
    id: "a05",
    mystery: { title: "Three researchers, one moment", text: "In A0, the weather, travel and activities researchers ran “at the same time”. But one of them must finish first.\n\nDid the writer start early, with only part of the research? Why does the team's result come out exactly the same on every run, whichever researcher is fastest?" },
    where: { text: "The engine room: the loop that turns a drawing into a run. The state (A3) and the edges (A4) meet here, round after round." },
    predict: { q: "The writer has two normal edges into it: one from “weather” (1 round of work) and one from “trains_b” (the second of 2 rounds of train lookups). How many times does the writer run?", options: ["Once, after both are done", "Twice: once after weather, again after trains_b", "Never", "Three times"], answer: 1, why: "Each normal edge wakes the writer on its own. Weather finishes in round 1, so the writer runs in round 2 with only half the trains, and again in round 3. A join edge (wait for all) or a deferred node fixes it. This is a real recorded run." },
    story: [
      { title: "The loop inside every run", truth: "SKETCH",
        text: "LangGraph's runtime is built on [[pregel|Pregel]] (a design from Google, 2010, for computing over huge graphs in rounds). A run is a loop of [[super-step|super-steps]] (rounds). Each round has phases: **plan** (which nodes did the last round's writes wake?), **execute** (run them side by side), **update** (merge their writes), then **save** a checkpoint. When nothing is woken, the run ends. This is {law:g4}.",
        visual: (el) => { let i = 0; const box = h("div"); const draw = () => { box.innerHTML = ""; box.append(cycle(i)); }; const btn = h("button", { class: "btn small primary" }, "Next phase", MM.icon("next")); btn.onclick = () => { i = (i + 1) % 4; draw(); }; el.append(box, h("div", { class: "row", style: "margin-top:8px" }, btn)); draw(); } },
      { title: "Watch the rounds, phase by phase", truth: "REAL",
        text: "Here is a real recorded run, replayed with all four phases visible. The planner splits Maya's three days, three research tasks run in round 2, and a joiner writes the plan. Watch round 2: three tasks read one snapshot, their writes wait in a buffer, and one merge adds all three notes.",
        visual: async (el, api) => { const G = await api.graph(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["fanout"]))); G.player(el, { builder: B.fan(G), spec: SP.fan, run: G.scenarios.fanout(), phases: true, schema: B.fan(G).schema }); } },
      { title: "Send: one node, many tasks", truth: "REAL",
        text: "How did one node become three tasks? The planner's edge returned three [[send|Send]] packages (each one says “start a task of this node, with this private input”): research_day with Saturday, with Sunday, with Monday. That is a [[fan-out|fan-out]] (one step splits into many tasks); the append reducer then merges their notes back together (a fan-in). Each task sees only its own package, not the whole state.",
        precision: "Send tasks are “push” tasks: they are ordered by creation, not by name, and their trigger is __pregel_push. Normal tasks are “pull” tasks, woken through branch:to:X channels.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.fanout(); const svg = G.draw(B.fan(G), SP.fan);
          G.light(svg, { research_day: 3 }, new Set(["planner"]), new Set(["planner>research_day"]));
          el.append(svg, h("div", { class: "three", style: "margin-top:8px" }, r.steps[2].tasks.map((t) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, t.key), h("div", { class: "mono", style: "font-size:.84rem" }, "input " + JSON.stringify(t.arg)), h("div", { class: "mono", style: "font-size:.84rem;color:var(--ok)" }, "writes " + JSON.stringify(Object.fromEntries(t.writes)))))));
        } },
      { kind: "spotlight", title: "Waiting for everyone: barriers", truth: "REAL",
        text: "A normal edge wakes its target as soon as its source finishes; it never waits for the other edges. So a writer fed by a fast branch and a slow branch runs twice, the first time with half the facts. To wait, use a join edge, a [[barrier|barrier]] (a point where work waits until every branch has arrived), or mark the writer as deferred (it waits until no other work is pending). All three runs below are real.",
        intuition: "A tour bus. Two normal edges: the bus leaves when the first group arrives, then comes back for the second. A join: the guide waits until every group is on board.",
        breaks: "A real guide can count heads. A join counts named branches; a deferred node simply waits until nothing else is scheduled, which also suits branches whose number you don't know in advance.",
        visual: async (el, api) => {
          const G = await api.graph();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["join_separate", "join_wait", "join_deferred"])), G.draw(B.join(G, "separate"), SP.join));
          const col = (title, r) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, title), h("div", { class: "stack", style: "--gap:2px;margin:4px 0" }, r.steps.filter((x) => !x.start).map((x) => h("div", { class: "mono", style: `font-size:.8rem;${x.tasks.some((t) => t.name === "writer") ? "color:var(--llm);font-weight:600" : ""}` }, `round ${x.step}: ${x.tasks.map((t) => t.name).join(" + ")}`))), h("div", { class: "mono", style: "font-size:.8rem" }, `drafts: ${r.state.drafts.length}`), h("div", { class: "faint", style: "font-size:.78rem" }, r.state.drafts.map((d) => "“" + d + "”").join(" then ")));
          el.append(h("div", { class: "three", style: "margin-top:8px" }, col("Two normal edges", G.scenarios.join_separate()), col("A join (waits for all)", G.scenarios.join_wait()), col("A deferred writer", G.scenarios.join_deferred())));
        } },
      { title: "The same result, every time", truth: "REAL",
        text: "Tasks in a round really do finish in different orders. But the merge never uses finish order: it uses task order (normal tasks by node name, Send tasks by creation). In this real run, b_fast finished first, yet a_slow's note is merged first. Same graph, same inputs, same scripted replies: same state, every run.",
        visual: async (el, api) => { const G = await api.graph(); const d = await MM.loadData("lgtraces"); const r = G.scenarios.merge_order(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["merge_order"])), h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Finish order (recorded in LangGraph)"), h("p", { class: "mono" }, d.scenarios.merge_order.finish_order.join(" → "))), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Merge order (task order)"), h("p", { class: "mono" }, JSON.stringify(r.state.notes))))); } },
      { title: "When a task fails mid-round", truth: "REAL",
        text: "In this real run, Sunday's museum lookup times out while Saturday and Monday succeed. LangGraph keeps the finished tasks' results as [[pending-writes|pending writes]] (finished work saved beside the checkpoint, waiting for its round to complete). On resume, only Sunday runs again. Saturday and Monday are not repeated, so nothing is paid for twice.",
        visual: async (el, api) => {
          const G = await api.graph(); const c = G.scenarios.crash_resume();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["crash_resume"])), h("div", { class: "seg", style: "margin-bottom:8px" }));
          const box = h("div"), seg = MM.seg([{ value: "first", label: "1 · The crash" }, { value: "second", label: "2 · Resume" }], "first", (v) => show(v));
          el.querySelector(".seg").replaceWith(seg);
          el.append(box, h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, `Calls per day across both runs: ${JSON.stringify(c.calls_total)}. Only Sunday ran twice.`));
          function show(v) { box.innerHTML = ""; const p = G.player(box, { builder: B.fan(G), spec: SP.fan, run: c[v], schema: B.fan(G).schema }); p.show(p.frames.length - 1); }
          show("first");
        } },
      { title: "Retries: try again, but only when it helps", truth: "REAL",
        text: "A node can carry a retry policy: after a failure, wait a little and run the node again, up to a set number of attempts. LangGraph's default rule retries connection errors and server errors (status 5xx), but not programming errors such as ValueError: repeating a bug only repeats it. Both runs below are real.",
        precision: "Defaults: 3 attempts, first wait 0.5 s, each wait twice the last (up to 128 s), with random jitter. Python's TimeoutError counts as an OSError, which the default rule does not retry.",
        visual: async (el, api) => { const G = await api.graph(); const a = G.scenarios.retry_flaky(), b = G.scenarios.retry_value_error(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["retry_flaky", "retry_value_error"])), h("div", { class: "log" }, h("div", null, "flaky weather API (ConnectionError twice):"), h("div", { class: "ok" }, `  attempts ${a.attempts} → ${JSON.stringify(a.state)}`), h("div", null, "wrong day (ValueError):"), h("div", { class: "err" }, `  attempts ${b.attempts} → ${b.outcome.error}: ${b.outcome.message}`))); } },
      { title: "Watching a run live: streaming", truth: "REAL",
        text: "Users should not stare at a blank screen. [[streaming|Streaming modes]] (ways to watch a run while it happens) send events as rounds finish. “values” sends the whole state after each round; “updates” sends only what each node wrote. Others: “messages” (LLM tokens as they are written), “custom” (progress notes a node sends), and “tasks”, “checkpoints” and “debug” (the engine's own events). Below: the real values and updates for Maya's Stage B chain.",
        visual: async (el, api) => { const G = await api.graph(); const r = G.scenarios.stream_modes(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["stream_modes"])), h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "stream_mode = “values”"), h("div", { class: "log", style: "font-size:.78rem" }, r.values.map((v) => h("div", null, JSON.stringify(v))))), h("div", null, h("div", { class: "eyebrow" }, "stream_mode = “updates”"), h("div", { class: "log", style: "font-size:.78rem" }, r.updates.map((v) => h("div", null, JSON.stringify(v))))))); } },
      { title: "How carefully to save", truth: "SKETCH",
        text: "Saving after every round costs time, so LangGraph lets you choose a durability mode ({law:g5}). “async”, the default, saves in the background while the next round starts. “sync” waits until each save is finished: safest, slowest. “exit” saves only when the run ends: fastest, but a crash loses all of the run's progress.",
        visual: (el) => el.append(MM.bars([{ label: "sync", p: 1 }, { label: "async (default)", p: 0.8 }, { label: "exit", p: 0.05 }], { scale: 1, plain: true, total: false, fmt: (it) => ({ sync: "safest", "async (default)": "safe, overlapped", exit: "end only" })[it.label] }), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Bar = how much progress survives a crash in the middle of a run (SKETCH).")) },
      { kind: "snap", title: "The team, round by round", truth: "REAL",
        text: "Now A0's team makes sense below the waterline. Round 1: the lead plans. Round 2: three Send tasks research at once. Rounds 3 to 6: write, criticise, write again, approve. Round 7: the approval pause (A9). Seven rounds, seven checkpoints, and the same result every time.",
        visual: async (el, api) => { const G = await api.graph(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["team"]))); G.player(el, { builder: G.teamGraph(), spec: G.teamSpec, run: G.scenarios.team().first, phases: true, schema: G.teamGraph().schema, boardOpts: { max: 60 } }); } }],
    lab: {
      title: "The Graph Debugger", truth: "REAL",
      intro: "Every run here is a real LangGraph 1.2.17 run, rebuilt in your browser and replayed phase by phase. Pick one, step through its rounds, and watch the plan, execute, update and save phases. Below, run every recorded check yourself.",
      tries: ["Open “Two normal edges”. In which round does the writer first run, and what is missing from its draft?", "Open “A crash, then resume”. Find the round where two tasks are skipped, and say why.", "Open “The whole team” and count the checkpoints.", "Run all the checks. Which LangGraph rules do they cover?"],
      async mount(el, api) {
        const G = await api.graph();
        const CAT = {
          fanout: ["Fan-out with Send", () => [["run", G.scenarios.fanout()]], () => B.fan(G), SP.fan],
          join_separate: ["Two normal edges", () => [["run", G.scenarios.join_separate()]], () => B.join(G, "separate"), SP.join],
          join_wait: ["A join that waits", () => [["run", G.scenarios.join_wait()]], () => B.join(G, "wait"), SP.join],
          join_deferred: ["A deferred writer", () => [["run", G.scenarios.join_deferred()]], () => B.join(G, "deferred"), SP.join],
          crash_resume: ["A crash, then resume", () => { const c = G.scenarios.crash_resume(); return [["the crash", c.first], ["the resume", c.second]]; }, () => B.fan(G), SP.fan],
          team: ["The whole team", () => { const t = G.scenarios.team(); return [["until the pause", t.first], ["after “approve”", t.second]]; }, () => G.teamGraph(), G.teamSpec],
          command: ["A Command router", () => [["run", G.scenarios.command()]], () => B.command(G), SP.command],
          critic_loop: ["The critic loop", () => [["run", G.scenarios.critic_loop()]], () => B.loop(G), SP.loop],
          react: ["An agent loop", () => [["run", G.scenarios.react()]], () => B.agent(G), SP.agent] };
        const pick = h("div", { class: "chips-scroll", style: "margin-bottom:10px" }), parts = h("div", { class: "row", style: "--gap:6px;margin-bottom:8px" }), box = h("div");
        let cur = "join_separate";
        function open(key) {
          cur = key; const [, runs, build, sp] = CAT[key]; const list = runs();
          pick.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === key)));
          parts.innerHTML = "";
          const showPart = (i) => { box.innerHTML = ""; const g = build(); G.player(box, { builder: g, spec: sp, run: list[i][1], phases: true, schema: g.schema, boardOpts: { max: 60 } }); parts.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); api.done(); };
          if (list.length > 1) list.forEach(([label], i) => parts.append(h("button", { class: "chip", onclick: () => showPart(i) }, `${i + 1} · ${label}`)));
          showPart(0);
        }
        Object.entries(CAT).forEach(([k, [label]]) => { const b = h("button", { class: "chip", "data-k": k, onclick: () => open(k) }, label); b.dataset.k = k; pick.append(b); });
        const ver = h("div");
        const verBtn = h("button", { class: "btn" }, MM.icon("check"), "Run every check against real LangGraph");
        verBtn.onclick = async () => {
          verBtn.disabled = true; ver.innerHTML = ""; ver.append(h("p", { class: "faint" }, "Re-running every recorded scenario…"));
          const d = await MM.loadData("lgtraces"); const t0 = performance.now(); const rows = G.verifyAll(d.scenarios); const ms = performance.now() - t0;
          const ok = rows.filter((r) => r.ok).length;
          ver.innerHTML = "";
          ver.append(h("div", { class: "callout " + (ok === rows.length ? "ok" : "warn") }, h("strong", null, `${ok} of ${rows.length} runs identical to LangGraph ${d.langgraph}`), ` · every task, input, result, checkpoint, error message and final state compared · ${Math.round(ms)} ms`),
            h("div", { class: "row", style: "--gap:6px;margin-top:8px" }, rows.map((r) => h("span", { class: "pill" + (r.ok ? " ok" : ""), title: r.ok ? "identical" : r.diffs.join("; ") }, (r.ok ? "✓ " : "✗ ") + r.name.replace(/_/g, " ")))));
          verBtn.disabled = false; api.done();
        };
        el.append(pick, parts, box, h("hr", { class: "rule" }), h("h3", null, "Check the engine yourself"), h("p", { class: "muted", style: "font-size:.92rem" }, "Each of these graphs was run in real LangGraph 1.2.17 and recorded event by event. The button re-runs them all in this page and compares."), verBtn, h("div", { style: "margin-top:10px" }, ver));
        open(cur);
      } },
    breakit: {
      title: "Break the engine's timing", truth: "REAL",
      intro: "Timing bugs hide in rounds. Two are real recorded runs; the third uses LangGraph's retry rule in this page's engine.",
      cases: [
        { name: "The early writer", what: "The writer has normal edges from a fast branch (weather) and a slow one (two train lookups).", action: "Run it", result: "The writer runs in round 2 with one train, then again in round 3 with two: two drafts, one of them wrong, and two paid LLM calls.", why: "Normal edges never wait for each other. Use a join edge from both branches, or mark the writer as deferred.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["join_separate"]), h("div", { class: "mono", style: "font-size:.84rem;margin-top:6px" }, JSON.stringify(G.scenarios.join_separate().state.drafts))); } },
        { name: "A charge before a flaky call", what: "A node charges Maya's card, then calls a booking API that times out once. The node has a retry policy.", action: "Run it", result: "The retry re-runs the whole node from its first line: the card is charged twice, for one booking.", why: "A retry repeats everything in the node. Put side effects in their own node, or make them idempotent ({tool:t11}: safe to repeat, for example by sending a booking key the bank recognises).",
          visual: async (el, api) => { const G = await api.graph(); const side = []; let n = 0; const r = G.graph({ booking: {} }).node("pay_and_book", () => { side.push("charged card 570 euros"); n++; if (n < 2) { const e = new Error("booking API timed out"); e.name = "ConnectionError"; throw e; } return { booking: "confirmed" }; }, { kind: "tool", retry: { maxAttempts: 3 } }).edge(G.START, "pay_and_book").edge("pay_and_book", G.END).compile().run({ booking: "" }); el.append(h("div", { class: "log" }, side.map((x) => h("div", { class: "err" }, x)), h("div", { class: "ok" }, "booking: " + r.state.booking))); } },
        { name: "One failure, one round", what: "One of three parallel lookups fails. Without a checkpointer, nothing is saved.", action: "Run it", result: "The run stops with ConnectionError. The two finished lookups are thrown away; running again repeats all three.", why: "Pending writes live in the checkpointer. With one attached, a resume re-runs only the failed task (see the crash run in the Story)." }],
      explain: { q: "Why does LangGraph merge parallel results in task order rather than finish order?", options: ["Because task order is faster", "So that the same inputs always give the same state, whichever task happens to finish first", "Because Python cannot run tasks at the same time", "Because finish order is not recorded"], answer: 1, why: "Finish order changes from run to run; task order never does. A fixed merge order is what makes runs repeatable and testable." } },
    clinic: [
      { belief: "Parallel tasks finish in random order, so the result of a round is random.", test: "Read the merge-order beat: b_fast finished first in the real run, but a_slow's note was merged first.", truth: "Finish order varies; merge order is fixed by task order. The state after a round is repeatable." },
      { belief: "If one parallel task fails, all of that round's work is lost.", test: "In the Graph Debugger, open “A crash, then resume”: two tasks are skipped on resume.", truth: "With a checkpointer, finished tasks' writes are saved as pending writes; only the failed task runs again." },
      { belief: "A node with two incoming edges waits for both.", test: "Open “Two normal edges” in the Graph Debugger: the writer runs twice.", truth: "Each normal edge wakes the node on its own. Waiting needs a join edge or a deferred node." }],
    explain: { prompt: "Explain what happens, round by round, when a LangGraph graph runs: the phases of a super-step, Send, waiting for branches, failures and determinism.", points: ["A run is a loop of super-steps (rounds)", "Plan: find the nodes woken by the last round's writes", "Execute: run them side by side on one snapshot, buffering writes", "Update: merge the writes in task order with the reducers, then save a checkpoint", "Send starts one task per package, each with its own input", "Normal edges don't wait; joins and deferred nodes do", "Finished tasks' writes survive a failure as pending writes"] },
    skeptic: [
      { q: "Why rounds at all? Why not start each node the moment its inputs are ready?", laws: ["g4"], a: "Rounds give every node in a round the same consistent snapshot, a fixed merge order, a natural moment to save, and clean points to pause and resume ({law:g4}). The price: a fast node may wait for a slow one at the end of a round. For LLM work, which is mostly waiting on the network anyway, that trade is usually worth it." },
      { q: "Doesn't saving a checkpoint every round slow everything down?", laws: ["g5"], a: "The default “async” durability saves in the background while the next round starts, so most of the cost is hidden. When a crash must never lose a step, choose “sync”; for quick throwaway runs, “exit” saves only at the end ({law:g5})." },
      { q: "Is it really parallel, or just taking turns?", laws: ["g4"], a: "LangGraph runs a round's tasks concurrently, with threads for ordinary functions and with asyncio for async ones. LLM and tool calls spend most of their time waiting for the network, so overlapping them saves real time, as the team's round 2 does. Heavy pure-Python number crunching gains little this way." }],
    recall: [
      { q: "What are the phases of a super-step?", options: ["Read, think, write", "Plan, execute, update (then save)", "Compile, run, stop", "Send, join, merge"], answer: 1, level: 1, why: "Plan → execute → update, then a checkpoint." },
      { q: "What does a Send package do?", options: ["Sends a message to Maya", "Starts a task of a node with its own private input", "Saves a checkpoint", "Ends the run"], answer: 1, level: 2, why: "One package, one task: the basis of fan-out." },
      { q: "Two tasks run in one round; task B finishes first. Whose write is merged first?", options: ["B's", "Task order decides, not finish order", "Random", "Neither: error"], answer: 1, level: 3, why: "Merging uses task order, so runs repeat exactly." },
      { q: "With a checkpointer, one of three parallel tasks fails. What happens on resume?", options: ["All three run again", "Only the failed task runs again", "Nothing runs", "The run restarts from the beginning"], answer: 1, level: 4, why: "The other two tasks' writes were kept as pending writes." },
      { q: "From A4: what does the recursion limit count?", options: ["Drafts", "Super-steps", "Tokens", "Nodes"], answer: 1, level: 5, why: "Rounds, however many nodes run in each." }],
    depth: [
      ["Bulk synchronous parallel", "Pregel follows the BSP pattern: compute in parallel, then a barrier, then exchange messages. In LangGraph the “messages” are channel writes, and the barrier is the end of a round."],
      ["Triggers", "Node X is woken by a write to its branch:to:X channel (normal and conditional edges), by a Send (trigger __pregel_push), or when a join channel has heard from every source."],
      ["Task order", "Pull tasks (woken by edges) are ordered by node name; push tasks (from Send) by creation. Writes are merged in that order."],
      ["Deferred nodes", "A deferred node is held back while any other task is still scheduled, then runs once. It is the easy barrier when the number of branches varies."],
      ["Step numbers", "With a checkpointer, step −1 is the input checkpoint (only empty reducer values), step 0 holds the applied input, and each round then adds one."],
      ["Retry policy", "max_attempts (3), initial_interval (0.5 s), backoff_factor (2), max_interval (128 s), jitter, and retry_on, a rule deciding which errors are worth retrying."],
      ["Durability", "durability = “async” (default), “sync” or “exit”, chosen per run."]],
    connect: { links: ["The agent loop, built from two nodes and one conditional edge: {mod:a06}.", "What exactly is saved at the end of each round, and how to rewind it: {mod:a08}.", "Why a pause can only happen inside a round, and what resuming re-runs: {mod:a09}."], line: "You can now read any run round by round. Next: put an LLM that chooses its own tools inside a node, and the graph becomes an agent." }
  });
})();
