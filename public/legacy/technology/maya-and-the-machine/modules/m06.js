/* M6 · Attention — how tokens share information. The deep slice. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const HEADCOL = ["var(--h1)", "var(--h2)", "var(--h3)", "var(--h4)"];
  const NAMES = [["Maya", "her"], ["Aisha", "her"], ["Tom", "his"], ["Leo", "his"]];
  const ITEMS = ["umbrella", "raincoat", "sunglasses", "sunhat", "scarf", "gloves", "coat", "boots"];
  const CITIES = ["Paris", "London", "Rome", "Athens", "Berlin", "Madrid", "Lisbon", "Vienna"];
  const sentence = (n, item, city) => `${n[0]} packed ${n[1]} ${item} because the forecast for ${city} said it would`;
  const SPINE = sentence(NAMES[0], "umbrella", "Paris");
  const label = (w) => (w === "<s>" ? "⟨start⟩" : w);

  /* weights from one query position, for one head: the full pipeline of numbers */
  function pipeline(lm, run, l, hd, qpos, opts) {
    const dh = lm.cfg.d / lm.cfg.H, off = hd * dh;
    const q = run.qkv[l].q[qpos], K = run.qkv[l].k;
    const scores = K.map((kv, s_) => { let x = 0; for (let i = 0; i < dh; i++) x += q[off + i] * kv[off + i]; return x; });
    const scaled = scores.map((x) => (opts.noScale ? x : x / Math.sqrt(dh)));
    const masked = scaled.map((x, s_) => (!opts.noMask && s_ > qpos ? -Infinity : x));
    return { scores, scaled, masked, weights: run.attn[l][hd][qpos] };
  }

  function arcs(words, weights, qpos, col) {
    const W = Math.max(560, words.length * 70), H = 150;
    const x = (i) => 30 + i * (W - 60) / (words.length - 1);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", style: `min-width:${Math.round(W * 0.62)}px;max-width:${W}px;margin:0 auto`, role: "img", "aria-label": `Attention from ${label(words[qpos])} to earlier tokens` });
    weights.forEach((w, i) => {
      if (i === qpos || w < 0.01) return;
      const x1 = x(qpos), x2 = x(i), mid = (x1 + x2) / 2, ht = Math.min(110, 18 + Math.abs(x1 - x2) * 0.35);
      svg.append(s("path", { d: `M${x1} 112 Q ${mid} ${112 - ht * 2} ${x2} 112`, fill: "none", stroke: col, "stroke-width": Math.max(0.8, w * 14), opacity: 0.35 + 0.65 * w, "stroke-linecap": "round" }));
    });
    words.forEach((w, i) => svg.append(s("text", { x: x(i), y: 134, "text-anchor": "middle", "font-size": 12.5, class: "t-mono", fill: i === qpos ? "var(--ink)" : weights[i] > 0.15 ? "var(--ink)" : "var(--ink-3)", "font-weight": i === qpos ? 700 : 400, text: label(w) })));
    return h("div", { class: "scroll-x" }, svg);
  }

  MM.defineModule({
    id: "m06",
    mystery: { title: "Eight words apart", text: "In Maya's sentence, “would” must use “umbrella”, eight tokens back, with “the forecast for Paris” in between. At the same time, “her” must know that it means Maya.\n\nM5 showed why passing a memory along fails. Attention does something different: every token looks straight back at every earlier token and decides, fresh for this very sentence, which ones to listen to. How does it decide?" },
    where: { text: "Inside one transformer block: the attention side-road, the only place in the whole machine where tokens share information." },
    predict: { q: "In Maya-LM, the token “would” sends 98% of one head's attention to “umbrella”. Where does that 98% come from?", options: ["It was learned in training and stored in the model", "It is computed fresh for this sentence, from learned matrices", "A grammar rule written by a programmer", "It is random"], answer: 1, why: "Only the three projection matrices (query, key, value) are learned. The attention weights are activations: computed fresh for every input. Swap “umbrella” for “sunglasses” and the weights change, while the model's numbers stay exactly the same." },
    story: [
      { title: "The job: borrow from earlier tokens", truth: "SKETCH",
        text: "[[attention|Attention]] gives every token a way to pull in information from earlier tokens. For each earlier token it computes a relevance score, turns the scores into weights that add up to 1, and takes a weighted mix of what those tokens offer. “would” mostly takes from “umbrella”.",
        intuition: "A party: everyone wears a name tag saying what they know (a key), carries a question (a query), and has a story to tell (a value). You listen most to the people whose tags best match your question.", breaks: "Real tokens do not choose freely or think about who to ask: the “matching” is a dot product of numbers made by learned matrices, and every token listens to everyone, just by different amounts.",
        visual: (el) => el.append(arcs(["⟨start⟩", "Maya", "packed", "her", "umbrella", "because", "the", "forecast", "for", "Paris", "said", "it", "would"], [0.02, 0.03, 0.02, 0.02, 0.62, 0.02, 0.02, 0.15, 0.02, 0.06, 0.01, 0.01, 0.0], 12, "var(--h2)")) },
      { title: "Three vectors per token", truth: "SKETCH",
        text: "Three learned matrices turn each token's vector into three new vectors. The [[query]] asks “what am I looking for?”. The [[key]] says “what do I offer?”. The [[value]] is “what I pass on if chosen”. These matrices are weights: learned once, then frozen. The three vectors are activations: made fresh every time.",
        precision: "q = x·W_Q, k = x·W_K, v = x·W_V. In Maya-LM each head works with 16 of the 64 numbers; in GPT-2 small each of 12 heads works with 64 of 768.",
        visual: (el) => el.append(h("div", { class: "row", style: "--gap:16px;align-items:flex-end" }, [["query", [0.9, 0.7, -0.2, 0.1]], ["key", [1.0, 0.2, 0.0, -0.3]], ["value", [-0.4, 0.8, 0.6, 0.2]]].map(([n, v]) => h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:6px" }, h("span", { class: "glow", style: "display:inline-block;border-radius:4px" }, MM.vec(v, { max: 1, wide: true })), h("span", { class: "mono", style: "font-size:.8rem" }, n)))), h("div", { class: "faint", style: "font-size:.86rem" }, "Made from the token's vector by three learned grids (weights). Only these grids are stored in the model.")) },
      { title: "Score: does the query match the key?", truth: "SKETCH",
        text: "The score between two tokens is the dot product of one token's query with the other's key: the same tool as M4, now used to measure relevance. Here are clean, chosen numbers. The query of “would” matches the key of “umbrella” best, then “forecast”.",
        precision: "score(t, s) = q_t · k_s. With q = [1, 0.8, 0] and k_umbrella = [1.2, 0.5, 0]: 1.2 + 0.4 + 0 = 1.6. {tool:t1}",
        visual: (el) => { const q = [1, 0.8, 0]; const K = { umbrella: [1.2, 0.5, 0], forecast: [0.5, 0.9, 0.2], Paris: [0.1, 0.3, 1.0], the: [0, 0.1, 0.3] }; el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "key of"), h("th", null, "key"), h("th", { class: "n" }, "query · key"))), h("tbody", null, Object.entries(K).map(([w, kv]) => h("tr", null, h("td", { class: "mono" }, w), h("td", { class: "mono" }, "[" + kv.join(", ") + "]"), h("td", { class: "n mono" }, k.dot(q, kv).toFixed(2))))))); el.append(h("p", { class: "mono", style: "font-size:.88rem;margin-top:6px" }, "query of “would” = [1, 0.8, 0]")); } },
      { title: "Scale, then mask the future", truth: "SKETCH",
        text: "Two fixes before the scores become weights. First, divide by √d (the square root of the key length), so scores stay in a sensible range. Second, the [[causal-mask|causal mask]]: scores for later tokens are set to minus infinity, so they get zero weight. A token may look back, never forward ({law:l5}).",
        precision: "If query and key numbers are random with a spread of 1, their dot product has a spread of √d. Dividing by √d brings it back to 1, so softmax does not saturate (one weight near 1, the rest near 0), where slopes vanish and learning stalls.",
        visual: (el) => { const raw = [1.6, 1.22, 0.34, 0.08], sc = raw.map((x) => x / Math.sqrt(3)); el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "key of"), h("th", { class: "n" }, "score"), h("th", { class: "n" }, "÷ √3"), h("th", null, "mask"))), h("tbody", null, ["umbrella", "forecast", "Paris", "the"].map((w, i) => h("tr", null, h("td", { class: "mono" }, w), h("td", { class: "n mono" }, raw[i].toFixed(2)), h("td", { class: "n mono" }, sc[i].toFixed(2)), h("td", null, "earlier: kept")))).concat([h("tr", null, h("td", { class: "mono" }, "rain (future)"), h("td", { class: "n mono" }, "–"), h("td", { class: "n mono" }, "–"), h("td", { style: "color:var(--bad)" }, "later: −∞"))]))); } },
      { title: "Softmax: scores become weights", truth: "SKETCH",
        text: "[[softmax|Softmax]] turns the scores into positive weights that add up to 1: raise e to each score, then divide by the total. A score bigger by 1 gets about 2.7 times more weight. The masked future token gets e^(−∞) = 0.",
        precision: "weightₛ = e^(scoreₛ) ÷ Σⱼ e^(scoreⱼ). Real code subtracts the largest score first so that e^x never overflows. {tool:t4}",
        visual: (el) => { const sc = [1.6, 1.22, 0.34, 0.08].map((x) => x / Math.sqrt(3)); const w = k.softmax(sc); el.append(MM.bars(["umbrella", "forecast", "Paris", "the"].map((n, i) => ({ label: n, p: w[i] })), { scale: 1 })); } },
      { title: "Mix the values", truth: "SKETCH",
        text: "Finally, “would” takes the weighted mix of the earlier tokens' values: 41% of umbrella's value, 33% of forecast's, and so on. The result is added to the vector for “would” (M7). Now that position carries information about the umbrella. This is how information moves between tokens.",
        precision: "output_t = Σₛ weight(t, s) × v_s, then an output matrix W_O mixes the heads' results back into the model's width. In matrix form for all positions at once: softmax(QKᵀ ÷ √d + mask) × V.",
        visual: (el) => { const sc = [1.6, 1.22, 0.34, 0.08].map((x) => x / Math.sqrt(3)); const w = k.softmax(sc); const V = [[0.9, -0.2, 0.7, 0.1], [0.4, 0.6, 0.3, -0.2], [-0.3, 0.2, -0.5, 0.8], [0.1, 0.1, 0.0, 0.0]]; const mix = [0, 1, 2, 3].map((i) => V.reduce((t, v, j) => t + w[j] * v[i], 0)); el.append(h("div", { class: "row", style: "--gap:10px;align-items:flex-end" }, V.map((v, j) => h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:4px" }, MM.vec(v, { max: 1, wide: true }), h("span", { class: "mono", style: "font-size:.75rem" }, ["umbrella", "forecast", "Paris", "the"][j]), h("span", { class: "mono", style: "font-size:.75rem;color:var(--ink-3)" }, "× " + w[j].toFixed(2)))), "=", h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:4px" }, h("span", { class: "glow", style: "display:inline-block;border-radius:4px" }, MM.vec(mix, { max: 1, wide: true })), h("span", { class: "mono", style: "font-size:.75rem" }, "new info for “would”")))); } },
      { title: "Many heads, each looking for something", truth: "SKETCH",
        text: "One head can only look for one kind of thing at a time. So each layer runs several [[multi-head|heads]] side by side, each with its own query, key and value matrices. One head might carry the weather clue; another might link “her” to “Maya”. Their results are joined back together.",
        precision: "Head size = model width ÷ number of heads. Maya-LM: 64 ÷ 4 = 16. GPT-2 small: 768 ÷ 12 = 64. An output projection mixes the heads' results back into the shared stream.",
        visual: (el) => { const w = ["⟨start⟩", "Maya", "packed", "her", "umbrella", "because", "the", "forecast", "for", "Paris", "said", "it", "would"]; el.append(h("div", { class: "eyebrow", style: "color:var(--h2)" }, "head A, from “would”"), arcs(w, [0.02, 0.02, 0.02, 0.01, 0.7, 0.02, 0.02, 0.12, 0.02, 0.04, 0.01, 0.0, 0], 12, "var(--h2)"), h("div", { class: "eyebrow", style: "color:var(--h3)" }, "head B, from “her”"), arcs(w, [0.1, 0.8, 0.08, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3, "var(--h3)")); } },
      { kind: "real", title: "The real heads of Maya-LM", truth: "TOY",
        text: "Now the real thing. Maya-LM has 4 layers × 4 heads. Most heads are messy. But one stands out: in layer 3, head 2 sends 98% of the attention from “would” to “umbrella”. The same head sends half of “her”'s attention to “Maya”. Several heads park attention on the start token: an [[attention-sink|attention sink]].",
        precision: "Softmax weights must add up to 1, so a head with nothing useful to look at parks its weight on the first token. Real large models do this too: dropping the first token from the cache breaks them (StreamingLLM, 2023).",
        visual: async (el, api) => { const lm = await api.lm(); const e = lm.encode(SPINE); const r = lm.run(e.ids); const words = ["<s>"].concat(SPINE.split(" ")); const grid = h("div", { style: "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px" }); for (let l = 0; l < 4; l++) for (let hd = 0; hd < 4; hd++) { const a = r.attn[l][hd][12]; const mi = a.indexOf(Math.max(...a)); grid.append(h("div", { class: "panel", style: "padding:6px 8px" + (l === 2 && hd === 1 ? ";outline:2px solid var(--h2)" : "") }, h("div", { class: "mono", style: "font-size:.72rem;color:var(--ink-3)" }, `L${l + 1} H${hd + 1}`), h("div", { class: "mono", style: "font-size:.8rem" }, label(words[mi])), h("div", { class: "mono", style: "font-size:.72rem;color:var(--ink-2)" }, Math.round(a[mi] * 100) + "%"))); } el.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "where each head looks most, from “would”"), grid); } },
      { title: "Switch off one head", truth: "TOY",
        text: "Is that head really carrying the clue? Test it: switch it off and run Maya-LM again. “rain” falls from 55% to 29%, and “be” jumps to 69%: the model falls back to the counting model's answer from M1. One head, among sixteen, carries the umbrella across the sentence.",
        precision: "Switching off (ablating) parts and measuring the change is a basic tool of interpretability. Researchers have found previous-token heads, induction heads and heads that move names to where they are needed.",
        visual: async (el, api) => { const lm = await api.lm(); const ids = lm.encode(SPINE).ids; const a = lm.softmax(lm.run(ids).logits[12]), b = lm.softmax(lm.run(ids, { ablate: new Set(["2.1"]) }).logits[12]); const words = ["rain", "be", "drizzle", "pour"]; el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "all 16 heads"), MM.bars(words.map((w) => ({ label: w, p: a[lm.stoi[w]] })), { total: false })), h("div", null, h("div", { class: "eyebrow" }, "layer 3 head 2 switched off"), MM.bars(words.map((w) => ({ label: w, p: b[lm.stoi[w]] })), { total: false })))); } },
      { title: "Attention alone is blind to order", truth: "TOY",
        text: "Nothing in a query–key score says where a token sits. Shuffle the words and the scores shuffle with them. So word order must be added: GPT-2 and Maya-LM add a learned position vector to each token; most modern models rotate queries and keys instead ([[rope|RoPE]]). Remove Maya-LM's positions and a scrambled sentence looks almost normal to it.",
        precision: "Without positions and without a mask, attention is permutation-equivariant: shuffle the inputs and the outputs shuffle the same way. With a causal mask, the mask itself leaks some order information, which is why decoder models without any position encoding (“NoPE”) can still learn order, though less well.",
        visual: async (el, api) => { const lm = await api.lm(); const t = (txt, o) => lm.top(lm.next(txt, o).probs, 3); const rows = [["The capital of Italy is", false], ["Italy of capital The is", false], ["Italy of capital The is", true]]; el.append(h("div", { class: "stack", style: "--gap:10px" }, rows.map(([txt, zp]) => h("div", null, h("div", { class: "mono", style: "font-size:.9rem" }, `“${txt} ___” ${zp ? "· positions removed" : "· with positions"}`), MM.bars(t(txt, { zeroPos: zp }).map((x) => ({ label: x.word, p: x.p })), { total: false }))))); } },
      { title: "How RoPE adds order", truth: "SKETCH",
        text: "[[rope|RoPE]] rotates each query and key by an angle that grows with its position. Rotate two arrows by different amounts and their dot product depends only on the **difference** in angle. So attention scores sense how far apart two tokens are, for free. Move both positions together and the score stays the same.",
        precision: "Each query and key is split into pairs of numbers; pair j is rotated by position × θⱼ, with some pairs spinning fast and others slowly, so both near and far distances can be sensed.",
        visual: (el) => ropeDemo(el) },
      { kind: "spotlight", title: "Too big, or too small?", truth: "SKETCH",
        text: "“Maya couldn't fit the umbrella in her bag because **it** was too big.” Here “it” is the umbrella. Change one word, “too small”, and “it” is the bag. But at the position of “it”, the model cannot see “big” or “small” yet ({law:l5}). So the decision is made later: at “big”, attention looks back at “umbrella”; at “small”, at “bag”.",
        visual: (el) => { const w = ["Maya", "couldn't", "fit", "the", "umbrella", "in", "her", "bag", "because", "it", "was", "too", "big"]; el.append(arcs(w, w.map((x) => (x === "umbrella" ? 0.6 : x === "it" ? 0.25 : x === "bag" ? 0.08 : 0.01)), 12, "var(--h2)"), arcs(w.slice(0, 12).concat(["small"]), w.map((x) => (x === "bag" ? 0.6 : x === "it" ? 0.25 : x === "umbrella" ? 0.08 : 0.01)), 12, "var(--h4)")); } },
      { title: "The cost: every pair", truth: "SKETCH",
        text: "Every token compares itself with every earlier token. For n tokens that is about n²/2 comparisons: double the text, four times the work. This is why long contexts are expensive, and why tokens (M3) beat letters. While generating, keys and values of earlier tokens are kept in a [[kv-cache|KV cache]] so they are not recomputed.",
        precision: "KV-cache memory per token = 2 (keys and values) × layers × KV heads × head size × bytes per number. Use the calculator below with a real model shape.",
        visual: (el) => kvBill(el) },
      { kind: "snap", title: "Back to Maya: fresh every time", truth: "TOY", reveal: true,
        text: "Swap “umbrella” for “sunglasses” and run Maya-LM again. Same model, same weights, not one number changed. But the attention from “would” now carries the sunglasses, and the prediction moves from “rain” to “be” (sunny). Attention weights are computed fresh for every input. That is {law:l6}: attention is where tokens share information.",
        visual: async (el, api) => { const lm = await api.lm(); const s2 = SPINE.replace("umbrella", "sunglasses"); el.append(h("div", { class: "two" }, [SPINE, s2].map((t) => { const n = lm.next(t); return h("div", null, h("div", { class: "mono", style: "font-size:.85rem;margin-bottom:4px" }, "…her " + (t === SPINE ? "umbrella" : "sunglasses") + " … would"), MM.bars(lm.top(n.probs, 4).map((x) => ({ label: x.word, p: x.p })), { total: false })); }))); } }],
    lab: {
      title: "The Attention Lab", truth: "TOY",
      intro: "This is the real Maya-LM, running in your browser. Change the sentence, choose any token, and see exactly where each of the 16 heads sends its attention: raw scores, scaled scores, the mask and the softmax weights. Then switch heads off and watch the prediction change.",
      tries: ["Find the head that carries “umbrella” to “would”.", "Switch that head off. What does Maya-LM predict now?", "Click “her”. Which heads look back at the name?", "Change Maya to Tom. Does “his” still find the name?", "Turn on “Remove scaling” and compare the weights."],
      async mount(el, api) {
        const lm = await api.lm();
        const st = { name: 0, item: "umbrella", city: "Paris", q: 12, l: 2, hd: 1, off: new Set(), noScale: false, zeroPos: false };
        const sel = (opts, val, on, lab) => { const x = h("select", { "aria-label": lab, style: "width:auto;min-width:6.5rem" }, opts.map((o, i) => h("option", { value: String(i), selected: i === val }, Array.isArray(o) ? o[0] : o))); x.onchange = () => on(+x.value); return x; };
        const sentRow = h("div", { class: "row", style: "--gap:6px;font-family:var(--font-mono);font-size:.92rem" });
        const toks = h("div", { class: "toks", style: "margin-top:10px" });
        const pred = h("div"), heads = h("div"), detail = h("div");
        const opts = h("div", { class: "row", style: "--gap:10px;margin-top:6px" });
        function words() { return ["<s>"].concat(sentence(NAMES[st.name], st.item, st.city).split(" ")); }
        function draw() {
          const text = sentence(NAMES[st.name], st.item, st.city);
          const ids = lm.encode(text).ids, W = words();
          const o = { want: { qkv: true }, ablate: st.off, noScale: st.noScale, zeroPos: st.zeroPos };
          const r = lm.run(ids, o);
          toks.innerHTML = "";
          W.forEach((w, i) => { const b = MM.tok(label(w), { button: true, title: "Look from " + label(w) }); b.setAttribute("aria-pressed", String(i === st.q)); b.onclick = () => { st.q = i; draw(); api.done(); }; toks.append(b); });
          const p = lm.softmax(r.logits[r.logits.length - 1]);
          pred.innerHTML = "";
          pred.append(h("div", { class: "eyebrow" }, "Maya-LM's next word" + (st.off.size ? ` · ${st.off.size} head${st.off.size > 1 ? "s" : ""} off` : "")), MM.bars(lm.top(p, 5).map((x) => ({ label: x.word, p: x.p })), { rest: 1 - lm.top(p, 5).reduce((a, b) => a + b.p, 0) }));
          heads.innerHTML = "";
          const grid = h("div", { style: "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px" });
          for (let l = 0; l < 4; l++) for (let hd = 0; hd < 4; hd++) {
            const a = r.attn[l][hd][st.q]; const mi = a.indexOf(Math.max(...a));
            const key = l + "." + hd, off = st.off.has(key), cur = l === st.l && hd === st.hd;
            const b = h("button", { type: "button", class: "panel", style: `padding:5px 7px;text-align:left;cursor:pointer;${cur ? "outline:2px solid " + HEADCOL[hd] + ";" : ""}${off ? "opacity:.45;text-decoration:line-through;" : ""}`, "aria-pressed": String(cur), "aria-label": `Layer ${l + 1} head ${hd + 1}${off ? ", switched off" : ""}` },
              h("div", { class: "mono", style: `font-size:.7rem;color:${HEADCOL[hd]}` }, `L${l + 1}H${hd + 1}`), h("div", { class: "mono", style: "font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, label(W[mi])), h("div", { class: "mono", style: "font-size:.7rem;color:var(--ink-3)" }, Math.round(a[mi] * 100) + "%"));
            b.onclick = () => { st.l = l; st.hd = hd; draw(); api.done(); };
            grid.append(b);
          }
          heads.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, `All 16 heads: where “${label(W[st.q])}” looks most`), grid);
          const P = pipeline(lm, r, st.l, st.hd, st.q, st);
          const key = st.l + "." + st.hd;
          detail.innerHTML = "";
          const tbl = h("table", { class: "tbl", style: "min-width:420px" }, h("thead", null, h("tr", null, h("th", null, "earlier token"), h("th", { class: "n" }, "q · k"), h("th", { class: "n" }, st.noScale ? "not scaled" : "÷ √16"), h("th", null, "weight"))),
            h("tbody", null, W.map((w, i) => h("tr", { style: i > st.q && !st.noMask ? "opacity:.45" : "" }, h("td", { class: "mono" }, label(w)), h("td", { class: "n mono" }, P.scores[i].toFixed(2)), h("td", { class: "n mono" }, P.masked[i] === -Infinity ? "−∞ (future)" : P.scaled[i].toFixed(2)),
              h("td", { style: "min-width:120px" }, h("div", { class: "bar", style: "grid-template-columns:minmax(0,1fr) 3.4rem" }, h("span", { class: "track" }, h("span", { class: "fill", style: { width: (P.weights[i] * 100).toFixed(1) + "%", background: HEADCOL[st.hd] } })), h("span", { class: "v" }, (P.weights[i] * 100).toFixed(1) + "%")))))));
          const offBtn = h("button", { class: "btn small" + (st.off.has(key) ? " primary" : "") }, st.off.has(key) ? "Switch this head back on" : "Switch this head off");
          offBtn.onclick = () => { if (st.off.has(key)) st.off.delete(key); else st.off.add(key); draw(); api.done(); };
          detail.append(h("div", { class: "row" }, h("h3", { style: `color:${HEADCOL[st.hd]}` }, `Layer ${st.l + 1}, head ${st.hd + 1}`), h("span", { class: "faint" }, `from “${label(W[st.q])}”`), h("span", { class: "grow" }), offBtn),
            arcs(W, Array.from(P.weights), st.q, HEADCOL[st.hd]), h("div", { class: "scroll-x", style: "margin-top:8px" }, tbl));
        }
        const posEl = h("span", null, "her");
        sentRow.append(sel(NAMES, st.name, (v) => { st.name = v; posEl.textContent = NAMES[v][1]; draw(); }, "Name"), "packed", posEl, sel(ITEMS, 0, (v) => { st.item = ITEMS[v]; draw(); api.done(); }, "Item"), "because the forecast for", sel(CITIES, 0, (v) => { st.city = CITIES[v]; draw(); }, "City"), "said it would ___");
        const tog = (label_, keyName) => { const cb = h("input", { type: "checkbox", id: "att-" + keyName }); cb.onchange = () => { st[keyName] = cb.checked; draw(); api.done(); }; return h("label", { for: cb.id, class: "row", style: "--gap:6px;cursor:pointer;font-size:.92rem" }, cb, label_); };
        opts.append(tog("Remove scaling (÷√d)", "noScale"), tog("Remove position information", "zeroPos"), h("button", { class: "btn small ghost", onclick: () => { st.off.clear(); draw(); } }, "All heads on"));
        el.append(h("div", { class: "eyebrow" }, "Build the sentence"), sentRow, h("div", { class: "eyebrow", style: "margin-top:10px" }, "Tap a token to look from it"), toks, opts,
          h("div", { class: "two", style: "margin-top:14px" }, heads, pred), h("hr", { class: "rule" }), detail);
        draw();
      } },
    breakit: {
      title: "Remove the mask, the scaling, the positions", truth: "TOY",
      intro: "Each of attention's parts exists for a reason. Remove one at a time.",
      cases: [
        { name: "Remove the causal mask during training", what: "We trained a second Maya-LM with no mask, so each position could see the next token while learning to predict it.", action: "Show the real run", result: "Its training loss fell to 0.04, almost perfect, while the honest model was at 0.87. But when generating, it fell apart: “…it would rain . the forecast for the forecast for the”.", why: "It learned to copy the answer from the next position. While generating, the next position does not exist yet, so the trick is useless. (Its first word can still be right, because the last position of every training window had no future to copy and learned a little honestly.)",
          visual: async (el, api) => { const d = await api.data("training"); const e = d.experiments.no_mask; const normal = d.curve.filter((p) => p[0] <= 600); el.append(k.chart([{ pts: e.curve, color: "var(--bad)", label: "no mask (cheating)" }, { pts: normal, color: "var(--seine)", label: "with mask" }], { W: 460, H: 180, ymin: 0, xlabel: "training step", ylabel: "training loss" }), h("p", { class: "mono", style: "font-size:.88rem;margin-top:6px" }, "no-mask model continues: …it would " + e.generation.split(" ").slice(-10).join(" ").replace(/<s>/g, "⟨start⟩"))); } },
        { name: "Remove the scaling", what: "Use raw scores without dividing by √16, in the trained Maya-LM.", action: "Remove it", result: "Weights snap towards one token: in layer 3, head 1's biggest weight jumps from 36% to 90%, and head 3's from 11% to 71%. In a model being trained, such near one-hot weights make learning stall.", why: "Dot products of d random numbers spread with size √d. Without dividing, softmax saturates: one weight near 1, the rest near 0, and their slopes near zero." },
        { name: "Remove position information", what: "Zero Maya-LM's position vectors and give it the scrambled “Italy of capital The is”.", action: "Remove it", result: "With positions, the scramble confuses it (England 32%). Without positions, it answers “Rome” (81%), almost as if the sentence were in order: it can hardly tell word order any more.", why: "Query–key scores ignore position. Order has to be added; only the causal mask still leaks a little." }],
      explain: { q: "A model trained without the causal mask scores almost perfectly in training. Why is it useless for generating?", options: ["It is too slow", "It learned to copy each answer from the next position, which does not exist while generating", "Its vocabulary is too small", "It forgets the prompt"], answer: 1, why: "During generation the future is not there to copy, so the shortcut it learned gives nothing." } },
    clinic: [
      { belief: "Attention weights are learned during training.", test: "In the Lab, swap “umbrella” for “sunglasses”. The weights from “would” change completely, yet not one of Maya-LM's 214,208 numbers changed.", truth: "Only the projection matrices (query, key, value, output) are learned. The attention weights are activations, computed fresh for every input." },
      { belief: "Attention shows exactly what the model is thinking.", test: "Many heads park most of their weight on ⟨start⟩, which carries no information, and switching off most single heads barely changes the prediction.", truth: "Attention patterns are partial evidence. To know what matters you must test it, for example by switching parts off and measuring the change." },
      { belief: "Attention works like human attention.", test: "Read the Lab's table: every weight is the softmax of a dot product. Every earlier token always gets some weight; nothing is “noticed” or “ignored” by choice.", truth: "It is a weighted average whose weights come from dot products. The name is a loose metaphor." }],
    explain: { prompt: "Explain how “would” gets information from “umbrella”, step by step.", points: ["Each token makes a query, a key and a value with learned matrices", "Scores are query · key dot products, divided by √d", "The causal mask hides later tokens", "Softmax turns scores into weights that add to 1", "The output is the weighted mix of values; weights are computed fresh for every input"] },
    skeptic: [
      { q: "If every token can see every earlier token, why do models still miss facts in the middle of long documents?", laws: ["l6", "l5"], a: "Seeing is not the same as attending strongly. Softmax spreads a fixed total of 100% over every earlier token, so in a 100,000-token document each token can get a very thin slice, and position handling weakens at long distances. Studies find facts in the middle of long contexts are used less reliably (“lost in the middle”)." },
      { q: "Attention weights are learned in training, right?", laws: ["l6", "l4"], a: "No. What is learned (and then frozen, {law:l4}) are the query, key, value and output matrices. The weights come from dot products of vectors made for this input, so they are activations, computed fresh every time.", ladder: ["Why do the weights change when the input changes? Because the queries and keys are made from this input's vectors.", "Then what does training actually change? The matrices that turn vectors into queries, keys and values, so that useful pairs end up with matching directions.", "So where is “umbrella means rain” stored? In those matrices and in the MLPs (M7): the knowledge of what to look for, not the looking itself."] },
      { q: "Why divide by √d at all? It's just a constant.", laws: ["l6"], a: "Because the spread of a dot product grows like √d. With d = 128, raw scores are about 11 times more spread out, softmax becomes almost one-hot, and the slopes that training needs become almost zero. Dividing by √d keeps the scores near a spread of 1, where softmax is smooth and learnable." },
      { q: "Mamba-style models have little or no attention, so your Law of Mixing is wrong!", laws: ["l6"], a: "Good catch: that is exactly where {law:l6} bends. In a standard Transformer, attention is the only place tokens share information. Hybrid and state-space models also move information along the sequence, through a fixed-size running summary. The expert version of the law says so." }],
    recall: [
      { q: "In attention, what is a score?", options: ["The chance of the next token", "The dot product of one token's query with another's key", "The number of tokens", "A learned weight stored in the model"], answer: 1, level: 1, why: "Query · key, then scaled and passed through softmax." },
      { q: "Why is the causal mask needed?", options: ["To save memory", "So each token can only use earlier tokens, matching how text is generated", "To make training slower", "To remove punctuation"], answer: 1, level: 2, why: "Without it the model can see the answer in training (Law 5)." },
      { q: "You switch off Maya-LM's layer 3, head 2. What happens to its guess after “…umbrella … said it would”?", options: ["Nothing changes", "“rain” falls from 55% to 29% and “be” rises to 69%", "It predicts “umbrella”", "It stops working"], answer: 1, level: 3, why: "That head carries the umbrella clue; without it, the model falls back on “it would be”." },
      { q: "True or false: an attention head stores, during training, how much “would” should look at “umbrella”.", options: ["True", "False: the weights are computed fresh for each input from learned matrices"], answer: 1, level: 4, why: "Weights are activations; only the projection matrices are learned." },
      { q: "Name the tool that appears in M4, here in M6, and again in M8 and M12.", options: ["Softmax", "The dot product", "Gradient descent", "The tokeniser"], answer: 1, level: 5, why: "Similarity of words, attention scores, output scores and vector search." }],
    depth: [
      ["The whole formula, in words", "For each position: scores = its query · every earlier key ÷ √(key length); mask the future; softmax; output = weighted sum of the values. Matrix form: softmax(QKᵀ ÷ √d + mask) × V, where Q, K and V hold every position's queries, keys and values as rows."],
      ["Why divide by √d", "If query and key numbers are random with spread 1, their dot product has spread √d. Dividing by √d brings it back to 1, so softmax doesn't saturate (one weight near 1), where slopes vanish and learning stalls."],
      ["Two jobs, two circuits", "The query–key part decides where to look (the “QK circuit”). The value–output part decides what to copy once you look (the “OV circuit”). They are separate learned matrices and can be studied separately."],
      ["Heads are small", "In GPT-2 small each of the 12 heads works in 64 of the 768 dimensions; in Maya-LM, 16 of 64. The output matrix writes each head's result back into the shared stream."],
      ["No built-in order", "Shuffle the tokens with no position information and attention's outputs shuffle the same way. Order must be added. (A causal mask leaks a little order on its own.)"],
      ["How RoPE adds order", "Split each query and key into pairs and rotate each pair by an angle proportional to position, some fast, some slow. The dot product of a rotated query and key then depends only on their distance: relative position for free."],
      ["Training is parallel because of the mask", "One pass over a 1,000-token text gives 1,000 predictions at once, each seeing only its own past (“teacher forcing”)."],
      ["The KV-cache bill", "Memory per token = 2 × layers × KV heads × head size × bytes. Llama-3-8B-like shape (32 layers, 8 KV heads of 128, 16-bit): 131,072 bytes ≈ 128 KB per token; 100,000 tokens ≈ 13 GB. Grouped-query attention (fewer KV heads) exists for this reason."],
      ["Attention sinks", "Softmax weights must add to 1, so a head with nothing useful to look at parks its weight on the first token. Drop that token from the cache and the model breaks (StreamingLLM, 2023)."],
      ["Heads with jobs", "Researchers have found previous-token heads, induction heads (copy what followed this token last time) and heads that move names to where they are needed. Maya-LM's layer 3, head 2 is an umbrella-to-would head."]],
    connect: { links: ["Attention's result is added to the residual stream, and an MLP follows: {mod:m07}.", "The KV cache grows with every generated token: {mod:m09}.", "The same dot product scores the next token in {mod:m08} and searches documents in {mod:m12}."], line: "Attention moves information. Next: the MLP that processes it, the river that carries it, and why we stack so many blocks." }
  });

  function ropeDemo(el) {
    let a = 2, b = 5;
    const th = 0.5;
    const svg = s("svg", { viewBox: "-120 -120 240 240", style: "max-width:230px", class: "figure", role: "img", "aria-label": "A query and a key rotated by their positions" });
    const out = h("div", { class: "mono", style: "font-size:.9rem;margin-top:6px", "aria-live": "polite" });
    function draw() {
      svg.innerHTML = "";
      svg.append(s("circle", { cx: 0, cy: 0, r: 90, fill: "none", stroke: "var(--rule)" }));
      const q = [0.9, 0.4], kk = [0.8, -0.3];
      const rot = (v, ang) => [v[0] * Math.cos(ang) - v[1] * Math.sin(ang), v[0] * Math.sin(ang) + v[1] * Math.cos(ang)];
      const qr = rot(q, a * th), kr = rot(kk, b * th);
      [[qr, "var(--h2)", "query @ " + a], [kr, "var(--h4)", "key @ " + b]].forEach(([v, c, t]) => svg.append(s("line", { x1: 0, y1: 0, x2: v[0] * 90, y2: -v[1] * 90, stroke: c, "stroke-width": 4, "stroke-linecap": "round" }), s("text", { x: v[0] * 100, y: -v[1] * 100, "font-size": 11, "text-anchor": "middle", fill: c, text: t })));
      out.textContent = `positions ${a} and ${b} · distance ${b - a} · score = ${(qr[0] * kr[0] + qr[1] * kr[1]).toFixed(3)}`;
    }
    el.append(h("div", { class: "two" }, svg, h("div", { class: "stack" }, MM.slider({ label: "query position", min: 0, max: 12, value: a, onInput: (v) => { a = v; draw(); } }), MM.slider({ label: "key position", min: 0, max: 12, value: b, onInput: (v) => { b = v; draw(); } }), h("button", { class: "btn small", onclick: () => { a = Math.min(9, a + 3); b = Math.min(12, b + 3); draw(); } }, "Move both 3 places on"), out)));
    draw();
  }
  function kvBill(el) {
    const st = { layers: 32, kv: 8, hd: 128, bytes: 2, tokens: 100000 };
    const out = h("div", { class: "mono", style: "font-size:.92rem;margin-top:8px;white-space:pre-wrap", "aria-live": "polite" });
    const draw = () => { const per = 2 * st.layers * st.kv * st.hd * st.bytes; out.textContent = `per token: 2 × ${st.layers} × ${st.kv} × ${st.hd} × ${st.bytes} = ${per.toLocaleString("en-GB")} bytes (${(per / 1024).toFixed(0)} KB)\nfor ${st.tokens.toLocaleString("en-GB")} tokens: ${(per * st.tokens / 1e9).toFixed(1)} GB`; };
    el.append(h("div", { class: "eyebrow" }, "KV-cache bill · preset: a Llama-3-8B-like shape"), MM.slider({ label: "layers", min: 1, max: 128, value: st.layers, onInput: (v) => { st.layers = v; draw(); } }), MM.slider({ label: "KV heads", min: 1, max: 64, value: st.kv, onInput: (v) => { st.kv = v; draw(); } }), MM.slider({ label: "head size", min: 16, max: 256, step: 16, value: st.hd, onInput: (v) => { st.hd = v; draw(); } }), MM.slider({ label: "context", min: 1000, max: 1000000, step: 1000, value: st.tokens, fmt: (v) => v.toLocaleString("en-GB"), onInput: (v) => { st.tokens = v; draw(); } }), out);
    draw();
  }
})();
