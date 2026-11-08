/* M2 · The Learning Machine — neural networks in miniature. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;

  /* Maya's 60 days: cloud cover and humidity, and whether she needed her umbrella */
  function days(seed, n) {
    const r = MM.rng(seed), out = [];
    for (let i = 0; i < (n || 60); i++) {
      const c = r(), u = r();
      const p = 1 / (1 + Math.exp(-14 * (c * u - 0.28)));
      out.push([[c * 2 - 1, u * 2 - 1], r() < p ? 1 : 0]);
    }
    return out;
  }
  const DATA = days(42, 60), TEST = days(7, 60);
  const sig = (z) => 1 / (1 + Math.exp(-z));

  function plane(el, o) {
    const S = 300;
    const cv = h("canvas", { width: S * 2, height: S * 2, style: "width:100%;max-width:320px;aspect-ratio:1;border-radius:8px;border:1px solid var(--rule);display:block", role: "img", "aria-label": o.label || "Cloud cover across, humidity up. Circles: no umbrella. Triangles: umbrella needed." });
    el.append(cv);
    const g = cv.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const col = (v) => css.getPropertyValue(v).trim() || "#888";
    function draw(prob, data, line) {
      const neg = col("--neg"), pos = col("--pos"), zero = col("--zero");
      const N = 40, cell = (S * 2) / N;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x = [(i + 0.5) / N * 2 - 1, 1 - (j + 0.5) / N * 2];
        const p = prob(x);
        g.fillStyle = mix(zero, p > 0.5 ? pos : neg, Math.abs(p - 0.5) * 1.1);
        g.fillRect(i * cell, j * cell, cell + 1, cell + 1);
      }
      if (line) { g.strokeStyle = col("--ink"); g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); line(g, S * 2); g.stroke(); g.setLineDash([]); }
      (data || []).forEach(([x, y]) => {
        const px = (x[0] + 1) / 2 * S * 2, py = (1 - (x[1] + 1) / 2) * S * 2;
        g.lineWidth = 2.5; g.strokeStyle = col("--ink");
        g.fillStyle = y ? pos : neg;
        g.beginPath();
        if (y) { g.moveTo(px, py - 11); g.lineTo(px + 10, py + 8); g.lineTo(px - 10, py + 8); g.closePath(); } else g.arc(px, py, 8, 0, 7);
        g.fill(); g.stroke();
      });
    }
    return { draw, canvas: cv };
  }
  function mix(a, b, t) {
    const pa = parse(a), pb = parse(b);
    t = Math.max(0, Math.min(1, t));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
  }
  function parse(c) {
    if (c.startsWith("#")) { const n = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); }
    const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  }
  function lineFor(w1, w2, b) {
    return (g, S) => {
      // w1*x + w2*y + b = 0 in [-1,1]²; canvas x = (x+1)/2*S, y = (1-(y+1)/2)*S
      const pts = [];
      [-1, 1].forEach((x) => { if (Math.abs(w2) > 1e-6) pts.push([x, -(w1 * x + b) / w2]); });
      if (Math.abs(w2) <= 1e-6 && Math.abs(w1) > 1e-6) { const x = -b / w1; pts.push([x, -1], [x, 1]); }
      if (pts.length < 2) return;
      g.moveTo((pts[0][0] + 1) / 2 * S, (1 - (pts[0][1] + 1) / 2) * S);
      g.lineTo((pts[1][0] + 1) / 2 * S, (1 - (pts[1][1] + 1) / 2) * S);
    };
  }
  const xent = (prob, data) => data.reduce((t, [x, y]) => { const p = Math.min(1 - 1e-6, Math.max(1e-6, prob(x))); return t - (y ? Math.log(p) : Math.log(1 - p)); }, 0) / data.length;
  const acc = (prob, data) => data.filter(([x, y]) => (prob(x) > 0.5 ? 1 : 0) === y).length / data.length;

  MM.defineModule({
    id: "m02",
    mystery: { title: "Nobody wrote a single rule", text: "Maya-LM contains 214,208 numbers. When training began, every one of them was random, and it wrote “Maya Maya Maya Maya…”. Nobody ever typed a rule like “umbrella means rain”. Yet now it predicts “rain”.\n\nSo where did the rule come from? How can a machine learn a pattern that nobody wrote down?" },
    where: { text: "This station is about the left side of the machine map: training, which set every number in the model before anyone used it." },
    predict: { q: "A tiny network starts with random numbers (its “knobs”). It is shown Maya's 60 days of weather, each marked “umbrella” or “no umbrella”. What does training actually do to the knobs?",
      options: ["Tries random settings until one happens to work", "Turns every knob a tiny bit in whichever direction makes the error smaller, again and again", "Stores the 60 days in a table and looks them up", "Asks a programmer to adjust them"], answer: 1,
      why: "That is gradient descent. Calculus gives, for every knob at once, the direction that reduces the error. Small steps in that direction, repeated thousands of times, are all that learning is." },
    story: [
      { title: "One neuron", truth: "SKETCH",
        text: "A [[neuron]] (one tiny unit of a network) does simple arithmetic. It multiplies each input by a [[weight]] (an adjustable number), adds them up with a [[bias]] (a starting offset), then bends the result. Here: cloud cover and humidity go in; a chance of needing an umbrella comes out.",
        intuition: "A recipe that says how much each ingredient counts, then rounds the result into a yes-or-no feeling.", breaks: "A recipe is written by a cook. A neuron's weights are found by training.",
        precision: "output = σ(w₁x₁ + w₂x₂ + b), where σ is a bend such as the sigmoid 1/(1+e^(−z)). With w = (1.5, 2.0), b = −1.0, x = (0.8, 0.6): z = 1.2 + 1.2 − 1.0 = 1.4, σ(1.4) ≈ 0.80.",
        visual: (el) => { const svg = s("svg", { viewBox: "0 0 420 170", class: "figure", role: "img", "aria-label": "A neuron with two inputs" }); [["cloud 0.8", 40], ["humidity 0.6", 120]].forEach(([t, y], i) => { svg.append(s("rect", { x: 6, y: y - 18, width: 120, height: 36, rx: 8, fill: "var(--sheet)", stroke: "var(--rule)" }), s("text", { x: 66, y: y + 5, "text-anchor": "middle", "font-size": 14, text: t }), s("line", { x1: 126, y1: y, x2: 236, y2: 85, stroke: "var(--ink-3)", "stroke-width": 2 }), s("text", { x: 170, y: y + (i ? -14 : 22), "font-size": 13, class: "t-mono", fill: "var(--seine)", text: "× " + (i ? "2.0" : "1.5") })); }); svg.append(s("circle", { cx: 270, cy: 85, r: 36, fill: "color-mix(in srgb, var(--seine) 14%, var(--sheet))", stroke: "var(--seine)", "stroke-width": 2 }), s("text", { x: 270, y: 80, "text-anchor": "middle", "font-size": 12, class: "t-mono", text: "sum − 1.0" }), s("text", { x: 270, y: 98, "text-anchor": "middle", "font-size": 12, class: "t-mono", text: "= 1.4 → bend" }), s("line", { x1: 306, y1: 85, x2: 340, y2: 85, stroke: "var(--ink-3)", "stroke-width": 2 }), s("text", { x: 346, y: 80, "font-size": 15, class: "t-disp", text: "0.80" }), s("text", { x: 346, y: 98, "font-size": 11, fill: "var(--ink-2)", text: "umbrella?" })); el.append(svg); } },
      { title: "One neuron draws a straight line", truth: "TOY",
        text: "Plot Maya's 60 days: cloud cover across, humidity up. Triangles are umbrella days; circles are not. One neuron can only separate them with a straight line. Its weights decide where the line goes. Here is a guess at good weights, and how many days it gets right.",
        visual: (el) => { const P = plane(el, {}); const w = [1.6, 1.6, 0.2]; P.draw((x) => sig(3 * (w[0] * x[0] + w[1] * x[1] + w[2])), DATA, lineFor(w[0], w[1], w[2])); el.append(h("p", { class: "mono", style: "font-size:.9rem;margin-top:6px" }, `right on ${Math.round(acc((x) => sig(w[0] * x[0] + w[1] * x[1] + w[2]), DATA) * 60)} of 60 days`)); } },
      { title: "Loss: one number for “how wrong”", truth: "TOY",
        text: "To improve, the machine needs one number that says how wrong it is: the [[loss]]. For yes-or-no answers it is the average surprise from M1: confident wrong answers cost a lot, confident right answers cost almost nothing. Training means making this one number smaller.",
        precision: "Here the loss is binary cross-entropy: L = −average[y·log p + (1−y)·log(1−p)]. It is the same surprise as M1, in natural-log units (nats) instead of bits.",
        visual: (el) => { const rows = [[0.95, 1], [0.6, 1], [0.1, 1], [0.05, 0]]; el.append(MM.bars(rows.map(([p, y]) => { const sp = y ? -Math.log(p) : -Math.log(1 - p); return { label: `said ${Math.round(p * 100)}%, ${y ? "rain" : "dry"}`, p: sp / 3 }; }), { scale: 1, plain: true, total: false, fmt: (it) => (it.p * 3).toFixed(2) })); el.append(h("p", { class: "faint", style: "font-size:.88rem;margin-top:6px" }, "Surprise (loss) for four single guesses. Saying 10% when it rained costs 2.30; saying 95% when it rained costs 0.05.")); } },
      { title: "The slope tells which way to turn", truth: "TOY",
        text: "For each knob, ask: if I turn it a tiny bit, does the loss go up or down, and how fast? That is the slope. The list of slopes for every knob is the [[gradient]]. Here, the loss as one weight is turned, with the slope drawn at the current setting.",
        precision: "The gradient is ∂L/∂w for every weight w. It points uphill; we step the other way. {tool:t6}",
        visual: (el) => { const pts = []; for (let w = -1; w <= 4.01; w += 0.1) pts.push([+w.toFixed(2), xent((x) => sig(w * x[0] + 1.6 * x[1] + 0.2), DATA)]); const w0 = 0.2, L0 = xent((x) => sig(w0 * x[0] + 1.6 * x[1] + 0.2), DATA), L1 = xent((x) => sig((w0 + 0.01) * x[0] + 1.6 * x[1] + 0.2), DATA), sl = (L1 - L0) / 0.01; el.append(k.chart([{ pts, color: "var(--seine)" }, { pts: [[w0 - 0.8, L0 - 0.8 * sl], [w0 + 0.8, L0 + 0.8 * sl]], color: "var(--line1)", width: 2.5, dots: [[w0, L0]] }], { W: 460, H: 200, xlabel: "the cloud weight", ylabel: "loss", ymin: 0.3 }), h("p", { class: "mono", style: "font-size:.9rem" }, `slope here = ${sl.toFixed(3)}: turning this weight up lowers the loss, so turn it up.`)); } },
      { title: "Gradient descent: small steps downhill", truth: "TOY",
        text: "[[gradient-descent|Gradient descent]] repeats one move: nudge every knob against its slope, by a small amount called the [[learning-rate|learning rate]]. Then recompute the slopes and nudge again. Watch the weight walk downhill towards the lowest loss.",
        precision: "new weight = old weight − learning rate × slope. Real training uses a fresh random [[mini-batch]] of examples for each step: the slope is noisy but cheap, and the noise can help escape poor spots.",
        visual: (el) => { const f = (w) => xent((x) => sig(w * x[0] + 1.6 * x[1] + 0.2), DATA); const pts = []; for (let w = -1; w <= 4.01; w += 0.1) pts.push([+w.toFixed(2), f(w)]); let w = -0.6; const path = [[w, f(w)]]; for (let i = 0; i < 9; i++) { const sl = (f(w + 1e-3) - f(w - 1e-3)) / 2e-3; w -= 3 * sl; path.push([w, f(w)]); } el.append(k.chart([{ pts, color: "var(--seine)" }, { pts: path, color: "var(--line1)", width: 1.6, dash: "4 3", dots: path }], { W: 460, H: 200, xlabel: "the cloud weight", ylabel: "loss", ymin: 0.3 }), h("p", { class: "faint", style: "font-size:.88rem" }, "Ten steps with learning rate 3. Each dot is one step; steps shrink as the slope flattens.")); } },
      { kind: "spotlight", title: "Down a foggy mountain", truth: "SKETCH",
        text: "Picture walking down a mountain in thick fog. You cannot see the valley, but you can feel which way the ground slopes under your feet. Take a small step downhill. Feel again. Step again. You reach low ground without ever seeing it.",
        intuition: "The fog is the point: the machine never sees the best settings. It only ever knows the local slope.", breaks: "A real network's “mountain” has not two directions but hundreds of thousands (Maya-LM) or hundreds of billions. And the slope is not felt: it is calculated exactly, for every direction at once.",
        visual: (el) => { const cv = h("canvas", { width: 640, height: 300, style: "width:100%;border-radius:8px", role: "img", "aria-label": "A foggy hillside with a walker stepping downhill" }); el.append(cv); const g = cv.getContext("2d"); for (let y = 0; y < 300; y += 4) for (let x = 0; x < 640; x += 4) { const z = 0.5 + 0.35 * Math.sin(x / 90) * Math.cos(y / 70) + 0.25 * ((x - 470) ** 2 + (y - 190) ** 2) / 1e5; const c = Math.round(120 + 100 * Math.min(1, z)); g.fillStyle = `rgb(${c - 30},${c},${c + 10})`; g.fillRect(x, y, 4, 4); } g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, 0, 640, 300); let x = 120, y = 70; g.strokeStyle = "#B97F0E"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 12; i++) { x += (470 - x) * 0.25 + Math.sin(i) * 6; y += (190 - y) * 0.25; g.lineTo(x, y); } g.stroke(); g.fillStyle = "#B97F0E"; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); } },
      { title: "A layer is a matrix", truth: "SKETCH",
        text: "Put many neurons side by side, all reading the same inputs, and you have a [[layer]]. All its arithmetic is one [[matrix]] multiplication (a grid of weights turning one list of numbers into another). Every number a layer outputs is a dot product of the input with one row of the grid. This one operation is most of what an LLM does.",
        precision: "output = activation(W × input + b). W has one row per neuron. {tool:t2}",
        visual: (el) => { const W = [[1.5, 2.0], [-0.7, 1.1], [0.4, -1.8]], x = [0.8, 0.6]; const out = W.map((r) => r[0] * x[0] + r[1] * x[1]); el.append(h("div", { class: "row", style: "--gap:14px;align-items:center" }, h("div", { class: "weights", style: "grid-template-columns:repeat(2,26px)" }, W.flat().map((v) => h("i", { style: `width:26px;height:26px;display:grid;place-items:center;font:500 .72rem var(--font-mono);background:color-mix(in srgb, ${v < 0 ? "var(--neg)" : "var(--pos)"} ${Math.round(Math.abs(v) / 2 * 80)}%, var(--zero))` }, v))), h("span", { class: "lock", style: "position:static" }, MM.icon("lock")), "×", MM.vec(x, { wide: true, max: 1 }), "=", MM.vec(out, { wide: true, max: 2.5 }), h("span", { class: "mono", style: "font-size:.85rem" }, out.map((v) => v.toFixed(2)).join(", "))), h("p", { class: "faint", style: "font-size:.88rem;margin-top:8px" }, "Stone grid with a lock: weights, learned then frozen. Each row times the input gives one output.")); } },
      { title: "Why the bend matters", truth: "TOY",
        text: "Here is the trick. Two straight-line steps in a row are still one straight-line step, so stacking layers without a bend gains nothing. Put an [[activation-function|activation function]] (a bend, such as [[relu|ReLU]] or tanh) after each layer, and a network can draw curves. Maya's umbrella days need a curve.",
        precision: "W₂(W₁x) = (W₂W₁)x: two matrices make one. With a bend between them, a wide enough network can approximate almost any function (the universal approximation theorem). The theorem says nothing about how easy that function is to learn.",
        visual: (el) => { const net = new k.Net(6, MM.rng(3), "tanh"); for (let i = 0; i < 1500; i++) net.step(DATA, 1.2); const lin = new k.Net(6, MM.rng(3), "none"); for (let i = 0; i < 1500; i++) lin.step(DATA, 0.5); const a = h("div"), b = h("div"); el.append(h("div", { class: "two" }, h("div", null, h("div", { class: "eyebrow" }, "6 neurons, no bend"), a), h("div", null, h("div", { class: "eyebrow" }, "6 neurons, with a bend"), b))); plane(a, {}).draw((x) => lin.forward(x).p, DATA); plane(b, {}).draw((x) => net.forward(x).p, DATA); a.append(h("p", { class: "mono", style: "font-size:.85rem" }, `right on ${Math.round(acc((x) => lin.forward(x).p, DATA) * 60)}/60`)); b.append(h("p", { class: "mono", style: "font-size:.85rem" }, `right on ${Math.round(acc((x) => net.forward(x).p, DATA) * 60)}/60`)); } },
      { title: "Backpropagation: passing the blame back", truth: "SKETCH",
        text: "How are the slopes found for millions of knobs at once? [[backpropagation|Backpropagation]] (passing blame backwards). Start at the error, then use the chain rule from M1's toolkit, layer by layer, back to the first. It reuses numbers saved on the way forward, so it is cheap.",
        precision: "Finding every slope costs about twice the forward pass, so one training step costs about three forward passes. This is why training compute ≈ 6 × parameters × tokens (2 forward + 4 backward), as M10 will use.",
        visual: (el) => { const svg = s("svg", { viewBox: "0 0 460 140", class: "figure", role: "img", "aria-label": "Blame passed backwards through three layers" }); ["input", "layer 1", "layer 2", "output", "error"].forEach((t, i) => { svg.append(s("rect", { x: 8 + i * 92, y: 40, width: 76, height: 40, rx: 8, fill: i === 4 ? "var(--bad-soft)" : "var(--sheet)", stroke: i === 4 ? "var(--bad)" : "var(--rule)" }), s("text", { x: 46 + i * 92, y: 65, "text-anchor": "middle", "font-size": 13, text: t })); if (i) { svg.append(s("path", { d: `M${8 + i * 92} 30 C ${i * 92 - 10} 10, ${i * 92 - 40} 10, ${i * 92 - 8} 30`, fill: "none", stroke: "var(--bad)", "stroke-width": 2 }), s("text", { x: i * 92 - 2, y: 14, "text-anchor": "middle", "font-size": 11, fill: "var(--bad)", text: "× slope" })); } }); svg.append(s("text", { x: 230, y: 112, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)", text: "each layer multiplies the blame it received by its own slope, then passes it on" })); el.append(svg); } },
      { title: "Two kinds of numbers", truth: "SKETCH",
        text: "Keep this distinction for the rest of the course. [[weight|Weights]] are learned in training, then frozen: the model's long-term knowledge. [[activation|Activations]] are computed fresh for each input, then thrown away. People choose a third kind, [[hyperparameter|hyperparameters]], such as the learning rate. Nobody chooses the weights' values: training does ({law:l8}).",
        precision: "{law:l4} adds: while you use a model, its weights are read, never written. Everything that changes during a conversation is an activation.",
        visual: (el) => el.append(h("div", { class: "three" }, h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Weights"), h("div", { class: "weights", style: "grid-template-columns:repeat(5,10px);margin-top:8px" }, Array.from({ length: 15 }, (_, i) => h("i", { style: `background:color-mix(in srgb, var(--${i % 3 ? "pos" : "neg"}) ${20 + (i * 37) % 60}%, var(--zero))` })), h("span", { class: "lock" }, MM.icon("lock"))), h("p", { style: "font-size:.88rem;margin-top:8px" }, "learned, then frozen")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Activations"), h("div", { class: "glow", style: "display:inline-block;margin-top:8px;border-radius:4px" }, MM.vec([0.6, -0.4, 0.9, 0.1, -0.7], { wide: true })), h("p", { style: "font-size:.88rem;margin-top:8px" }, "computed fresh for every input")), h("div", { class: "panel" }, h("div", { class: "eyebrow" }, "Hyperparameters"), h("p", { class: "mono", style: "font-size:.9rem;margin-top:8px" }, "learning rate 0.003\nlayers 4"), h("p", { style: "font-size:.88rem;margin-top:8px" }, "chosen by people")))) },
      { title: "The real goal: new examples", truth: "TOY",
        text: "Getting the 60 training days right is not the goal. The goal is [[generalisation]]: doing well on days the model has never seen. A model that memorises its examples can be perfect on them and poor on new ones. That is [[overfitting]]. Here is the trained network tested on 60 new days.",
        precision: "We hold back test data never used in training. [[weight-decay|Weight decay]] (gently pulling weights towards zero) and more data both fight overfitting.",
        visual: (el) => { const net = new k.Net(6, MM.rng(3), "tanh"); for (let i = 0; i < 1500; i++) net.step(DATA, 1.2); const P = plane(el, {}); P.draw((x) => net.forward(x).p, TEST); el.append(h("p", { class: "mono", style: "font-size:.9rem;margin-top:6px" }, `training days right: ${Math.round(acc((x) => net.forward(x).p, DATA) * 60)}/60 · new days right: ${Math.round(acc((x) => net.forward(x).p, TEST) * 60)}/60`)); } },
      { kind: "snap", title: "Back to Maya-LM", truth: "TOY",
        text: "Maya-LM learned in exactly this way. Its 214,208 knobs started random. It guessed the next word, measured its surprise, and gradient descent nudged every knob a little. Four thousand times. That is the whole secret of {law:l8}: the rules inside were never written; they were found.",
        visual: async (el, api) => { const d = await api.data("training"); el.append(h("div", { class: "stack", style: "--gap:6px" }, d.snapshots.filter((x) => [0, 25, 200, 1000].includes(x.step)).map((x) => h("div", null, h("span", { class: "eyebrow" }, "step " + x.step), h("div", { class: "mono", style: "font-size:.88rem" }, x.greedy.split(" ").slice(0, 12).join(" ") + " …"))))); } }],
    lab: {
      title: "Beat gradient descent, if you can", truth: "TOY",
      intro: "Turn the three knobs of one neuron to separate Maya's umbrella days from dry days. Watch the loss. Then let gradient descent train a small network (six neurons and a bend) and see who wins.",
      tries: ["Get the loss below 0.40 with your own knobs.", "Press Learn and watch the boundary bend into a curve.", "Change the activation to “none” and press Learn again.", "Set the learning rate to 50 and press Learn: watch the loss jump instead of falling."],
      mount(el, api) {
        let w = [0.5, -0.5, 0], act = "tanh", lr = 1.5, net = null, raf = 0, curve = [];
        const left = h("div"), right = h("div", { class: "stack" });
        const P = plane(left, {});
        const yours = h("div", { class: "mono", style: "font-size:.92rem", "aria-live": "polite" });
        const status = h("div", { class: "mono", style: "font-size:.92rem", "aria-live": "polite" });
        const chartBox = h("div");
        const mine = (x) => sig(3 * (w[0] * x[0] + w[1] * x[1] + w[2]));
        function drawMine() { P.draw(mine, DATA, lineFor(w[0], w[1], w[2])); yours.textContent = `your loss ${xent(mine, DATA).toFixed(3)} · right on ${Math.round(acc(mine, DATA) * 60)}/60`; }
        const sls = [["cloud weight", 0], ["humidity weight", 1], ["bias", 2]].map(([n, i]) => MM.slider({ label: n, min: -3, max: 3, step: 0.05, value: w[i], fmt: (v) => v.toFixed(2), onInput: (v) => { w[i] = v; cancelAnimationFrame(raf); drawMine(); api.done(); } }));
        const learn = h("button", { class: "btn primary small" }, MM.icon("play"), "Learn");
        learn.onclick = () => {
          cancelAnimationFrame(raf);
          net = new k.Net(6, MM.rng(11), act); curve = [];
          let step = 0;
          const tick = () => {
            for (let i = 0; i < 15 && step < 1500; i++, step++) { const L = net.step(DATA, lr); if (step % 10 === 0) curve.push([step, isFinite(L) ? Math.min(L, 3) : 3]); }
            P.draw((x) => net.forward(x).p, DATA);
            const L = net.loss(DATA);
            status.textContent = `gradient descent · step ${step} · loss ${isFinite(L) ? L.toFixed(3) : "exploded"} · right on ${Math.round(acc((x) => net.forward(x).p, DATA) * 60)}/60`;
            chartBox.innerHTML = ""; chartBox.append(k.chart([{ pts: curve, color: "var(--seine)" }], { W: 420, H: 150, xmin: 0, xmax: 1500, ymin: 0, ymax: Math.max(1.2, ...curve.map((p) => p[1])), xlabel: "step", ylabel: "loss" }));
            if (step < 1500) raf = requestAnimationFrame(tick);
          };
          tick(); api.done();
        };
        right.append(h("div", { class: "eyebrow" }, "Your neuron's knobs"), ...sls, yours, h("hr", { class: "rule" }),
          h("div", { class: "eyebrow" }, "Gradient descent's network"),
          h("div", { class: "row" }, h("span", { class: "faint", style: "font-size:.9rem" }, "Bend:"), MM.seg([{ label: "tanh", value: "tanh" }, { label: "ReLU", value: "relu" }, { label: "none", value: "none" }], act, (v) => { act = v; }, "Activation")),
          MM.slider({ label: "learning rate", min: 0.5, max: 60, step: 0.5, value: lr, fmt: (v) => v.toFixed(1), onInput: (v) => { lr = v; } }),
          h("div", { class: "row" }, learn, h("button", { class: "btn small ghost", onclick: () => { cancelAnimationFrame(raf); drawMine(); status.textContent = ""; chartBox.innerHTML = ""; } }, "Show my neuron")), status, chartBox);
        el.append(h("div", { class: "two" }, left, right), h("p", { class: "faint", style: "font-size:.86rem;margin-top:8px" }, "Background colour: the model's chance of rain at each point (orange = umbrella, blue = no umbrella). Triangles: days Maya needed her umbrella. Circles: dry days."));
        drawMine();
        return () => cancelAnimationFrame(raf);
      } },
    breakit: {
      title: "Remove the bend, overdo the step", truth: "TOY",
      intro: "Two ways to break a learning machine. Try them in the lab above, then compare with the same failure in Maya-LM's real training.",
      cases: [
        { name: "Remove the activation function", what: "Set the bend to “none” and press Learn. The network still has six neurons and two layers.", action: "Remove it", result: "The boundary stays a straight line, however long it trains. Six neurons without a bend behave exactly like one.", why: "Without a bend, W₂(W₁x) = (W₂W₁)x: the layers multiply into a single matrix, a single straight line. Depth only helps with a bend between layers." },
        { name: "Set the learning rate far too high", what: "Maya-LM, trained with a learning rate 100 times too big (0.3 instead of 0.003).", action: "Show the real run", result: "The loss jumps from 5.4 to 8.2 in five steps, then gets stuck near 4.2. The healthy run reaches 0.87 in the same 300 steps.", why: "Each step overshoots the valley and lands somewhere worse. Big steps can also blow numbers up to infinity.",
          visual: async (el, api) => { const d = await api.data("training"); const e = d.experiments.lr_too_high; el.append(k.chart([{ pts: e.curve, color: "var(--bad)", label: "lr 0.3" }, { pts: e.normal, color: "var(--seine)", label: "lr 0.003" }], { W: 460, H: 190, ymin: 0, xlabel: "training step", ylabel: "loss" })); } }],
      explain: { q: "A network with ten layers but no activation functions is trained for a week. What can it learn?", options: ["Anything a ten-layer network can learn", "Only what one straight-line layer can learn", "Nothing at all: it cannot train", "Only curves, never lines"], answer: 1, why: "Stacked matrices collapse into one matrix. Without bends, depth adds nothing." } },
    clinic: [
      { belief: "Neurons in AI are like brain cells.", test: "Write out what one neuron computes: 0.8 × 1.5 + 0.6 × 2.0 − 1.0 = 1.4, then σ(1.4) ≈ 0.80. That is the whole of it.", truth: "The idea was loosely inspired by brain cells in the 1940s and 1950s. An artificial neuron is simple arithmetic: multiply, add, bend." },
      { belief: "A programmer writes the rules inside the model.", test: "Look at Maya-LM at step 0 of training: it wrote “Maya Maya Maya…”. Every number was random. Only training changed them, and by step 1,000 it wrote proper sentences.", truth: "People design the shape, the data and the goal. The rules inside are found by gradient descent ({law:l8})." },
      { belief: "Learning means memorising the examples.", test: "Maya-LM trained on only 40 sentences: training loss fell to 0.12 (near-perfect recall) while the loss on new sentences stayed at 3.36. It memorised and could not generalise.", truth: "The goal is generalisation: doing well on examples never seen. Memorising is a failure mode called overfitting." }],
    explain: { prompt: "How can a neural network learn a pattern that nobody wrote down? Explain in two or three sentences.", points: ["Its weights (knobs) start random", "A loss measures how wrong it is", "The gradient says which way to turn every knob to reduce the loss", "Small steps, repeated many times (gradient descent); backpropagation finds the slopes", "Bends (activation functions) let stacked layers learn curves"] },
    skeptic: [
      { q: "If nobody wrote the rules, how do we know what it learned?", laws: ["l8"], a: "Often we don't fully know. We can measure behaviour (tests on new examples), and we can open the model up: probe its activations, switch parts off and see what breaks. Understanding learned rules is a whole research field called interpretability. Not knowing every rule is the price of {law:l8}: the rules were found, not written." },
      { q: "Gradient descent only walks downhill. Surely it gets stuck in the first small valley it finds?", laws: ["l8"], a: "In two dimensions, yes, that would be a worry. In millions of dimensions, a true dead-end valley needs every one of millions of directions to slope upwards at once, which is rare. Most flat spots are saddles, which have some way down, and the noise from random mini-batches helps find it. Also, many different low valleys turn out to be about equally good.", ladder: ["Why are true valleys rare in high dimensions? A minimum needs every direction to curve upward; with millions of directions, almost always some curve down.", "Then why does training ever slow down? Flat regions and saddles slow it; momentum and Adam keep it moving.", "Is the final model the best possible? No, just a good one; different random starts give different, similarly good models."] },
      { q: "Why not just try lots of random settings and keep the best?", laws: ["l8"], a: "Maya-LM has 214,208 knobs; a big model has billions. Random guesses in that many dimensions almost never land anywhere good. The gradient gives the best direction for every knob at once, for the price of about two extra forward passes. That efficiency is why training huge models is possible at all." }],
    recall: [
      { q: "What does one artificial neuron compute?", options: ["It stores one word", "Multiply each input by a weight, add a bias, then bend the result", "It compares two sentences", "It picks the next token"], answer: 1, level: 1, why: "Multiply, add, bend: simple arithmetic." },
      { q: "Why must a network have an activation function (a bend) between layers?", options: ["To make it run faster", "Without it, stacked layers collapse into one straight-line step", "To store the training data", "To stop the loss going negative"], answer: 1, level: 2, why: "W₂(W₁x) = (W₂W₁)x: two matrices make one." },
      { q: "During training the loss jumps around and gets worse. What is the most likely cause?", options: ["The learning rate is too high", "The model has too few words", "The data has no labels", "The activation function is missing"], answer: 0, level: 3, why: "Steps that are too big overshoot the valley. Maya-LM at learning rate 0.3 jumped to 8.2 and stalled near 4.2." },
      { q: "Maya chats with Maya-LM. Which numbers change during the chat?", options: ["The weights", "The activations", "Both", "Neither"], answer: 1, level: 4, why: "Activations are computed fresh for each input. Weights are frozen during use (Law 4)." },
      { q: "From M1: what is cross-entropy?", options: ["The number of tokens in a text", "The average surprise of the true next tokens under the model", "The chance of the most likely token", "The size of the vocabulary"], answer: 1, level: 1, why: "Average surprise. It is the loss Maya-LM was trained to reduce." }],
    depth: [
      ["A layer is one matrix product plus a bend", "output = activation(W × input + b). Each output number is the dot product of the input with one row of W (Toolkit T2)."],
      ["Why the bend is essential", "Two matrices in a row equal one matrix: W₂(W₁x) = (W₂W₁)x. With a bend between them, enough neurons can approximate almost any function (universal approximation), but the theorem says nothing about how easy it is to learn."],
      ["Why depth helps", "Layers build features on features (letters → word pieces → meanings). Some functions need far fewer neurons spread over many layers than packed into one."],
      ["The gradient is a list of slopes", "For every weight: how much the loss would change if that weight moved a tiny bit. Gradient descent: new weight = old weight − learning rate × slope."],
      ["Backpropagation is the chain rule run backwards", "It reuses numbers saved during the forward pass, so finding every slope costs about twice the forward pass. One training step is about three forward passes of work."],
      ["Mini-batches", "Each step uses a small random batch, not all the data. The slope is noisy, but steps are cheap, and the noise can help escape poor spots."],
      ["Smarter steps", "Momentum keeps moving in a consistent direction. Adam also gives each weight its own step size, based on how big its recent slopes have been."],
      ["Starting values matter", "Weights start small and random, so neurons differ from each other and signals neither blow up nor fade as they pass through many layers."],
      ["Generalisation is the real goal", "Low error on data never seen. Overfitting: low training error, high test error. Weight decay and more data fight it."],
      ["Three kinds of numbers", "Parameters (learned), activations (computed for each input) and hyperparameters (chosen by people, such as the learning rate)."]],
    connect: { links: ["Matrix multiplication ({tool:t2}) is most of the work in every later station.", "Backpropagation's chain of slopes is why RNNs struggled to learn long-range links: {mod:m05}.", "The same loss and the same nudges, run trillions of times on text, are {mod:m10}."], line: "The learning machine needs numbers to work on. Next: how text becomes numbers in the first place." }
  });
})();
