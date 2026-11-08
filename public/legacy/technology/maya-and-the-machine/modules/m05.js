/* M5 · The Memory Problem — the road to attention. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const ERAS = [
    { id: "ngram", name: "Counting model", year: "1948 onwards", how: "counts what followed the last two words" },
    { id: "window", name: "Fixed-window neural model", year: "2003", how: "learned vectors, but sees only the last four tokens" },
    { id: "rnn", name: "RNN", year: "1990", how: "reads one token at a time, carrying a memory vector" },
    { id: "lstm", name: "LSTM", year: "1997", how: "an RNN with gates that decide what to keep" },
    { id: "transformer", name: "Transformer (Maya-LM)", year: "2017", how: "every token looks straight back at every earlier token" }];

  /* the real measurements: P(rain) with umbrella vs sunglasses, at each distance */
  function rowsFor(E, id) {
    if (id === "rnn" || id === "lstm") return E[id + "_long"];
    return E[id];
  }
  function at(E, id, dist) {
    if (id === "transformer" && dist > 26) return null;
    const rows = rowsFor(E, id);
    if (id === "ngram" || id === "window") return rows[0];
    let best = rows[0];
    rows.forEach((r) => { if (Math.abs(r.distance - dist) < Math.abs(best.distance - dist)) best = r; });
    return best;
  }
  const memory = (r) => (r ? Math.max(0, r.rain_umbrella - r.rain_sunglasses) : null);

  MM.defineModule({
    id: "m05",
    mystery: { title: "One word, eight words ago", text: "For a modern model, Maya's sentence is easy: “umbrella” is eight words before the blank, and it predicts “rain”. In 1995, this was close to impossible for a machine.\n\nRemembering one word from eight words ago sounds trivial. Why did it take until 2017 to build a machine that does it reliably, at any distance?" },
    where: { text: "Inside the stack of blocks: the part that lets one token use information from far-back tokens. This station is the history of how that part was invented." },
    predict: { q: "A small RNN (a model that reads one word at a time and carries a memory) predicts “rain” after “umbrella” perfectly well when the gap is 20 tokens. Now we push “umbrella” 40 tokens back. What happens?", options: ["It still predicts rain", "Its guess no longer depends on whether Maya packed an umbrella or sunglasses", "It crashes", "It predicts “umbrella”"], answer: 1, why: "In our real test, the RNN held the clue up to 26 tokens back, then lost it completely: at 34 tokens its chance of “rain” was 0.2% with an umbrella and 0.3% with sunglasses. The memory was gone." },
    story: [
      { title: "The long-distance clue", truth: "SKETCH",
        text: "The blank depends on “umbrella”, eight tokens back, and on “forecast” and “Paris” in between. A good guesser needs a way to carry information from any earlier position to the current one. Each era of language modelling tried a different way, fixed one problem, and created a new one.",
        visual: (el) => { const words = ["Maya", "packed", "her", "umbrella", "because", "the", "forecast", "for", "Paris", "said", "it", "would"]; const svg = s("svg", { viewBox: "0 0 600 120", class: "figure", role: "img", "aria-label": "Arrows from would back to umbrella and forecast" }); words.forEach((w, i) => svg.append(s("text", { x: 22 + i * 49, y: 100, "text-anchor": "middle", "font-size": 13, class: "t-mono", fill: ["umbrella", "forecast", "would"].includes(w) ? "var(--ink)" : "var(--ink-3)", text: w }))); [[3, 3], [6, 2]].forEach(([i, wdt]) => svg.append(s("path", { d: `M${22 + 11 * 49} 84 Q ${22 + (i + 11) / 2 * 49} ${10 + i * 4} ${22 + i * 49} 84`, fill: "none", stroke: "var(--seine)", "stroke-width": wdt }))); el.append(svg); } },
      { title: "Era 1 · Counting models", truth: "TOY",
        text: "From M1: a [[n-gram|counting model]] sees only the last two or three words. Whatever Maya packed, it sees “said it would” and gives “rain” the same chance. Real measurement, using counts from Maya-LM's own training text: 20% chance of rain with an umbrella, 20% with sunglasses.",
        visual: async (el, api) => { const E = (await api.data("training")).eras; const r = E.ngram[0]; el.append(MM.bars([{ label: "with umbrella", p: r.rain_umbrella }, { label: "with sunglasses", p: r.rain_sunglasses }], { scale: 1, plain: true, total: false })); } },
      { title: "Era 2 · A fixed window, with learned vectors", truth: "TOY",
        text: "In 2003, Bengio and colleagues replaced counts with a small neural network that read the last few words as learned vectors (M4). It could generalise: “raincoat” helps “umbrella”. But its window was still fixed. Our real version sees four tokens, so it still cannot tell an umbrella from sunglasses.",
        visual: async (el, api) => { const E = (await api.data("training")).eras; const r = E.window[0]; el.append(MM.bars([{ label: "with umbrella", p: r.rain_umbrella }, { label: "with sunglasses", p: r.rain_sunglasses }], { scale: 1, plain: true, total: false })); } },
      { title: "Era 3 · The RNN: a memory that travels", truth: "SKETCH",
        text: "An [[rnn|RNN]] (recurrent neural network, Elman 1990) reads one token at a time and carries a memory vector, the [[hidden-state|hidden state]], from step to step. Each step mixes the new token into the memory. In principle, “umbrella” can be carried all the way to “would”.",
        intuition: "A cup of water: each word adds a drop of its colour, and the water slowly turns over. Old colours fade as new ones arrive.", breaks: "The cup has no way to decide which colour matters. A real RNN can learn to protect some information, but only as far as its training pushed it.",
        precision: "new memory = tanh(W × old memory + U × current token + b). The same W and U are used at every step. tanh squashes every number into −1…1.",
        visual: (el) => { const svg = s("svg", { viewBox: "0 0 600 130", class: "figure", role: "img", "aria-label": "An RNN passing a memory vector along the sentence" }); ["umbrella", "because", "the", "forecast", "…", "would"].forEach((w, i) => { const x = 50 + i * 100; svg.append(s("rect", { x: x - 34, y: 30, width: 68, height: 40, rx: 8, fill: "var(--sheet)", stroke: "var(--llm)" }), s("text", { x, y: 55, "text-anchor": "middle", "font-size": 12, text: "RNN" }), s("text", { x, y: 100, "text-anchor": "middle", "font-size": 12, class: "t-mono", text: w }), s("line", { x1: x, y1: 88, x2: x, y2: 72, stroke: "var(--ink-3)" })); if (i) svg.append(s("line", { x1: x - 66, y1: 50, x2: x - 36, y2: 50, stroke: "var(--seine)", "stroke-width": 3 - i * 0.4 })); }); svg.append(s("text", { x: 300, y: 18, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)", text: "one memory vector, passed along and overwritten a little at every step" })); el.append(svg); } },
      { title: "The memory runs out", truth: "TOY",
        text: "We trained a real RNN on Maya's world and pushed “umbrella” further and further back. Up to 26 tokens, it remembers: 52–60% rain with an umbrella, under 1% with sunglasses. At 34 tokens the memory is simply gone: the item no longer changes its guess at all.",
        precision: "Its training sentences never asked it to hold the clue for more than about 26 tokens, and nothing in an RNN pushes it to keep information longer than training demands. The next beat shows why training rarely demands it.",
        visual: async (el, api) => { const E = (await api.data("training")).eras; const rows = rowsFor(E, "rnn"); el.append(k.chart([{ pts: rows.map((r) => [r.distance, r.rain_umbrella]), color: "var(--data)", label: "umbrella" }, { pts: rows.map((r) => [r.distance, r.rain_sunglasses]), color: "var(--pos)", label: "sunglasses" }], { W: 480, H: 200, ymin: 0, ymax: 0.7, xlabel: "tokens between “umbrella” and “would”", ylabel: "RNN's chance of “rain”", yfmt: (v) => Math.round(v * 100) + "%" })); } },
      { title: "Why: the fading signal", truth: "SKETCH",
        text: "Training sends a learning signal backwards through every step (M2's backpropagation). For an RNN, the signal from 50 steps back is multiplied by roughly the same matrix 50 times. If that shrinks it a little each time, it fades to nothing: a [[vanishing-gradient|vanishing gradient]]. If it grows, it explodes.",
        precision: "0.9⁵⁰ ≈ 0.005; 1.1⁵⁰ ≈ 117. Clipping the gradient stops explosions, not fading. So long-range links barely get trained. {tool:t6}",
        visual: (el) => { const pts1 = [], pts2 = []; for (let n = 0; n <= 50; n += 2) { pts1.push([n, Math.pow(0.9, n)]); pts2.push([n, Math.pow(1.05, n)]); } el.append(k.chart([{ pts: pts1, color: "var(--neg)", label: "× 0.9 each step" }, { pts: pts2, color: "var(--bad)", label: "× 1.05 each step" }], { W: 460, H: 190, ymin: 0, ymax: 12, xlabel: "steps back", ylabel: "size of the learning signal" })); } },
      { title: "Era 4 · LSTM: gates and a protected path", truth: "TOY",
        text: "The [[lstm|LSTM]] (1997) added learned gates: small valves that decide what to keep, what to forget and what to output. Its real trick is a separate cell memory updated by **adding**, so signals flow back without fading as fast. Our real LSTM keeps the clue a little longer (34 tokens), then its guesses turn erratic: by 94 tokens it predicts rain whatever Maya packed.",
        precision: "new cell = forget gate × old cell + input gate × new content. Learning signals flow back through that “+” path. The same idea returns as the Transformer's residual stream in M7.",
        visual: async (el, api) => { const E = (await api.data("training")).eras; const r1 = rowsFor(E, "rnn"), r2 = rowsFor(E, "lstm"); el.append(k.chart([{ pts: r1.map((r) => [r.distance, memory(r)]), color: "var(--neg)", label: "RNN" }, { pts: r2.map((r) => [r.distance, memory(r)]), color: "var(--h3)", label: "LSTM" }], { W: 480, H: 200, ymin: 0, ymax: 0.7, xlabel: "tokens between “umbrella” and “would”", ylabel: "memory of the clue", yfmt: (v) => Math.round(v * 100) + "%" }), h("p", { class: "faint", style: "font-size:.86rem" }, "Memory of the clue = chance of rain with an umbrella minus chance of rain with sunglasses. Zero means the model has forgotten which item Maya packed.")); } },
      { kind: "spotlight", title: "Era 5 · The bottleneck", truth: "SKETCH",
        text: "For translation, [[seq2seq]] models (2014) read the whole input sentence into one vector, then wrote the translation from it. Imagine summarising a whole book in one sentence, then translating the book from your summary. Short sentences worked; long ones fell apart at the end. One fixed-size vector is a [[bottleneck]].",
        visual: (el) => el.append(h("div", { class: "row", style: "--gap:10px;align-items:center" }, h("div", { class: "toks" }, MM.toks(["Maya", "packed", "her", "umbrella", "…", "rain"])), "→", h("span", { class: "glow", style: "display:inline-block;border-radius:4px" }, MM.vec([0.4, -0.7, 0.9, 0.2, -0.3, 0.6], { wide: true })), "→", h("div", { class: "toks" }, MM.toks(["Maya", "a", "pris", "son", "parapluie", "…"])))) },
      { title: "Era 6 · Attention: look back directly", truth: "SKETCH",
        text: "In 2014 Bahdanau, Cho and Bengio let the translator look back at **every** input position while writing each word, taking a weighted mix of the relevant ones. No summary vector to squeeze through. The weights even lined up the two languages word by word. This idea, [[attention]], is the subject of M6.",
        visual: (el) => { const a = ["Maya", "packed", "her", "umbrella"], b = ["Maya", "a pris", "son", "parapluie"]; const svg = s("svg", { viewBox: "0 0 420 150", class: "figure", role: "img", "aria-label": "Attention lines between English and French words" }); a.forEach((w, i) => svg.append(s("text", { x: 50 + i * 100, y: 22, "text-anchor": "middle", "font-size": 13, class: "t-mono", text: w }))); b.forEach((w, i) => svg.append(s("text", { x: 50 + i * 100, y: 140, "text-anchor": "middle", "font-size": 13, class: "t-mono", text: w }))); [[0, 0, 4], [1, 1, 4], [2, 2, 3], [3, 3, 5], [3, 2, 1], [2, 3, 1]].forEach(([i, j, wd]) => svg.append(s("line", { x1: 50 + i * 100, y1: 32, x2: 50 + j * 100, y2: 122, stroke: "var(--seine)", "stroke-width": wd, opacity: 0.7 }))); el.append(svg); } },
      { title: "Era 7 · The Transformer: attention everywhere", truth: "TOY",
        text: "In 2017, the [[transformer|Transformer]] dropped the step-by-step memory entirely. Every token looks straight back at every earlier token, in every layer. Maya-LM is one. Pushed back from 14 to 26 tokens, its chance of rain does not change at all: 55%, then 55%.",
        precision: "Maya-LM's context window is only 32 tokens, so we cannot test further with it. Real transformers have windows of hundreds of thousands of tokens and look back just as directly, though, as M6 shows, attention gets spread thin over very long texts.",
        visual: async (el, api) => { const E = (await api.data("training")).eras; el.append(k.chart([{ pts: rowsFor(E, "transformer").map((r) => [r.distance, memory(r)]), color: "var(--real)", label: "Transformer" }, { pts: rowsFor(E, "rnn").filter((r) => r.distance <= 26).map((r) => [r.distance, memory(r)]), color: "var(--neg)", label: "RNN" }], { W: 480, H: 190, ymin: 0, ymax: 0.7, xmin: 14, xmax: 26, xlabel: "tokens between “umbrella” and “would”", ylabel: "memory of the clue", yfmt: (v) => Math.round(v * 100) + "%" })); } },
      { title: "The real reason it won: parallel training", truth: "SKETCH",
        text: "An RNN cannot compute step 10 until step 9 is done, so it cannot use a graphics chip's thousands of calculators at once. A Transformer computes every position at the same time during training. That turned language modelling into giant matrix multiplications, exactly what [[gpu|GPUs]] do best. Scale followed.",
        precision: "Rich Sutton's “bitter lesson” (2019): general methods that scale with computing power beat hand-built knowledge. Sara Hooker's “hardware lottery”: ideas win when they suit the hardware of their time. Both describe the Transformer.",
        visual: (el) => parallelRace(el) },
      { kind: "snap", title: "The trade-off flips when generating", truth: "SKETCH",
        text: "One twist. When generating, an RNN carries a fixed-size memory, so each new token costs the same. A Transformer keeps the keys and values of every earlier token (its KV cache, M9), which grows with every token. That is why newer designs mix the two ideas.",
        frontier: "State-space models such as Mamba (2023) train in parallel like Transformers but keep a fixed-size running state like an RNN. Many 2025–26 models are hybrids: NVIDIA's Nemotron-H and IBM's Granite 4.0 keep only a few attention layers and use these cheaper layers for the rest.",
        visual: (el) => { const pts1 = [], pts2 = []; for (let n = 0; n <= 100; n += 5) { pts1.push([n, 1]); pts2.push([n, 1 + n / 25]); } el.append(k.chart([{ pts: pts1, color: "var(--neg)", label: "RNN memory: fixed" }, { pts: pts2, color: "var(--real)", label: "Transformer cache: grows" }], { W: 460, H: 180, ymin: 0, xlabel: "tokens generated so far", ylabel: "memory per sequence" })); } }],
    lab: {
      title: "Same sentence through history", truth: "TOY",
      intro: "Every number here comes from a real model trained on Maya's world: a counting model, a fixed-window network, an RNN, an LSTM and Maya-LM. Drag the slider to push “umbrella” further back with a longer phrase (“after a very very … long week”). Watch which machines remember what Maya packed.",
      tries: ["Start at 14 tokens. Which models already ignore the umbrella?", "Slide to 34 tokens. What happens to the RNN?", "Slide to 60 tokens. Does the LSTM still remember?", "Why does the Transformer's row go grey beyond 26 tokens?"],
      async mount(el, api) {
        const E = (await api.data("training")).eras;
        const dists = [...new Set([].concat(...["rnn", "lstm"].map((id) => rowsFor(E, id).map((r) => r.distance))))].sort((a, b) => a - b);
        let di = 0;
        const sentence = h("div", { class: "mono", style: "font-size:.92rem;line-height:1.6;margin:8px 0" });
        const table = h("div", { class: "stack", style: "--gap:12px" });
        function draw() {
          const d = dists[di], kk = d - 14;
          sentence.textContent = `Maya packed her umbrella because , after a ${kk > 0 ? "very ".repeat(Math.min(kk, 6)) + (kk > 6 ? `(… ${kk - 6} more “very” …) ` : "") : ""}long week , the forecast for Paris said it would ___`;
          table.innerHTML = "";
          ERAS.forEach((era) => {
            const r = at(E, era.id, d);
            const mem = memory(r);
            const knows = r && r.rain_umbrella > 0.3 && r.rain_sunglasses < 0.05;
            const confused = r && r.rain_sunglasses >= 0.05 && era.id !== "ngram" && era.id !== "window";
            const verdict = r === null ? "beyond Maya-LM's 32-token window" : era.id === "ngram" || era.id === "window" ? "never sees the umbrella" : knows ? "remembers the umbrella" : confused ? "confused: guesses no longer track the item" : "has forgotten the umbrella";
            const pill = r === null ? "" : knows ? " ok" : " bad";
            table.append(h("div", { class: "card", style: "padding:10px 12px" + (r === null ? ";opacity:.55" : "") },
              h("div", { class: "row" }, h("strong", null, era.name), h("span", { class: "faint", style: "font-size:.85rem" }, era.year + " · " + era.how), h("span", { class: "grow" }), h("span", { class: "pill" + pill }, verdict)),
              r === null ? null : h("div", { style: "margin-top:6px" }, MM.bars([{ label: "umbrella", p: r.rain_umbrella }, { label: "sunglasses", p: r.rain_sunglasses }], { scale: 1, plain: true, total: false, fmt: (it) => "rain " + MM.pct(it.p, it.p < 0.01 ? 1 : 0) }))));
          });
          api.done();
        }
        el.append(MM.slider({ label: "distance", min: 0, max: dists.length - 1, value: 0, fmt: (v) => dists[v] + " tokens", onInput: (v) => { di = v; draw(); } }), sentence, table, h("p", { class: "faint", style: "font-size:.86rem;margin-top:8px" }, "Each bar is the model's real chance of “rain” as the next word. A model remembers the clue only if the umbrella bar is clearly higher than the sunglasses bar."));
        draw();
      } },
    breakit: {
      title: "Push past the horizon", truth: "TOY",
      intro: "Every memory has a horizon. Find each one.",
      cases: [
        { name: "Push “umbrella” 34 tokens back", what: "Give the real RNN the longer sentence.", action: "Push it", result: "The RNN's chance of “rain” falls from 57% to 0.2%, the same as with sunglasses. It has forgotten which item Maya packed.", why: "Its memory is one vector, overwritten a little at every step, and its training never rewarded holding a clue this long. Vanishing gradients make such long links hard to learn." },
        { name: "Feed a long sentence through a bottleneck", what: "A 2014-style translator must squeeze a 40-word sentence into one vector before writing the French.", action: "Squeeze it", result: "The start of the translation is fine; the end drifts and invents, because details from late in a long sentence did not fit in the summary.", why: "A fixed-size vector has a fixed capacity. Attention removed the bottleneck by letting the writer look back at every input word." }],
      explain: { q: "Why couldn't a bigger RNN simply be trained on huge amounts of text, like a Transformer?", options: ["RNNs cannot use vectors", "Each step must wait for the previous one, so training cannot run in parallel on GPUs", "RNNs have no weights", "RNNs only work on numbers"], answer: 1, why: "Sequential computation blocks parallel training, and parallel training is what made giant models possible." } },
    clinic: [
      { belief: "Transformers remember earlier words the way RNNs do, in a memory that is passed along.", test: "Look at how Maya-LM computes the token after “would”: it reads the whole context again, looking straight back at every earlier token. There is no memory vector passed from step to step.", truth: "A Transformer carries no hidden state. Its only memory is the context itself (its keys and values can be cached to save time, M9)." },
      { belief: "Attention was invented in 2017.", test: "Check the dates: Bahdanau, Cho and Bengio added attention to translation models in 2014.", truth: "2014 for attention; 2017 for the Transformer, which made attention the whole architecture and dropped recurrence." },
      { belief: "RNNs cannot remember anything more than a few words back.", test: "Our real RNN held “umbrella” 26 tokens back with almost no loss.", truth: "RNNs and especially LSTMs can carry information a fair distance. Their deeper problems were learning very long links (fading gradients) and training slowly, one step at a time." }],
    explain: { prompt: "Why did language models move from counting, to RNNs, to attention? Name what each era fixed and what it broke.", points: ["Counting and fixed windows cannot see far-back words", "RNNs carry a memory vector, but it fades and long links are hard to train (vanishing gradients)", "LSTMs' gates help, but they still read one token at a time", "Attention lets every token look directly back at every earlier token", "Transformers train in parallel, which unlocked scale"] },
    skeptic: [
      { q: "Why not just build much bigger RNNs?", laws: ["l9"], a: "Two walls. First, step 10 must wait for step 9, so training cannot spread across a GPU's thousands of calculators; a Transformer computes every position at once. Second, learning signals from far back fade. Bigger RNNs do not fix either, while Transformers turned the whole problem into the large matrix multiplications that hardware does best.", ladder: ["Why does parallel training matter so much? Because model quality grows smoothly with compute (M10), so whatever uses compute best wins.", "Why can a Transformer train in parallel? The causal mask lets every position predict its own next token at the same time.", "Then is recurrence dead? No: state-space models bring back a fixed-size state while keeping parallel training."] },
      { q: "If attention is so good, why are new models like Mamba going back to RNN-like memories?", laws: ["l6"], a: "Because the trade-off flips when generating. A Transformer's cache of keys and values grows with every token, so long contexts cost a lot of memory. An RNN-like state stays the same size. State-space models such as Mamba can still be trained in parallel, so hybrids that keep a few attention layers and use cheaper layers elsewhere get much of both. This is also where {law:l6} bends." },
      { q: "So the Transformer won because it is smarter?", laws: ["l8"], a: "Mostly because it scales. It turned language modelling into giant matrix multiplications, which GPUs do extremely well (the “hardware lottery”), and general methods that use more compute keep beating clever hand-designed ones (the “bitter lesson”)." }],
    recall: [
      { q: "What does an RNN pass from one step to the next?", options: ["The whole sentence", "A memory vector (hidden state)", "The final answer", "Nothing"], answer: 1, level: 1, why: "One hidden-state vector, updated at every step." },
      { q: "Why are long-range links hard for an RNN to learn?", options: ["The learning signal is multiplied by roughly the same matrix at each step, so it fades or explodes", "RNNs have no weights", "Tokens are too long", "The vocabulary is too small"], answer: 0, level: 2, why: "Vanishing (or exploding) gradients." },
      { q: "In our real test, “umbrella” is pushed 34 tokens back. What does the RNN do?", options: ["Still predicts rain", "Its guess no longer depends on the item at all", "Predicts snow", "Refuses to answer"], answer: 1, level: 3, why: "Rain 0.2% with an umbrella and 0.3% with sunglasses: the clue is gone." },
      { q: "True or false: the Transformer's main advantage over the RNN in training is that it can process every position at once.", options: ["True", "False"], answer: 0, level: 4, why: "Parallel training on GPUs unlocked scale." },
      { q: "From M2: what does gradient descent do with each weight?", options: ["Sets it to zero", "Nudges it against its slope by a small step", "Copies it", "Randomises it"], answer: 1, level: 5, why: "And M5's problem is that, for far-back steps, those slopes fade." }],
    depth: [
      ["The RNN update", "new memory = tanh(W × old memory + U × current token + b), where tanh squashes every number between −1 and 1. The same W and U are used at every step."],
      ["Why gradients vanish or explode", "The learning signal from a word 50 steps back is multiplied by roughly the same matrix 50 times. If that shrinks things, it fades; if it grows things, it explodes. Clipping stops explosions, not fading."],
      ["The LSTM's real trick", "A separate cell memory updated by adding: new cell = forget gate × old cell + input gate × new content. Signals flow back through that “+” path without fading, the same idea as the residual stream (M7)."],
      ["Sequential is slow", "Step t must wait for step t−1, so an RNN cannot use a GPU's parallel units during training. A Transformer computes every position at once (thanks to the causal mask), paying n² attention cost instead."],
      ["The bottleneck, and its fix", "Seq2seq squeezed a sentence into one fixed-size vector. Bahdanau attention computes a fresh weighted mix of all input positions for each output word; the weights act like a learned alignment between the languages."],
      ["What the 2017 paper combined", "Self-attention instead of recurrence, many heads, position encodings, residual connections and layer normalisation, in an encoder–decoder shape built for translation."],
      ["The trade-off flips when generating", "An RNN carries a fixed-size memory, so each token costs the same. A Transformer's KV cache grows with every token, which is why state-space models such as Mamba came back and many 2025–26 models are hybrids."],
      ["Why the Transformer won", "It turned language modelling into huge matrix multiplications, exactly what GPUs do best. Sutton's “bitter lesson” and Hooker's “hardware lottery” both apply."]],
    connect: { links: ["Attention, the idea that ended the memory problem, is {mod:m06}.", "The LSTM's additive path returns as the residual stream in {mod:m07}.", "The growing cache that makes RNN-like designs attractive again is the KV cache of {mod:m09}."], line: "You have seen why attention was needed. Next: exactly how “would” finds “umbrella”." }
  });

  function parallelRace(el) {
    const words = ["Maya", "packed", "her", "umbrella", "because", "the", "forecast", "said"];
    const row = (label) => { const cells = words.map((w) => h("span", { class: "tok", style: "opacity:.35;font-size:.8rem" }, w)); return { el: h("div", null, h("div", { class: "eyebrow" }, label), h("div", { class: "toks" }, cells)), cells }; };
    const a = row("RNN · one token per tick"), b = row("Transformer · all positions at once");
    const btn = h("button", { class: "btn small primary" }, MM.icon("play"), "Race");
    let t = null;
    btn.onclick = () => { clearInterval(t); a.cells.concat(b.cells).forEach((c) => (c.style.opacity = ".35")); let i = 0; b.cells.forEach((c) => (c.style.opacity = "1")); t = setInterval(() => { if (!el.isConnected || i >= a.cells.length) { clearInterval(t); return; } a.cells[i++].style.opacity = "1"; }, MM.reducedMotion() ? 0 : 350); };
    el.append(a.el, h("div", { style: "height:10px" }), b.el, h("div", { style: "margin-top:10px" }, btn), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "In training, the Transformer finishes all 8 positions in one tick; the RNN needs 8."));
    return () => clearInterval(t);
  }
})();
