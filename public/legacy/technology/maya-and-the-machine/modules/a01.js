/* A1 · From Answer to Action — workflows and agents. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;

  /* little pattern diagrams: boxes in a row or a fan, drawn to the visual grammar */
  function mini(kind) {
    const svg = s("svg", { viewBox: "0 0 220 120", class: "figure", style: "max-width:260px", role: "img", "aria-label": kind });
    const box = (x, y, t, llm) => { svg.append(s("rect", { x: x - 30, y: y - 13, width: 60, height: 26, rx: 6, fill: llm ? "color-mix(in srgb, var(--llm) 10%, var(--sheet))" : "var(--sheet)", stroke: llm ? "var(--llm)" : "var(--code)" }), s("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 10, class: "t-disp", text: t })); };
    const ar = (x1, y1, x2, y2, dash) => svg.append(s("line", { x1, y1, x2, y2, stroke: "var(--ink-3)", "stroke-width": 1.4, "stroke-dasharray": dash ? "4 3" : null }));
    if (kind === "chain") { ar(64, 60, 80, 60); ar(140, 60, 156, 60); box(34, 60, "LLM 1", 1); box(110, 60, "check", 0); box(186, 60, "LLM 2", 1); }
    if (kind === "route") { ar(60, 60, 150, 25, 1); ar(60, 60, 150, 60, 1); ar(60, 60, 150, 95, 1); box(34, 60, "router", 1); box(180, 25, "weather", 1); box(180, 60, "plan", 1); box(180, 95, "booking", 1); }
    if (kind === "parallel") { [25, 60, 95].forEach((y) => { ar(48, 60, 80, y); ar(140, y, 172, 60); }); box(24, 60, "split", 0); box(110, 25, "LLM", 1); box(110, 60, "LLM", 1); box(110, 95, "LLM", 1); box(196, 60, "join", 0); }
    if (kind === "orchestrator") { [25, 60, 95].forEach((y) => { ar(64, 60, 120, y, 1); ar(160, y, 160, y); }); box(34, 60, "orchestrator", 1); box(150, 25, "worker", 1); box(150, 60, "worker", 1); box(150, 95, "worker", 1); svg.append(s("text", { x: 196, y: 64, "font-size": 9, fill: "var(--ink-2)", text: "decided at run time" })); }
    if (kind === "evaluator") { ar(64, 50, 146, 50); svg.append(s("path", { d: "M150 72 Q 110 104 66 72", fill: "none", stroke: "var(--ink-3)", "stroke-dasharray": "4 3" })); box(34, 60, "writer", 1); box(180, 60, "critic", 1); svg.append(s("text", { x: 110, y: 112, "text-anchor": "middle", "font-size": 9, fill: "var(--ink-2)", text: "not good enough: try again" })); }
    if (kind === "agent") { svg.append(s("circle", { cx: 110, cy: 60, r: 38, fill: "none", stroke: "var(--ink-3)", "stroke-dasharray": "4 3" })); box(110, 22, "decide", 1); box(70, 85, "observe", 0); box(150, 85, "act (tool)", 0); }
    return svg;
  }

  /* the four rungs, with prompts rendered in the harmony chat format and counted with the real o200k tokeniser */
  function rungs(T) {
    const A = MM.agent, H = A.H;
    const ask = "Plan three rain-friendly days in Paris within my budget.";
    const call = (dev, user, out) => ({ read: A.count(T, H.system + dev + H.user(user) + H.cue), wrote: A.count(T, out) });
    const toolsFor = (names) => H.developer(names.map((n) => A.byName[n]));
    const sysDev = (x) => `<|start|>developer<|message|># Instructions\n\n${x}<|end|>`;
    const oneCall = [call(sysDev("Write a short trip plan."), ask, H.final("Day 1: Eiffel Tower and a Seine cruise (about 60 euros). Day 2: Louvre (17 euros) and dinner in Montmartre. Day 3: Versailles day trip (about 30 euros). Total about 450 euros."))];
    const forecast = JSON.stringify(A.run("get_forecast", { city: "Paris", day: "Saturday" }));
    const chain = [call(sysDev("Write a three-day plan. Use the forecast. Prefer indoor places when rain is likely."), ask + "\nForecast: " + forecast, H.final("Saturday: Orsay museum then Tom's bookshop cafe. Sunday: Sainte-Chapelle and a walk if dry. Monday: Louvre, Carrousel entrance.")),
      call(sysDev("Check the plan against the budget of 900 euros. Reply OK or OVER with the total."), "Plan: Saturday Orsay (16), Sunday Sainte-Chapelle (13), Monday Louvre (22). Already spent: 660.", H.final("OK: 711 euros of 900."))];
    const ev = A.trace("trip3", {}), acc = A.accounting(T, "trip3", ev);
    const agent = acc.map((r) => ({ read: r.read, wrote: r.wrote }));
    const solo = sysDev("You are one member of a trip-planning team. Do only your part.");
    /* a specialist is a small agent of its own: it sees only its own tools, calls them one at a time, then reports */
    const specialist = (tools, task, steps, report) => {
      const dev = toolsFor(tools), out = [];
      let ctx = H.system + dev + H.user(task);
      steps.forEach(([think, name, args]) => {
        const wrote = H.think(think) + H.call(name, args);
        out.push({ read: A.count(T, ctx + H.cue), wrote: A.count(T, wrote) });
        ctx += H.cue + wrote + H.result(name, A.run(name, args));
      });
      out.push({ read: A.count(T, ctx + H.cue), wrote: A.count(T, H.think("Report back to the lead.") + H.final(report)) });
      return out;
    };
    const research = ["Weather: Saturday 70% rain from late morning, 12 °C; Sunday dry and cloudy, 14 °C; Monday light rain in the evening, 11 °C.", "Travel: Hotel Lumiere 570 euros for 3 nights and trains 90 euros: 660 spent, 240 left.", "Activities: Orsay museum (Saturday 9:30 am to 6 pm, 16 euros), Louvre (22 euros), Sainte-Chapelle; Tom's bookshop cafe until 7 pm."];
    const weatherTeam = specialist(["get_forecast"], "Get the forecast for Saturday, Sunday and Monday in Paris.", ["Saturday", "Sunday", "Monday"].map((d) => [`Get ${d}'s forecast.`, "get_forecast", { city: "Paris", day: d }]), research[0]);
    const travelTeam = specialist(["trip_costs"], "What do the hotel and trains already cost, and what is left of 900 euros?", [["Get the trip costs.", "trip_costs", {}]], research[1]);
    const actsTeam = specialist(["find_places", "opening_hours"], "Find rainy-day places in Paris and check the Orsay museum's Saturday hours.", [["Find indoor places.", "find_places", { kind: "any", indoor_only: true }], ["Check the Orsay museum on Saturday.", "opening_hours", { place: "Orsay museum", day: "Saturday" }]], research[2]);
    const d1 = "Draft 1: Saturday Orsay museum and Tom's cafe; Sunday Sainte-Chapelle and a river dinner cruise; Monday Louvre. Total 970 euros (hotel and trains 660, tickets 51, cruise 99, meals 160).";
    const d2 = "Draft 2: the same days, with a crepe dinner on Rue du Bac (14 euros) instead of the cruise. Total 885 euros.";
    const team = [call(solo, "Lead: split this request between the weather, travel and activities specialists: " + ask, H.final("weather: forecast Saturday to Monday; travel: costs so far; activities: indoor places and hours."))]
      .concat(weatherTeam, travelTeam, actsTeam,
        [call(solo, "Writer: draft a three-day plan within 900 euros from this research:\n" + research.join("\n"), H.final(d1)),
          call(solo, "Critic: check this draft against the 900-euro budget.\n" + d1, H.final("OVER by 70 euros: drop the river dinner cruise (99 euros).")),
          call(solo, "Writer: revise your draft using the critic's note.\n" + d1 + "\nCritic: OVER by 70 euros: drop the river dinner cruise (99 euros).", H.final(d2)),
          call(solo, "Critic: check this draft against the 900-euro budget.\n" + d2, H.final("OK: 885 of 900 euros."))]);
    /* time: the three specialists run side by side, so each sub-step costs as much as its slowest member */
    const lanes = [weatherTeam.length, travelTeam.length, actsTeam.length].map((n) => Array.from({ length: 2 * n - 1 }, (_, i) => (i % 2 ? "tool" : "llm")));
    const parallel = Array.from({ length: Math.max(...lanes.map((l) => l.length)) }, (_, i) => lanes.map((l) => l[i]).filter(Boolean));
    const sum = (arr) => arr.reduce((a, r) => ({ read: a.read + r.read, wrote: a.wrote + r.wrote }), { read: 0, wrote: 0 });
    return [
      { id: "one", name: "One LLM call", calls: oneCall, tools: 0, seq: [["llm"]], paths: "1", facts: "none: prices are invented", note: "Fast and cheap, but nothing is looked up or checked." },
      { id: "chain", name: "Workflow: a fixed chain", calls: chain, tools: 1, seq: [["tool"], ["llm"], ["llm"]], paths: "1", facts: "real forecast", note: "Your code fixes the steps. Predictable and testable; it cannot adapt." },
      { id: "agent", name: "Agent: the model picks the steps", calls: agent, tools: ev.filter((e) => e.by === "program" && e.name).length, seq: ev.filter((e) => e.by === "model" || (e.by === "program" && e.name)).map((e) => [e.by === "model" ? "llm" : "tool"]), paths: "any order the model chooses", facts: "real forecast, places, hours and costs", note: "Flexible; slower; the path can change from run to run." },
      { id: "team", name: "Team: lead, specialists, writer, critic", calls: team, tools: 6, seq: [["llm"]].concat(parallel, [["llm"], ["llm"], ["llm"], ["llm"]]), paths: "6 (1–3 drafts, approve or reject)", facts: "everything, checked by a critic", note: "Most thorough and most expensive; parallel research saves time." }].map((r) => Object.assign(r, sum(r.calls)));
  }

  MM.defineModule({
    id: "a01",
    mystery: { title: "Four ways to answer one request", text: "Maya's request, “Plan three rain-friendly days in Paris within my budget”, can be answered by one LLM call, by a fixed chain of steps, by an agent that decides its own steps, or by a whole team.\n\nThe team sounds best. But it makes more than a dozen LLM calls where one would do, and every extra call can go wrong. When does an LLM app need to be an agent at all?" },
    where: { text: "This station zooms into the step that every agent repeats: one model call, then code acting on what it wrote. The question is who decides the next step: your code, or the model." },
    predict: { q: "An app makes 10 LLM calls in a row. Each call is right 95% of the time, independently. How often is the whole run right?", options: ["About 95%", "About 90%", "About 60%", "About 5%"], answer: 2, why: "0.95¹⁰ ≈ 0.60. Chances multiply, so ten good steps make a mediocre chain. This is {law:g9}, the Law of Compounding." },
    story: [
      { title: "Rung 1: one call", truth: "SKETCH",
        text: "The simplest app sends Maya's request to a model once and shows the answer. It is fast and cheap. But the model only has its weights ({law:l3}): it has no forecast, no hotel prices, no opening hours. So it writes a fluent, generic plan with invented numbers ({law:l10}).",
        visual: (el) => el.append(h("div", { class: "bubble" }, "Day 1: Eiffel Tower and a Seine cruise (about 60 euros). Day 2: Louvre (17 euros) and dinner in Montmartre. Day 3: Versailles day trip. Total about 450 euros."), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Plausible, confident, unchecked: the cruise ignores the rain, and the prices are guesses.")) },
      { title: "Rung 2: a workflow", truth: "SKETCH",
        text: "A [[workflow]] is an LLM app whose steps follow code paths **you** fixed in advance. Here: get the forecast (a tool), draft a plan with the forecast in the prompt (an LLM call), check the budget (another LLM call). Always in that order. It now uses real data, and it is easy to test.",
        visual: (el) => el.append(mini("chain"), h("p", { class: "faint", style: "font-size:.86rem" }, "Pink = an LLM call (probabilistic). Grey = ordinary code.")) },
      { title: "Five workflow patterns", truth: "SKETCH",
        text: "Most useful LLM apps are built from five workflow shapes: a chain (one step after another), a router (pick a path), parallel calls (split, run at once, join), an orchestrator with workers (one call decides the sub-tasks at run time), and an evaluator–optimiser loop (a critic sends work back until it is good enough).",
        precision: "These five patterns are the vocabulary of Anthropic's guide “Building effective agents” (December 2024), which also defines workflow versus agent the way this station does.",
        visual: (el) => el.append(h("div", { class: "two" }, [["chain", "Prompt chaining"], ["route", "Routing"], ["parallel", "Parallelisation"], ["orchestrator", "Orchestrator–workers"], ["evaluator", "Evaluator–optimiser"]].map(([kd, t]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, t), mini(kd))))) },
      { title: "Rung 3: an agent", truth: "TOY",
        text: "In an [[agent]], the model directs its own steps: it reads the results so far and decides the next tool call, or decides it is done ({law:g1}). This is M13's loop. It can handle requests nobody planned for. But the path is chosen at run time, so it can wander, and every round costs another call.",
        visual: async (el) => { el.append(mini("agent")); await MM.load("core/agent.js"); try { const ev = MM.agent.trace("plan", {}); el.append(h("div", { class: "stack", style: "--gap:4px;margin-top:6px" }, ev.filter((e) => e.by === "model").map((e) => h("div", { class: "mono", style: "font-size:.82rem" }, `round ${e.round}: ${e.call ? "call " + e.call[0] : "final answer"}`)))); } catch (e) {} } },
      { title: "The ladder of autonomy", truth: "SKETCH",
        text: "So there is a ladder: one call, workflows, agents, teams. Each rung up buys flexibility and pays for it in cost, delay and unpredictability. The rule of thumb from {law:g9}: climb only as high as the task needs. Many real products stop at rung 2.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["4", "Team", "agents that coordinate"], ["3", "Agent", "the model picks the steps"], ["2", "Workflow", "your code picks the steps"], ["1", "One call", "no steps at all"]].map(([n, t, d]) => h("div", { class: "row", style: `--gap:10px;padding-left:${(4 - n) * 18}px` }, h("span", { class: "roundel l2", style: "width:28px;height:28px;font-size:.9rem" }, n), h("strong", null, t), h("span", { class: "muted" }, d))))) },
      { title: "Reliability multiplies", truth: "SKETCH", reveal: true,
        text: "If each step is right 95% of the time, independently, ten steps in a row are all right only about 60% of the time: 0.95 × 0.95 × … ten times. This is [[error-compounding|error compounding]]. A one-call app with 95% accuracy can beat a ten-step agent built from the same model.",
        precision: "P(all n steps right) = pⁿ for independent steps. 0.99²⁰ ≈ 0.82; 0.95¹⁰ ≈ 0.60; 0.9¹⁰ ≈ 0.35. {tool:t10}",
        visual: (el) => { const ser = [0.99, 0.95, 0.9].map((p, i) => ({ pts: Array.from({ length: 21 }, (_, n) => [n, Math.pow(p, n)]), color: ["var(--real)", "var(--line2)", "var(--bad)"][i], label: `${Math.round(p * 100)}% per step` })); el.append(k.chart(ser, { W: 460, H: 200, ymin: 0, ymax: 1, xlabel: "steps in a row", ylabel: "whole run right", yfmt: (v) => Math.round(v * 100) + "%" })); } },
      { title: "Cost adds, time follows the longest chain", truth: "SKETCH",
        text: "Three rules of agent maths. Reliability multiplies. Cost adds: every call is paid for, so eight calls cost about eight times one. Time follows the longest chain: three research calls run in parallel take as long as the slowest one, not three times as long.",
        precision: "Wall-clock time = the sum, over rounds, of the slowest task in each round. Parallel branches cost tokens but not time.",
        visual: (el) => el.append(MM.bars([{ label: "3 calls in a row", p: 1 }, { label: "3 calls in parallel", p: 1 / 3 }], { scale: 1, plain: true, total: false, fmt: (it) => (it.p === 1 ? "6 s" : "2 s") + " · 3 calls paid" })) },
      { kind: "spotlight", title: "pass@k and pass^k", truth: "REAL",
        text: "Two very different questions. [[pass-at-k|pass@k]]: if the agent tries k times, does **at least one** try work? Fine for coding, where tests pick the winner. [[pass-hat-k|pass^k]]: do **all** k tries work? That is what a customer-facing agent needs. τ-bench (2024) found a GPT-4o agent's retail score fell to about 25% at pass^8, roughly 60% below its single-try score.",
        precision: "If one try succeeds with chance q: pass@k = 1 − (1 − q)ᵏ and pass^k = qᵏ. With q = 0.6: pass@3 ≈ 0.94 but pass^3 ≈ 0.22.",
        visual: (el) => { const q = 0.6; el.append(k.chart([{ pts: Array.from({ length: 8 }, (_, i) => [i + 1, 1 - Math.pow(1 - q, i + 1)]), color: "var(--real)", label: "pass@k" }, { pts: Array.from({ length: 8 }, (_, i) => [i + 1, Math.pow(q, i + 1)]), color: "var(--bad)", label: "pass^k" }], { W: 460, H: 190, ymin: 0, ymax: 1, xlabel: "tries k (one try right 60% of the time)", yfmt: (v) => Math.round(v * 100) + "%" })); } },
      { title: "When agents shine", truth: "SKETCH",
        text: "Agents earn their cost on open-ended tasks whose steps cannot be predicted, where the environment gives feedback (a tool result, a failing test) the model can react to. Workflows win when the steps are known and reliability matters. Choose from the task: known steps → chain; distinct kinds of input → router; independent parts → parallel; unpredictable parts → orchestrator; clear quality criteria → evaluator loop.",
        visual: (el) => el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "If the task has…"), h("th", null, "use"))), h("tbody", null, [["known, fixed steps", "a chain"], ["distinct kinds of input", "a router"], ["independent subtasks", "parallel calls"], ["subtasks you can't predict", "orchestrator–workers"], ["clear quality criteria", "an evaluator loop"], ["open-ended work with feedback", "an agent"]].map(([a, b]) => h("tr", null, h("td", null, a), h("td", null, h("strong", null, b))))))) },
      { title: "The agent as a policy", truth: "SKETCH",
        text: "Researchers describe an agent with the words of reinforcement learning. The **state** is what is in the context window; the **actions** are tool calls or messages; the **observations** are the results. The LLM is the **policy** that picks the next action. Same loop as M13, now with a precise vocabulary.",
        frontier: "Ways to plan inside the loop: ReAct decides one step at a time; plan-and-execute writes a plan, follows it and replans on failure; reflection critiques its own output; tree search explores several options and keeps the best.",
        visual: (el) => el.append(h("div", { class: "row", style: "--gap:8px" }, ["state = context", "→ policy = LLM →", "action = tool call", "→ observation →", "new state"].map((t, i) => h("span", { class: i % 2 ? "faint" : "tok" }, t)))) },
      { kind: "snap", title: "Old roots", truth: "SKETCH",
        text: "None of this is brand new. Multi-agent systems are a decades-old research field. In 1980 the Contract Net Protocol already had a manager announce a task, agents bid for it, and the manager award it: the ancestor of today's lead agent. What is new is that the agents are LLMs, which can read and write ordinary language.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["1980", "Contract Net Protocol: announce, bid, award"], ["1990s", "Blackboard systems: specialists write to a shared workspace"], ["2022", "ReAct: reason, act, observe"], ["2024–26", "LLM teams: lead agents, subagents, handoffs"]].map(([y, t]) => h("div", { class: "row" }, h("span", { class: "pill" }, y), h("span", null, t))))) }],
    lab: {
      title: "The Autonomy Ladder", truth: "REAL",
      intro: "The same request at each rung. Token counts are REAL: each rung's exact prompts (each team member sees only its own tools), written in the chat format of the open-weight gpt-oss models, counted with the real o200k tokeniser (the agent rung runs M13's agent engine on this request). Each specialist is a small agent of its own, so the team makes more calls than A0's drawing suggests: one node can hide a whole loop. Prices, seconds and per-call accuracy are SKETCH assumptions you can change.",
      tries: ["Which rung reads the most tokens? Why does the single agent read more per call than any team member?", "Set the per-call accuracy to 99%. Which rung is still least reliable?", "Set seconds per call to 10. How much time does parallel research save the team?", "Pick the rung you would ship for Maya, and say why."],
      async mount(el, api) {
        el.append(h("div", { class: "faint" }, "Loading the real o200k tokeniser…"));
        await MM.load("core/agent.js");
        const T = await MM.agent.tokenizer();
        el.innerHTML = "";
        const R = rungs(T);
        let p = 0.95, secs = 2, price = 2.5;
        const table = h("div", { class: "scroll-x" }), note = h("div");
        function draw() {
          table.innerHTML = "";
          const rows = R.map((r) => {
            const llm = r.calls.length, time = r.seq.reduce((a, round) => a + Math.max(...round.map((x) => (x === "llm" ? secs : 0.4))), 0);
            return { r, llm, time, ok: Math.pow(p, llm), cost: (r.read + r.wrote) * price / 1e6 };
          });
          const mx = (f) => Math.max(...rows.map(f));
          table.append(h("table", { class: "tbl", style: "min-width:640px" }, h("thead", null, h("tr", null, h("th", null, "Rung"), h("th", { class: "n" }, "LLM calls"), h("th", { class: "n" }, "tool calls"), h("th", { class: "n" }, "tokens read"), h("th", { class: "n" }, "tokens written"), h("th", { class: "n" }, "time"), h("th", { class: "n" }, "all calls right"), h("th", null, "paths"), h("th", null, "facts checked"))),
            h("tbody", null, rows.map((x) => h("tr", null, h("td", null, h("strong", null, x.r.name), h("div", { class: "faint", style: "font-size:.82rem" }, x.r.note)), h("td", { class: "n" }, String(x.llm)), h("td", { class: "n" }, String(x.r.tools)), h("td", { class: "n" }, x.r.read.toLocaleString("en-GB")), h("td", { class: "n" }, x.r.wrote.toLocaleString("en-GB")), h("td", { class: "n" }, x.time.toFixed(1) + " s"), h("td", { class: "n" }, Math.round(x.ok * 100) + "%"), h("td", null, x.r.paths), h("td", null, x.r.facts))))));
          note.innerHTML = "";
          const perCall = (x) => Math.round(x.r.read / x.llm), serial = rows[3].r.seq.flat().reduce((a, x) => a + (x === "llm" ? secs : 0.4), 0);
          note.append(h("p", { class: "muted", style: "font-size:.9rem;margin-top:8px" }, `At ${price.toFixed(2)} dollars per million tokens (a SKETCH price), the agent costs ${(rows[2].cost / rows[0].cost).toFixed(0)}× the single call and the team ${(rows[3].cost / rows[0].cost).toFixed(0)}×. The team takes ${rows[3].time.toFixed(0)} s instead of ${serial.toFixed(0)} s because its three specialists work side by side. Yet each team call reads only ${perCall(rows[3]).toLocaleString("en-GB")} tokens on average, against ${perCall(rows[2]).toLocaleString("en-GB")} for the single agent, which re-reads its whole growing history and every tool description on every call: focused context is what a team buys (A7). This clean split is a team's best case. In real systems members overlap and explore on their own: Anthropic measured its research team using about 15× the tokens of a chat, against about 4× for a single agent.`));
          api.done();
        }
        el.append(h("div", { class: "two" }, MM.slider({ label: "per-call accuracy", min: 0.8, max: 0.999, step: 0.001, value: p, fmt: (v) => (v * 100).toFixed(1) + "%", onInput: (v) => { p = v; draw(); } }), MM.slider({ label: "seconds per call", min: 0.5, max: 10, step: 0.5, value: secs, fmt: (v) => v + " s", onInput: (v) => { secs = v; draw(); } })), table, note,
          h("hr", { class: "rule" }), h("h3", null, "The Compounding Calculator"), h("div", { id: "calc" }));
        MM.toolLabs.t10(el.querySelector("#calc"));
        draw();
      } },
    breakit: {
      title: "Over-climb the ladder", truth: "SKETCH",
      intro: "Autonomy is not free. Give a simple, fixed task to a fully autonomous agent and compare it with a two-step chain.",
      cases: [
        { name: "An agent for a fixed task", what: "Task: “Get Saturday's forecast and say whether to pack an umbrella.” The chain: one tool call, one LLM call. The free agent: it may first search places, check hours, re-read the forecast, then answer.", action: "Compare", result: "The chain: 1 LLM call, about 2 seconds, one path, easy to test. The agent: 3 to 5 LLM calls, 6 to 10 seconds, a different path on some runs, and at 95% per call it is fully right only 77–86% of the time against the chain's 95%.", why: "Every extra decision the model makes is another chance to go wrong ({law:g9}). When the steps are known, let code decide them." },
        { name: "A team for a one-line question", what: "Send “Is the Orsay museum open on Monday?” through the full planner team.", action: "Send it", result: "Eight LLM calls, a revise loop and an approval pause for a question one tool call answers: closed on Mondays.", why: "Teams pay off when the work is broad and splits into independent parts. A router in front can send simple questions down a cheap path (A4)." }],
      explain: { q: "Each LLM call in a 6-call agent is right 97% of the time. Roughly how often is the whole run right?", options: ["97%", "about 83%", "about 50%", "about 18%"], answer: 1, why: "0.97⁶ ≈ 0.83: reliability multiplies." } },
    clinic: [
      { belief: "Agents are always better than workflows.", test: "Run the fixed umbrella question through both: the chain is faster, cheaper, more predictable and more often right.", truth: "Agents win on open-ended tasks with unpredictable steps. For known steps, a workflow is better on every measure." },
      { belief: "More agents means more intelligence.", test: "Count the calls in the Autonomy Ladder: the team makes 14 LLM calls where a chain makes 2. At 95% per call, that alone drops the chance that every call is right from 90% to 49%.", truth: "Each agent is the same kind of model with its own context. More agents add cost, delay and coordination errors; they help only when the work truly splits." },
      { belief: "An agent is a new kind of AI.", test: "Look inside the agent rung: the same LLM, called in a loop, with tool results added to its context each round.", truth: "An agent is an LLM in a loop ({law:g1}): ordinary next-token prediction, wrapped in ordinary code." }],
    explain: { prompt: "When should an LLM app be an agent, and when should it be a workflow? Use the three rules of agent maths.", points: ["A workflow follows steps fixed in code; an agent's LLM chooses its own steps", "Reliability multiplies across steps (error compounding)", "Cost adds; time follows the longest chain", "Use an agent only for open-ended tasks with unpredictable steps", "Measure consistency (pass^k), not one lucky run"] },
    skeptic: [
      { q: "Why not just give one powerful agent every tool?", laws: ["g8", "g9"], a: "Tool descriptions fill its context, and choosing among many tools gets harder: selection accuracy falls as the list grows (M13). Its single context also fills with every tool result. Sometimes one agent really is best, when the work is tightly linked; but for broad work, splitting it gives each part a focused context ({law:g8}), at a cost ({law:g9})." },
      { q: "My agent passed my test once. Is it reliable?", laws: ["g9"], a: "One pass says little. Run it many times and measure pass^k: the chance that all k runs succeed. A 60% agent passes once in a while but passes three times in a row only about 22% of the time. τ-bench showed a strong agent falling to about 25% at pass^8.", ladder: ["Why does one run say so little? Sampling makes every run different (Law 11).", "Why pass^k and not pass@k? A customer meets every run, not just the best one.", "So how do teams make agents reliable? Fewer free decisions, more checks in code, and evaluation over many runs (A10)."] },
      { q: "If each step is 99% reliable, a 20-step agent is fine, right?", laws: ["g9"], a: "0.99²⁰ ≈ 0.82: about one run in five has at least one wrong step. And real errors often cluster, so measure the whole run directly. Twenty steps of anything is a lot of chances to slip." }],
    recall: [
      { q: "What is the difference between a workflow and an agent?", options: ["Workflows use smaller models", "In a workflow your code fixes the steps; in an agent the LLM chooses its own steps", "Agents never use tools", "There is no difference"], answer: 1, level: 1, why: "Who decides the next step: your code, or the model." },
      { q: "Three research calls take 2 seconds each. How long do they take in parallel?", options: ["6 seconds", "about 2 seconds", "0.67 seconds", "4 seconds"], answer: 1, level: 3, why: "Time follows the longest chain; cost still pays for all three." },
      { q: "An agent succeeds on 60% of single tries. What is pass^3?", options: ["about 94%", "60%", "about 22%", "about 6%"], answer: 2, level: 3, why: "0.6³ ≈ 0.22: all three tries must succeed." },
      { q: "True or false: climbing the ladder (one call → workflow → agent → team) always makes an app better.", options: ["True", "False: each rung adds cost, delay and chances to fail; climb only as high as the task needs"], answer: 1, level: 4, why: "Law of Compounding." },
      { q: "From M13: what does the model actually do when it “uses a tool”?", options: ["Runs the tool itself", "Writes a structured request; a program runs the tool and adds the result to the context", "Searches the web", "Calls another model"], answer: 1, level: 5, why: "Every rung above one call is built from this round trip." }],
    depth: [
      ["Three rules of agent maths", "Reliability multiplies: ten steps at 95% give about 60% end to end. Cost adds: every call is paid for. Time follows the longest chain: five parallel branches cost five times the tokens but take only as long as the slowest."],
      ["pass@k vs pass^k", "pass@k: at least one of k tries succeeds, fine when tests pick the winner, as in coding. pass^k: all k succeed, what a customer-facing agent needs. τ-bench (2024): a GPT-4o agent's retail score fell to about 25% at pass^8, roughly 60% below its single-try score."],
      ["The agent as a policy", "State (what is in the context), actions (tool calls or messages), observations (results). The LLM is the policy that picks the next action: the reinforcement-learning view of agents."],
      ["Ways to plan", "ReAct decides one step at a time. Plan-and-execute writes a plan, follows it, replans on failure. Reflection critiques its own output. Tree search explores several options and keeps the best."],
      ["Choosing a pattern from the task", "Known fixed steps → chain. Distinct kinds of input → router. Independent subtasks → parallel. Unpredictable subtasks → orchestrator–workers. Clear quality criteria → evaluator–optimiser. Open-ended work with feedback → agent."],
      ["Old roots", "Multi-agent systems are a decades-old field. The Contract Net Protocol (1980) had a manager announce a task, agents bid and the manager award it: the ancestor of today's lead agent."]],
    connect: { links: ["Workflows and agents are both drawn as graphs: {mod:a02}.", "The evaluator–optimiser loop, and what stops it, is {mod:a04}.", "Parallel calls run in rounds: {mod:a05}.", "Measuring pass^k in practice: {mod:a10}."], line: "Every rung above one call is a flow of work. Next: drawing that flow as a graph that actually runs." }
  });
})();
