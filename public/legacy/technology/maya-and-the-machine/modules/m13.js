/* M13 · Tools and the Agent Loop — the model writes requests; programs act. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const COL = { maya: "var(--person)", model: "var(--llm)", program: "var(--code)", tool: "var(--data)" };
  const NAME = { maya: "Maya", model: "Model", program: "Program", tool: "Tool result" };
  const agent = () => MM.load("core/agent.js").then(() => MM.agent.tokenizer()).then((T) => ({ A: MM.agent, T }));
  const fmt = (n) => Math.round(n).toLocaleString("en-GB");

  /* harmony text with the special tokens drawn as pills */
  function harmony(text, A) {
    const out = h("span");
    A.splitSpecial(text).forEach((p) => out.append(p.sp ? h("span", { class: "sp", title: "special token " + A.SPECIAL[p.t] }, p.t) : document.createTextNode(p.t)));
    return out;
  }

  /* pretty JSON with short arrays kept on one line */
  const compactJSON = (o) => JSON.stringify(o, null, 1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, inner) => "[" + inner.split(/,\s*/).join(", ") + "]");

  /* The X-ray: the whole context as the model reads it */
  function xray(A, T, msgs, opt) {
    opt = opt || {};
    const box = h("div", { class: "xray", role: "region", "aria-label": "Everything in the model's context window" });
    msgs.forEach((m) => {
      const toks = A.tokens(T, m.text);
      const fresh = opt.newFrom !== undefined && m.at !== undefined && m.at >= opt.newFrom;
      const body = h("span");
      if (opt.mode === "tokens") toks.forEach((t) => body.append(t.sp ? h("span", { class: "sp", title: "special token " + t.id }, t.t) : h("span", { class: "tk", title: "token " + t.id }, t.t)));
      else body.append(harmony(m.text, A));
      const label = `${m.who} · ${toks.length} tokens`;
      if (m.who === "system" || m.who.startsWith("developer")) box.append(h("details", { class: "msg", style: `--c:${COL[m.by]}` }, h("summary", null, "▸ " + label + " · tap to see"), body));
      else box.append(h("div", { class: "msg" + (fresh ? " new" : ""), style: `--c:${COL[m.by]}` }, h("span", { class: "who" }, label), body));
    });
    return box;
  }
  function whoKey() {
    return h("div", { class: "who-key", "aria-label": "Colour key" }, [["maya", "written by Maya"], ["model", "written by the model"], ["program", "written by your program"], ["tool", "tool result (added by your program)"]].map(([k_, t]) => h("span", { style: `--c:${COL[k_]}` }, h("i"), t)));
  }

  /* One event of the loop as a card */
  function evCard(e, A) {
    const card = (by, title, ...kids) => h("div", { class: "ev", style: `--c:${COL[by]}` }, h("div", { class: "who" }, title), ...kids);
    if (e.by === "maya") return card("maya", "Maya asks", h("p", { style: "margin-top:4px" }, e.text));
    if (e.by === "model") return card("model", `Model · call ${e.round}`, h("p", { class: "faint", style: "font-size:.86rem;margin-top:4px" }, "Reads the whole context, then writes:"),
      h("pre", null, harmony(A.H.think(e.think) + (e.call ? A.H.call(e.call[0], e.call[1]) : A.H.final(e.final)), A)),
      h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, e.call ? "It stops at <|call|>. Nothing has run yet: this is only text." : "No tool call this time: a final answer, ending with <|return|>."));
    if (e.stop === "limit") return card("program", "Program · step limit reached", h("p", { style: "margin-top:4px" }, `Stopped after ${e.rounds} model calls. The program, not the model, writes to Maya: “Sorry, the weather service is not answering. Please try again later.”`));
    if (e.stop === "forever") return card("program", "Program · still looping", h("p", { style: "margin-top:4px" }, `Call ${e.rounds} and still going. Nothing in this loop says stop, so it would run until someone pulls the plug or the money runs out. We stopped drawing here.`));
    if (e.done) return card("program", "Program · the stop rule", h("p", { style: "margin-top:4px" }, "The output has no tool call, so the loop ends and the answer goes to Maya."));
    if (e.ignored) return card("program", "Program · stop rule removed", h("p", { style: "margin-top:4px" }, "The output has no tool call, but this program never checks. It calls the model again."));
    return card("program", `Program · after call ${e.round}`,
      h("p", { style: "margin-top:4px" }, "Reads the text after “to=functions.”: tool ", h("code", null, e.name), " with ", h("code", null, JSON.stringify(e.args)), "."),
      h("p", { style: "margin-top:4px" }, e.schemaOk ? "Checks the arguments against the schema: ✓" : "Checks the arguments against the schema: ✗ " + e.error),
      e.schemaOk ? h("p", { style: "margin-top:4px" }, "Runs the tool, here in your browser:") : null,
      h("pre", { style: e.error ? "color:var(--bad)" : null }, JSON.stringify(e.error ? { error: e.error } : e.result)),
      h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Appends this as a new message and calls the model again."));
  }

  /* static ReAct table for the story */
  function reactRows(A, key) {
    const ev = A.trace(key);
    const rows = [];
    ev.forEach((e) => {
      if (e.by === "model") rows.push(["Thought", e.think, "model"], e.call ? ["Action", `${e.call[0]} ${JSON.stringify(e.call[1])}`, "model"] : ["Answer", e.final, "model"]);
      if (e.by === "program" && e.name) rows.push(["Observation", JSON.stringify(e.error ? { error: e.error } : e.result), "tool"]);
    });
    return h("div", { class: "stack", style: "--gap:5px" }, rows.map(([a, b, by]) => h("div", { class: "ev", style: `--c:${COL[by]};padding:6px 10px` }, h("div", { class: "who" }, a), h("div", { class: a === "Action" || a === "Observation" ? "mono" : "", style: "font-size:.86rem;margin-top:2px;overflow-wrap:anywhere" }, b))));
  }

  MM.defineModule({
    id: "m13",
    mystery: { title: "A text predictor checks the weather", text: "Maya asks an assistant: “Do I need an umbrella in Paris on Saturday?” It answers: “Yes. Saturday has a 70% chance of rain, with showers from late morning.” That forecast was made this week.\n\nBut the model's weights were frozen long ago, and the model only ever writes the next token. It has no internet, no clock, no hands. So how did this week's forecast get into its answer?" },
    where: { text: "Around the model, not inside it: ordinary code that reads what the model writes, runs tools, and feeds the results back into the context window." },
    predict: { q: "The assistant “checks the weather”. What actually happens?", options: ["The model connects to a weather website from inside its layers", "The model writes a request as text; a program runs it and pastes the result into the context", "The forecast was in the training data", "The model guesses, and is lucky"], answer: 1, why: "The model only writes text. A request written in an agreed format is read by your program, which calls the weather service and adds the answer to the context. The model then continues, now with real data in view." },
    story: [
      { title: "A sealed room", truth: "SKETCH",
        text: "Picture the model as a sealed room. Text comes in through one slot; text goes out through another. Inside, it can only do one thing: give chances to the next token ({law:l1}). It has no network, no clock and no hands, and it knows only what is in its weights or in its context ({law:l3}). Saturday's forecast is in neither.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel", style: "border-color:var(--llm)" }, h("div", { class: "eyebrow" }, "what the model can do"), h("ul", { style: "margin:6px 0 0;padding-left:18px" }, ["read the text in its context", "write the next token, again and again"].map((t) => h("li", null, t)))), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "what it cannot do alone"), h("ul", { style: "margin:6px 0 0;padding-left:18px" }, ["check this week's forecast", "open a website", "pay for a hotel", "run a program"].map((t) => h("li", null, t)))))) },
      { title: "Describe a tool in the prompt", truth: "REAL",
        text: "The trick: tell the model which [[tool-calling|tools]] exist. A tool is a name, a description and a [[json-schema|JSON Schema]] (a description of the arguments it takes: names and types). Your program turns them into text and puts it in the prompt. On the right is the real text that OpenAI's open-weight gpt-oss models read, in their published “harmony” chat format.",
        precision: "The descriptions are prompt engineering: a vague description causes wrong tool choices. And they ride along in every call: the instructions plus these five tool descriptions cost 343 tokens each time, counted with the o200k vocabulary that gpt-oss uses.",
        visual: async (el) => { const { A, T } = await agent(); const t = A.byName.get_forecast; el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "what your program defines (JSON Schema)"), h("pre", { class: "panel mono", style: "font-size:.78rem;white-space:pre-wrap;margin-top:4px" }, compactJSON({ name: t.name, description: t.description, parameters: t.schema }))), h("div", null, h("div", { class: "eyebrow" }, `what the model reads · ${A.count(T, A.decl(t))} tokens`), h("pre", { class: "panel mono", style: "font-size:.78rem;white-space:pre-wrap;margin-top:4px" }, A.decl(t))))); } },
      { title: "X-ray: a tool call is just tokens", truth: "REAL",
        text: "Maya's question goes in, and the model writes. First a short note to itself (the “analysis” channel), then a message addressed to=functions.get_forecast with the arguments in [[json|JSON]]. It ends with a special token, <|call|> (ID 200012). Generation stops there. The whole conversation is one stream of 468 tokens, and the model wrote only the last 41 of them. Nothing has been run.",
        precision: "Special tokens such as <|start|> (200006) and <|call|> are single tokens with jobs (M3). The program sees <|call|> as a signal: stop generating, parse the call, act. Each model family has its own markers; the idea is the same everywhere.",
        visual: async (el) => { const { A, T } = await agent(); const ev = A.trace("umbrella"); const msgs = A.messages("umbrella", ev, 1); el.append(whoKey(), h("div", { style: "margin-top:8px" }, xray(A, T, msgs, { mode: "tokens", newFrom: 1 }))); } },
      { title: "Your program does the work", truth: "SKETCH",
        text: "Now ordinary code takes over. It reads the tool name and arguments, checks them, calls the weather service, and appends the result to the context as a new message. Then it calls the model again. The model reads its own request, the result, and writes the answer. The model never ran anything. Your program did.",
        visual: (el) => MM.load("core/atlas.js").then(() => el.append(h("div", { class: "bp" }, MM.atlas.draw(MM.atlas.BP.step, { lit: ["sys", "tooldesc", "conv", "window", "call", "parse", "run", "results", "reply"] })))) },
      { title: "Keeping calls valid", truth: "TOY",
        text: "What if the model writes “day”: “Tuesday”, a day outside Maya's trip? Two defences. [[constrained-decoding|Constrained decoding]] (M8) makes it impossible: the sampler gives every token that breaks the schema a chance of zero. Here is Maya-LM after “…it would rain on”, before and after a schema that allows only Maya's four trip days. Otherwise the program checks the arguments and sends any error back as text, so the model can try again.",
        visual: async (el, api) => { const lm = await api.lm(); const p = lm.next("the forecast for Paris said it would rain on").probs; const all = ["Saturday", "Sunday", "Monday", "Tuesday", "Friday", "Thursday", "Wednesday"].map((w) => ({ label: w, p: p[lm.stoi[w]] })); const allowed = new Set(["Friday", "Saturday", "Sunday", "Monday"]); const z = all.filter((x) => allowed.has(x.label)).reduce((a, x) => a + x.p, 0); el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "Maya-LM, free"), MM.bars(all, { total: false })), h("div", null, h("div", { class: "eyebrow" }, "with the schema: trip days only"), MM.bars(all.map((x) => (allowed.has(x.label) ? { label: x.label, p: x.p / z } : { label: x.label, p: 0, cut: true })), { total: false, fmt: (it) => (it.cut ? "blocked" : MM.pct(it.p, 1)) })))); } },
      { title: "Trained, not built in", truth: "SKETCH",
        text: "Why does the model write calls in exactly this format? Because post-training (M11) showed it many examples: tool descriptions, a question, a well-formed call, a result, a good answer. It learned the pattern like any other text. Nothing about tools is wired into its layers.",
        precision: "Toolformer (Schick and colleagues, 2023) showed a model can even learn by itself where API calls help, by keeping only the calls that made its next tokens easier to predict. Today's assistants learn tool use in post-training, often with reinforcement learning on tasks where tools are needed.",
        visual: (el) => el.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "one training example (shortened)"), h("div", { class: "stack", style: "--gap:5px" }, [["program", "tool descriptions", "get_forecast(city, day): the saved forecast for one day"], ["maya", "user", "Will it be sunny in Rome on Sunday?"], ["model", "assistant writes", "to=functions.get_forecast {\"city\":\"Rome\",\"day\":\"Sunday\"}"], ["tool", "tool result", "{\"summary\":\"sunny\",\"temp_c\":19}"], ["model", "assistant writes", "Yes: sunny and 19 °C on Sunday."]].map(([by, a, b]) => h("div", { class: "ev", style: `--c:${COL[by]};padding:6px 10px` }, h("div", { class: "who" }, a), h("div", { class: by === "tool" || a === "assistant writes" ? "mono" : "", style: "font-size:.86rem;margin-top:2px" }, b))))) },
      { title: "The loop: reason, act, observe", truth: "TOY",
        text: "One call is rarely enough. Planning Maya's Saturday needs the forecast, then indoor places, then opening hours. [[react|ReAct]] (Yao and colleagues, 2022) is the pattern: think, act with a tool, observe the result, think again, until the answer is ready. Put the round trip in a loop and you have an [[agent]]: an LLM that chooses its own next step.",
        precision: "The results below are real outputs of this page's tools, run on Maya's World Bible. The thoughts and calls are a scripted policy, so the run is the same every time; switch to live Claude in the Lab to see a real model choose.",
        visual: async (el) => { const { A } = await agent(); el.append(h("div", { class: "mono", style: "font-size:.86rem;margin-bottom:6px" }, "“" + A.SCRIPTS.plan.q + "”"), reactRows(A, "plan")); } },
      { title: "Who stops the loop?", truth: "SKETCH",
        text: "The loop ends when the model writes an answer instead of a call. That check is a few lines of ordinary code: the stop rule. But the model might never stop, for example if a tool keeps failing. So the program also keeps a limit on rounds. Stopping is the program's job, not the model's.",
        visual: (el) => el.append(stopFlow()) },
      { title: "Several calls at once", truth: "SKETCH",
        text: "Many model APIs let the model ask for several independent calls in one turn: the forecasts for Saturday, Sunday and Monday together. The program runs them at the same time and returns all the results. The wait is the slowest call, not the sum of all three.",
        precision: "Only independent calls can run together. If one call needs another's result (find places, then check their hours), they must be separate rounds.",
        visual: (el) => el.append(parallelPic()) },
      { title: "Every round re-reads everything", truth: "REAL",
        text: "The model keeps no memory between calls ({law:l3}), so each call reads the whole context again: instructions, tool descriptions, every earlier thought, call and result. Planning Maya's Saturday took four model calls. They read 424, 496, 695 and 782 tokens: 2,397 in total. If each round adds k tokens, round i reads about i × k, so the total grows with the square of the number of rounds.",
        precision: "Real tool results are often thousands of tokens (a web page, a file), not a short line, so long agent runs get expensive fast. Prompt caching (M9) makes re-reading the same opening cheaper; summarising old rounds shrinks it.",
        visual: async (el) => { const { A, T } = await agent(); const acc = A.accounting(T, "plan", A.trace("plan")); const B = acc[0].read, kk = (acc[acc.length - 1].read - B) / (acc.length - 1); const tot = (n) => n * B + kk * n * (n - 1) / 2; el.append(h("div", { class: "eyebrow" }, "tokens read by each model call (measured)"), MM.bars(acc.map((r) => ({ label: "call " + r.round, p: r.read })), { plain: true, total: false, fmt: (it) => fmt(it.p) }), h("table", { class: "tbl", style: "margin-top:10px" }, h("thead", null, h("tr", null, h("th", null, "rounds"), h("th", { class: "n" }, "total tokens read"))), h("tbody", null, [[4, "measured: " + fmt(acc.reduce((a, r) => a + r.read, 0))], [10, "≈ " + fmt(tot(10))], [30, "≈ " + fmt(tot(30))]].map(([n, v]) => h("tr", null, h("td", null, String(n)), h("td", { class: "n" }, v))))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, `10 and 30 rounds: the same growth (about ${Math.round(kk)} tokens a round), extended.`)); } },
      { title: "Code as action", truth: "SKETCH",
        text: "Another design: instead of one call per round trip, the model writes a short program that calls several tools, with loops and choices, and a sandbox (a sealed space where code can run safely) runs it. Checking three days' weather becomes one program instead of three round trips. Fewer round trips, more power, more risk.",
        precision: "CodeAct (Wang and colleagues, 2024) found that agents acting through code often succeed more often and in fewer steps than agents writing one JSON call at a time. The model still only writes text; the sandbox runs it.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "one JSON call per round trip"), h("ol", { style: "margin:6px 0 0;padding-left:20px" }, ["call: forecast for Saturday", "call: forecast for Sunday", "call: forecast for Monday", "answer"].map((t) => h("li", null, t))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:4px" }, "4 model calls")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "code as action"), h("ol", { style: "margin:6px 0 0;padding-left:20px" }, ["writes a small program: get the forecast for each day, keep the dry ones", "a sandbox runs it", "answer"].map((t) => h("li", null, t))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:4px" }, "2 model calls, but the program needs a safe place to run")))) },
      { title: "MCP: one plug for many tools", truth: "SKETCH",
        text: "Every app used to wire up every tool its own way. The [[mcp|Model Context Protocol]] (Anthropic, 2024, now an open standard) is a common plug. A host app runs one MCP client per server; each server offers tools, readable data (resources) and prompt templates, over a standard message format. Any MCP app can use any MCP server.",
        precision: "Messages use JSON-RPC (a simple request–response format): the app asks a server tools/list to learn its tools, then tools/call to run one. The model's side is unchanged: it still writes a call, and the app forwards it.",
        visual: (el) => el.append(mcpPic(), h("pre", { class: "panel mono", style: "font-size:.76rem;white-space:pre-wrap;margin-top:8px;overflow-wrap:anywhere" }, '{"jsonrpc": "2.0", "id": 7, "method": "tools/call",\n "params": {"name": "get_forecast",\n            "arguments": {"city": "Paris", "day": "Saturday"}}}')) },
      { title: "Twelve tools, one agent", truth: "REAL",
        text: "To plan the whole trip, one agent would need many tools: forecasts, alerts, trains, flights, hotels, bookings, currency. Each description sits in every call, and each adds a choice. Anthropic reported (November 2025) that 58 tools from five MCP servers took about 55,000 tokens before the conversation even started, and that the most common failures were the wrong tool or wrong arguments, especially when tools had similar names.",
        precision: "Fixes: load tools on demand ([[tool-search|tool search]]: in Anthropic's tests it lifted Claude Opus 4 from 49% to 74% on MCP tasks), or group tools behind specialist sub-agents. That second fix is the road to Phase 2.",
        visual: async (el) => { const { A, T } = await agent(); const sys = A.count(T, A.H.system), d5 = A.count(T, A.H.developer(A.TOOLS)), d12 = A.count(T, A.H.developer(A.ALL)), q = A.count(T, A.H.user("Plan three rain-friendly days in Paris within my budget.")); const bar = (label, parts) => { const tot = parts.reduce((a, p) => a + p[1], 0); return h("div", { style: "margin-top:8px" }, h("div", { class: "eyebrow" }, `${label} · ${tot} tokens before the model writes a word`), h("div", { style: "display:flex;height:22px;border-radius:6px;overflow:hidden;margin-top:4px;border:1px solid var(--rule)", role: "img", "aria-label": parts.map((p) => p[0] + " " + p[1]).join(", ") }, parts.map(([n, v, c]) => h("div", { title: `${n}: ${v} tokens`, style: `width:${(100 * v) / tot}%;background:${c}` }))), h("div", { class: "who-key", style: "margin-top:4px" }, parts.map(([n, v, c]) => h("span", { style: `--c:${c}` }, h("i"), `${n} ${v}`)))); }; el.append(bar("5 tools", [["system", sys, "var(--ink-3)"], ["tool descriptions", d5, "var(--code)"], ["Maya's request", q, "var(--person)"]]), bar("12 tools", [["system", sys, "var(--ink-3)"], ["tool descriptions", d12, "var(--code)"], ["Maya's request", q, "var(--person)"]]), h("p", { class: "faint", style: "font-size:.85rem;margin-top:8px" }, "Counted with the o200k vocabulary. Real tool descriptions are usually much longer than these.")); } },
      { kind: "snap", title: "Back to Maya: a cliffhanger", truth: "SKETCH",
        text: "The umbrella question worked: two model calls, one tool, an answer from real data. Now Maya asks for everything: “Plan three rain-friendly days in Paris, with trains, hotel, museums and my 900-euro budget.” One agent with twelve tools must hold it all in one growing context. It picks the wrong weather tool, forgets the rain on day three, re-reads thousands of tokens every round, and does nothing in parallel. What if we built a team?",
        precision: "Before tools touch real money or private data, remember one shape: an agent with private data, untrusted content and a way to send data out can be tricked into leaking it, Simon Willison's [[lethal-trifecta|lethal trifecta]] (2025). Phase 2 builds the defences (A10).",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel", style: "border-color:var(--ok)" }, h("div", { class: "eyebrow" }, "one question, one tool"), h("p", { style: "margin-top:4px" }, "2 model calls · 935 tokens read · answered from this week's forecast")), h("div", { class: "panel", style: "border-color:var(--bad)" }, h("div", { class: "eyebrow" }, "a whole trip, one agent"), h("p", { style: "margin-top:4px" }, "12 tools in every call · dozens of rounds · one context for everything · nothing in parallel")))) }],
    lab: {
      title: "The Agent Loop Stepper", truth: "TOY",
      intro: "Step through a real agent loop, one event at a time. The tools are real functions running in your browser on Maya's World Bible; the thoughts and calls come from a scripted policy, so every run is the same. The X-ray shows the exact context in the gpt-oss harmony format, counted with the real o200k tokeniser. If live AI is available, Claude can drive the same tools.",
      tries: ["Step through the umbrella question and watch who writes each part.", "Turn the forecast service off, with no step limit.", "Run “Plan my Saturday afternoon” and watch “read so far” climb.", "Turn the stop rule off and run any question.", "Search the twelve tools for “Book a room near the Eiffel Tower”."],
      async mount(el, api) {
        const { A, T } = await agent();
        const st = { key: "umbrella", broken: false, limit: 0, stopRule: true, j: 0, mode: "text" };
        let ev = [];
        const log = h("div", { class: "loop-log", "aria-live": "polite" }), xr = h("div"), meter = h("div", { class: "meter" }), note = h("p", { class: "faint", style: "font-size:.86rem" });
        function rebuild() { ev = A.trace(st.key, st); st.j = 0; render(); }
        function render() {
          log.innerHTML = "";
          ev.slice(0, st.j + 1).forEach((e, x) => { const c = evCard(e, A); if (x === st.j) c.classList.add("now"); log.append(c); });
          log.scrollTop = log.scrollHeight;
          const msgs = A.messages(st.key, ev, st.j);
          const acc = A.accounting(T, st.key, ev.slice(0, st.j + 1));
          const ctx = msgs.reduce((a, m) => a + A.count(T, m.text), 0);
          meter.innerHTML = "";
          meter.append(h("span", null, "model calls ", h("b", null, String(acc.length))), h("span", null, "context now ", h("b", null, fmt(ctx)), " tokens"), h("span", null, "read so far ", h("b", null, fmt(acc.reduce((a, r) => a + r.read, 0))), " tokens"));
          xr.innerHTML = "";
          const box = xray(A, T, msgs, { mode: st.mode, newFrom: st.j });
          xr.append(box);
          box.scrollTop = box.scrollHeight;
          stepBtn.disabled = runBtn.disabled = st.j >= ev.length - 1;
          note.textContent = st.j >= ev.length - 1 ? "End of the run. Change a setting or pick another question." : "";
          if (st.j >= ev.length - 1) api.done();
        }
        const stepBtn = h("button", { class: "btn small primary", type: "button" }, "Step", MM.icon("next"));
        const runBtn = h("button", { class: "btn small", type: "button" }, "Run to the end");
        const resetBtn = h("button", { class: "btn small ghost", type: "button" }, "Restart");
        stepBtn.onclick = () => { st.j = Math.min(ev.length - 1, st.j + 1); render(); };
        runBtn.onclick = () => { st.j = ev.length - 1; render(); };
        resetBtn.onclick = () => { st.j = 0; render(); };
        const chips = h("div", { class: "chips-scroll" }, Object.entries(A.SCRIPTS).map(([key, sc]) => { const b = h("button", { class: "chip", type: "button", "aria-pressed": String(key === st.key) }, sc.q); b.onclick = () => { chips.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); st.key = key; rebuild(); }; return b; }));
        el.append(h("div", { class: "eyebrow" }, "Maya asks"), chips,
          h("div", { class: "row", style: "margin:10px 0" },
            MM.seg([{ label: "Forecast service on", value: false }, { label: "Service down", value: true }], st.broken, (v) => { st.broken = v; rebuild(); }, "Forecast service"),
            MM.seg([{ label: "No step limit", value: 0 }, { label: "Limit: 4 calls", value: 4 }], st.limit, (v) => { st.limit = v; rebuild(); }, "Step limit"),
            MM.seg([{ label: "Stop rule on", value: true }, { label: "Stop rule off", value: false }], st.stopRule, (v) => { st.stopRule = v; rebuild(); }, "Stop rule")),
          h("div", { class: "row" }, stepBtn, runBtn, resetBtn), note,
          h("div", { class: "two", style: "margin-top:10px" },
            h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "what happens, step by step"), log),
            h("div", null, h("div", { class: "row", style: "justify-content:space-between;margin-bottom:6px" }, h("div", { class: "eyebrow" }, "X-ray: the model's whole context"), MM.seg([{ label: "Text", value: "text" }, { label: "Tokens", value: "tokens" }], st.mode, (v) => { st.mode = v; render(); }, "X-ray view")), meter, h("div", { style: "margin-top:6px" }, xr), h("div", { style: "margin-top:6px" }, whoKey()))));
        rebuild();

        /* live: Claude drives the same tools */
        const live = h("div", { hidden: true });
        el.append(h("hr", { class: "rule" }), live);
        Promise.all([MM.ai.available(), MM.ai.get()]).then(async ([ok, sample]) => {
          if (!ok || !sample) return;
          const lim = sample.limits ? await sample.limits().catch(() => null) : null;
          if (!lim || !lim.tools) return;
          live.hidden = false;
          const qIn = h("input", { type: "text", id: "m13-live-q", value: "Plan my Saturday afternoon in Paris.", "aria-label": "Maya's question for Claude" });
          const go = h("button", { class: "btn small primary", type: "button" }, MM.icon("bolt"), "Run with Claude");
          const stop = h("button", { class: "btn small", type: "button", hidden: true }, "Stop");
          const out = h("div", { class: "loop-log", "aria-live": "polite", style: "margin-top:10px" });
          let ctl = null;
          stop.onclick = () => ctl && ctl.abort();
          go.onclick = async () => {
            out.innerHTML = ""; ctl = new AbortController(); go.disabled = true; stop.hidden = false;
            const q = qIn.value.trim() || "Plan my Saturday afternoon in Paris.";
            out.append(evCard({ by: "maya", text: q }, A));
            const said = h("div", { class: "ev", style: `--c:${COL.model}` }, h("div", { class: "who" }, "Claude writes"), h("p", { class: "faint pulse", style: "margin-top:4px" }, "Thinking…"));
            out.append(said);
            let calls = 0;
            const tools = A.TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.schema, execute: async (input) => {
              calls++;
              const card = h("div", { class: "ev", style: `--c:${COL.program}` }, h("div", { class: "who" }, `Claude asked · tool call ${calls}`), h("pre", null, `${t.name} ${JSON.stringify(input)}`));
              out.insertBefore(card, said);
              const errs = A.check(t, input);
              try {
                if (errs.length) throw new Error(errs.join("; "));
                const res = A.run(t.name, input, { broken: st.broken });
                card.append(h("p", { class: "faint", style: "font-size:.85rem;margin-top:4px" }, "Your browser ran it and sent back:"), h("pre", null, JSON.stringify(res)));
                return res;
              } catch (e) { card.append(h("pre", { style: "color:var(--bad)" }, "Error: " + e.message)); throw e; }
            } }));
            const prompt = "You are Maya's travel assistant for her trip to Paris, Friday 13 to Monday 16 November 2026. Today is Thursday 12 November 2026. Use the tools for every fact about weather, places, opening hours and costs; never invent them. Do not book anything: Maya must approve bookings herself. Answer in one to three short sentences in simple English.\n\nMaya asks: " + q;
            try {
              await MM.ai.ask(prompt, { options: { tools, modelTier: "quick", signal: ctl.signal, onText: ({ text }) => { said.lastChild.className = ""; said.lastChild.textContent = text; } } });
              said.append(h("div", { class: "row", style: "margin-top:6px" }, MM.truth("REAL", "Claude chose these calls live; this page ran them."), h("span", { class: "faint", style: "font-size:.85rem" }, `${calls} tool call${calls === 1 ? "" : "s"}`)));
            } catch (e) { said.lastChild.className = ""; said.lastChild.textContent = e && e.code === "cancelled" ? "Stopped." : (e && e.text) || MM.ai.message(e); }
            go.disabled = false; stop.hidden = true;
          };
          live.append(h("h3", null, "Live: Claude drives the same tools"), h("p", { class: "muted" }, "Claude reads the five tool descriptions, decides which to call and with what arguments; your browser runs each call and sends the result back. The forecast-service switch above applies here too. Each round is a separate request that re-reads everything so far."), h("label", { class: "field", for: "m13-live-q" }, "Maya asks", qIn), h("div", { class: "row", style: "margin-top:8px" }, go, stop), out);
        });

        /* tool search: load only the tools a request needs */
        const ts = h("div");
        el.append(h("hr", { class: "rule" }), h("h3", null, "Tool search: load only what is needed"), h("p", { class: "muted" }, "With twelve tools, every call carries every description. Tool search ranks the descriptions against the request, with the same retrieval engine as M12, and loads only the top three."), ts);
        toolSearch(ts, A, T);
      } },
    breakit: {
      title: "Endless loops and bad arguments", truth: "TOY",
      intro: "Three ways the loop goes wrong. Each one is reproducible in the Stepper above.",
      cases: [
        { name: "A tool that keeps failing", what: "Turn the forecast service off, with no step limit, and ask about the umbrella.", action: "Break the service", result: "The model calls get_forecast, gets an error, and tries again. And again. After 12 calls it has re-read 9,370 tokens and still has no answer. Nothing in the loop says stop.", why: "The model only sees “error” as text and does its best: try again. Limits are the program's job. Phase 2's recursion limit exists for exactly this (A4)." },
        { name: "No stop rule", what: "Turn the stop rule off: the program never checks whether the output has a tool call.", action: "Remove it", result: "The model gives its answer. The program ignores it and calls the model again. The model repeats the answer, again and again, each time re-reading a longer context.", why: "“If the output has no tool call, stop” is ordinary code, and it is the only thing that ends a healthy loop." },
        { name: "An argument the schema rejects", what: "Ask “Will it rain in Paris tomorrow?”", action: "Ask it", result: "The model writes “day”: “tomorrow”. The program's schema check rejects it and sends the error back as text. The model works out that tomorrow is Friday, calls again, learns no Friday forecast is saved, and says so honestly.", why: "Errors returned as text let the model recover. Constrained decoding would have blocked “tomorrow” before it was written." }],
      explain: { q: "An agent has been calling a failing tool for an hour. What is missing?", options: ["A bigger model", "A step limit or retry cap in the program", "A lower temperature", "More tools"], answer: 1, why: "The loop is ordinary code; only code can guarantee it ends. A smarter model may give up sooner, but nothing guarantees it." } },
    clinic: [
      { belief: "The model browses the web itself.", test: "In the X-ray, the model's output stops at <|call|>. Every token after it, including the tool result, is written by your program.", truth: "The model writes a request; a program fetches the page and pastes the text into the context ({law:l3})." },
      { belief: "The model runs code.", test: "In code as action, the model writes a program as text; a sandbox, outside the model, runs it.", truth: "Models only write tokens ({law:l1}). Running anything is always done by the software around them." },
      { belief: "An agent is a different kind of AI.", test: "In the Stepper, every “Model” step is the same next-token machine; the loop, the tools and the stop rule are a few lines of ordinary code.", truth: "An agent is an LLM in a loop, with a program running the tools it asks for." }],
    explain: { prompt: "How does a model that only writes text check the weather or book a hotel? Use the words tool call, program, context and loop.", points: ["Tool descriptions (name, description, schema) are put in the prompt", "The model writes a tool call as text in a trained format, then stops", "The program parses it, checks it, runs the tool, appends the result to the context", "The model is called again and reads the result: in a loop, this is an agent", "The program decides when to stop: no tool call, or a step limit"] },
    skeptic: [
      { q: "If the model only writes text, how did it book my hotel?", laws: ["l1", "l3"], a: "It never did. It wrote a request, for example to=functions.book_hotel with the hotel and dates in JSON ({law:l1}). Your program read that text and called the booking system. The confirmation came back as text in the context ({law:l3}), and the model wrote the reply. All the action happened in the program.", ladder: ["Why can't the model call the booking system itself? It has no network: it only turns tokens into chances for the next token.", "Then who decides whether to really book? The program. It can refuse, ask Maya first (A9) or check the budget.", "So is the model just a planner? Yes: it chooses the next step as text. That is why agents can be made safe by controlling the program around them."] },
      { q: "Why not give one agent every tool it might need?", laws: ["l3", "l9"], a: "Every description costs context in every call, and each one adds a choice. Anthropic found 58 tools took about 55,000 tokens before the conversation started, and wrong tool choice was the most common failure. Each call already re-reads everything ({law:l3}), and a model gets no extra effort per token for a harder choice ({law:l9}). Fixes: tool search, or specialist sub-agents with a few tools each." },
      { q: "The forecast came from a real weather service. Can the model trust it?", laws: ["l3", "l10"], a: "A tool result is just more text in the context ({law:l3}). It can be wrong, out of date, or hostile: a web page can hide instructions, like the review in M12. The model will treat it as plausible input ({law:l10}). Trust is designed into the program: which tools exist, who approves actions, what gets checked." }],
    recall: [
      { q: "Who actually runs a tool such as get_forecast?", options: ["The model, inside its layers", "The program around the model", "The tokeniser", "The weather service decides by itself"], answer: 1, level: 1, why: "The model writes the call; the program runs it." },
      { q: "Why does each extra round of an agent loop cost more than the one before?", options: ["The model gets slower as it learns", "Each model call re-reads the whole, growing context", "Tools charge more each time", "The temperature rises"], answer: 1, level: 2, why: "Round i reads about i × k tokens, so the total grows with the square of the rounds." },
      { q: "The forecast tool always fails, and the program has no step limit. What happens?", options: ["The model repairs the service", "The loop can go on and on, re-reading an ever longer context", "The model learns from the errors and stops", "The context window empties"], answer: 1, level: 3, why: "Nothing in the loop says stop. Limits belong in the program." },
      { q: "True or false: an agent is a new kind of AI, different from an LLM.", options: ["True", "False: it is an LLM in a loop, with a program running the tools"], answer: 1, level: 4, why: "Same next-token machine; the loop is ordinary code (Law 1)." },
      { q: "The schema says “day” must be Friday, Saturday, Sunday or Monday. Which idea from M8 can force the model's tokens to obey?", options: ["Temperature", "Constrained decoding: block every token that breaks the format", "Beam search", "The KV cache"], answer: 1, level: 5, why: "The sampler gives illegal tokens a chance of zero, then renormalises." }],
    depth: [
      ["Tool use is trained behaviour", "Post-training data shows tool descriptions, calls and results; the model learns to write calls in a special format, and the app parses them. Nothing about tools is wired into the layers."],
      ["A tool is a name, a description and a schema", "The schema (usually JSON Schema) lists argument names and types. The descriptions sit in the prompt, so writing them is prompt engineering: poor descriptions cause wrong tool choices."],
      ["Guaranteeing valid calls", "Constrained decoding can force arguments to fit the schema. Otherwise the app checks them and sends any error back to the model as text, so it can try again."],
      ["Parallel calls", "A model can ask for several independent calls in one turn; the app runs them together and returns all the results. The wait is the slowest call."],
      ["The trace is the working memory, and it gets expensive", "Thoughts, calls and results pile up in the context, and every model call re-reads the whole pile. If each round adds k tokens, round i reads about i × k, so the total grows with the square of the number of rounds."],
      ["Code as action", "Some agents write a short program that calls several tools, with loops and conditions, instead of one JSON call per round trip: fewer round trips, more power, more risk. A sandbox runs the code."],
      ["MCP's shape", "A host app runs one MCP client per server; each server offers tools, resources (readable data) and prompts over JSON-RPC. Any MCP-capable app can use any MCP server."],
      ["Why many tools hurt", "Every description costs context in every call and adds a choice; selection accuracy falls as the list grows, especially with similar names. Fixes: load tools on demand (tool search) or group tools behind specialist sub-agents."],
      ["The security shape", "An agent that combines private data, untrusted content and a way to send data out can be tricked into leaking it: Simon Willison's “lethal trifecta” (2025). Covered fully in A10."]],
    connect: { next: "f1", links: ["The same loop, drawn as two graph nodes and a conditional edge: {mod:a06}.", "When to use a loop at all, and when a fixed workflow is better: {mod:a01}.", "MCP and the agent-to-agent protocol A2A: {mod:s2}.", "Side quest before the finale: images, audio and diffusion in {mod:s1}."], line: "One agent with twelve tools gets lost. Next: the Phase 1 finale, where you explain the whole machine alone. Then Phase 2 builds the team." }
  });

  /* ------------------------------------------------------------------ pictures */
  function stopFlow() {
    const W = 360, H = 300, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "The agent loop: model call, then a check for a tool call; if yes the program runs it and loops; if no the answer goes to Maya; a round limit stops the loop." });
    svg.append(s("defs", null, s("marker", { id: "m13a", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0 10 5 0 10z", fill: "var(--ink-3)" }))));
    const box = (x, y, w, hh, t, col) => { svg.append(s("rect", { x, y, width: w, height: hh, rx: 9, fill: "var(--sheet)", stroke: col, "stroke-width": 1.8 })); t.split("\n").forEach((line, i, arr) => svg.append(s("text", { x: x + w / 2, y: y + hh / 2 + 4 + (i - (arr.length - 1) / 2) * 15, "text-anchor": "middle", "font-size": 12.5, fill: "var(--ink)", text: line }))); };
    const line = (pts, label, lx, ly) => { svg.append(s("path", { d: "M" + pts.map((p) => p.join(" ")).join(" L"), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "marker-end": "url(#m13a)" })); if (label) svg.append(s("text", { x: lx, y: ly, "font-size": 11.5, fill: "var(--ink-2)", text: label })); };
    box(110, 10, 140, 40, "Model call", "var(--llm)");
    box(95, 80, 170, 46, "Tool call in\nthe output?", "var(--code)");
    box(10, 166, 150, 50, "Run the tool,\nappend the result", "var(--code)");
    box(200, 166, 150, 50, "Send the answer\nto Maya: stop", "var(--person)");
    box(10, 246, 150, 42, "Too many rounds?\nStop with a message", "var(--bad)");
    line([[180, 50], [180, 78]]);
    line([[130, 126], [85, 164]], "yes", 86, 148);
    line([[230, 126], [275, 164]], "no", 258, 148);
    line([[10, 191], [4, 191], [4, 30], [108, 30]]);
    line([[85, 216], [85, 244]]);
    return svg;
  }
  function parallelPic() {
    const W = 420, H = 150, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "Three calls one after another take 3.2 seconds; the same three calls run together take 1.2 seconds." });
    const sc = 100, x0 = 90;
    const bar = (x, y, w, t, col) => { svg.append(s("rect", { x, y, width: w, height: 16, rx: 4, fill: col, opacity: 0.85 }), s("text", { x: x + 5, y: y + 12, "font-size": 10.5, fill: "var(--sheet)", text: t })); };
    svg.append(s("text", { x: 4, y: 26, "font-size": 12, fill: "var(--ink-2)", text: "one by one" }), s("text", { x: 4, y: 98, "font-size": 12, fill: "var(--ink-2)", text: "together" }));
    bar(x0, 16, 1.2 * sc, "Saturday", "var(--data)"); bar(x0 + 1.2 * sc, 16, 0.9 * sc, "Sunday", "var(--code)"); bar(x0 + 2.1 * sc, 16, 1.1 * sc, "Monday", "var(--llm)");
    svg.append(s("text", { x: x0 + 3.2 * sc + 6, y: 28, "font-size": 12, fill: "var(--ink)", text: "3.2 s" }));
    bar(x0, 72, 1.2 * sc, "Saturday", "var(--data)"); bar(x0, 92, 0.9 * sc, "Sunday", "var(--code)"); bar(x0, 112, 1.1 * sc, "Monday", "var(--llm)");
    svg.append(s("text", { x: x0 + 1.2 * sc + 6, y: 96, "font-size": 12, fill: "var(--ink)", text: "1.2 s: the slowest call" }));
    return svg;
  }
  function mcpPic() {
    const W = 420, H = 170, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "One host app with three MCP clients, each talking to one MCP server: weather, calendar and files. Each server offers tools, resources and prompts." });
    svg.append(s("rect", { x: 8, y: 14, width: 150, height: 142, rx: 12, fill: "none", stroke: "var(--code)", "stroke-width": 1.6 }), s("text", { x: 18, y: 32, "font-size": 11, fill: "var(--ink-3)", "letter-spacing": "0.08em", text: "HOST APP" }));
    ["Weather", "Calendar", "Files"].forEach((n, i) => {
      const y = 44 + i * 36;
      svg.append(s("rect", { x: 22, y, width: 120, height: 26, rx: 7, fill: "var(--sheet)", stroke: "var(--code)" }), s("text", { x: 82, y: y + 17, "text-anchor": "middle", "font-size": 11.5, fill: "var(--ink)", text: "MCP client " + (i + 1) }));
      svg.append(s("line", { x1: 142, y1: y + 13, x2: 250, y2: y + 13, stroke: "var(--ink-3)", "stroke-dasharray": "4 3" }), s("text", { x: 196, y: y + 9, "text-anchor": "middle", "font-size": 9.5, fill: "var(--ink-3)", text: "JSON-RPC" }));
      svg.append(s("rect", { x: 250, y: y - 4, width: 162, height: 34, rx: 8, fill: "var(--sheet)", stroke: "var(--data)", "stroke-width": 1.5 }), s("text", { x: 260, y: y + 10, "font-size": 11.5, "font-weight": 700, fill: "var(--ink)", text: n + " server" }), s("text", { x: 260, y: y + 24, "font-size": 9.5, fill: "var(--ink-2)", text: "tools · resources · prompts" }));
    });
    return svg;
  }

  /* tool search over the twelve tool descriptions, with the M12 retrieval engine */
  async function toolSearch(el, A, T) {
    await MM.load("core/rag.js");
    const R = await MM.rag.load();
    const chunks = A.ALL.map((t) => ({ doc: t.name, title: t.name, text: t.name.replace(/_/g, " ") + ". " + t.description }));
    const qIn = h("input", { type: "search", id: "m13-ts", value: "Book a room near the Eiffel Tower", "aria-label": "A request to search the tools for" });
    const out = h("div");
    const all = A.count(T, A.H.developer(A.ALL));
    function run() {
      const r = R.search(chunks, qIn.value || "Book a room near the Eiffel Tower", "hybrid", "maya");
      const top = r.slice(0, 3).map((x) => A.byName[x.c.doc]);
      const some = A.count(T, A.H.developer(top));
      out.innerHTML = "";
      out.append(h("div", { class: "meter", style: "margin:8px 0" }, h("span", null, "all 12 descriptions ", h("b", null, String(all)), " tokens"), h("span", null, "top 3 only ", h("b", null, String(some)), " tokens")),
        h("div", { class: "stack", style: "--gap:4px" }, r.map((x, i) => h("div", { style: `display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:4px 8px;border-radius:7px;${i < 3 ? "background:var(--ok-soft)" : "opacity:.62"}` }, h("span", { class: "pill" + (i < 3 ? " ok" : "") }, i < 3 ? "loaded" : "left out"), h("code", { style: "overflow-wrap:anywhere;justify-self:start" }, x.c.doc), h("span", { class: "mono", style: "font-size:.74rem;color:var(--ink-3);white-space:nowrap" }, `vec ${x.v.toFixed(2)} · kw ${x.k.toFixed(1)}`)))),
        h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "Ranked by hybrid search, as in M12: meaning (vec) and exact words (kw) are ranked separately, then the two rankings are merged."));
    }
    qIn.addEventListener("change", run);
    const chips = h("div", { class: "chips-scroll" }, ["Book a room near the Eiffel Tower", "Will it rain on Sunday?", "How much is 50 euros in pounds?", "Plan a rainy Saturday within my budget"].map((q) => h("button", { class: "chip", type: "button", onclick: () => { qIn.value = q; run(); } }, q)));
    el.append(h("label", { class: "field", for: "m13-ts" }, "Request", qIn), chips, out, h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "Try the last chip: a request that needs several tools gets a mixed top three. One search cannot plan a whole trip."));
    run();
  }
})();
