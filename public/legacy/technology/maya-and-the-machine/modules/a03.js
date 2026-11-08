/* A3 · State — one shared record that every node reads and writes, and the merge rules that keep it sane. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const RULES = { replace: "replace (no reducer)", append: "append", min: "keep the smallest", add: "add", add_messages: "add_messages" };
  const spec = (rule) => (rule === "replace" ? {} : { reducer: rule });
  const chat = (msgs) => h("div", { class: "stack", style: "--gap:6px" }, (msgs || []).map((m) => h("div", { class: "bubble", style: `font-size:.88rem;padding:8px 11px;${m.type === "human" ? "background:var(--line2-soft)" : ""}` }, h("strong", null, m.type === "human" ? "Maya: " : m.type === "ai" ? "AI: " : m.type + ": "), m.content, m.id ? h("span", { class: "faint mono", style: "font-size:.74rem;margin-left:6px" }, "id " + m.id) : null)));
  const field = (k, v) => h("div", { class: "row", style: "--gap:8px;align-items:baseline" }, h("span", { class: "mono", style: "font-size:.85rem;color:var(--ink-3)" }, k), h("span", { class: "mono", style: "font-size:.88rem" }, JSON.stringify(v)));

  /* the Reducer Lab's two specialists */
  const FIELDS = [
    { k: "hotel", t: "Hotel Lumiere", b: "Hotel Soleil", rules: ["replace"], help: "one choice: a single text value" },
    { k: "options", t: ["Lumiere: 190 a night"], b: ["Soleil: 140 a night"], rules: ["replace", "append"], help: "a list of hotels found" },
    { k: "cheapest", t: 190, b: 140, rules: ["replace", "min"], help: "the lowest price per night found" },
    { k: "llm_calls", t: 1, b: 1, rules: ["replace", "add"], help: "a counter of model calls" },
    { k: "notes", t: ["Lumiere: next to the Orsay museum"], b: ["Soleil: 20 minutes by metro"], rules: ["replace", "append"], help: "starts with Maya's note" }];

  MM.defineModule({
    id: "a03",
    mystery: { title: "Two helpers, one notebook", text: "Maya's planner has a travel specialist and a budget specialist. At the same moment, both find a hotel, and both write it on the plan's “hotel” line.\n\nWhich one wins? In LangGraph, neither: the run stops with an error. Why would a framework refuse to choose, instead of simply keeping the last one?" },
    where: { text: "Below the waterline, the first part of the engine: the state, one shared record that every node reads and writes. Everything a run knows lives here." },
    predict: { q: "Two nodes run in the same round. Both return a value for the field “hotel”, which has no merge rule. What happens?", options: ["The second write wins", "The first write wins", "The run stops with an InvalidUpdateError", "Both values are kept in a list"], answer: 2, why: "A field with no reducer (merge rule) keeps one value and accepts one write per round. Two writes in the same round have no meaningful order, so LangGraph refuses rather than silently dropping one. Its real message: “At key 'hotel': Can receive only one value per step. Use an Annotated key to handle multiple values.”" },
    story: [
      { title: "One shared record", truth: "TOY",
        text: "A graph's [[state]] is one shared record of everything the run knows, split into named fields: the request, the budget, the research, the draft, the cost. The list of fields is the [[state-schema|state schema]] (the plan of the record: which fields exist and what kind of value each one holds). Here is Maya's team state before the run starts.",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.board(G.teamGraph().schema, G.teamInput(), null), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Nine fields. The right-hand column is each field's merge rule; most say “replace”, and “research” says “append”.")); } },
      { title: "A node returns only what it changes", truth: "TOY",
        text: "A node is a function: the state goes in, an update comes out. The update is a small dictionary (a list of field: value pairs) holding **only the fields this node changed**. The node never writes into the state itself; the engine does that. So the writer reads everything, but returns just three fields.",
        visual: async (el, api) => {
          const G = await api.graph(); const sch = G.teamGraph().schema;
          const before = Object.assign(G.teamInput(), { plan: "3 rain-friendly days", research: ["weather: rain Saturday", "travel: 660 euros so far", "activities: Orsay, Louvre"] });
          const upd = { draft: "draft 1", cost: 970, revisions: 1 };
          el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "The writer reads the whole state"), G.board(sch, before, null, { hide: ["approved", "booking"] })),
            h("div", null, h("div", { class: "eyebrow" }, "…and returns only this update"), h("div", { class: "panel stack", style: "--gap:4px;margin:6px 0 10px" }, Object.entries(upd).map(([k, v]) => field(k, v))), h("div", { class: "eyebrow" }, "The engine merges it in"), G.board(sch, Object.assign({}, before, upd), new Set(Object.keys(upd)), { hide: ["request", "approved", "booking"], keep: true })))); } },
      { title: "Nodes never call each other", truth: "SKETCH",
        text: "Nodes never talk to each other directly. They read the state and return updates to it, like specialists who never meet but share one whiteboard: the blackboard pattern from the 1990s (A1). This is {law:g2}. It makes each node testable on its own: hand it a state, check its update. The one exception is [[send|Send]] (A5), which hands one task its own private input.",
        visual: (el) => {
          const svg = s("svg", { viewBox: "0 0 460 230", class: "figure", style: "max-width:520px;margin:0 auto", role: "img", "aria-label": "Four nodes around a shared state, with arrows only to and from the state" });
          svg.append(s("rect", { x: 160, y: 85, width: 140, height: 60, rx: 10, fill: "color-mix(in srgb, var(--data) 12%, var(--sheet))", stroke: "var(--data)", "stroke-width": 2 }), s("text", { x: 230, y: 112, "text-anchor": "middle", "font-size": 14, class: "t-disp", text: "shared state" }), s("text", { x: 230, y: 130, "text-anchor": "middle", "font-size": 10.5, fill: "var(--ink-2)", text: "the only meeting place" }));
          [["lead", 70, 40], ["weather", 390, 40], ["writer", 70, 190], ["critic", 390, 190]].forEach(([n, x, y]) => {
            svg.append(s("path", { d: `M${x < 230 ? x + 45 : x - 45} ${y + (y < 115 ? 8 : -8)} L${x < 230 ? 165 : 295} ${y < 115 ? 92 : 138}`, stroke: "var(--ink-3)", "stroke-width": 1.5, fill: "none", "stroke-dasharray": "5 4" }));
            svg.append(s("rect", { x: x - 45, y: y - 16, width: 90, height: 32, rx: 8, fill: "color-mix(in srgb, var(--llm) 8%, var(--sheet))", stroke: "var(--llm)" }), s("text", { x, y: y + 5, "text-anchor": "middle", "font-size": 12.5, class: "t-disp", text: n }));
          });
          svg.append(s("text", { x: 230, y: 30, "text-anchor": "middle", "font-size": 11, fill: "var(--bad)", text: "no arrows between nodes" }));
          el.append(svg, h("p", { class: "faint", style: "font-size:.86rem" }, "Each dashed line means “reads the state, returns an update”."));
        } },
      { title: "Every field has a merge rule", truth: "REAL",
        text: "What if two nodes update the same field in the same round? Each field has a [[reducer]] (its merge rule: how a new update combines with the value already there). With no reducer, the rule is “replace”, and only **one** write per round is allowed. With the reducer “append” (add to the end of the list), every write is kept. This is {law:g3}. Both runs below are real.",
        visual: async (el, api) => {
          const G = await api.graph(); const a = G.scenarios.no_reducer(), b = G.scenarios.with_reducer();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["no_reducer", "with_reducer"])), h("div", { class: "two" },
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "hotel: replace (no reducer)"), h("p", { style: "font-size:.9rem" }, "travel writes “Hotel Lumiere”, budget writes “Hotel Soleil”, in the same round."), G.outcomeBox(a.outcome)),
            h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "hotels: append"), h("p", { style: "font-size:.9rem" }, "The same two writes, to a list with an append rule."), h("div", { class: "callout ok", style: "margin-top:10px" }, h("strong", null, "Merged: "), JSON.stringify(b.state.hotels)), h("p", { class: "faint", style: "font-size:.84rem;margin-top:6px" }, "Budget's hotel comes first: writes are merged in task order, and tasks are sorted by node name.")))); } },
      { kind: "spotlight", title: "The merge happens between rounds", truth: "TOY",
        text: "Inside one round, every node reads the **same snapshot** (a frozen copy of the state, taken as the round starts). Their updates wait in a buffer (a holding area) and are merged together when the round ends, in a fixed order. So two nodes in the same round can never see each other's updates, and the engine sees both writes at once. That is how it catches a race (two writers, one slot) instead of letting the faster one win by luck.",
        intuition: "An exam hall: everyone answers the same question paper, nobody sees anyone else's answers, and all the papers are collected and marked together at the end.",
        breaks: "Exam papers can be marked in any order. Here the marking order is fixed (task order), so the merged result is the same on every run, whichever node finished first.",
        visual: (el) => {
          const panels = [["1 · Snapshot", "The round starts. The state is frozen: notes = [“Maya: near a metro”]."], ["2 · Both nodes read it", "travel and budget run side by side. Each sees the same frozen notes; neither sees the other."], ["3 · Updates wait", "buffer: budget → [“Soleil: 20 min by metro”], travel → [“Lumiere: by the Orsay museum”]"], ["4 · Merge, in task order", "append, budget first, then travel. One new state, saved as the round ends."]];
          let i = 0;
          const row = h("div", { class: "two", style: "grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))" });
          const btn = h("button", { class: "btn small primary" }, "Next moment", MM.icon("next"));
          const draw = () => { row.innerHTML = ""; panels.forEach(([t, d], j) => row.append(h("div", { class: "panel" + (j === i ? " glow" : ""), style: `opacity:${j <= i ? 1 : 0.35};transition:opacity .3s` }, h("div", { class: "eyebrow" }, t), h("p", { style: "font-size:.88rem;margin:4px 0 0" }, d)))); btn.disabled = i >= panels.length - 1; };
          btn.onclick = () => { i++; draw(); };
          el.append(row, h("div", { class: "row", style: "margin-top:10px" }, btn, h("button", { class: "btn small ghost", onclick: () => { i = 0; draw(); } }, "Start again")));
          draw();
        } },
      { title: "The chat reducer: add_messages", truth: "REAL",
        text: "A chat keeps a list of messages. With no reducer, a node that returns its reply **replaces** the whole list, and Maya's question disappears. The [[add-messages|add_messages]] reducer appends new messages, **replaces** a message that has the same id (an edit), and **deletes** one when it receives a RemoveMessage (a “delete this id” note). All three runs below are real.",
        visual: async (el, api) => {
          const G = await api.graph(); const p = G.scenarios.messages_plain(), r = G.scenarios.messages_reducer(), e = G.scenarios.messages_edit();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["messages_plain", "messages_reducer", "messages_edit"])), h("div", { class: "three" },
            h("div", null, h("div", { class: "eyebrow" }, "No reducer"), chat(p.state.messages), h("p", { class: "faint", style: "font-size:.82rem" }, "The question is gone.")),
            h("div", null, h("div", { class: "eyebrow" }, "add_messages"), chat(r.state.messages), h("p", { class: "faint", style: "font-size:.82rem" }, "Appended.")),
            h("div", null, h("div", { class: "eyebrow" }, "Edit and delete"), chat(e.state.messages), h("p", { class: "faint", style: "font-size:.82rem" }, "“Pack sunglasses.” (id ai-1) was replaced by a message with the same id; the internal note was removed."))));
        } },
      { title: "Pick the rule for the job", truth: "TOY",
        text: "A reducer is a tiny function: old value and new value in, merged value out. A good choice depends on what the field means. A running total wants “add”; the cheapest price so far wants “keep the smallest”; a list of findings wants “append”. You can write your own. Rules like “add” and “keep the smallest” give the same answer in any order; for the others, LangGraph's fixed order keeps results repeatable.",
        visual: (el) => el.append(h("div", { class: "scroll-x" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "rule"), h("th", null, "good for"), h("th", null, "old"), h("th", null, "new"), h("th", null, "result"))),
          h("tbody", null, [["replace", "one current value", "900", "885", "885"], ["append", "findings, notes", "[a]", "[b]", "[a, b]"], ["add", "counters, totals", "3", "2", "5"], ["keep the smallest", "best price so far", "190", "140", "140"], ["add_messages", "a conversation", "[question]", "[reply]", "[question, reply]"]].map((r) => h("tr", null, r.map((c, j) => h("td", { class: j > 1 ? "mono" : "" }, c)))))))) },
      { title: "Overwrite: the escape hatch", truth: "REAL",
        text: "Sometimes you must reset a list that has an append rule, for example to throw away rejected hotels. An Overwrite (a special wrapper around a value) skips the reducer for one write and replaces the whole value. In the same round the Overwrite beats every normal append, whether that append is merged before it or after it, and two Overwrites at once are an error. This bends {law:g3}.",
        visual: async (el, api) => {
          const G = await api.graph(); const o = G.scenarios.overwrite(), t = G.scenarios.overwrite_twice();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["overwrite", "overwrite_twice"])), h("div", { class: "log" },
            h("div", null, "round 1 · research appends → " + JSON.stringify(o.steps[1].after.options)),
            h("div", null, "round 2 · extra appends [\"Lumiere 190\"]; reset writes Overwrite([\"Soleil 140\"])"),
            h("div", { class: "ok" }, "after round 2 → " + JSON.stringify(o.state.options) + "  (the append was dropped)"),
            h("div", { class: "err" }, "two Overwrites in one round → " + t.outcome.error + ": " + t.outcome.message))); } },
      { title: "What goes in, what comes out", truth: "SKETCH",
        text: "A graph can declare an input schema (what callers may send), an output schema (what callers get back) and private fields that only the nodes use. Read-only facts for the whole run, such as who is asking or which model to use, belong in the runtime context (read-only settings passed with each run), not in the state, so no node can change them by accident.",
        precision: "The state schema can be a TypedDict (names and types only), a dataclass (adds default values) or a Pydantic model (adds checking of values). Each field becomes a channel: a slot with an update rule.",
        visual: (el) => el.append(h("div", { class: "row", style: "--gap:8px;align-items:stretch" }, [["input schema", "request, budget"], ["inside the graph", "+ plan, research, draft, cost, revisions, approved"], ["output schema", "draft, cost, booking"]].map(([t, d], i) => h("div", { class: "panel grow", style: `min-width:150px;${i === 1 ? "border-color:var(--data)" : ""}` }, h("div", { class: "eyebrow" }, t), h("p", { class: "mono", style: "font-size:.84rem;margin:4px 0 0" }, d)))), h("p", { class: "faint", style: "font-size:.86rem;margin-top:8px" }, "Runtime context, beside it: user id “maya”, model name. Read-only.")) },
      { kind: "snap", title: "Stage C: one clean record", truth: "SKETCH",
        text: "Maya's planner now shares facts cleanly. The state is the run's memory: a schema (which fields exist) plus reducers (how each field merges). Nodes read it whole and write it in parts, and the engine merges the parts between rounds. Next: how the graph reads this record to decide where to go.",
        visual: async (el, api) => { const G = await api.graph(); el.append(G.board({ request: {}, budget: {}, research: { reducer: "append" }, draft: {}, cost: {}, llm_calls: { reducer: "add" }, messages: { reducer: "add_messages" } }, { request: "3 rain-friendly days", budget: 900, research: ["weather: rain Saturday", "activities: Orsay, Louvre"], draft: "draft 2", cost: 885, llm_calls: 6, messages: [{ type: "human", content: "Plan three rain-friendly days in Paris within my budget." }] }, null)); } }],
    lab: {
      title: "The Reducer Lab", truth: "TOY",
      intro: "Two specialists, travel and budget, report on hotels. Choose a merge rule for each field, choose whether they run in the same round or one after the other, then run it in this page's engine, which follows LangGraph's merge rules exactly (checked against every recorded real run).",
      tries: ["Run it as it is. Which fields would conflict, and which one does LangGraph report?", "Give every list and number a reducer. What is still left that no reducer can fix?", "Switch to “one after the other”. Why does “replace” suddenly work, and whose hotel wins?", "Turn on the bug “travel returns the whole notes list”. What happens with append? With replace?", "Fix the hotel conflict by design: give each specialist its own field."],
      async mount(el, api) {
        const G = await api.graph();
        const st = { mode: "parallel", bug: false, split: false, rules: { hotel: "replace", options: "replace", cheapest: "replace", llm_calls: "replace", notes: "replace" } };
        const table = h("div", { class: "scroll-x" }), runBox = h("div"), verdict = h("div", { style: "margin-top:10px" });
        const seg = MM.seg([{ value: "parallel", label: "Same round" }, { value: "chain", label: "One after the other" }], st.mode, (v) => { st.mode = v; reset(); });
        const bug = h("input", { type: "checkbox", id: "rl-bug" }), split = h("input", { type: "checkbox", id: "rl-split" });
        bug.onchange = () => { st.bug = bug.checked; reset(); };
        split.onchange = () => { st.split = split.checked; reset(); };
        const fields = () => (st.split ? [{ k: "travel_pick", t: "Hotel Lumiere", b: undefined, rules: ["replace"], help: "only travel writes it" }, { k: "budget_pick", t: undefined, b: "Hotel Soleil", rules: ["replace"], help: "only budget writes it" }] : [FIELDS[0]]).concat(FIELDS.slice(1));
        const rule = (k) => st.rules[k] || "replace";
        function build() {
          const schema = {};
          fields().forEach((f) => (schema[f.k] = spec(rule(f.k))));
          const write = (who) => (state) => { const u = {}; fields().forEach((f) => { const v = f[who]; if (v === undefined) return; u[f.k] = f.k === "notes" && who === "t" && st.bug ? state.notes.concat(v) : v; }); return u; };
          const g = G.graph(schema).node("travel", write("t"), { kind: "llm" }).node("budget", write("b"), { kind: "llm" });
          if (st.mode === "parallel") g.edge(G.START, "travel").edge(G.START, "budget").edge("travel", G.END).edge("budget", G.END);
          else g.edge(G.START, "travel").edge("travel", "budget").edge("budget", G.END);
          return g;
        }
        const input = () => { const v = { notes: ["Maya: near a metro"] }; if (rule("options") === "replace") v.options = []; if (rule("llm_calls") === "replace") v.llm_calls = 0; return v; };
        const show = (v) => (v === undefined ? "—" : typeof v === "string" ? "“" + v + "”" : JSON.stringify(v));
        function drawTable(res) {
          table.innerHTML = "";
          const conflicts = st.mode === "parallel" ? fields().filter((f) => f.t !== undefined && f.b !== undefined && rule(f.k) === "replace").map((f) => f.k) : [];
          table.append(h("table", { class: "tbl", style: "min-width:620px" }, h("thead", null, h("tr", null, h("th", null, "field"), h("th", null, "travel returns"), h("th", null, "budget returns"), h("th", null, "merge rule"), h("th", null, "after the run"))),
            h("tbody", null, fields().map((f) => {
              const sel = h("select", { "aria-label": "Merge rule for " + f.k, style: "width:auto;min-width:9rem" }, f.rules.map((r) => h("option", { value: r, selected: rule(f.k) === r }, RULES[r])));
              sel.disabled = f.rules.length === 1;
              sel.onchange = () => { st.rules[f.k] = sel.value; reset(); };
              const tv = f.k === "notes" && st.bug ? "the whole list + " + show(f.t) : show(f.t);
              let after = h("span", { class: "faint" }, "not run yet");
              if (res) after = res.outcome.status === "error" ? (conflicts.includes(f.k) ? h("strong", { style: "color:var(--bad)" }, "✗ conflict") : h("span", { class: "faint" }, "not merged (the round failed)")) : h("span", { class: "mono", style: "font-size:.85rem" }, show(res.state[f.k]));
              return h("tr", null, h("td", null, h("strong", { class: "mono" }, f.k), h("div", { class: "faint", style: "font-size:.8rem" }, f.help)), h("td", { class: "mono", style: "font-size:.84rem" }, tv), h("td", { class: "mono", style: "font-size:.84rem" }, show(f.b)), h("td", null, sel), h("td", null, after));
            }))));
          return conflicts;
        }
        function reset() { runBox.innerHTML = ""; verdict.innerHTML = ""; drawTable(null); }
        function run() {
          const g = build(), res = g.compile().run(input());
          const conflicts = drawTable(res);
          verdict.innerHTML = ""; runBox.innerHTML = "";
          if (res.outcome.status === "error") verdict.append(G.outcomeBox(res.outcome), h("p", { class: "muted", style: "font-size:.9rem;margin-top:6px" }, `Fields that would conflict: ${conflicts.join(", ")}. LangGraph stops at the first one it meets and merges nothing from this round.`));
          else {
            const dup = (res.state.notes || []).filter((x) => x === "Maya: near a metro").length > 1;
            const anyReplace = fields().some((f) => rule(f.k) === "replace" && f.t !== undefined && f.b !== undefined);
            verdict.append(h("div", { class: "callout " + (dup ? "warn" : "ok") }, h("strong", null, dup ? "It ran, but look at notes: " : "The run finished. "), dup ? "Maya's note is there twice. Travel returned the old list plus its note, and append added all of it again." : st.mode === "chain" && anyReplace ? "One write per round, so “replace” is legal: each write replaces the one before. Budget runs second, so its values win, and whatever was replaced (Maya's note too, if notes uses replace) is simply gone." : "Every write found a merge rule, so nothing was lost or refused."));
          }
          const spec2 = { W: 520, H: st.mode === "parallel" ? 170 : 90, nodes: st.mode === "parallel" ? { travel: { x: 260, y: 45, kind: "llm" }, budget: { x: 260, y: 125, kind: "llm" } } : { travel: { x: 200, y: 45, kind: "llm" }, budget: { x: 340, y: 45, kind: "llm" } }, start: { x: 50, y: st.mode === "parallel" ? 85 : 45 }, end: { x: 470, y: st.mode === "parallel" ? 85 : 45 } };
          G.player(runBox, { builder: g, spec: spec2, run: res, schema: g.schema });
          api.done();
        }
        el.append(h("div", { class: "row", style: "--gap:10px;margin-bottom:10px" }, h("span", { class: "eyebrow" }, "Order"), seg),
          table,
          h("div", { class: "stack", style: "--gap:6px;margin-top:10px" },
            h("label", { for: "rl-bug", class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, bug, "Bug: travel returns the whole notes list plus its note, instead of only its note"),
            h("label", { for: "rl-split", class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, split, "Fix by design: each specialist writes its own field (travel_pick, budget_pick)")),
          h("div", { style: "margin-top:10px" }, h("button", { class: "btn primary", onclick: run }, MM.icon("play"), "Run")), verdict, h("div", { style: "margin-top:12px" }, runBox));
        reset();
      } },
    breakit: {
      title: "Break the shared state", truth: "REAL",
      intro: "Four classic state bugs. Each one below is a real LangGraph 1.2.17 run, re-run in your browser.",
      cases: [
        { name: "Two writers, no reducer", what: "travel and budget run in the same round and both write “hotel”, a field with no reducer.", action: "Run it", result: "InvalidUpdateError: At key 'hotel': Can receive only one value per step. Use an Annotated key to handle multiple values.", why: "A replace field takes one write per round. Fix it with a reducer, by giving each writer its own field, or by putting the writers in different rounds.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["no_reducer"])); } },
        { name: "A chat with no reducer", what: "The messages field has no reducer. The assistant returns its one new reply.", action: "Run it", result: "The conversation now holds only the reply. Maya's question is gone, and the next model call will not know what was asked.", why: "With no reducer the new list replaces the old one. Chat state needs add_messages, which appends and edits by id.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["messages_plain"]), h("div", { style: "margin-top:8px" }, chat(G.scenarios.messages_plain().state.messages))); } },
        { name: "Returning the whole list", what: "notes has an append rule and already holds “Maya: near a metro”. The travel node returns the old list plus its new note.", action: "Run it", result: "notes = [“Maya: near a metro”, “Maya: near a metro”, “Lumiere: next to the Orsay museum”]: Maya's note is duplicated, and it doubles again every time this node runs.", why: "Append adds whatever you return. Return only the new items and let the reducer do the merging.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["double_append"]), h("div", { class: "mono", style: "font-size:.85rem;margin-top:8px" }, JSON.stringify(G.scenarios.double_append().state.notes))); } },
        { name: "Two resets at once", what: "Two nodes in the same round both write an Overwrite to the same list.", action: "Run it", result: "InvalidUpdateError: Can receive only one Overwrite value per super-step.", why: "An Overwrite says “this is the whole new value”. Two of them in one round contradict each other, exactly like two writes to a replace field.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["overwrite_twice"])); } }],
      explain: { q: "Why does LangGraph raise an error instead of letting the last write win?", options: ["Because the error is easier to program", "Because writes in the same round have no meaningful order, so keeping one would silently lose the other", "Because Python cannot store two values", "Because the first node is always right"], answer: 1, why: "Nodes in one round run side by side; which one finishes last is luck. Refusing turns a hidden data loss into a visible, fixable error." } },
    clinic: [
      { belief: "Each node keeps its own memory between rounds.", test: "In the Reducer Lab, run “one after the other”: budget learns what travel did only because travel wrote it into the state.", truth: "Nodes are plain functions with no memory of their own. Everything a run knows is in the shared state (and, with a checkpointer, in its saved copies, A8)." },
      { belief: "A node must return the whole state.", test: "Turn on the double-append bug: returning the old list as well duplicates Maya's note.", truth: "A node returns only the fields it changed. Returning old values writes them again: duplicates with append, conflicts with replace." },
      { belief: "Nodes running side by side can see each other's updates.", test: "Step through the spotlight: both nodes read the same frozen snapshot, and the merge happens only when the round ends.", truth: "All nodes in a round read the same snapshot. Their updates are merged together after the round, in task order." }],
    explain: { prompt: "Explain how the steps of a LangGraph system share information: the state, the schema, partial updates, reducers, and what happens when two nodes write the same field in one round.", points: ["One shared state with named fields (the schema)", "Each node reads the state and returns only the fields it changed", "Nodes never call each other; they meet only in the state (except Send)", "Each field's reducer decides how updates merge: replace, append, add, add_messages…", "Replace allows one write per round; two cause InvalidUpdateError", "Updates in a round are merged together at its end, in a fixed task order"] },
    skeptic: [
      { q: "Why not let nodes call each other like ordinary functions?", laws: ["g2"], a: "Because then the engine could not see, save or control the conversation between them. When every exchange goes through the state ({law:g2}), each step's input and output is visible and saved, nodes can run side by side safely, a run can pause and resume, and any node can be tested alone with a made-up state." },
      { q: "Programmers are told to avoid global variables. Isn't a shared state the same mistake?", laws: ["g2", "g3"], a: "It is shared, but it is not a free-for-all. Nobody writes to it directly: every change is a returned update that the engine merges between rounds, using a declared rule per field ({law:g3}), and every version can be saved. That is closer to a database with rules than to a global variable anyone can change at any time." },
      { q: "If updates are merged in task order, isn't the result arbitrary?", laws: ["g3", "g4"], a: "It is fixed, not arbitrary: normal tasks are ordered by node name and Send tasks by creation order, so the same run gives the same state every time. It does not depend on which node finished first: in a real recorded run, b_fast finished before a_slow, yet a_slow's note comes first. For rules like add or keep-the-smallest, order does not matter at all." }],
    recall: [
      { q: "What does a node return?", options: ["The whole state", "Only the fields it changed", "Nothing: it writes into the state directly", "A message to the next node"], answer: 1, level: 1, why: "A partial update; the engine merges it." },
      { q: "A field has no reducer and two nodes write it in the same round. What happens?", options: ["The last write wins", "Both are kept", "InvalidUpdateError", "The field is cleared"], answer: 2, level: 2, why: "Replace fields accept one write per round." },
      { q: "add_messages receives a message whose id is already in the list. What happens?", options: ["It is appended", "It replaces the old message", "It is ignored", "An error"], answer: 1, level: 3, why: "Same id means an edit." },
      { q: "Two nodes run in the same round. Can the second one read what the first one wrote in that round?", options: ["Yes, if it finished first", "No: both read the same snapshot", "Only with add_messages", "Only for lists"], answer: 1, level: 4, why: "Writes are buffered and merged when the round ends." },
      { q: "From A2: what does compiling a graph check?", options: ["That the plan fits the budget", "The structure: real nodes, an entry point", "That no loop runs forever", "The state's values"], answer: 1, level: 5, why: "Structure only, not intent." }],
    depth: [
      ["Channels", "Each state field becomes a channel. With no reducer it is a LastValue channel: one write per super-step. With a reducer it is a BinaryOperatorAggregate channel: it folds every write into the value with the reducer."],
      ["Attaching a reducer", "In Python a reducer is attached to a field's type, for example a list annotated with operator.add (append) or with add_messages."],
      ["Starting values", "A field with a reducer starts from its empty value, such as an empty list. That is why the very first checkpoint of a run (step −1) holds only those empty values."],
      ["Merge order", "Writes are applied in task order: normal tasks by node name, Send tasks in the order they were created. Finish order never matters (REAL: merge_order)."],
      ["Overwrite", "Overwrite(value) skips the reducer for one write. Normal writes merged before it are replaced, and normal writes after it in the same round are ignored; two Overwrites in one round raise InvalidUpdateError (REAL)."],
      ["add_messages in full", "Appends new messages, replaces messages with the same id, deletes a message on RemoveMessage(id), gives messages without an id a fresh one, and turns plain dictionaries into message objects."],
      ["Runtime context", "Read-only data for the whole run (the user, the model, an API key) is passed separately from the state, so no node can change it."]],
    connect: { links: ["How the graph reads this state to choose its next step: {mod:a04}.", "Exactly when, inside a round, the merge happens: {mod:a05}.", "How every version of this state is saved under a thread: {mod:a08}."], line: "The planner's steps now share one clean record. Next: how the graph reads that record to decide where to go." }
  });
})();
