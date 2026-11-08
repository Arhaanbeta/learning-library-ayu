/* M4 · Embeddings — meaning as a place. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const CATS = {
    city: ["Paris", "Rome", "London", "Madrid", "Berlin", "Lisbon", "Vienna", "Athens"],
    country: ["France", "Italy", "England", "Spain", "Germany", "Portugal", "Austria", "Greece"],
    name: ["Maya", "Aisha", "Priya", "Sofia", "Tom", "Leo", "Omar", "Ravi"],
    item: ["umbrella", "raincoat", "sunglasses", "sunhat", "scarf", "gloves", "coat", "boots"],
    weather: ["rain", "pour", "drizzle", "snow", "sunny", "hot", "cold", "windy", "rainy", "stormy", "cloudy", "bright", "wet"],
    day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    place: ["Louvre", "Orsay", "museum", "Colosseum", "Pantheon", "Prado", "Acropolis", "library", "cafe", "market", "bookshop", "river", "park", "bridge", "hill"]};
  const CAT_COL = { city: "var(--line2)", country: "var(--h3)", name: "var(--llm)", item: "var(--data)", weather: "var(--real)", day: "var(--person)", place: "var(--h1)" };
  const catOf = (w) => Object.keys(CATS).find((c) => CATS[c].includes(w));
  const cosv = (a, b) => { let x = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { x += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return x / Math.sqrt(na * nb); };

  function galaxy(el, vocab, coords, opts) {
    opts = opts || {};
    const W = 640, H = 460;
    const cv = h("canvas", { width: W * 2, height: H * 2, style: "width:100%;border-radius:8px;border:1px solid var(--rule);display:block;background:var(--sheet);touch-action:manipulation", role: "img", "aria-label": "Map of all Maya-LM tokens squashed to two dimensions" });
    el.append(cv);
    const g = cv.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const col = (v) => (v.startsWith("var(") ? css.getPropertyValue(v.slice(4, -1)).trim() : v);
    let pts = [];
    function draw(cs, hi, neigh) {
      const xs = cs.slice(2).map((p) => p[0]), ys = cs.slice(2).map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const X = (v) => 40 + (v - x0) / (x1 - x0 || 1) * (W * 2 - 80), Y = (v) => 40 + (1 - (v - y0) / (y1 - y0 || 1)) * (H * 2 - 80);
      g.clearRect(0, 0, W * 2, H * 2);
      pts = [];
      const nset = new Set((neigh || []).map((n) => n.word));
      vocab.forEach((w, i) => {
        if (i < 2) return;
        const c = catOf(w), x = X(cs[i][0]), y = Y(cs[i][1]);
        pts.push({ w, x, y });
        g.globalAlpha = hi && hi !== w && !nset.has(w) ? 0.28 : 1;
        g.fillStyle = c ? col(CAT_COL[c]) : col("var(--ink-3)");
        g.beginPath(); g.arc(x, y, c ? 7 : 5, 0, 7); g.fill();
        const label = (opts.labels && c && CATS[c].indexOf(w) < (opts.labels === "all" ? 99 : 2)) || w === hi || nset.has(w);
        if (label) { g.font = `${w === hi ? 600 : 500} ${w === hi ? 28 : 22}px ${css.getPropertyValue("--font-body")}`; g.fillStyle = col("var(--ink)"); g.fillText(w, x + 10, y - 8); }
      });
      g.globalAlpha = 1;
      if (hi) { const p = pts.find((q) => q.w === hi); if (p) { g.strokeStyle = col("var(--ink)"); g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 14, 0, 7); g.stroke(); (neigh || []).forEach((n) => { const q = pts.find((r) => r.w === n.word); if (q) { g.strokeStyle = col("var(--seine)"); g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]); } }); } }
    }
    cv.addEventListener("click", (ev) => { const r = cv.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width * W * 2, y = (ev.clientY - r.top) / r.height * H * 2; let best = null, bd = 1e9; pts.forEach((p) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }); if (best && opts.onPick) opts.onPick(best.w); });
    return { draw };
  }
  function legend() { return h("div", { class: "legend", style: "margin-top:8px" }, Object.entries(CAT_COL).map(([c, v]) => h("span", null, h("i", { style: `background:${v};border-color:${v};border-radius:50%` }), { city: "cities", country: "countries", name: "names", item: "packed items", weather: "weather words", day: "days", place: "places" }[c])), h("span", null, h("i", { style: "background:var(--ink-3);border-color:var(--ink-3);border-radius:50%" }), "other")); }

  MM.defineModule({
    id: "m04",
    mystery: { title: "Nobody told it", text: "Nobody ever told Maya-LM that an umbrella and a raincoat are alike, or that Paris and London are both cities. It was only ever asked to guess the next word.\n\nYet, after training, its 64 numbers for “umbrella” are 73% similar to its numbers for “raincoat”, and “Paris” sits closest to “London”. Where did that sense of meaning come from?" },
    where: { text: "One step down from the tokeniser: the embedding table, where each token ID becomes a list of numbers." },
    predict: { q: "Maya-LM gives each of its 214 tokens 64 numbers. Whose numbers are most similar to those for “umbrella”?", options: ["“rain”", "“raincoat”", "“Paris”", "“packed”"], answer: 1, why: "“raincoat” (cosine 0.73), then “boots” and “coat”. They appear in the same kinds of sentences, so training pushed their numbers together. “rain” is close to “be” instead: both fill the slot after “would”." },
    story: [
      { title: "An ID picks a row", truth: "TOY",
        text: "Each token ID picks one row from a big grid called the [[embedding-table|embedding table]]. That row is the token's [[embedding]]: a [[vector]] (a list of numbers). In Maya-LM each row has 64 numbers; in GPT-3 each has 12,288. The table is learned in training, like every other weight.",
        precision: "Picking row k is the same as multiplying a [[one-hot]] vector (all zeros except a 1 at position k) by the table. So the table is simply the model's first weight matrix. Maya-LM's table: 214 × 64 = 13,696 numbers. The vector length is the [[model-width|model width]].",
        visual: async (el, api) => { const lm = await api.lm(); const words = ["umbrella", "raincoat", "Paris", "would"]; el.append(h("div", { class: "row", style: "--gap:14px;align-items:flex-end" }, words.map((w) => h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:6px" }, MM.vec(Array.from(lm.embedding(w)).slice(0, 24), { max: 0.6 }), MM.tok(" " + w, { sub: lm.stoi[w] })))), h("p", { class: "faint", style: "font-size:.86rem;margin-top:8px" }, "First 24 of 64 numbers. Orange positive, blue negative. “umbrella” and “raincoat” already look alike.")); } },
      { title: "A vector is a place", truth: "SKETCH",
        text: "Think of a vector as a point in space. Two numbers make a point on a flat map; 64 numbers make a point in a space with 64 directions. Nobody can picture 64 directions, but the maths works exactly the same way: points can be near or far, and arrows can point the same way or not.",
        intuition: "A street address with 64 parts instead of two.", breaks: "Addresses are given out by people; these positions are found by training, and only their positions relative to each other mean anything.",
        visual: (el) => { const svg = s("svg", { viewBox: "0 0 300 200", class: "figure", role: "img", "aria-label": "Points on a flat map" }); svg.append(s("line", { x1: 20, y1: 180, x2: 290, y2: 180, stroke: "var(--rule)" }), s("line", { x1: 20, y1: 10, x2: 20, y2: 180, stroke: "var(--rule)" })); [["umbrella", 70, 60, "var(--data)"], ["raincoat", 95, 75, "var(--data)"], ["Paris", 230, 140, "var(--line2)"], ["London", 250, 120, "var(--line2)"]].forEach(([t, x, y, c]) => svg.append(s("circle", { cx: x, cy: y, r: 6, fill: c }), s("text", { x: x + 9, y: y - 6, "font-size": 13, text: t }))); el.append(svg, h("p", { class: "faint", style: "font-size:.86rem" }, "A 2-number sketch. Maya-LM's real points have 64 numbers each.")); } },
      { title: "Measuring “alike”: the dot product", truth: "TOY",
        text: "To compare two vectors, multiply matching numbers and add them up. This is the [[dot-product|dot product]]: large when two vectors point the same way, zero at right angles, negative when opposite. Divide out their lengths and you get [[cosine-similarity|cosine similarity]], from −1 to 1. Here are Maya-LM's real values.",
        precision: "a·b = Σ aᵢbᵢ = |a| |b| cos θ. Cosine ignores length; the dot product does not, and models can store “how strong” or “how common” in a vector's length. {tool:t1}",
        visual: async (el, api) => { const lm = await api.lm(); const pairs = [["umbrella", "raincoat"], ["Paris", "London"], ["Monday", "Friday"], ["umbrella", "Paris"], ["rain", "Louvre"]]; el.append(MM.bars(pairs.map(([a, b]) => ({ label: a + " · " + b, p: Math.max(0, cosv(lm.embedding(a), lm.embedding(b))) })), { scale: 1, plain: true, total: false, fmt: (it) => { const [a, b] = it.label.split(" · "); return cosv(lm.embedding(a), lm.embedding(b)).toFixed(2); } })); } },
      { title: "Why similar words end up close", truth: "TOY",
        text: "Words used in similar places must help predict similar next words, so gradient descent pushes their vectors in similar directions. This is the [[distributional-hypothesis|distributional hypothesis]] (words in similar contexts have similar meanings). Look at “rain”: its closest neighbour is “be”, because both fill the same slot after “would”.",
        precision: "Only the rows of tokens that appear in a training batch get updated, so rare tokens learn slowly. Neighbours here are the real 64-number cosines.",
        visual: async (el, api) => { const lm = await api.lm(); el.append(h("div", { class: "two" }, ["rain", "Monday", "sunglasses", "3"].map((w) => h("div", null, h("div", { class: "eyebrow" }, "closest to “" + w + "”"), MM.bars(lm.neighbours(w, 4).map((n) => ({ label: n.word, p: Math.max(0, n.cos) })), { scale: 1, plain: true, total: false, fmt: (it) => it.p.toFixed(2) }))))); } },
      { kind: "spotlight", title: "The Embedding Galaxy", truth: "TOY",
        text: "Squash all 214 vectors down to two numbers each and you can see the result. Cities gather, names gather, days of the week sit almost on top of each other. Nobody drew this map; training did, just by predicting next words. Explore it properly in the Lab.",
        precision: "The squashing is [[pca|PCA]] (keep the two directions with the most spread). It throws away 62 of the 64 directions, so distances on the map are only a rough guide.",
        visual: async (el, api) => { const d = await api.data("training"); const lm = await api.lm(); galaxy(el, lm.vocab, d.snapshots[d.snapshots.length - 1].emb2d, { labels: true }).draw(d.snapshots[d.snapshots.length - 1].emb2d); el.append(legend()); } },
      { title: "Directions can carry meaning, roughly", truth: "TOY",
        text: "A famous trick: in big word models, king − man + woman lands near queen. Directions can carry meaning. But be careful. In Maya-LM, she − her + his lands on “he”, while Paris − France + Italy lands on London, not Rome. The trick works only when a direction was strongly learned.",
        precision: "Even in big models, king − man + woman lands near queen only if you leave the three input words out of the answer list. The famous examples are real but flattering. Maya-LM rarely sees countries, so its “which country” direction is weak, while “city” is strong.",
        visual: async (el, api) => { const lm = await api.lm(); el.append(h("div", { class: "stack", style: "--gap:12px" }, [["she", "her", "his"], ["Paris", "France", "Italy"]].map(([a, b, c]) => { const v = lm.embedding(a).map((x, i) => x - lm.embedding(b)[i] + lm.embedding(c)[i]); const res = lm.vocab.map((w, i) => ({ w, c: i < 2 || [a, b, c].includes(w) ? -9 : cosv(v, lm.embedding(w)) })).sort((p, q) => q.c - p.c).slice(0, 3); return h("div", null, h("div", { class: "mono", style: "font-size:.92rem;margin-bottom:4px" }, `${a} − ${b} + ${c} ≈`), MM.bars(res.map((r) => ({ label: r.w, p: Math.max(0, r.c) })), { scale: 1, plain: true, total: false, fmt: (it) => it.p.toFixed(2) })); }))); } },
      { title: "Same word, same starting vector", truth: "TOY",
        text: "An embedding is fixed: “umbrella” gets the same row in every sentence. But meaning depends on context: the “bank” of a river is not a bank for euros. So the model must change each vector as it reads. Here is “umbrella” in two different sentences: almost identical at the start, very different four layers later.",
        precision: "Input vectors are static (plus a position signal, which is why they start at 0.96, not 1.00). After attention mixes in neighbours, they become contextual. M6 shows how.",
        visual: async (el, api) => { const lm = await api.lm(); const s1 = "Maya packed her umbrella because the forecast for Paris said it would", s2 = "When it rains in London , Omar takes his umbrella"; const r1 = lm.run(lm.encode(s1).ids), r2 = lm.run(lm.encode(s2).ids); const p2 = lm.encode(s2).ids.length - 1; const vals = r1.streams.map((st, i) => cosv(st[4], r2.streams[i][p2])); el.append(k.chart([{ pts: vals.map((v, i) => [i, v]), color: "var(--seine)", dots: vals.map((v, i) => [i, v]) }], { W: 460, H: 190, ymin: 0, ymax: 1, xmin: 0, xmax: 8, xlabel: "depth (input, then after each half-layer)", ylabel: "cosine of the two “umbrella” vectors", xfmt: (v) => (v === 0 ? "in" : "L" + Math.ceil(v / 2)) })); } },
      { title: "High dimensions are roomy", truth: "SKETCH",
        text: "In a space with thousands of directions, two random directions are almost exactly at right angles. That gives a model room to store many more “features” (ideas such as “is a city” or “is about rain”) than it has dimensions, each as its own nearly separate direction. This is called [[superposition]].",
        precision: "Cosines of random vectors in d dimensions cluster within about ±2/√d of zero. {tool:t8} So meaning is not one idea per dimension: it is spread across many directions at once.",
        visual: (el) => { const box = h("div"); el.append(box); MM.toolLabs.t8(box); } },
      { title: "How big is the table?", truth: "REAL",
        text: "The embedding table can be a big part of a model. GPT-2 small: 50,257 tokens × 768 numbers ≈ 38.6 million parameters, about a third of its 124 million. In Maya-LM it is 214 × 64 = 13,696 numbers, about 6%, because its vocabulary is tiny.",
        precision: "GPT-2 reuses this same table to score the next token at the very end ([[weight-tying|weight tying]]), and so does Maya-LM. Most large modern models keep two separate tables.",
        visual: (el) => el.append(MM.bars([{ label: "GPT-2 small", p: 38.6 / 124 }, { label: "Maya-LM", p: 13696 / 214208 }], { scale: 1, plain: true, total: false, fmt: (it) => (it.p * 100).toFixed(0) + "% of all parameters" })) },
      { kind: "snap", title: "One tool, four jobs", truth: "SKETCH",
        text: "Remember the dot product. It comes back three more times: to decide which earlier words to listen to (attention, M6), to score every possible next token (M8), and to search documents by meaning (M12). Spotting this one tool in four places is a key “connect” moment.",
        visual: (el) => el.append(h("div", { class: "two" }, [["M4", "how alike are two words?"], ["M6", "which earlier word should I listen to?"], ["M8", "how well does each token fit next?"], ["M12", "which document matches the question?"]].map(([m, q]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, m + " · dot product"), h("p", { style: "margin-top:4px" }, q))))) }],
    lab: {
      title: "The Embedding Galaxy", truth: "TOY",
      intro: "All 214 of Maya-LM's tokens, squashed from 64 numbers to two. Tap a point or search a word to see its true nearest neighbours (measured in all 64 dimensions). Then slide through training to watch the galaxy organise itself.",
      tries: ["Search “Paris”. Are its neighbours on the map the same as its true neighbours?", "Slide training back to step 0. What does the galaxy look like?", "Try word arithmetic: umbrella − rain + sunny.", "Find the cluster where all the days of the week sit."],
      async mount(el, api) {
        const [lm, d] = await Promise.all([api.lm(), api.data("training")]);
        const snaps = d.snapshots;
        let si = snaps.length - 1, hi = "umbrella";
        const holder = h("div");
        const G = galaxy(holder, lm.vocab, snaps[si].emb2d, { labels: true, onPick: (w) => { hi = w; inp.value = w; draw(); api.done(); } });
        const listId = "vocab-list";
        const inp = h("input", { type: "search", id: "galaxy-word", value: hi, list: listId, "aria-label": "Find a word" });
        const dl = h("datalist", { id: listId }, lm.vocab.slice(2).map((w) => h("option", { value: w })));
        const side = h("div");
        const stepLbl = h("div", { class: "mono", style: "font-size:.9rem" });
        function draw() {
          const ok = lm.has(hi);
          const neigh = ok ? lm.neighbours(hi, 6) : [];
          G.draw(snaps[si].emb2d, ok ? hi : null, si === snaps.length - 1 ? neigh : []);
          side.innerHTML = "";
          side.append(h("div", { class: "eyebrow" }, ok ? `true nearest to “${hi}” (64 dimensions, final model)` : `“${hi}” is not in Maya-LM's vocabulary`), ok ? MM.bars(neigh.map((n) => ({ label: n.word, p: Math.max(0, n.cos) })), { scale: 1, plain: true, total: false, fmt: (it) => neigh.find((n) => n.word === it.label).cos.toFixed(2) }) : null);
          stepLbl.textContent = `training step ${snaps[si].step} · validation loss ${snaps[si].val_loss}`;
        }
        inp.addEventListener("change", () => { hi = inp.value.trim(); draw(); api.done(); });
        const slider = MM.slider({ label: "training", min: 0, max: snaps.length - 1, value: si, fmt: (v) => "step " + snaps[v].step, onInput: (v) => { si = v; draw(); api.done(); } });
        // word arithmetic
        const sel = (v) => { const x = h("select", { "aria-label": "word", style: "width:auto;min-width:7.5rem;flex:1" }, lm.vocab.slice(2).map((w) => h("option", { value: w, selected: w === v }, w))); return x; };
        const A = sel("umbrella"), B = sel("rain"), Cc = sel("sunny");
        const incl = h("input", { type: "checkbox", id: "incl-inputs" });
        const ar = h("div");
        const doAr = () => { const v = lm.embedding(A.value).map((x, i) => x - lm.embedding(B.value)[i] + lm.embedding(Cc.value)[i]); const res = lm.vocab.map((w, i) => ({ w, c: i < 2 || (!incl.checked && [A.value, B.value, Cc.value].includes(w)) ? -9 : cosv(v, lm.embedding(w)) })).sort((p, q) => q.c - p.c).slice(0, 5); ar.innerHTML = ""; ar.append(MM.bars(res.map((r) => ({ label: r.w, p: Math.max(0, r.c) })), { scale: 1, plain: true, total: false, fmt: (it) => it.p.toFixed(2) })); api.done(); };
        [A, B, Cc, incl].forEach((x) => x.addEventListener("change", doAr));
        el.append(h("div", { class: "row" }, h("label", { class: "field grow", for: "galaxy-word", style: "min-width:200px" }, "Find a word", inp), dl), slider, stepLbl, holder, legend(),
          h("div", { class: "two", style: "margin-top:12px" }, side, h("div", null, h("div", { class: "eyebrow" }, "Word arithmetic"), h("div", { class: "row", style: "--gap:6px;margin:6px 0" }, A, "−", B, "+", Cc), h("label", { for: "incl-inputs", class: "row", style: "--gap:6px;font-size:.9rem;cursor:pointer" }, incl, "include the three input words in the answers"), ar)));
        draw(); doAr();
      } },
    breakit: {
      title: "Squeeze it, scramble it", truth: "TOY",
      intro: "Two ways to ruin a map of meaning.",
      cases: [
        { name: "Squeeze 64 dimensions into 2", what: "Compare who looks close on the flat galaxy with who is truly close in all 64 dimensions.", action: "Compare", result: "Some words look like neighbours on the flat map but are not close at all in 64 dimensions, and some true neighbours end up far apart. Unrelated words crowd together.", why: "Two numbers cannot hold what 64 numbers hold. Projection keeps the biggest spread and throws away the rest; never trust far-apart distances on a squashed map.",
          visual: async (el, api) => { const [lm, d] = await Promise.all([api.lm(), api.data("training")]); const c2 = d.snapshots[d.snapshots.length - 1].emb2d; const w = "umbrella", i = lm.stoi[w]; const flat = lm.vocab.map((x, j) => ({ x, dd: j < 2 || j === i ? 1e9 : (c2[j][0] - c2[i][0]) ** 2 + (c2[j][1] - c2[i][1]) ** 2 })).sort((a, b) => a.dd - b.dd).slice(0, 5).map((o) => o.x); const tru = lm.neighbours(w, 5).map((o) => o.word); el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "closest to umbrella on the flat map"), MM.toks(flat)), h("div", null, h("div", { class: "eyebrow" }, "truly closest (64 dimensions)"), MM.toks(tru)))); } },
        { name: "Use random, untrained vectors", what: "Look at the galaxy at training step 0, before any learning.", action: "Show step 0", result: "A shapeless cloud: no clusters, no neighbours that mean anything. Cities, names and items are scattered at random, so nothing learned about “umbrella” could carry over to “raincoat”.", why: "Similarity is not built in; it is the result of training. Without it, the model cannot generalise from one word to similar words.",
          visual: async (el, api) => { const [lm, d] = await Promise.all([api.lm(), api.data("training")]); galaxy(el, lm.vocab, d.snapshots[0].emb2d, { labels: true }).draw(d.snapshots[0].emb2d); } }],
      explain: { q: "Two words look very close on a 2-D map of embeddings. What can you safely conclude?", options: ["They are certainly similar in the model", "Nothing for sure: check their real cosine in all dimensions", "They mean the same thing", "They appear next to each other in text"], answer: 1, why: "Projection loses information. Only the full-dimensional similarity is trustworthy." } },
    clinic: [
      { belief: "Each number in an embedding stands for one human idea, like “wetness” or “city-ness”.", test: "Look along any single dimension of Maya-LM's table: cities, weather words and names are mixed on both sides. No single number lines up with one idea.", truth: "Meaning is spread across many directions at once (superposition). Some directions line up with ideas, but they rarely match single dimensions." },
      { belief: "An embedding stores the word's definition.", test: "Read the vector for “umbrella”: 64 numbers, no letters, no definition. Change all the others and the same 64 numbers would mean nothing.", truth: "An embedding is a position. Its meaning is only its place relative to all the other vectors, which predicts how the word is used." },
      { belief: "The same word always has the same vector inside the model.", test: "Follow “umbrella” in two sentences: cosine 0.96 at the input, 0.09 after four layers.", truth: "The input vector is fixed, but attention makes every vector contextual as it moves up the layers (M6)." }],
    explain: { prompt: "How can a list of numbers carry the meaning of a word? Explain in two or three sentences.", points: ["Each token ID picks a learned row of numbers (a vector)", "Training pushes words used in similar contexts towards similar vectors", "Similarity is measured by the dot product or cosine", "Meaning is the position relative to all other words, spread across many directions"] },
    skeptic: [
      { q: "How can a list of numbers *mean* anything?", laws: ["l2", "l8"], a: "Meaning here is position relative to everything else. Training ({law:l8}) placed “umbrella” near “raincoat” because they predict similar next words. That position is useful: whatever the model learns about one word partly transfers to its neighbours. It is not a definition; it is a usable map of how words behave, made of nothing but numbers ({law:l2}).", ladder: ["Why does position equal meaning? Because the only job was predicting text, and words that behave alike must be placed alike to predict well.", "Is that real meaning? It captures usage, which is much of meaning. Whether it captures more is debated.", "What can't it capture? Anything never reflected in text, and anything the model never saw."] },
      { q: "king − man + woman = queen proves the model understands gender.", laws: ["l8"], a: "It shows some directions line up with some ideas, approximately. The result is close to queen only when the three input words are excluded from the answers, and many analogies fail. In Maya-LM, she − her + his gives “he”, but Paris − France + Italy gives London, because its training text rarely mentions countries. Directions are only as good as the data that shaped them." },
      { q: "Why not have experts design the dimensions by hand: one for “weather”, one for “place”…?", laws: ["l8"], a: "There are far more useful features than anyone could list, they overlap, and the model needs more of them than it has dimensions (superposition). Learned features beat hand-designed ones at scale, the “bitter lesson” you meet in M5." }],
    recall: [
      { q: "What is an embedding?", options: ["A token's ID number", "A learned vector (list of numbers) for a token", "A definition stored in the model", "A picture of a word"], answer: 1, level: 1, why: "Each token ID picks one learned row of the embedding table." },
      { q: "Why do “umbrella” and “raincoat” end up with similar vectors?", options: ["A programmer grouped them", "They are spelled alike", "They appear in similar contexts, so they help predict similar next words", "They are both nouns"], answer: 2, level: 2, why: "The distributional hypothesis: similar use → similar vectors." },
      { q: "Two vectors point in opposite directions. Their cosine similarity is about…", options: ["1", "0", "−1", "64"], answer: 2, level: 3, why: "Same way = 1, right angles = 0, opposite = −1." },
      { q: "True or false: the vector for “bank” is the same inside the model in “river bank” and “bank account”.", options: ["True everywhere in the model", "False: the input vector is the same, but attention makes it different in later layers"], answer: 1, level: 4, why: "Static at the input, contextual after attention." },
      { q: "From M3: what does the model receive for “ umbrella”?", options: ["The letters", "One token ID, which then picks a row of the embedding table", "A dictionary entry", "Nothing"], answer: 1, level: 5, why: "Tokens → IDs → embedding rows. M3 and M4 join here." }],
    depth: [
      ["A lookup is a matrix multiplication", "Picking row k of the table equals multiplying a one-hot vector (all zeros except a 1 at position k) by the table. So the table is simply the first weight matrix, learned by the same gradient descent as everything else."],
      ["Why similar words end up close", "Two words used in similar contexts must help predict similar next tokens, so training pushes their vectors in similar directions. Only rows of tokens in a batch get updated, so rare tokens learn slowly."],
      ["Dot product vs cosine", "dot(a, b) = length(a) × length(b) × cos(angle). Cosine ignores length; the dot product does not, and models can store “how strong” or “how common” in a vector's length."],
      ["High dimensions are roomy", "In thousands of dimensions, two random vectors are almost at right angles, so a model can store many more nearly separate features than it has dimensions: superposition."],
      ["Early static embeddings", "word2vec (2013) learned vectors by predicting neighbouring words, pulling true pairs together and pushing random pairs apart (negative sampling), an early form of contrastive learning. GloVe (2014) built vectors from co-occurrence counts."],
      ["Analogies are approximate", "king − man + woman lands near queen only if you leave the three input words out of the answer list. The famous examples are real but flattering."],
      ["Static becomes contextual", "The input vector for “bank” is the same in every sentence. After attention, the vector at that position depends on its neighbours, and the two meanings separate."],
      ["Input and output tables", "GPT-2 (and Maya-LM) reuse the embedding table to score next tokens (weight tying); most large modern models keep two separate tables."],
      ["Reading the maps honestly", "PCA keeps the directions with the most spread. t-SNE and UMAP keep neighbours together but bend distances: never compare far-apart distances on a UMAP picture."],
      ["Size check", "GPT-2 small's table is 50,257 × 768 ≈ 38.6 million parameters, about a third of the whole 124-million-parameter model."]],
    connect: { links: ["The dot product returns as attention scores ({mod:m06}), output scores ({mod:m08}) and vector search ({mod:m12}).", "Static vectors become contextual through attention: {mod:m06}.", "Text embeddings for search, made by a separate embedding model, are the same idea doing a different job: {mod:m12}."], line: "Vectors give meaning, but the model still needs to connect “would” to “umbrella”, far back in the sentence. Next: the long road to attention." }
  });
})();
