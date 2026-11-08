/* M9 · The Generation Loop — context, memory and thinking out loud. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";
  const bucketText = (n) => `Maya packed her umbrella because , after a ${"very ".repeat(n)}long week , the forecast for Paris said it would rain , so`;
  const label = (w) => (w === "<s>" ? "⟨start⟩" : w);
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());

  function bucket(el, lm, n) {
    const e = lm.encode(bucketText(n));
    const ids = e.ids, out = Math.max(0, ids.length - lm.cfg.ctx);
    const win = ids.slice(out);
    const p = lm.softmax(lm.run(win).logits[win.length - 1]);
    const row = h("div", { class: "toks", style: "margin:8px 0" });
    ids.forEach((id, i) => row.append(MM.tok(label(lm.vocab[id]), { cls: i < out ? "blank" : "", title: i < out ? "fell out of the window" : "inside the window" })));
    el.append(h("div", { class: "mono", style: "font-size:.85rem;color:var(--ink-2)" }, `${ids.length} tokens · window holds ${lm.cfg.ctx}` + (out ? ` · ${out} fell out: ${ids.slice(0, out).map((i) => label(lm.vocab[i])).join(" ")}` : "")), row,
      h("div", { class: "eyebrow" }, "next word after “…so”"), MM.bars(["she", "he"].map((w) => ({ label: w, p: p[lm.stoi[w]] })), { scale: 1, total: false }));
  }

  MM.defineModule({
    id: "m09",
    mystery: { title: "It remembered my name", text: "Last week Maya told a chatbot her name and that she hates early flights. Today she opens a new chat and it says: “Welcome back, Maya. Shall I avoid early flights again?”\n\nSo it learns from her? Here is the catch: the model's numbers have not changed since it was trained. So how does it “remember”? And why, in a very long chat, does it sometimes forget what she said at the start?" },
    where: { text: "The loop around the whole machine: the text so far goes in, one token comes out, and the token is appended for the next trip." },
    predict: { q: "Maya-LM can see 32 tokens at a time. In a long sentence, “Maya” and “her” slide out of that window before “…so ___”. What does it predict for the blank?", options: ["Still “she”: it remembers Maya from earlier", "It switches to “he”", "It crashes", "It asks who Maya is"], answer: 1, why: "Real result: inside the window, “she” 100%. Once “Maya” falls out, “he” 63%; once “her” falls out too, “he” 97%. Nothing outside the window exists for the model ({law:l3})." },
    story: [
      { title: "One trip per token", truth: "TOY",
        text: "Generating text runs the whole machine once for every new token: read the text so far, score every token, pick one, append it, repeat until a stop token or a length limit. A 500-token answer is 500 trips through every layer.",
        precision: "This is the [[autoregression|autoregressive]] loop of M1, now with real costs attached. The loop stops at a special end token or a maximum length.",
        visual: async (el, api) => { const lm = await api.lm(); const g = lm.generate(SPINE, 8, { greedy: true }); el.append(h("div", { class: "stack", style: "--gap:6px" }, g.steps.slice(0, 6).map((st, i) => h("div", { class: "row", style: "--gap:6px" }, h("span", { class: "pill" }, "trip " + (i + 1)), h("span", { class: "mono", style: "font-size:.82rem;color:var(--ink-3)" }, "…" + (i ? g.steps.slice(Math.max(0, i - 3), i).map((x) => label(x.word)).join(" ") : "it would")), "→", MM.tok(label(st.word)))))); } },
      { title: "Prefill, then decode", truth: "SKETCH",
        text: "The first trip is special. The whole prompt is read at once: [[prefill]]. On a GPU every prompt position is computed in parallel, so it is fast for its size, but you still wait a moment before the first word. After that, new tokens come one at a time: [[decode]]. That is why a reply pauses, then streams.",
        precision: "Two speed numbers: time to first token (mostly prefill) and time per output token (decode). They improve in different ways.",
        visual: (el) => { const svg = s("svg", { viewBox: "0 0 460 90", class: "figure", role: "img", "aria-label": "One long prefill block, then many short decode steps" }); svg.append(s("rect", { x: 10, y: 30, width: 140, height: 30, rx: 6, fill: "color-mix(in srgb, var(--seine) 30%, var(--sheet))", stroke: "var(--seine)" }), s("text", { x: 80, y: 50, "text-anchor": "middle", "font-size": 12, text: "prefill: whole prompt" })); for (let i = 0; i < 10; i++) svg.append(s("rect", { x: 160 + i * 29, y: 30, width: 24, height: 30, rx: 4, fill: "var(--sheet)", stroke: "var(--line1)" })); svg.append(s("text", { x: 300, y: 80, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)", text: "decode: one token per step" }), s("text", { x: 10, y: 20, "font-size": 12, fill: "var(--ink-2)", text: "time →" })); el.append(svg); } },
      { title: "The KV cache", truth: "TOY",
        text: "When token 14 is generated, tokens 1 to 13 have not changed. Their keys and values (M6) would come out exactly the same, so they are saved instead of recomputed: the [[kv-cache|KV cache]]. Each new token computes only its own query, key and value, then attends to the saved ones. In Maya-LM this gives identical results, to within 0.000001.",
        precision: "Maya-LM stores 2 × 4 layers × 64 numbers = 512 numbers per token. A Llama-3-8B-like shape stores about 128 KB per token at 16 bits (see M6's calculator).",
        visual: async (el, api) => { const lm = await api.lm(); const ids = lm.encode(SPINE).ids; const full = lm.run(ids).logits[ids.length - 1]; const c = lm.cacheStart(); let lg; ids.forEach((id) => (lg = lm.stepCached(c, id))); let md = 0; for (let i = 0; i < lg.length; i++) md = Math.max(md, Math.abs(lg[i] - full[i])); el.append(h("div", { class: "kv" }, h("dt", null, "with cache, “rain”"), h("dd", null, MM.pct(lm.softmax(lg)[lm.stoi.rain], 2)), h("dt", null, "without cache, “rain”"), h("dd", null, MM.pct(lm.softmax(full)[lm.stoi.rain], 2)), h("dt", null, "largest score difference"), h("dd", null, md.toExponential(1)), h("dt", null, "numbers in the cache"), h("dd", null, (c.len * 512).toLocaleString("en-GB") + " for " + c.len + " tokens"))); } },
      { title: "Decoding is a memory problem", truth: "SKETCH",
        text: "Here is a surprise. Each decode step must read every active weight and the whole KV cache from memory, just to produce one token. So decoding is limited by memory speed, not by arithmetic. A 70-billion-parameter model in 16-bit numbers is 140 GB. At about 3 TB per second, one full read takes about 47 ms: roughly 20 tokens per second for a single user.",
        precision: "Servers batch many users together, so each read of the weights serves all of them; continuous batching adds and removes requests at every step. Paged KV caches (vLLM, 2023) store each conversation's cache in small pages. Prompt caching keeps the cache of a repeated opening, so stable system prompts go first.",
        visual: (el) => decodeCalc(el) },
      { title: "The context window", truth: "TOY",
        text: "A model can only see a fixed number of tokens at once: its [[context-window|context window]], its working memory for this call. Maya-LM's is 32 tokens; real models range from thousands to over a million. Anything outside the window does not exist for the model. Push “Maya” out of Maya-LM's window and it stops knowing who “so ___” refers to.",
        visual: async (el, api) => { const lm = await api.lm(); bucket(el, lm, 13); } },
      { title: "Two memories, and only two", truth: "SKETCH",
        text: "This is {law:l3}. A model can use what training put into its [[weight|weights]] (frozen, {law:l4}) and what is in its context window right now. Nothing else. Search results, tool results and saved notes all help only by being pasted into the context as text.",
        precision: "The KV cache is the context stored in a ready-to-use form, not a third memory. Research on test-time training changes weights during use; it is not standard in products.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Memory 1 · weights"), h("p", { style: "margin-top:4px" }, "Everything learned in training. Huge, blurry, frozen. Knows Paris is in France; cannot know today's forecast.")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Memory 2 · context window"), h("p", { style: "margin-top:4px" }, "The text of this call. Exact, fresh, limited in size. Gone when the call ends.")))) },
      { title: "The model keeps nothing between calls", truth: "SKETCH",
        text: "The model is [[statelessness|stateless]]: it keeps nothing from one call to the next. A chat app makes it look like a conversation by re-sending the whole conversation every time, as one long token stream with role markers (M3). Turn 3 sends turns 1 and 2 again.",
        precision: "So each turn costs more than the last: the model re-reads everything (prompt caching softens this). A [[system-prompt|system prompt]] sits at the start of every call.",
        visual: (el) => { const turns = [["system", "You are a travel helper."], ["user", "Do I need an umbrella in Paris?"], ["assistant", "Rain is likely on Saturday, so yes."], ["user", "And for Rome?"]]; el.append(h("div", { class: "stack", style: "--gap:10px" }, [2, 4].map((n) => h("div", null, h("div", { class: "eyebrow" }, n === 2 ? "call for turn 1" : "call for turn 2 · everything is sent again"), h("div", { class: "toks" }, turns.slice(0, n).flatMap(([r, t]) => [MM.tok("<|" + r + "|>", { color: "var(--llm)" }), MM.tok(t)])))))); } },
      { kind: "spotlight", title: "Learning from the prompt, with frozen weights", truth: "TOY",
        text: "Show a model a pattern in its prompt and it can continue the pattern: [[in-context-learning|in-context learning]]. Maya-LM learned a copying game in training. Give it a list it has never seen, and it copies it perfectly, with not one weight changing. The “learning” happens in the activations, as it reads.",
        precision: "Induction heads (M7, M10) do this: find where the current token appeared before, and copy what came next. Where it breaks: Maya-LM only copies the kind of words it saw in that game. Give it “Paris rain Monday coat Louvre” and it copies nonsense. Big models generalise this skill far more widely.",
        visual: async (el, api) => { const lm = await api.lm(); [["Tom wrote : bread river key lamp cup . again :", "a new list of familiar game words"], ["Tom wrote : Paris rain Monday coat Louvre . again :", "words from outside the game"]].forEach(([t, n]) => el.append(h("div", { class: "panel", style: "margin-bottom:8px" }, h("div", { class: "eyebrow" }, n), h("div", { class: "mono", style: "font-size:.88rem;margin-top:4px" }, t.replace("Tom wrote : ", "“") .replace(" . again :", "” → "), h("strong", null, lm.generate(t, 6, { greedy: true }).text))))); } },
      { title: "Fixed effort per token", truth: "SKETCH",
        text: "Every token passes through the same number of layers ({law:l9}): an easy token and a hard one get exactly the same computation. A model cannot think longer about a hard question by using more layers. It can only use more **tokens**. Writing out steps feeds its own results back in as input: each written step buys another full pass.",
        precision: "One forward pass costs about 2 operations per active parameter, plus attention work that grows with context length. Theory and experiments show chain-of-thought lets a fixed-depth model solve problems that need more sequential steps than one pass allows.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "answer at once · 1 token of thinking"), h("p", { class: "mono", style: "margin-top:4px;font-size:.9rem" }, "3 nights × €190 + 2 trains × €45 = ?"), h("p", { class: "mono", style: "font-size:.9rem;color:var(--bad)" }, "€615")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "step by step · many tokens"), h("p", { class: "mono", style: "margin-top:4px;font-size:.9rem;white-space:pre-wrap" }, "3 × 190 = 570\n2 × 45 = 90\n570 + 90 = 660"), h("p", { class: "mono", style: "font-size:.9rem;color:var(--ok)" }, "€660")))) },
      { title: "Reasoning models", truth: "SKETCH",
        text: "[[reasoning-model|Reasoning models]] are trained (M11) to think at length before answering, spending thousands of tokens on hidden working. Their accuracy keeps rising as they spend more thinking tokens: [[test-time-compute|test-time compute]]. It is {law:l9} turned into a strategy: buy more computation with more tokens.",
        frontier: "The written reasoning is not always a faithful account of what drove the answer: studies have found models reaching answers for reasons their visible reasoning does not mention. Whether and how to make reasoning faithful is open research.",
        visual: (el) => el.append(k.chart([{ pts: [[100, 0.32], [300, 0.45], [1000, 0.58], [3000, 0.68], [10000, 0.74]], color: "var(--seine)" }], { W: 460, H: 180, logx: true, xmin: 100, xmax: 10000, ymin: 0, ymax: 1, xlabel: "thinking tokens (log scale)", ylabel: "share of hard problems solved", yfmt: (v) => Math.round(v * 100) + "%" }), h("p", { class: "faint", style: "font-size:.86rem" }, "Sketch of the typical shape reported for reasoning models: steady gains as thinking grows, with diminishing returns.")) },
      { title: "Lost in the middle", truth: "SKETCH",
        text: "A huge window does not mean everything in it is used well. Studies place one key fact at different depths of a long prompt: models use it most reliably near the start or the end, and less reliably in the middle. Softmax spreads attention thin over many tokens.",
        visual: (el) => el.append(k.chart([{ pts: [[0, 0.75], [25, 0.6], [50, 0.53], [75, 0.6], [100, 0.72]], color: "var(--line1)", dots: [[0, 0.75], [50, 0.53], [100, 0.72]] }], { W: 460, H: 170, ymin: 0.4, ymax: 0.8, xlabel: "where the fact sits in the prompt (start → end)", ylabel: "answered correctly", yfmt: (v) => Math.round(v * 100) + "%", xfmt: (v) => v + "%" }), h("p", { class: "faint", style: "font-size:.86rem" }, "Sketch of the U-shape reported in “Lost in the Middle” (Liu and colleagues, 2023). Newer models have flattened it, but not removed it.")) },
      { kind: "snap", title: "Back to Maya: how it “remembered”", truth: "SKETCH",
        text: "Last week, the app saved a note: “Maya, dislikes early flights.” Today, the app pasted that note into the context before her first message. The model read it, like any other text. Nothing in the model learned anything ({law:l3}, {law:l4}). Memory across chats is engineering around the model. Phase 2 builds exactly this.",
        visual: (el) => el.append(h("div", { class: "toks" }, [["<|system|>", 1], ["You are a travel helper.", 0], ["Saved notes: name Maya; dislikes early flights.", 0], ["<|user|>", 1], ["Hi again!", 0]].map(([t, sp]) => MM.tok(t, { color: sp ? "var(--llm)" : t.startsWith("Saved") ? "var(--data)" : null })))) }],
    lab: {
      title: "The Loop Runner and the Context Bucket", truth: "TOY",
      intro: "Step Maya-LM through generation one token at a time, with and without its KV cache, and time each step on your own device. Then fill its 32-token window until Maya's name falls out.",
      tries: ["Generate 15 tokens with the cache on, then reset and do it with the cache off. Compare the time per token.", "Watch the cache fill: how many numbers are stored after 20 tokens?", "In the Context Bucket, find the exact length where “she” stops winning.", "Why does the model guess “he” rather than staying unsure?"],
      async mount(el, api) {
        const lm = await api.lm();
        const st = { cache: true, ids: [], c: null, times: [], gen: [] };
        const text = h("div", { class: "mono", style: "font-size:.92rem;line-height:1.7;min-height:3.4em" });
        const shelf = h("div", { class: "row", style: "--gap:2px;flex-wrap:wrap;margin-top:8px" });
        const meta = h("div", { class: "mono", style: "font-size:.86rem;color:var(--ink-2)", "aria-live": "polite" });
        const chart = h("div");
        function reset() {
          st.ids = lm.encode(SPINE).ids; st.gen = []; st.times = [];
          st.c = lm.cacheStart();
          const t0 = now();
          if (st.cache) st.ids.forEach((id) => (st.lastLogits = lm.stepCached(st.c, id)));
          else st.lastLogits = lm.run(st.ids).logits[st.ids.length - 1];
          st.prefill = now() - t0;
          draw();
        }
        function step() {
          if (st.ids.length >= lm.cfg.ctx) { MM.toast("Maya-LM's window is full: 32 tokens."); return false; }
          const p = lm.softmax(st.lastLogits);
          let next = 0; for (let j = 1; j < p.length; j++) if (p[j] > p[next]) next = j;
          st.ids.push(next); st.gen.push(lm.vocab[next]);
          const t0 = now();
          if (st.cache) st.lastLogits = lm.stepCached(st.c, next);
          else st.lastLogits = lm.run(st.ids).logits[st.ids.length - 1];
          st.times.push([st.ids.length, now() - t0]);
          draw(); api.done();
          return true;
        }
        function draw() {
          text.textContent = "";
          text.append(SPINE + " ", h("strong", null, st.gen.map(label).join(" ")));
          shelf.innerHTML = "";
          const n = st.cache ? st.c.len : 0;
          for (let i = 0; i < st.ids.length; i++) shelf.append(h("span", { title: label(lm.vocab[st.ids[i]]), style: `width:14px;height:22px;border-radius:3px;display:inline-block;background:${i < n ? "color-mix(in srgb, var(--seine) 60%, var(--zero))" : "var(--rule-2)"};border:1px solid var(--rule)` }));
          meta.textContent = st.cache ? `cache on · ${n} tokens cached · ${(n * 512).toLocaleString("en-GB")} numbers stored · prefill ${st.prefill.toFixed(1)} ms` : `cache off · every step re-reads all ${st.ids.length} tokens · prefill ${st.prefill.toFixed(1)} ms`;
          chart.innerHTML = "";
          if (st.times.length > 1) chart.append(k.chart([{ pts: st.times, color: st.cache ? "var(--seine)" : "var(--bad)", dots: st.times }], { W: 460, H: 160, ymin: 0, xlabel: "tokens in context", ylabel: "ms for this token (your device)" }));
        }
        const cacheSeg = MM.seg([{ label: "KV cache on", value: true }, { label: "KV cache off", value: false }], true, (v) => { st.cache = v; reset(); }, "KV cache");
        const one = h("button", { class: "btn small primary" }, "Next token");
        one.onclick = step;
        const many = h("button", { class: "btn small" }, "Run to the end of the window");
        many.onclick = () => { let i = 0; const go = () => { if (i++ < 30 && step() && el.isConnected) setTimeout(go, MM.reducedMotion() ? 0 : 60); }; go(); };
        el.append(h("h3", null, "1 · The Loop Runner"), h("div", { class: "row", style: "margin:8px 0" }, cacheSeg, one, many, h("button", { class: "btn small ghost", onclick: reset }, "Reset")), text, shelf, meta, chart);
        reset();
        const bucketBox = h("div");
        const drawBucket = (v) => { bucketBox.innerHTML = ""; bucket(bucketBox, lm, v); api.done(); };
        el.append(h("hr", { class: "rule" }), h("h3", null, "2 · The Context Bucket"), h("p", { class: "muted", style: "margin:4px 0 8px" }, "Add “very”s to the sentence. Greyed tokens have fallen out of Maya-LM's 32-token window."), MM.slider({ label: "“very” ×", min: 0, max: 16, value: 8, onInput: drawBucket }), bucketBox);
        drawBucket(8);
      } },
    breakit: {
      title: "Lose the cache, overflow the window", truth: "TOY",
      intro: "Two ways the loop goes wrong. Both are measured on the real Maya-LM.",
      cases: [
        { name: "Turn off the KV cache", what: "Recompute every earlier token at every step.", action: "Turn it off", result: "Each new token takes longer than the last: in our measurement, a full pass over 5 tokens took 3.3 ms and over 30 tokens 16.4 ms, while a cached step stayed near 0.6 ms. Try it in the Loop Runner on your own device.", why: "Without the cache, generating n tokens repeats the work for all earlier tokens: total work grows with n² instead of n." },
        { name: "Overflow the window", what: "Lengthen the sentence until “Maya” slides out of the 32-token window.", action: "Overflow it", result: "Inside the window: “she” 100%. Once “Maya” drops out: “he” 63%. Once “her” drops out too: “he” 97%.", why: "Nothing outside the window exists for the model ({law:l3}). Losing its cue, it falls back on a default that training made common. Real apps trim, summarise or retrieve to keep key facts inside the window." }],
      explain: { q: "A chatbot forgets the user's name halfway through a very long conversation. What is the most likely cause?", options: ["The model's weights were reset", "The name fell outside the context window (or was trimmed away)", "The sampler used a high temperature", "The tokeniser lost the name"], answer: 1, why: "The model only sees its window. Apps must keep important facts inside it." } },
    clinic: [
      { belief: "It remembers our last chat by itself.", test: "Every call starts from frozen weights and an empty context. In the Context Bucket, as soon as “Maya” leaves the window, the model behaves as if she never existed.", truth: "Apps save text and paste it back into the context. The model itself remembers nothing between calls ({law:l3}, {law:l4})." },
      { belief: "In-context learning changes the model.", test: "Maya-LM copies a never-seen list perfectly, then the next call starts with exactly the same 214,208 numbers, unchanged.", truth: "In-context learning lives in the activations of this one call. Close the call and it is gone." },
      { belief: "Chain-of-thought is only for show.", test: "Each written step is another full pass through every layer whose result is fed back as input. Ask for an answer in one token and the model gets one pass; ask for steps and it gets many.", truth: "It adds real computation ({law:l9}). (Frontier: the visible steps are not always a faithful account of what drove the answer.)" }],
    explain: { prompt: "How does a chatbot hold a conversation if the model keeps nothing between calls? Include what limits what it can remember.", points: ["Each token is one full trip through the model; the token is appended and the loop repeats", "The model only uses its weights and the context window (two memories)", "The app re-sends the conversation (and saved notes) every call", "Anything outside the window does not exist for the model", "The KV cache saves keys and values so earlier tokens are not recomputed"] },
    skeptic: [
      { q: "It remembered my name from last week, so it learns from me!", laws: ["l3", "l4"], a: "The app saved your name as text and put it back into the context window today ({law:l3}). The model's weights have not changed since training ({law:l4}). Turn the app's memory feature off and the model will not know you.", ladder: ["Why can't the model just store it? During use, weights are only read, never written.", "Couldn't the company train on my chats? Where allowed, chats can become data for a future model: that is new training, offline, months later.", "So where is the memory? In an ordinary database run by the app, which Phase 2 builds as the Store."] },
      { q: "Isn't the KV cache a third kind of memory?", laws: ["l3"], a: "No. It holds the keys and values of tokens that are already in the context, saved so they need not be recomputed. Delete it and the model recomputes exactly the same numbers from the context. It is the context in a ready-to-use form, not new knowledge ({law:l3}, expert version)." },
      { q: "Why does “think step by step” help?", laws: ["l9"], a: "Every token gets the same fixed number of layers ({law:l9}). A hard problem may need more sequential steps than one pass can do. Writing steps out turns each intermediate result into input for the next pass, so the model can chain many passes together." }],
    recall: [
      { q: "What is the context window?", options: ["The model's training data", "The most tokens the model can see at once", "The screen of the chat app", "The KV cache size on disk"], answer: 1, level: 1, why: "Its working memory for one call." },
      { q: "Why does the KV cache speed up generation?", options: ["It stores the answer", "It saves earlier tokens' keys and values so they are not recomputed", "It makes the model smaller", "It skips layers"], answer: 1, level: 2, why: "Earlier tokens do not change, so their keys and values can be reused." },
      { q: "In Maya-LM, “Maya” and “her” fall out of the 32-token window. What does it predict after “…so”?", options: ["“she”, from memory", "“he”, up to 97%", "Nothing", "“Maya”"], answer: 1, level: 3, why: "With no cue left in the window, it falls back on its default." },
      { q: "True or false: decoding speed is mostly limited by how fast the GPU can do arithmetic.", options: ["True", "False: each step must read all active weights and the cache from memory, so memory speed limits it"], answer: 1, level: 4, why: "Decode is memory-bound; prefill is compute-bound." },
      { q: "From M8: you get two different answers to the same question. Why?", options: ["The weights changed", "The sampler drew differently from the same chances", "The context window was full", "The tokeniser is random"], answer: 1, level: 5, why: "Law 11, inside the loop of M9." }],
    depth: [
      ["Two different bottlenecks", "Prefill handles all prompt tokens at once: big matrix multiplications, limited by raw compute. Decoding makes one token at a time, and each step must read every active weight and the whole KV cache, so it is limited by memory speed."],
      ["A back-of-envelope check", "A 70-billion-parameter model in 16-bit numbers is 140 GB. At about 3 TB per second, one full read takes about 47 ms: roughly 20 tokens per second for one user. Servers batch many users so each read serves them all."],
      ["Two speed numbers", "Time to first token (mostly prefill) and time per output token (decoding). They improve in different ways."],
      ["Serving tricks", "Continuous batching adds and removes requests at every step. Paged KV caches (vLLM, 2023) store each conversation's cache in small pages. Prompt caching keeps the cache of a repeated opening, so stable system prompts go first."],
      ["What limits the window", "Training (which positions the model has practised), memory (the KV cache) and quality (attention spread thin). Ways to extend it: RoPE scaling, training on long texts, sliding-window layers and hybrid models."],
      ["How in-context learning might work", "Induction heads copy patterns from earlier in the prompt, and research shows attention can carry out something like a small learning step on the prompt's examples. The evidence is real but partial."],
      ["Why thinking out loud helps", "A model has a fixed number of layers per token. Written steps feed its own results back in as input, so it can do more sequential reasoning than one pass allows. Reasoning models improve as they spend more thinking tokens."],
      ["Memory across chats is engineering", "Products save summaries or facts and put them back into the context. Nothing in the weights changes."]],
    connect: { links: ["The context window is each agent's whole world in Phase 2: {law:g8}, {mod:a07}.", "Saved notes pasted into the context become the Store's long-term memory: {mod:a08}.", "Retrieval puts the right facts into the window on purpose: {mod:m12}."], line: "You now know how the machine runs. Next: where all its numbers came from, starting from random." }
  });

  function decodeCalc(el) {
    const st = { params: 70, bits: 16, bw: 3 };
    const out = h("div", { class: "mono", style: "font-size:.92rem;white-space:pre-wrap;margin-top:8px", "aria-live": "polite" });
    const draw = () => { const gb = st.params * st.bits / 8; const ms = gb / (st.bw * 1000) * 1000; out.textContent = `weights: ${st.params} billion × ${st.bits} bits = ${gb.toFixed(0)} GB\none read at ${st.bw} TB/s = ${ms.toFixed(0)} ms\n≈ ${(1000 / ms).toFixed(0)} tokens per second for one user`; };
    el.append(MM.slider({ label: "parameters (billions)", min: 1, max: 400, value: st.params, onInput: (v) => { st.params = v; draw(); } }), MM.slider({ label: "bits per weight", min: 4, max: 16, step: 4, value: st.bits, onInput: (v) => { st.bits = v; draw(); } }), MM.slider({ label: "memory speed (TB/s)", min: 0.5, max: 8, step: 0.5, value: st.bw, onInput: (v) => { st.bw = v; draw(); } }), out);
    draw();
  }
})();
