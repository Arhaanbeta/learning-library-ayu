/* A0 · The Team in Action — the finished trip planner, above and below the waterline. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, C = MM.course, store = MM.store;
  const section = (n, title, ...kids) => h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, n), h("h2", null, title)), ...kids);
  const REQUEST = "Plan three rain-friendly days in Paris within my budget.";

  function custom(root, api) {
    const id = "a00";
    MM.markDone(id, "mystery");
    root.append(h("section", { class: "section" }, h("div", { class: "card reading", style: "max-width:46rem" },
      h("div", { class: "eyebrow" }, "Cold open"),
      h("p", { style: "margin-top:8px;font-size:1.08rem" }, "Line 1 ended with one agent juggling twelve tools and getting lost. Here is the same request handled by a team. Maya types:"),
      h("div", { class: "bubble", style: "margin:12px 0 0 auto;max-width:30rem;border-radius:12px 12px 4px 12px;background:var(--seine-soft)" }, REQUEST),
      h("p", { class: "muted", style: "margin-top:12px" }, "A lead agent splits the work, three specialists research at the same time, a writer and a critic argue over the budget, and the whole run pauses overnight for Maya's approval before anything is booked. Watch it once from start to finish; the rest of Line 2 rebuilds it from nothing."))));

    const watch = section("01", "Watch the team work");
    const p1 = h("div"), p2 = h("div"), badge = h("div", { class: "row", style: "margin-bottom:10px" });
    watch.append(h("p", { class: "muted reading" }, "Press Play, or step with Next. Each round, the highlighted nodes run; the shared state on the right changes; a checkpoint is saved at the end of the round."), badge, p1, p2);
    root.append(watch);
    api.graph().then((G) => {
      badge.append(G.verified(["team"], "this exact graph, run in LangGraph, produced the same rounds, writes and pause"));
      const side = [];
      const app = G.teamGraph({ side }).compile({ checkpointer: G.MemorySaver() });
      const first = app.run(G.teamInput(), { thread: "maya-paris" });
      const b = G.teamGraph();
      G.player(p1, { builder: b, spec: G.teamSpec, run: first, schema: b.schema, title: "The trip-planner team", boardOpts: { hide: ["request"] }, onFrame: (f, i, n) => { if (i === n - 1) MM.markDone(id, "where"); } });
      const pauseNote = h("div", { class: "card", style: "margin-top:14px" },
        h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Overnight"), h("span", { class: "pill warn" }, "paused")),
        h("p", { style: "margin-top:6px" }, `The run stopped inside “Maya approves”. It asked: ${first.outcome.interrupts[0].question} Everything it knows is saved in checkpoint ${app.checkpointer.latest("maya-paris").id} under the thread “maya-paris”. No program is running now: the server could even restart.`),
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "btn primary", onclick: (e) => { e.currentTarget.disabled = true; morning(); } }, "The next morning: Maya approves"), h("span", { class: "faint", style: "font-size:.88rem" }, "Side effects so far: " + side.join("; "))));
      p1.append(pauseNote);
      function morning() {
        const second = app.run(G.Command({ resume: "approve" }), { thread: "maya-paris" });
        p2.append(h("h3", { style: "margin:18px 0 8px" }, "The next morning"), h("p", { class: "muted reading", style: "margin-bottom:8px" }, "The runtime loads the saved checkpoint and runs the paused node again from its first line. This time, interrupt() hands back Maya's answer instead of pausing."));
        G.player(p2, { builder: b, spec: G.teamSpec, run: second, schema: b.schema, title: "The run resumes", boardOpts: { hide: ["request"] }, onFrame: (f, i, n) => { if (i === n - 1) { MM.markDone(id, "story"); MM.markDone(id, "spotlight"); } } });
        p2.append(h("div", { class: "callout", style: "margin-top:10px" }, h("strong", null, "Side effects, in order: "), side.join(" → "), ". The summary was prepared twice, because the paused node ran twice. The booking ran once, after approval. Station A9 explains why that order matters."));
        stats(statBox, app, first, second);
      }
      stats(statBox, app, first, null);
    }).catch((e) => p1.append(MM.errorBox(e)));

    const ice = section("02", "The iceberg");
    const statBox = h("div", { class: "three", style: "margin-top:12px" });
    ice.append(h("p", { class: "muted reading" }, "What you drew is the tip: a graph of boxes and arrows. Underneath, the engine keeps one shared record of everything, merges every update by a rule, runs in numbered rounds, and saves a snapshot after each one. That hidden part is what makes the team reliable."), iceberg(), statBox);
    root.append(ice);

    const myst = section("03", "Three mysteries Line 2 will solve");
    const M3 = [["How do the agents share information without ever talking to each other?", "They never call each other. Each one reads one shared state and returns an update; a merge rule decides how updates combine.", ["a03", "a05"]],
      ["How did the run pause overnight, with no program running, and carry on?", "At every round boundary the engine saves a checkpoint. A pause is just a saved checkpoint plus a question; resuming loads it and re-runs the paused node.", ["a08", "a09"]],
      ["What stops the writer and critic from arguing forever?", "A revision counter in the state, a routing rule that gives up after three tries, and a hard cap on the number of rounds.", ["a04"]]];
    myst.append(h("div", { class: "three" }, M3.map(([q, hint, mods], i) => {
      const ans = h("p", { class: "muted", hidden: true, style: "margin-top:8px;font-size:.95rem" }, hint);
      return h("div", { class: "card" }, h("div", { class: "eyebrow" }, "Mystery " + (i + 1)), h("h3", { style: "margin:6px 0" }, q), h("button", { class: "btn small ghost", onclick: (e) => { ans.hidden = false; e.currentTarget.remove(); MM.markDone(id, "predict"); } }, "A first hint"), ans,
        h("div", { class: "faint", style: "font-size:.85rem;margin-top:8px" }, "Solved in ", mods.map((m, j) => [j ? " and " : "", h("a", { href: "#" + m }, C.byId[m].code)])));
    })));
    root.append(myst);

    const road = section("04", "The road ahead: one problem at a time");
    const STAGES = [["A", "One LLM call", "Writes a generic plan with invented prices", "No live data; nothing is checked", "a01"], ["B", "A fixed chain", "Forecast → draft → budget check, always in that order", "Cannot adapt or loop", "a02"], ["C", "Shared state", "Steps share facts through one record", "Steps that run together overwrite each other", "a03"], ["D", "Routing and a revise loop", "Sends each request down the right path; a critic sends drafts back", "A loop might never end", "a04"], ["E", "Parallel fan-out", "Researches all three days at once", "Results must be merged in rounds", "a05"], ["F", "An agent node", "The Activities agent searches and decides for itself", "One agent with too many tools gets lost", "a06"], ["G", "A team", "A lead agent coordinates the specialists, writer and critic", "It must survive crashes and remember Maya", "a07"], ["H", "Memory", "Resumes after a crash; remembers Maya's tastes; rewinds and forks", "Booking must wait for Maya's approval", "a08"], ["I", "Human approval", "Pauses before paying and waits, for minutes or days", "Real users, real money, real attackers", "a09"], ["J", "Production-ready", "Retries, guardrails, tracing, evaluation, safe deployment", "—", "a10"]];
    road.append(h("p", { class: "muted reading" }, "Each stage of Maya's planner exists because the stage before it hit a real problem. That is the order of Line 2."),
      h("div", { class: "scroll-x", style: "margin-top:10px" }, h("table", { class: "tbl", style: "min-width:620px" }, h("thead", null, h("tr", null, h("th", null, "Stage"), h("th", null, "What the planner can do"), h("th", null, "The problem that forces the next stage"), h("th", null, "Station"))),
        h("tbody", null, STAGES.map(([k, name, can, prob, m]) => h("tr", null, h("td", null, h("strong", null, k + " · " + name)), h("td", null, can), h("td", { class: "muted" }, prob), h("td", null, h("a", { href: "#" + m }, C.byId[m].code))))))));
    root.append(road);

    const end = section("05", "Ready");
    const fin = h("button", { class: "btn primary" }, MM.icon("check"), "Finish the Team in Action");
    fin.onclick = () => { MM.STEPS.forEach((st) => MM.markDone(id, st)); store.update((st) => { st.mods[id].completed = Date.now(); }); fin.disabled = true; fin.textContent = "Done"; MM.toast("Next: A1 · From Answer to Action"); };
    if (store.mod(id).completed) { fin.disabled = true; fin.textContent = "Done"; }
    end.append(h("p", { class: "muted reading" }, "Nothing in this team is a new kind of AI. Every box marked with a brain is the Line 1 machine, called once with its own context. Everything else is ordinary, testable code."), h("div", { class: "row", style: "margin-top:10px" }, fin, h("button", { class: "btn", onclick: () => MM.go("a01") }, "Go to A1", MM.icon("next")), h("button", { class: "btn ghost", onclick: () => { MM.atlasStart = "team"; MM.go("atlas"); } }, "See it in the Atlas")));
    root.append(end);
  }

  function iceberg() {
    const svg = s("svg", { viewBox: "0 0 640 330", class: "figure", role: "img", "aria-label": "Above the water, the graph you draw. Below it, the state, the merge rules, the rounds and the checkpoints." });
    svg.append(s("rect", { x: 0, y: 120, width: 640, height: 210, fill: "color-mix(in srgb, var(--line2) 9%, var(--sheet))" }), s("path", { d: "M0 120 Q 40 112 80 120 T 160 120 T 240 120 T 320 120 T 400 120 T 480 120 T 560 120 T 640 120", fill: "none", stroke: "var(--line2)", "stroke-width": 2 }));
    svg.append(s("path", { d: "M250 120 L300 40 L340 60 L390 120 Z", fill: "var(--sheet)", stroke: "var(--ink-3)" }), s("path", { d: "M170 120 L250 120 L390 120 L470 120 L520 300 L120 300 Z", fill: "color-mix(in srgb, var(--sheet) 70%, transparent)", stroke: "var(--ink-3)", "stroke-dasharray": "5 4" }));
    svg.append(s("text", { x: 320, y: 30, "text-anchor": "middle", "font-size": 13, class: "t-disp", text: "What you draw: nodes and edges" }));
    [["Shared state", "one record, every field with a merge rule", 170, 160], ["Reducers", "replace, append, add_messages…", 330, 160], ["Super-steps", "run · merge · schedule, in rounds", 170, 230], ["Checkpoints", "a snapshot after every round, per thread", 330, 230]].forEach(([t, d, x, y]) => svg.append(s("rect", { x, y, width: 150, height: 52, rx: 8, fill: "var(--sheet)", stroke: "var(--data)" }), s("text", { x: x + 75, y: y + 21, "text-anchor": "middle", "font-size": 12.5, class: "t-disp", text: t }), s("text", { x: x + 75, y: y + 38, "text-anchor": "middle", "font-size": 9.5, fill: "var(--ink-2)", text: d })));
    svg.append(s("text", { x: 600, y: 140, "text-anchor": "end", "font-size": 11, class: "t-disp", fill: "var(--line2)", text: "THE WATERLINE" }));
    return h("div", { class: "lab", style: "margin-top:12px" }, svg);
  }

  function stats(el, app, first, second) {
    el.innerHTML = "";
    const steps = first.steps.filter((x) => !x.start).concat(second ? second.steps.filter((x) => !x.start) : []);
    const llmCalls = steps.reduce((a, st) => a + st.tasks.filter((t) => ["lead", "weather", "travel", "activities", "writer", "critic"].includes(t.name)).length, 0);
    const maxPar = Math.max(...steps.map((st) => st.tasks.length));
    const cps = app.history("maya-paris").length;
    const rows = [[String(second ? second.steps.filter((x) => !x.start).slice(-1)[0].step : first.steps.slice(-1)[0].step), "rounds (super-steps)" + (second ? "" : " so far")], [String(cps), "checkpoints saved"], [String(llmCalls), "LLM node runs" + (second ? "" : " so far")], [String(maxPar), "nodes in the busiest round"], ["2", "drafts: 970 euros, then 885"], [second ? "1" : "0", "bookings (only after approval)"]];
    rows.forEach(([n, t]) => el.append(h("div", { class: "stat" }, h("b", { class: "num" }, n), h("span", null, t))));
  }

  MM.defineModule({ id: "a00", custom });
})();
