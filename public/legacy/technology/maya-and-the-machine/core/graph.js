/* Mini Graph Engine: LangGraph's execution rules, re-created in the browser and checked
   against real LangGraph 1.2.17 runs (see G.scenarios and G.verifyAll).
   Rules implemented: state channels (LastValue, reducers, add_messages), super-steps with
   plan → execute → update, alphabetical task order, Send (push tasks), Command (update + goto),
   join edges (barriers), deferred nodes, interrupt()/resume with order matching, retries,
   pending writes after a crash, checkpoints per thread, update_state (fork) and replay,
   and the recursion limit. Also: the shared graph renderer, state board and run player. */
(function () {
  const MM = window.MM;
  const G = (MM.graph = {});
  const START = (G.START = "__start__"), END = (G.END = "__end__");
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  class Send { constructor(node, arg) { this.node = node; this.arg = arg; } }
  class Command { constructor(o) { o = o || {}; this.update = o.update; this.goto = o.goto; this.resume = o.resume; } }
  class Interrupt { constructor(value, index) { this.value = value; this.index = index; } }
  class GraphError extends Error { constructor(type, message) { super(message); this.name = type; this.type = type; } }
  G.Send = (node, arg) => new Send(node, arg);
  G.Command = (o) => new Command(o);
  G.GraphError = GraphError;
  G.error = (type, message) => new GraphError(type, message);

  /* ---------------------------------------------------------------- reducers */
  let autoId = 0;
  function addMessages(left, right) {
    const out = (left || []).map((m) => Object.assign({}, m));
    (Array.isArray(right) ? right : [right]).forEach((m) => {
      if (!m) return;
      m = Object.assign({}, m);
      if (m.type === "remove") { const i = out.findIndex((x) => x.id === m.id); if (i >= 0) out.splice(i, 1); return; }
      if (!m.id) m.id = "auto-" + ++autoId;
      const i = out.findIndex((x) => x.id === m.id);
      if (i >= 0) out[i] = m; else out.push(m);
    });
    return out;
  }
  G.reducers = {
    append: { fn: (a, b) => (a || []).concat(b || []), init: () => [], label: "append" },
    add_messages: { fn: addMessages, init: () => [], label: "add_messages" },
    add: { fn: (a, b) => (a || 0) + (b || 0), init: () => 0, label: "add" },
    min: { fn: (a, b) => (a === undefined ? b : Math.min(a, b)), init: () => undefined, label: "keep the smallest" } };
  function channel(spec) {
    if (!spec || !spec.reducer) return { kind: "last", label: "replace" };
    const r = typeof spec.reducer === "string" ? G.reducers[spec.reducer] : { fn: spec.reducer, init: () => clone(spec.init), label: spec.label || "custom" };
    return { kind: "reduce", fn: r.fn, init: spec.init !== undefined ? () => clone(spec.init) : r.init, label: spec.label || r.label };
  }
  G.ruleLabel = (spec) => channel(spec).label;
  /* Overwrite: one write that skips the reducer and replaces the whole value (LangGraph's Overwrite) */
  G.Overwrite = (value) => ({ __overwrite__: value });
  const isOver = (v) => !!v && typeof v === "object" && !Array.isArray(v) && "__overwrite__" in v;

  /* ---------------------------------------------------------------- the builder */
  function StateGraph(schema) {
    if (!(this instanceof StateGraph)) return new StateGraph(schema);
    this.schema = schema || {};
    this.nodes = {}; this.edges = []; this.joins = []; this.branches = {}; this.order = [];
  }
  StateGraph.prototype.node = function (name, fn, opts) {
    if (this.nodes[name]) throw new GraphError("ValueError", `Node \`${name}\` already present.`);
    this.nodes[name] = Object.assign({ name, fn, defer: false }, opts || {});
    this.order.push(name);
    return this;
  };
  StateGraph.prototype.edge = function (src, dst) {
    if (Array.isArray(src)) this.joins.push({ srcs: src.slice(), dst }); else this.edges.push({ src, dst });
    return this;
  };
  StateGraph.prototype.cond = function (src, fn, paths, opts) {
    (this.branches[src] = this.branches[src] || []).push(Object.assign({ fn, paths }, opts || {}));
    return this;
  };
  /* compile-time checks, with LangGraph's own wording */
  StateGraph.prototype.problems = function () {
    const known = (n) => n === END || !!this.nodes[n];
    const errs = [], warns = [];
    const hasEntry = this.edges.some((e) => e.src === START) || !!this.branches[START];
    if (!hasEntry) errs.push("Graph must have an entrypoint: add at least one edge from START to another node");
    this.edges.forEach((e) => {
      if (e.src !== START && !this.nodes[e.src]) errs.push(`Found edge starting at unknown node '${e.src}'`);
      if (!known(e.dst)) errs.push(`Found edge ending at unknown node \`${e.dst}\``);
    });
    this.joins.forEach((j) => { j.srcs.forEach((s_) => { if (!this.nodes[s_]) errs.push(`Found edge starting at unknown node '${s_}'`); }); if (!known(j.dst)) errs.push(`Found edge ending at unknown node \`${j.dst}\``); });
    Object.entries(this.branches).forEach(([src, list]) => list.forEach((b) => {
      if (src !== START && !this.nodes[src]) errs.push(`Found edge starting at unknown node '${src}'`);
      const targets = b.paths ? (Array.isArray(b.paths) ? b.paths : Object.values(b.paths)) : [];
      targets.forEach((t) => { if (!known(t)) errs.push(`At '${src}' node, 'condition' branch found unknown target '${t}'`); });
    }));
    if (!errs.length) {
      const out = this.successors();
      const seen = new Set([START]), stack = [START];
      while (stack.length) { const n = stack.pop(); (out[n] || []).forEach((m) => { if (!seen.has(m)) { seen.add(m); stack.push(m); } }); }
      this.order.forEach((n) => { if (!seen.has(n)) warns.push(`Node '${n}' can never run: nothing leads to it.`); });
      this.order.forEach((n) => { if (seen.has(n) && !(out[n] || []).length && !this.nodes[n].commandOnly) warns.push(`Node '${n}' is a dead end: when it finishes, its branch just stops.`); });
      const toEnd = this.order.some((n) => (out[n] || []).includes(END)) || (out[START] || []).includes(END);
      if (!toEnd && !warns.length) warns.push("No path reaches END. The run will stop only when nothing is scheduled, or at the recursion limit.");
    }
    return { errors: errs, warnings: warns };
  };
  StateGraph.prototype.successors = function () {
    const out = {};
    const add = (a, b) => { (out[a] = out[a] || []); if (!out[a].includes(b)) out[a].push(b); };
    this.edges.forEach((e) => add(e.src, e.dst));
    this.joins.forEach((j) => j.srcs.forEach((s_) => add(s_, j.dst)));
    Object.entries(this.branches).forEach(([src, list]) => list.forEach((b) => (b.paths ? (Array.isArray(b.paths) ? b.paths : Object.values(b.paths)) : []).forEach((t) => add(src, t))));
    Object.values(this.nodes).forEach((n) => (n.destinations || []).forEach((t) => add(n.name, t)));
    return out;
  };
  StateGraph.prototype.compile = function (opts) {
    const p = this.problems();
    if (p.errors.length) throw new GraphError("ValueError", p.errors[0]);
    return new Compiled(this, opts || {});
  };
  G.StateGraph = StateGraph;
  G.graph = (schema) => new StateGraph(schema);

  /* ---------------------------------------------------------------- checkpointer */
  function MemorySaver() {
    if (!(this instanceof MemorySaver)) return new MemorySaver();
    this.threads = {};
  }
  MemorySaver.prototype.list = function (thread) { return this.threads[thread] || []; };
  MemorySaver.prototype.latest = function (thread) { const l = this.list(thread); return l.length ? l[l.length - 1] : null; };
  MemorySaver.prototype.get = function (thread, id) { return this.list(thread).find((c) => c.id === id) || null; };
  MemorySaver.prototype.put = function (thread, cp) {
    const l = (this.threads[thread] = this.threads[thread] || []);
    cp.id = "c" + l.length;
    cp.thread = thread;
    cp.created = l.length;
    l.push(cp);
    return cp;
  };
  G.MemorySaver = MemorySaver;

  /* ---------------------------------------------------------------- the compiled graph and its loop */
  function Compiled(b, opts) {
    this.b = b;
    this.checkpointer = opts.checkpointer || null;
    this.store = opts.store || null;
    this.ch = {};
    Object.keys(b.schema).forEach((k) => (this.ch[k] = channel(b.schema[k])));
    this.joinTargets = {};
    b.joins.forEach((j) => (this.joinTargets[j.dst] = (this.joinTargets[j.dst] || []).concat([j])));
  }
  const C = Compiled.prototype;
  C.initValues = function () {
    const v = {};
    Object.entries(this.ch).forEach(([k, c]) => { if (c.kind === "reduce") { const x = c.init(); if (x !== undefined) v[k] = x; } });
    return v;
  };
  /* apply a list of [key, value] writes (in task order) — the Update phase */
  C.apply = function (values, writes) {
    const out = clone(values), byKey = {};
    writes.forEach(([k, val]) => (byKey[k] = byKey[k] || []).push(val));
    Object.entries(byKey).forEach(([k, vals]) => {
      const c = this.ch[k];
      if (!c) throw new GraphError("InvalidUpdateError", `Unknown state key '${k}': add it to the state schema first.`);
      if (c.kind === "last") {
        if (vals.length > 1) throw new GraphError("InvalidUpdateError", `At key '${k}': Can receive only one value per step. Use an Annotated key to handle multiple values.`);
        out[k] = clone(isOver(vals[0]) ? vals[0].__overwrite__ : vals[0]);
      } else {
        let cur = out[k] === undefined ? c.init() : out[k], seen = false;
        vals.forEach((val) => {
          if (isOver(val)) {
            if (seen) throw new GraphError("InvalidUpdateError", "Can receive only one Overwrite value per super-step.");
            cur = clone(val.__overwrite__); seen = true; return;
          }
          if (!seen) cur = c.fn(cur, clone(val));
        });
        out[k] = cur;
      }
    });
    return this.ordered(out);
  };
  /* keep fields in the order the schema declares them, as LangGraph does */
  C.ordered = function (v) {
    const o = {};
    Object.keys(this.b.schema).forEach((k) => { if (k in v) o[k] = v[k]; });
    Object.keys(v).forEach((k) => { if (!(k in o)) o[k] = v[k]; });
    return o;
  };
  const writesOf = (upd) => (upd && typeof upd === "object" ? Object.entries(upd) : []);
  C.triggersOf = function (t) {
    if (t.push) return ["__pregel_push"];
    return ["branch:to:" + t.name].concat((this.joinTargets[t.name] || []).map((j) => "join:" + j.srcs.join("+") + ":" + t.name));
  };
  function taskKeys(tasks) { const n = {}; tasks.forEach((t) => { if (t.push) { n[t.name] = (n[t.name] || 0); t.key = t.name + "#" + n[t.name]++; } else t.key = t.name; }); return tasks; }
  /* where the edges lead after a task finished: the Plan phase of the next round */
  C.route = function (t, valuesBefore, carry) {
    const b = this.b, pulls = [], pushes = [];
    const go = (target) => {
      if (target === undefined || target === null || target === END) return;
      if (Array.isArray(target)) { target.forEach(go); return; }
      if (target instanceof Send) { pushes.push({ name: target.node, push: true, arg: clone(target.arg) }); return; }
      pulls.push(target);
    };
    if (t.goto !== undefined) go(t.goto);
    b.edges.filter((e) => e.src === t.name).forEach((e) => go(e.dst));
    (b.branches[t.name] || []).forEach((br) => {
      const fresh = this.apply(valuesBefore, t.writes || []);
      let r = br.fn(fresh);
      const map = (x) => (br.paths && !Array.isArray(br.paths) && typeof x === "string" && x in br.paths ? br.paths[x] : x);
      r = Array.isArray(r) ? r.map(map) : map(r);
      go(r);
    });
    b.joins.forEach((j, ji) => {
      if (!j.srcs.includes(t.name)) return;
      const seen = (carry.joins[ji] = carry.joins[ji] || []);
      if (!seen.includes(t.name)) seen.push(t.name);
      if (j.srcs.every((x) => seen.includes(x))) { go(j.dst); carry.joins[ji] = []; }
    });
    return { pulls, pushes };
  };
  C.plan = function (finished, valuesBefore, carry) {
    const pushes = [], pull = new Set(carry.deferred || []);
    finished.forEach((t) => { const r = this.route(t, valuesBefore, carry); r.pushes.forEach((p) => pushes.push(p)); r.pulls.forEach((n) => pull.add(n)); });
    const names = [...pull].filter((n) => this.b.nodes[n]);
    const normal = names.filter((n) => !this.b.nodes[n].defer).sort();
    const deferred = names.filter((n) => this.b.nodes[n].defer).sort();
    let tasks;
    if (pushes.length || normal.length) { tasks = pushes.concat(normal.map((n) => ({ name: n }))); carry.deferred = deferred; }
    else { tasks = deferred.map((n) => ({ name: n })); carry.deferred = []; }
    return taskKeys(tasks);
  };

  /* LangGraph's default_retry_on: connection errors are retried; programming errors and OSError
     (which includes Python's TimeoutError) are not; anything else is. */
  const NO_RETRY = ["ValueError", "TypeError", "ArithmeticError", "ZeroDivisionError", "OverflowError", "ImportError", "ModuleNotFoundError", "LookupError", "KeyError", "IndexError", "NameError", "SyntaxError", "RuntimeError", "NotImplementedError", "RecursionError", "ReferenceError", "StopIteration", "StopAsyncIteration", "OSError", "FileNotFoundError", "PermissionError", "TimeoutError"];
  G.defaultRetryOn = (e) => (e && e.name === "ConnectionError") || !NO_RETRY.includes(e && e.name);

  /* Run until done, interrupted or failed. input: a state dict, a Command({resume}) or null.
     cfg: {thread, checkpoint (id), limit}. Returns {events, outcome, steps, state, next}. */
  C.run = function (input, cfg) {
    cfg = cfg || {};
    const saver = this.checkpointer, thread = cfg.thread || "default";
    const limit = cfg.limit || 10007;
    const events = [], steps = [];
    const emitCp = (cp) => events.push({ t: "checkpoint", step: cp.step, values: clone(cp.values), next: cp.tasks.map((t) => t.name), source: cp.source, id: cp.id });
    const isResume = input === null || input === undefined || input instanceof Command;
    let values, tasks, step, startStep, cp = null, carry = { joins: {}, deferred: [] }, resumes = {}, pending = {};
    if (isResume) {
      if (!saver) {
        if (input instanceof Command) throw new GraphError("RuntimeError", "Cannot use Command(resume=...) without checkpointer");
        throw new GraphError("EmptyInputError", "Received no input for __start__");
      }
      let base = cfg.checkpoint ? saver.get(thread, cfg.checkpoint) : saver.latest(thread);
      if (!base) throw new GraphError("ValueError", "Nothing to resume: this thread has no checkpoint yet.");
      if (cfg.checkpoint && base !== saver.latest(thread)) {
        base = saver.put(thread, { parent: base.id, step: base.step + 1, source: "fork", values: clone(base.values), tasks: clone(base.tasks), carry: clone(base.carry || { joins: {}, deferred: [] }), pending: {}, resumes: {} });
      }
      cp = base;
      emitCp(cp);
      values = clone(cp.values); tasks = taskKeys(clone(cp.tasks)); step = cp.step; startStep = cp.step;
      carry = clone(cp.carry || { joins: {}, deferred: [] });
      pending = clone(cp.pending || {}); resumes = clone(cp.resumes || {});
      if (input instanceof Command && input.resume !== undefined) {
        const waiting = (cp.interrupted || []).slice();
        if (input.resume && typeof input.resume === "object" && !Array.isArray(input.resume) && waiting.some((k) => k in input.resume)) waiting.forEach((k) => { if (k in input.resume) (resumes[k] = resumes[k] || []).push(input.resume[k]); });
        else { const k = waiting[0] || (tasks[0] && tasks[0].key); if (k) (resumes[k] = resumes[k] || []).push(input.resume); }
      }
    } else {
      /* new input on a thread that already has checkpoints continues from its saved state (short-term memory) */
      const prev = saver ? saver.latest(thread) : null;
      values = prev ? clone(prev.values) : this.initValues();
      const inStep = prev ? prev.step + 1 : -1;
      if (saver) { cp = saver.put(thread, { parent: prev ? prev.id : null, step: inStep, source: "input", values: clone(values), tasks: [{ name: START }], carry, pending: {}, resumes: {} }); emitCp(cp); }
      const before = clone(values);
      values = this.apply(values, writesOf(input));
      tasks = this.plan([{ name: START, writes: writesOf(input) }], before, carry);
      step = inStep + 1; startStep = step;
      if (saver) { cp = saver.put(thread, { parent: cp.id, step, source: "loop", values: clone(values), tasks: clone(tasks), carry: clone(carry), pending: {}, resumes: {} }); emitCp(cp); }
      steps.push({ step, tasks: [], before: {}, after: clone(values), next: tasks.map((t) => t.name), cp: cp && cp.id, start: true });
    }
    let outcome = { status: "done" };
    while (true) {
      if (!tasks.length) break;
      if (step + 1 > startStep + limit) { outcome = { status: "error", error: "GraphRecursionError", message: `Recursion limit of ${limit} reached without hitting a stop condition. You can increase the limit by setting the \`recursion_limit\` config key.` }; break; }
      step += 1;
      const before = clone(values);
      const rec = { step, tasks: [], before };
      tasks.forEach((t) => events.push({ t: "task", step, name: t.name, input: t.push ? clone(t.arg) : clone(values), triggers: this.triggersOf(t) }));
      const done = [], interrupted = [], failed = [];
      tasks.forEach((t) => {
        const tr = { name: t.name, key: t.key, push: !!t.push, arg: t.push ? clone(t.arg) : undefined, triggers: this.triggersOf(t) };
        rec.tasks.push(tr);
        if (pending[t.key]) { t.writes = pending[t.key].writes; t.goto = pending[t.key].goto; tr.writes = t.writes; tr.cached = true; done.push(t); return; }
        const node = this.b.nodes[t.name];
        const maxAttempts = node.retry ? node.retry.maxAttempts || 3 : 1, retryOn = (node.retry && node.retry.retryOn) || G.defaultRetryOn;
        let attempt = 0;
        while (true) {
          attempt++;
          let idx = 0;
          const ctx = { step, attempt, thread, store: this.store, interrupt: (v) => { const i = idx++; const rs = resumes[t.key] || []; if (i < rs.length) return clone(rs[i]); throw new Interrupt(v, i); } };
          try {
            let out = node.fn(t.push ? clone(t.arg) : clone(values), ctx);
            let goto;
            if (out instanceof Command) { goto = out.goto; out = out.update || {}; }
            t.writes = writesOf(out); t.goto = goto;
            tr.writes = t.writes; tr.goto = goto; tr.attempts = attempt;
            events.push({ t: "result", step, name: t.name, result: clone(out || {}), error: null, interrupts: [] });
            done.push(t);
            break;
          } catch (e) {
            if (e instanceof Interrupt) {
              tr.interrupt = clone(e.value); tr.attempts = attempt;
              events.push({ t: "result", step, name: t.name, result: {}, error: null, interrupts: [{ value: clone(e.value) }] });
              interrupted.push(t);
              break;
            }
            if (attempt < maxAttempts && retryOn(e)) { (tr.retries = tr.retries || []).push((e.name || "Error") + ": " + e.message); continue; }
            tr.error = (e.name || "Error") + ": " + e.message; tr.attempts = attempt;
            /* LangGraph runs a lone task inline: its exception escapes before any result event */
            if (tasks.length > 1) events.push({ t: "result", step, name: t.name, result: {}, error: tr.error, interrupts: [] });
            failed.push({ t, e });
            break;
          }
        }
      });
      steps.push(rec);
      if (failed.length || interrupted.length) {
        const keep = {};
        done.forEach((t) => (keep[t.key] = { writes: t.writes, goto: t.goto }));
        if (cp) { cp.pending = Object.assign({}, cp.pending || {}, keep); cp.resumes = resumes; cp.interrupted = interrupted.map((t) => t.key); cp.failed = failed.map((f) => f.t.key); }
        rec.pendingSaved = Object.keys(keep);
        if (failed.length) { const e = failed[0].e; outcome = { status: "error", error: e.name || "Error", message: e.message }; }
        else outcome = { status: "interrupted", next: interrupted.map((t) => t.name), interrupts: interrupted.map((t) => rec.tasks.find((x) => x.key === t.key).interrupt), saved: !!saver };
        break;
      }
      const allWrites = [];
      done.forEach((t) => t.writes.forEach((w) => allWrites.push(w)));
      try { values = this.apply(values, allWrites); }
      catch (e) { outcome = { status: "error", error: e.type || e.name, message: e.message }; rec.updateError = outcome.message; values = before; break; }
      rec.after = clone(values);
      tasks = this.plan(done, before, carry);
      rec.next = tasks.map((t) => t.name);
      pending = {}; resumes = {};
      if (saver) { cp = saver.put(thread, { parent: cp.id, step, source: "loop", values: clone(values), tasks: clone(tasks), carry: clone(carry), pending: {}, resumes: {} }); emitCp(cp); rec.cp = cp.id; }
    }
    const res = { events, outcome, steps, values: clone(values), thread };
    if (saver) { const st = this.getState(thread, cfg.checkpoint); res.state = st.values; res.next = st.next; const lt = this.getState(thread); res.latest = { values: lt.values, next: lt.next, id: lt.cp && lt.cp.id }; }
    else { res.state = clone(values); res.next = outcome.status === "done" ? [] : tasks.map((t) => t.name); }
    return res;
  };
  /* what get_state shows: the latest checkpoint, with any pending writes applied */
  C.getState = function (thread, checkpointId) {
    if (!this.checkpointer) throw new GraphError("ValueError", "No checkpointer set");
    const cp = checkpointId ? this.checkpointer.get(thread, checkpointId) : this.checkpointer.latest(thread);
    if (!cp) return { values: {}, next: [], cp: null };
    const ws = [];
    taskKeys(clone(cp.tasks)).forEach((t) => { const p = (cp.pending || {})[t.key]; if (p) p.writes.forEach((w) => ws.push(w)); });
    const waiting = (cp.interrupted || []).concat(cp.failed || []);
    const next = waiting.length ? taskKeys(clone(cp.tasks)).filter((t) => waiting.includes(t.key)).map((t) => t.name) : cp.tasks.filter((t) => t.name !== START).map((t) => t.name);
    return { values: this.apply(cp.values, ws), next, cp };
  };
  /* update_state: write new values at a checkpoint; this creates a new checkpoint (a fork) */
  C.updateState = function (thread, checkpointId, update) {
    if (!this.checkpointer) throw new GraphError("ValueError", "No checkpointer set");
    const base = checkpointId ? this.checkpointer.get(thread, checkpointId) : this.checkpointer.latest(thread);
    return this.checkpointer.put(thread, { parent: base.id, step: base.step + 1, source: "update", values: this.apply(base.values, writesOf(update)), tasks: clone(base.tasks), carry: clone(base.carry || { joins: {}, deferred: [] }), pending: {}, resumes: {} });
  };
  C.history = function (thread) { return this.checkpointer ? this.checkpointer.list(thread) : []; };
  G.Compiled = Compiled;

  /* ---------------------------------------------------------------- prebuilt: tool node and tools_condition */
  /* Python's repr(), for the exact text of tool error messages */
  const pyStr = (str) => { str = String(str); const q = str.includes("'") && !str.includes('"') ? '"' : "'"; return q + str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t").split(q).join("\\" + q) + q; };
  const pyRepr = (v) => (v === null || v === undefined ? "None" : v === true ? "True" : v === false ? "False" : typeof v === "string" ? pyStr(v) : typeof v === "number" ? String(v) : Array.isArray(v) ? "[" + v.map(pyRepr).join(", ") + "]" : "{" + Object.entries(v).map(([k, x]) => pyStr(k) + ": " + pyRepr(x)).join(", ") + "}");
  G.pyRepr = pyRepr;
  /* prebuilt: ToolNode and tools_condition, with langgraph-prebuilt 1.1's error handling.
     tools: {name: fn | {fn, required: [arg names]}}. By default only invalid arguments come back to the
     model as an error message; an exception inside a tool crashes the run. opts.handleErrors = true
     sends every error back to the model instead. */
  G.prebuilt = {
    toolNode(tools, opts) {
      opts = opts || {};
      return function (state) {
        const last = state.messages[state.messages.length - 1];
        return { messages: (last.tool_calls || []).map((tc) => {
          const msg = (content, bad) => Object.assign({ type: "tool", content, tool_call_id: tc.id }, bad ? { status: "error" } : {});
          const t = tools[tc.name];
          if (!t) return msg(`Error: ${tc.name} is not a valid tool, try one of [${Object.keys(tools).join(", ")}].`, true);
          const fn = typeof t === "function" ? t : t.fn, args = tc.args || {};
          const missing = ((t && t.required) || []).filter((r) => args[r] === undefined);
          if (missing.length) {
            const m = `Error invoking tool '${tc.name}' with kwargs ${pyRepr(args)} with error:\n` + missing.map((r) => ` ${r}: Field required`).join("\n") + "\n Please fix the error and try again.";
            return msg(opts.handleErrors ? `Error: ToolInvocationError(${pyStr(m)})\n Please fix your mistakes.` : m, true);
          }
          try { return msg(String(fn(args))); }
          catch (e) { if (!opts.handleErrors) throw e; return msg(`Error: ${e.name || "Error"}(${pyStr(e.message)})\n Please fix your mistakes.`, true); }
        }) };
      };
    },
    toolsCondition(state) { const last = state.messages[state.messages.length - 1]; return last && last.tool_calls && last.tool_calls.length ? "tools" : END; } };

  /* ---------------------------------------------------------------- the Store: memory shared across threads */
  function Store() { if (!(this instanceof Store)) return new Store(); this.items = []; }
  const sameNs = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  Store.prototype.put = function (ns, key, value) { const it = { namespace: ns.slice(), key, value: clone(value) }; const i = this.items.findIndex((x) => sameNs(x.namespace, ns) && x.key === key); if (i >= 0) this.items[i] = it; else this.items.push(it); };
  Store.prototype.get = function (ns, key) { const it = this.items.find((x) => sameNs(x.namespace, ns) && x.key === key); return it ? clone(it) : null; };
  Store.prototype.delete = function (ns, key) { this.items = this.items.filter((x) => !(sameNs(x.namespace, ns) && x.key === key)); };
  /* search(prefix, {filter, score(item) → number, limit}): namespace prefix, exact-match filter, optional ranking */
  Store.prototype.search = function (prefix, o) {
    o = o || {};
    let r = this.items.filter((x) => prefix.every((p, i) => x.namespace[i] === p));
    if (o.filter) r = r.filter((x) => Object.entries(o.filter).every(([k, v]) => x.value[k] === v));
    if (o.score) r = r.map((x) => Object.assign({}, x, { score: o.score(x) })).sort((a, b) => b.score - a.score);
    return clone(r.slice(o.offset || 0, (o.offset || 0) + (o.limit || 10)));
  };
  G.Store = Store;

  /* stream modes, rebuilt from a finished run: "values" = the whole state after each round, "updates" = what each node wrote */
  G.streamValues = (run) => run.steps.filter((x) => x.after).map((x) => clone(x.after));
  G.streamUpdates = (run) => run.steps.filter((x) => !x.start && x.after).flatMap((x) => x.tasks.map((t) => ({ [t.name]: Object.fromEntries(t.writes || []) })));

  /* ---------------------------------------------------------------- comparing with real LangGraph runs */
  const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k === "id" && typeof x === "string" && /^auto-/.test(x) ? undefined : x)));
  /* canonical JSON: object keys sorted, so key order never counts as a difference */
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => ((o[kk] = x[kk]), o), {}) : x));
  G.compare = function (rec, mine) {
    const diffs = [];
    const bySteps = (evs) => { const m = new Map(); evs.forEach((e) => { if (!m.has(e.step)) m.set(e.step, []); m.get(e.step).push(e); }); return m; };
    const A = bySteps(rec.events), B = bySteps(mine.events.map((e) => { const x = Object.assign({}, e); delete x.id; return strip(x); }));
    const stepsA = [...A.keys()], stepsB = [...B.keys()];
    if (canon(stepsA) !== canon(stepsB)) diffs.push(`steps differ: real ${canon(stepsA)} vs engine ${canon(stepsB)}`);
    stepsA.forEach((st) => {
      const a = A.get(st) || [], b = B.get(st) || [];
      const pick = (arr, t) => arr.filter((e) => e.t === t);
      const ta = pick(a, "task").map((e) => canon([e.name, e.input, e.triggers])), tb = pick(b, "task").map((e) => canon([e.name, e.input, e.triggers]));
      if (canon(ta) !== canon(tb)) diffs.push(`step ${st}: tasks differ`);
      const ra = pick(a, "result").map((e) => canon([e.name, e.result, e.error || null, (e.interrupts || []).map((i) => i.value !== undefined ? i.value : i)])).sort();
      const rb = pick(b, "result").map((e) => canon([e.name, e.result, e.error || null, (e.interrupts || []).map((i) => i.value)])).sort();
      if (canon(ra) !== canon(rb)) diffs.push(`step ${st}: results differ`);
      const ca = pick(a, "checkpoint").map((e) => canon([e.source, e.values, e.next])), cb = pick(b, "checkpoint").map((e) => canon([e.source, e.values, e.next]));
      if (canon(ca) !== canon(cb)) diffs.push(`step ${st}: checkpoint differs`);
    });
    const oa = rec.outcome || {}, ob = mine.outcome || {};
    if (oa.status !== ob.status) diffs.push(`outcome: real ${oa.status} vs engine ${ob.status}`);
    if (oa.error && (oa.error !== ob.error || oa.message !== ob.message)) diffs.push(`error differs: “${oa.message}” vs “${ob.message}”`);
    if (oa.interrupts && canon(oa.interrupts) !== canon(ob.interrupts)) diffs.push("interrupt values differ");
    if (oa.state && canon(strip(oa.state)) !== canon(strip(mine.state))) diffs.push("final state differs");
    if (oa.next_after && canon(oa.next_after) !== canon(mine.next)) diffs.push("next tasks differ");
    return diffs;
  };

  /* ---------------------------------------------------------------- the recorded scenarios, rebuilt with the engine */
  const S = (G.scenarios = {});
  const err = (name, msg) => { const e = new Error(msg); e.name = name; return e; };
  S.chain = () => G.graph({ forecast: {}, plan: {}, budget_ok: {} })
    .node("get_forecast", () => ({ forecast: "rain on Saturday" })).node("draft_plan", (s_) => ({ plan: s_.forecast.includes("rain") ? "Louvre on Saturday" : "picnic on Saturday" })).node("check_budget", () => ({ budget_ok: true }))
    .edge(START, "get_forecast").edge("get_forecast", "draft_plan").edge("draft_plan", "check_budget").edge("check_budget", END).compile().run({ forecast: "", plan: "", budget_ok: false });
  const PLACES = { Sat: "Louvre (rain)", Sun: "Orsay museum", Mon: "river walk" };
  const fanGraph = (research) => G.graph({ days: {}, notes: { reducer: "append" }, plan: {} })
    .node("planner", () => ({ days: ["Sat", "Sun", "Mon"] })).node("research_day", research).node("joiner", (s_) => ({ plan: s_.notes.join(" / ") }))
    .edge(START, "planner").cond("planner", (s_) => s_.days.map((d) => G.Send("research_day", { day: d })), ["research_day"]).edge("research_day", "joiner").edge("joiner", END);
  S.fanout = () => fanGraph((s_) => ({ notes: [`${s_.day}: ${PLACES[s_.day]}`] })).compile({ checkpointer: G.MemorySaver() }).run({ days: [], notes: [], plan: "" }, { thread: "fan" });
  S.no_reducer = () => G.graph({ request: {}, hotel: {} }).node("travel", () => ({ hotel: "Hotel Lumiere" })).node("budget", () => ({ hotel: "Hotel Soleil" })).edge(START, "travel").edge(START, "budget").edge("travel", END).edge("budget", END).compile().run({ request: "3 days in Paris", hotel: "" });
  S.with_reducer = () => G.graph({ request: {}, hotels: { reducer: "append" } }).node("travel", () => ({ hotels: ["Hotel Lumiere"] })).node("budget", () => ({ hotels: ["Hotel Soleil"] })).edge(START, "travel").edge(START, "budget").edge("travel", END).edge("budget", END).compile().run({ request: "3 days in Paris", hotels: [] });
  const msgGraph = (spec) => G.graph({ messages: spec }).node("assistant", () => ({ messages: [{ type: "ai", content: "Pack an umbrella: rain on Saturday.", id: "ai-1" }] })).edge(START, "assistant").edge("assistant", END).compile().run({ messages: [{ type: "human", content: "Do I need an umbrella?", id: "h-1" }] });
  S.messages_plain = () => msgGraph({});
  S.messages_reducer = () => msgGraph({ reducer: "add_messages" });
  const COSTS = [820, 690, 560];
  const loopGraph = (critic, route) => G.graph({ budget: {}, cost: {}, revisions: {}, approved: {} })
    .node("writer", (s_) => ({ cost: COSTS[Math.min(s_.revisions, 2)], revisions: s_.revisions + 1 })).node("critic", critic)
    .edge(START, "writer").edge("writer", "critic");
  S.critic_loop = () => loopGraph((s_) => ({ approved: s_.cost <= s_.budget })).cond("critic", (s_) => (s_.approved ? "done" : s_.revisions >= 3 ? "give_up" : "revise"), { done: END, give_up: END, revise: "writer" }).compile().run({ budget: 600, cost: 0, revisions: 0, approved: false });
  S.never_satisfied = () => loopGraph(() => ({ approved: false })).cond("critic", (s_) => (s_.approved ? END : "writer"), ["writer", END]).compile().run({ budget: 600, cost: 0, revisions: 0, approved: false }, { limit: 8 });
  const joinGraph = (mode) => {
    const g = G.graph({ weather: {}, trains: { reducer: "append" }, drafts: { reducer: "append" } })
      .node("weather", () => ({ weather: "rain" })).node("trains_a", () => ({ trains: ["Paris-Lyon 08:10"] })).node("trains_b", () => ({ trains: ["Lyon-Paris 18:40"] }))
      .node("writer", (s_) => ({ drafts: [`plan with weather=${s_.weather || "?"} and ${s_.trains.length} trains`] }), { defer: mode === "deferred" })
      .edge(START, "weather").edge(START, "trains_a").edge("trains_a", "trains_b");
    if (mode === "wait") g.edge(["weather", "trains_b"], "writer"); else g.edge("weather", "writer").edge("trains_b", "writer");
    return g.edge("writer", END).compile().run({ weather: "", trains: [], drafts: [] });
  };
  S.join_separate = () => joinGraph("separate");
  S.join_wait = () => joinGraph("wait");
  S.join_deferred = () => joinGraph("deferred");
  S.command = () => G.graph({ question: {}, route: {}, answer: {} })
    .node("router", (s_) => (/umbrella|rain/i.test(s_.question) ? G.Command({ update: { route: "weather" }, goto: "weather_desk" }) : G.Command({ update: { route: "planner" }, goto: "planner_desk" })), { destinations: ["weather_desk", "planner_desk"], commandOnly: true })
    .node("weather_desk", () => ({ answer: "Yes: rain is forecast on Saturday." })).node("planner_desk", () => ({ answer: "Here is a three-day plan." }))
    .edge(START, "router").edge("weather_desk", END).edge("planner_desk", END).compile().run({ question: "Do I need an umbrella?", route: "", answer: "" });
  const bookGraph = (charge, side, saver) => G.graph({ plan: {}, approved: {}, booking: {} })
    .node("plan", () => ({ plan: "3 nights, Hotel Lumiere, EUR 570" }))
    .node("approve", (s_, ctx) => { side.push(charge ? "charged card EUR 570" : "prepared summary"); const ans = ctx.interrupt({ question: "Book Hotel Lumiere for three nights within budget?", options: ["approve", "edit", "reject"] }); return { approved: ans === "approve" }; })
    .node("book", (s_) => ({ booking: s_.approved ? "confirmed" : "cancelled" }))
    .edge(START, "plan").edge("plan", "approve").edge("approve", "book").edge("book", END).compile({ checkpointer: saver || G.MemorySaver() });
  const hitl = (charge, thread) => { const side = []; const app = bookGraph(charge, side); const first = app.run({ plan: "", approved: false, booking: "" }, { thread }); const after = side.slice(); const second = app.run(G.Command({ resume: "approve" }), { thread }); return { first, second, side_after_pause: after, side_effects: side }; };
  S.interrupt = () => hitl(false, "interrupt");
  S.charge_before_interrupt = () => hitl(true, "charge_before_interrupt");
  const ttGraph = (ran) => G.graph({ budget: {}, research: {}, hotel: {}, summary: {} })
    .node("research", () => ({ research: "museums, cafes, rain on Saturday" }))
    .node("choose_hotel", (s_) => { if (ran) ran.push(1); return { hotel: s_.budget >= 190 ? "Hotel Lumiere (EUR 190)" : "Hotel Soleil (EUR 140)" }; })
    .node("summary", (s_) => ({ summary: `${s_.hotel} + ${s_.research}` }))
    .edge(START, "research").edge("research", "choose_hotel").edge("choose_hotel", "summary").edge("summary", END).compile({ checkpointer: G.MemorySaver() });
  const tree = (app, thread, withValues) => app.history(thread).map((c) => Object.assign({ id: c.id, parent: c.parent, step: c.step, source: c.source, next: c.tasks.map((t) => t.name) }, withValues ? { values: clone(c.values) } : {}));
  S.time_travel = () => { const app = ttGraph(); const original = app.run({ budget: 150, research: "", hotel: "", summary: "" }, { thread: "maya-trip" }); const before = app.history("maya-trip").find((c) => c.tasks.length === 1 && c.tasks[0].name === "choose_hotel"); const f = app.updateState("maya-trip", before.id, { budget: 200 }); const fork = app.run(null, { thread: "maya-trip", checkpoint: f.id }); return { original, fork, tree: tree(app, "maya-trip", true) }; };
  S.replay = () => { const ran = []; const app = ttGraph(ran); const original = app.run({ budget: 150, research: "", hotel: "", summary: "" }, { thread: "replay" }); const before = app.history("replay").find((c) => c.tasks.length === 1 && c.tasks[0].name === "choose_hotel"); const replay = app.run(null, { thread: "replay", checkpoint: before.id }); return { original, replay, tree: tree(app, "replay"), choose_hotel_runs: ran.length }; };
  S.react = () => {
    const SCRIPT = [{ type: "ai", content: "", id: "ai-1", tool_calls: [{ name: "search_museums", args: { city: "Paris" }, id: "call_1" }] }, { type: "ai", content: "", id: "ai-2", tool_calls: [{ name: "opening_hours", args: { place: "Orsay museum" }, id: "call_2" }] }, { type: "ai", content: "Rainy-day pick: the Orsay museum (09:30-18:00, closed Monday).", id: "ai-3" }];
    const tools = { search_museums: () => "Louvre, Orsay museum, Rodin museum", opening_hours: (a) => ({ "Orsay museum": "09:30-18:00, closed Monday" })[a.place] || "09:00-18:00" };
    return G.graph({ messages: { reducer: "add_messages" } }).node("llm", (s_) => ({ messages: [SCRIPT[s_.messages.filter((m) => m.type === "ai").length]] })).node("tools", G.prebuilt.toolNode(tools))
      .edge(START, "llm").cond("llm", G.prebuilt.toolsCondition, ["tools", END]).edge("tools", "llm").compile()
      .run({ messages: [{ type: "human", content: "Find a rainy-day museum in Paris and check its hours.", id: "h-1" }] });
  };
  S.crash_resume = () => {
    const calls = {};
    const app = fanGraph((s_) => { calls[s_.day] = (calls[s_.day] || 0) + 1; if (s_.day === "Sun" && calls[s_.day] === 1) throw err("ConnectionError", "museum API timed out"); return { notes: [`${s_.day}: ${PLACES[s_.day]}`] }; }).compile({ checkpointer: G.MemorySaver() });
    const first = app.run({ days: [], notes: [], plan: "" }, { thread: "crash" }); const after = Object.assign({}, calls);
    const second = app.run(null, { thread: "crash" });
    return { first, second, calls_after_crash: after, calls_total: calls };
  };
  G.teamGraph = function (opt) {
    opt = opt || {};
    const side = opt.side || [], costs = opt.costs || [970, 885, 860];
    const g = G.graph({ request: {}, budget: {}, plan: {}, research: { reducer: "append" }, draft: {}, cost: {}, revisions: {}, approved: {}, booking: {} })
      .node("lead", () => ({ plan: "3 rain-friendly days: check the weather, trains and hotel, and indoor activities" }), { kind: "llm" })
      .node("weather", () => ({ research: ["weather: rain Saturday (70%), dry Sunday, light rain Monday evening"] }), { kind: "llm" })
      .node("travel", () => ({ research: ["travel: train 90 euros return; Hotel Lumiere 190 euros a night x 3 = 570"] }), { kind: "llm" })
      .node("activities", () => ({ research: ["activities: Orsay museum Sat, Sainte-Chapelle Sun, Louvre Mon"] }), { kind: "llm" })
      .node("writer", (s_) => ({ draft: `draft ${s_.revisions + 1}`, cost: costs[Math.min(s_.revisions, costs.length - 1)], revisions: s_.revisions + 1 }), { kind: "llm" })
      .node("critic", (s_) => ({ approved: s_.cost <= s_.budget }), { kind: "llm" })
      .node("approve", (s_, ctx) => { side.push("prepared the booking summary"); const ans = ctx.interrupt({ question: `Book Hotel Lumiere for 3 nights? Total trip cost: ${s_.cost} euros (budget ${s_.budget}).`, options: ["approve", "edit", "reject"] }); return { approved: ans === "approve" }; }, { kind: "human" })
      .node("book", () => { side.push("BOOKED Hotel Lumiere"); return { booking: "confirmed: Hotel Lumiere, 3 nights" }; }, { kind: "tool" })
      .edge(START, "lead")
      .cond("lead", () => [G.Send("weather", { day: "Saturday" }), G.Send("travel", { route: "London-Paris" }), G.Send("activities", { rainy: true })], ["weather", "travel", "activities"], { send: true })
      .edge("weather", "writer").edge("travel", "writer").edge("activities", "writer").edge("writer", "critic")
      .cond("critic", (s_) => (s_.approved ? "approve" : s_.revisions >= (opt.maxRevisions || 3) ? "give_up" : "writer"), { approve: "approve", writer: "writer", give_up: END })
      .cond("approve", (s_) => (s_.approved ? "book" : END), ["book", END]).edge("book", END);
    return g;
  };
  G.teamInput = () => ({ request: "Plan three rain-friendly days in Paris within my budget.", budget: 900, plan: "", research: [], draft: "", cost: 0, revisions: 0, approved: false, booking: "" });
  S.team = () => { const side = []; const app = G.teamGraph({ side }).compile({ checkpointer: G.MemorySaver() }); const first = app.run(G.teamInput(), { thread: "maya-paris" }); const after = side.slice(); const second = app.run(G.Command({ resume: "approve" }), { thread: "maya-paris" }); return { first, second, side_after_pause: after, side_effects: side }; };
  S.two_interrupts = () => {
    const asked = [];
    const app = G.graph({ dates: {}, budget: {}, summary: {} })
      .node("ask", (s_, ctx) => { asked.push(1); const d = ctx.interrupt("Which dates?"); const b = ctx.interrupt("What budget?"); return { dates: d, budget: b }; })
      .node("summarise", (s_) => ({ summary: `${s_.dates}, ${s_.budget}` })).edge(START, "ask").edge("ask", "summarise").edge("summarise", END).compile({ checkpointer: G.MemorySaver() });
    const r1 = app.run({ dates: "", budget: "", summary: "" }, { thread: "ask" }), r2 = app.run(G.Command({ resume: "Fri 13 to Mon 16 Nov" }), { thread: "ask" }), r3 = app.run(G.Command({ resume: "900 euros" }), { thread: "ask" });
    return { runs: [r1, r2, r3], node_starts: asked.length };
  };

  /* --- Phase 2 recordings, set 3: merging, routing, retries, streaming, ToolNode, interrupts, the Store */
  S.double_append = () => G.graph({ notes: { reducer: "append" } }).node("travel", (s_) => ({ notes: s_.notes.concat(["Lumiere: next to the Orsay museum"]) })).edge(START, "travel").edge("travel", END).compile().run({ notes: ["Maya: near a metro"] });
  S.overwrite = () => G.graph({ options: { reducer: "append" } }).node("research", () => ({ options: ["Lumiere 190", "Soleil 140", "Ritz 1200"] })).node("reset", () => ({ options: G.Overwrite(["Soleil 140"]) })).node("extra", () => ({ options: ["Lumiere 190"] }))
    .edge(START, "research").edge("research", "reset").edge("research", "extra").edge("reset", END).edge("extra", END).compile().run({ options: [] });
  S.overwrite_twice = () => G.graph({ options: { reducer: "append" } }).node("a", () => ({ options: G.Overwrite(["A"]) })).node("b", () => ({ options: G.Overwrite(["B"]) })).edge(START, "a").edge(START, "b").edge("a", END).edge("b", END).compile().run({ options: [] });
  S.messages_edit = () => G.graph({ messages: { reducer: "add_messages" } }).node("draft", () => ({ messages: [{ type: "ai", content: "Pack sunglasses.", id: "ai-1" }] })).node("fix", () => ({ messages: [{ type: "ai", content: "Pack an umbrella: rain on Saturday.", id: "ai-1" }] })).node("tidy", () => ({ messages: [{ type: "remove", id: "note-1" }] }))
    .edge(START, "draft").edge("draft", "fix").edge("fix", "tidy").edge("tidy", END).compile().run({ messages: [{ type: "human", content: "Do I need an umbrella?", id: "h-1" }, { type: "ai", content: "(internal note: check the forecast)", id: "note-1" }] });
  S.command_plus_edge = () => G.graph({ question: {}, answer: {}, log: { reducer: "append" } })
    .node("router", () => G.Command({ update: { log: ["routed to weather"] }, goto: "weather_desk" }), { destinations: ["weather_desk", "planner_desk"] })
    .node("weather_desk", () => ({ answer: "Yes: rain is forecast on Saturday." })).node("planner_desk", () => ({ answer: "Here is a three-day plan." })).node("audit", (s_) => ({ log: ["audit saw: " + s_.question] }))
    .edge(START, "router").edge("router", "audit").edge("weather_desk", END).edge("planner_desk", END).edge("audit", END).compile().run({ question: "Do I need an umbrella?", answer: "", log: [] });
  S.route_list = () => G.graph({ request: {}, found: { reducer: "append" } }).node("triage", () => ({})).node("weather", () => ({ found: ["weather: rain Saturday"] })).node("museums", () => ({ found: ["museums: Orsay open Saturday"] })).node("hotels", () => ({ found: ["hotels: Lumiere 190 a night"] }))
    .edge(START, "triage").cond("triage", (s_) => [["weather", "rain"], ["museums", "museum"], ["hotels", "hotel"]].filter(([, w]) => s_.request.includes(w)).map(([n]) => n), ["weather", "museums", "hotels"])
    .edge("weather", END).edge("museums", END).edge("hotels", END).compile().run({ request: "Will it rain, and which museum is open?", found: [] });
  const retryGraph = (fn) => G.graph({ forecast: {} }).node("get_forecast", fn, { kind: "tool", retry: { maxAttempts: 3 } }).edge(START, "get_forecast").edge("get_forecast", END).compile();
  S.retry_flaky = () => { let n = 0; const r = retryGraph(() => { n++; if (n < 3) throw err("ConnectionError", "weather API timed out"); return { forecast: "rain on Saturday (70%)" }; }).run({ forecast: "" }); r.attempts = n; return r; };
  S.retry_value_error = () => { let n = 0; const r = retryGraph(() => { n++; throw err("ValueError", "day must be one of Friday, Saturday, Sunday, Monday"); }).run({ forecast: "" }); r.attempts = n; return r; };
  S.stream_modes = () => { const r = S.chain(); return { values: G.streamValues(r), updates: G.streamUpdates(r) }; };
  S.merge_order = () => G.graph({ notes: { reducer: "append" } }).node("a_slow", () => ({ notes: ["from a_slow"] })).node("b_fast", () => ({ notes: ["from b_fast"] })).edge(START, "a_slow").edge(START, "b_fast").edge("a_slow", END).edge("b_fast", END).compile().run({ notes: [] });
  const DAYS4 = ["Friday", "Saturday", "Sunday", "Monday"];
  G.orsayTool = { fn: (a) => { if (!DAYS4.includes(a.day)) throw err("ValueError", "day must be one of Friday, Saturday, Sunday, Monday"); return a.day === "Monday" && /Orsay/.test(a.place) ? "closed on Monday" : "9:30 am to 6 pm"; }, required: ["place", "day"] };
  G.toolCall = (i, name, args) => ({ type: "ai", content: "", tool_calls: [{ name, args, id: "call_" + i }], id: "ai-" + i });
  G.toolGraph = (script, opts) => G.graph({ messages: { reducer: "add_messages" } }).node("llm", (s_) => ({ messages: [script[Math.min(s_.messages.filter((m) => m.type === "ai").length, script.length - 1)]] }), { kind: "llm" }).node("tools", G.prebuilt.toolNode({ opening_hours: G.orsayTool }, opts), { kind: "tool" })
    .edge(START, "llm").cond("llm", G.prebuilt.toolsCondition, ["tools", END]).edge("tools", "llm");
  const ASK_ORSAY = () => ({ messages: [{ type: "human", content: "Is the Orsay museum open on Monday?", id: "h-1" }] });
  G.orsayScripts = {
    default: [G.toolCall(1, "opening_hours", { place: "Orsay museum" }), G.toolCall(2, "opening_hours", { place: "Orsay museum", day: "Mon" }), { type: "ai", content: "unreachable", id: "ai-3" }],
    handled: [G.toolCall(1, "opening_hours", { place: "Orsay museum" }), G.toolCall(2, "opening_hours", { place: "Orsay museum", day: "Mon" }), G.toolCall(3, "get_weather", { city: "Paris" }), G.toolCall(4, "opening_hours", { place: "Orsay museum", day: "Monday" }), { type: "ai", content: "The Orsay museum is closed on Monday: go on Saturday or Sunday.", id: "ai-5" }] };
  S.toolnode_default = () => G.toolGraph(G.orsayScripts.default).compile().run(ASK_ORSAY());
  S.toolnode_handled = () => G.toolGraph(G.orsayScripts.handled, { handleErrors: true }).compile().run(ASK_ORSAY());
  const downGraph = (saver) => G.graph({ forecast: {} }).node("get_forecast", () => { throw err("ConnectionError", "weather API timed out"); }, { kind: "tool" }).edge(START, "get_forecast").edge("get_forecast", END).compile({ checkpointer: saver });
  S.crash_no_saver = () => downGraph(null).run({ forecast: "" });
  S.crash_saver = () => downGraph(G.MemorySaver()).run({ forecast: "" }, { thread: "crash_saver" });
  G.approveGraph = (node, saver) => G.graph({ approved: {}, booking: {} }).node("approve", node, { kind: "human" }).node("book", (s_) => ({ booking: s_.approved ? "confirmed" : "cancelled" }), { kind: "tool" }).edge(START, "approve").edge("approve", "book").edge("book", END).compile({ checkpointer: saver });
  S.interrupt_try_except = () => G.approveGraph((s_, ctx) => { let ans; try { ans = ctx.interrupt({ question: "Book Hotel Lumiere for 570 euros?" }); } catch (e) { ans = "approve"; } return { approved: ans === "approve" }; }, G.MemorySaver()).run({ approved: false, booking: "" }, { thread: "try" });
  S.interrupt_no_saver = () => {
    const app = G.approveGraph((s_, ctx) => ({ approved: ctx.interrupt({ question: "Book Hotel Lumiere for 570 euros?" }) === "approve" }), null);
    const first = app.run({ approved: false, booking: "" });
    let resume_error = null;
    try { app.run(G.Command({ resume: "approve" })); } catch (e) { resume_error = e.name + ": " + e.message; }
    return { first, resume_error };
  };
  G.memoryApp = (store) => G.graph({ said: {}, reply: {} })
    .node("assistant", (s_, ctx) => { if (/crepe/.test(s_.said)) { ctx.store.put(["maya", "preferences"], "food", { likes: "crepes" }); return { reply: "Noted: you like crepes." }; } const it = ctx.store.get(["maya", "preferences"], "food"); return { reply: it ? "Try the creperie on Rue du Bac: you like " + it.value.likes + "." : "Any food you love?" }; }, { kind: "llm" })
    .edge(START, "assistant").edge("assistant", END).compile({ checkpointer: G.MemorySaver(), store });
  S.store = () => {
    const store = G.Store(), app = G.memoryApp(store);
    const thread1 = app.run({ said: "I love crepes.", reply: "" }, { thread: "monday-chat" });
    const thread2 = app.run({ said: "Where should I eat on Saturday?", reply: "" }, { thread: "friday-chat" });
    store.put(["maya", "preferences"], "museums", { likes: "impressionists" });
    store.put(["tom", "preferences"], "food", { likes: "ramen" });
    const items = (xs) => xs.map((i) => ({ namespace: i.namespace, key: i.key, value: i.value }));
    return { thread1, thread2, search_maya: items(store.search(["maya"])), search_filter: items(store.search(["maya", "preferences"], { filter: { likes: "crepes" } })), search_tom: items(store.search(["tom"])), get_missing: store.get(["maya", "preferences"], "hotels") };
  };

  G.chatApp = () => G.graph({ messages: { reducer: "add_messages" } }).node("assistant", (s_) => { const said = s_.messages.filter((m) => m.type === "human").map((m) => m.content); const food = said.find((x) => x.includes("crêpe")); const last = said[said.length - 1]; return { messages: [{ type: "ai", content: food && last.includes("eat") ? "Earlier you said you love crêpes: try the creperie on Rue du Bac." : last.includes("eat") ? "Any food you love?" : "Noted.", id: "ai-" + said.length }] }; }, { kind: "llm" })
    .edge(START, "assistant").edge("assistant", END).compile({ checkpointer: G.MemorySaver() });
  S.same_thread = () => { const app = G.chatApp(); const monday1 = app.run({ messages: [{ type: "human", content: "I love crêpes.", id: "h-1" }] }, { thread: "monday" }); const monday2 = app.run({ messages: [{ type: "human", content: "Where should I eat on Saturday?", id: "h-2" }] }, { thread: "monday" }); const friday = app.run({ messages: [{ type: "human", content: "Where should I eat on Saturday?", id: "h-2" }] }, { thread: "friday" }); return { monday1, monday2, friday }; };

  /* run every scenario and compare with the real recordings */
  G.verifyAll = function (recorded) {
    const rows = [];
    Object.entries(recorded).forEach(([name, rec]) => {
      const fn = S[name];
      if (!fn) { rows.push({ name, ok: false, diffs: ["no engine version"] }); return; }
      let mine;
      try { mine = fn(); } catch (e) { rows.push({ name, ok: false, diffs: ["engine threw: " + e.message] }); return; }
      const diffs = [];
      if (rec.events) { diffs.push(...G.compare(rec, mine)); if (rec.attempts !== undefined && rec.attempts !== mine.attempts) diffs.push(`attempts: real ${rec.attempts} vs engine ${mine.attempts}`); }
      else Object.keys(rec).forEach((k) => {
        const a = rec[k], b = mine[k];
        if (a && a.events) G.compare(a, b).forEach((d) => diffs.push(k + ": " + d));
        else if (k === "runs") a.forEach((r, i) => G.compare(r, b[i]).forEach((d) => diffs.push(`run ${i + 1}: ${d}`)));
        else if (k === "tree") { const keys = (x) => x.map((c) => JSON.stringify([c.id, c.parent, c.step, c.source, c.next].concat(c.values ? [c.values] : []))); const bb = b.map((c) => (a[0] && a[0].values === undefined ? Object.assign({}, c, { values: undefined }) : c)); if (JSON.stringify(keys(a)) !== JSON.stringify(keys(bb))) diffs.push("checkpoint tree differs"); }
        else if (canon(a) !== canon(b)) diffs.push(`${k}: real ${JSON.stringify(a)} vs engine ${JSON.stringify(b)}`);
      });
      rows.push({ name, ok: !diffs.length, diffs });
    });
    return rows;
  };

  /* ================================================================ drawing */
  const h = MM.h, s = MM.s;
  const KIND = { llm: { col: "var(--llm)", icon: "brain", label: "LLM call" }, tool: { col: "var(--code)", icon: "wrench", label: "tool" }, human: { col: "var(--person)", icon: "hand", label: "person" }, fn: { col: "var(--code)", icon: "cog", label: "plain function" } };
  G.KIND = KIND;
  let gid = 0;
  /* spec: { W, H, nodes: {name: {x, y, kind, label?, w?}}, edges?: extra drawn edges [{a, b, kind, label, via}] }
     builder: a StateGraph (edges are taken from it) */
  G.draw = function (builder, spec, opts) {
    opts = opts || {};
    const id = "g" + ++gid;
    const W = spec.W || 520, H = spec.H || 300;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", style: `max-width:${opts.maxW || W * 1.35}px;margin:0 auto`, role: "img", "aria-label": opts.label || "Graph of the workflow" });
    const defs = s("defs");
    [["a", "var(--ink-3)"], ["l", "var(--seine)"]].forEach(([k, c]) => defs.append(s("marker", { id: id + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0 10 5 0 10z", fill: c }))));
    svg.append(defs);
    const pos = Object.assign({}, spec.nodes);
    if (!pos[START]) pos[START] = spec.start || { x: 40, y: H / 2 };
    if (!pos[END]) pos[END] = spec.end || { x: W - 40, y: H / 2 };
    const size = (n) => (n === START || n === END ? { w: 64, h: 28 } : { w: (pos[n] && pos[n].w) || 118, h: 42 });
    const box = (n) => { const p = pos[n], z = size(n); return { x: p.x - z.w / 2, y: p.y - z.h / 2, w: z.w, h: z.h, cx: p.x, cy: p.y }; };
    const edgePt = (n, tx, ty) => { const b = box(n), dx = tx - b.cx, dy = ty - b.cy; if (!dx && !dy) return [b.cx, b.cy]; const t = Math.min(dx ? Math.abs(b.w / 2 / dx) : Infinity, dy ? Math.abs(b.h / 2 / dy) : Infinity); return [b.cx + dx * t, b.cy + dy * t]; };
    const edges = [];
    builder.edges.forEach((e) => edges.push({ a: e.src, b: e.dst, kind: "fixed" }));
    builder.joins.forEach((j) => j.srcs.forEach((s_) => edges.push({ a: s_, b: j.dst, kind: "join", label: "waits for all" })));
    Object.entries(builder.branches).forEach(([src, list]) => list.forEach((br) => (br.paths ? (Array.isArray(br.paths) ? br.paths.map((t) => [t, null]) : Object.entries(br.paths).map(([k, t]) => [t, k])) : []).forEach(([t, k]) => edges.push({ a: src, b: t, kind: br.send ? "send" : "cond", label: br.send ? "Send" : (spec.labels && spec.labels[src + ">" + t]) || (k && k !== t ? k : null) }))));
    Object.values(builder.nodes).forEach((n) => (n.destinations || []).forEach((t) => edges.push({ a: n.name, b: t, kind: "command", label: "Command" })));
    (spec.edges || []).forEach((e) => edges.push(e));
    const seenPair = {};
    const linkEls = [];
    edges.forEach((e) => {
      if (!pos[e.a] || !pos[e.b]) return;
      const pairKey = e.a + ">" + e.b;
      if (seenPair[pairKey]) return;
      seenPair[pairKey] = true;
      const A = box(e.a), B = box(e.b);
      let d, start, labelAt;
      const via = (spec.via && spec.via[pairKey]) || e.via;
      if (via) {
        const pts = [edgePt(e.a, via[0][0], via[0][1])].concat(via, [edgePt(e.b, via[via.length - 1][0], via[via.length - 1][1])]);
        d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
        start = pts[0]; labelAt = via[Math.floor(via.length / 2)];
      } else {
        const p1 = edgePt(e.a, B.cx, B.cy), p2 = edgePt(e.b, A.cx, A.cy);
        const back = edges.some((x) => x.a === e.b && x.b === e.a && !((spec.via && spec.via[x.a + ">" + x.b]) || x.via));
        start = p1;
        if (back) { const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, nx = -(p2[1] - p1[1]), ny = p2[0] - p1[0], L = Math.hypot(nx, ny) || 1, off = 26, cx = mx + nx / L * off, cy = my + ny / L * off; d = `M${p1[0]} ${p1[1]} Q ${cx} ${cy} ${p2[0]} ${p2[1]}`; labelAt = [(p1[0] + 2 * cx + p2[0]) / 4, (p1[1] + 2 * cy + p2[1]) / 4 + (ny > 0 ? 12 : -2)]; }
        else { d = `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; labelAt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]; }
      }
      const path = s("path", { d, class: "gedge" + (e.kind !== "fixed" && e.kind !== "join" ? " cond" : ""), "marker-end": `url(#${id}a)` });
      path.dataset.a = e.a; path.dataset.b = e.b;
      svg.append(path);
      linkEls.push(path);
      if (e.kind === "cond" || e.kind === "send" || e.kind === "command") svg.append(s("path", { d: `M${start[0]} ${start[1] - 5} l5 5 -5 5 -5 -5z`, fill: "var(--sheet)", stroke: "var(--ink-3)", "stroke-width": 1.4 }));
      if (e.label && !opts.noLabels) svg.append(s("text", { x: labelAt[0] + 4, y: labelAt[1] - 5, "font-size": 10.5, fill: "var(--ink-2)", style: "paint-order:stroke;stroke:var(--sheet);stroke-width:4px;stroke-linejoin:round", text: e.label }));
    });
    const nodeEls = {};
    Object.keys(pos).forEach((n) => {
      if (n !== START && n !== END && !builder.nodes[n] && !(spec.nodes[n] && spec.nodes[n].ghost)) return;
      const b = box(n), g = s("g", { class: "gnode" });
      g.dataset.n = n;
      if (n === START || n === END) {
        g.append(s("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 14, fill: "var(--ink)", stroke: "var(--ink)" }), s("text", { x: b.cx, y: b.cy + 4, "text-anchor": "middle", "font-size": 11, class: "t-disp", fill: "var(--paper)", style: "fill:var(--paper)", text: n === START ? "START" : "END" }));
      } else {
        const kind = (spec.nodes[n] && spec.nodes[n].kind) || (builder.nodes[n] && builder.nodes[n].kind) || "fn";
        const k = KIND[kind] || KIND.fn;
        g.append(s("rect", { class: "frame", x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: kind === "llm" ? "color-mix(in srgb, var(--llm) 8%, var(--sheet))" : kind === "human" ? "color-mix(in srgb, var(--person) 12%, var(--sheet))" : "var(--sheet)", stroke: k.col }));
        const ic = MM.icon(k.icon);
        ic.setAttribute("x", b.x + 7); ic.setAttribute("y", b.cy - 9); ic.setAttribute("width", 18); ic.setAttribute("height", 18);
        ic.style.color = k.col;
        g.append(ic);
        const label = (spec.nodes[n] && spec.nodes[n].label) || n;
        g.append(s("text", { x: b.x + 30, y: b.cy + 4.5, "font-size": label.length > 12 ? 11.5 : 13, class: "t-disp", text: label }));
        const badge = s("g", { class: "badge", style: "display:none" }, s("circle", { cx: b.x + b.w - 2, cy: b.y + 2, r: 10, fill: "var(--seine)" }), s("text", { x: b.x + b.w - 2, y: b.y + 6, "text-anchor": "middle", "font-size": 10.5, class: "t-mono", fill: "var(--seine-ink)" }));
        g.append(badge);
      }
      svg.append(g);
      nodeEls[n] = g;
    });
    svg._nodes = nodeEls; svg._links = linkEls; svg._id = id;
    return svg;
  };
  /* highlight: active = {name: count}; ran = Set; live = Set of "a>b" */
  G.light = function (svg, active, ran, live, opts) {
    opts = opts || {};
    Object.entries(svg._nodes).forEach(([n, g]) => {
      const c = active && active[n];
      g.classList.toggle("active", !!c);
      g.classList.toggle("ran", !c && ran && ran.has(n));
      g.classList.toggle("interrupted", !!(opts.paused && opts.paused.includes(n)));
      g.classList.toggle("failed", !!(opts.failed && opts.failed.includes(n)));
      const fr = g.querySelector(".frame");
      if (fr) fr.style.stroke = opts.failed && opts.failed.includes(n) ? "var(--bad)" : opts.paused && opts.paused.includes(n) ? "var(--person)" : c ? "var(--seine)" : "";
      const b = g.querySelector(".badge");
      if (b) { b.style.display = c > 1 ? "" : "none"; if (c > 1) b.querySelector("text").textContent = "×" + c; }
    });
    svg._links.forEach((p) => {
      const on = live && live.has(p.dataset.a + ">" + p.dataset.b);
      p.classList.toggle("live", !!on);
      p.setAttribute("marker-end", `url(#${svg._id}${on ? "l" : "a"})`);
    });
  };

  /* the state board: a clipboard of fields, each with its merge rule */
  const brief = (v, max) => {
    max = max || 80;
    if (v === undefined) return "—";
    if (typeof v === "string") return v.length > max ? "“" + v.slice(0, max - 1) + "…”" : "“" + v + "”";
    const t = JSON.stringify(v);
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  };
  G.brief = brief;
  G.board = function (schema, values, changed, opts) {
    opts = opts || {};
    const el = h("div", { class: "board" }, h("div", { class: "clip" }));
    Object.keys(schema).forEach((k) => {
      if (opts.hide && opts.hide.includes(k)) return;
      const v = values ? values[k] : undefined;
      let shown;
      if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && v[0].type) shown = h("div", { class: "stack", style: "--gap:3px" }, v.map((m) => h("div", { style: "font-size:.8rem" }, h("strong", null, m.type === "ai" ? (m.tool_calls && m.tool_calls.length ? "AI → tool call " : "AI ") : m.type === "tool" ? "tool result " : m.type + " "), m.tool_calls && m.tool_calls.length ? m.tool_calls.map((tc) => `${tc.name}(${JSON.stringify(tc.args)})`).join(", ") : brief(m.content, 70))));
      else if (Array.isArray(v)) shown = v.length ? h("div", { class: "stack", style: "--gap:2px" }, v.map((x) => h("div", null, "• " + (typeof x === "string" ? x : JSON.stringify(x))))) : "[ ]";
      else shown = brief(v, opts.max || 90);
      el.append(h("div", { class: "field-row" + (changed && changed.has(k) ? " flash" + (opts.keep ? " changed" : "") : "") }, h("span", { class: "k" }, k), h("span", { class: "v" }, shown), h("span", { class: "rule" }, G.ruleLabel(schema[k]))));
    });
    return el;
  };

  /* ================================================================ the run player (Graph Debugger) */
  /* o: { builder, spec, run, schema, phases (bool: show plan/execute/update/save), title, onFrame } */
  G.player = function (el, o) {
    const run = o.run, steps = run.steps, schema = o.schema || o.builder.schema;
    const frames = [];
    const startVals = steps.length && steps[0].start ? steps[0].after : (steps[0] && steps[0].before) || {};
    frames.push({ kind: "start", step: 0, values: startVals, next: steps.length && steps[0].start ? steps[0].next : steps[0] ? steps[0].tasks.map((t) => t.name) : [] });
    steps.filter((x) => !x.start).forEach((st) => {
      const count = {};
      st.tasks.forEach((t) => (count[t.name] = (count[t.name] || 0) + 1));
      if (o.phases) {
        frames.push({ kind: "plan", st, count, values: st.before });
        frames.push({ kind: "execute", st, count, values: st.before });
      }
      frames.push({ kind: "update", st, count, values: st.after || st.before });
    });
    const outcome = run.outcome;
    let i = 0, timer = null;
    const svg = G.draw(o.builder, o.spec, { label: o.title });
    const round = h("div", { class: "row", style: "--gap:8px" });
    const log = h("div", { class: "log", "aria-live": "polite", style: "max-height:220px" });
    const boardBox = h("div");
    const tl = h("div", { class: "timeline", role: "group", "aria-label": "Checkpoints" });
    const back = h("button", { class: "iconbtn", "aria-label": "Back" }, MM.icon("back")), next = h("button", { class: "btn primary small" }, "Next", MM.icon("next")), play = h("button", { class: "btn small" }, MM.icon("play"), "Play"), reset = h("button", { class: "btn small ghost" }, "Reset");
    const status = h("div");
    el.append(h("div", { class: "gplayer" }, h("div", { class: "pgrid" }, h("div", null, h("div", { class: "bp", style: "padding:6px" }, svg), h("div", { class: "row", style: "margin-top:8px" }, back, next, play, reset, h("span", { class: "grow" }), round)),
      h("div", { class: "stack", style: "--gap:8px" }, h("div", { class: "eyebrow" }, "Shared state (after this moment)"), boardBox, h("div", { class: "eyebrow" }, "What the engine did"), log)), h("div", { class: "eyebrow", style: "margin-top:10px" }, "Checkpoints saved"), tl, status));
    const ran = new Set();
    function phaseChips(k) { return ["plan", "execute", "update", "save"].map((p) => h("span", { class: "pill" + ((k === p) || (k === "update" && p === "save" && !o.phases) ? " ok" : "") }, p)); }
    function show(n) {
      i = MM.clamp(n, 0, frames.length - 1);
      const f = frames[i];
      ran.clear();
      frames.slice(1, i + 1).forEach((x) => x.kind === "update" && x.st.tasks.forEach((t) => ran.add(t.name)));
      const prevUpd = frames.slice(0, i).reverse().find((x) => x.kind === "update");
      const live = new Set();
      if (f.st && (f.kind === "plan" || f.kind === "update" && !o.phases)) {
        const prev = prevUpd ? prevUpd.st.tasks.map((t) => t.name) : [START];
        f.st.tasks.forEach((t) => prev.forEach((p) => live.add(p + ">" + t.name)));
      }
      const failedNames = f.st ? f.st.tasks.filter((t) => t.error).map((t) => t.name) : [], pausedNames = f.st ? f.st.tasks.filter((t) => t.interrupt !== undefined).map((t) => t.name) : [];
      G.light(svg, f.count || (f.kind === "start" ? Object.fromEntries((f.next || []).map((n2) => [n2, 0])) : {}), ran, live, { failed: failedNames, paused: pausedNames });
      round.innerHTML = "";
      const firstRound = (steps.find((x) => !x.start) || { step: 1 }).step;
      round.append(h("span", { class: "eyebrow" }, f.kind === "start" ? `Before round ${firstRound}` : `Round ${f.st.step}`), ...(f.st ? phaseChips(f.kind) : []));
      const changed = new Set();
      if (f.kind === "update" && f.st.after) Object.keys(f.st.after).forEach((k) => { if (JSON.stringify(f.st.after[k]) !== JSON.stringify(f.st.before[k])) changed.add(k); });
      boardBox.innerHTML = "";
      boardBox.append(G.board(schema, f.values, changed, o.boardOpts));
      log.innerHTML = "";
      const L = (cls, txt) => log.append(h("div", { class: cls || "" }, txt));
      if (f.kind === "start") L("dim", steps.length && steps[0].start ? `The input is written to the state. Scheduled for round ${firstRound}: ${(f.next || []).join(", ") || "nothing"}.` : `Resumed from the saved checkpoint: the state is loaded as it was. Scheduled for round ${firstRound}: ${(f.next || []).join(", ") || "nothing"}.`);
      else {
        const st = f.st;
        const names = Object.entries(f.count).map(([n2, c]) => (c > 1 ? `${n2} ×${c}` : n2)).join(", ");
        L("", `PLAN · scheduled: ${names}` + (st.tasks.some((t) => t.push) ? " (Send: each task gets its own input)" : ""));
        if (f.kind !== "plan") st.tasks.forEach((t) => {
          const who = t.push ? `${t.name}(${G.brief(t.arg, 40)})` : t.name;
          if (t.cached) L("dim", `EXECUTE · ${who}: skipped, its writes were saved before the crash → ${G.brief(Object.fromEntries(t.writes || []), 90)}`);
          else if (t.error) L("err", `EXECUTE · ${who}: FAILED (${t.error})`);
          else if (t.interrupt !== undefined) L("err", `EXECUTE · ${who}: PAUSED by interrupt() → asks: ${G.brief(t.interrupt, 90)}`);
          else L("", `EXECUTE · ${who} writes ${G.brief(Object.fromEntries(t.writes || []), 110)}${t.goto ? " and goes to " + (Array.isArray(t.goto) ? t.goto.join(", ") : t.goto) : ""}${t.retries ? ` (after ${t.retries.length} failed attempt${t.retries.length > 1 ? "s" : ""})` : ""}  · buffered`);
        });
        if (f.kind === "update") {
          if (st.updateError) L("err", "UPDATE · " + st.updateError);
          else if (st.after) { const ks = [...changed]; L("ok", `UPDATE · merged ${ks.length ? ks.map((k) => `${k} (${G.ruleLabel(schema[k])})`).join(", ") : "no changes"}`); }
          if (st.cp) L("ok", `SAVE · checkpoint ${st.cp}${st.next ? " · next: " + (st.next.length ? st.next.join(", ") : "nothing → the run ends") : ""}`);
          else if (st.after) L("dim", st.next && st.next.length ? `NEXT · ${st.next.join(", ")}` : "NEXT · nothing scheduled → the run ends");
          if (st.pendingSaved && st.pendingSaved.length) L("ok", `SAVE · pending writes kept for: ${st.pendingSaved.join(", ")}`);
        }
      }
      tl.innerHTML = "";
      frames.slice(0, i + 1).forEach((x) => { const cpId = x.kind === "start" ? (steps[0] && steps[0].cp) : x.kind === "update" ? x.st.cp : null; if (cpId) tl.append(h("span", { class: "snap", "aria-pressed": String(x === f) }, MM.icon("camera"), cpId)); });
      if (!tl.childNodes.length) tl.append(h("span", { class: "faint", style: "font-size:.88rem" }, o.builderNoSaver ? "No checkpointer attached: nothing is saved." : "None yet."));
      status.innerHTML = "";
      if (i === frames.length - 1) status.append(outcomeBox(outcome));
      back.disabled = i === 0; next.disabled = i === frames.length - 1;
      if (o.onFrame) o.onFrame(f, i, frames.length);
    }
    back.onclick = () => show(i - 1);
    next.onclick = () => show(i + 1);
    reset.onclick = () => { stop(); show(0); };
    function stop() { clearInterval(timer); timer = null; play.lastChild.textContent = "Play"; }
    play.onclick = () => { if (timer) { stop(); return; } if (i >= frames.length - 1) show(0); play.lastChild.textContent = "Pause"; timer = setInterval(() => { if (!el.isConnected || i >= frames.length - 1) { stop(); return; } show(i + 1); }, MM.reducedMotion() ? 1800 : 1300); };
    show(0);
    return { show, frames, stop, svg, get index() { return i; } };
  };
  function outcomeBox(oc) {
    if (oc.status === "done") return h("div", { class: "callout ok", style: "margin-top:10px" }, h("strong", null, "Run finished. "), "Nothing more was scheduled, so the run reached its end.");
    if (oc.status === "interrupted") return h("div", { class: "callout warn", style: "margin-top:10px" }, h("strong", null, "Paused. "), `interrupt() stopped the run at ${oc.next.join(", ")}. `, oc.saved === false ? "No checkpointer is attached, so nothing was saved: this run can never be resumed." : "Everything is saved in the checkpoint; no program needs to keep running.");
    return h("div", { class: "callout bad", style: "margin-top:10px" }, h("strong", null, oc.error + ": "), oc.message);
  }
  G.outcomeBox = outcomeBox;

  /* a badge that re-runs recorded scenarios in the page and compares them with the real LangGraph runs */
  G.verified = function (names, text) {
    const el = h("span", { class: "truth REAL", style: "white-space:normal;line-height:1.35;max-width:100%;text-transform:none;letter-spacing:.02em", title: "Each listed run is rebuilt with this page's engine and compared, event by event, with the same graph run in real LangGraph 1.2.17.", tabindex: "0", role: "status" }, "checking against real LangGraph…");
    MM.loadData("lgtraces").then((d) => {
      const sub = {};
      names.forEach((n) => { if (d.scenarios[n]) sub[n] = d.scenarios[n]; });
      const rows = G.verifyAll(sub), ok = rows.filter((r) => r.ok).length;
      el.textContent = "";
      el.append(ok === rows.length ? `REAL · identical to LangGraph ${d.langgraph}` + (text ? " · " + text : "") : `${ok}/${rows.length} runs match LangGraph`);
      el.className = "truth " + (ok === rows.length ? "REAL" : "SKETCH");
    }).catch(() => { el.textContent = "REAL check unavailable offline"; el.className = "truth SKETCH"; });
    return el;
  };

  /* a ready-made picture for the team graph */
  G.teamSpec = { W: 560, H: 430, nodes: { lead: { x: 280, y: 70, kind: "llm" }, weather: { x: 100, y: 160, kind: "llm" }, travel: { x: 280, y: 160, kind: "llm" }, activities: { x: 460, y: 160, kind: "llm" }, writer: { x: 180, y: 250, kind: "llm" }, critic: { x: 380, y: 250, kind: "llm" }, approve: { x: 380, y: 335, kind: "human", label: "Maya approves" }, book: { x: 180, y: 335, kind: "tool", label: "book hotel" } }, start: { x: 280, y: 18 }, end: { x: 180, y: 405 }, via: { "approve>__end__": [[470, 335], [470, 405]], "critic>__end__": [[530, 250], [530, 405]] },
    labels: { "critic>approve": "fits budget", "critic>writer": "over budget", "critic>__end__": "3 tries used", "approve>book": "approved", "approve>__end__": "rejected" } };
})();
