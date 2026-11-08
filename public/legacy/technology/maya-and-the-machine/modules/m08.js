/* M8 · Choosing the Next Token — logits, softmax and sampling. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";
  const PROMPTS = [["Maya's sentence", SPINE], ["…with sunglasses", SPINE.replace("umbrella", "sunglasses")], ["…with a scarf", SPINE.replace("umbrella", "scarf")], ["A stored fact", "The Eiffel Tower is in the city of"], ["Maya's hotel", "Q : What time is check-in at Maya 's hotel ? A : Check-in is at"], ["A story start", "Maya"]];
  const fmtGen = (t) => t.replace(/<s>/g, "⟨start⟩");

  function shapedBars(lm, logits, set, n) {
    const sh = lm.shape(logits, set);
    const order = sh.order.slice(0, n || 8);
    return MM.bars(order.map((i) => ({ label: lm.vocab[i], p: sh.probs[i], cut: !sh.kept.has(i) })), { scale: Math.max(...order.map((i) => sh.probs[i]), 0.01), total: false, fmt: (it) => (it.cut ? "cut" : MM.pct(it.p, it.p < 0.01 ? 2 : 1)) });
  }

  MM.defineModule({
    id: "m08",
    mystery: { title: "Same question, different answers", text: "Maya asks the same question twice and gets two different answers. Her friend says the model must have changed its mind, or learned something in between.\n\nNeither is true. The model's numbers did not change at all. Something much simpler happened, after the model had done its work, and you can control it with one setting called temperature." },
    where: { text: "The last three boxes of the machine map: the unembedding, softmax and the sampler. One vector goes in; one chosen token comes out." },
    predict: { q: "Maya-LM gives “rain” 55% and “be” 18% after Maya's sentence. You lower the temperature from 1.0 to 0.2. What happens?", options: ["“rain” rises to almost 100%", "The model learns that rain is right", "All the chances become equal", "Nothing: temperature only affects long texts"], answer: 0, why: "Temperature divides the scores before softmax. At 0.2 the gaps between scores become five times bigger, so the leader takes nearly everything: real value 99.5%. The model itself, and its scores, are unchanged." },
    story: [
      { title: "One vector in, one score per token", truth: "TOY",
        text: "At the top of the stack, the vector for “would” is compared with every token's output vector by dot product: the same tool as M4 and M6. Each comparison gives one score. This last step is the [[unembedding]]. Maya-LM produces 214 scores; GPT-4-class models produce about 100,000, one for every token in the vocabulary.",
        precision: "scores = final vector · Wᵤ, where Wᵤ has one column per token. Maya-LM reuses its embedding table here ([[weight-tying|weight tying]]), so a token's score is literally the dot product of the final vector with that token's own embedding.",
        visual: async (el, api) => { const lm = await api.lm(); const n = lm.next(SPINE); const top = lm.top(n.probs, 6, n.logits); el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "token"), h("th", { class: "n" }, "score (logit)"))), h("tbody", null, top.map((t) => h("tr", null, h("td", { class: "mono" }, t.word), h("td", { class: "n mono" }, t.logit.toFixed(2)))).concat([h("tr", null, h("td", { class: "faint" }, "… 208 more"), h("td", { class: "n faint" }, "")) ])))); } },
      { title: "Logits: only the gaps matter", truth: "TOY",
        text: "These raw scores are called [[logit|logits]]. On their own they mean nothing: add 100 to every one and nothing changes. Only the **differences** matter. “rain” scores 1.11 more than “be”, and that gap alone decides how much more likely rain is.",
        precision: "softmax(z + c) = softmax(z) for any constant c. Real code subtracts the largest score before exponentiating, so e^x never overflows.",
        visual: async (el, api) => { const lm = await api.lm(); const lg = lm.next(SPINE).logits; const words = ["rain", "be", "drizzle", "pour"]; const p1 = lm.softmax(lg), p2 = lm.softmax(lg.map((x) => x + 100)); el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "token"), h("th", { class: "n" }, "logit"), h("th", { class: "n" }, "chance"), h("th", { class: "n" }, "logit + 100"), h("th", { class: "n" }, "chance"))), h("tbody", null, words.map((w) => { const i = lm.stoi[w]; return h("tr", null, h("td", { class: "mono" }, w), h("td", { class: "n mono" }, lg[i].toFixed(2)), h("td", { class: "n mono" }, MM.pct(p1[i], 1)), h("td", { class: "n mono" }, (lg[i] + 100).toFixed(2)), h("td", { class: "n mono" }, MM.pct(p2[i], 1))); })))); } },
      { kind: "spotlight", title: "Softmax by hand", truth: "SKETCH",
        text: "Three scores, worked three times: first fully, then half, then by you. Softmax raises e (about 2.718) to each score, then divides each by the total, so they become positive and add up to 1. {tool:t4}",
        visual: (el) => softmaxByHand(el) },
      { title: "Gaps are ratios", truth: "TOY",
        text: "Here is the cleanest way to read logits. A gap of 1 means about 2.7 times more likely. “rain” beats “be” by 1.11, so rain is e^1.11 ≈ 3.0 times more likely: 54.6% against 17.9%. A gap of 2.3 means 10 times; a gap of 4.6 means 100 times.",
        precision: "score A − score B = ln(p_A ÷ p_B), the natural log of the ratio of their chances. So logits are log-odds up to a shared constant.",
        visual: async (el, api) => { const lm = await api.lm(); const n = lm.next(SPINE); const a = n.logits[lm.stoi.rain], b = n.logits[lm.stoi.be]; el.append(h("div", { class: "mono", style: "font-size:.95rem;line-height:1.8" }, `gap = ${a.toFixed(2)} − ${b.toFixed(2)} = ${(a - b).toFixed(2)}`, h("br"), `e^${(a - b).toFixed(2)} = ${Math.exp(a - b).toFixed(2)}`, h("br"), `chances: ${MM.pct(n.probs[lm.stoi.rain], 1)} ÷ ${MM.pct(n.probs[lm.stoi.be], 1)} = ${(n.probs[lm.stoi.rain] / n.probs[lm.stoi.be]).toFixed(2)}`)); } },
      { title: "The model stops here; a sampler picks", truth: "TOY",
        text: "The network's job ends with these chances. A separate, very simple rule picks the token: this is {law:l11}. [[greedy|Greedy decoding]] always takes the top token. [[sampling|Sampling]] draws at random, by the chances: “rain” wins about 55 times in 100, “be” about 18 times.",
        intuition: "A bag of 100 marbles: 55 say rain, 18 say be, 12 say drizzle, 10 say pour, the rest other words. Shake, draw one.", breaks: "A real sampler draws from all 214 tokens (or 100,000), including many with tiny chances: the bag has millions of grains, not 100 marbles.",
        visual: async (el, api) => { const lm = await api.lm(); const p = lm.next(SPINE).probs; const counts = {}; const rand = MM.rng(2024); for (let i = 0; i < 100; i++) { const w = lm.vocab[lm.sampleFrom(p, rand)]; counts[w] = (counts[w] || 0) + 1; } const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]); el.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "100 real draws from Maya-LM's chances"), MM.bars(rows.map(([w, c]) => ({ label: w, p: c / 100 })), { total: false, fmt: (it) => Math.round(it.p * 100) + " of 100 · expected " + MM.pct(p[lm.stoi[it.label]], 0) })); } },
      { title: "Temperature reshapes the chances", truth: "TOY",
        text: "[[temperature|Temperature]] divides every logit by a number T before softmax. Below 1, the gaps grow and the leader takes over. Above 1, the gaps shrink and the chances flatten. The model's scores never change; only how sharply we read them.",
        precision: "p ∝ e^(logit ÷ T). As T → 0 this becomes greedy (always the top token); T = 1 is the model's own distribution; very large T approaches “every token equally likely”.",
        visual: async (el, api) => { const lm = await api.lm(); const lg = lm.next(SPINE).logits; el.append(h("div", { class: "two" }, [0.2, 0.5, 1, 2].map((T) => h("div", null, h("div", { class: "eyebrow" }, "temperature " + T), shapedBars(lm, lg, { temperature: T }, 4))))); } },
      { title: "Cutting the tail: top-k, top-p, min-p", truth: "TOY",
        text: "Even a good distribution has a long tail of bad tokens, each tiny but together not zero. Samplers cut it off. [[top-k|Top-k]] keeps the k best tokens. [[top-p|Top-p]] keeps the smallest set whose chances add up to p. [[min-p|Min-p]] keeps tokens with at least a fraction of the top token's chance. After cutting, the rest are scaled back up to 100%.",
        precision: "Min-p adapts: when the model is confident (one big leader) it cuts more; when it is unsure (many similar chances) it keeps more. Here top-p 0.9 keeps 4 tokens; the real sum of those 4 is 95.4%.",
        visual: async (el, api) => { const lm = await api.lm(); const lg = lm.next(SPINE).logits; el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "top-k = 2"), shapedBars(lm, lg, { topK: 2 }, 6)), h("div", null, h("div", { class: "eyebrow" }, "top-p = 0.9"), shapedBars(lm, lg, { topP: 0.9 }, 6)))); } },
      { title: "Why greedy text loops", truth: "TOY",
        text: "Always taking the top token sounds safe. Watch what Maya-LM does with greedy decoding: “…The forecast for Athens said it would be sunny on Saturday . The forecast for Athens said it would be sunny on Saturday .” Once a phrase repeats, the context makes repeating it even more likely: a feedback loop.",
        precision: "A [[repetition-penalty|repetition penalty]] lowers the scores of tokens already in the context. With a penalty of 1.3, Maya-LM breaks out of the loop (try it in the Lab).",
        visual: async (el, api) => { const lm = await api.lm(); el.append(h("div", { class: "eyebrow" }, "greedy, 40 tokens from “Maya”"), h("p", { class: "mono", style: "font-size:.9rem" }, "Maya " + fmtGen(lm.generate("Maya", 40, { greedy: true }).text)), h("div", { class: "eyebrow", style: "margin-top:10px" }, "greedy with repetition penalty 1.3"), h("p", { class: "mono", style: "font-size:.9rem" }, "Maya " + fmtGen(lm.generate("Maya", 40, { greedy: true, repPenalty: 1.3 }).text))); } },
      { title: "The likelihood trap", truth: "SKETCH",
        text: "[[beam-search|Beam search]] keeps several candidate sentences and returns the most probable whole sentence. Great for translation, where there is one right answer. For open writing it backfires: the most probable text is usually the dullest and most repetitive. Good writing is often less probable than the safest choice.",
        precision: "The most likely token at each step is not the most likely sentence; beam search over whole sentences fixes that. But for stories, human text is much less probable under the model than beam-search text: likelihood and quality part ways.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:8px" }, [["beam search", "It was a long day. It was a long day. It was a long day.", "high probability, dull"], ["sampling, T 0.8", "It rained all morning, so we hid in the Orsay museum with hot chocolate.", "lower probability, alive"]].map(([a, t, n]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, a + " · " + n), h("p", { style: "margin-top:4px" }, t))))) },
      { title: "Forcing a format", truth: "SKETCH",
        text: "Sometimes the output must follow strict rules, such as valid JSON for a tool call (M13). [[constrained-decoding|Constrained decoding]] blocks every token that would break the format before sampling: those tokens get a chance of zero. The model still scores; the sampler simply refuses illegal choices.",
        visual: (el) => el.append(h("div", { class: "mono", style: "font-size:.92rem" }, '{"city": "Paris", "day": '), MM.bars([{ label: '"Saturday"', p: 0.62 }, { label: '"Sat"', p: 0.2 }, { label: "Saturday", p: 0.1, cut: true }, { label: "}", p: 0.05, cut: true }], { scale: 0.7, total: false, fmt: (it) => (it.cut ? "blocked" : MM.pct(it.p, 0)) })) },
      { kind: "snap", title: "Back to Maya: why answers differ", truth: "TOY", reveal: true,
        text: "So Maya's two different answers had a simple cause: the sampler drew differently from the same chances ({law:l11}). The model did not change its mind and learned nothing ({law:l4}). With temperature 0 it would always pick “rain”, though real servers can still vary slightly, as the Skeptic will explain.",
        visual: async (el, api) => { const lm = await api.lm(); el.append(h("div", { class: "stack", style: "--gap:6px" }, [1, 2, 3, 4].map((seed) => h("p", { class: "mono", style: "font-size:.88rem" }, "…would " + fmtGen(lm.generate(SPINE, 8, { temperature: 1, seed: seed * 13 }).text))))); } }],
    lab: {
      title: "The Temperature Playground", truth: "TOY",
      intro: "Maya-LM's real scores for any of these prompts. Turn the dials and watch the chances reshape. Then let the sampling machine draw 100 tokens, or generate a whole continuation with your settings.",
      tries: ["Set temperature to 0.2. What happens to “be”?", "Set temperature to 3 and generate. Is it still English?", "Set top-p to 0.5 on Maya's sentence. How many tokens survive?", "Generate from “A story start” with temperature 0, then add a repetition penalty of 1.3.", "Draw 100 tokens. Do the counts match the chances?"],
      async mount(el, api) {
        const lm = await api.lm();
        const st = { pi: 0, temperature: 1, topK: 0, topP: 1, minP: 0, rep: 1, seed: 1 };
        const bars = h("div"), info = h("div", { class: "mono", style: "font-size:.88rem;color:var(--ink-2);margin-top:6px" }), draws = h("div"), gen = h("div", { class: "mono", style: "font-size:.92rem;margin-top:8px;line-height:1.6" });
        const set = () => ({ temperature: st.temperature, topK: st.topK || undefined, topP: st.topP < 1 ? st.topP : undefined, minP: st.minP || undefined });
        function logits() { return lm.next(PROMPTS[st.pi][1]).logits; }
        function draw() {
          const lg = logits(), sh = lm.shape(lg, set());
          bars.innerHTML = "";
          bars.append(shapedBars(lm, lg, set(), 10));
          let H = 0; sh.kept.forEach((i) => { const p = sh.probs[i]; if (p > 0) H -= p * Math.log2(p); });
          info.textContent = `${sh.kept.size} of 214 tokens kept · spread (entropy) ${H.toFixed(2)} bits`;
          api.done();
        }
        const drawBtn = h("button", { class: "btn small" }, "Draw 100 tokens");
        drawBtn.onclick = () => { const sh = lm.shape(logits(), set()); const rand = MM.rng(++st.seed * 7919); const counts = {}; for (let i = 0; i < 100; i++) { const w = lm.vocab[lm.sampleFrom(sh.probs, rand)]; counts[w] = (counts[w] || 0) + 1; } draws.innerHTML = ""; draws.append(h("div", { class: "eyebrow", style: "margin:8px 0 4px" }, "100 draws"), MM.bars(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, c]) => ({ label: w, p: c / 100 })), { total: false, fmt: (it) => Math.round(it.p * 100) + " · expected " + Math.round(sh.probs[lm.stoi[it.label]] * 100) })); api.done(); };
        const genBtn = h("button", { class: "btn small primary" }, "Generate 24 tokens");
        genBtn.onclick = () => { const o = st.temperature < 0.05 ? { greedy: true, repPenalty: st.rep } : Object.assign(set(), { seed: ++st.seed * 31, repPenalty: st.rep }); gen.textContent = PROMPTS[st.pi][1] + " " + fmtGen(lm.generate(PROMPTS[st.pi][1], 24, o).text); api.done(); };
        const promptSel = h("select", { id: "temp-prompt", "aria-label": "Prompt" }, PROMPTS.map(([n], i) => h("option", { value: String(i) }, n)));
        promptSel.onchange = () => { st.pi = +promptSel.value; gen.textContent = ""; draws.innerHTML = ""; draw(); };
        const sl = (key, label, min, max, step, fmt) => MM.slider({ label, min, max, step, value: st[key], fmt, onInput: (v) => { st[key] = v; draw(); } });
        el.append(h("div", { class: "two" },
          h("div", { class: "stack" }, h("label", { class: "field", for: "temp-prompt" }, "Prompt", promptSel),
            sl("temperature", "temperature", 0, 5, 0.05, (v) => (v < 0.05 ? "0 (greedy)" : v.toFixed(2))), sl("topK", "top-k", 0, 20, 1, (v) => (v ? String(v) : "off")), sl("topP", "top-p", 0.05, 1, 0.05, (v) => (v >= 1 ? "off" : v.toFixed(2))), sl("minP", "min-p", 0, 0.5, 0.01, (v) => (v ? v.toFixed(2) : "off")),
            MM.slider({ label: "repetition penalty", min: 1, max: 2, step: 0.05, value: 1, fmt: (v) => (v === 1 ? "off" : v.toFixed(2)), onInput: (v) => { st.rep = v; } })),
          h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "chances after shaping (struck out = cut)"), bars, info, h("div", { class: "row", style: "margin-top:10px" }, drawBtn, genBtn), draws)), gen);
        draw();
      } },
    breakit: {
      title: "Too cold, too hot, too narrow", truth: "TOY",
      intro: "Every sampling setting fails in its own way. These are Maya-LM's real outputs.",
      cases: [
        { name: "Temperature near 0 on a story", what: "Greedy decoding from “Maya”, 40 tokens.", action: "Run it", result: "“…The forecast for Athens said it would be sunny on Saturday . The forecast for Athens said it would be sunny on Saturday .” The same sentence, forever.", why: "Once a phrase repeats, the context makes it even more likely to repeat: a feedback loop that greedy decoding cannot escape." },
        { name: "Very high temperature", what: "Temperature 5 from “Maya”.", action: "Run it", result: "“The What his sunglasses We week Vienna If Louvre wrote rain on Acropolis evening Germany Italy apple…”", why: "Dividing every logit by 5 shrinks the gaps until almost every token is nearly equally likely: grammar disappears." },
        { name: "A tiny top-p", what: "Top-p 0.1 from “Maya”.", action: "Run it", result: "Exactly the greedy text: “packed her raincoat because the forecast for Berlin said it would rain . The forecast for Athens said it would be sunny on…”, heading into the same loop.", why: "When the top token alone holds more than 10%, top-p 0.1 keeps only that token: it becomes greedy decoding, with all its blandness." }],
      explain: { q: "A chatbot answers the same question differently each time. A user says the model must be learning. What is the real reason?", options: ["The weights are updated after every answer", "The sampler draws randomly from the same probabilities", "The tokeniser changes", "The model forgets its training"], answer: 1, why: "Law 11: the model only gives chances; a separate sampler picks, with randomness unless temperature is 0." } },
    clinic: [
      { belief: "Temperature changes what the model knows.", test: "In the Lab, change the temperature and read the logits: they are identical at every setting. Only the shaped chances change.", truth: "Temperature only changes how the sampler reads the same scores. Knowledge lives in the weights, which do not move." },
      { belief: "The most probable answer is the true one.", test: "Ask Maya-LM for the check-in time at Maya's hotel. “3 pm” is its most probable answer, but Maya's hotel never appears in its training text: it is invented.", truth: "Probability measures what usually comes next in text, not truth ({law:l10}). M12 deals with this." },
      { belief: "The model picks the word.", test: "Look at the pipeline: the network ends at 214 scores. Picking is a few lines of code after it, which you can change without touching the model.", truth: "The model only outputs scores; the sampler picks ({law:l11})." }],
    explain: { prompt: "How does one final vector become one chosen word? Include what temperature does.", points: ["The final vector is compared with every token's output vector: one score (logit) each", "Softmax turns scores into chances that add up to 1; only score differences matter", "A separate sampler picks: greedy takes the top, sampling draws at random by the chances", "Temperature divides the scores: low sharpens, high flattens", "Top-k, top-p and min-p cut off the tail"] },
    skeptic: [
      { q: "Why do I get different answers to the same question?", laws: ["l11", "l4"], a: "Because the model only produces chances, and the sampler draws from them at random ({law:l11}). Same model, same weights ({law:l4}), different draws. With temperature 0 (greedy), the draw is always the top token.", ladder: ["Why not always use temperature 0? Greedy text loops and is bland (the likelihood trap).", "Then why do products often use temperature around 0.7–1? It keeps variety while staying mostly on the likely path.", "So what decides quality? Mostly the model's scores; the sampler can only choose among what the model offers."] },
      { q: "If temperature 0 means greedy, why do I still sometimes get different answers?", laws: ["l11"], a: "Greedy is fixed in principle, but real servers run many users' requests together on GPUs. The order of additions changes with the batch, and floating-point addition is not perfectly associative, so tiny differences can flip a near-tie between two tokens. One flipped token changes everything after it. That is the expert version of {law:l11}." },
      { q: "The model says it is 90% sure. So it is right 90% of the time?", laws: ["l10"], a: "Only if it is well calibrated. Base models trained only on next-token prediction are fairly well calibrated; preference tuning often makes them overconfident, as the GPT-4 technical report showed. And the chance of a token is not the chance that a whole answer is true ({law:l10})." }],
    recall: [
      { q: "What is a logit?", options: ["A chosen token", "A raw score for one token, before softmax", "A probability", "A weight"], answer: 1, level: 1, why: "Softmax turns logits into chances; only their differences matter." },
      { q: "“rain” has a logit 2.3 higher than “snow”. Roughly how many times more likely is rain?", options: ["2.3 times", "About 10 times", "About 100 times", "The same"], answer: 1, level: 3, why: "e^2.3 ≈ 10: gaps are log-ratios." },
      { q: "Temperature is raised from 1 to 3. What happens to the chances?", options: ["They sharpen towards the top token", "They flatten: unlikely tokens get much more chance", "They stay the same", "Only the top token changes"], answer: 1, level: 3, why: "Dividing by 3 shrinks the gaps." },
      { q: "True or false: the network itself chooses the next token.", options: ["True", "False: the network outputs scores; a separate sampler chooses"], answer: 1, level: 4, why: "Law 11." },
      { q: "From M7: which part of a block moves information between tokens?", options: ["The MLP", "Attention", "Normalisation", "The unembedding"], answer: 1, level: 5, why: "Law 6. The unembedding then scores every token from the final vector." }],
    depth: [
      ["Only differences matter", "Adding the same number to every score changes nothing after softmax. Real code subtracts the largest score first, so e^x never overflows."],
      ["Score gaps are ratios", "If A's score is 1 higher than B's, A is e ≈ 2.72 times more likely; a gap of 2.3 means about 10 times. Score A − score B = ln(p_A ÷ p_B)."],
      ["Temperature, exactly", "p is proportional to e^(score ÷ T). As T → 0 it becomes “always the top token”; T = 1 is the model's own distribution; a very large T approaches “every token equally likely”."],
      ["Cutting the tail", "Top-k keeps the k best tokens. Top-p keeps the smallest set whose chances add up to p. Min-p keeps tokens with at least a set fraction of the top token's chance, so it cuts more when the model is confident and less when unsure."],
      ["Why greedy text loops", "Once a phrase repeats, the context makes repeating it more likely: a feedback loop. Repetition penalties lower the scores of tokens already used."],
      ["The likelihood trap", "Beam search finds high-probability text, and for open-ended writing the highest-probability text is often dull and repetitive. Good writing is usually less probable than the safest choice."],
      ["Calibration", "A calibrated model's “70% sure” answers are right about 70% of the time. Pretrained models are fairly well calibrated; preference tuning often makes them overconfident (GPT-4 technical report)."],
      ["Forcing a format", "Constrained decoding blocks every token that would break a required format, such as valid JSON, before sampling. That is how strict tool-call formats can be guaranteed."],
      ["Speculative decoding", "A small model drafts a few tokens; the big model checks them all in one pass; an accept-or-resample rule keeps the output distribution exactly the same as the big model's alone."]],
    connect: { links: ["The chosen token is appended and the whole machine runs again: {mod:m09}.", "Agent paths vary from run to run for the same reason, so Phase 2 tests over many runs: {mod:a10}.", "Constrained decoding is how tool calls stay valid: {mod:m13}."], line: "One token is chosen. Next: how the loop of guess, pick, append turns into a whole conversation, and what the model can and cannot remember." }
  });

  /* faded worked example: softmax of three scores */
  function softmaxByHand(el) {
    const z = [2, 1, 0], names = ["rain", "be", "snow"];
    const e = z.map(Math.exp), S = e.reduce((a, b) => a + b, 0);
    const box = h("div", { class: "stack", style: "--gap:12px" });
    box.append(h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "1 · fully worked · scores 2, 1, 0"), h("p", { class: "mono", style: "font-size:.88rem;margin-top:4px;white-space:pre-wrap" }, `e^2 = 7.39, e^1 = 2.72, e^0 = 1.00\ntotal = 11.11\nrain = 7.39 ÷ 11.11 = 0.665\nbe   = 2.72 ÷ 11.11 = 0.245\nsnow = 1.00 ÷ 11.11 = 0.090`)));
    const half = h("input", { type: "number", step: "0.01", id: "smx-half", style: "width:7rem;display:inline-block", "aria-label": "Chance of be" });
    const halfOut = h("span", { class: "mono", style: "margin-left:8px" });
    half.addEventListener("input", () => { const v = +half.value; halfOut.textContent = Math.abs(v - 0.245) < 0.006 ? "✓ right: 2.72 ÷ 11.11" : half.value ? "not yet: divide e^1 by the total" : ""; });
    box.append(h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "2 · half worked · scores 2, 1, 0"), h("p", { class: "mono", style: "font-size:.88rem;margin:4px 0" }, "e^2 = 7.39, e^1 = 2.72, e^0 = 1.00, total = 11.11"), h("label", { for: "smx-half", class: "mono", style: "font-size:.88rem" }, "be = ? ", half, halfOut)));
    const z3 = [3, 1, 1];
    const own = h("input", { type: "number", step: "0.01", id: "smx-own", style: "width:7rem;display:inline-block", "aria-label": "Chance of rain" });
    const ownOut = h("span", { class: "mono", style: "margin-left:8px" });
    const truth = Math.exp(3) / (Math.exp(3) + 2 * Math.E);
    own.addEventListener("input", () => { const v = +own.value; ownOut.textContent = Math.abs(v - truth) < 0.01 ? `✓ right: e^3 = 20.09; total = 20.09 + 2.72 + 2.72 = 25.52; 20.09 ÷ 25.52 = ${truth.toFixed(3)}` : own.value ? "not yet: e^3 ≈ 20.09, e^1 ≈ 2.72" : ""; });
    box.append(h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "3 · your turn · scores 3, 1, 1"), h("label", { for: "smx-own", class: "mono", style: "font-size:.88rem" }, "rain = ? ", own, ownOut)));
    el.append(box);
  }
})();
