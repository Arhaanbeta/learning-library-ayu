/* Agent engine for M13 (and Phase 2): Maya's trip tools, a scripted ReAct policy, the agent loop,
   and the exact context in OpenAI's harmony format (the chat format of the open-weight gpt-oss models),
   counted with the real o200k tokeniser. */
(function () {
  const MM = window.MM;
  const A = (MM.agent = {});
  const DAYS = ["Friday", "Saturday", "Sunday", "Monday"];
  A.DAYS = DAYS;

  /* harmony special tokens and their IDs (openai/harmony, docs/format.md) */
  const SPECIAL = { "<|start|>": 200006, "<|end|>": 200007, "<|message|>": 200008, "<|channel|>": 200005, "<|constrain|>": 200003, "<|return|>": 200002, "<|call|>": 200012 };
  const SPECIAL_RE = /(<\|start\|>|<\|end\|>|<\|message\|>|<\|channel\|>|<\|constrain\|>|<\|return\|>|<\|call\|>)/;
  A.SPECIAL = SPECIAL;
  let tokP = null;
  A.tokenizer = () => tokP || (tokP = (window.GPTTokenizer_o200k_base ? Promise.resolve() : MM.load("vendor/o200k_base.js")).then(() => window.GPTTokenizer_o200k_base));
  /* text → [{t, id, sp}] : special tokens by ID, everything else by o200k BPE */
  A.tokens = function (T, text) {
    const out = [];
    String(text).split(SPECIAL_RE).forEach((part) => {
      if (!part) return;
      if (SPECIAL[part]) out.push({ t: part, id: SPECIAL[part], sp: true });
      else T.encode(part).forEach((id) => out.push({ t: T.decode([id]), id }));
    });
    return out;
  };
  A.count = (T, text) => A.tokens(T, text).length;
  A.splitSpecial = (text) => String(text).split(SPECIAL_RE).filter(Boolean).map((p) => ({ t: p, sp: !!SPECIAL[p] }));

  /* ------------------------------------------------------------------ Maya's tools (World Bible facts) */
  const FORECAST = {
    Saturday: { day: "Saturday", rain_chance_percent: 70, summary: "showers from late morning", temp_c: 12 },
    Sunday: { day: "Sunday", summary: "dry and cloudy", temp_c: 14 },
    Monday: { day: "Monday", summary: "light rain in the evening", temp_c: 11 } };
  const PLACES = [
    { name: "Orsay museum", kind: "museum", indoor: true, note: "Impressionist paintings; 16 euros; book a time slot on rainy weekends" },
    { name: "Louvre", kind: "museum", indoor: true, note: "largest art museum; 22 euros; use the Carrousel entrance when it rains" },
    { name: "Sainte-Chapelle", kind: "museum", indoor: true, note: "stained glass; on Maya's maybe list" },
    { name: "Bookshop cafe by the Canal Saint-Martin", kind: "cafe", indoor: true, note: "Tom's tip: best hot chocolate in Paris; open until 7 pm" },
    { name: "Creperie on Rue du Bac", kind: "restaurant", indoor: true, note: "near the Orsay museum; cash only" }];
  const HOURS = {
    orsay: { name: "Orsay museum", Friday: "9:30 am to 6 pm", Saturday: "9:30 am to 6 pm", Sunday: "9:30 am to 6 pm", Monday: null },
    louvre: { name: "Louvre", Friday: "9 am to 9 pm", Saturday: "9 am to 6 pm", Sunday: "9 am to 6 pm", Monday: "9 am to 6 pm" },
    cafe: { name: "Bookshop cafe by the Canal Saint-Martin", Friday: "until 7 pm", Saturday: "until 7 pm", Sunday: "until 7 pm", Monday: "until 7 pm" } };
  const placeKey = (p) => { p = String(p || "").toLowerCase(); return /orsay/.test(p) ? "orsay" : /louvre/.test(p) ? "louvre" : /bookshop|canal|tom/.test(p) ? "cafe" : null; };

  const dayProp = { type: "string", enum: DAYS, description: "One day of the trip" };
  A.TOOLS = [
    { name: "get_forecast", description: "Get the saved weather forecast for one day of Maya's Paris trip: chance of rain, temperature and a short summary.",
      schema: { type: "object", properties: { city: { type: "string", description: "City name, e.g. Paris" }, day: dayProp }, required: ["city", "day"] } },
    { name: "find_places", description: "Find museums, cafes and restaurants from Maya's guides and Tom's tips. Use indoor_only on rainy days.",
      schema: { type: "object", properties: { kind: { type: "string", enum: ["museum", "cafe", "restaurant", "any"] }, indoor_only: { type: "boolean" } }, required: ["kind"] } },
    { name: "opening_hours", description: "Get the opening hours of one place on one day of the trip.",
      schema: { type: "object", properties: { place: { type: "string", description: "Name of the place, e.g. Orsay museum" }, day: dayProp }, required: ["place", "day"] } },
    { name: "trip_costs", description: "Add up what the trip already costs (hotel and trains) and how much of Maya's 900-euro budget is left." },
    { name: "book_ticket", description: "Ask to book a museum ticket. Nothing is booked until Maya approves; returns the approval request.",
      schema: { type: "object", properties: { place: { type: "string" }, day: dayProp, time: { type: "string", description: "e.g. 9:30 am" } }, required: ["place", "day"] } }];
  /* the bigger toolbox that one agent would need for the whole trip */
  A.EXTRA = [
    { name: "get_weather_alerts", description: "Get official weather warnings for Paris, such as storms, floods or heatwaves.", schema: { type: "object", properties: { city: { type: "string" } }, required: ["city"] } },
    { name: "get_climate_averages", description: "Get the usual weather in a city for a month: average rainy days and temperatures.", schema: { type: "object", properties: { city: { type: "string" }, month: { type: "string" } }, required: ["city", "month"] } },
    { name: "search_trains", description: "Search train times and ticket prices between two cities on a date.", schema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, date: { type: "string" } }, required: ["from", "to", "date"] } },
    { name: "search_hotels", description: "Search hotels in Paris by price per night, area and guest rating.", schema: { type: "object", properties: { max_price_eur: { type: "number" }, area: { type: "string" } } } },
    { name: "book_hotel", description: "Book a room at a chosen hotel for chosen nights. Needs Maya's approval.", schema: { type: "object", properties: { hotel: { type: "string" }, nights: { type: "number" } }, required: ["hotel", "nights"] } },
    { name: "search_flights", description: "Search flights and prices between two airports on a date.", schema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, date: { type: "string" } }, required: ["from", "to", "date"] } },
    { name: "convert_currency", description: "Convert an amount of money from one currency to another.", schema: { type: "object", properties: { amount: { type: "number" }, from: { type: "string" }, to: { type: "string" } }, required: ["amount", "from", "to"] } }];
  A.ALL = A.TOOLS.concat(A.EXTRA);
  A.byName = Object.fromEntries(A.ALL.map((t) => [t.name, t]));

  /* schema check, as an app would do before running a call */
  A.check = function (tool, args) {
    const sc = tool && tool.schema, errs = [];
    if (!tool) return ["unknown tool"];
    if (!sc) return errs;
    args = args || {};
    (sc.required || []).forEach((r) => { if (args[r] === undefined || args[r] === "") errs.push(`missing “${r}”`); });
    Object.entries(sc.properties || {}).forEach(([key, p]) => {
      const v = args[key];
      if (v === undefined) return;
      if (p.enum && !p.enum.includes(v)) errs.push(`“${key}” must be one of ${p.enum.join(", ")}`);
      else if (p.type === "boolean" && typeof v !== "boolean") errs.push(`“${key}” must be true or false`);
      else if (p.type === "number" && typeof v !== "number") errs.push(`“${key}” must be a number`);
    });
    return errs;
  };

  /* run a tool for real, in the page. broken = the weather service is down */
  A.run = function (name, args, opt) {
    args = args || {};
    opt = opt || {};
    if (name === "get_forecast") {
      if (opt.broken) throw new Error("weather service unavailable (503)");
      if (!/paris/i.test(String(args.city || "Paris"))) throw new Error("only the Paris forecast is saved");
      const day = String(args.day || "");
      if (!DAYS.includes(day)) throw new Error(`“day” must be one of ${DAYS.join(", ")}`);
      if (!FORECAST[day]) throw new Error(`no forecast saved for ${day}; the saved forecast covers Saturday to Monday`);
      return FORECAST[day];
    }
    if (name === "find_places") {
      const kind = String(args.kind || "any");
      return PLACES.filter((p) => (kind === "any" || p.kind === kind) && (!args.indoor_only || p.indoor)).map(({ name: n, kind: kd, note }) => ({ name: n, kind: kd, note }));
    }
    if (name === "opening_hours") {
      const key = placeKey(args.place), day = String(args.day || "");
      if (!key) throw new Error(`no opening hours saved for ${args.place}`);
      if (!DAYS.includes(day)) throw new Error(`“day” must be one of ${DAYS.join(", ")}`);
      const hrs = HOURS[key][day];
      return hrs ? { place: HOURS[key].name, day, open: true, hours: hrs } : { place: HOURS[key].name, day, open: false };
    }
    if (name === "trip_costs") return { budget_eur: 900, hotel_eur: 570, trains_eur: 90, spent_eur: 660, left_eur: 240 };
    if (name === "book_ticket") return { status: "waiting for Maya's approval", request: [args.place, args.day, args.time].filter(Boolean).join(", "), booked: false };
    throw new Error("this tool is not connected in this lab");
  };

  /* ------------------------------------------------------------------ harmony rendering */
  const tsType = (p) => (p.enum ? p.enum.map((v) => JSON.stringify(v)).join(" | ") : p.type === "integer" ? "number" : p.type);
  A.decl = function (t) {
    const L = [`// ${t.description}`];
    const props = t.schema && t.schema.properties ? Object.entries(t.schema.properties) : [];
    if (!props.length) { L.push(`type ${t.name} = () => any;`); return L.join("\n"); }
    L.push(`type ${t.name} = (_: {`);
    props.forEach(([key, p]) => { if (p.description) L.push(`// ${p.description}`); L.push(`${key}${(t.schema.required || []).includes(key) ? "" : "?"}: ${tsType(p)},`); });
    L.push("}) => any;");
    return L.join("\n");
  };
  A.H = {
    system: "<|start|>system<|message|>You are Maya's travel assistant.\nKnowledge cutoff: 2024-06\nCurrent date: 2026-11-12\n\nReasoning: low\n\n# Valid channels: analysis, commentary, final. Channel must be included for every message.\nCalls to these tools must go to the commentary channel: 'functions'.<|end|>",
    developer: (tools) => "<|start|>developer<|message|># Instructions\n\nUse the tools for every fact. Answer in one or two short sentences.\n\n# Tools\n\n## functions\n\nnamespace functions {\n\n" + tools.map(A.decl).join("\n\n") + "\n\n} // namespace functions<|end|>",
    user: (q) => `<|start|>user<|message|>${q}<|end|>`,
    cue: "<|start|>assistant",
    think: (t) => `<|channel|>analysis<|message|>${t}<|end|>`,
    call: (name, args) => `<|start|>assistant<|channel|>commentary to=functions.${name} <|constrain|>json<|message|>${JSON.stringify(args)}<|call|>`,
    callFirst: (name, args) => `<|channel|>commentary to=functions.${name} <|constrain|>json<|message|>${JSON.stringify(args)}<|call|>`,
    result: (name, obj) => `<|start|>functions.${name} to=assistant<|channel|>commentary<|message|>${JSON.stringify(obj)}<|end|>`,
    final: (t) => `<|start|>assistant<|channel|>final<|message|>${t}<|return|>` };

  /* ------------------------------------------------------------------ scripted ReAct policy */
  A.SCRIPTS = {
    umbrella: { q: "Do I need an umbrella in Paris on Saturday?", rounds: [
      { think: "Maya asks about Saturday's weather. Get the forecast.", call: ["get_forecast", { city: "Paris", day: "Saturday" }] },
      { think: "70% chance of rain, showers from late morning. Say yes.", final: "Yes. Saturday has a 70% chance of rain, with showers from late morning and 12 °C. Pack the umbrella." }] },
    orsay: { q: "Is the Orsay museum open on Monday?", rounds: [
      { think: "Check the Orsay museum's hours for Monday.", call: ["opening_hours", { place: "Orsay museum", day: "Monday" }] },
      { think: "Closed on Monday. Suggest the weekend instead.", final: "No. The Orsay museum is closed on Mondays. Go on Saturday or Sunday instead, when it is open from 9:30 am to 6 pm." }] },
    plan: { q: "Plan my Saturday afternoon in Paris.", rounds: [
      { think: "Weather first.", call: ["get_forecast", { city: "Paris", day: "Saturday" }] },
      { think: "Rain from late morning, so indoor places only.", call: ["find_places", { kind: "any", indoor_only: true }] },
      { think: "The Orsay museum is Maya's must-see. Check its Saturday hours.", call: ["opening_hours", { place: "Orsay museum", day: "Saturday" }] },
      { think: "Open until 6 pm. Museum first, then Tom's cafe, open until 7 pm.", final: "Rain is likely from late morning, so stay indoors: the Orsay museum (open until 6 pm, 16 euros, book a time slot), then hot chocolate at Tom's bookshop cafe by the Canal Saint-Martin, open until 7 pm." }] },
    budget: { q: "How much money is left after the hotel and trains?", rounds: [
      { think: "Need the trip costs.", call: ["trip_costs", {}] },
      { think: "900 minus 660 is 240.", final: "The hotel (570 euros) and trains (90 euros) come to 660 euros, so 240 euros of your 900-euro budget is left." }] },
    tomorrow: { q: "Will it rain in Paris tomorrow?", rounds: [
      { think: "Maya means tomorrow.", call: ["get_forecast", { city: "Paris", day: "tomorrow" }] },
      { think: "The day must be a weekday name. Today is Thursday 12 November, so tomorrow is Friday.", call: ["get_forecast", { city: "Paris", day: "Friday" }] },
      { think: "No forecast is saved for Friday. Say so honestly.", final: "I can't tell yet: the saved forecast covers Saturday to Monday, not Friday. Saturday looks wet, so the umbrella is still a good idea." }] },
    trip3: { q: "Plan three rain-friendly days in Paris within my budget.", rounds: [
      { think: "Three days, Saturday to Monday. Start with Saturday's forecast.", call: ["get_forecast", { city: "Paris", day: "Saturday" }] },
      { think: "Rain on Saturday. Now Sunday.", call: ["get_forecast", { city: "Paris", day: "Sunday" }] },
      { think: "Sunday is dry. Now Monday.", call: ["get_forecast", { city: "Paris", day: "Monday" }] },
      { think: "Wet Saturday and a wet Monday evening. Find indoor places.", call: ["find_places", { kind: "any", indoor_only: true }] },
      { think: "The Orsay museum for Saturday: check its hours.", call: ["opening_hours", { place: "Orsay museum", day: "Saturday" }] },
      { think: "Now the budget: what is left after the hotel and trains?", call: ["trip_costs", {}] },
      { think: "240 euros left. Orsay 16 and Louvre 22 fit easily.", final: "Saturday (rain): the Orsay museum (9:30 am to 6 pm, 16 euros), then hot chocolate at Tom's bookshop cafe. Sunday (dry): Sainte-Chapelle and a walk by the Seine. Monday: the Louvre (22 euros) before the evening rain. Hotel and trains cost 660 euros, so 240 euros are left for tickets and food." }] } };

  /* Build the whole run as a list of events. opt: {broken, limit (rounds; 0 = none), stopRule (default true)} */
  A.trace = function (key, opt) {
    opt = Object.assign({ broken: false, limit: 0, stopRule: true }, opt || {});
    const sc = A.SCRIPTS[key];
    const ev = [{ by: "maya", text: sc.q }];
    const CAP = 12;
    let r = 0, i = 0, lastFailed = false, finals = 0;
    while (true) {
      if (opt.limit && r >= opt.limit) { ev.push({ by: "program", stop: "limit", rounds: r }); break; }
      if (!opt.limit && r >= CAP) { ev.push({ by: "program", stop: "forever", rounds: r }); break; }
      const step = sc.rounds[Math.min(i, sc.rounds.length - 1)];
      r++;
      if (step.final) {
        ev.push({ by: "model", round: r, think: finals ? "The answer is already given. Repeat it." : step.think, final: step.final });
        finals++;
        if (opt.stopRule) { ev.push({ by: "program", done: true, rounds: r }); break; }
        ev.push({ by: "program", ignored: true, round: r });
        continue;
      }
      const [name, args] = step.call;
      ev.push({ by: "model", round: r, think: lastFailed ? "The tool failed. Try the same call again." : step.think, call: [name, args] });
      const tool = A.byName[name], errs = A.check(tool, args);
      let result = null, error = null;
      if (errs.length) error = errs.join("; ");
      else { try { result = A.run(name, args, opt); } catch (e) { error = e.message; } }
      ev.push({ by: "program", round: r, name, args, result, error, schemaOk: !errs.length });
      lastFailed = !!error && opt.broken && name === "get_forecast" && !errs.length;
      if (!lastFailed) i++;
    }
    return ev;
  };

  /* The context (list of messages) the model reads before the event at index j, and what that event adds. */
  A.messages = function (key, ev, j, tools) {
    const sc = A.SCRIPTS[key];
    const msgs = [{ who: "system", by: "program", text: A.H.system }, { who: "developer · tool descriptions", by: "program", text: A.H.developer(tools || A.TOOLS) }, { who: "Maya", by: "maya", text: A.H.user(sc.q), at: 0 }];
    for (let x = 1; x <= j && x < ev.length; x++) {
      const e = ev[x];
      if (e.by === "model") {
        msgs.push({ who: "program · cue", by: "program", text: A.H.cue, at: x });
        msgs.push({ who: "model writes", by: "model", text: A.H.think(e.think) + (e.call ? A.H.call(e.call[0], e.call[1]) : A.H.final(e.final)), at: x });
      } else if (e.by === "program" && e.name) {
        msgs.push({ who: "program · tool result", by: "tool", text: A.H.result(e.name, e.error ? { error: e.error } : e.result), at: x });
      }
    }
    return msgs;
  };

  /* Token accounting for a whole trace: for each model event, tokens read (the prompt) and written. */
  A.accounting = function (T, key, ev, tools) {
    const rows = [];
    ev.forEach((e, x) => {
      if (e.by !== "model") return;
      const before = A.messages(key, ev, x - 1, tools).concat([{ text: A.H.cue }]);
      const read = before.reduce((a, m) => a + A.count(T, m.text), 0);
      const wrote = A.count(T, A.H.think(e.think) + (e.call ? A.H.call(e.call[0], e.call[1]) : A.H.final(e.final)));
      rows.push({ x, round: e.round, read, wrote });
    });
    return rows;
  };
})();
