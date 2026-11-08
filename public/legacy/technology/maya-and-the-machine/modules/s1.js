/* S1 · The Wider Family — images, audio and diffusion. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, k = MM.k;

  /* ------------------------------------------------------------------ a tiny diffusion model, run in the browser */
  function f16(b64) {
    const bin = atob(b64), n = bin.length >> 1, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const hh = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); const sg = hh & 0x8000 ? -1 : 1, ex = (hh >> 10) & 31, fr = hh & 1023; out[i] = ex === 0 ? sg * 6.103515625e-5 * (fr / 1024) : ex === 31 ? 0 : sg * Math.pow(2, ex - 15) * (1 + fr / 1024); }
    return out;
  }
  const silu = (x) => x / (1 + Math.exp(-x));
  const NULL = 3;
  function Diffusion(d) {
    this.d = d;
    const W = f16(d.weights_f16);
    let o = 0;
    const take = (n) => W.subarray(o, (o += n));
    const IN = 2 + 2 * d.NF + d.CE, H = d.H;
    this.H = H;
    this.E = take(4 * d.CE); this.W1 = take(IN * H); this.b1 = take(H); this.W2 = take(H * H); this.b2 = take(H); this.W3 = take(H * H); this.b3 = take(H); this.W4 = take(H * 2); this.b4 = take(2);
    const sm = 0.008, f = (u) => Math.cos(((u / d.T + sm) / (1 + sm)) * Math.PI / 2) ** 2;
    this.AB = Array.from({ length: d.T + 1 }, (_, t) => Math.min(1, Math.max(1e-5, f(t) / f(0))));
    this.FREQ = Array.from({ length: d.NF }, (_, kk) => Math.pow(d.freq_max, kk / (d.NF - 1)));
    this.h1 = new Float32Array(H); this.h2 = new Float32Array(H); this.h3 = new Float32Array(H);
  }
  const D = Diffusion.prototype;
  /* the part of layer 1 that is the same for every dot at this step: time and prompt */
  D.base = function (t, c) {
    const d = this.d, H = this.H, v = Float32Array.from(this.b1), tau = t / d.T, feats = [];
    this.FREQ.forEach((f) => feats.push(Math.sin(tau * f)));
    this.FREQ.forEach((f) => feats.push(Math.cos(tau * f)));
    for (let j = 0; j < d.CE; j++) feats.push(this.E[c * d.CE + j]);
    for (let i = 0; i < feats.length; i++) { const a = feats[i], row = (2 + i) * H; for (let j = 0; j < H; j++) v[j] += a * this.W1[row + j]; }
    return v;
  };
  /* predicted noise for every dot */
  D.eps = function (x, base, out) {
    const H = this.H, W1 = this.W1, W2 = this.W2, W3 = this.W3, W4 = this.W4, h1 = this.h1, h2 = this.h2, h3 = this.h3, n = x.length / 2;
    for (let p = 0; p < n; p++) {
      const a = x[2 * p], b = x[2 * p + 1];
      for (let j = 0; j < H; j++) h1[j] = silu(base[j] + a * W1[j] + b * W1[H + j]);
      h2.set(this.b2);
      for (let i = 0; i < H; i++) { const v = h1[i], row = i * H; for (let j = 0; j < H; j++) h2[j] += v * W2[row + j]; }
      for (let j = 0; j < H; j++) h2[j] = silu(h2[j]);
      h3.set(this.b3);
      for (let i = 0; i < H; i++) { const v = h2[i], row = i * H; for (let j = 0; j < H; j++) h3[j] += v * W3[row + j]; }
      let o0 = this.b4[0], o1 = this.b4[1];
      for (let i = 0; i < H; i++) { const v = silu(h3[i]); o0 += v * W4[2 * i]; o1 += v * W4[2 * i + 1]; }
      out[2 * p] = o0; out[2 * p + 1] = o1;
    }
    return out;
  };
  D.noise = function (n, seed) {
    const r = MM.rng(seed), x = new Float32Array(2 * n);
    for (let i = 0; i < 2 * n; i += 2) { const u = Math.max(1e-9, r()), v = r(), m = Math.sqrt(-2 * Math.log(u)); x[i] = m * Math.cos(2 * Math.PI * v); x[i + 1] = m * Math.sin(2 * Math.PI * v); }
    return x;
  };
  D.times = function (steps) { const T = this.d.T, ts = []; for (let i = 0; i <= steps; i++) { const t = Math.round(T - (T * i) / steps); if (!ts.length || ts[ts.length - 1] !== t) ts.push(t); } return ts; };
  /* one DDIM step from noise level a to b, guided with scale w (0 = ignore the prompt) */
  D.step = function (x, a, b, c, w) {
    const n2 = x.length, e = new Float32Array(n2);
    if (c === NULL || w === 0) this.eps(x, this.base(a, NULL), e);
    else if (w === 1) this.eps(x, this.base(a, c), e);
    else { const eu = this.eps(x, this.base(a, NULL), new Float32Array(n2)), ec = this.eps(x, this.base(a, c), new Float32Array(n2)); for (let i = 0; i < n2; i++) e[i] = eu[i] + w * (ec[i] - eu[i]); }
    const A = this.AB[a], B = this.AB[b], sa = Math.sqrt(A), s1a = Math.sqrt(1 - A), sb = Math.sqrt(B), s1b = Math.sqrt(1 - B);
    for (let i = 0; i < n2; i++) { const x0 = (x[i] - s1a * e[i]) / sa; x[i] = sb * x0 + s1b * e[i]; }
    return x;
  };
  D.onTarget = function (x, c) {
    const S = this.d.shapes;
    let hit = 0;
    for (let p = 0; p < x.length / 2; p++) {
      let best = Infinity, bc = -1;
      for (let s_ = 0; s_ < 3; s_++) for (const q of S[s_]) { const dx = q[0] - x[2 * p], dy = q[1] - x[2 * p + 1], dd = dx * dx + dy * dy; if (dd < best) { best = dd; bc = s_; } }
      if (bc === c) hit++;
    }
    return hit / (x.length / 2);
  };
  MM.Diffusion = Diffusion;
  let modelP = null;
  const model = () => modelP || (modelP = MM.loadData("diffusion").then((d) => new Diffusion(d)));

  /* dot cloud picture */
  function cloud(label, size) {
    const svg = s("svg", { viewBox: "-1.25 -1.25 2.5 2.5", class: "figure", style: `max-width:${size || 260}px;background:var(--sheet);border:1px solid var(--rule);border-radius:9px`, role: "img", "aria-label": label });
    const g = s("g", { transform: "scale(1,-1)" });
    svg.append(g);
    let dots = [];
    svg.draw = (x, col) => {
      const n = x.length / 2;
      while (dots.length < n) { const c = s("circle", { r: 0.018, fill: col || "var(--seine)" }); g.append(c); dots.push(c); }
      for (let p = 0; p < dots.length; p++) { if (p < n) { dots[p].setAttribute("cx", Math.max(-1.3, Math.min(1.3, x[2 * p])).toFixed(3)); dots[p].setAttribute("cy", Math.max(-1.3, Math.min(1.3, x[2 * p + 1])).toFixed(3)); dots[p].removeAttribute("display"); } else dots[p].setAttribute("display", "none"); }
    };
    return svg;
  }
  /* run a whole generation, one step per animation frame */
  function generate(M, opt, onFrame) {
    const ts = M.times(opt.steps), x = M.noise(opt.n || 500, opt.seed || 1);
    let i = 0, stopped = false;
    onFrame(x, ts[0], false);
    const tick = () => {
      if (stopped) return;
      if (i >= ts.length - 1) { onFrame(x, 0, true); return; }
      M.step(x, ts[i], ts[i + 1], opt.c, opt.w);
      i++;
      onFrame(x, ts[i], i >= ts.length - 1);
      if (i < ts.length - 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { stop: () => (stopped = true) };
  }

  /* ------------------------------------------------------------------ a small picture of Maya's umbrella in the Paris rain */
  function picture(size) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const g = cv.getContext("2d"), u = size / 224;
    const sky = g.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#8ea6bb"); sky.addColorStop(1, "#d6dfe6");
    g.fillStyle = sky; g.fillRect(0, 0, size, size);
    g.fillStyle = "#6f7f8d";
    g.beginPath(); g.moveTo(150 * u, 182 * u); g.lineTo(168 * u, 40 * u); g.lineTo(186 * u, 182 * u); g.closePath(); g.fill();
    g.fillRect(166 * u, 28 * u, 4 * u, 14 * u);
    g.fillStyle = "#4b5661"; g.fillRect(0, 182 * u, size, size - 182 * u);
    const r = MM.rng(4);
    g.strokeStyle = "rgba(60,80,100,.55)"; g.lineWidth = Math.max(1, 1.2 * u);
    for (let i = 0; i < 60; i++) { const x = r() * size, y = r() * size; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5 * u, y + 13 * u); g.stroke(); }
    g.fillStyle = "#1d7a7f";
    g.beginPath(); g.ellipse(84 * u, 104 * u, 62 * u, 44 * u, 0, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = "#d6dfe6";
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse((37 + 31 * i) * u, 104 * u, 15.5 * u, 7 * u, 0, Math.PI, 0); g.fill(); }
    g.strokeStyle = "#2b2f33"; g.lineWidth = 3 * u;
    g.beginPath(); g.moveTo(84 * u, 100 * u); g.lineTo(84 * u, 170 * u); g.arc(76 * u, 170 * u, 8 * u, 0, Math.PI); g.stroke();
    return cv;
  }
  /* the same picture, as numbers in -1..1 (for the strip pictures) */
  function pixelsOf(cv) { const n = cv.width, d = cv.getContext("2d").getImageData(0, 0, n, n).data, out = new Float32Array(n * n * 3); for (let i = 0; i < n * n; i++) for (let ch = 0; ch < 3; ch++) out[3 * i + ch] = d[4 * i + ch] / 127.5 - 1; return out; }
  function fromPixels(px, n, scale) {
    const cv = document.createElement("canvas"); cv.width = cv.height = n;
    const g = cv.getContext("2d"), img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { for (let ch = 0; ch < 3; ch++) img.data[4 * i + ch] = Math.max(0, Math.min(255, Math.round((px[3 * i + ch] + 1) * 127.5))); img.data[4 * i + 3] = px[3 * i] === null ? 0 : 255; }
    g.putImageData(img, 0, 0);
    cv.style.cssText = `width:${scale}px;height:${scale}px;image-rendering:pixelated;border-radius:6px;border:1px solid var(--rule)`;
    return cv;
  }

  MM.defineModule({
    id: "s1",
    mystery: { title: "Is an image generator just an LLM?", text: "Type “an umbrella in the Paris rain” into an image generator and a picture appears. A friend says: “Same thing as ChatGPT, just writing pixels instead of words.”\n\nSometimes that is almost true. Usually it is not. Most image generators start from pure noise, like television static, and clean it up step by step until a picture appears. How, and what do they share with an LLM?" },
    where: { text: "Off the main line: the same parts you know (vectors, attention, gradient descent) arranged for pictures and sound." },
    predict: { q: "The most common kind of image generator, a diffusion model, makes a picture of an umbrella. How?", options: ["It writes the pixels one by one, left to right, like text", "It starts from random noise and removes noise step by step, guided by the prompt", "It searches the web for a matching photo", "It glues together pieces of training pictures"], answer: 1, why: "A diffusion model learned to predict the noise in noisy pictures. Starting from pure noise, it removes a little noise at each step, and the prompt steers which picture appears. You will run a real (tiny) one in this station." },
    story: [
      { title: "Pictures are numbers too", truth: "TOY",
        text: "A picture is a grid of pixels, and each pixel is three numbers: how much red, green and blue. A 224 × 224 picture is 224 × 224 × 3 = 150,528 numbers. So {law:l2} holds here too: inside any model there are only numbers.",
        visual: (el) => { const cv = picture(224); cv.style.cssText = "width:100%;max-width:224px;border-radius:8px;border:1px solid var(--rule)"; const d = cv.getContext("2d").getImageData(0, 0, 224, 224).data; const at = (x, y) => { const i = 4 * (y * 224 + x); return [d[i], d[i + 1], d[i + 2]]; }; el.append(h("div", { class: "row", style: "--gap:14px;align-items:flex-start" }, cv, h("table", { class: "tbl", style: "max-width:260px" }, h("thead", null, h("tr", null, h("th", null, "pixel"), h("th", { class: "n" }, "red"), h("th", { class: "n" }, "green"), h("th", { class: "n" }, "blue"))), h("tbody", null, [["sky", 20, 20], ["umbrella", 84, 80], ["street", 110, 205]].map(([n, x, y]) => h("tr", null, h("td", null, n), ...at(x, y).map((v) => h("td", { class: "n" }, String(v))))))))); } },
      { title: "Cut the picture into patches", truth: "TOY",
        text: "How does a Transformer read a picture? The [[vit|Vision Transformer]] (Dosovitskiy and colleagues, 2020) cuts it into squares of 16 × 16 pixels: 224 ÷ 16 = 14, so 14 × 14 = 196 patches. Each patch is 16 × 16 × 3 = 768 numbers; a learned layer turns it into one vector, a position is added, and a standard Transformer (M7) runs over the 196 vectors. The patches are the picture's tokens.",
        precision: "Smaller patches mean more tokens and finer detail, but attention's cost grows with the square of the number of tokens (M6): 8-pixel patches give 784 tokens, 16 times the attention work of 196.",
        visual: (el) => { const wrap = h("div", { style: "position:relative;width:100%;max-width:280px" }); const cv = picture(224); cv.style.cssText = "width:100%;display:block;border-radius:8px"; const grid = s("svg", { viewBox: "0 0 224 224", style: "position:absolute;inset:0;width:100%;height:100%", "aria-hidden": "true" }); wrap.append(cv, grid); const info = h("div", { class: "mono", style: "font-size:.88rem;margin-top:8px" }); const draw = (p) => { grid.innerHTML = ""; for (let v = p; v < 224; v += p) grid.append(s("line", { x1: v, y1: 0, x2: v, y2: 224, stroke: "#fff", "stroke-width": 0.8, opacity: 0.85 }), s("line", { x1: 0, y1: v, x2: 224, y2: v, stroke: "#fff", "stroke-width": 0.8, opacity: 0.85 })); info.textContent = `patches of ${p} × ${p} pixels → ${224 / p} × ${224 / p} = ${(224 / p) ** 2} tokens, each ${p * p * 3} numbers`; }; el.append(wrap, h("div", { style: "margin-top:8px" }, MM.seg([{ label: "8 px", value: 8 }, { label: "16 px", value: 16 }, { label: "32 px", value: 32 }], 16, draw, "Patch size")), info); draw(16); } },
      { title: "Pictures and words in one space", truth: "SKETCH",
        text: "[[clip|CLIP]] (OpenAI, 2021) trained two encoders at once, one for pictures and one for captions, on 400 million picture–caption pairs from the web. Training pulled each picture's vector towards its own caption's vector and away from the others: the same contrastive training as Maya-Embed in M12. Afterwards, “a photo of an umbrella” and a photo of an umbrella land close together.",
        precision: "This is why one text encoder can steer image generators and search photo libraries by meaning, and why CLIP's image encoder is a common choice for the vision part of multimodal LLMs.",
        visual: (el) => { const imgs = ["umbrella", "sun", "tower", "croissant"], caps = ["“umbrella”", "“sun”", "“tower”", "“croissant”"]; const sims = [[0.31, 0.12, 0.10, 0.08], [0.11, 0.33, 0.09, 0.10], [0.09, 0.08, 0.34, 0.07], [0.07, 0.10, 0.06, 0.30]]; el.append(h("div", { class: "eyebrow", style: "margin-bottom:4px" }, "rows: photos · columns: captions"), h("div", { class: "scroll-x" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", null, ""), caps.map((c) => h("th", { class: "n", style: "font-size:.8rem" }, c)))), h("tbody", null, imgs.map((im, i) => h("tr", null, h("td", { style: "font-size:.85rem" }, im), sims[i].map((v, j) => h("td", { class: "n", style: i === j ? "background:var(--ok-soft);font-weight:700" : "color:var(--ink-3)" }, v.toFixed(2)))))))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "Cosine similarity of picture and caption vectors (chosen numbers). Training raises the diagonal and lowers the rest.")); } },
      { title: "Multimodal LLMs: pictures as extra tokens", truth: "REAL",
        text: "How does a chat model “see” a photo? A [[multimodal|multimodal model]] runs the photo through a vision encoder, and a small learned layer maps each output vector into the LLM's embedding space. Those vectors sit in the context window beside the text tokens, and attention reads them like any others. LLaVA-1.5 (2023), for example, turns a 336 × 336 photo into 576 vectors: 24 × 24 patches of 14 pixels.",
        precision: "The LLM never sees pixels: it reads 576 vectors produced by the vision encoder (CLIP's, in LLaVA) and squeezed into its own vector space by the learned projection.",
        visual: (el) => el.append(h("div", { class: "toks" }, h("span", { class: "tok", style: "--tc:var(--data)" }, "🖼 576 picture vectors"), ...["What", " is", " in", " this", " photo", "?"].map((t) => MM.tok(t))), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "One context window: picture vectors first, then the text tokens.")) },
      { title: "Two ways to make a picture", truth: "TOY",
        text: "Generating pictures splits into two families. Autoregressive models write picture tokens one by one, exactly like an LLM writes text ({law:l1}): DALL·E (2021) wrote 1,024 picture tokens chosen from a codebook of 8,192, and OpenAI described GPT-4o's image generation (2025) as autoregressive. [[diffusion-model|Diffusion models]] work on the whole picture at once: start from pure noise and remove a little noise at each step.",
        precision: "Below, real pixel maths on our small picture: on top, tokens written in reading order; underneath, the whole picture coming out of noise. Autoregressive pictures obey Law 1; diffusion bends it.",
        visual: (el) => { const N = 64, base = pixelsOf(picture(N)); const ar = (frac) => { const px = new Float32Array(base.length).fill(1); const P = 8, per = N / P, shown = Math.round(per * per * frac); for (let t = 0; t < shown; t++) { const py = Math.floor(t / per), pxI = t % per; for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) { const i = (py * P + y) * N + pxI * P + x; for (let ch = 0; ch < 3; ch++) px[3 * i + ch] = base[3 * i + ch]; } } return px; }; const r = MM.rng(9), nz = new Float32Array(base.length); for (let i = 0; i < nz.length; i += 2) { const u = Math.max(1e-9, r()), v = r(), m = Math.sqrt(-2 * Math.log(u)); nz[i] = m * Math.cos(2 * Math.PI * v); if (i + 1 < nz.length) nz[i + 1] = m * Math.sin(2 * Math.PI * v); } const df = (ab) => base.map((v, i) => Math.sqrt(ab) * v + Math.sqrt(1 - ab) * nz[i]); el.append(h("div", { class: "eyebrow" }, "autoregressive: one token at a time"), h("div", { class: "row", style: "--gap:8px;margin:6px 0 12px" }, [0.25, 0.5, 0.75, 1].map((f) => fromPixels(ar(f), N, 72))), h("div", { class: "eyebrow" }, "diffusion: the whole picture, step by step"), h("div", { class: "row", style: "--gap:8px;margin-top:6px" }, [0.02, 0.15, 0.5, 1].map((ab) => fromPixels(df(ab), N, 72)))); } },
      { title: "A real diffusion model, small enough to watch", truth: "TOY",
        text: "To see diffusion work, we trained a tiny one for this course: 41,986 parameters, on dots that trace three “pictures”: an umbrella, a sun and the Eiffel Tower. Training takes a real drawing, adds a random amount of noise, and asks the network: what noise was added? Drag the slider to add noise the way training does. At the end, nothing of the umbrella is left.",
        precision: "Each training example is noisy = √ᾱ × clean + √(1 − ᾱ) × noise, where ᾱ falls from 1 to almost 0 over 100 noise levels (a cosine schedule). The network sees the noisy dots, the noise level and the prompt, and is scored on how well it predicts the noise (DDPM, Ho and colleagues, 2020).",
        visual: async (el) => { const M = await model(); const x0 = M.d.shapes[0], eps = M.noise(x0.length, 21), pic = cloud("Umbrella dots with noise added", 240), x = new Float32Array(2 * x0.length), info = h("div", { class: "mono", style: "font-size:.85rem;margin-top:6px" }); const show = (t) => { const ab = M.AB[t]; for (let i = 0; i < x0.length; i++) { x[2 * i] = Math.sqrt(ab) * x0[i][0] + Math.sqrt(1 - ab) * eps[2 * i]; x[2 * i + 1] = Math.sqrt(ab) * x0[i][1] + Math.sqrt(1 - ab) * eps[2 * i + 1]; } pic.draw(x); info.textContent = `noise level ${t} of ${M.d.T} · ${Math.round(100 * Math.sqrt(ab))}% picture, ${Math.round(100 * Math.sqrt(1 - ab))}% noise (by size)`; }; el.append(pic, MM.slider({ label: "noise level", min: 0, max: M.d.T, value: 0, onInput: show }), info); show(0); } },
      { title: "Backwards: from noise to an umbrella", truth: "TOY",
        text: "Generation runs the process backwards. Start with pure random dots. At each step the network predicts the noise, and a small part of it is removed. Dot by dot, step by step, an umbrella appears out of nothing. Nothing was copied: each run starts from new random dots, and the network only ever answers “which way is the noise?”.",
        precision: "This uses the DDIM sampler (Song and colleagues, 2020) with 50 steps: from the predicted noise it estimates the clean picture, then moves to the next, smaller noise level. Each dot here is one sample from the model; in an image model, one sample is a whole picture, a single point in a space with hundreds of thousands of dimensions.",
        visual: async (el) => { const M = await model(); const pic = cloud("Dots moving from noise to an umbrella", 260), info = h("div", { class: "mono", style: "font-size:.85rem;margin-top:6px", "aria-live": "polite" }); let run = null, seed = 1; const go = () => { if (run) run.stop(); run = generate(M, { c: 0, w: 1, steps: 50, n: 450, seed: seed++ }, (x, t, done) => { pic.draw(x); info.textContent = done ? "done: 50 steps" : `noise level ${t}`; }); }; el.append(pic, h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "btn small primary", type: "button", onclick: go }, "Play again with new noise")), info); go(); } },
      { title: "The prompt steers; guidance sets how hard", truth: "TOY",
        text: "How does “umbrella” make an umbrella? During training the prompt was hidden 15% of the time, so the network also learned to denoise with no prompt. [[guidance|Classifier-free guidance]] runs it both ways at every step and pushes further in the direction the prompt adds. Measured on our model: with guidance 0 the prompt is ignored and the dots split about a third each across all three shapes; at 1, about 87% land on the umbrella; at 3, about 95%, but they crowd together and the hook vanishes; at 8 the shape breaks apart.",
        precision: "Guided noise = no-prompt noise + w × (prompt noise − no-prompt noise). Real image models are usually run well above 1 (Stable Diffusion's default is 7.5): stronger prompt-following, less variety, and at extremes harsh, over-saturated pictures.",
        visual: async (el) => { const M = await model(); const ws = [0, 1, 3, 8], grid = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px" }); const pics = ws.map((w) => { const p = cloud("Umbrella with guidance " + w, 200); const lab = h("div", { class: "mono", style: "font-size:.8rem;text-align:center" }, "guidance " + w); grid.append(h("div", null, p, lab)); return { p, lab, w }; }); el.append(grid); pics.forEach(({ p, lab, w }) => generate(M, { c: 0, w, steps: 50, n: 300, seed: 7 }, (x, t, done) => { p.draw(x); if (done) lab.textContent = `guidance ${w} · ${Math.round(100 * M.onTarget(x, 0))}% on the umbrella`; })); } },
      { title: "Steps: fast or good", truth: "TOY",
        text: "Fewer steps means faster pictures, but each step must remove more noise, and big jumps go wrong. On our model, the share of dots that land on the umbrella shape: 2 steps 38%, 5 steps 44%, 10 steps 65%, 20 steps 81%, 50 steps 87%, 100 steps 88%. The first diffusion models used 1,000 steps; better samplers cut that to tens, and distilled models make pictures in one to four.",
        visual: (el) => el.append(MM.bars([[2, 0.377], [5, 0.44], [10, 0.648], [20, 0.805], [50, 0.873], [100, 0.883]].map(([st, v]) => ({ label: st + " steps", p: v })), { scale: 1, plain: true, total: false }), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "Measured: dots nearest to the umbrella, 600 dots, guidance 1.")) },
      { title: "Latent diffusion: work on a summary", truth: "REAL",
        text: "Pixels are expensive. [[latent-diffusion|Latent diffusion]] (Rombach and colleagues, 2022), the idea behind Stable Diffusion, first trains an autoencoder that squeezes a 512 × 512 picture (786,432 numbers) into a 64 × 64 × 4 summary (16,384 numbers), 48 times smaller. Diffusion runs on the summary; the decoder turns the final summary back into pixels. The prompt's word vectors steer each step through [[cross-attention|cross-attention]]: queries from the picture, keys and values from the words (M6).",
        precision: "Newer image and video models replace the U-shaped convolutional denoiser with a Transformer over latent patches (diffusion transformers, 2023), and many train with “flow matching”, a close cousin of diffusion that learns straight paths from noise to data.",
        visual: (el) => el.append(MM.bars([{ label: "pixels 512×512×3", p: 786432 }, { label: "latent 64×64×4", p: 16384 }], { scale: 786432, plain: true, total: false, labelW: "9.5rem", valueW: "5.5rem", fmt: (it) => it.p.toLocaleString("en-GB") })) },
      { title: "Sound becomes tokens too", truth: "REAL",
        text: "A [[audio-codec|neural audio codec]] turns sound into tokens. EnCodec (Meta, 2022) turns 24,000 sound samples a second into 75 frames a second, and each frame into a few tokens from learned codebooks of 1,024 entries: 2 tokens a frame for 1.5 kilobits a second, up to 32 for higher quality. A language model can then write speech or music token by token, and the codec turns the tokens back into sound.",
        visual: (el) => { const W = 420, H = 120, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", role: "img", "aria-label": "A sound wave cut into frames, each frame turned into two codebook tokens" }); let d = ""; for (let x = 0; x <= 400; x++) { const y = 34 + 22 * Math.sin(x / 7) * Math.sin(x / 41) * (0.6 + 0.4 * Math.sin(x / 90)); d += (x ? "L" : "M") + (x + 10) + " " + y.toFixed(1); } svg.append(s("path", { d, fill: "none", stroke: "var(--seine)", "stroke-width": 1.5 })); for (let f = 0; f < 10; f++) { svg.append(s("line", { x1: 10 + f * 40, y1: 8, x2: 10 + f * 40, y2: 62, stroke: "var(--rule)", "stroke-dasharray": "3 3" })); [0, 1].forEach((r_) => svg.append(s("rect", { x: 14 + f * 40, y: 72 + r_ * 22, width: 32, height: 18, rx: 4, fill: "var(--sheet)", stroke: "var(--data)" }), s("text", { x: 30 + f * 40, y: 85 + r_ * 22, "text-anchor": "middle", "font-size": 9.5, class: "t-mono", fill: "var(--ink)", text: String((f * 397 + r_ * 611 + 89) % 1024) }))); } el.append(svg, h("p", { class: "faint", style: "font-size:.85rem;margin-top:4px" }, "Ten frames = 0.13 seconds of sound, two tokens each (token numbers made up for the drawing).")); } },
      { kind: "snap", title: "Back to the family table", truth: "SKETCH",
        text: "So: is an image generator just an LLM? Some are close relatives: they write picture tokens one by one ({law:l1}). Most use diffusion, which bends Law 1. But the family shares its parts: vectors for everything ({law:l2}), attention to mix information ({law:l6}), contrastive training to join words and pictures, and gradient descent to learn every weight ({law:l8}).",
        visual: (el) => el.append(h("div", { class: "scroll-x" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, ["model", "reads", "writes", "how"].map((c) => h("th", null, c)))), h("tbody", null, [["LLM", "text tokens", "text tokens", "one by one"], ["Vision Transformer", "picture patches", "a label or vectors", "one pass"], ["CLIP", "pictures and captions", "matching vectors", "one pass"], ["multimodal LLM", "picture vectors + text", "text tokens", "one by one"], ["autoregressive image model", "prompt", "picture tokens", "one by one"], ["diffusion model", "prompt + noise", "a whole picture", "many denoising steps"], ["speech model", "audio tokens + text", "audio tokens", "one by one"]].map((r) => h("tr", null, r.map((c) => h("td", null, c)))))))) }],
    lab: {
      title: "Noise to Umbrella", truth: "TOY",
      intro: "A real diffusion model, trained for this course and running in your browser. Choose a prompt, a guidance strength and a number of steps, then watch 500 random dots become a picture. Each run starts from new noise.",
      tries: ["Generate an umbrella with guidance 1 and 50 steps.", "Same prompt, 3 steps: what goes wrong?", "Choose “no prompt”: what does the model draw?", "Push guidance to 8.", "Generate twice with the same noise: same picture?"],
      async mount(el, api) {
        const M = await model();
        const st = { c: 0, w: 1, steps: 50, seed: 1 };
        const pic = cloud("Generated dots", 320), info = h("div", { class: "mono", style: "font-size:.88rem;margin-top:6px", "aria-live": "polite" });
        let run = null;
        const go = (newSeed) => {
          if (newSeed) st.seed += 1;
          if (run) run.stop();
          run = generate(M, { c: st.c, w: st.w, steps: st.steps, n: 500, seed: st.seed }, (x, t, done) => {
            pic.draw(x);
            if (!done) { info.textContent = `noise level ${t}…`; return; }
            const shares = [0, 1, 2].map((c) => M.onTarget(x, c));
            info.textContent = st.c === NULL ? `no prompt: ${shares.map((v, i) => `${Math.round(100 * v)}% ${M.d.names[i]}`).join(" · ")}` : `${Math.round(100 * shares[st.c])}% of dots landed on the ${M.d.names[st.c]}`;
            api.done();
          });
        };
        el.append(
          h("div", { class: "row", style: "margin-bottom:8px" }, MM.seg(M.d.names.map((n, i) => ({ label: n, value: i })), st.c, (v) => { st.c = v; go(true); }, "Prompt")),
          MM.slider({ label: "guidance", min: 0, max: 8, step: 0.5, value: st.w, onInput: (v) => { st.w = v; } }),
          h("div", { class: "row", style: "margin:8px 0" }, h("span", { class: "eyebrow" }, "steps"), MM.seg([2, 3, 5, 10, 20, 50].map((n) => ({ label: String(n), value: n })), st.steps, (v) => { st.steps = v; }, "Steps")),
          h("div", { class: "row" }, h("button", { class: "btn small primary", type: "button", onclick: () => go(true) }, "Generate with new noise"), h("button", { class: "btn small", type: "button", onclick: () => go(false) }, "Same noise again")),
          h("div", { style: "margin-top:10px" }, pic), info,
          h("p", { class: "faint", style: "font-size:.85rem;margin-top:8px" }, "Change the guidance or steps, then press a button. “On the shape” is measured: each dot is matched to the nearest of the three training drawings."));
        go(false);
      } },
    breakit: {
      title: "Too few steps, too much guidance, no prompt", truth: "TOY",
      intro: "Three settings that break the picture, each one reproducible in the lab.",
      cases: [
        { name: "Too few steps", what: "Generate the umbrella in 2 steps.", action: "Rush it", result: "A smeared scatter: only about 38% of the dots land on the umbrella, against 87% with 50 steps.", why: "Each step removes part of the noise based on the network's guess. Two giant jumps cannot follow the curved path from noise to the picture." },
        { name: "Guidance far too high", what: "Set guidance to 8.", action: "Push it", result: "The umbrella breaks up: dots overshoot and leave the shape, and parts like the hook disappear.", why: "Guidance extrapolates beyond anything seen in training. A little sharpens the prompt; a lot leaves the region the model knows." },
        { name: "No prompt at all", what: "Choose “(no prompt)”.", action: "Remove it", result: "A blend of all three drawings: about a third of the dots on each of umbrella, sun and tower.", why: "Without a prompt the model samples from everything it learned. The prompt is what narrows the choice." }],
      explain: { q: "A diffusion model's pictures look noisy and half-formed. Which change helps most?", options: ["More denoising steps", "A higher temperature", "A bigger context window", "Fewer patches"], answer: 0, why: "Each step removes only part of the noise; too few steps leave the job unfinished." } },
    clinic: [
      { belief: "Image generators are just LLMs writing pixels.", test: "In the lab, every dot moves at every step: no left-to-right order, no next token.", truth: "Some are autoregressive (picture tokens one by one), but diffusion models refine the whole picture over many steps. They share vectors, attention and gradient descent." },
      { belief: "Image generators glue together pieces of training pictures.", test: "Our model stores no drawing: it is a 41,986-number network that answers “which way is the noise?”. New noise gives new dots every time.", truth: "Generation samples from a learned distribution. Rare exact copies can happen when a training picture was heavily duplicated, but the process is not collage." },
      { belief: "Multimodal models see pictures the way we do.", test: "LLaVA-1.5 turns a photo into 576 vectors placed in the context window beside the text tokens.", truth: "The model reads vectors, as always ({law:l2}). Pictures become tokens or vectors before the Transformer sees them." }],
    explain: { prompt: "Explain how a diffusion model makes a picture from a prompt, and one thing it shares with an LLM.", points: ["Training adds noise to real pictures; the network learns to predict that noise", "Generation starts from pure noise and removes a little at each step", "The prompt steers each step; guidance sets how strongly", "Pictures are numbers (pixels or a compressed latent), like tokens become vectors", "Shared: vectors, attention (cross-attention to the prompt), gradient descent"] },
    skeptic: [
      { q: "If a diffusion model does not predict the next token, is it the same kind of AI as an LLM?", laws: ["l1", "l8"], a: "Both learn the distribution of their training data and sample new examples from it. An LLM breaks the job into “next token” steps ({law:l1}); diffusion breaks it into “less noise” steps. Both get every weight from gradient descent ({law:l8}). Different factorisation, same family." },
      { q: "How can words steer a picture if the image model never reads text?", laws: ["l6"], a: "A text encoder turns the prompt into vectors. Inside the denoiser, cross-attention lets picture positions query those word vectors ({law:l6}), so “umbrella” changes the predicted noise. Guidance then pushes further in the direction the prompt adds." },
      { q: "How can a chat model see my photo if it only reads tokens?", laws: ["l2"], a: "A vision encoder cuts the photo into patches and turns them into vectors; a learned projection maps them into the LLM's vector space. To the LLM they are just more vectors in the context ({law:l2}): 576 of them for LLaVA-1.5." }],
    recall: [
      { q: "How many 16 × 16 patches does a 224 × 224 picture make?", options: ["14", "196", "224", "50,176"], answer: 1, level: 1, why: "224 ÷ 16 = 14 per side, and 14 × 14 = 196." },
      { q: "What does a diffusion network learn to predict during training?", options: ["The next pixel", "The noise that was added to a picture", "The caption of the picture", "The number of steps"], answer: 1, level: 2, why: "Predicting the noise is what lets generation remove it step by step." },
      { q: "You raise guidance from 1 to 8. What happens to our umbrella?", options: ["It gets sharper and better forever", "It breaks apart: dots overshoot the shape", "Nothing changes", "It turns into a sun"], answer: 1, level: 3, why: "Extreme guidance extrapolates past what the model learned." },
      { q: "True or false: an image generator glues together pieces of its training pictures.", options: ["True", "False: it samples new pictures by removing noise, steered by the prompt"], answer: 1, level: 4, why: "It learned a function, not a collage; new noise gives a new picture." },
      { q: "CLIP joins pictures and captions in one space. Which earlier station used the same training idea?", options: ["M8, sampling", "M12, Maya-Embed's contrastive training", "M10, scaling laws", "M3, BPE"], answer: 1, level: 5, why: "Pull matching pairs together, push the others apart." }],
    depth: [
      ["The Vision Transformer", "Cut an image into 16 × 16-pixel patches, flatten each into a vector, add position, and run a standard Transformer. Smaller patches give more tokens, finer detail and much more attention work."],
      ["CLIP", "An image encoder and a text encoder trained contrastively on 400 million picture–caption pairs, so a picture and its caption land close together: the same idea as M12's embedding training."],
      ["Diffusion training", "Add noise to images at many levels and train a network to predict the noise at each level. Generation starts from pure noise and removes it step by step. Text guides it through cross-attention, and classifier-free guidance sets how strongly the text is followed."],
      ["Latent diffusion", "Work on a compressed version of the image made by an autoencoder, not on raw pixels: Stable Diffusion's 64 × 64 × 4 latent is 48 times smaller than a 512 × 512 picture."],
      ["Samplers and steps", "DDPM used 1,000 steps. DDIM and later samplers take far fewer by estimating the clean picture at each step; distilled models need one to four."],
      ["Autoregressive images", "Turn an image into discrete tokens with a learned codebook, then predict the tokens one by one, like text. DALL·E (2021) used 1,024 tokens from 8,192 codes."],
      ["Audio", "Neural codecs turn sound into tokens (EnCodec: 75 frames a second at 24 kHz, a few codebook tokens per frame), so speech and music can be generated token by token."],
      ["Multimodal LLMs", "A vision encoder's outputs are projected into the LLM's embedding space and placed in the context like extra tokens (576 for LLaVA-1.5 at 336 × 336)."]],
    connect: { next: "f1", links: ["Contrastive training, the idea behind CLIP: {mod:m12}.", "Attention, which becomes cross-attention to the prompt: {mod:m06}.", "Vectors for everything: {mod:m04}."], line: "Side quest complete. Next: the Phase 1 finale, where you explain the whole machine alone." }
  });
})();
