/* A6 · The Agent Node — the ReAct loop as a two-node graph: model, tools, and one conditional edge. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const f = () => ({});
  const agentSpec = { W: 600, H: 160, nodes: { llm: { x: 205, y: 62, kind: "llm" }, tools: { x: 455, y: 62, kind: "tool" } }, start: { x: 55, y: 62 }, end: { x: 205, y: 138 }, labels: { "llm>tools": "tool calls", "llm>__end__": "no tool calls" } };
  const agentGraph = (G, llm, tools) => G.graph({ messages: { reducer: "add_messages" } }).node("llm", llm || f, { kind: "llm" }).node("tools", tools || f, { kind: "tool" }).edge(G.START, "llm").cond("llm", G.prebuilt.toolsCondition, ["tools", G.END]).edge("tools", "llm");
  /* the graphs LangChain 1.4.7's create_agent really builds (inspected with get_graph()) */
  const CA = {
    plain: { label: "create_agent", nodes: { model: { x: 205, y: 62, kind: "llm" }, tools: { x: 455, y: 62, kind: "tool" } }, edges: [["__start__", "model", 0], ["model", "__end__", 1], ["model", "tools", 1], ["tools", "model", 1]], W: 600, H: 160, start: { x: 55, y: 62 }, end: { x: 205, y: 138 } },
    summ: { label: "+ SummarizationMiddleware", nodes: { "SummarizationMiddleware.before_model": { x: 190, y: 75, kind: "fn", label: "summarise", w: 112 }, model: { x: 350, y: 75, kind: "llm" }, tools: { x: 520, y: 75, kind: "tool" } }, edges: [["SummarizationMiddleware.before_model", "model", 0], ["__start__", "SummarizationMiddleware.before_model", 0], ["model", "__end__", 1], ["model", "tools", 1], ["tools", "SummarizationMiddleware.before_model", 1]], W: 620, H: 165, start: { x: 50, y: 75 }, end: { x: 350, y: 145 }, via: { "tools>SummarizationMiddleware.before_model": [[520, 18], [190, 18]] } },
    hitl: { label: "+ HumanInTheLoopMiddleware", nodes: { model: { x: 185, y: 75, kind: "llm" }, "HumanInTheLoopMiddleware.after_model": { x: 365, y: 75, kind: "human", label: "approval", w: 112 }, tools: { x: 535, y: 75, kind: "tool" } }, edges: [["HumanInTheLoopMiddleware.after_model", "__end__", 1], ["HumanInTheLoopMiddleware.after_model", "model", 1], ["HumanInTheLoopMiddleware.after_model", "tools", 1], ["__start__", "model", 0], ["model", "HumanInTheLoopMiddleware.after_model", 0], ["tools", "model", 1]], W: 620, H: 170, start: { x: 50, y: 75 }, end: { x: 365, y: 150 }, via: { "tools>model": [[535, 18], [185, 18]] } } };
  function caGraph(G, d) {
    const g = G.graph({ messages: { reducer: "add_messages" } });
    Object.entries(d.nodes).forEach(([n, o]) => g.node(n, f, { kind: o.kind }));
    const conds = {};
    d.edges.forEach(([a, b, c]) => { if (c) (conds[a] = conds[a] || []).push(b); else g.edge(a, b); });
    Object.entries(conds).forEach(([a, ts]) => g.cond(a, f, ts));
    return g;
  }
  const chat = (msgs) => h("div", { class: "stack", style: "--gap:5px" }, msgs.map((m) => h("div", { class: "bubble", style: `font-size:.84rem;padding:7px 10px;${m.type === "human" ? "background:var(--line2-soft)" : m.type === "tool" ? "background:var(--sheet-2)" : ""}` },
    h("strong", null, m.type === "human" ? "Maya: " : m.type === "tool" ? `tool result (${m.tool_call_id}): ` : m.tool_calls && m.tool_calls.length ? "AI asks for a tool: " : "AI: "),
    m.tool_calls && m.tool_calls.length ? h("span", { class: "mono" }, m.tool_calls.map((c) => `${c.name}(${JSON.stringify(c.args)}) · id ${c.id}`).join(", ")) : h("span", { style: (m.status === "error" ? "color:var(--bad);" : "") + (m.type === "tool" ? "white-space:pre-wrap" : "") }, m.content))));

  MM.defineModule({
    id: "a06",
    mystery: { title: "Closed on Monday?", text: "Maya asks her assistant: “Is the Orsay museum open on Monday?” The model calls the opening-hours tool, but writes the day as “Mon”, and the tool raises an error.\n\nDoes the agent crash, give up, or notice its mistake and try again? With LangGraph's ready-made tool node, the answer depends on one setting. Why would anyone want a crash?" },
    where: { text: "Zoom into one box of the team: a specialist that is itself an agent. Inside it is M13's loop, now drawn as a graph." },
    predict: { q: "With ToolNode's default settings, the model calls opening_hours with day = “Mon”, and the tool itself raises a ValueError. What happens?", options: ["The error goes back to the model as a message, so it can try again", "The run stops with the ValueError", "The tool quietly returns nothing", "LangGraph retries the tool three times"], answer: 1, why: "Since langgraph-prebuilt 1.1, ToolNode by default sends back only invalid-argument errors (such as a missing field). An exception raised inside the tool ends the run, unless you set handle_tool_errors = True. Both behaviours are real recorded runs below." },
    story: [
      { title: "M13's loop, drawn as a graph", truth: "REAL",
        text: "An agent is two nodes and one conditional edge. The **llm** node calls the model with the conversation so far; its reply may contain tool calls. The **tools** node, a [[tool-node|tool node]] (a node that runs every requested tool and adds each result as a message), runs them. If the model's last reply asked for tools, go to tools; otherwise, END. After the tools, always back to the model. That is {law:g1}, as a graph. Step through a real run.",
        visual: async (el, api) => { const G = await api.graph(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["react"]))); const g = agentGraph(G); G.player(el, { builder: g, spec: agentSpec, run: G.scenarios.react(), schema: g.schema, builderNoSaver: true, boardOpts: { max: 60 } }); } },
      { title: "The state is the conversation", truth: "REAL",
        text: "The agent's whole state is one field, messages, with the add_messages reducer (A3). Each lap appends: the model's tool request, the tool's answer, the next request, and finally the answer for Maya. Every tool call has an id, and its result carries the same id. Model providers insist on that pairing: before the next model call, every tool call must have its answer, so code that trims history must keep calls and results together.",
        visual: async (el, api) => { const G = await api.graph(); el.append(chat(G.scenarios.react().state.messages)); } },
      { title: "The exit: no tool calls", truth: "SKETCH",
        text: "The conditional edge, tools_condition, asks one question: does the last AI message contain tool calls? So the agent stops when the model writes an answer without asking for a tool. The model decides when the work is done ({law:g1}). If it never decides, the recursion limit stops the run with an error ({law:g6}).",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.draw(agentGraph(G), agentSpec), h("p", { class: "faint", style: "font-size:.86rem" }, "One lap = two rounds (llm, then tools). A recursion limit of 25 allows 12 tool laps and a final answer.")); } },
      { kind: "spotlight", title: "Every lap re-reads everything", truth: "REAL",
        text: "The model is stateless (M9): on every lap it reads the whole conversation again, with the system prompt and every tool description. So each call reads more than the last. Below: the real token count of each model call when one agent plans Maya's three days (seven calls, exact prompts, real o200k tokeniser).",
        intuition: "Re-reading an entire email thread from the top before writing each reply.",
        breaks: "A person remembers the thread after reading it once. The model keeps nothing between calls; prompt caching can make re-reading cheaper, but it is still re-read.",
        visual: async (el) => {
          el.append(h("div", { class: "faint" }, "Counting with the real o200k tokeniser…"));
          await MM.load("core/agent.js"); const A = MM.agent, T = await A.tokenizer();
          const rows = A.accounting(T, "trip3", A.trace("trip3", {}));
          el.innerHTML = "";
          el.append(MM.bars(rows.map((r, i) => ({ label: `call ${i + 1}`, p: r.read })), { plain: true, total: false, fmt: (it) => it.p.toLocaleString("en-GB") + " tokens" }), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, `Total read: ${rows.reduce((a, r) => a + r.read, 0).toLocaleString("en-GB")} tokens; total written: ${rows.reduce((a, r) => a + r.wrote, 0).toLocaleString("en-GB")}. Reading grows lap by lap; writing stays small.`));
        } },
      { title: "When a tool fails", truth: "REAL",
        text: "Two real runs of the same agent, with the real ToolNode. By default, an invalid-argument error (here: the required day is missing) goes back to the model as a message, but an exception inside the tool (“Mon” is not a day it knows) ends the run. With handle_tool_errors = True, every error becomes a message; the model fixes the day, survives a call to a tool that does not exist, and answers.",
        visual: async (el, api) => {
          const G = await api.graph(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["toolnode_default", "toolnode_handled"])));
          const box = h("div"); const show = (k) => { box.innerHTML = ""; const r = G.scenarios[k](); box.append(chat(r.state.messages), h("div", { style: "margin-top:8px" }, G.outcomeBox(r.outcome))); };
          el.append(MM.seg([{ value: "toolnode_default", label: "Default ToolNode" }, { value: "toolnode_handled", label: "handle_tool_errors = True" }], "toolnode_default", show), h("div", { style: "margin-top:10px" }, box));
          show("toolnode_default");
        } },
      { title: "An error message is a prompt", truth: "SKETCH",
        text: "The model reads the tool's error message and decides what to do next, so write errors for the model: say what was wrong and what is allowed. “day must be one of Friday, Saturday, Sunday, Monday” lets the model fix itself in one lap; “Error 17” does not. A clear error message is the cheapest way to make an agent correct itself. But count the retries: a tool that is simply down will fail every time.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow", style: "color:var(--bad)" }, "Unhelpful"), h("p", { class: "mono", style: "font-size:.86rem" }, "Error 17: invalid input")), h("div", { class: "panel" }, h("div", { class: "eyebrow", style: "color:var(--ok)" }, "Helpful"), h("p", { class: "mono", style: "font-size:.86rem" }, "day must be one of Friday, Saturday, Sunday, Monday")))) },
      { title: "Several tools in one lap", truth: "SKETCH",
        text: "A model may ask for several tools in one reply: the forecasts for Saturday and Sunday at once. The tool node runs them side by side in the same round and returns one tool message per call id. Fewer laps means fewer re-readings of the whole conversation, so parallel tool calls save both time and tokens.",
        visual: (el) => el.append(h("div", { class: "log" }, h("div", null, "AI: get_forecast(Saturday) · id call_1, get_forecast(Sunday) · id call_2"), h("div", null, "tools (one round, side by side) → 2 tool messages: call_1, call_2"), h("div", { class: "ok" }, "1 lap instead of 2"))) },
      { title: "You rarely build this loop by hand", truth: "REAL",
        text: "LangChain's create_agent builds this exact loop on LangGraph (it replaced langgraph's create_react_agent in version 1.0). [[middleware|Middleware]] (code that runs before or after the model or a tool, like checkpoints at an airport) adds features without rewriting the loop, and each piece appears as a real node. These are the actual graphs create_agent builds in LangChain 1.4.7:",
        precision: "Middleware hooks: before_agent, before_model, wrap_model_call, after_model, wrap_tool_call, after_agent. Ready-made middleware includes summarisation, human approval, model and tool call limits, model fallback and retries, tool retries and PII redaction.",
        visual: async (el, api) => {
          const G = await api.graph(); const box = h("div");
          const show = (k) => { const d = CA[k]; box.innerHTML = ""; box.append(G.draw(caGraph(G, d), { W: d.W, H: d.H, nodes: d.nodes, start: d.start, end: d.end, via: d.via }), h("p", { class: "faint mono", style: "font-size:.8rem" }, "nodes: " + Object.keys(d.nodes).join(", "))); };
          el.append(MM.seg([{ value: "plain", label: "create_agent" }, { value: "summ", label: "+ summarisation" }, { value: "hitl", label: "+ human approval" }], "plain", show), h("div", { style: "margin-top:8px" }, box));
          show("plain");
        } },
      { title: "Guard rails for the loop", truth: "TOY",
        text: "Because the model decides when to stop, give the loop limits it cannot argue with: a recursion limit for the run, a cap on model calls and tool calls (middleware does this), a timeout, a retry limit for failing tools, and a person's approval before any tool that spends money or sends messages (A9).",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["Recursion limit", "rounds per run"], ["Call limits", "model calls and tool calls, per run or per thread"], ["Retry limits", "stop retrying a tool that is down"], ["Approval", "a person says yes before a risky tool runs (A9)"], ["Timeouts", "a slow tool cannot stall the run forever"]].map(([a, b]) => h("div", { class: "note ok" }, h("strong", null, a), " · ", h("span", { class: "muted" }, b))))) },
      { kind: "snap", title: "One node can hide a whole agent", truth: "SKETCH",
        text: "In Maya's team, each researcher can be one of these two-node loops, packed inside a single box of the bigger graph. That is why A1 counted 14 model calls for a team that A0 drew with 8 model boxes: one box can hide a loop. Packing a graph inside a node is a subgraph, and teams are built from them. Next: A7.",
        visual: async (el, api) => { const G = await api.graph(); const svg = G.draw(G.teamGraph(), G.teamSpec); G.light(svg, { weather: 1, travel: 1, activities: 1 }, null, null); el.append(svg, h("p", { class: "faint", style: "font-size:.86rem" }, "The three highlighted researchers can each be a full agent loop inside.")); } }],
    lab: {
      title: "The ReAct Stepper", truth: "REAL",
      intro: "Pick one of Maya's questions and step through the agent graph, lap by lap. The model's replies are scripted, the tools run for real in this page, and every model call's context is counted with the real o200k tokeniser, in the chat format of the open-weight gpt-oss models. Then break the weather service and choose how the tool node handles errors.",
      tries: ["Run “Plan my Saturday afternoon”. Which call reads the most tokens, and what makes up most of it?", "Run “Will it rain tomorrow?” with handle_tool_errors off. Why does it crash at the second tool call?", "Turn handle_tool_errors on and run it again. What does the model do with the error?", "Break the weather service, keep error handling on, and set the limit to 10. What stops the run?"],
      async mount(el, api) {
        const G = await api.graph();
        el.append(h("div", { class: "faint" }, "Loading the real o200k tokeniser…"));
        await MM.load("core/agent.js");
        const A = MM.agent, H = A.H, T = await A.tokenizer();
        el.innerHTML = "";
        const st = { key: "plan", broken: false, handle: true, limit: 25 };
        const isDown = (m) => m.status === "error" && m.name === "get_forecast" && /503|unavailable/.test(m.content);
        /* a ToolNode that follows langgraph-prebuilt 1.1's rules, over Maya's real tools */
        const toolNode = (state) => {
          const last = state.messages[state.messages.length - 1];
          return { messages: (last.tool_calls || []).map((tc) => {
            const msg = (content, bad) => Object.assign({ type: "tool", content, tool_call_id: tc.id, name: tc.name }, bad ? { status: "error" } : {});
            const tool = A.byName[tc.name];
            if (!tool || !A.TOOLS.includes(tool)) return msg(`Error: ${tc.name} is not a valid tool, try one of [${A.TOOLS.map((t) => t.name).join(", ")}].`, true);
            const errs = A.check(tool, tc.args);
            if (errs.length) { const m = `Error invoking tool '${tc.name}' with kwargs ${G.pyRepr(tc.args || {})} with error:\n ${errs.join("\n ")}\n Please fix the error and try again.`; return msg(st.handle ? `Error: ToolInvocationError(${G.pyRepr(m)})\n Please fix your mistakes.` : m, true); }
            try { return msg(JSON.stringify(A.run(tc.name, tc.args, { broken: st.broken }))); }
            catch (e) { const name = /503|unavailable/.test(e.message) ? "ConnectionError" : "ValueError"; if (!st.handle) { const er = new Error(e.message); er.name = name; throw er; } return msg(`Error: ${name}(${G.pyRepr(e.message)})\n Please fix your mistakes.`, true); }
          }) };
        };
        /* the scripted model: the next step of the script, unless the weather service just failed */
        const llm = (sc) => (state) => {
          const tms = state.messages.filter((m) => m.type === "tool"), lastT = tms[tms.length - 1];
          const idx = tms.length - tms.filter(isDown).length;
          const step = sc.rounds[Math.min(idx, sc.rounds.length - 1)], n = state.messages.filter((m) => m.type === "ai").length + 1;
          const think = lastT && isDown(lastT) && state.messages[state.messages.length - 1] === lastT ? "The tool failed. Try the same call again." : step.think;
          if (step.final) return { messages: [{ type: "ai", content: step.final, id: "ai-" + n, reasoning: think }] };
          return { messages: [{ type: "ai", content: "", id: "ai-" + n, reasoning: think, tool_calls: [{ name: step.call[0], args: step.call[1], id: "call_" + n }] }] };
        };
        const parts = (msgs) => {
          const out = [["system prompt", A.count(T, H.system)], ["tool descriptions", A.count(T, H.developer(A.TOOLS))]];
          msgs.forEach((m) => {
            if (m.type === "human") out.push(["Maya's question", A.count(T, H.user(m.content))]);
            else if (m.type === "ai") out.push([m.tool_calls && m.tool_calls.length ? "model: tool request" : "model: answer", A.count(T, H.cue + (m.reasoning ? H.think(m.reasoning) : "") + (m.tool_calls && m.tool_calls.length ? H.call(m.tool_calls[0].name, m.tool_calls[0].args) : H.final(m.content)))]);
            else if (m.type === "tool") { let obj; try { obj = JSON.parse(m.content); } catch (e) { obj = { error: m.content }; } out.push(["tool result", A.count(T, H.result(m.name || "tool", obj))]); }
          });
          out.push(["cue for the reply", A.count(T, H.cue)]);
          return out;
        };
        const chips = h("div", { class: "chips-scroll" }), runBox = h("div"), ctxBox = h("div"), callsBox = h("div");
        Object.entries(A.SCRIPTS).forEach(([k, sc]) => { const b = h("button", { class: "chip", "aria-pressed": String(k === st.key), onclick: () => { st.key = k; chips.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); run(); } }, sc.q); chips.append(b); });
        const cb = (id, label, key) => { const i = h("input", { type: "checkbox", id, checked: st[key] }); i.onchange = () => { st[key] = i.checked; run(); }; return h("label", { for: id, class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, i, label); };
        const lim = MM.slider({ label: "recursion limit", min: 4, max: 30, step: 1, value: st.limit, fmt: (v) => String(v), onInput: (v) => { st.limit = v; } });
        lim.input.addEventListener("change", () => run());
        function run() {
          const g = agentGraph(G, llm(A.SCRIPTS[st.key]), toolNode);
          const res = g.compile().run({ messages: [{ type: "human", content: A.SCRIPTS[st.key].q, id: "h-1" }] }, { limit: st.limit });
          const calls = res.steps.filter((x) => !x.start && x.tasks.some((t) => t.name === "llm")).map((x) => ({ step: x.step, p: parts(x.before.messages) }));
          const drawCalls = (cur) => { callsBox.innerHTML = ""; if (!calls.length) return; callsBox.append(h("div", { class: "eyebrow", style: "margin-bottom:4px" }, "Tokens read by each model call"), MM.bars(calls.map((c, i) => ({ label: `call ${i + 1}${c.step === cur ? " ◀" : ""}`, p: c.p.reduce((a, x) => a + x[1], 0), color: c.step === cur ? "var(--llm)" : null })), { plain: true, total: false, fmt: (it) => it.p.toLocaleString("en-GB") })); };
          runBox.innerHTML = ""; ctxBox.innerHTML = "";
          G.player(runBox, { builder: g, spec: agentSpec, run: res, schema: g.schema, builderNoSaver: true, boardOpts: { max: 60 }, onFrame: (fr) => {
            ctxBox.innerHTML = "";
            const c = fr.st && calls.find((x) => x.step === fr.st.step && fr.st.tasks.some((t) => t.name === "llm"));
            drawCalls(c ? c.step : null);
            if (!c) { ctxBox.append(h("p", { class: "faint", style: "font-size:.88rem" }, fr.kind === "start" ? "Step forward to the first model call to see what it reads." : "This round ran the tools: no model call, no tokens read.")); return; }
            const total = c.p.reduce((a, x) => a + x[1], 0);
            ctxBox.append(h("div", { class: "eyebrow" }, `What this model call reads: ${total.toLocaleString("en-GB")} tokens`), MM.bars(c.p.map(([l, n]) => ({ label: l, p: n })), { scale: Math.max(...c.p.map((x) => x[1])), plain: true, total: false, labelW: "10rem", valueW: "3rem", fmt: (it) => String(it.p) }));
          } });
          api.done();
        }
        el.append(chips, h("div", { class: "row", style: "--gap:16px;margin:10px 0" }, cb("rs-broken", "Weather service down (503)", "broken"), cb("rs-handle", "handle_tool_errors = True", "handle")), lim,
          h("div", { style: "margin-top:12px" }, runBox), h("div", { class: "two", style: "margin-top:12px" }, ctxBox, callsBox));
        run();
      } },
    breakit: {
      title: "Break the agent loop", truth: "REAL",
      intro: "Agent loops fail in a few classic ways. The first is a real recorded run; try the second yourself in the ReAct Stepper.",
      cases: [
        { name: "An exception inside a tool", what: "Default ToolNode. The model asks for day “Mon”; the tool raises ValueError.", action: "Run it", result: "ValueError: day must be one of Friday, Saturday, Sunday, Monday. The run ends; Maya gets no answer.", why: "By default only invalid-argument errors go back to the model. Set handle_tool_errors = True (or catch errors inside your tools) when the model should get a chance to recover.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["toolnode_default"])); } },
        { name: "A tool that is simply down", what: "The weather service returns 503 every time. Errors go back to the model, and it keeps retrying.", action: "Run it", result: "The model asks for the forecast again and again; every lap re-reads a longer conversation, until GraphRecursionError stops the run.", why: "Sending errors back helps only when the model can fix them. Count failures, stop after two or three, and give Maya an honest answer (ToolRetryMiddleware and call limits do this)." },
        { name: "A tool call without its answer", what: "To save tokens, code trims the history and cuts out a tool result, but keeps the AI message that asked for it.", action: "Send it", result: "The next model call is rejected by the provider: a tool call has no matching tool message.", why: "Trim calls and results together, or summarise them; never leave a tool call unanswered." }],
      explain: { q: "Why does an agent's cost per lap keep rising?", options: ["The model gets slower", "Each call re-reads the whole growing conversation, plus every tool description", "Tools charge more each time", "LangGraph saves more checkpoints"], answer: 1, why: "The model is stateless, so every lap pays again for everything before it." } },
    clinic: [
      { belief: "The model runs the tools itself.", test: "In the ReAct Stepper, watch a lap: the llm node only writes a request; the tools node, ordinary code, runs it.", truth: "The model writes a tool call; your program's tool node runs the tool and adds the result to the messages (M13)." },
      { belief: "An agent remembers earlier laps.", test: "Look at the token bars in the ReAct Stepper: every call re-reads the whole conversation.", truth: "Nothing is remembered between calls. The messages list is re-read in full on every lap." },
      { belief: "A tool error always crashes an agent.", test: "Compare the two real runs in the Story: default and handle_tool_errors = True.", truth: "It depends on the tool node: invalid arguments come back to the model by default; with handle_tool_errors = True, every error does." }],
    explain: { prompt: "Explain what an agent looks like inside a LangGraph graph, how it decides to stop, and what happens when a tool fails.", points: ["Two nodes: an llm node and a tool node", "A conditional edge: tool calls → tools, none → END; tools always lead back", "The state is the messages list with add_messages; each tool result carries its call's id", "Every lap re-reads the whole conversation, so tokens grow", "Default ToolNode returns invalid-argument errors to the model; other exceptions end the run unless handle_tool_errors is set", "Limits (recursion, call caps, approvals) bound the loop"] },
    skeptic: [
      { q: "Why draw a while-loop as a graph at all?", laws: ["g1", "g5"], a: "Because the graph form gives the loop everything else LangGraph has: a checkpoint after every lap ({law:g5}), a pause before a risky tool (A9), streaming of every step, retries, and the same tracing as bigger systems. The loop itself is still {law:g1}." },
      { q: "If the model decides when to stop, what stops a confused model?", laws: ["g6"], a: "Things the model cannot talk its way past: the recursion limit, model and tool call limits, timeouts, and human approval before risky tools ({law:g6}). Design these in from the start." },
      { q: "Why send errors back to the model instead of handling them in code?", laws: ["g1"], a: "Because the model often knows what it meant: given “day must be one of Friday, Saturday, Sunday, Monday”, it fixes “Mon” in one lap, which code cannot guess. But cap the retries: a tool that is down will not get better by being asked again." }],
    recall: [
      { q: "What are the two nodes of an agent loop?", options: ["planner and writer", "an llm node and a tool node", "START and END", "router and critic"], answer: 1, level: 1, why: "Model, then tools, joined by one conditional edge." },
      { q: "What decides whether the loop goes round again?", options: ["A timer", "Whether the last AI message contains tool calls", "The number of tools", "The user"], answer: 1, level: 2, why: "tools_condition reads the last message." },
      { q: "Default ToolNode (langgraph-prebuilt 1.1): a tool raises ValueError. What happens?", options: ["The model gets an error message", "The run ends with the error", "Silent retry", "The tool is skipped"], answer: 1, level: 3, why: "Only invalid-argument errors are sent back by default." },
      { q: "Why do tokens per model call grow during a run?", options: ["Longer answers", "Each call re-reads the whole conversation and tool descriptions", "Checkpoints", "Bigger tools"], answer: 1, level: 4, why: "The model is stateless." },
      { q: "From A5: with a checkpointer, one of three parallel tasks fails. What runs on resume?", options: ["All three", "Only the failed one", "None", "The whole graph"], answer: 1, level: 5, why: "Finished tasks' writes were kept as pending writes." }],
    depth: [
      ["ToolNode", "Runs every tool call in the last AI message (side by side) and returns one ToolMessage per call, matched by tool_call_id. handle_tool_errors can be True, a fixed message, a function, or a list of exception types."],
      ["tools_condition", "Returns “tools” if the last AI message has tool calls, else END. It is the agent's whole stopping rule."],
      ["create_agent", "LangChain 1.0's agent builder, running on LangGraph. It replaced langgraph.prebuilt.create_react_agent, which is deprecated. Its nodes are called model and tools."],
      ["Middleware", "Hooks before and after the agent and the model, and wrappers around each model or tool call. Each middleware with a before/after hook becomes a real node in the graph (REAL: LangChain 1.4.7)."],
      ["Tools that read the state", "A tool can receive the graph's state or runtime (InjectedState, ToolRuntime) without the model seeing those inputs, and can return a Command to update the state."],
      ["Structured final answers", "An agent can be asked to end with an answer in a fixed format (response_format), checked against a schema."]],
    connect: { links: ["Packing this loop into one node of a bigger team: {mod:a07}.", "Pausing before a tool runs, for Maya's approval: {mod:a09}.", "Limits, tracing and evaluation for agents in production: {mod:a10}."], line: "You can now see an agent as a graph: two nodes, one edge, and a growing conversation. Next: several agents working together, and who should see what." }
  });
})();
