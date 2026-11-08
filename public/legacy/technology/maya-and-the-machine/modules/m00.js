/* M0 · The Grand Tour — the whole machine at low resolution, with real numbers. */
(function () {
  const MM = window.MM, h = MM.h, C = MM.course;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";

  const BLOCKS = [
    { id: "cut", t: "Cut the text into small pieces", right: true },
    { id: "num", t: "Turn each piece into a list of numbers", right: true },
    { id: "layers", t: "Pass the numbers through a tall stack of layers that mix information between pieces", right: true },
    { id: "score", t: "Give a score to every possible next piece", right: true },
    { id: "pick", t: "Pick one piece, partly at random", right: true },
    { id: "repeat", t: "Add it to the text and do everything again", right: true },
    { id: "lookup", t: "Look up a stored answer in a database", right: false },
    { id: "rules", t: "Follow grammar rules written by programmers", right: false },
    { id: "web", t: "Search the internet for the answer", right: false },
    { id: "plan", t: "Plan the whole reply first, then type it out", right: false },
    { id: "learn", t: "Learn from this conversation as it goes", right: false }];

  const SHUFFLED = [6, 1, 9, 3, 0, 7, 5, 10, 2, 8, 4].map((i) => BLOCKS[i]);
  function custom(root, api) {
    const id = "m00";
    MM.markDone(id, "mystery");
    const lm = api.lm();
    root.append(h("section", { class: "section" },
      h("div", { class: "card reading", style: "max-width:44rem" },
        h("div", { class: "eyebrow" }, "Cold open"),
        h("p", { style: "margin-top:8px;font-size:1.1rem" }, "Maya is planning a trip to Paris. She opens a chatbot and starts typing. Before she finishes, the machine is already guessing what comes next. In fifteen minutes you will ride along with her sentence, all the way through a real language model and back out again."),
        chatBubble())));

    const ride = h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, "01"), h("h2", null, "Ride along with one sentence"), MM.truth("TOY", "Maya-LM: 214,208 numbers, trained for this course on Maya's world.")));
    const player = h("div");
    ride.append(h("p", { class: "muted reading" }, "Every number below is real. The tokens in step 2 come from GPT-4's real tokeniser; everything after that comes from Maya-LM, a tiny language model trained for this course and running inside your browser right now."), player);
    root.append(ride);
    lm.then((m) => tour(player, m, api)).catch((e) => player.append(MM.errorBox(e)));

    const making = h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, "02"), h("h2", null, "The making of, in sixty seconds")));
    making.append(makingOf(api));
    root.append(making);

    const myst = h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, "03"), h("h2", null, "Three mysteries this line will solve")));
    const M3 = [["If it only guesses the next word, how can it write code and do maths?", "Predicting text very well forces a model to learn grammar, facts and patterns of reasoning. Writing out steps also gives it extra thinking time.", ["m01", "m09"]],
      ["Where is its knowledge kept?", "Not in a database. It is spread across hundreds of thousands (here) or hundreds of billions (in big models) of learned numbers, mostly in the MLP layers.", ["m07", "m10"]],
      ["Why does it sometimes state false things with confidence?", "Training rewards text that is likely, not text that is true. Truth needs good data, careful training, or looking things up.", ["m12"]]];
    myst.append(h("div", { class: "three" }, M3.map(([q, hint, mods], i) => {
      const ans = h("p", { class: "muted", hidden: true, style: "margin-top:8px;font-size:.95rem" }, hint);
      return h("div", { class: "card" }, h("div", { class: "eyebrow" }, "Mystery " + (i + 1)), h("h3", { style: "margin:6px 0" }, q),
        h("button", { class: "btn small ghost", onclick: (e) => { ans.hidden = false; e.currentTarget.remove(); } }, "A first hint"), ans,
        h("div", { class: "faint", style: "font-size:.85rem;margin-top:8px" }, "Solved in ", mods.map((m, j) => [j ? " and " : "", h("a", { href: "#" + m }, C.byId[m].code)])));
    })));
    root.append(myst);

    const pic = h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, "04"), h("h2", null, "Your starting picture")));
    pic.append(h("p", { class: "muted reading" }, "Before you learn anything else, build your current picture of what happens inside. Tap the blocks in the order you think they happen; tap ✕ to remove one. There are traps among them. Your picture is saved and comes back in the Phase 1 finale, beside the one you build then."), picture(api));
    root.append(pic);

    const end = h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, "05"), h("h2", null, "The map appears")));
    end.append(h("p", { class: "muted reading" }, "Every box you rode through today is a station on the map. Each station takes one part, shows you why it exists, lets you break it, and asks you to defend it. Line 1 explains the model; Line 2 builds Maya's team of agents."));
    const fin = h("button", { class: "btn primary" }, MM.icon("check"), "Finish the Grand Tour");
    fin.onclick = () => { MM.STEPS.forEach((st) => MM.markDone(id, st)); MM.store.update((s) => { s.mods[id].completed = Date.now(); }); fin.disabled = true; fin.textContent = "Grand Tour complete"; MM.toast("The map is waiting. Next: M1 · The Guessing Game"); };
    if (MM.store.mod(id).completed) { fin.disabled = true; fin.textContent = "Grand Tour complete"; }
    end.append(h("div", { class: "row", style: "margin-top:10px" }, fin, h("button", { class: "btn", onclick: () => MM.go("m01") }, "Go to M1", MM.icon("next")), h("button", { class: "btn ghost", onclick: () => MM.go("atlas") }, "Open the Atlas")));
    root.append(end);
  }

  function chatBubble() {
    const words = SPINE.split(" ");
    const bubble = h("div", { class: "bubble", style: "margin-top:14px;max-width:30rem;border-radius:12px 12px 4px 12px;margin-left:auto;background:var(--seine-soft)" });
    const caret = h("span", { class: "pulse", style: "display:inline-block;width:2px;height:1.1em;background:var(--ink);vertical-align:-2px;margin-left:2px" });
    let i = 0;
    const tick = () => { if (!bubble.isConnected) return; if (i < words.length) { bubble.textContent = words.slice(0, ++i).join(" "); bubble.append(caret); setTimeout(tick, MM.reducedMotion() ? 0 : 160); } else bubble.append(" ", h("span", { class: "tok blank" }, "___")); };
    setTimeout(tick, 400);
    return h("div", null, h("div", { class: "faint", style: "font-size:.85rem;margin-top:12px;text-align:right" }, "Maya is typing…"), bubble);
  }

  function tour(root, lm, api) {
    const run = lm.run(lm.encode(SPINE).ids, { want: { qkv: false } });
    const T = run.logits.length, last = T - 1;
    const probs = lm.softmax(run.logits[last]);
    const top = lm.top(probs, 8);
    const words = SPINE.split(" ");
    const real = { ids: [11356, 64, 19937, 1077, 48998, 1606, 279, 18057, 369, 12366, 1071, 433, 1053], toks: ["May", "a", " packed", " her", " umbrella", " because", " the", " forecast", " for", " Paris", " said", " it", " would"] };
    MM.loadData("tokens").then((d) => { const e = d.texts.spine.enc.cl100k; real.ids = e.map((x) => x[0]); real.toks = e.map((x) => x[1]); }).catch(() => {});
    const gen = lm.generate(SPINE, 9, { seed: 11, temperature: 1 });
    const stations = [
      { t: "1 · Text", d: "It starts as text: 69 characters on Maya's screen. The model cannot use letters directly. Everything inside it is arithmetic, so the text must become numbers.", v: (el) => el.append(h("div", { class: "bubble", style: "font-size:1.15rem" }, SPINE + " ___")) },
      { t: "2 · Tokens", d: "A [[tokeniser]] (the program that cuts text into pieces) splits the sentence into [[token|tokens]] (small pieces of text from a fixed list). GPT-4's real tokeniser makes 13 pieces. Notice “Maya” becomes “May” + “a”: tokens are not words.", truth: "REAL", v: (el) => el.append(MM.toks(real.toks)) },
      { t: "3 · Numbers", d: "Each token has an ID number in the [[vocabulary]] (the list of every token the model knows; GPT-4's has about 100,000). From here on, the model sees only these numbers.", truth: "REAL", v: (el) => el.append(h("div", { class: "toks" }, real.toks.map((t, i) => MM.tok(t, { sub: real.ids[i] })))) },
      { t: "4 · Vectors", d: "Each ID picks one row of a learned table: a [[vector]] (a list of numbers). In Maya-LM each vector has 64 numbers; here are the first 16 of each. Orange is positive, blue is negative. Similar words get similar vectors.", truth: "TOY", v: (el) => vectors(el, lm, run, words) },
      { t: "5 · Layers", d: "The vectors pass up through a stack of layers. In each layer, words share information (“would” looks back at “umbrella”), then each word is processed alone. Below each column is the guess the model would make if it stopped at that layer.", truth: "TOY", v: (el) => layers(el, lm, run) },
      { t: "6 · Scoreboard", d: "At the top, the vector for “would” is compared with every token in the vocabulary. Each gets a score, and the scores become chances that add up to 100%. Maya-LM's real scoreboard:", truth: "TOY", v: (el) => el.append(MM.bars(top.map((x) => ({ label: x.word, p: x.p })), { rest: 1 - top.reduce((a, b) => a + b.p, 0) })) },
      { t: "7 · Pick", d: "A simple rule called the sampler picks one token, at random but weighted by the chances. “rain” wins most often, but not always. That is why the same question can get different answers.", truth: "TOY", v: (el) => pick(el, lm, probs, api) },
      { t: "8 · Append, repeat", d: "The chosen token is added to the text, and the whole machine runs again for the next token. Whole replies, code and stories are this one step, repeated. Here Maya-LM continues the sentence, one token per run:", truth: "TOY", v: (el) => loop(el, gen) }];
    let i = 0;
    const stage = h("div", { class: "lab", style: "min-height:240px" }), narr = h("div", { class: "narr", "aria-live": "polite" });
    const pos = h("span", { class: "pos" }), back = h("button", { class: "btn" }, MM.icon("back"), "Back"), next = h("button", { class: "btn primary" }, "Next", MM.icon("next"));
    root.append(h("div", { class: "beat" }, stage, narr), h("div", { class: "beatnav" }, pos, back, next));
    back.onclick = () => show(i - 1); next.onclick = () => show(i + 1);
    function show(n) {
      i = MM.clamp(n, 0, stations.length - 1);
      const st = stations[i];
      stage.innerHTML = ""; narr.innerHTML = "";
      const box = h("div", { class: "fade-in" }); stage.append(box);
      try { st.v(box); } catch (e) { box.append(MM.errorBox(e)); }
      narr.append(h("div", { class: "kind" }, h("span", { class: "eyebrow" }, "Station " + (i + 1) + " of 8"), st.truth ? MM.truth(st.truth) : null), h("h3", null, st.t.slice(4)), MM.richEl(st.d, "div", "text"));
      pos.textContent = (i + 1) + " / " + stations.length;
      back.disabled = i === 0; next.disabled = i === stations.length - 1;
      if (i === stations.length - 1) { MM.markDone("m00", "story"); MM.markDone("m00", "spotlight"); }
    }
    show(0);
    MM.markDone("m00", "where");
  }

  function vectors(el, lm, run, words) {
    const row = h("div", { class: "row", style: "--gap:6px;align-items:flex-end;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px" });
    const all = ["<s>"].concat(words);
    all.forEach((w, t) => row.append(h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:4px" }, MM.vec(Array.from(run.streams[0][t].slice(0, 16)), { max: 0.9 }), h("span", { class: "mono", style: "font-size:.72rem;color:var(--ink-3);writing-mode:vertical-rl;transform:rotate(180deg);max-height:90px" }, w === "<s>" ? "start" : w))));
    el.append(row, h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "Maya-LM cuts text into whole words (to stay tiny) and adds a start marker. Real models use word pieces."));
  }

  function layers(el, lm, run) {
    const T = run.logits.length, last = T - 1;
    const cols = h("div", { class: "row", style: "--gap:8px;align-items:flex-end;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px" });
    run.streams.forEach((s, i) => {
      const lg = lm.unembed(s[last]), pr = lm.softmax(lg), t1 = lm.top(pr, 1)[0];
      cols.append(h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:4px;min-width:44px" },
        MM.vec(Array.from(s[last].slice(0, 16)), { max: Math.max(...Array.from(s[last]).map(Math.abs)) }),
        h("span", { class: "mono", style: "font-size:.72rem;color:var(--ink-3)" }, i === 0 ? "in" : "L" + Math.ceil(i / 2) + (i % 2 ? "a" : "m")),
        h("span", { class: "tok", style: "font-size:.78rem;padding:3px 5px;min-height:0" + (t1.word === "rain" ? ";--tc:var(--real)" : "") }, t1.word)));
    });
    el.append(h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "The vector for “would”, layer by layer"), cols, h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "a = after attention, m = after the MLP. Early layers still guess “would” or “be”; once attention brings in “umbrella”, the guess turns to rain. You will ride this lift properly in M7."));
  }

  function pick(el, lm, probs, api) {
    const out = h("div", { class: "toks", style: "margin-top:10px" });
    const counts = {};
    const btn = h("button", { class: "btn small primary" }, "Sample 20 times");
    let seed = 1;
    btn.onclick = () => {
      out.innerHTML = "";
      const rand = MM.rng(seed++ * 7919);
      for (let k = 0; k < 20; k++) { const id = lm.sampleFrom(probs, rand); const w = lm.vocab[id]; counts[w] = (counts[w] || 0) + 1; out.append(MM.tok(w, { color: w === "rain" ? "var(--real)" : null })); }
      tally.textContent = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([w, c]) => w + " ×" + c).join("   ");
    };
    const tally = h("div", { class: "mono", style: "font-size:.88rem;margin-top:8px;color:var(--ink-2)" });
    el.append(h("p", { style: "margin-bottom:8px" }, "Each tap draws 20 tokens from the scoreboard's chances."), btn, out, tally);
    btn.click();
  }

  function loop(el, gen) {
    const line = h("div", { class: "toks" }, SPINE.split(" ").slice(-4).map((w) => MM.tok(w)));
    el.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "…it would"), line);
    let i = 0;
    const tick = () => { if (!line.isConnected || i >= gen.steps.length) return; const st = gen.steps[i++]; line.append(MM.tok(st.word === "<s>" ? "⟨start⟩" : st.word, { sub: (st.p * 100).toFixed(0) + "%", cls: "fade-in" })); setTimeout(tick, MM.reducedMotion() ? 0 : 700); };
    setTimeout(tick, 300);
    el.append(h("p", { class: "faint", style: "font-size:.85rem;margin-top:8px" }, "The small number is the chance the model gave each chosen token. Each token is one full trip through the machine."));
  }

  function makingOf(api) {
    const box = h("div", { class: "three" });
    const p1 = h("div", { class: "card" }, h("div", { class: "eyebrow" }, "1 · Text"), h("p", { style: "margin-top:6px" }, "Collect a huge amount of text. Big models read trillions of tokens. Maya-LM read about 1.4 million tokens of made-up sentences about Maya's world, many times over."));
    const p2 = h("div", { class: "card" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "2 · Training"), MM.truth("TOY")), h("p", { style: "margin:6px 0" }, "Guess the next token, measure the surprise, nudge every number a little. Repeat. Maya-LM's real training curve:"));
    const p3 = h("div", { class: "card" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "3 · Chat training"), MM.truth("SKETCH")), h("p", { style: "margin-top:6px" }, "A raw model just continues documents. More training on example conversations and human preferences turns it into an assistant that answers questions. That happens in M11."));
    box.append(p1, p2, p3);
    api.data("training").then((d) => p2.append(MM.k.chart([{ pts: d.curve.filter((_, i) => i % 4 === 0), color: "var(--seine)" }], { W: 320, H: 150, ymin: 0, xlabel: "training step", ylabel: "surprise (loss)", label: "Maya-LM loss curve" }))).catch(() => {});
    return box;
  }

  function picture(api) {
    const st = MM.store.state.pictures.start;
    let seq = st ? st.slice() : [];
    const wrap = h("div", { class: "two", style: "margin-top:10px" });
    const pool = h("div", { class: "stack", style: "--gap:6px" });
    const mine = h("ol", { class: "stack", style: "--gap:6px;padding-left:22px;margin:0" });
    const msg = h("div", { "aria-live": "polite" });
    function draw() {
      pool.innerHTML = ""; mine.innerHTML = "";
      SHUFFLED.filter((b) => !seq.includes(b.id)).forEach((b) => pool.append(h("button", { class: "opt", type: "button", onclick: () => { seq.push(b.id); draw(); } }, h("span", { class: "k" }, "+"), h("span", null, b.t))));
      seq.forEach((bid, i) => { const b = BLOCKS.find((x) => x.id === bid); mine.append(h("li", null, h("div", { class: "row", style: "--gap:6px;flex-wrap:nowrap" }, h("span", { class: "grow" }, b.t), h("button", { class: "iconbtn", "aria-label": "Remove", onclick: () => { seq.splice(i, 1); draw(); } }, MM.icon("close"))))); });
      if (!seq.length) mine.append(h("p", { class: "faint" }, "Your picture is empty. Tap a block to add it."));
    }
    const save = h("button", { class: "btn primary small" }, "Save my picture");
    save.onclick = () => {
      if (seq.length < 3) { MM.toast("Add at least three blocks."); return; }
      MM.store.update((s) => { s.pictures.start = seq.slice(); s.pictures.startAt = Date.now(); });
      MM.markDone("m00", "predict");
      const traps = seq.filter((x) => !BLOCKS.find((b) => b.id === x).right).length;
      msg.innerHTML = "";
      msg.append(h("div", { class: "callout", style: "margin-top:10px" }, "Saved. ", traps ? `Your picture includes ${traps} block${traps > 1 ? "s" : ""} that a real LLM does not do. Do not fix it now: you will find out which ones, and why, along the way.` : "Your picture has no traps in it. Keep it in mind: by the finale you will be able to explain every arrow between these blocks."));
    };
    wrap.append(h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Blocks"), pool), h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "My picture, in order"), mine, h("div", { class: "row", style: "margin-top:10px" }, save, h("button", { class: "btn small ghost", onclick: () => { seq = []; draw(); } }, "Clear")), msg));
    draw();
    return wrap;
  }

  MM.defineModule({ id: "m00", custom, BLOCKS });
})();
