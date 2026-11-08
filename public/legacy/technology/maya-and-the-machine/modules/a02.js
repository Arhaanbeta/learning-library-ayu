/* A2 · Graphs — drawing the flow of work. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const NODES = { get_forecast: { kind: "tool", label: "get forecast" }, draft_plan: { kind: "llm", label: "draft plan" }, check_budget: { kind: "llm", label: "check budget" } };
  const POS = { get_forecast: { x: 180, y: 50 }, draft_plan: { x: 345, y: 50 }, check_budget: { x: 510, y: 50 } };
  const SCHEMA = { forecast: {}, plan: {}, cost: {}, revisions: {}, budget_ok: {} };
  const COSTS = [985, 885, 860];
  const fns = {
    get_forecast: () => ({ forecast: "rain on Saturday (70%)" }),
    draft_plan: (st) => ({ plan: /rain/.test(st.forecast || "") ? "Saturday: Orsay museum, then Tom's cafe" : "Saturday: picnic by the Seine", cost: COSTS[Math.min(st.revisions || 0, 2)], revisions: (st.revisions || 0) + 1 }),
    check_budget: (st) => ({ budget_ok: (st.cost || 0) <= 900 }) };
  function build(G, edges, loop) {
    const g = G.graph(SCHEMA);
    Object.keys(NODES).forEach((n) => g.node(n, fns[n], { kind: NODES[n].kind }));
    edges.forEach(([a, b]) => g.edge(a, b));
    if (loop) g.cond("check_budget", (st) => (st.budget_ok ? "fits" : "over"), { fits: G.END, over: "draft_plan" });
    return g;
  }
  function spec(G, edges, extra) {
    const nodes = {};
    Object.keys(NODES).forEach((n) => (nodes[n] = Object.assign({}, POS[n], NODES[n])));
    edges.forEach(([a, b]) => [a, b].forEach((n) => { if (n !== G.START && n !== G.END && !nodes[n]) nodes[n] = { x: 510, y: 125, kind: "fn", label: n + " ?", ghost: true }; }));
    const ghost = Object.values(nodes).some((n) => n.ghost);
    return Object.assign({ W: 720, H: extra || ghost ? 160 : 100, nodes, start: { x: 50, y: 50 }, end: { x: 665, y: 50 }, labels: { "check_budget>draft_plan": "over budget", "check_budget>__end__": "fits" }, via: { "check_budget>draft_plan": [[510, 128], [345, 128]] } }, extra || {});
  }
  const CHAIN = [["__start__", "get_forecast"], ["get_forecast", "draft_plan"], ["draft_plan", "check_budget"], ["check_budget", "__end__"]];

  MM.defineModule({
    id: "a02",
    mystery: { title: "A flowchart that runs", text: "Draw Maya's planner on a whiteboard and you get boxes and arrows: get the forecast, draft a plan, check the budget. Normally that drawing is thrown away once someone writes the code.\n\nIn LangGraph the drawing **is** the program. The same boxes and arrows run, save themselves after every step, pause, and loop. Why describe an AI system as a graph at all?" },
    where: { text: "From here on, the whole system is a graph above the waterline: nodes that do work, edges that say what comes next. This station draws the simplest one." },
    predict: { q: "A graph has START → get forecast → draft plan, and **no** edge out of “draft plan”. What happens when it runs?", options: ["It refuses to compile", "It runs get forecast and draft plan, then stops: the branch just ends", "It loops forever", "It skips draft plan"], answer: 1, why: "A node with no outgoing edge is a dead end: when it finishes, nothing is scheduled, so the run ends. LangGraph compiles it happily. Only edges to nodes that don't exist, or a graph with no entry point, fail to compile." },
    story: [
      { title: "Work, drawn as boxes and arrows", truth: "TOY",
        text: "A [[graph]] is a set of [[node|nodes]] joined by [[edge|edges]]. In LangGraph, a node is a unit of work and an edge says what runs next. Maya's Stage B planner is three nodes in a row. Unlike a drawing on a whiteboard, this graph is the program itself.",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.draw(build(G, CHAIN), spec(G, CHAIN))); } },
      { title: "What a node can be", truth: "SKETCH",
        text: "A node is any unit of work: an LLM call (brain icon), a tool such as a weather service (wrench), a plain function in code (gear), a step that waits for a person (hand), or even a whole sub-team packed into one box (a subgraph, A7). Not every node is an LLM: most are ordinary code.",
        visual: async (el, api) => { const G = await api.graph(); el.append(h("div", { class: "two" }, Object.entries(G.KIND).map(([kd, v]) => h("div", { class: "row", style: "--gap:8px" }, h("span", { style: `color:${v.col}` }, MM.icon(v.icon)), h("strong", null, v.label), h("span", { class: "muted", style: "font-size:.9rem" }, { llm: "probabilistic; may differ each run", tool: "talks to the outside world", human: "waits for an answer", fn: "repeatable and testable" }[kd]))))); } },
      { title: "Edges, START and END", truth: "TOY",
        text: "An edge is a fixed “what next”: after get forecast, always draft plan. Two special nodes mark the ends: [[start-end|START]] is where the input enters, and END is where a branch finishes. A node with no edge out simply ends its branch.",
        precision: "START writes the input into the state; END is a sink: a branch that reaches it has no more work. A run ends when nothing is scheduled any more ({law:g6}).",
        visual: async (el, api) => { const G = await api.graph(); const e = [["__start__", "get_forecast"], ["get_forecast", "draft_plan"]]; el.append(G.draw(build(G, e), spec(G, e)), h("p", { class: "faint", style: "font-size:.86rem" }, "No edge leaves “draft plan”, so the run stops there: the budget is never checked.")); } },
      { title: "Graphs can loop", truth: "TOY",
        text: "Many workflow tools only allow a [[dag|DAG]] (a directed acyclic graph: arrows that never lead back). Agents need loops: draft, check, and if it is over budget, draft again. LangGraph allows cycles because it decides at run time when to stop, with conditional edges and a recursion limit (A4).",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.draw(build(G, CHAIN.slice(0, 3), true), spec(G, CHAIN.slice(0, 3), { H: 160 }))); } },
      { title: "StateGraph and compile", truth: "REAL",
        text: "You build the graph with a [[stategraph|StateGraph]] (a graph whose nodes all share one state, A3), then [[compile]] it. Compiling checks the structure and attaches services such as the checkpointer. These are LangGraph's real messages when the structure is wrong:",
        precision: "Compile errors are structural: no entry point, an edge to or from an unknown node, a conditional edge with an unknown target, a node added twice. Dead ends and unreachable nodes compile; they are design mistakes, not structural ones.",
        visual: (el) => el.append(h("div", { class: "log" }, ["ValueError: Graph must have an entrypoint: add at least one edge from START to another node", "ValueError: Found edge ending at unknown node `book_hotel`", "ValueError: Found edge starting at unknown node 'zz'", "ValueError: At 'check_budget' node, 'condition' branch found unknown target 'nope'", "ValueError: Node `draft_plan` already present."].map((t) => h("div", { class: "err" }, t))), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Captured from LangGraph 1.2.17 for this course.")) },
      { kind: "spotlight", title: "A metro map that moves", truth: "SKETCH",
        text: "Think of the course map: stations and lines. A graph is the same idea, with one difference: something travels along it and changes as it goes. A graph run is a [[pregel|state machine]] that always knows two things: where am I now, and what can happen next? Try it: step through the writer–critic loop.",
        intuition: "A board game: squares are nodes, arrows are edges, and your counter is the run.", breaks: "In a board game one counter moves at a time. A graph can run several nodes in the same round (A5), and the “counter” is a whole shared state.",
        visual: (el) => { const box = h("div"); el.append(box); MM.toolLabs.t9(box); } },
      { title: "Run Stage B", truth: "REAL", reveal: true,
        text: "Here is Maya's chain, running in this page's engine. Step through it: each round runs one node, and the state collects the forecast, the plan and the budget check. The event list is identical to the same graph run in real LangGraph.",
        visual: async (el, api) => { const G = await api.graph(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["chain"]))); const app = G.graph({ forecast: {}, plan: {}, budget_ok: {} }).node("get_forecast", () => ({ forecast: "rain on Saturday" }), { kind: "tool" }).node("draft_plan", (st) => ({ plan: st.forecast.includes("rain") ? "Louvre on Saturday" : "picnic on Saturday" }), { kind: "llm" }).node("check_budget", () => ({ budget_ok: true }), { kind: "llm" }).edge(G.START, "get_forecast").edge("get_forecast", "draft_plan").edge("draft_plan", "check_budget").edge("check_budget", G.END); const run = app.compile().run({ forecast: "", plan: "", budget_ok: false }); G.player(el, { builder: app, spec: spec(G, CHAIN), run, schema: app.schema }); } },
      { title: "The graph is data", truth: "SKETCH",
        text: "Because the graph is data, not hidden code, it can be drawn, inspected, versioned and tested. Tools can show a live run on top of the drawing. And with the same inputs and the same scripted model replies, a run produces exactly the same steps, which is what makes graphs testable.",
        precision: "A compiled graph is a Pregel program: nodes become “actors”, state fields become “channels”, and edges become subscriptions (which channel updates wake which node). Even edges are stored as small internal channels, named like branch:to:draft_plan.",
        visual: (el) => el.append(h("div", { class: "log" }, "graph TD\n  __start__ --> get_forecast\n  get_forecast --> draft_plan\n  draft_plan --> check_budget\n  check_budget --> __end__"), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "The same graph as Mermaid text (a text format for drawings), which LangGraph can print for any compiled graph.")) },
      { title: "Two ways to write it", truth: "SKETCH",
        text: "The Graph API, used in this course, makes nodes and edges explicit. The Functional API lets you write an ordinary function (an “entrypoint”) that calls “tasks”, with normal if-statements and loops. Underneath, the same engine runs both, with the same saves, pauses and streaming.",
        precision: "In the Functional API, finished tasks' results are saved, so after a resume they are not run again.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Graph API"), h("p", { class: "mono", style: "font-size:.85rem" }, "nodes + edges + conditional edges")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Functional API"), h("p", { class: "mono", style: "font-size:.85rem" }, "an entrypoint function that calls tasks")))) },
      { kind: "snap", title: "LangGraph's place", truth: "SKETCH",
        text: "[[langgraph|LangGraph]] is a low-level orchestration runtime: it runs graphs, keeps their state, saves checkpoints and pauses for people. LangChain's ready-made agents run on top of it. LangSmith Deployment (called LangGraph Platform until October 2025) hosts graphs as a service. Stage B works, but it cannot share facts cleanly between steps or adapt. Next: the shared state.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["LangSmith Deployment", "hosting: threads, runs, queues"], ["LangChain agents", "ready-made agent loops"], ["LangGraph", "the runtime: graphs, state, checkpoints, interrupts"], ["Your code and models", "nodes: LLM calls, tools, functions"]].map(([a, b], i) => h("div", { class: "panel", style: `margin-left:${i * 14}px` }, h("strong", null, a), " · ", h("span", { class: "muted" }, b))))) }],
    lab: {
      title: "The Graph Builder", truth: "TOY",
      intro: "Wire Maya's three nodes together, compile, and run. The checks use LangGraph's own words; the engine follows LangGraph's rules. Start from a preset or build your own.",
      tries: ["Load “Stage B chain”, compile and run it.", "Load “No entry point” and read the error.", "Add an edge from draft plan to “book_hotel” (a node that does not exist).", "Turn on the revise loop and run it: how many drafts does it take?"],
      async mount(el, api) {
        const G = await api.graph();
        let edges = CHAIN.slice(), loop = false;
        const from = h("select", { "aria-label": "From", style: "width:auto;flex:1 1 0;min-width:0" }, [G.START, ...Object.keys(NODES)].map((n) => h("option", { value: n }, n === G.START ? "START" : NODES[n].label)));
        const to = h("select", { "aria-label": "To", style: "width:auto;flex:1 1 0;min-width:0" }, [...Object.keys(NODES), G.END, "book_hotel"].map((n) => h("option", { value: n }, n === G.END ? "END" : NODES[n] ? NODES[n].label : n + " (not a node)")));
        const list = h("div", { class: "stack", style: "--gap:4px" }), drawing = h("div", { class: "bp", style: "padding:6px" }), out = h("div"), runBox = h("div");
        const loopCb = h("input", { type: "checkbox", id: "gb-loop" });
        const label = (n) => (n === G.START ? "START" : n === G.END ? "END" : NODES[n] ? NODES[n].label : n);
        function draw() {
          list.innerHTML = "";
          if (!edges.length) list.append(h("div", { class: "faint" }, "No edges yet."));
          edges.forEach((e, i) => list.append(h("div", { class: "row", style: "--gap:6px" }, h("span", { class: "mono", style: "font-size:.9rem" }, `${label(e[0])} → ${label(e[1])}`), h("button", { class: "iconbtn", "aria-label": "Remove edge", onclick: () => { edges.splice(i, 1); draw(); } }, MM.icon("close")))));
          drawing.innerHTML = "";
          drawing.append(G.draw(build(G, edges, loop), spec(G, edges, loop ? { H: 160 } : null)));
          out.innerHTML = ""; runBox.innerHTML = "";
        }
        function compile() {
          out.innerHTML = ""; runBox.innerHTML = "";
          const g = build(G, edges, loop), p = g.problems();
          if (p.errors.length) { out.append(h("div", { class: "log" }, h("div", { class: "err" }, "ValueError: " + p.errors[0])), h("p", { class: "muted", style: "margin-top:6px;font-size:.92rem" }, "Compile failed: nothing can run until the structure is fixed.")); api.done(); return; }
          out.append(h("div", { class: "callout ok" }, h("strong", null, "Compiled. "), p.warnings.length ? "It compiles, but look at the warnings:" : "No problems found."), p.warnings.length ? h("ul", { style: "margin:6px 0 0;padding-left:20px" }, p.warnings.map((w) => h("li", null, w))) : null);
          const run = g.compile().run({ forecast: "", plan: "", cost: 0, revisions: 0, budget_ok: false });
          G.player(runBox, { builder: g, spec: spec(G, edges, loop ? { H: 160 } : null), run, schema: SCHEMA });
          api.done();
        }
        loopCb.onchange = () => { loop = loopCb.checked; if (loop) edges = edges.filter((e) => !(e[0] === "check_budget")); draw(); };
        const presets = { "Stage B chain": () => { edges = CHAIN.slice(); loop = false; }, "No entry point": () => { edges = CHAIN.slice(1); loop = false; }, "Edge to a missing node": () => { edges = [CHAIN[0], CHAIN[1], ["draft_plan", "book_hotel"]]; loop = false; }, "A dead end": () => { edges = CHAIN.slice(0, 2); loop = false; }, "With the revise loop": () => { edges = CHAIN.slice(0, 3); loop = true; } };
        el.append(h("div", { class: "row", style: "--gap:6px;margin-bottom:10px" }, h("span", { class: "eyebrow" }, "Presets"), Object.keys(presets).map((n) => h("button", { class: "chip", onclick: () => { presets[n](); loopCb.checked = loop; draw(); } }, n))),
          drawing,
          h("div", { class: "two", style: "margin-top:10px" },
            h("div", { class: "stack" }, h("div", { class: "eyebrow" }, "Edges"), list, h("div", { class: "row", style: "--gap:6px;flex-wrap:nowrap" }, from, "→", to), h("div", null, h("button", { class: "btn small", onclick: () => { if (!edges.some((e) => e[0] === from.value && e[1] === to.value)) edges.push([from.value, to.value]); draw(); } }, "Add edge")),
              h("label", { for: "gb-loop", class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, loopCb, "Revise loop: check budget → draft plan if over 900 euros, else END (a conditional edge)")),
            h("div", { class: "stack" }, h("button", { class: "btn primary", onclick: compile }, "Compile and run"), out)),
          runBox);
        draw();
      } },
    breakit: {
      title: "Break the structure", truth: "REAL",
      intro: "Two kinds of mistakes: ones the compiler catches, and ones only a run reveals.",
      cases: [
        { name: "An edge to a node that doesn't exist", what: "draft plan → book_hotel, but no node called book_hotel was added.", action: "Compile", result: "ValueError: Found edge ending at unknown node `book_hotel`. Nothing runs.", why: "Compiling checks that every edge points at a real node. A typo in a node name is caught before any money or tokens are spent." },
        { name: "A dead end", what: "Remove the edge out of draft plan.", action: "Run it", result: "It compiles and runs: forecast, then draft, then the run ends. The budget is never checked, and no error says so.", why: "A dead end is legal: when a node has no edge out, its branch ends. Only you know the budget check was supposed to happen, so test runs, not just compiles." }],
      explain: { q: "A graph compiles without errors. What does that prove?", options: ["That it does what you meant", "Only that its structure is valid: every edge leads somewhere real and there is an entry point", "That it cannot loop forever", "That every node will run"], answer: 1, why: "Compiling checks structure, not intent. Dead ends, unreachable nodes and endless loops all compile." } },
    clinic: [
      { belief: "A graph is just a diagram of the code.", test: "In the Graph Builder, change one edge and run again: the behaviour changes, because the edges are what the engine executes.", truth: "In LangGraph the graph is the program. It runs, saves, pauses and resumes by following its own nodes and edges." },
      { belief: "Every node must be an LLM.", test: "Look at Stage B: get forecast is a tool, check budget could be one line of code.", truth: "Nodes are any unit of work. Good designs use code wherever code can decide, and LLMs only where judgement is needed." },
      { belief: "Workflow graphs can't loop.", test: "Turn on the revise loop: draft plan runs twice, then the budget fits.", truth: "DAG-based tools forbid cycles. LangGraph allows them and stops them at run time with conditions and a recursion limit (A4)." }],
    explain: { prompt: "Why build an AI system as a graph? Explain nodes, edges, START/END and compile.", points: ["Nodes do the work (LLM calls, tools, functions, people)", "Edges say what runs next; START and END mark the ends", "Graphs can loop, which agents need", "Compiling checks the structure, not your intent", "The graph is the program, so it can be drawn, tested and saved step by step"] },
    skeptic: [
      { q: "Isn't this just a flowchart?", laws: ["g4", "g7"], a: "Yes, a flowchart that runs. On top of the drawing, the engine keeps a shared state, runs in rounds ({law:g4}), chooses paths at run time ({law:g7}), saves after every round, and can pause for days. A drawing on a whiteboard does none of that." },
      { q: "Why not just write ordinary code with if-statements?", laws: ["g5"], a: "You can: that is the Functional API, on the same engine. The graph form buys inspection and control: every step is a named unit whose inputs and outputs are saved ({law:g5}), so you can stream progress, pause before one node, replay from any step and test nodes alone." },
      { q: "If graphs can loop, how do you know a run will ever end?", laws: ["g6"], a: "You don't, from the structure alone. A run stops when it reaches END, when nothing is scheduled, when an interrupt pauses it, or when the recursion limit stops it with an error ({law:g6}). Good loops also carry their own counter (A4)." }],
    recall: [
      { q: "In LangGraph, what is a node?", options: ["Only an LLM call", "Any unit of work: an LLM call, a tool, a function, a person, or a sub-team", "A saved checkpoint", "A token"], answer: 1, level: 1, why: "Most nodes are ordinary code." },
      { q: "A node has no outgoing edge. What happens after it runs?", options: ["Compile error", "Its branch ends", "It runs again", "The graph crashes"], answer: 1, level: 3, why: "A dead end compiles; the branch just stops." },
      { q: "Which of these does compiling catch?", options: ["A plan that is over budget", "An edge to a node that does not exist", "An endless loop", "A wrong tool choice"], answer: 1, level: 2, why: "Compile checks structure only." },
      { q: "True or false: LangGraph, like DAG tools, forbids cycles.", options: ["True", "False: cycles are allowed and stopped at run time"], answer: 1, level: 4, why: "Conditional edges plus the recursion limit make loops safe." },
      { q: "From A1: who decides the next step in a workflow?", options: ["The model", "Your code", "The user", "Nobody"], answer: 1, level: 5, why: "In a workflow your code fixes the steps; a graph is how you write them down." }],
    depth: [
      ["A compiled graph is a Pregel program", "Nodes become “actors”; state fields become “channels”; edges become subscriptions: which channel updates wake which node. Even edges are stored as small internal channels."],
      ["START and END", "START writes the input into the channels; END is a sink: a branch that reaches it has no more work."],
      ["What compile does", "It checks the structure (every edge points to a real node, there is an entry point) and attaches the checkpointer, the store, breakpoints and caching."],
      ["The graph is data", "It can be drawn (for example as Mermaid text), inspected, versioned and tested; LangSmith Studio shows a live run on top of the drawing."],
      ["The Functional API", "An “entrypoint” function calls “tasks”. The same engine gives it checkpoints, interrupts and streaming, and finished tasks' results are saved, so they are not re-run after a resume."],
      ["Repeatable by design", "With the same inputs and the same scripted LLM replies, a run produces the same steps: the basis for testing graphs."],
      ["Why loops are allowed", "Workflow tools built on DAGs need every step known in advance. LangGraph decides at run time when to stop (conditional edges plus the recursion limit), so cycles are safe to express."]],
    connect: { links: ["What the nodes read and write, and how updates merge: {mod:a03}.", "Conditional edges and loops in detail: {mod:a04}.", "How a compiled graph actually runs, round by round: {mod:a05}."], line: "Stage B passes facts from step to step. Next: the one shared record every node reads and writes." }
  });
})();
