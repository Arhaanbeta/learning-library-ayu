/* A9 · Humans in the Loop — interrupt(), resume, and the rule that the paused node runs again from its first line. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const bookSpec = { W: 620, H: 110, nodes: { plan: { x: 170, y: 55, kind: "llm" }, approve: { x: 330, y: 55, kind: "human", label: "Maya approves", w: 130 }, book: { x: 490, y: 55, kind: "tool" } }, start: { x: 50, y: 55 }, end: { x: 590, y: 55 } };
  const bookShape = (G) => G.graph({ plan: {}, approved: {}, booking: {} }).node("plan", () => ({}), { kind: "llm" }).node("approve", () => ({}), { kind: "human" }).node("book", () => ({}), { kind: "tool" }).edge(G.START, "plan").edge("plan", "approve").edge("approve", "book").edge("book", G.END);
  const sideLog = (list) => h("div", { class: "log" }, list.map((x) => h("div", { class: /charged/.test(x) ? "err" : /BOOKED|confirmed/.test(x) ? "ok" : "" }, x)));

  MM.defineModule({
    id: "a09",
    mystery: { title: "Charged twice", text: "The planner asks Maya: “Book Hotel Lumiere for 570 euros?” She taps Approve the next morning.\n\nHer bank shows two charges of 570 euros. The model never made a second booking, and Maya only tapped once. Where did the second charge come from?" },
    where: { text: "The human gate in A0's team: the moment the run stops and waits for Maya. Underneath, it is A8's checkpoint, used as a pause button." },
    predict: { q: "A node does two things: first it prepares a summary, then it calls interrupt() to ask Maya. She answers the next day. On resume, what runs?", options: ["Only the code after interrupt()", "The whole node again, from its first line", "Nothing: the answer is just stored", "The whole graph, from START"], answer: 1, why: "LangGraph saves state between nodes, not halfway through one. On resume the paused node starts again from the top, and this time interrupt() returns Maya's answer instead of pausing. So the summary is prepared twice (REAL, from the team run in A0)." },
    story: [
      { title: "interrupt(): stop and ask", truth: "REAL",
        text: "Inside a node, [[interrupt|interrupt()]] (a call that pauses the run and hands a question to a person) stops the run. The checkpointer saves everything, and nothing keeps running. Maya can answer in seconds or in days. To [[resume|resume]] (continue a paused run), the app sends her answer as a Command(resume = answer) on the same thread. Step through both halves of this real run.",
        visual: async (el, api) => {
          const G = await api.graph(); const r = G.scenarios.interrupt(); const g = bookShape(G);
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["interrupt"])));
          const box = h("div"), seg = MM.seg([{ value: "first", label: "1 · Run until the pause" }, { value: "second", label: "2 · Resume with “approve”" }], "first", (v) => show(v));
          el.append(seg, h("div", { style: "margin-top:8px" }, box));
          function show(v) { box.innerHTML = ""; const p = G.player(box, { builder: g, spec: bookSpec, run: r[v], schema: g.schema }); p.show(p.frames.length - 1); }
          show("first");
        } },
      { title: "The node starts again from the top", truth: "REAL",
        text: "On resume, the paused node runs again **from its first line**; this time interrupt() returns the answer instead of pausing. Any code before the interrupt therefore runs twice. In A0's team that was harmless: the booking summary was prepared twice. In the second real run below, the node charged the card before asking. That is Maya's double charge.",
        visual: async (el, api) => {
          const G = await api.graph(); const t = G.scenarios.team(), c = G.scenarios.charge_before_interrupt();
          el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["team", "charge_before_interrupt"])), h("div", { class: "two" },
            h("div", null, h("div", { class: "eyebrow" }, "A0's team: side effects"), sideLog(t.side_effects)),
            h("div", null, h("div", { class: "eyebrow" }, "Charge before asking: side effects"), sideLog(c.side_effects))));
        } },
      { kind: "spotlight", title: "Safe to repeat, or after the question", truth: "TOY",
        text: "Two rules make pauses safe. Put actions with real effects **after** the approval, ideally in their own node (book runs only once Maya says yes). And make anything before the interrupt [[idempotent|idempotent]] (safe to repeat: doing it twice has the same effect as doing it once), for example by sending the bank a booking key so a repeated charge is recognised and ignored ({tool:t11}).",
        intuition: "A light switch and a doorbell. Pressing “lights on” twice leaves the lights on. Pressing the doorbell twice rings twice.",
        breaks: "Real actions are rarely as simple as a switch. Making a payment idempotent needs the other system's help (it must recognise the repeated key), so moving it after the approval is the safer default.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow", style: "color:var(--bad)" }, "Unsafe before interrupt()"), h("ul", { style: "margin:4px 0 0;padding-left:18px;font-size:.9rem" }, ["charge the card", "send an email", "book a room", "add 1 to a counter"].map((x) => h("li", null, x)))), h("div", { class: "panel" }, h("div", { class: "eyebrow", style: "color:var(--ok)" }, "Safe before interrupt()"), h("ul", { style: "margin:4px 0 0;padding-left:18px;font-size:.9rem" }, ["read the forecast", "build the summary text", "set status = “waiting”", "a charge with an idempotency key"].map((x) => h("li", null, x)))))) },
      { title: "Approve, edit or reject", truth: "TOY",
        text: "The answer can be any data, not just “yes”. Maya can approve, edit (change the proposal before it happens: Hotel Soleil instead of Lumiere) or reject. The node reads the answer and decides, often with a Command that updates the state and picks the next node in one move (A4). Try all three in the HITL Desk.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["approve", "→ book Hotel Lumiere, 885 euros in total"], ["edit: Hotel Soleil", "→ update the plan, then book: 735 euros"], ["reject", "→ END: nothing is booked or charged"]].map(([a, b]) => h("div", { class: "row", style: "--gap:8px" }, h("span", { class: "pill" }, a), h("span", { class: "muted" }, b))))) },
      { title: "Several questions in one node", truth: "REAL",
        text: "A node may ask more than one question. LangGraph matches answers to questions by their order inside the node. In this real run the node asks for the dates, then the budget: it pauses twice, and because each resume re-runs it from the top, the node starts three times in total.",
        visual: async (el, api) => { const G = await api.graph(); const r = G.scenarios.two_interrupts(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["two_interrupts"])), h("div", { class: "log" }, h("div", null, `run 1 → pauses: “${r.runs[0].outcome.interrupts[0]}”`), h("div", null, `run 2 (answer: “Fri 13 to Mon 16 Nov”) → pauses: “${r.runs[1].outcome.interrupts[0]}”`), h("div", { class: "ok" }, `run 3 (answer: “900 euros”) → summary = “${r.runs[2].state.summary}”`), h("div", { class: "dim" }, `the node started ${r.node_starts} times`))); } },
      { title: "A try/except swallows the pause", truth: "REAL",
        text: "interrupt() works by raising a special signal that LangGraph catches. A bare try/except around it catches that signal first, so the run never pauses. In this real run the code fell back to “approve” inside the except block, and the hotel was booked without anyone being asked.",
        visual: async (el, api) => { const G = await api.graph(); const r = G.scenarios.interrupt_try_except(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["interrupt_try_except"])), h("div", { class: "log" }, r.steps.filter((x) => !x.start).map((x) => h("div", null, `round ${x.step}: ${x.tasks.map((t) => t.name + " writes " + JSON.stringify(Object.fromEntries(t.writes || []))).join(", ")}`)), h("div", { class: "err" }, `outcome: ${r.outcome.status}; booking = “${r.state.booking}”, and nobody was asked`))); } },
      { title: "No checkpointer, no resume", truth: "REAL",
        text: "A pause is only as good as what was saved. Without a checkpointer the run still stops at interrupt(), but there is nothing to resume from. Sending the answer fails with LangGraph's real message, shown below.",
        visual: async (el, api) => { const G = await api.graph(); const r = G.scenarios.interrupt_no_saver(); el.append(h("div", { style: "margin-bottom:8px" }, G.verified(["interrupt_no_saver"])), h("div", { class: "log" }, h("div", null, `run 1 → ${r.first.outcome.status} at ${r.first.outcome.next.join(", ")}: “${r.first.outcome.interrupts[0].question}”`), h("div", { class: "err" }, "resume → " + r.resume_error))); } },
      { title: "Typed answers and breakpoints", truth: "REAL",
        text: "Recent LangGraph versions let interrupt() describe the answer it expects (a response schema). An app can then draw a proper form, and an answer of the wrong shape is rejected without being saved, so the question can simply be asked again. For debugging, you can also set static breakpoints that pause before or after named nodes, without changing any node's code.",
        precision: "From LangGraph 1.2.17's source: interrupt(value, response_schema = …). A Pydantic model, TypedDict or dataclass schema is used to validate the resume value; a JSON Schema dict is only shown to clients. A failed validation raises pydantic.ValidationError and nothing is saved.",
        visual: (el) => el.append(h("div", { class: "panel", style: "max-width:420px" }, h("div", { class: "eyebrow" }, "The question, as a form"), h("p", { style: "font-size:.92rem;margin:6px 0" }, "Book Hotel Lumiere for 3 nights? Total 885 euros."), h("div", { class: "row", style: "--gap:6px" }, ["approve", "edit", "reject"].map((x) => h("span", { class: "chip" }, x))), h("p", { class: "faint", style: "font-size:.8rem;margin:8px 0 0" }, "Schema: action ∈ {approve, edit, reject}; hotel (text, only for edit)."))) },
      { title: "Waiting costs nothing", truth: "SKETCH",
        text: "While Maya sleeps on her decision, no program is waiting in memory: the paused run is just a checkpoint in a database. The server can restart, or move to another machine, and the run will resume exactly where it stopped. This is durable execution (A8) at human speed. A paused run is not finished, though ({law:g6}): it waits until someone answers.",
        visual: (el) => el.append(h("div", { class: "row", style: "--gap:8px;align-items:center" }, [["Tue 21:40", "run pauses at “approve”; checkpoint saved"], ["overnight", "nothing running; a server restart changes nothing"], ["Wed 08:15", "Maya taps Approve; the node re-runs and books"]].map(([a, b], i) => h("div", { class: "panel grow", style: "min-width:150px" }, h("div", { class: "eyebrow" }, a), h("p", { style: "font-size:.86rem;margin:4px 0 0" }, b))))) },
      { kind: "snap", title: "Stage G: nothing is booked without Maya", truth: "REAL",
        text: "Maya's planner now has its human gate. The approve node builds a summary (safe to repeat), asks, and only the separate book node spends money, once, after a yes. A0's run showed it working: the summary was prepared twice, the hotel booked once.",
        visual: async (el, api) => { const G = await api.graph(); const svg = G.draw(G.teamGraph(), G.teamSpec); G.light(svg, {}, new Set(["lead", "weather", "travel", "activities", "writer", "critic"]), null, { paused: ["approve"] }); el.append(svg); } }],
    lab: {
      title: "The HITL Desk", truth: "TOY",
      intro: "Maya's plan is ready and the run is paused at the approval node. Answer as Maya: approve, edit (choose Hotel Soleil) or reject. Then switch on a bug and answer again. The engine follows LangGraph's interrupt and resume rules (checked against real runs); every charge and booking is logged.",
      tries: ["Approve. How many times was the card charged? How many times did the approve node start?", "Reset, then edit to Hotel Soleil. What is the new total?", "Turn on “charge the card before asking”, run and approve. Count the charges.", "Turn on “wrap the question in try/except”. Does Maya get asked at all?"],
      async mount(el, api) {
        const G = await api.graph();
        const st = { chargeFirst: false, tryExcept: false };
        let side = [], app, thread, starts = 0, first = null;
        const qBox = h("div"), logBox = h("div"), runBox = h("div");
        const spec = { W: 670, H: 120, nodes: { draft: { x: 160, y: 55, kind: "llm", label: "draft plan" }, approve: { x: 330, y: 55, kind: "human", label: "Maya approves", w: 130 }, book: { x: 525, y: 55, kind: "tool", label: "book and pay" } }, start: { x: 50, y: 55 }, end: { x: 628, y: 55 } };
        function build() {
          return G.graph({ hotel: {}, cost: {}, decision: {}, booking: {} })
            .node("draft", () => ({ hotel: "Hotel Lumiere", cost: 885 }), { kind: "llm" })
            .node("approve", (s_, ctx) => {
              starts++;
              if (st.chargeFirst) side.push(`charged card ${s_.cost} euros`);
              side.push("prepared the summary for Maya");
              const ask = () => ctx.interrupt({ question: `Book ${s_.hotel} for 3 nights? Total trip cost: ${s_.cost} euros (budget 900).`, options: ["approve", "edit", "reject"] });
              let ans;
              if (st.tryExcept) { try { ans = ask(); } catch (e) { ans = "approve"; } } else ans = ask();
              if (typeof ans === "string") ans = { action: ans };
              if (ans.action === "edit") return G.Command({ update: { hotel: ans.hotel, cost: ans.cost, decision: "edited" }, goto: "book" });
              if (ans.action === "reject") return G.Command({ update: { decision: "rejected" }, goto: G.END });
              return G.Command({ update: { decision: "approved" }, goto: "book" });
            }, { kind: "human", destinations: ["book", G.END], commandOnly: true })
            .node("book", (s_) => { if (!st.chargeFirst) side.push(`charged card ${s_.cost} euros`); side.push(`BOOKED ${s_.hotel}`); return { booking: "confirmed: " + s_.hotel }; }, { kind: "tool" })
            .edge(G.START, "draft").edge("draft", "approve").edge("book", G.END);
        }
        const g0 = build();
        function showLog() {
          logBox.innerHTML = "";
          const charges = side.filter((x) => /charged/.test(x)).length;
          logBox.append(h("div", { class: "row", style: "--gap:16px;margin-bottom:6px" }, [[charges, "card charges"], [starts, "times the approve node started"]].map(([n, l]) => h("div", null, h("div", { class: "t-disp", style: `font-size:1.4rem;${l === "card charges" && n > 1 ? "color:var(--bad)" : ""}` }, String(n)), h("div", { class: "faint", style: "font-size:.8rem" }, l)))), side.length ? sideLog(side) : h("p", { class: "faint" }, "No side effects yet."));
        }
        function start() {
          side = []; starts = 0; thread = "desk-" + Math.random().toString(36).slice(2, 7);
          app = build().compile({ checkpointer: G.MemorySaver() });
          first = app.run({ hotel: "", cost: 0, decision: "", booking: "" }, { thread });
          runBox.innerHTML = ""; qBox.innerHTML = "";
          G.player(runBox, { builder: g0, spec, run: first, schema: g0.schema });
          if (first.outcome.status === "interrupted") {
            const q = first.outcome.interrupts[0];
            qBox.append(h("div", { class: "card", style: "padding:14px;border-color:var(--person)" }, h("div", { class: "eyebrow", style: "color:var(--person)" }, "Paused · waiting for Maya · checkpoint saved, nothing running"), h("p", { style: "font-size:1.02rem;margin:6px 0 10px" }, q.question),
              h("div", { class: "row", style: "--gap:8px" },
                h("button", { class: "btn primary small", onclick: () => answer("approve") }, "Approve"),
                h("button", { class: "btn small", onclick: () => answer({ action: "edit", hotel: "Hotel Soleil", cost: 735 }) }, "Edit: Hotel Soleil (140 a night)"),
                h("button", { class: "btn small ghost", onclick: () => answer("reject") }, "Reject"))));
          } else qBox.append(h("div", { class: "callout bad" }, h("strong", null, "Maya was never asked. "), "The try/except caught interrupt()'s pause signal, the code fell back to “approve”, and the run went straight on."));
          showLog(); api.done();
        }
        function answer(a) {
          const res = app.run(G.Command({ resume: a }), { thread });
          qBox.innerHTML = ""; runBox.innerHTML = "";
          qBox.append(h("div", { class: "callout " + (res.state.decision === "rejected" ? "warn" : "ok") }, h("strong", null, `Resumed with ${typeof a === "string" ? "“" + a + "”" : "an edit"}. `), res.state.booking ? `Booking: ${res.state.booking}, ${res.state.cost} euros.` : "Nothing booked."));
          G.player(runBox, { builder: g0, spec, run: res, schema: g0.schema });
          showLog(); api.done();
        }
        const cb = (id, label, key) => { const i = h("input", { type: "checkbox", id }); i.onchange = () => { st[key] = i.checked; start(); }; return h("label", { for: id, class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, i, label); };
        el.append(h("div", { class: "row", style: "--gap:16px;margin-bottom:10px" }, cb("hd-charge", "Bug: charge the card before asking", "chargeFirst"), cb("hd-try", "Bug: wrap the question in try/except", "tryExcept"), h("button", { class: "btn small ghost", onclick: start }, "Reset")),
          qBox, h("div", { class: "two", style: "margin-top:12px" }, h("div", null, h("div", { class: "eyebrow" }, "Side effects"), logBox), h("div", null, h("div", { class: "eyebrow" }, "Why"), h("p", { class: "muted", style: "font-size:.9rem" }, "On resume the approve node starts again from its first line. Whatever it did before asking happens again; book, a separate node, runs once."))), h("div", { style: "margin-top:12px" }, runBox));
        start();
      } },
    breakit: {
      title: "Break the human gate", truth: "REAL",
      intro: "Three ways to break approval, each a real recorded LangGraph run, and one that bites when code changes while a run is paused.",
      cases: [
        { name: "Charge, then ask", what: "The approve node charges the card, then calls interrupt(). Maya approves the next day.", action: "Approve", result: "Two charges of 570 euros: one before the pause, one when the node re-ran on resume.", why: "Everything before interrupt() runs again on resume. Move the payment after the approval, into its own node, or make it idempotent.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["charge_before_interrupt"]), h("div", { style: "margin-top:6px" }, sideLog(G.scenarios.charge_before_interrupt().side_effects))); } },
        { name: "A try/except around the question", what: "The node wraps interrupt() in try/except and falls back to “approve”.", action: "Run it", result: "No pause at all: the hotel is booked without asking anyone.", why: "interrupt() pauses by raising a special signal. Never wrap it in a bare try/except; if you must catch errors nearby, let that signal pass through.", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["interrupt_try_except"])); } },
        { name: "Pause without a checkpointer", what: "The graph is compiled with no checkpointer and pauses for approval.", action: "Send “approve”", result: "RuntimeError: Cannot use Command(resume=...) without checkpointer", why: "Pausing means saving. Attach a checkpointer (A8).", visual: async (el, api) => { const G = await api.graph(); el.append(G.verified(["interrupt_no_saver"])); } },
        { name: "Questions reordered while paused", what: "A node asks for dates, then budget. While a run is paused after the first answer, a new version of the code asks for budget first.", action: "Resume", result: "The saved answer “Fri 13 to Mon 16 Nov” is handed to the budget question.", why: "Answers are matched to questions by their order in the node. Keep the order stable for paused runs, or use typed answers that a mismatch would fail." }],
      explain: { q: "Why is “move side effects after the interrupt” the safest default?", options: ["Because it is faster", "Because code before interrupt() runs again on every resume", "Because interrupts cannot call tools", "Because the checkpointer forbids it"], answer: 1, why: "The paused node restarts from its first line, so anything before the question repeats." } },
    clinic: [
      { belief: "Resuming continues from the line just after interrupt().", test: "In the HITL Desk, count how many times the approve node started for one approval.", truth: "The whole node runs again from the top; interrupt() then returns the answer." },
      { belief: "A paused run keeps a program running while it waits.", test: "The “Waiting costs nothing” beat: the pause is a checkpoint, and a server restart changes nothing.", truth: "Nothing runs while waiting. The state is in the checkpoint until a resume arrives." },
      { belief: "Wrapping interrupt() in try/except is good defensive programming.", test: "The real recorded run: try/except swallowed the pause and the hotel was booked unasked.", truth: "interrupt() pauses by raising a signal; catching it cancels the pause." }],
    explain: { prompt: "Explain how a LangGraph system pauses for a person and carries on later, and how to keep that safe.", points: ["interrupt() inside a node pauses the run and shows a value to a person", "The checkpointer saves everything; nothing runs while waiting", "Resume = Command(resume = answer) on the same thread", "The paused node re-runs from its first line; interrupt() returns the answer", "Side effects go after the approval or must be idempotent", "No bare try/except around interrupt(); several interrupts are matched by order"] },
    skeptic: [
      { q: "Why re-run the node instead of continuing from the exact line?", laws: ["g5"], a: "A half-finished function call cannot be written to a database and brought back days later on another machine. LangGraph saves state between nodes ({law:g5}), so on resume it re-runs the node with the answer ready. The design consequence is simple: keep code before interrupt() safe to repeat." },
      { q: "Isn't a human approval just a slow, expensive step?", laws: ["g6"], a: "It is a control point, used only where a mistake is expensive or cannot be undone: money, messages, deletions. A paused run costs nothing while it waits ({law:g6}: paused is not finished), and one avoided wrong booking pays for many approvals." },
      { q: "Why not just ask “shall I book?” in the chat and read the reply?", laws: ["g5"], a: "Then the model must interpret “yeah ok but cheaper?”, and nothing guarantees the booking waits. interrupt() makes the approval structured, saved with the run and visible in its history. The model cannot skip it, because the code stops there." }],
    recall: [
      { q: "What does interrupt() do?", options: ["Cancels the run", "Pauses the run, saves everything, and hands a question to a person", "Calls a tool", "Restarts the graph"], answer: 1, level: 1, why: "Resume later with Command(resume = …)." },
      { q: "On resume, where does the paused node restart?", options: ["Just after interrupt()", "From its first line", "At START", "At the next node"], answer: 1, level: 2, why: "Code before interrupt() runs again (REAL)." },
      { q: "A node asks two questions. How are the answers matched?", options: ["By the question text", "By their order in the node", "Randomly", "By the user"], answer: 1, level: 3, why: "First answer to the first interrupt, and so on." },
      { q: "What does a bare try/except around interrupt() cause?", options: ["Nothing", "The pause is swallowed: the run never stops", "A double charge", "A compile error"], answer: 1, level: 4, why: "It catches interrupt()'s pause signal (REAL)." },
      { q: "From A8: what must be attached for a resume to work?", options: ["A Store", "A checkpointer", "A router", "A second thread"], answer: 1, level: 5, why: "Without one: “Cannot use Command(resume=...) without checkpointer”." }],
    depth: [
      ["How a pause works", "interrupt() raises GraphInterrupt, a special exception. LangGraph records the question with the task and saves the checkpoint; the run returns the question to the app."],
      ["Resuming", "Command(resume = value) on the same thread. With several paused tasks, a map from interrupt ids to answers resumes them separately."],
      ["Order matching", "Answers are kept per task and matched to interrupt() calls by position inside the node (REAL: two_interrupts)."],
      ["Typed answers", "interrupt(value, response_schema = …) validates the answer with Pydantic, a TypedDict or a dataclass; a bad answer is not saved and can be retried."],
      ["Static breakpoints", "interrupt_before and interrupt_after, set when compiling or per run, pause around named nodes: handy for debugging, without editing nodes."],
      ["Editing while paused", "update_state on a paused thread changes the saved values before the resume, as an alternative to passing an edit in the answer."],
      ["In create_agent", "HumanInTheLoopMiddleware pauses before chosen tool calls, so a person can approve, edit or reject each call (A6)."]],
    connect: { links: ["Gating every risky tool and checking agents in production: {mod:a10}.", "Where the pause is saved, and how replay can repeat side effects too: {mod:a08}.", "The approve node inside the finished team: {mod:a00}."], line: "Nothing is booked without Maya now. Last station before the finale: what it takes to trust the whole system with real users and real money." }
  });
})();
