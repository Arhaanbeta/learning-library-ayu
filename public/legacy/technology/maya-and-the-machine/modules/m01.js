/* M1 · The Guessing Game — what a language model is. */
(function () {
  const MM = window.MM, h = MM.h, k = MM.k;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";
  const DIARY = `Today we arrived in Paris . It was cold and grey . Tom said it would be sunny tomorrow , but the forecast said it would rain .
I packed my umbrella and my scarf . In the morning it would be cold , so I took my coat .
We walked to the river . It began to rain , so we went to the Louvre . The museum was warm .
Tom said it would be fun to see the Orsay museum . I think it would be busy on Sunday .
In the evening it would rain again . We had soup in a small cafe . It was a long day .
Tomorrow it would be sunny , Tom said . I said it would rain . I was right . It would rain all week .`;

  function spineChain(lm) {
    const e = lm.encode(SPINE + " rain");
    const r = lm.run(e.ids);
    const rows = [];
    for (let t = 1; t < e.ids.length; t++) {
      const p = lm.softmax(r.logits[t - 1])[e.ids[t]];
      rows.push({ word: lm.vocab[e.ids[t]], p });
    }
    return rows;
  }

  MM.defineModule({
    id: "m01",
    mystery: { title: "Two guessers, one game", text: "Maya types “…the forecast said it would” on her phone. Her keyboard suggests **be**. A chatbot, given the same words plus the start of her sentence, suggests **rain**.\n\nBoth are doing exactly the same job: guessing the next word. One is a tiny counting program. The other was trained on trillions of words. What *is* that job, precisely, and why can one guesser be so much better than another?" },
    where: { text: "We start at the very end of the machine: the scoreboard of chances for the next token, and the loop that turns one guess into a whole reply." },
    predict: { q: "A counting model has read Maya's diary. It can see only the last two words: “it would”. The word “umbrella” is eight words further back. What does it guess next?",
      options: ["“rain”, because Maya packed an umbrella", "“be”, because “it would be” is the most common pattern it has counted", "It refuses: it needs more words", "“umbrella”, because it was mentioned"], answer: 1,
      why: "A counting model only knows what followed these exact words in its text. In Maya's diary, “it would” is followed by “be” 5 times and by “rain” 4 times, so “be” wins, narrowly. It never sees “umbrella”." },
    story: [
      { title: "The one game", truth: "TOY",
        text: "A [[language-model|language model]] (a program that guesses what text comes next) plays one game. It reads the text so far and gives a chance to **every** possible next [[token]] (small piece of text). Not one answer: a chance for each of them. Here is Maya-LM's real list for Maya's sentence.",
        intuition: "Like a weather forecaster who never says “it will rain”, only “70% rain, 20% cloud, 10% sun”.", breaks: "A forecaster predicts the world. A language model predicts text: what usually comes next in writing, true or not.",
        precision: "At each position the model outputs a [[conditional-probability|conditional probability]] distribution P(next token | all earlier tokens) over its whole [[vocabulary]]: 214 tokens for Maya-LM, about 100,000 for GPT-4.",
        visual: async (el, api) => { const lm = await api.lm(); const n = lm.next(SPINE); const top = lm.top(n.probs, 6); el.append(MM.toks(["…", " said", " it", " would"]), h("div", { style: "height:10px" }), MM.bars(top.map((x) => ({ label: x.word, p: x.p })), { rest: 1 - top.reduce((a, b) => a + b.p, 0) })); } },
      { title: "Chances that add up to 100%", truth: "TOY",
        text: "This list is a [[probability-distribution|probability distribution]] (chances for every outcome, never negative, adding up to 100%). Maya-LM has 214 tokens, so it gives 214 chances. Most are tiny, but none is exactly zero. That small detail matters later: it is why a model can always say something, even something wrong.",
        precision: "A distribution over V outcomes is V numbers pᵢ ≥ 0 with Σpᵢ = 1. The model computes all of them in one pass; nothing is looked up.",
        visual: async (el, api) => { const lm = await api.lm(); const p = Array.from(lm.next(SPINE).probs).sort((a, b) => b - a); const W = 520, H = 160; const svg = api.s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "All 214 chances, sorted" }); p.forEach((v, i) => svg.append(api.s("rect", { x: 10 + i * (W - 20) / p.length, y: H - 20 - Math.sqrt(v) * (H - 30), width: Math.max(1, (W - 20) / p.length - 0.6), height: Math.sqrt(v) * (H - 30), fill: i === 0 ? "var(--line1)" : "var(--seine)" }))); svg.append(api.s("text", { x: 14, y: 14, "font-size": 12, fill: "var(--ink-2)", text: "all 214 chances, biggest first (height = square root, so tiny ones show)" })); el.append(svg, h("p", { class: "mono", style: "font-size:.9rem" }, `sum of all 214 chances = ${p.reduce((a, b) => a + b, 0).toFixed(6)}   ·   smallest = ${p[p.length - 1].toExponential(1)}`)); } },
      { title: "Guess, pick, append, repeat", truth: "TOY",
        text: "To write a whole reply, the model guesses, a simple rule picks one token, the token is added to the text, and the model runs again on the longer text. This is [[autoregression]] (each new output becomes part of the next input). Every chatbot reply, story and program is made this way, one token at a time.",
        precision: "Generation is a loop: xₜ₊₁ ~ P(· | x₁…xₜ). Picking the top token every time is [[greedy|greedy decoding]]; drawing at random by the chances is [[sampling]]. M8 covers the rules for picking.",
        visual: async (el, api) => { const lm = await api.lm(); const g = lm.generate(SPINE, 7, { seed: 3 }); const line = MM.toks(["…", " it", " would"]); el.append(line); g.steps.forEach((st, i) => setTimeout(() => line.isConnected && line.append(MM.tok(st.word === "<s>" ? "⟨start⟩" : st.word, { sub: Math.round(st.p * 100) + "%", cls: "fade-in" })), MM.reducedMotion() ? 0 : 500 * (i + 1))); el.append(h("p", { class: "faint", style: "margin-top:8px;font-size:.88rem" }, "Each new token = one full run of the model. The percentage is the chance it had when it was picked.")); } },
      { kind: "spotlight", title: "Shannon's guessing game, 1951", truth: "SKETCH",
        text: "In 1951 Claude Shannon (the founder of information theory) asked people to guess a hidden sentence one letter at a time. They were often right on the first guess. His conclusion: English is very predictable, about one bit of real information per letter. That predictability is exactly what a language model learns.",
        precision: "Shannon estimated the entropy of English at roughly 0.6 to 1.3 bits per character, against log₂(27) ≈ 4.75 bits if every letter and space were equally likely. Try his game in the Lab.",
        visual: (el) => { const word = "IT WOULD RAIN"; const guesses = [3, 1, 1, 4, 1, 1, 1, 1, 1, 2, 1, 1, 1]; el.append(h("div", { class: "toks" }, word.split("").map((c, i) => MM.tok(c === " " ? "␣" : c, { sub: guesses[i] + "×" }))), h("p", { class: "faint", style: "margin-top:8px;font-size:.88rem" }, "Small number = how many guesses a person needed for that letter. After “IT WOU”, the rest is almost free.")); } },
      { title: "The counting model", truth: "TOY", reveal: true,
        text: "Before neural networks, language models simply counted. An [[n-gram|n-gram model]] (counting model) looks at the last few words and counts what came next in its text. Built from Maya's diary with a two-word window, it sees “it would” and counts what followed.",
        precision: "Counting model, exactly: P(word | context) = count(context + word) ÷ count(context). Built from the 6 lines of Maya's diary.",
        visual: (el) => { const m = k.ngram(DIARY, 3); const nx = k.ngramNext(m, ["it", "would"]); el.append(h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "After “it would” in Maya's diary (" + nx.total + " times)"), MM.bars(nx.items.map((x) => ({ label: x.word, p: x.p })), { fmt: (it) => nx.items.find((x) => x.word === it.label).count + " of " + nx.total })); } },
      { kind: "snap", title: "Back to Maya: the blind spot", truth: "TOY",
        text: "The counting model guesses “be” because it sees only “it would”. It is blind to “umbrella”, eight words back. Maya-LM reads the whole sentence and puts “rain” first. Same game, very different guesser. The rest of this line explains how a model learns to use **all** the earlier words.",
        visual: async (el, api) => { const lm = await api.lm(); const m = k.ngram(DIARY, 3); const nx = k.ngramNext(m, ["it", "would"]); const top = lm.top(lm.next(SPINE).probs, 4); el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "Counting model · sees 2 words"), MM.bars(nx.items.slice(0, 4).map((x) => ({ label: x.word, p: x.p })), { total: false })), h("div", null, h("div", { class: "eyebrow" }, "Maya-LM · sees all 13"), MM.bars(top.map((x) => ({ label: x.word, p: x.p })), { total: false })))); } },
      { title: "A sentence's chance is a chain", truth: "TOY",
        text: "The chance of a whole sentence is the chance of each token given the ones before it, all multiplied together. This is the [[chain-rule|chain rule]] of probability. So scoring a sentence and guessing the next token are the same skill. Here are Maya-LM's real chances, token by token.",
        precision: "P(x₁…xₙ) = Πₜ P(xₜ | x₁…xₜ₋₁). Multiplying many small numbers gives a number too small to store, so we add their logarithms instead: log P(text) = Σₜ log P(xₜ | earlier). {tool:t3}",
        visual: async (el, api) => { const lm = await api.lm(); const rows = spineChain(lm); const prod = rows.reduce((a, b) => a * b.p, 1); el.append(h("div", { class: "toks" }, rows.map((r) => MM.tok(r.word, { sub: r.p < 0.01 ? r.p.toExponential(0) : r.p.toFixed(2) }))), h("p", { class: "mono", style: "margin-top:10px;font-size:.9rem" }, `product of all 14 chances = ${prod.toExponential(2)}`), h("p", { class: "faint", style: "font-size:.86rem" }, "“Maya” is unlikely as a first word (8 names to choose from); “her” is almost certain after “Maya packed”.")); } },
      { title: "Surprise, in bits", truth: "TOY",
        text: "Each chance can be turned into [[surprise]]: how unexpected the token was. A chance of ½ is 1 [[bits|bit]] of surprise; ⅛ is 3 bits. The average surprise over a text is the [[cross-entropy]], the number that training makes smaller. Lower surprise means better guessing.",
        precision: "Surprise = −log₂ p. Cross-entropy H = average of −log₂ P(xₜ | earlier). [[perplexity|Perplexity]] = 2^H: roughly how many equal choices the model is torn between. {tool:t5}",
        visual: async (el, api) => { const lm = await api.lm(); const rows = spineChain(lm); const bits = rows.map((r) => -Math.log2(r.p)); const avg = bits.reduce((a, b) => a + b, 0) / bits.length; el.append(MM.bars(rows.map((r, i) => ({ label: r.word, p: bits[i] / 8 })), { scale: 1, plain: true, total: false, fmt: (it) => (it.p * 8).toFixed(2) + " bits" }), h("p", { class: "mono", style: "font-size:.9rem;margin-top:6px" }, `average = ${avg.toFixed(2)} bits per token · perplexity = 2^${avg.toFixed(2)} = ${Math.pow(2, avg).toFixed(1)}`)); } },
      { title: "Guessing well is compressing", truth: "TOY",
        text: "Here is a surprising link. A model that guesses well can also store text in fewer bits. If every one of Maya-LM's 214 tokens were equally likely, each would cost 7.74 bits. With good guesses, Maya's sentence costs far less. Prediction and compression are the same skill.",
        precision: "Arithmetic coding turns a model's probabilities into a code of about −log₂ p bits per token. A 2023 study found LLMs used this way beat standard compressors on text, images and audio.",
        frontier: "Some researchers argue that compression is close to understanding: to compress the world's text, you must model what produced it. Others reply that good compression can come from shallow statistics. M10 returns to this debate.",
        visual: async (el, api) => { const lm = await api.lm(); const rows = spineChain(lm); const bits = rows.reduce((a, b) => a - Math.log2(b.p), 0); const uni = rows.length * Math.log2(214); el.append(MM.bars([{ label: "no model", p: 1 }, { label: "Maya-LM", p: bits / uni }], { scale: 1, plain: true, total: false, fmt: (it) => (it.p * uni).toFixed(1) + " bits" }), h("p", { class: "faint", style: "font-size:.88rem;margin-top:6px" }, "Bits needed to store “Maya packed her umbrella … would rain”, with and without the model's guesses.")); } },
      { kind: "recap", title: "What you now know",
        text: "Every LLM does one thing: a chance for every next token ({law:l1}). A sentence's chance is the chain of those chances. Writing is guess, pick, append, repeat. The counting model plays the same game badly, because it sees only a few words and cannot use anything it never counted. Next: a machine that learns.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:8px" }, ["Read the text so far", "Give a chance to every next token", "Pick one", "Append it, and repeat"].map((t, i) => h("div", { class: "row" }, h("span", { class: "roundel l1", style: "width:26px;height:26px;font-size:.85rem" }, i + 1), h("span", null, t))))) }],
    lab: {
      title: "The Counting Machine", truth: "TOY",
      intro: "Build a real counting model from a text, choose how many words it can see, and generate with it. It is fluent for a few words and silly after ten. Then play Shannon's guessing game yourself.",
      tries: ["With 2 words of memory, generate from Maya's diary. Where does the text stop making sense?", "Type the context “it would”. What does the table predict?", "Set memory to 0 words. What kind of text comes out?", "Paste a paragraph of your own and generate from it."],
      mount(el, api) {
        let text = DIARY, n = 3, seed = 1;
        const src = h("textarea", { id: "ngram-src", style: "min-height:90px;font-size:.92rem", "aria-label": "Training text" });
        src.value = DIARY;
        const ctxIn = h("input", { type: "text", id: "ngram-ctx", value: "it would", "aria-label": "Context words" });
        const table = h("div"), gen = h("div", { class: "toks", style: "margin-top:8px" }), stats = h("div", { class: "mono", style: "font-size:.88rem;color:var(--ink-2);margin-top:6px" });
        function model() { return k.ngram(text, n); }
        function draw() {
          const m = model();
          const ctx = k.words(ctxIn.value.toLowerCase() === ctxIn.value ? ctxIn.value : ctxIn.value);
          const nx = n === 1 ? k.ngramNext(m, []) : k.ngramNext(m, ctx);
          table.innerHTML = "";
          table.append(h("div", { class: "eyebrow", style: "margin:8px 0 6px" }, n === 1 ? "No context: just how common each word is" : `After “${nx.ctx}” (${nx.total} times in the text)`));
          if (!nx.items.length) table.append(h("div", { class: "callout bad" }, `“${nx.ctx}” never appears in the text, so every next word gets a chance of zero. This is the sparsity problem.`));
          else table.append(MM.bars(nx.items.slice(0, 7).map((x) => ({ label: x.word, p: x.p })), { fmt: (it) => nx.items.find((x) => x.word === it.label).count + "×", rest: nx.items.slice(7).reduce((a, b) => a + b.p, 0) }));
          const contexts = m.table.size, words = new Set(m.words).size;
          stats.textContent = `distinct words ${words} · contexts seen ${contexts} · contexts possible ${n === 1 ? 1 : k.big(Math.pow(words, n - 1))}`;
          api.done();
        }
        function generate() {
          const m = model();
          const rand = MM.rng(seed++ * 104729);
          const start = n === 1 ? [] : k.words(ctxIn.value);
          const out = k.ngramGenerate(m, start, 12, rand);
          gen.innerHTML = "";
          out.forEach((w, i) => gen.append(MM.tok(w === "∅" ? "∅ unseen context" : w, { cls: i < start.length ? "blank" : "" })));
          api.done();
        }
        src.addEventListener("input", MM.debounce(() => { text = src.value || DIARY; draw(); }, 300));
        ctxIn.addEventListener("input", draw);
        el.append(h("div", { class: "two" },
          h("div", { class: "stack" }, h("label", { class: "field", for: "ngram-src" }, "Training text (edit or paste your own)", src),
            h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Words it can see"), MM.seg([1, 2, 3, 4].map((v) => ({ label: String(v - 1), value: v })), n, (v) => { n = v; draw(); }, "Window"))),
          h("div", { class: "stack" }, h("label", { class: "field", for: "ngram-ctx" }, "Context (the words it sees)", ctxIn), table, stats)),
          h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn primary small", onclick: generate }, "Generate 12 words after the context"), h("span", { class: "faint", style: "font-size:.88rem" }, "Each tap uses a new random seed.")), gen);
        draw();
        el.append(h("hr", { class: "rule" }), shannon(api));
      } },
    breakit: {
      title: "Break the counting model", truth: "TOY",
      intro: "A counting model has one knob: how many words it sees. Turn it both ways.",
      cases: [
        { name: "Shrink the window to one word", what: "Each word is chosen only from the word just before it.", action: "Shrink it", result: "Text like “it would rain . it was a long day . it would be cold and grey .” Locally fine, globally aimless: no memory of topic, subject or sentence.", why: "One word of context cannot carry who, what or why. Every choice is local." },
        { name: "Grow the window to four words", what: "Each word is chosen from the three before it.", action: "Grow it", result: "In Maya's diary, 112 of the 122 three-word contexts appear exactly once, so the model copies the diary word for word. Give it any new three words and it has nothing: every next word gets zero chance.", why: "The **sparsity problem** (most word combinations never appear in any text). With a vocabulary of 50,000 words there are 50,000³ ≈ 1.25 × 10¹⁴ possible three-word contexts. No amount of text covers them." }],
      explain: { q: "Why can't a counting model simply use a bigger window to see “umbrella”?", options: ["Computers are too slow to count longer windows", "With a bigger window, almost every context is unseen, so it has no counts to use", "The tokeniser cannot handle long windows", "It would see “umbrella” but ignore it"], answer: 1, why: "The number of possible contexts grows as V^(n−1). Most are never seen, however much text you collect. Counting cannot generalise from “umbrella … would” to “raincoat … would”; a learning machine can." } },
    clinic: [
      { belief: "A language model looks up stored answers.", test: "Ask Maya-LM to continue any sentence and look at what comes back: not one stored answer, but 214 chances that add up to 100%, computed fresh from 214,208 learned numbers. Change one word and every chance changes.", truth: "It computes a probability for every next token, fresh each time. Nothing is looked up. Knowledge is spread through the learned numbers (M7, M10)." },
      { belief: "It plans the whole reply first, then types it out.", test: "Sample Maya-LM's continuation twice with different random seeds. After the first token that differs, everything after it is different too, because each token is chosen from the text so far.", truth: "Output is produced one token at a time, each depending on the ones before. (Frontier: interpretability research has found models internally representing a future rhyme word before writing the line, so some looking ahead happens inside. But the output still comes one token at a time.)" },
      { belief: "A bigger window would fix the counting model.", test: "In the Break-it lab, grow the window to four words: almost every context has been seen once or never.", truth: "Counting cannot generalise. You need a model that learns that “umbrella” and “raincoat” mean similar things (M2, M4) and can look far back (M6)." }],
    explain: { prompt: "In two or three sentences: what exactly does a language model do, and how does it write a whole paragraph?", points: ["It gives a chance to **every** possible next token, not one answer", "The chances add up to 100% (a probability distribution)", "It picks one token, adds it to the text, and runs again (autoregression)", "A sentence's chance is the product of its next-token chances (chain rule)"] },
    skeptic: [
      { q: "If it only predicts the next word, how can it write a working computer program?", laws: ["l1"], a: "Every program it writes is the one step of {law:l1}, repeated. The key is what “predicting well” demands. To give high chances to the next token of real code, across billions of examples, the model must capture what makes code work: syntax, what each variable holds, what each function does. Predicting very well forces it to learn the patterns that produced the text.",
        ladder: ["Why does predicting force learning? Because the cheapest way to lower surprise across trillions of tokens is to capture real patterns, not surface habits.", "Why not just memorise? The model has far fewer numbers than its training text has tokens, so it must compress (M10).", "So is it reasoning? It learns patterns of reasoning that appear in text; writing out steps gives it more computation (M9). How far this goes is debated (M10 Frontier)."] },
      { q: "My phone keyboard is a language model too. So a chatbot is just a big keyboard?", laws: ["l1"], a: "Same game ({law:l1}), very different player. The keyboard counts what followed the last word or two. An LLM reads its whole context window, represents meaning as learned vectors (M4), lets every word look back at every earlier word (M6), and has billions of learned numbers. Same task; vastly more capacity to use context." },
      { q: "If the model always picks the most likely next word, it writes the most likely sentence. Right?", laws: ["l1", "l11"], a: "No. Picking the top token at each step (greedy) can miss the most probable *whole* sentence: an unlikely word now can lead to much likelier words later. Searching over whole sentences (beam search) can find a different answer. And for open writing, the most probable text is often dull and repetitive (M8)." }],
    recall: [
      { q: "What does a language model output at each step?", options: ["The single correct next word", "A chance for every token in its vocabulary", "A list of stored sentences", "The meaning of the sentence"], answer: 1, level: 1, why: "A probability distribution over the whole vocabulary, adding up to 100%." },
      { q: "A counting model with a two-word window reads “…umbrella because the forecast for Paris said it would”. What decides its guess?", options: ["The word “umbrella”", "Only what followed “it would” in its text", "The meaning of the whole sentence", "The forecast for Paris"], answer: 1, level: 3, why: "It only sees “it would”, so it predicts whatever most often followed those two words in its text." },
      { q: "Why can't a counting model just use a 10-word window?", options: ["It would be too slow", "Almost every 10-word context is unseen, so it has no counts", "The vocabulary is too small", "Long windows break the chain rule"], answer: 1, level: 2, why: "Sparsity: V^9 possible contexts. Counting cannot generalise to unseen ones." },
      { q: "True or false, with a reason: P(“it would rain”) = P(it) + P(would | it) + P(rain | it would).", options: ["True: chances of steps add up", "False: they multiply (or their logs add)", "True, but only for short sentences", "False: you only need the last chance"], answer: 1, level: 4, why: "The chain rule multiplies step-by-step chances. Logs turn that product into a sum." },
      { q: "From the Grand Tour: what happens right after the sampler picks “rain”?", options: ["The model stops", "“rain” is added to the text and the whole model runs again", "The weights are updated", "The model checks a dictionary"], answer: 1, level: 1, why: "Guess, pick, append, repeat: autoregression." }],
    depth: [
      ["A sentence's probability is a chain", "P(whole text) = P(token 1) × P(token 2 | token 1) × … So scoring a sentence and predicting the next token are the same skill."],
      ["Logs turn products into sums", "Multiplying thousands of small chances gives a number too small for a computer to hold; adding their logs does not. A text's log-probability is the sum of its tokens' log-probabilities."],
      ["Surprise is measured in bits", "Surprise = −log₂(p): chance ½ is 1 bit, ⅛ is 3 bits. Cross-entropy is the average surprise per token. Perplexity = 2^(cross-entropy): the number of equal choices the model is torn between."],
      ["Prediction is compression", "A model that gives the true next token a high chance can store text in fewer bits (arithmetic coding). Shannon estimated English carries about one bit per letter, because so much is predictable."],
      ["The counting model, exactly", "P(word | context) = count(context + word) ÷ count(context). Unseen pairs get zero, so classic systems “smoothed” counts and backed off to shorter contexts; Kneser–Ney smoothing was the best of these."],
      ["Why the window can't just grow", "With V words, an n-gram model has V^(n−1) possible contexts. Most are never seen, however much text you collect."],
      ["Generative vs discriminative", "A discriminative model learns P(label | input), like “spam or not”. A generative model learns P(data) and can sample new data. An LLM is generative."],
      ["The most likely token is not the most likely text", "Picking the top token each step (greedy) does not always give the most probable whole sentence; beam search over whole sentences can find a different one."]],
    connect: { links: ["The chain rule comes back in {mod:m10} as the training loss: cross-entropy.", "How the sampler picks a token is {law:l11}, in {mod:m08}.", "The counting model's short memory is the problem {mod:m05} and {mod:m06} solve.", "Bits of surprise return in {mod:m11}, where KL divergence keeps an assistant close to its base model."], line: "A counting model cannot generalise: “raincoat” teaches it nothing about “umbrella”. Next, a machine that learns patterns nobody wrote down." }
  });

  /* Shannon's game: guess the next letter */
  function shannon(api) {
    const phrase = "it would rain all week";
    let pos = 0, tries = 0;
    const counts = [];
    const shown = h("div", { class: "toks", style: "margin:8px 0" });
    const msg = h("div", { class: "mono", style: "font-size:.9rem", "aria-live": "polite" });
    const keys = h("div", { class: "row", style: "--gap:4px" });
    const letters = "abcdefghijklmnopqrstuvwxyz ".split("");
    function draw() {
      shown.innerHTML = "";
      phrase.split("").forEach((c, i) => shown.append(MM.tok(i < pos ? (c === " " ? "␣" : c) : "?", { sub: i < pos ? counts[i] + "×" : "" })));
      if (pos >= phrase.length) { const avg = counts.reduce((a, b) => a + b, 0) / counts.length; msg.textContent = `Done. You needed ${avg.toFixed(2)} guesses per letter on average. Random guessing would need about 13.5.`; keys.innerHTML = ""; api.done(); }
    }
    letters.forEach((c) => keys.append(h("button", { class: "btn small", style: "min-width:36px;padding:6px 8px", onclick: () => {
      if (pos >= phrase.length) return;
      tries++;
      if (c === phrase[pos]) { counts.push(tries); tries = 0; pos++; msg.textContent = "Right."; }
      else msg.textContent = `Not “${c === " " ? "space" : c}”. Guess ${tries + 1}…`;
      draw();
    } }, c === " " ? "space" : c)));
    draw();
    return h("div", null, h("div", { class: "row" }, h("h3", null, "Shannon's guessing game"), MM.truth("REAL", "Your own guesses.")), h("p", { class: "muted", style: "margin-top:4px" }, "A short sentence from Maya's diary is hidden. Guess it one letter at a time. Count how often you are right first time."), shown, keys, msg);
  }
})();
