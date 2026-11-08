/* A4 · Decisions — normal edges, conditional edges, Command, and how loops stop. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  /* the writer–critic loop with an optional revision guard; give_up is a visible node so both exits can be drawn */
  function loopGraph(G, o) {
    const g = G.graph({ budget: {}, cost: {}, revisions: {}, approved: {}, note: {} })
      .node("writer", (st) => ({ cost: o.costs[Math.min(st.revisions, o.costs.length - 1)], revisions: st.revisions + 1 }), { kind: "llm" })
      .node("critic", (st) => ({ approved: st.cost <= st.budget }), { kind: "llm" })
      .edge(G.START, "writer").edge("writer", "critic");
    if (o.guard) g.node("give_up", (st) => ({ note: `No plan fits ${st.budget} euros after ${st.revisions} drafts: ask Maya.` }), { kind: "fn", label: "give up" }).edge("give_up", G.END)
      .cond("critic", (st) => (st.approved ? "fits" : st.revisions >= o.max ? "out of tries" : "over"), { fits: G.END, over: "writer", "out of tries": "give_up" });
    else g.cond("critic", (st) => (st.approved ? "fits" : "over"), { fits: G.END, over: "writer" });
    return g;
  }
  const loopSpec = (guard) => ({ W: 600, H: 175, nodes: Object.assign({ writer: { x: 200, y: 60, kind: "llm" }, critic: { x: 400, y: 60, kind: "llm" } }, guard ? { give_up: { x: 400, y: 145, kind: "fn", label: "give up" } } : {}), start: { x: 55, y: 60 }, end: { x: 548, y: guard ? 145 : 60 },
    labels: { "critic>__end__": "fits budget", "critic>writer": "over budget", "critic>give_up": "out of tries" }, via: { "critic>writer": [[400, 12], [200, 12]], "critic>__end__": guard ? [[548, 60]] : undefined } });
  const START_STATE = { budget: 900, cost: 0, revisions: 0, approved: false, note: "" };

  MM.defineModule({
    id: "a04",
    mystery: { title: "The critic who is never satisfied", text: "Maya's writer drafts a plan, the critic checks it, and if it is over budget the plan goes back to the writer. One day the critic is set far too strictly and never approves anything.\n\nDoes the loop run forever, spending money on every lap? What, exactly, stops it?" },
    where: { text: "Zoom in on the arrows. In A2 the edges were drawn; in A3 the state was shared. Now the edges read that state and choose." },
    predict: { q: "The writer–critic loop has no counter, the critic never approves, and the run has recursion_limit = 8. What happens?", options: ["It loops forever", "It makes 8 drafts, then stops", "It stops with GraphRecursionError after 8 rounds: 4 drafts and 4 checks", "LangGraph refuses to compile a loop like this"], answer: 2, why: "The recursion limit counts super-steps (rounds), not drafts. Writer and critic each take a round, so 8 rounds hold 4 drafts. Then the run stops with GraphRecursionError. This is a real recorded run." },
    story: [
      { title: "Three ways to say “what next”", truth: "SKETCH",
        text: "After a node runs, something must decide what runs next. A **normal edge** always leads to the same node. A [[conditional-edge|conditional edge]] (an edge with a small routing function that reads the state and names the next node) chooses at run time. A [[command|Command]] (a special return value) lets the node itself say “change these fields, and go there next”. This is {law:g7}.",
        visual: async (el, api) => {
          const G = await api.graph();
          const a = G.graph({ x: {} }).node("draft", () => ({}), { kind: "llm" }).node("check", () => ({}), { kind: "llm" }).edge(G.START, "draft").edge("draft", "check").edge("check", G.END);
          const b = G.graph({ x: {} }).node("check", () => ({}), { kind: "llm" }).node("draft", () => ({}), { kind: "llm" }).edge(G.START, "check").cond("check", () => G.END, { fits: G.END, over: "draft" }).edge("draft", G.END);
          const c = G.graph({ x: {} }).node("router", () => ({}), { kind: "llm", destinations: ["weather", "planner"] }).node("weather", () => ({}), { kind: "llm" }).node("planner", () => ({}), { kind: "llm" }).edge(G.START, "router").edge("weather", G.END).edge("planner", G.END);
          const box = (title, g, sp, cap) => h("div", { class: "panel row", style: "--gap:12px;align-items:center;flex-wrap:wrap;padding:8px 12px" }, h("div", { style: "flex:1 1 230px;max-width:320px" }, G.draw(g, sp, { maxW: 320 })), h("div", { style: "flex:1 1 140px" }, h("div", { class: "eyebrow" }, title), h("p", { class: "faint", style: "font-size:.86rem;margin:4px 0 0" }, cap)));
          el.append(h("div", { class: "stack", style: "--gap:8px" },
            box("Normal edge", a, { W: 300, H: 150, nodes: { draft: { x: 150, y: 50, w: 96 }, check: { x: 150, y: 110, w: 96 } }, start: { x: 40, y: 50 }, end: { x: 262, y: 110 } }, "Always the same next node."),
            box("Conditional edge", b, { W: 300, H: 150, nodes: { check: { x: 120, y: 45, w: 96 }, draft: { x: 120, y: 115, w: 96 } }, start: { x: 36, y: 45 }, end: { x: 262, y: 45 }, labels: { "check>__end__": "fits", "check>draft": "over" } }, "A routing function reads the state."),
            box("Command", c, { W: 300, H: 150, nodes: { router: { x: 110, y: 75, w: 92 }, weather: { x: 225, y: 35, w: 100 }, planner: { x: 225, y: 115, w: 100 } }, start: { x: 34, y: 75 }, end: { x: 280, y: 75 } }, "The node returns an update and a destination.")));
        } },
      { title: "The conditional edge", truth: "REAL",
        text: "The routing function is plain code: it reads the state and returns a label, and a path map (a small table from labels to nodes) turns the label into the next node. In the real recorded run below, the critic sends each draft back until the cost fits: 820, 690, then 560 against a budget of 600.",
        precision: "The routing function sees the state as its own node left it: the round's starting state plus that node's update. It does not see updates from nodes running beside it in the same round.",
        visual: async (el, api) => {
          const G = await api.graph();
          const g = G.graph({ budget: {}, cost: {}, revisions: {}, approved: {} }).node("writer", () => ({}), { kind: "llm" }).node("critic", () => ({}), { kind: "llm" }).edge(G.START, "writer").edge("writer", "critic").cond("critic", () => G.END, { done: G.END, give_up: G.END, revise: "writer" });
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["critic_loop"])));
          G.player(el, { builder: g, spec: { W: 600, H: 130, nodes: { writer: { x: 210, y: 70, kind: "llm" }, critic: { x: 400, y: 70, kind: "llm" } }, start: { x: 60, y: 70 }, end: { x: 548, y: 70 }, labels: { "critic>__end__": "done", "critic>writer": "revise" }, via: { "critic>writer": [[400, 18], [210, 18]] } }, run: G.scenarios.critic_loop(), schema: g.schema, builderNoSaver: true });
        } },
      { title: "Every loop needs a way out", truth: "SKETCH",
        text: "Graphs may loop (A2), so something must end a run. {law:g6}: a run stops when a branch reaches END and nothing else is scheduled, when an interrupt pauses it to wait for a person (A9), when a node fails, or when the [[recursion-limit|recursion limit]] (the most rounds a run may take) stops it with a GraphRecursionError. Only the first is a happy ending you designed.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["ok", "Reached END, nothing scheduled", "the run is finished"], ["warn", "interrupt()", "paused, waiting for a person; not finished"], ["bad", "A node raised an error", "stopped; with a checkpointer it can resume"], ["bad", "Recursion limit", "stopped with GraphRecursionError"]].map(([c, a, b]) => h("div", { class: "note " + c }, h("strong", null, a), " · ", h("span", { class: "muted" }, b))))) },
      { kind: "spotlight", title: "The limit counts rounds, not laps", truth: "REAL",
        text: "The recursion limit counts super-steps (rounds), not trips around a loop. Writer and critic each need a round, so every revision costs **two**. Below, the real never-satisfied critic with a limit of 8: four drafts, four checks, then GraphRecursionError. The error message is LangGraph's own.",
        intuition: "A bus ticket that allows 8 rides, not 8 return journeys: each lap of the loop uses two rides.",
        breaks: "Several nodes can ride in the same round. Three researchers running side by side use one ride between them, not three (A5).",
        precision: "With limit N, rounds 1 to N run; the next round is refused. In LangGraph 1.2.17 the default limit is 10,007 (older versions and many tutorials say 25), so always set your own, per run, with the recursion_limit setting.",
        visual: async (el, api) => {
          const G = await api.graph();
          const g = G.graph({ budget: {}, cost: {}, revisions: {}, approved: {} }).node("writer", () => ({}), { kind: "llm" }).node("critic", () => ({}), { kind: "llm" }).edge(G.START, "writer").edge("writer", "critic").cond("critic", () => G.END, ["writer", G.END]);
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["never_satisfied"])));
          G.player(el, { builder: g, spec: { W: 600, H: 130, nodes: { writer: { x: 210, y: 70, kind: "llm" }, critic: { x: 400, y: 70, kind: "llm" } }, start: { x: 60, y: 70 }, end: { x: 548, y: 70 }, via: { "critic>writer": [[400, 18], [210, 18]] } }, run: G.scenarios.never_satisfied(), schema: g.schema, builderNoSaver: true });
        } },
      { title: "Count your own laps", truth: "TOY",
        text: "The recursion limit is a safety net, not a design. A good loop carries its own counter in the state (here “revisions”) and has a planned exit: after three drafts, stop and ask Maya. Then a stubborn loop ends politely, with a useful message, instead of crashing with an error.",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.draw(loopGraph(G, { costs: [970], guard: true, max: 3 }), loopSpec(true)), h("p", { class: "faint", style: "font-size:.86rem" }, "The routing function asks two questions in order: does the cost fit? If not, have we used our three tries?")); } },
      { title: "Command: update and go, in one move", truth: "REAL",
        text: "A node can return a Command instead of a plain update: “write route = weather, and go to the weather desk next”. The update and the decision travel together, which suits routers and the hand-offs between agents (A7). Because the choice is made inside the node, you list its possible destinations so the graph can still be drawn.",
        visual: async (el, api) => {
          const G = await api.graph();
          const g = G.graph({ question: {}, route: {}, answer: {} }).node("router", () => ({}), { kind: "llm", destinations: ["weather_desk", "planner_desk"], commandOnly: true }).node("weather_desk", () => ({}), { kind: "llm", label: "weather desk" }).node("planner_desk", () => ({}), { kind: "llm", label: "planner desk" }).edge(G.START, "router").edge("weather_desk", G.END).edge("planner_desk", G.END);
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["command"])));
          G.player(el, { builder: g, spec: { W: 600, H: 170, nodes: { router: { x: 200, y: 85, kind: "llm" }, weather_desk: { x: 390, y: 40, kind: "llm", label: "weather desk" }, planner_desk: { x: 390, y: 130, kind: "llm", label: "planner desk" } }, start: { x: 60, y: 85 }, end: { x: 548, y: 85 } }, run: G.scenarios.command(), schema: g.schema, builderNoSaver: true });
        } },
      { title: "Command plus an edge: both run", truth: "REAL",
        text: "A trap: if a node returns a Command that goes to the weather desk **and** also has a normal edge to an audit node, both run in the next round. A Command adds a destination; it does not cancel the node's other edges. In this real run, the audit ran too.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.command_plus_edge();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["command_plus_edge"])), h("div", { class: "log" }, r.steps.filter((x) => !x.start).map((x) => h("div", null, `round ${x.step}: ` + x.tasks.map((t) => t.name).join(" + ") + (x.tasks.some((t) => t.goto) ? `   (Command: go to ${x.tasks.find((t) => t.goto).goto})` : ""))), h("div", { class: "ok" }, "log = " + JSON.stringify(r.state.log))));
        } },
      { title: "One router, several paths", truth: "REAL",
        text: "A routing function may return several node names at once. All of them run in the next round, side by side, and their findings merge through the state's reducers (A3). Here the triage reads Maya's question, “Will it rain, and which museum is open?”, and wakes two specialists out of three.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.route_list();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["route_list"])), h("div", { class: "log" }, h("div", null, "round 1: triage → returns [“museums”, “weather”]"), h("div", null, "round 2: " + r.steps[2].tasks.map((t) => t.name).join(" + ") + " (side by side; hotels was not woken)"), h("div", { class: "ok" }, "found = " + JSON.stringify(r.state.found))));
        } },
      { title: "When the router is an LLM", truth: "SKETCH",
        text: "Some choices need judgement: is “should I bring a coat?” a weather question or a packing question? Then the routing function can ask an LLM. The model's choice is a probability ({tool:t4}), so force its answer into a fixed set of labels with [[structured-output|structured output]] (an answer that must match a given format), and send unsure cases to a safe default or a person.",
        visual: (el) => el.append(MM.bars([{ label: "weather", p: 0.71 }, { label: "packing", p: 0.24 }, { label: "other", p: 0.05 }], { scale: 1 }), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "SKETCH numbers: a router 71% sure. A rule such as “below 80%, ask a clarifying question” turns uncertainty into a planned path.")) },
      { kind: "snap", title: "Stage D: the planner decides", truth: "SKETCH",
        text: "Maya's planner now decides for itself, inside limits you set: the critic routes each draft to approval, back to the writer, or, after three tries, to an honest “no plan fits”. The run's laps are counted twice over: by the state's own counter, and by the recursion limit as a safety net.",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.draw(G.teamGraph(), G.teamSpec), h("p", { class: "faint", style: "font-size:.86rem" }, "The finished team: one Send fan-out (A5), one critic loop, one approval pause (A9).")); } }],
    lab: {
      title: "The Route Tracer", truth: "TOY",
      intro: "First, trace one decision: set the state and watch which way the critic's routing function sends the run. Then run the whole loop with a writer who improves, a stubborn writer, or one who gets worse, with or without a revision counter.",
      tries: ["Set the cost to 880. Which path lights up? Now 920 with 0 revisions.", "Set revisions to 3 (with the counter on). Why does 920 now go to “give up”?", "Run the stubborn writer with the counter off and limit 8. How many drafts were made before the error?", "Turn the counter on and run again. What changed for Maya?", "Pick the writer who improves and a limit of 4. Why does a run that would succeed still fail?"],
      async mount(el, api) {
        const G = await api.graph();
        const st = { cost: 920, revisions: 1, guard: true, max: 3, writer: "improves", limit: 25 };
        const WRITERS = { improves: [970, 885, 860], stubborn: [970], worse: [970, 990, 1010, 1030, 1050] };
        /* part 1 · trace one decision */
        const pic = h("div", { class: "bp", style: "padding:6px" }), table = h("div"), runBox = h("div"), outBox = h("div");
        function trace() {
          const g = loopGraph(G, { costs: [st.cost], guard: st.guard, max: st.max });
          const svg = G.draw(g, loopSpec(st.guard), { maxW: 660 });
          const fits = st.cost <= 900, out = st.guard && !fits && st.revisions >= st.max;
          const target = fits ? G.END : out ? "give_up" : "writer";
          G.light(svg, { critic: 1 }, new Set(["writer"]), new Set(["critic>" + target]));
          pic.innerHTML = ""; pic.append(svg);
          const row = (q, ans, on, result) => h("tr", { style: on ? "background:color-mix(in srgb, var(--seine) 10%, transparent)" : "" }, h("td", null, q), h("td", { class: "mono" }, ans), h("td", null, on ? h("strong", null, result) : h("span", { class: "faint" }, result)));
          table.innerHTML = "";
          table.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "the routing function asks"), h("th", null, "answer"), h("th", null, "then"))), h("tbody", null,
            row(`Is the cost (${st.cost}) at most the budget (900)?`, fits ? "yes" : "no", fits, "“fits budget” → END"),
            st.guard ? row(`Have we used our ${st.max} tries? (revisions = ${st.revisions})`, fits ? "not asked" : st.revisions >= st.max ? "yes" : "no", out, "“out of tries” → give up") : null,
            row("Otherwise", fits || out ? "not reached" : "go back", !fits && !out, "“over budget” → writer"))));
        }
        /* part 2 · run the loop */
        function run() {
          const g = loopGraph(G, { costs: WRITERS[st.writer], guard: st.guard, max: st.max });
          const res = g.compile().run(Object.assign({}, START_STATE), { limit: st.limit });
          runBox.innerHTML = ""; outBox.innerHTML = "";
          const drafts = res.steps.reduce((a, x) => a + x.tasks.filter((t) => t.name === "writer").length, 0), rounds = res.steps.filter((x) => !x.start).length;
          outBox.append(h("div", { class: "row", style: "--gap:16px;margin:8px 0" }, [[rounds, "rounds used"], [drafts, "drafts written"], [res.outcome.status === "done" ? (res.state.note ? "gave up politely" : "plan approved") : "stopped by an error", "outcome"]].map(([n, l]) => h("div", null, h("div", { class: "t-disp", style: "font-size:1.5rem" }, String(n)), h("div", { class: "faint", style: "font-size:.82rem" }, l)))));
          if (res.state.note) outBox.append(h("div", { class: "callout warn" }, h("strong", null, "Message for Maya: "), res.state.note));
          G.player(runBox, { builder: g, spec: loopSpec(st.guard), run: res, schema: g.schema, builderNoSaver: true });
          api.done();
        }
        const ctl = h("div", { class: "two" },
          MM.slider({ label: "cost of this draft (euros)", min: 700, max: 1100, step: 10, value: st.cost, fmt: (v) => v + " €", onInput: (v) => { st.cost = v; trace(); } }),
          MM.slider({ label: "revisions so far", min: 0, max: 5, step: 1, value: st.revisions, fmt: (v) => String(v), onInput: (v) => { st.revisions = v; trace(); } }));
        const guardCb = h("input", { type: "checkbox", id: "rt-guard", checked: true });
        guardCb.onchange = () => { st.guard = guardCb.checked; trace(); runBox.innerHTML = ""; outBox.innerHTML = ""; };
        const maxSel = h("select", { "aria-label": "Maximum tries", style: "width:auto" }, [1, 2, 3, 4, 5].map((n) => h("option", { value: n, selected: n === st.max }, n + (n === 1 ? " try" : " tries"))));
        maxSel.onchange = () => { st.max = +maxSel.value; trace(); };
        const writerSeg = MM.seg([{ value: "improves", label: "Improves: 970, 885…" }, { value: "stubborn", label: "Stubborn: 970 always" }, { value: "worse", label: "Gets worse" }], st.writer, (v) => { st.writer = v; });
        el.append(h("h3", null, "1 · Trace one decision"), pic, h("div", { style: "margin-top:10px" }, ctl),
          h("div", { class: "row", style: "--gap:10px;margin:6px 0 10px" }, h("label", { for: "rt-guard", class: "row", style: "--gap:6px;cursor:pointer" }, guardCb, "Revision counter on, maximum"), maxSel),
          h("div", { class: "scroll-x" }, table),
          h("hr", { class: "rule" }), h("h3", null, "2 · Run the whole loop"),
          h("div", { class: "row", style: "--gap:10px;margin-bottom:8px" }, h("span", { class: "eyebrow" }, "The writer"), writerSeg),
          MM.slider({ label: "recursion limit (rounds)", min: 2, max: 30, step: 1, value: st.limit, fmt: (v) => String(v), onInput: (v) => { st.limit = v; } }),
          h("div", { style: "margin-top:8px" }, h("button", { class: "btn primary", onclick: run }, MM.icon("play"), "Run the loop")), outBox, runBox);
        trace();
      } },
    breakit: {
      title: "Break the decisions", truth: "REAL",
      intro: "Routing mistakes rarely crash at once. Each case below is a real LangGraph run or a real LangGraph error message.",
      cases: [
        { name: "A loop with no exit", what: "The critic never approves and nothing counts the drafts. The run has a limit of 8 rounds.", action: "Run it", result: "GraphRecursionError: Recursion limit of 8 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.", why: "Eight rounds were spent (four paid drafts and four paid checks) and nothing useful came out. Raising the limit only spends more. Add a counter and a planned exit.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["never_satisfied"])); } },
        { name: "Command plus a normal edge", what: "The router returns Command(goto = weather desk) and also keeps an old normal edge to an audit node.", action: "Run it", result: "Both the weather desk and the audit run in round 2. If the audit were a paid step or sent a message, it would happen on every question.", why: "A Command adds a destination; it never removes the node's normal edges. Use one routing method per node.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["command_plus_edge"])); } },
        { name: "A path to a node that doesn't exist", what: "The critic's path map sends “over” to “rewrite”, but the node is called “writer”.", action: "Compile", result: "ValueError: At 'critic' node, 'condition' branch found unknown target 'rewrite'", why: "Path maps are checked when the graph compiles, so a typo is caught before any token is spent. A routing function without a path map can only fail at run time." }],
      explain: { q: "The recursion limit is set to 20 and the loop is writer → critic → writer… How many drafts can the writer make before the error?", options: ["20", "10", "19", "As many as needed"], answer: 1, why: "Each draft costs two rounds (writer, then critic), so 20 rounds allow 10 drafts." } },
    clinic: [
      { belief: "The recursion limit counts how many times the loop goes round.", test: "In the Route Tracer, run the stubborn writer with the counter off and a limit of 8: only 4 drafts are written.", truth: "It counts super-steps (rounds). A lap through writer and critic uses two." },
      { belief: "Hitting the recursion limit is a normal way to finish a loop.", test: "Compare the two endings in the Route Tracer: an error with nothing for Maya, or “give up” with a clear message.", truth: "The limit raises an error; it is a safety net. Design the exit yourself: a counter in the state and a path to a polite ending." },
      { belief: "Only an LLM can decide where a graph goes next.", test: "Look at the routing function in the Route Tracer: two plain questions about numbers in the state.", truth: "Most routes are ordinary code reading the state: cheap, fast and testable. Use an LLM router only when the choice needs judgement." }],
    explain: { prompt: "Explain how a LangGraph graph decides what to run next, and how a loop is kept from running forever.", points: ["A normal edge always leads to the same node", "A conditional edge's routing function reads the state and names the next node(s)", "A Command updates the state and names the next node in one return value", "A Command adds a destination; normal edges out of the node still fire", "Runs stop at END, at an interrupt, on an error, or at the recursion limit", "The limit counts rounds, so design your own exit with a counter"] },
    skeptic: [
      { q: "Why not let the LLM decide every next step?", laws: ["g7", "g9"], a: "You can: that is an agent (A6). But every decision made by a model costs a call, adds delay and can be wrong ({law:g9}). When the rule is known, such as “over budget goes back to the writer”, plain code decides it instantly, for free, the same way every time ({law:g7})." },
      { q: "If a Command can route, why do conditional edges exist?", laws: ["g7"], a: "A conditional edge keeps the decision outside the node and visible in the drawing, and keeps the node a simple “state in, update out” function. A Command is decided inside the node, so you must declare its destinations for the drawing. Use a Command when the update and the route belong together, as in a hand-off between agents." },
      { q: "Isn't a recursion limit just a way of hiding infinite loops?", laws: ["g6"], a: "The opposite: it turns an endless, money-burning loop into a loud error after a known number of rounds ({law:g6}). It is the last line of defence. The design still needs real exits." }],
    recall: [
      { q: "What does a normal edge do?", options: ["Chooses at run time", "Always leads to the same next node", "Calls an LLM", "Saves a checkpoint"], answer: 1, level: 1, why: "Fixed “what next”." },
      { q: "What does the recursion limit count?", options: ["Drafts", "Tokens", "Super-steps (rounds)", "Seconds"], answer: 2, level: 2, why: "Each round counts once, however many nodes run in it." },
      { q: "A node returns Command(goto = X) and also has a normal edge to Y. What runs next?", options: ["Only X", "Only Y", "Both X and Y", "An error"], answer: 2, level: 3, why: "A Command adds a destination; edges still fire (REAL)." },
      { q: "A routing function returns [“weather”, “museums”]. What happens?", options: ["An error", "Only the first runs", "Both run in the next round, side by side", "They run one after the other"], answer: 2, level: 4, why: "Several targets run in parallel." },
      { q: "From A3: two writes to a replace field in one round give…", options: ["The last value", "InvalidUpdateError", "A list", "Nothing"], answer: 1, level: 5, why: "One write per round for fields without a reducer." }],
    depth: [
      ["Path maps", "A conditional edge can list its possible targets, as a list or a map from labels to nodes. Compile then checks every target exists, and the drawing can show each path."],
      ["What a routing function sees", "The state as its own node left it: the round's starting state plus that node's update, not the updates of nodes running beside it."],
      ["Command in full", "update (fields to write), goto (next node or nodes, or Send packages), resume (an answer for an interrupt, A9), and graph = PARENT to hand off to a node in the parent graph (A7)."],
      ["The recursion limit", "Set per run with the recursion_limit setting. With limit N, rounds 1 to N may run, then GraphRecursionError. In LangGraph 1.2.17 the default is 10,007 (an environment variable can change it); many older guides say 25."],
      ["Edges are channels too", "Underneath, an edge into node X is a write to a small channel named branch:to:X, and that write is what wakes X for the next round."],
      ["Decisions and determinism", "Code routes give the same path for the same state. LLM routes may not, so log the route taken in the state, as the command example does with “route”."]],
    connect: { links: ["Send, the fourth way to say what next, and rounds with many nodes: {mod:a05}.", "The agent loop is one conditional edge on tool calls: {mod:a06}.", "Pausing at a decision for a person to approve: {mod:a09}."], line: "The planner can now choose its own path inside limits you set. Next: what the engine actually does in each round." }
  });
})();
