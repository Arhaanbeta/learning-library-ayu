/* M3 · Tokens — how text becomes pieces. */
(function () {
  const MM = window.MM, h = MM.h, k = MM.k;
  const DIARY = "Today we arrived in Paris. It was cold and grey. Tom said it would be sunny tomorrow, but the forecast said it would rain. I packed my umbrella and my scarf. In the morning it would be cold, so I took my coat. We walked to the river. It began to rain, so we went to the Louvre. The museum was warm. Tom said it would be fun to see the Orsay museum. I think it would be busy on Sunday. In the evening it would rain again. We had soup in a small cafe. It was a long day. Tomorrow it would be sunny, Tom said. I said it would rain. I was right. It would rain all week. Maya packed her umbrella because the forecast for Paris said it would rain. When it rains in Paris, Maya takes her umbrella. On rainy days, Maya visits the Louvre.";
  const ENC = { r50k: "GPT-2", cl100k: "GPT-4", o200k: "GPT-4o" };
  const shown = (t) => (t === "" || t.includes("\ufffd") ? "⟨byte⟩" : t);
  const toksOf = (enc, n) => enc.map(([id, t]) => MM.tok(shown(t), { sub: n === false ? undefined : id }));

  let tokPromise = {};
  function realTokeniser(name) {
    if (!tokPromise[name]) tokPromise[name] = MM.load(`vendor/${name}_base.js`).then(() => window["GPTTokenizer_" + name + "_base"]);
    return tokPromise[name];
  }

  MM.defineModule({
    id: "m03",
    mystery: { title: "The poet who cannot spell", text: "Ask a chatbot to count the letter r in “strawberry” and many have answered “two”. The same chatbot can write a sonnet about strawberries.\n\nHow can a machine that writes poems fail to count letters? The answer is not that it is careless. It is that it never sees the letters at all." },
    where: { text: "We go to the top of the machine map: the very first step, where text becomes something the model can compute with." },
    predict: { q: "GPT-4's real tokeniser cuts “Maya packed her umbrella because the forecast for Paris said it would” into pieces. How many?", options: ["12: one per word", "13", "69: one per character", "7: only the important words"], answer: 1, why: "13. Eleven words stay whole (with their leading spaces), but “Maya” is split into “May” + “a”, because “Maya” is not common enough to have its own token." },
    story: [
      { title: "Text must become numbers", truth: "SKETCH",
        text: "Inside the model there is only arithmetic: multiplying and adding lists of numbers. So before anything else, text must become numbers. We could give each letter a number, or each word. Real models do something in between, and the reason teaches you a lot about how they behave.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:10px" }, h("div", null, h("div", { class: "eyebrow" }, "Letters · 69 pieces"), MM.toks("Maya packed her umbrella".split("").map((c) => (c === " " ? "␣" : c)))), h("div", null, h("div", { class: "eyebrow" }, "Words · 12 pieces"), MM.toks(["Maya", "packed", "her", "umbrella", "…"])), h("div", null, h("div", { class: "eyebrow" }, "Tokens · 13 pieces"), MM.toks(["May", "a", " packed", " her", " umbrella", "…"])))) },
      { title: "Tokens", truth: "REAL",
        text: "A [[tokeniser]] (the program that cuts text into pieces) splits Maya's sentence into 13 [[token|tokens]] (pieces from a fixed list). Common words stay whole. “Maya” becomes “May” + “a”. Notice the dots: spaces belong to the token after them, so “ umbrella” (with a space) and “umbrella” are different tokens.",
        precision: "This is GPT-4's real tokeniser, cl100k_base. Rule of thumb for English: one token ≈ 4 characters ≈ ¾ of a word.",
        visual: async (el, api) => { const d = await api.data("tokens"); el.append(MM.toks(d.texts.spine.enc.cl100k.map((x) => x[1]))); } },
      { title: "Each token has an ID", truth: "REAL",
        text: "Every token has an ID number: its position in the [[vocabulary]] (the fixed list of every token the model knows). From here on the model sees only these numbers. “ umbrella” is 48998 to GPT-4 and 25510 to GPT-2: each tokeniser has its own list.",
        precision: "Vocabulary sizes: GPT-2 has 50,257 tokens; GPT-4 (cl100k) about 100,000; GPT-4o (o200k) about 200,000. The [[token-id|ID]] is just an index into the embedding table you meet in M4.",
        visual: async (el, api) => { const d = await api.data("tokens"); el.append(h("div", { class: "stack", style: "--gap:10px" }, ["r50k", "cl100k", "o200k"].map((e) => h("div", null, h("div", { class: "eyebrow" }, ENC[e] + " · " + d.encoders[e].vocab.toLocaleString("en-GB") + " tokens"), h("div", { class: "toks" }, toksOf(d.texts.spine.enc[e].slice(0, 6))))))); } },
      { title: "Why not letters? Why not words?", truth: "SKETCH",
        text: "Letters make sequences about five times longer, and attention's cost grows with the square of the length: five times longer is about 25 times the work. Whole words need a giant vocabulary, and still fail on typos, names and new words. Tokens are the compromise: common words whole, rare words in pieces.",
        precision: "Attention compares every token with every earlier token: n(n+1)/2 pairs. 13 tokens → 91 pairs; 69 characters → 2,415 pairs. {tool:t7}",
        visual: (el) => el.append(MM.bars([{ label: "13 tokens", p: 91 / 2415 }, { label: "69 letters", p: 1 }], { scale: 1, plain: true, total: false, fmt: (it) => (it.label.startsWith("13") ? "91" : "2,415") + " pairs" }), h("p", { class: "faint", style: "font-size:.88rem;margin-top:6px" }, "Number of attention comparisons for Maya's sentence.")) },
      { kind: "spotlight", title: "How the list is built: BPE", truth: "TOY",
        text: "The vocabulary is learned by counting, before the model exists. [[bpe|Byte-pair encoding]] starts from single letters (really, bytes). It counts every neighbouring pair in a big text, merges the most frequent pair into a new token, and repeats. Here are the first merges it makes on Maya's diary.",
        precision: "Real BPE starts from the 256 possible bytes and repeats until the vocabulary reaches its target size. The ordered list of merges *is* the tokeniser. A pre-splitting rule first cuts text at spaces, punctuation and digits, so merges never cross word edges.",
        visual: (el) => { const hist = k.bpeTrain(DIARY, 14); el.append(h("ol", { style: "margin:0;padding-left:22px;columns:2;column-gap:20px" }, hist.map((m) => h("li", { class: "mono", style: "font-size:.88rem;margin:2px 0" }, `${m.a} + ${m.b} → ${m.merged}  (${m.count}×)`))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "· marks the start of a word. Watch it learn whole words in the Lab.")); } },
      { title: "Same letters, different tokens", truth: "REAL",
        text: "Encoding replays the learned merges in order, so tiny changes give different tokens. “rain”, “ Rain” and “ RAIN” are different: GPT-4 sees “ RAIN” as “ R” + “AIN”. The model has to learn, from examples, that they mean the same thing.",
        visual: async (el, api) => { const d = await api.data("tokens"); el.append(h("div", { class: "toks" }, toksOf(d.texts.rain_forms.enc.cl100k))); } },
      { title: "Stress tests", truth: "REAL",
        text: "Now the strawberry mystery solves itself. “ strawberry” is a single token: the letters r, r, r are simply not in the input. Numbers split in odd groups (“12345” → “123” + “45”), which makes arithmetic harder. A typo, “umbrela”, breaks into meaningless pieces.",
        visual: async (el, api) => { const d = await api.data("tokens"); el.append(h("div", { class: "stack", style: "--gap:10px" }, [["strawberry", "Counting letters"], ["numbers", "Arithmetic"], ["typo", "A typo"], ["orsay", "A French name"]].map(([key, lab]) => h("div", null, h("div", { class: "eyebrow" }, lab), h("div", { class: "toks" }, toksOf(d.texts[key].enc.cl100k, false)))))); } },
      { title: "The language tax", truth: "REAL",
        text: "Tokenisers are trained mostly on English text, so other languages split into more pieces. The same sentence about Maya costs 12 tokens in English, 20 in French and 61 in Hindi with GPT-4's tokeniser. More tokens means more cost, slower replies and less room in the context window.",
        precision: "GPT-4o's bigger vocabulary (about 200,000 tokens) cut the Hindi sentence from 61 to 36 tokens. Vocabulary size is a trade-off you meet again in the Expert depth list.",
        visual: async (el, api) => { const d = await api.data("tokens"); const rows = ["english", "french", "hindi"]; el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "Same sentence in"), ["r50k", "cl100k", "o200k"].map((e) => h("th", { class: "n" }, ENC[e])))), h("tbody", null, rows.map((r) => h("tr", null, h("td", null, r[0].toUpperCase() + r.slice(1)), ["r50k", "cl100k", "o200k"].map((e) => h("td", { class: "n" }, String(d.texts[r].enc[e].length)))))))); } },
      { title: "A whole chat is one stream", truth: "SKETCH",
        text: "Chat apps add [[special-token|special tokens]] (tokens with a job instead of text) such as “start of the user's turn”. A [[chat-template|chat template]] turns a whole conversation into one long token sequence. The model never sees “messages”; it sees one stream and continues it.",
        precision: "The exact markers differ by model and are learned in post-training. Tool calls and tool results (M13) are also just tokens in this stream.",
        visual: (el) => el.append(h("div", { class: "toks" }, ["<|system|>", "You are a travel helper.", "<|user|>", "Do I need an umbrella?", "<|assistant|>", "…"].map((t, i) => MM.tok(t, { color: i % 2 ? null : "var(--llm)" })))) },
      { kind: "snap", title: "Back to Maya-LM", truth: "TOY",
        text: "To stay tiny, Maya-LM uses whole words: its vocabulary is just 214 tokens, so it has no word pieces at all. Real models use word pieces for the reasons above. Either way, {law:l2} holds: inside the model there is no text, only ID numbers and then lists of numbers.",
        visual: async (el, api) => { const lm = await api.lm(); const e = lm.encode("Maya packed her umbrela because the forecast said it would"); el.append(h("div", { class: "toks" }, e.ids.map((id) => MM.tok(lm.vocab[id] === "<unk>" ? "⟨unknown⟩" : lm.vocab[id], { sub: id, color: lm.vocab[id] === "<unk>" ? "var(--bad)" : null }))), h("p", { class: "faint", style: "font-size:.88rem;margin-top:6px" }, "Maya-LM with the typo “umbrela”: a whole-word vocabulary has no way to write it, so it becomes “unknown” and the clue is lost.")); } }],
    lab: {
      title: "Watch BPE learn, then tokenise anything", truth: "REAL",
      intro: "First, train a tokeniser live on Maya's diary and watch merges turn letters into whole words. Then type anything into the real GPT-2, GPT-4 and GPT-4o tokenisers.",
      tries: ["Slide the merges from 0 to 80 and watch the token count fall.", "Type “strawberry” and “Strawberry”.", "Type a long number such as 1234567.", "Type a sentence in another language you know and compare the three tokenisers."],
      mount(el, api) {
        const hist = k.bpeTrain(DIARY, 80);
        const sample = "Maya packed her umbrella because it would rain in Paris";
        const enc = h("div", { class: "toks" }), info = h("div", { class: "mono", style: "font-size:.9rem;margin:6px 0" }), last = h("div", { class: "faint", style: "font-size:.88rem" });
        const draw = (m) => { const words = k.bpeEncode(sample, hist, m); const n = words.reduce((a, w) => a + w.length, 0); enc.innerHTML = ""; words.forEach((w) => w.forEach((t) => enc.append(MM.tok(t)))); info.textContent = `${m} merges learned · ${n} tokens for this sentence`; last.textContent = m ? `latest merge: ${hist[m - 1].a} + ${hist[m - 1].b} → ${hist[m - 1].merged} (seen ${hist[m - 1].count}×)` : "no merges yet: one token per letter"; api.done(); };
        el.append(h("h3", null, "1 · BPE learns on Maya's diary"), h("p", { class: "muted", style: "margin:4px 0 8px" }, "Each merge glues the most frequent neighbouring pair into a new token."), MM.slider({ label: "merges", min: 0, max: hist.length, value: 0, onInput: draw }), info, enc, last);
        draw(0);
        const inp = h("input", { type: "text", id: "tok-in", value: "How many r's are in strawberry? 1234567", "aria-label": "Text to tokenise" });
        const out = h("div", { class: "stack", style: "--gap:10px;margin-top:10px" });
        const note = h("div", { class: "faint", style: "font-size:.85rem" }, "Loading the real tokenisers (about 3.5 MB, once)…");
        const run = MM.debounce(async () => {
          try {
            const names = ["r50k", "cl100k", "o200k"];
            const T = await Promise.all(names.map(realTokeniser));
            note.textContent = "Number under each token = its ID. ⟨byte⟩ = part of a character that takes several bytes.";
            out.innerHTML = "";
            names.forEach((n, i) => { const ids = T[i].encode(inp.value); out.append(h("div", null, h("div", { class: "eyebrow" }, `${ENC[n]} · ${ids.length} tokens · ${[...inp.value].length} characters`), h("div", { class: "toks" }, ids.slice(0, 120).map((id) => MM.tok(shown(T[i].decode([id])), { sub: id }))))); });
            api.done();
          } catch (e) { note.textContent = "The real tokenisers could not load here. The story tab still shows real splits."; }
        }, 250);
        inp.addEventListener("input", run);
        el.append(h("hr", { class: "rule" }), h("h3", null, "2 · The real tokenisers"), h("div", { style: "margin-top:8px" }, inp), note, out);
        run();
      } },
    breakit: {
      title: "Cut text the wrong way", truth: "REAL",
      intro: "Tokens are a compromise between letters and words. Push the compromise to either end and something breaks.",
      cases: [
        { name: "Cut into single characters", what: "Use letters instead of tokens for Maya's sentence.", action: "Cut it", result: "69 pieces instead of 13: the sequence is 5.3 times longer, so attention needs about 27 times as many comparisons (2,415 pairs instead of 91), and the context window holds about a fifth as much text.", why: "Attention compares every token with every earlier one, so its cost grows with the square of the length." },
        { name: "Cut into whole words", what: "Give every word its own token, as Maya-LM does.", action: "Cut it", result: "Maya-LM turns the typo “umbrela” into “unknown” and loses the clue. A whole-word tokeniser for real text would need millions of tokens, one for every word, name, typo and number in every language, and still meet unknown words.", why: "Byte-level BPE can write any text from bytes, so there is never an unknown word. Whole words cannot." }],
      explain: { q: "Text is cut into single characters instead of tokens, making it 4 times longer. Roughly how much more work does attention do?", options: ["4 times", "8 times", "16 times", "The same"], answer: 2, why: "Attention cost grows with the square of the length: 4² = 16." } },
    clinic: [
      { belief: "The model reads letters.", test: "Tokenise “ strawberry” with GPT-4's tokeniser: it is one token, ID 73700. The letters s-t-r-a-w-b-e-r-r-y are not in the input.", truth: "The model reads token IDs ({law:l2}). It can learn spellings indirectly, from text that spells words out, which is why newer models often count correctly, but letters are never its input." },
      { belief: "One token is one word.", test: "“Maya” is two tokens; “ umbrella” (with its space) is one; the Hindi sentence uses 61 tokens for 13 words.", truth: "Tokens are word pieces from a fixed list. In English, about 4 characters or ¾ of a word each, on average." },
      { belief: "The tokeniser is trained together with the model, by gradient descent.", test: "Watch BPE in the Lab: it only counts pairs and merges them. No loss, no gradients. It is finished before the model's training starts.", truth: "The tokeniser is built first, by counting, then frozen. The model learns what each token means; it cannot change how text is cut." }],
    explain: { prompt: "How does text become something a model can compute with, and why are tokens used instead of letters or whole words?", points: ["Text is cut into tokens from a fixed vocabulary, each with an ID number", "BPE builds the vocabulary by repeatedly merging the most frequent pair", "Letters make sequences much longer (attention cost grows with the square)", "Whole words need a huge vocabulary and still meet unknown words", "The model sees only IDs, never letters"] },
    skeptic: [
      { q: "Why can it write a poem but fail to count the letters in “strawberry”?", laws: ["l2"], a: "Because of {law:l2}: the model never sees letters, only token IDs. “ strawberry” arrives as one number. Counting its letters means recalling a spelling it has only seen indirectly, in text that happened to spell the word out. Writing a poem needs patterns between whole tokens, which is exactly what it learns best.", ladder: ["Why does it see whole tokens? Because the tokeniser glued frequent letter pairs into one piece before the model ever trained.", "Why glue them? Shorter sequences make attention far cheaper and let more text fit in the window.", "So how do newer models count correctly? They learn spellings from examples, or write the letters out one per token first, turning the task into something they can see."] },
      { q: "Why does the same message cost me more in Hindi than in English?", laws: ["l2"], a: "The tokeniser's merges were learned mostly from English text, so English words became single tokens and Hindi letters mostly did not. Our Maya sentence takes 12 tokens in English and 61 in Hindi with GPT-4's tokeniser. You pay per token, and more tokens also fill the context window faster. GPT-4o's larger vocabulary cut it to 36." },
      { q: "Then just make the vocabulary enormous. Problem solved?", laws: ["l2"], a: "It is a trade-off. A bigger vocabulary makes sequences shorter, but the embedding table grows, and each rare token appears in fewer training examples, so its vector is learned poorly. A token common in the tokeniser's text but rare in the model's text can become a “glitch token” (the 2023 “SolidGoldMagikarp” case) that triggers strange output." }],
    recall: [
      { q: "What does the model actually receive as input?", options: ["Letters", "Whole words", "Token ID numbers", "Sentences"], answer: 2, level: 1, why: "Text → tokens → IDs. Only numbers go in (Law 2)." },
      { q: "Why do “ rain” and “Rain” count as different tokens?", options: ["They mean different things", "Spaces and capital letters are part of the token, so the merges produce different pieces", "The model chose to split them", "They are the same token"], answer: 1, level: 2, why: "Encoding replays merges on the exact bytes, including the space and the capital." },
      { q: "A text is cut into characters instead of tokens and becomes 4 times longer. What happens to attention's cost?", options: ["It doubles", "It grows about 16 times", "It stays the same", "It shrinks"], answer: 1, level: 3, why: "Quadratic: 4² = 16." },
      { q: "True or false: BPE is trained together with the model using gradient descent.", options: ["True", "False: BPE is built first by counting pairs, then frozen"], answer: 1, level: 4, why: "The tokeniser is finished before training begins." },
      { q: "From M1: a counting model sees “it would”. Why can't it see “umbrella”?", options: ["Its window holds only the last few words", "“umbrella” is not a token", "It ignores nouns", "It can see it"], answer: 0, level: 1, why: "A counting model's window is fixed and short." }],
    depth: [
      ["How BPE learns", "Start with the 256 possible bytes. Count every neighbouring pair in a big text. Merge the most frequent pair into a new token. Repeat until the vocabulary reaches the size you want. The ordered list of merges is the tokeniser."],
      ["How BPE encodes", "New text is split into bytes, then the learned merges are replayed in the same order. That is why “ rain”, “rain” and “Rain” can become different tokens."],
      ["Pre-splitting rules", "Before merging, a pattern splits text at spaces, punctuation and digits, so merges never cross word edges. Some tokenisers split numbers into single digits or groups of three, which changes how well models do arithmetic."],
      ["The vocabulary-size trade-off", "A bigger vocabulary makes sequences shorter (cheaper attention, more text in the window) but makes the embedding table bigger and gives rare tokens fewer training examples each."],
      ["The language tax", "Modern tokenisers average about four characters per token in English. Many other languages need more tokens for the same meaning, so they cost more and fit less into the window."],
      ["Glitch tokens", "A token common in the tokeniser's training text but rare in the model's training text gets a poorly trained embedding and can trigger strange output, as in the 2023 “SolidGoldMagikarp” case."],
      ["Chat templates are tokens too", "Role markers such as “start of assistant turn” are special tokens learned in post-training. A whole conversation, tool calls included, becomes one stream of token IDs."],
      ["Other designs", "Unigram tokenisers (as in SentencePiece) start with a big vocabulary and prune it down. Byte-level models skip the tokeniser but must handle sequences several times longer."]],
    connect: { links: ["Each token ID picks one row of the embedding table: {mod:m04}.", "Sequence length sets attention's cost, which grows with the square: {mod:m06}.", "Special tokens carry tool calls and their results: {mod:m13}."], line: "A token ID is just a number. Next: how a number can carry meaning." }
  });
})();
