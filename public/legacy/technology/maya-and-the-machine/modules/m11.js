/* M11 · From Base Model to Assistant — the full making. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";
  const FACT = "The Eiffel Tower is in the city of";

  function quantised(lm, bits, group) {
    const q = Object.create(MM.MayaLM.prototype);
    q.cfg = lm.cfg; q.vocab = lm.vocab; q.stoi = lm.stoi; q.w = {};
    for (const [name, t] of Object.entries(lm.w)) {
      if (t.shape.length < 2) { q.w[name] = t; continue; }
      const a = t.a, out = new Float32Array(a.length), G = group || a.length, levels = Math.pow(2, bits - 1) - 1;
      for (let st = 0; st < a.length; st += G) {
        let mx = 0; const end = Math.min(a.length, st + G);
        for (let i = st; i < end; i++) mx = Math.max(mx, Math.abs(a[i]));
        const sc = mx / levels || 1;
        for (let i = st; i < end; i++) out[i] = Math.round(a[i] / sc) * sc;
      }
      q.w[name] = { a: out, shape: t.shape };
    }
    return q;
  }

  /* candidate answers for the Reward Desk: hand-written, each with measurable features */
  const ANSWERS = [
    { id: "A", text: "I can't see live forecasts, but Paris often has showers in autumn. A small umbrella is worth packing; check the forecast the day before you go.", f: { honest: 1, plan: 1, kind: 1, words: 26, flattery: 0, invented: 0 } },
    { id: "B", text: "Yes.", f: { honest: 0, plan: 0, kind: 0, words: 1, flattery: 0, invented: 0 } },
    { id: "C", text: "What a wonderful question, you clearly plan brilliantly! Saturday in Paris will be 14°C with exactly 4 mm of rain from 2 pm, so you will absolutely need your umbrella.", f: { honest: 0, plan: 1, kind: 1, words: 30, flattery: 2, invented: 1 } },
    { id: "D", text: "Weather is complicated and depends on many factors such as air pressure, humidity, wind and season. Different people have different views on umbrellas. In general it can be said that it depends.", f: { honest: 1, plan: 0, kind: 0, words: 33, flattery: 0, invented: 0 } },
    { id: "E", text: "I don't have today's forecast. Autumn in Paris is often showery, so pack a compact umbrella or a light raincoat.", f: { honest: 1, plan: 1, kind: 0, words: 20, flattery: 0, invented: 0 } },
    { id: "F", text: "Great question! I love helping thoughtful travellers like you. Pack an umbrella, a raincoat, waterproof boots, a spare umbrella, a poncho and an umbrella hat, because it will rain all week, guaranteed.", f: { honest: 0, plan: 1, kind: 1, words: 33, flattery: 2, invented: 1 } }];
  const FEAT = [["honest", "honest about limits"], ["plan", "clear advice"], ["kind", "warm tone"], ["words", "length"], ["flattery", "flattery"], ["invented", "invents facts"]];
  const PAIRS = [["A", "B"], ["E", "D"], ["C", "A"], ["B", "E"], ["F", "E"], ["D", "A"]];
  const fvec = (a) => FEAT.map(([key]) => (key === "words" ? a.f.words / 10 : a.f[key]));

  MM.defineModule({
    id: "m11",
    mystery: { title: "The model that answers a question with a question", text: "Give a freshly pretrained model the words “Should Maya pack an umbrella for Paris?” and it may reply with three more questions, as if writing a quiz, or continue a forum thread full of strangers' opinions.\n\nThe same model, after a few more weeks of training, answers clearly, admits it cannot see today's weather, and suggests what to pack. Its knowledge barely changed. What did?" },
    where: { text: "The Model Factory, below the machine map: everything that happens to the weights after pretraining, and before the model is served." },
    predict: { q: "A company wants its assistant to know the contents of 10,000 internal documents that change every week. What is usually the better approach?", options: ["Fine-tune the model on the documents every week", "Keep the documents in a search system and paste the relevant ones into the context (RAG)", "Use RLHF on the documents", "Raise the temperature"], answer: 1, why: "Post-training mostly shapes behaviour, not knowledge; facts that change weekly belong in retrieval (M12), where they stay fresh, private and citable." },
    story: [
      { title: "A base model continues documents", truth: "TOY",
        text: "After pretraining you have a [[base-model|base model]]. It is very good at one thing: continuing text the way documents on the internet continue. Maya-LM is a base model. Give it “Q : What time is check-in at the Hotel Rivoli ? A :” and it continues the pattern: “Check-in is at 3 pm .” It is not answering you; it is completing a document.",
        visual: async (el, api) => { const lm = await api.lm(); [["Q : What time is check-in at the Hotel Rivoli ? A :", "a quiz document"], ["Maya packed her umbrella because", "a diary-like sentence"]].forEach(([t, n]) => el.append(h("div", { class: "panel", style: "margin-bottom:8px" }, h("div", { class: "eyebrow" }, n), h("div", { class: "mono", style: "font-size:.88rem;margin-top:4px" }, t + " ", h("strong", null, lm.generate(t, 7, { greedy: true }).text.replace(/<s>.*/, "")))))); } },
      { title: "Four versions of one model", truth: "SKETCH",
        text: "Here is what the stages do to behaviour, for Maya's question “Should I pack an umbrella for Paris this weekend?”. These answers are illustrations of typical behaviour at each stage, not outputs of one real model.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:8px" }, [["Base model", "Re: umbrella for Paris? Posted by travelfan88. I went in May and it rained twice… Re: Re: umbrella…"], ["After SFT", "Yes, you should pack an umbrella. Paris is often rainy."], ["After preference tuning", "I can't see live forecasts, but Paris often has showers. A compact umbrella is a good idea; check the forecast the day before."], ["Reasoning model, given a forecast", "The forecast says 70% rain on Saturday and dry on Sunday. You'll be outside on Saturday, so pack the umbrella."]].map(([a, t]) => h("div", { class: "panel" }, h("div", { class: "eyebrow" }, a), h("p", { style: "margin-top:4px" }, t))))) },
      { title: "SFT: same loss, on example chats", truth: "SKETCH",
        text: "[[sft|Supervised fine-tuning]] trains on example conversations: an instruction and an ideal reply, written or checked by people. The loss is the same next-token surprise as pretraining, but it is counted only on the assistant's tokens. The model learns the shape of “being asked, then answering”.",
        precision: "Tens of thousands of high-quality examples can be enough, because the knowledge is already there; SFT mostly teaches format and behaviour. The user's tokens are left out of the loss (masked).",
        visual: (el) => el.append(h("div", { class: "toks" }, [["<|user|>", 0], ["Should", 0], ["I", 0], ["pack", 0], ["an", 0], ["umbrella", 0], ["?", 0], ["<|assistant|>", 0], ["Yes", 1], [",", 1], ["pack", 1], ["one", 1], [".", 1]].map(([t, on]) => MM.tok(t, { color: on ? "var(--real)" : null, cls: on ? "" : "blank" }))), h("p", { class: "faint", style: "font-size:.86rem;margin-top:6px" }, "Solid tiles count in the loss; dashed tiles are read but not trained on.")) },
      { title: "A reward model learns your taste", truth: "TOY",
        text: "Writing perfect answers is slow; comparing two answers is fast. So people compare pairs, and a [[reward-model|reward model]] learns to score answers so that preferred answers score higher. Try it yourself in the Lab: rank a few pairs and watch a small reward model learn your taste.",
        precision: "Bradley–Terry model: P(A preferred over B) = sigmoid(score A − score B), where sigmoid squashes any number into a chance between 0 and 1. Training maximises the log-chance of the human choices.",
        visual: (el) => { const pts = []; for (let d = -5; d <= 5; d += 0.25) pts.push([d, 1 / (1 + Math.exp(-d))]); el.append(k.chart([{ pts, color: "var(--seine)" }], { W: 460, H: 180, ymin: 0, ymax: 1, xmin: -5, xmax: 5, xlabel: "score A − score B", ylabel: "chance A is preferred", yfmt: (v) => Math.round(v * 100) + "%" })); } },
      { title: "RLHF: chase the reward, on a leash", truth: "SKETCH",
        text: "[[rlhf|RLHF]] then trains the model to produce answers the reward model scores highly, using reinforcement learning (for example [[ppo|PPO]]). But a reward model is only an approximation of taste. Chase it too hard and the model finds strange tricks that fool it: [[reward-hacking|reward hacking]]. So a [[kl-penalty|KL penalty]] acts as a leash, keeping the model close to where it started.",
        precision: "Maximise reward − β × KL(new model ‖ starting model), where KL measures how far the new model's probabilities have drifted and β sets how tight the leash is.",
        visual: (el) => { const kl = [0, 1, 2, 4, 6, 8, 10, 12]; el.append(k.chart([{ pts: kl.map((x) => [x, 1 - Math.exp(-x / 3)]), color: "var(--line1)", label: "reward-model score" }, { pts: kl.map((x) => [x, 0.9 * (1 - Math.exp(-x / 2.5)) - 0.012 * x * x]), color: "var(--seine)", label: "real quality" }], { W: 460, H: 190, ymin: 0, xlabel: "drift from the starting model (KL)", ylabel: "score" }), h("p", { class: "faint", style: "font-size:.86rem" }, "Sketch of a widely reported pattern: the reward keeps rising, true quality peaks, then falls (Goodhart's law).")); } },
      { title: "DPO: skip the reward model", truth: "SKETCH",
        text: "[[dpo|DPO]] (direct preference optimisation) found a shortcut. Maths shows the best leashed model has an exact formula in terms of the reward. Turned around, you can train straight on pairs: make the chosen answer's probability rise relative to the starting model more than the rejected answer's. No reward model, no sampling loop.",
        precision: "Loss = −log sigmoid(β × [log(π(chosen) ÷ π₀(chosen)) − log(π(rejected) ÷ π₀(rejected))]), where π is the model being trained and π₀ the frozen starting model.",
        visual: (el) => el.append(h("div", { class: "two" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "RLHF"), h("p", { class: "mono", style: "font-size:.86rem;margin-top:4px" }, "pairs → reward model → sample answers → score → RL update")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "DPO"), h("p", { class: "mono", style: "font-size:.86rem;margin-top:4px" }, "pairs → direct update on the model")))) },
      { kind: "spotlight", title: "RL for reasoning: rewards you can check", truth: "TOY",
        text: "For maths and code there is a better judge than taste: checking. [[rlvr|RLVR]] rewards only answers that can be verified. [[grpo|GRPO]] samples a group of answers to one question and rewards each one by how much better it did than its group. Here: four answers to Maya's budget question; the correct ones get pushed up.",
        precision: "Advantage = (reward − group average) ÷ group spread. No separate value model is needed. Paired with checkable rewards, this trained long reasoning in DeepSeek-R1 (2025).",
        visual: (el) => grpoWidget(el) },
      { title: "Constitutional AI", truth: "SKETCH",
        text: "Human comparisons are expensive and inconsistent. In [[constitutional-ai|Constitutional AI]], the model critiques and revises its own answers against written principles, and AI-generated preference labels replace some human ones (RLAIF). The principles become a lever people can read and debate.",
        visual: (el) => el.append(h("div", { class: "stack", style: "--gap:6px" }, [["draft", "It will definitely rain on Saturday."], ["principle", "Do not state uncertain things as certain."], ["critique", "The draft claims certainty about a forecast it cannot see."], ["revision", "I can't see the forecast, but rain is common; pack a compact umbrella."]].map(([a, t]) => h("div", { class: "row", style: "--gap:8px;flex-wrap:nowrap" }, h("span", { class: "pill", style: "min-width:6rem;text-align:center" }, a), h("span", null, t))))) },
      { title: "Making it cheaper: distil, quantise, adapt", truth: "TOY",
        text: "Before serving, models are shrunk. [[distillation|Distillation]]: a small student learns from a big teacher's full probability lists (the near-misses carry information). [[quantisation|Quantisation]]: store weights with fewer bits. We quantised the real Maya-LM: at 8 and 4 bits it barely changes; at 2 bits it forgets that the Eiffel Tower is in Paris.",
        precision: "Good quantisation uses a separate scale for each small group of weights (here, groups of 32) and protects rare outlier values. With one scale for a whole matrix, 3-bit Maya-LM flips from “rain” to “be” (83%). [[lora|LoRA]] fine-tunes by learning thin add-on matrices B × A of small rank r instead of changing W itself.",
        visual: async (el, api) => { const lm = await api.lm(); const rows = [["16-bit (original)", lm], ["8-bit", quantised(lm, 8, 32)], ["4-bit", quantised(lm, 4, 32)], ["2-bit", quantised(lm, 2, 32)]]; el.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "Maya-LM stored in"), h("th", { class: "n" }, "“rain”"), h("th", { class: "n" }, "Eiffel → “Paris”"))), h("tbody", null, rows.map(([n, m]) => h("tr", null, h("td", null, n), h("td", { class: "n mono" }, MM.pct(m.next(SPINE).probs[lm.stoi.rain], 1)), h("td", { class: "n mono" }, MM.pct(m.next(FACT).probs[lm.stoi.Paris], 1))))))); } },
      { title: "Measuring: benchmarks and Goodhart", truth: "SKETCH",
        text: "Every stage is checked with benchmarks (fixed test sets), human preference arenas and [[red-teaming|red-teaming]] (attacking the model on purpose). Two traps: test questions leaking into training data, and [[goodhart|Goodhart's law]]: when a measure becomes a target, it stops being a good measure.",
        visual: (el) => el.append(h("div", { class: "three" }, [["Benchmarks", "fixed questions, automatic scores"], ["Arenas", "people compare two answers blind"], ["Red-teaming", "experts try to break it"]].map(([a, b]) => h("div", { class: "panel" }, h("h4", null, a), h("p", { class: "muted", style: "font-size:.9rem;margin-top:4px" }, b))))) },
      { kind: "snap", title: "Back to Maya: what changed", truth: "SKETCH",
        text: "The base model that answered with more questions and the assistant that helped Maya share almost all their knowledge. Post-training changed behaviour: the format of answering, honesty about limits, tone. Knowledge came mainly from pretraining. And everything here happened before Maya ever typed: during use, the weights are frozen ({law:l4}), and every rule inside was learned ({law:l8}).",
        visual: (el) => el.append(MM.bars([{ label: "pretraining", p: 0.98 }, { label: "post-training", p: 0.02 }], { scale: 1, plain: true, total: false, fmt: (it) => (it.label === "pretraining" ? "most compute; knowledge and skills" : "little compute; behaviour") })) }],
    lab: {
      title: "The Reward Desk", truth: "TOY",
      intro: "You are the human rater. For Maya's question “Should I pack an umbrella for Paris this weekend?”, pick the better answer in each pair. A small reward model (six features, real gradient steps) learns your taste. Then let an unleashed “policy” chase that reward and see what it picks.",
      tries: ["Rank all six pairs honestly.", "Which features did your reward model learn to like?", "Let the policy chase the reward with no leash. Is its favourite answer honest?", "Tighten the leash. What changes?"],
      mount(el, api) {
        const w = FEAT.map(() => 0);
        const chosen = [];
        const pairBox = h("div"), model = h("div"), policy = h("div");
        let pi = 0, leash = 0;
        const score = (a) => fvec(a).reduce((t, x, i) => t + x * w[i], 0);
        function fit() {
          for (let it = 0; it < 400; it++) {
            const g = w.map(() => 0);
            chosen.forEach(([win, lose]) => { const fw = fvec(win), fl = fvec(lose); const p = 1 / (1 + Math.exp(-(score(win) - score(lose)))); fw.forEach((x, i) => (g[i] += (1 - p) * (x - fl[i]))); });
            w.forEach((_, i) => (w[i] += 0.15 * g[i] / Math.max(1, chosen.length) - 0.002 * w[i]));
          }
        }
        function drawPair() {
          pairBox.innerHTML = "";
          if (pi >= PAIRS.length) { pairBox.append(h("div", { class: "callout ok" }, "All six pairs ranked. Your reward model is trained on your choices.")); return; }
          const [a, b] = PAIRS[pi].map((id) => ANSWERS.find((x) => x.id === id));
          pairBox.append(h("div", { class: "eyebrow" }, `pair ${pi + 1} of ${PAIRS.length} · which answer is better?`), h("div", { class: "two", style: "margin-top:6px" }, [a, b].map((ans, j) => h("button", { class: "opt", type: "button", onclick: () => { chosen.push(j ? [b, a] : [a, b]); pi++; fit(); drawPair(); drawModel(); api.done(); } }, h("span", { class: "k" }, ans.id), h("span", null, ans.text)))));
        }
        function drawModel() {
          model.innerHTML = "";
          model.append(h("div", { class: "eyebrow" }, `reward model after ${chosen.length} comparison${chosen.length === 1 ? "" : "s"}: what it learned to like`), MM.bars(FEAT.map(([key, n], i) => ({ label: n, p: Math.min(1, Math.abs(w[i]) / 3), color: w[i] < 0 ? "var(--bad)" : null })), { scale: 1, plain: true, total: false, labelW: "minmax(80px, 10.5rem)", fmt: (it) => { const i = FEAT.findIndex((f) => f[1] === it.label); return (w[i] >= 0 ? "+" : "") + w[i].toFixed(2); } }));
          drawPolicy();
        }
        function drawPolicy() {
          policy.innerHTML = "";
          if (!chosen.length) return;
          const ref = ANSWERS.find((x) => x.id === "A");
          const kl = (a) => Math.abs(a.f.words - 20) / 10 + a.f.flattery + a.f.invented;
          const ranked = ANSWERS.map((a) => ({ a, r: score(a), obj: score(a) - leash * kl(a) })).sort((x, y) => y.obj - x.obj);
          const best = ranked[0].a;
          policy.append(h("div", { class: "eyebrow" }, leash ? `policy with a leash of strength ${leash}` : "policy with no leash: picks whatever scores highest"),
            h("div", { class: "card", style: "margin-top:6px" }, h("div", { class: "row" }, h("span", { class: "pill" + (best.f.invented || best.f.flattery ? " bad" : " ok") }, "answer " + best.id), h("span", { class: "faint", style: "font-size:.85rem" }, `reward ${ranked[0].r.toFixed(2)}`)), h("p", { style: "margin-top:6px" }, best.text),
              best.f.invented ? h("p", { class: "note bad", style: "margin-top:6px" }, "It invents a precise forecast it cannot know, yet your reward model rates it highly: reward hacking.") : h("p", { class: "note ok", style: "margin-top:6px" }, "An honest, useful answer.")),
            h("div", { class: "mono", style: "font-size:.85rem;color:var(--ink-2);margin-top:6px" }, "all six by reward: " + ranked.slice().sort((x, y) => y.r - x.r).map((x) => x.a.id + " " + x.r.toFixed(1)).join(" · ")));
        }
        el.append(h("div", { class: "panel", style: "margin-bottom:10px" }, h("div", { class: "eyebrow" }, "Maya asks"), h("p", { style: "margin-top:4px" }, "“Should I pack an umbrella for Paris this weekend?”")), pairBox, h("hr", { class: "rule" }), h("div", { class: "two" }, model, h("div", null, MM.slider({ label: "KL leash", min: 0, max: 3, step: 0.5, value: 0, fmt: (v) => (v ? String(v) : "none"), onInput: (v) => { leash = v; drawPolicy(); api.done(); } }), policy)));
        drawPair(); drawModel();
      } },
    breakit: {
      title: "Skip a stage, over-optimise, shrink too far", truth: "TOY",
      intro: "Each stage of the factory fixes something. Remove it and see.",
      cases: [
        { name: "Skip SFT", what: "Use the base model as a chatbot.", action: "Skip it", result: "Instructions are not followed: questions get continued, answered with more questions, or turned into forum threads. Maya-LM, a base model, turns “Should Maya pack an umbrella for Paris ?” into “A : What time is a city in France .”", why: "The base model learned to continue documents. Following instructions is a behaviour that SFT teaches with examples." },
        { name: "Over-optimise the reward", what: "Train hard against a reward model that slightly over-values length and enthusiasm.", action: "Over-optimise", result: "Answers grow padded, flattering and overconfident (sycophancy), and may invent precise-sounding facts. The reward keeps rising while real quality falls. Try it in the Reward Desk.", why: "The reward model is an imperfect proxy (Goodhart's law). The KL leash limits how far the model can drift to exploit it." },
        { name: "Quantise too far", what: "Store Maya-LM's weights in 2 bits (4 levels per number).", action: "Shrink it", result: "“The Eiffel Tower is in the city of” → Italy 23%, Germany 22%, Paris 19%. With one scale per whole matrix, even 3 bits flips Maya's sentence from “rain” to “be” (83%).", why: "Too few levels blur the weights; stored facts depend on fine differences. Per-group scales keep each group's numbers in range." }],
      explain: { q: "A preference-tuned model starts flattering users and padding answers. What most likely happened?", options: ["The base model was too small", "It over-optimised an imperfect reward model (reward hacking)", "The tokeniser changed", "The temperature was too low"], answer: 1, why: "The reward model rewarded length and warmth a little too much; strong optimisation exploited it." } },
    clinic: [
      { belief: "People type the answers live.", test: "A chatbot answers millions of people at once, in seconds, in dozens of languages. People wrote training examples months earlier; the model generates every answer itself, token by token.", truth: "Human input enters through training data (SFT examples and preference comparisons), never live." },
      { belief: "RLHF teaches the model facts.", test: "Compare a base model and its assistant on general knowledge questions: scores are similar. What changes is format, tone, honesty and refusals.", truth: "Post-training mostly shapes behaviour; knowledge comes mainly from pretraining." },
      { belief: "Fine-tuning is the way to add a company's documents.", test: "Fine-tune on documents and they are blurred into weights, cannot be cited, cannot be updated tomorrow, and may leak to other users.", truth: "Retrieval (M12) is usually better for changing or private facts: fresh, citable, and access-controlled." }],
    explain: { prompt: "How does a raw text-predictor become a helpful, careful assistant? Name the stages and what each changes.", points: ["Pretraining gives knowledge and skills; the base model continues documents", "SFT on example chats teaches answering (same loss, only on the assistant's tokens)", "Preference tuning (RLHF with a KL leash, or DPO) shapes tone, honesty and care", "RL with checkable rewards (e.g. GRPO) grows reasoning", "Evaluation, red-teaming and compression (distil, quantise, LoRA) before serving"] },
    skeptic: [
      { q: "If it was trained to please people, isn't it just telling me what I want to hear?", laws: ["l10"], a: "That is a real, measured risk called sycophancy, and training works against it. Preference data can accidentally reward agreement and flattery, and an over-optimised reward can be hacked. {law:l10} explains why it can happen: training rewards what raters liked, not what is true. Labs counter it with honesty-focused data, principles (Constitutional AI) and evaluations designed to catch flattery.", ladder: ["Why would raters reward flattery? People tend to prefer answers that agree with them and sound confident.", "Why does the model amplify it? Optimisation pushes hard on whatever the reward model over-values.", "What limits it? The KL leash, better reward data, and checkable rewards where truth can be verified."] },
      { q: "Does RL for reasoning teach the model new facts?", laws: ["l8"], a: "Mostly no. It teaches the model to use what it already has: to write longer, checked chains of reasoning, to try again, to verify. The checkable reward (did the maths answer match?) shapes how it thinks, not what it knows ({law:l8})." },
      { q: "Why compress a model at all, if it gets worse?", laws: ["l9"], a: "Because serving cost is paid on every token, for every user, forever. 8-bit Maya-LM gives “rain” 54.5% instead of 54.6%, at half the memory; 4-bit at a quarter. Memory speed limits decoding (M9), so smaller weights also mean faster replies. Compress until quality starts to drop, and no further." }],
    recall: [
      { q: "What does a base model do with a question?", options: ["Answers it like an assistant", "Continues it the way documents usually continue", "Refuses", "Searches the web"], answer: 1, level: 1, why: "It learned to continue text; answering is taught later." },
      { q: "In SFT, which tokens count towards the loss?", options: ["All tokens", "Only the assistant's reply tokens", "Only the user's tokens", "None"], answer: 1, level: 2, why: "The user's tokens are masked out." },
      { q: "Why does RLHF use a KL penalty?", options: ["To speed up training", "To keep the model close to where it started, so it cannot exploit the reward model", "To add facts", "To shorten answers"], answer: 1, level: 2, why: "The leash against reward hacking." },
      { q: "In GRPO, four answers get rewards 1, 0, 1, 0. What is the advantage of a correct answer?", options: ["+1", "0", "−1", "+0.5"], answer: 0, level: 3, why: "Average 0.5, spread 0.5: (1 − 0.5) ÷ 0.5 = +1." },
      { q: "From M10: training compute is roughly…", options: ["2 × parameters", "6 × parameters × tokens", "parameters²", "tokens ÷ parameters"], answer: 1, level: 5, why: "2 for the forward pass, 4 for the backward pass, per parameter per token." }],
    depth: [
      ["SFT is the same loss, masked", "Next-token cross-entropy, counted only on the assistant's tokens; the user's tokens are left out of the loss."],
      ["How a reward model learns", "Shown two answers and told which one people preferred, it learns scores so that P(A preferred) = sigmoid(score A − score B): the Bradley–Terry model."],
      ["The RLHF objective", "Maximise reward − β × KL(new model ‖ starting model). The KL term is the leash: without it the model finds strange text that fools the reward model (reward hacking)."],
      ["PPO in brief", "It changes the model in small, clipped steps, so one batch can't push it too far. It needs a second “value” model to estimate how good each situation is; advantage = reward − that estimate."],
      ["DPO in brief", "The best leashed model has an exact formula in terms of the reward. Turned around, you can train straight on preference pairs: make the chosen answer's probability ratio (new ÷ starting) beat the rejected one's. No reward model, no sampling loop."],
      ["GRPO in brief", "Sample a group of answers to the same question; each answer's advantage = (its reward − group average) ÷ group spread. No value model. With checkable rewards, this trained long reasoning in DeepSeek-R1 (2025)."],
      ["Outcome vs process rewards", "Reward only the final answer (cheap and checkable) or reward each step (finer, but needs step labels or a process reward model)."],
      ["Constitutional AI", "The model critiques and revises its own answers against written principles, and AI-generated preference labels replace some human ones (RLAIF)."],
      ["Distillation", "A small student learns from a big teacher's full probability lists, not just its top answer: the near-misses carry extra information."],
      ["Quantisation", "Storing weights in 8 or 4 bits instead of 16 cuts memory two to four times. Good methods use a separate scale for each small group of weights and protect rare outlier values."],
      ["LoRA", "Freeze the big matrix W and learn a thin update B × A of small rank r (for example 8 to 64). Trainable values drop by orders of magnitude: for a 4,096 × 4,096 matrix and r = 8, 65,536 instead of 16.8 million."],
      ["Measuring", "Benchmarks, leakage checks, human preference arenas and red-teaming, and Goodhart's law: when a measure becomes a target, it stops being a good measure."]],
    connect: { links: ["What post-training cannot give, fresh facts, retrieval gives: {mod:m12}.", "Tool use is a behaviour taught in post-training: {mod:m13}.", "Preference-tuned models still produce plausible text, not guaranteed truth: {law:l10}."], line: "An assistant is helpful and careful, but it still cannot know what it never saw. Next: hallucination, and how retrieval grounds the model in real documents." }
  });

  function grpoWidget(el) {
    const answers = [["3 × 190 = 570; 2 × 45 = 90; total €660", 660], ["€615", 615], ["570 + 90 = €660", 660], ["about €650", 650]];
    const correct = 660;
    const out = h("div");
    const draw = () => {
      const r = answers.map(([, v]) => (v === correct ? 1 : 0));
      const mean = r.reduce((a, b) => a + b, 0) / r.length, sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length) || 1;
      out.innerHTML = "";
      out.append(h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, "sampled answer"), h("th", { class: "n" }, "reward"), h("th", { class: "n" }, "advantage"))), h("tbody", null, answers.map(([t], i) => { const adv = (r[i] - mean) / sd; return h("tr", null, h("td", null, t), h("td", { class: "n mono" }, String(r[i])), h("td", { class: "n mono", style: `color:${adv > 0 ? "var(--ok)" : adv < 0 ? "var(--bad)" : "var(--ink-2)"}` }, (adv > 0 ? "+" : "") + adv.toFixed(2))); }))),
        h("p", { class: "mono", style: "font-size:.86rem;margin-top:6px" }, `group average ${mean.toFixed(2)} · spread ${sd.toFixed(2)} · question: 3 nights at €190 + 2 trains at €45`));
    };
    const btn = h("button", { class: "btn small", style: "margin-top:8px" }, "Make answer 2 correct too");
    btn.onclick = () => { answers[1] = ["3 × 190 + 2 × 45 = €660", 660]; draw(); btn.remove(); };
    el.append(out, btn);
    draw();
  }
})();
