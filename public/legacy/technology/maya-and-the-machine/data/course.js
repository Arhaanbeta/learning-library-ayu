/* Course data: the map, the Laws, the Toolkit and the Word Bank. Every page reads from here. */
(function () {
  const C = (window.MM = window.MM || {}).course = {};

  C.phases = [
    { id: "p1", line: 1, name: "Line 1 · How an LLM works and is made", short: "Generative AI and LLMs",
      acts: [
        { id: "I", name: "Act I · The Game", modules: ["m00", "m01", "m02"] },
        { id: "II", name: "Act II · Inside the Machine", modules: ["m03", "m04", "m05", "m06", "m07", "m08", "m09"] },
        { id: "III", name: "Act III · The Making", modules: ["m10", "m11"] },
        { id: "IV", name: "Act IV · Into the World", modules: ["m12", "m13", "s1"] },
        { id: "F1", name: "Finale", modules: ["f1"] }] },
    { id: "p2", line: 2, name: "Line 2 · How agent teams work", short: "Multi-agent systems with LangGraph",
      acts: [
        { id: "V", name: "Act V · From Answer to Action", modules: ["a00", "a01", "a02"] },
        { id: "VI", name: "Act VI · The Engine", modules: ["a03", "a04", "a05"] },
        { id: "VII", name: "Act VII · Agents and Teams", modules: ["a06", "a07"] },
        { id: "VIII", name: "Act VIII · Durable, Human and Safe", modules: ["a08", "a09", "a10", "s2"] },
        { id: "F2", name: "Finale", modules: ["f2"] }] }];

  const M = (id, code, title, q, mins, extra) => Object.assign({ id, code, title, q, mins }, extra || {});
  C.modules = [
    M("m00", "M0", "The Grand Tour", "What are we building, from the first word typed to the word that comes back?", 15, { insight: "See the whole machine at low resolution before any detail.", needs: [] }),
    M("m01", "M1", "The Guessing Game", "What exactly is a language model?", 50, { insight: "A language model gives a probability to every possible next token. Generation is guess, pick, append, repeat.", needs: ["m00"] }),
    M("m02", "M2", "The Learning Machine", "How can a machine learn a pattern that nobody wrote down?", 55, { insight: "A neural network is a function with many adjustable knobs. Learning means turning every knob a tiny bit in the direction that reduces error, again and again.", needs: ["m01"] }),
    M("m03", "M3", "Tokens", "How does text enter a machine that only understands numbers?", 45, { insight: "Text is cut into tokens from a fixed vocabulary, and each token has an ID number. The model never sees letters or words.", needs: ["m01"] }),
    M("m04", "M4", "Embeddings", "How can a number carry meaning?", 50, { insight: "Each token ID becomes a vector. Training moves the vectors so that tokens used in similar ways end up close together.", needs: ["m03", "m02"] }),
    M("m05", "M5", "The Memory Problem", "How can the guess depend on all the earlier words, not just the last few?", 50, { insight: "Each era fixed the last era's memory problem and created a new one, until attention let every token look straight back at every earlier token.", needs: ["m04"] }),
    M("m06", "M6", "Attention", "How does “would” find “umbrella” and “forecast”?", 60, { insight: "Attention lets each token pull in information from earlier tokens, weighted by a relevance score computed fresh for this input. It is the only place where tokens share information.", needs: ["m05", "m04"] }),
    M("m07", "M7", "The Transformer", "What is a full transformer layer, and why stack so many?", 60, { insight: "A block is attention (tokens talk) plus an MLP (each token thinks alone), both adding their results to a shared running vector, the residual stream.", needs: ["m06", "m02"] }),
    M("m08", "M8", "Choosing the Next Token", "How does one final vector become one chosen word?", 50, { insight: "The model scores every token, softmax turns scores into probabilities, and a separate simple sampler picks one.", needs: ["m07"] }),
    M("m09", "M9", "The Generation Loop", "How does one-token prediction become a whole conversation?", 55, { insight: "Generation runs the whole machine once per new token. The model has no memory beyond its context window, and writing out steps gives it more computation.", needs: ["m08"] }),
    M("m10", "M10", "Training at Scale", "How did billions of random numbers become a model that predicts “rain”?", 60, { insight: "Pretraining repeats one tiny step trillions of times: predict, measure the surprise, nudge every weight so the true token is a little less surprising.", needs: ["m02", "m07"] }),
    M("m11", "M11", "From Base Model to Assistant", "How does a raw text-predictor become a helpful, careful assistant?", 60, { insight: "Pretraining gives knowledge and skills; post-training shapes behaviour. A base model continues documents; an assistant follows instructions.", needs: ["m10"] }),
    M("m12", "M12", "Grounding", "How can a model answer about facts it never saw, and why does it sometimes make things up?", 60, { insight: "Hallucination is the game working as designed. Grounding puts the right facts into the context, using a search system that lives outside the model.", needs: ["m04", "m09"] }),
    M("m13", "M13", "Tools and the Agent Loop", "How does a text predictor check the real weather or book a hotel?", 50, { insight: "The model never runs anything. It writes a tool call; your program runs the tool and puts the result back into the context. Put that in a loop and you have an agent.", needs: ["m09", "m12"] }),
    M("s1", "S1", "The Wider Family", "Are image generators just LLMs?", 35, { side: true, insight: "Images and sound can become tokens too; diffusion models generate by removing noise step by step. Vectors, attention and gradient descent are shared.", needs: ["m07"] }),
    M("f1", "F1", "Phase 1 Finale", "Can you explain and defend all of it, alone?", 45, { finale: true, insight: "The Grand Tour at full resolution, your before-and-after pictures, and the Defense.", needs: ["m13"] }),
    M("a00", "A0", "The Team in Action", "What does a finished agent team look like when it works?", 15, { insight: "Watch the finished planner solve Maya's request, then look below the waterline at the engine.", needs: ["m13"] }),
    M("a01", "A1", "From Answer to Action", "When does an LLM app need to be an agent at all?", 50, { insight: "There is a ladder of autonomy: one call, workflows, agents, teams. Climb only as high as the task needs.", needs: ["a00"] }),
    M("a02", "A2", "Graphs", "Why describe an AI system as a graph?", 45, { insight: "A graph makes the flow of work explicit, and unlike a straight pipeline it can loop. Agents need loops.", needs: ["a01"] }),
    M("a03", "A3", "State", "How do the steps share information?", 55, { insight: "Every node reads one shared state and returns only the fields it changes; reducers decide how each change is merged.", needs: ["a02"] }),
    M("a04", "A4", "Decisions", "How does the graph decide what to do next?", 50, { insight: "A normal edge always goes the same way; a conditional edge reads the state to choose; a Command updates the state and chooses in one move.", needs: ["a03"] }),
    M("a05", "A5", "The Engine Room", "What actually happens, step by step, when a graph runs?", 60, { insight: "LangGraph runs in rounds called super-steps: run every scheduled node, merge their updates, save a checkpoint, schedule the next round.", needs: ["a04"] }),
    M("a06", "A6", "The Agent Node", "What does an agent look like inside a graph?", 50, { insight: "An agent is a two-node loop: an LLM node that may request tools and a tool node that runs them, joined by a conditional edge.", needs: ["a05"] }),
    M("a07", "A7", "Teams", "When, and how, should several agents work together?", 60, { insight: "Teams buy focused context, specialisation and parallel work, at the price of tokens, delay and coordination errors. Good design is mostly deciding who sees what.", needs: ["a06"] }),
    M("a08", "A8", "Memory", "How does a graph remember, recover from a crash, and rewind?", 55, { insight: "A checkpointer saves the state at every super-step under a thread ID. That one mechanism gives memory, crash recovery, pausing and time travel.", needs: ["a05"] }),
    M("a09", "A9", "Humans in the Loop", "How does a system pause for a person and carry on later?", 45, { insight: "interrupt() pauses a run, saves everything and waits, for seconds or days. Resuming re-runs that node from its first line.", needs: ["a08"] }),
    M("a10", "A10", "Production", "What does it take to trust this system with real users and real money?", 60, { insight: "Production agents need the discipline of serious software plus defences for how LLMs fail: validation, limits, tracing, evaluation and structural security.", needs: ["a09", "a07"] }),
    M("s2", "S2", "The Wider Agent Ecosystem", "Do these ideas work outside LangGraph?", 30, { side: true, insight: "Concepts transfer; only the names change.", needs: ["a07"] }),
    M("f2", "F2", "Phase 2 Finale", "Can you design, debug and defend a whole agent system?", 60, { finale: true, insight: "The Architect's Studio, the Debugger Challenge, the Defense and your book.", needs: ["a10"] })];
  C.byId = Object.fromEntries(C.modules.map((m) => [m.id, m]));
  C.order = C.modules.map((m) => m.id);
  C.modules.forEach((m) => {
    for (const p of C.phases) for (const a of p.acts) if (a.modules.includes(m.id)) { m.phase = p.id; m.line = p.line; m.act = a.name; }
  });

  /* ---------------------------------------------------------------- the Laws of the Machine */
  C.laws = [
    { id: "l1", n: 1, phase: 1, name: "The Law of the Game", mod: "m01",
      simple: "An LLM does one thing: it reads the text so far and gives a probability to every possible next token. Chat, code, reasoning and tool use are all this one step, repeated.",
      exact: "At each position the model outputs a probability for every token in its vocabulary. A whole text's probability is the product of these (the chain rule).",
      bends: "Diffusion language models refine many tokens at once; some models also learn to predict several future tokens as a side task. Mainstream chat models are still next-token predictors." },
    { id: "l2", n: 2, phase: 1, name: "The Law of Numbers", mod: "m03",
      simple: "Inside the model there is no text. Text becomes tokens, tokens become ID numbers, and IDs become vectors (lists of numbers).",
      exact: "Every internal operation is arithmetic on vectors and matrices. Text exists only at the two ends: the tokeniser and the detokeniser.",
      bends: "Byte-level models skip the tokeniser, but bytes are numbers too." },
    { id: "l3", n: 3, phase: 1, name: "The Law of Two Memories", mod: "m09",
      simple: "A model can only use what is stored in its weights (learned in training) or what is in its context window (the text it can see right now). Search and tools help only by adding text to the context.",
      exact: "Knowledge comes from the weights or from the context. The KV cache is the context stored in a ready-to-use form, not a third memory.",
      bends: "App “memory” features save text and re-insert it. Research on test-time training changes weights during use; it is not standard in products." },
    { id: "l4", n: 4, phase: 1, name: "The Law of Frozen Weights", mod: "m10",
      simple: "While you use a model, its weights do not change. It does not learn from your chat unless someone trains it again.",
      exact: "During use, weights are read, never written.",
      bends: "Conversations may later be used, where allowed, to train a new version. That is new training, done offline." },
    { id: "l5", n: 5, phase: 1, name: "The Law of Looking Back", mod: "m06",
      simple: "In GPT-style models, each token can take information only from itself and earlier tokens, never from later ones.",
      exact: "In decoder-only models a causal mask blocks attention to later positions, in training and in use.",
      bends: "Encoder models such as BERT, and diffusion language models, read in both directions." },
    { id: "l6", n: 6, phase: 1, name: "The Law of Mixing", mod: "m06",
      simple: "Attention is the only step where tokens share information. Every other step works on each token alone.",
      exact: "In a standard Transformer, attention is the only place where information moves between positions; MLPs and normalisation act on each position alone.",
      bends: "Hybrid models (NVIDIA's Nemotron-H, IBM's Granite 4.0, Qwen3-Next) replace most attention layers with Mamba or linear-attention layers. These also move information along the sequence, through a fixed-size running summary." },
    { id: "l7", n: 7, phase: 1, name: "The Law of the River", mod: "m07",
      simple: "Each layer reads a running vector for each token (the residual stream) and adds its result to it. Layers add; they do not replace.",
      exact: "In pre-norm Transformers each sub-layer adds to the stream: x ← x + f(norm(x)).",
      bends: "Older post-norm models normalise the stream after each addition; the final norm also rescales it before the output." },
    { id: "l8", n: 8, phase: 1, name: "The Law of Learned Rules", mod: "m02",
      simple: "Nobody writes the rules inside the model. Training set every weight by nudging numbers so that the true next token becomes less surprising.",
      exact: "Every weight comes from gradient descent on training objectives.",
      bends: "People design the tokeniser, architecture, data mix, objectives and system prompt. The shape and the recipe are designed; the rules inside are learned." },
    { id: "l9", n: 9, phase: 1, name: "The Law of Fixed Effort", mod: "m09",
      simple: "Every token passes through the same number of layers. A harder question cannot get more layers, only more tokens, which is why “thinking out loud” helps.",
      exact: "One forward pass per token costs about 2 operations per active parameter, plus attention work that grows with the length of the context.",
      bends: "Mixture-of-Experts models use only some parameters per token (still a fixed amount); adaptive-depth research models can skip layers." },
    { id: "l10", n: 10, phase: 1, name: "The Law of Plausible, Not True", mod: "m12",
      simple: "Training rewards likely text, not true text. Truth comes from good data, careful post-training, or grounding with retrieved documents and tools.",
      exact: "Pretraining rewards the likelihood of human text: what usually comes next.",
      bends: "Reinforcement learning with checkable rewards trains for correct answers in maths and code; calibration training can teach a model to say “I don't know”." },
    { id: "l11", n: 11, phase: 1, name: "The Law of the Sampler", mod: "m08",
      simple: "The model only produces probabilities. A separate, simple rule (sampling, shaped by settings such as temperature) picks the actual token.",
      exact: "The network outputs scores (logits); a separate decoding rule turns them into one token.",
      bends: "Greedy decoding is fixed in principle, but shared GPU batches can still cause tiny numerical differences." },
    { id: "g1", n: 1, phase: 2, name: "The Law of the Loop", mod: "a01",
      simple: "An agent is an LLM in a loop: decide, act with a tool, look at the result, decide again, until it chooses to stop.",
      exact: "An agent repeats: model call → tool calls → observations → model call, until a stop condition.",
      bends: "Plan-and-execute agents write a plan first; code-acting agents write one small program that calls several tools. Both still loop on what they observe." },
    { id: "g2", n: 2, phase: 2, name: "The Law of the Shared Board", mod: "a03",
      simple: "In LangGraph, nodes never call each other. They read the shared state and return updates to it. The one exception is Send, which hands a specific package to a new task.",
      exact: "In the Graph API, nodes communicate only through state channels.",
      bends: "Side doors: Send (a private input for one task), the Store (memory shared across threads), runtime context (read-only data for the whole run) and a subgraph's own private state." },
    { id: "g3", n: 3, phase: 2, name: "The Law of Merging", mod: "a03",
      simple: "Every state field has a merge rule, called a reducer. With no reducer, a new value replaces the old one, and two writes to the same field in the same round cause an error.",
      exact: "Each state field is a channel with an update rule. The default keeps the last value and allows one write per super-step; a reducer folds many writes into one.",
      bends: "Overwrite skips the reducer to reset a value; DeltaChannel (beta) saves only the changes for fields that keep growing." },
    { id: "g4", n: 4, phase: 2, name: "The Law of Rounds", mod: "a05",
      simple: "A graph runs in rounds called super-steps. In each round, all scheduled nodes run, their updates are merged, and then the edges choose the nodes for the next round.",
      exact: "A super-step has three phases: plan (which nodes were triggered), execute (run them in parallel, their writes hidden from each other), update (apply all writes in a fixed order).",
      bends: "The Functional API hides the rounds behind ordinary function calls, but the same engine runs underneath." },
    { id: "g5", n: 5, phase: 2, name: "The Law of Saving", mod: "a08",
      simple: "With a checkpointer attached, LangGraph saves a checkpoint at each super-step boundary by default, filed under a thread ID. Memory, pausing, resuming and time travel all come from this.",
      exact: "Checkpoints are taken at super-step boundaries, and each task's writes are saved as it finishes.",
      bends: "Durability “async” (the default) writes in the background; “sync” waits for each write; “exit” saves only at the end, which is faster but a crash loses progress." },
    { id: "g6", n: 6, phase: 2, name: "The Law of Stopping", mod: "a04",
      simple: "A run stops when it reaches END, when no node is scheduled, when an interrupt pauses it to wait for a person, or when the recursion limit stops it with an error.",
      exact: "A run ends when no tasks remain, when an interrupt pauses it, or when the recursion limit raises GraphRecursionError.",
      bends: "A paused run is not finished: it waits for a resume, possibly for days." },
    { id: "g7", n: 7, phase: 2, name: "The Law of Edges", mod: "a04",
      simple: "A normal edge always leads to the same next node. A conditional edge, or a node that returns a Command, picks the next node at run time by reading the state.",
      exact: "Normal edges, conditional edges, Command(goto) and Send all decide “what runs next”. Underneath, they all become “which channel wakes which node”.",
      bends: "Routing through Command is decided at run time, so a drawing of the graph may not show every possible path." },
    { id: "g8", n: 8, phase: 2, name: "The Law of Context", mod: "a07",
      simple: "Each agent knows only what is in its own context window. Multi-agent design is mostly deciding who sees what.",
      exact: "An LLM call knows only its prompt. Context engineering has four moves: write, select, compress, isolate.",
      bends: "Memory and retrieval turn the prompt into a designed product, assembled fresh for every call." },
    { id: "g9", n: 9, phase: 2, name: "The Law of Compounding", mod: "a01",
      simple: "Every extra LLM step adds cost, delay and a chance of error. Use the simplest design that works.",
      exact: "Reliability multiplies, cost adds, and time follows the longest chain.",
      bends: "Real failures often cluster (one confusion causes several errors), so measure end-to-end success directly instead of trusting the simple product." }];
  C.lawById = Object.fromEntries(C.laws.map((l) => [l.id, l]));
  C.lawLabel = (id) => { const l = C.lawById[id]; return l ? (l.phase === 1 ? "Law " + l.n : "Agent Law " + l.n) : id; };

  /* ---------------------------------------------------------------- the maths toolkit */
  C.toolkit = [
    { id: "t1", name: "Vectors and the dot product", mod: "m04", used: ["m06", "m08", "m12", "a08"],
      idea: "A vector is a list of numbers that points somewhere. The dot product multiplies matching numbers and adds them up. It equals length × length × cosine of the angle between them, so it is large when two vectors point the same way.",
      example: "a = [2, 1], b = [3, 4]. Dot product = 2×3 + 1×4 = 10. With c = [−1, 2]: 2×(−1) + 1×2 = 0, so a and c are at right angles." },
    { id: "t2", name: "Matrices as machines", mod: "m02", used: ["m04", "m06", "m07", "m11"],
      idea: "A matrix turns one vector into another: each output number is the dot product of the input with one row. Two matrices in a row equal one matrix, which is why networks need a bend between layers.",
      example: "Rows [1, 0] and [1, 1] turn [3, 4] into [3, 7]: first row gives 3, second row gives 3 + 4 = 7." },
    { id: "t3", name: "Probability and logs", mod: "m01", used: ["m08", "m10", "m11"],
      idea: "Chances add up to 1. The chance of a sequence is a product of step-by-step chances (the chain rule). Logs turn multiplying into adding and keep tiny numbers manageable.",
      example: "P(“it would rain”) = P(it) × P(would | it) × P(rain | it would) = 0.1 × 0.3 × 0.2 = 0.006. In logs: log 0.1 + log 0.3 + log 0.2." },
    { id: "t4", name: "Exponentials and softmax", mod: "m06", used: ["m08", "m10", "a04"],
      idea: "e^x turns any score into a positive number; a score bigger by 1 becomes about 2.72 times bigger. Softmax divides each by the total, so they add up to 1.",
      example: "Scores 2, 1, 0 → e² = 7.39, e¹ = 2.72, e⁰ = 1. Total 11.11. Softmax = 0.665, 0.245, 0.090." },
    { id: "t5", name: "Surprise and information", mod: "m01", used: ["m08", "m10", "m11"],
      idea: "Surprise = −log₂(p), in bits. Entropy is the average surprise of a source. Cross-entropy is the average surprise of the truth under your model. KL divergence is the extra surprise caused by using the wrong model.",
      example: "A chance of ½ is 1 bit of surprise; ⅛ is 3 bits; 1/1024 is 10 bits." },
    { id: "t6", name: "Slopes and the chain rule", mod: "m02", used: ["m05", "m10"],
      idea: "A derivative is a slope: how much the output moves when the input moves a tiny bit. The chain rule multiplies slopes through a chain of steps. It is the heart of backpropagation.",
      example: "If y = 3x and z = 2y, then z moves 2 × 3 = 6 for each step of x." },
    { id: "t7", name: "Shapes of growth", mod: "m03", used: ["m06", "m09", "m10"],
      idea: "Linear (double the input, double the cost), quadratic (double the input, four times the cost, like attention over length), exponential (doubling every step), and power laws, which look like straight lines on log–log charts.",
      example: "1,000 tokens → 1 million attention pairs; 2,000 tokens → 4 million." },
    { id: "t8", name: "High-dimensional space", mod: "m04", used: ["m07", "m12"],
      idea: "In thousands of dimensions, random directions are almost at right angles, distances bunch together, and there is room for far more features than dimensions.",
      example: "Two random vectors with 1,000 numbers usually have a cosine between −0.06 and +0.06: almost exactly at right angles." },
    { id: "t9", name: "Graphs and state machines", mod: "a02", used: ["a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10"],
      idea: "Nodes and edges; paths, cycles and reachability. A state machine answers “where am I now, and what can happen next?”",
      example: "writer → critic → (back to writer, or END) is a graph with one cycle." },
    { id: "t10", name: "Reliability maths", mod: "a01", used: ["a07", "a10"],
      idea: "For independent steps, success chances multiply. pass@k: at least one of k tries works. pass^k: all k tries work. Costs add up.",
      example: "Ten steps at 95% each: 0.95¹⁰ ≈ 0.60. One try at 60% gives pass@3 = 1 − 0.4³ = 0.94 but pass^3 = 0.6³ = 0.22." },
    { id: "t11", name: "Concurrency basics", mod: "a03", used: ["a05", "a08", "a09"],
      idea: "Parallel vs sequential; a race (two writers, one slot); a barrier (wait for everyone); idempotent operations (safe to repeat).",
      example: "Setting a booking status to “confirmed” twice is idempotent. Charging a card twice is not." }];
  C.toolById = Object.fromEntries(C.toolkit.map((t) => [t.id, t]));

  /* ---------------------------------------------------------------- the Word Bank */
  const g = {};
  const T = (id, term, def, mod, ex) => { g[id] = { id, term, def, mod, ex }; };
  // Act I
  T("llm", "LLM (large language model)", "A very big language model, trained on huge amounts of text, that writes text one token at a time.", "m00", "GPT, Claude and Llama are LLMs.");
  T("language-model", "language model", "A program that gives a probability to every possible next piece of text, given the text so far.", "m01");
  T("token", "token", "A small piece of text from a fixed list: often a whole short word, sometimes part of a word, a space plus a word, or a punctuation mark.", "m03", "“ umbrella” is one token; “Maya” is two: “May” + “a”.");
  T("probability-distribution", "probability distribution", "A list of chances for every possible outcome. The chances are never negative and they add up to 100%.", "m01", "rain 55%, be 17%, drizzle 13% … all adding to 100%.");
  T("conditional-probability", "conditional probability", "The chance of something, given what came before.", "m01", "P(rain | “it would”) means the chance of “rain” given the words “it would”.");
  T("chain-rule", "chain rule", "Two rules with one name. In probability: the chance of a whole sentence is the product of each word's chance given the words before it. In calculus: slopes through a chain of steps multiply.", "m01");
  T("autoregression", "autoregression", "Making a sequence one piece at a time, where each new piece is added to the input for the next step.", "m01");
  T("generative-model", "generative model", "A model that learns the pattern of its data well enough to make new examples of it.", "m01");
  T("discriminative-model", "discriminative model", "A model that only learns to choose a label for an input, such as “spam” or “not spam”. It cannot make new data.", "m01");
  T("n-gram", "n-gram model (counting model)", "An old kind of language model that predicts the next word from counts of the last few words it has seen in text.", "m01", "A trigram model looks only at the last 2 words.");
  T("sparsity", "sparsity problem", "Most long word combinations never appear in any text, so a counting model has no count for them and gives them zero chance.", "m01");
  T("smoothing", "smoothing", "Giving unseen word combinations a small chance instead of zero, often by falling back to shorter contexts.", "m01");
  T("surprise", "surprise (in bits)", "How unexpected an outcome was: −log₂ of its probability. A coin flip is 1 bit; a 1-in-8 event is 3 bits.", "m01");
  T("bits", "bit", "The unit of information: the surprise of one fair coin flip.", "m01");
  T("entropy", "entropy", "The average surprise of a source. High entropy means hard to predict.", "m01");
  T("cross-entropy", "cross-entropy", "The average surprise of the true next tokens under the model's guesses. Training makes this number smaller.", "m01");
  T("perplexity", "perplexity", "2 to the power of the cross-entropy (in bits): roughly how many equally likely choices the model is torn between.", "m01", "Perplexity 4 = as unsure as choosing among 4 equal options.");
  T("greedy", "greedy decoding", "Always picking the single most likely next token.", "m01");
  T("sampling", "sampling", "Picking the next token at random, using the model's probabilities as the chances.", "m01");
  T("neural-network", "neural network", "A big maths function made of many small steps (layers) with adjustable numbers (weights) that can be tuned to fit examples.", "m02");
  T("neuron", "neuron", "One tiny unit of a network: it multiplies each input by a weight, adds them up with a bias, then bends the result.", "m02");
  T("weight", "weight", "An adjustable number inside a network that training learns. Weights are the model's long-term knowledge.", "m02");
  T("bias", "bias", "An extra number a neuron adds before bending its result, like a starting offset.", "m02");
  T("parameter", "parameter", "Any number the model learns in training: its weights and biases. “7 billion parameters” means 7 billion learned numbers.", "m02");
  T("activation", "activation", "A number the model computes fresh for each input as it runs. Activations are thrown away afterwards; weights stay.", "m02");
  T("hyperparameter", "hyperparameter", "A setting chosen by people, not learned, such as the learning rate or the number of layers.", "m02");
  T("layer", "layer", "Many neurons working side by side on the same input. In maths it is one matrix multiplication.", "m02");
  T("activation-function", "activation function", "The “bend” after each layer (such as ReLU or GELU). Without it, many layers collapse into one straight-line step.", "m02");
  T("relu", "ReLU", "An activation function: keep positive numbers, turn negative numbers into zero.", "m02");
  T("gelu", "GELU", "A smooth activation function used in many transformers: like ReLU but with a soft curve near zero.", "m02");
  T("loss", "loss", "One number that says how wrong the model is on some examples. Training tries to make it smaller.", "m02");
  T("gradient", "gradient", "For every weight: which way to turn it, and how strongly, to make the loss go up. Training steps the opposite way.", "m02");
  T("gradient-descent", "gradient descent", "Learning by many small steps “downhill” on the loss: nudge every weight against its slope, again and again.", "m02");
  T("learning-rate", "learning rate", "How big each training step is. Too small learns slowly; too big jumps around and can explode.", "m02");
  T("backpropagation", "backpropagation", "The method that finds every weight's slope by passing blame backwards through the layers with the chain rule.", "m02");
  T("mini-batch", "mini-batch", "A small random handful of training examples used for one training step.", "m02");
  T("adam", "Adam / AdamW", "A popular way to take training steps: it keeps a running average direction (momentum) and gives each weight its own step size.", "m02");
  T("overfitting", "overfitting", "Memorising the training examples instead of learning the pattern: great on old examples, poor on new ones.", "m02");
  T("generalisation", "generalisation", "Doing well on examples the model has never seen. This is the real goal of training.", "m02");
  T("weight-decay", "weight decay", "Gently pulling every weight towards zero during training, which helps against overfitting.", "m02");
  T("matrix", "matrix", "A grid of numbers. Multiplying a vector by a matrix turns it into a new vector.", "m02");
  // Act II
  T("tokeniser", "tokeniser", "The program that cuts text into tokens and turns them into ID numbers. It is built before the model and is not learned by gradient descent.", "m03");
  T("vocabulary", "vocabulary", "The fixed list of every token a model knows. GPT-2 has 50,257; many newer models have 100,000 to 200,000 or more.", "m03");
  T("token-id", "token ID", "The number of a token in the vocabulary list. The model only ever sees these numbers.", "m03", "“ umbrella” → 36184 in GPT-4's tokeniser.");
  T("subword", "subword", "A piece of a word that is common enough to be its own token.", "m03", "“umbrela” (a typo) splits into pieces like “umb” + “rel” + “a”.");
  T("bpe", "BPE (byte-pair encoding)", "A way to build a vocabulary: start from single bytes and keep merging the most frequent neighbouring pair into a new token.", "m03");
  T("special-token", "special token", "A token with a job instead of text, such as “end of text” or “start of the assistant's turn”.", "m03");
  T("chat-template", "chat template", "The rule that turns a whole chat into one long text with special role markers, so the model can read it as one sequence.", "m03");
  T("vector", "vector", "A list of numbers. You can picture it as an arrow or a point in a space with many directions.", "m04", "[0.2, −1.3, 0.8] is a vector with 3 numbers.");
  T("embedding", "embedding", "The vector that stands for a token (or a piece of text). Similar meanings get nearby vectors.", "m04");
  T("embedding-table", "embedding table", "A big grid with one row of learned numbers for every token in the vocabulary.", "m04");
  T("model-width", "model width", "The length of the vector each token carries inside the model: 768 in GPT-2 small, 12,288 in GPT-3, 64 in Maya-LM.", "m04");
  T("dot-product", "dot product", "Multiply matching numbers of two vectors and add them up. Large when the vectors point the same way, zero when at right angles.", "m04", "[2,1]·[3,4] = 6 + 4 = 10.");
  T("cosine-similarity", "cosine similarity", "The dot product of two vectors after making both of length 1. It measures direction only: 1 = same way, 0 = right angles, −1 = opposite.", "m04");
  T("distributional-hypothesis", "distributional hypothesis", "The idea that words used in similar contexts have similar meanings.", "m04");
  T("one-hot", "one-hot vector", "A vector of all zeros except a single 1, used to point at one item in a list.", "m04");
  T("pca", "PCA", "A way to squash many dimensions down to 2 or 3 for a picture, keeping the directions with the most spread. Some information is always lost.", "m04");
  T("superposition", "superposition", "Storing more features than there are dimensions, as nearly separate directions that overlap a little.", "m04");
  T("rnn", "RNN (recurrent neural network)", "An older network that reads one token at a time and carries a memory vector forward from step to step.", "m05");
  T("hidden-state", "hidden state", "The memory vector an RNN carries from one step to the next.", "m05");
  T("vanishing-gradient", "vanishing gradient", "When the learning signal shrinks to almost nothing as it travels back through many steps, so early words stop teaching anything.", "m05");
  T("lstm", "LSTM (long short-term memory)", "An RNN with learned gates (valves) that decide what to keep, forget and output, giving it a longer memory.", "m05");
  T("gru", "GRU", "A simpler cousin of the LSTM with fewer gates.", "m05");
  T("seq2seq", "seq2seq (encoder–decoder)", "A 2014 design for translation: one network reads the whole input into one vector, another writes the output from it.", "m05");
  T("bottleneck", "bottleneck", "A narrow point that everything must squeeze through, like a whole sentence squeezed into one vector.", "m05");
  T("state-space-model", "state-space model", "A newer kind of layer (such as Mamba) that keeps a fixed-size running summary like an RNN but can still train in parallel.", "m05");
  T("transformer", "Transformer", "The 2017 network design behind modern LLMs: stacked blocks of attention and MLPs, with no reading one-word-at-a-time.", "m05");
  T("attention", "attention", "A step where each token looks at other tokens, scores how relevant each one is, and takes a weighted mix of their information.", "m06");
  T("self-attention", "self-attention", "Attention where the tokens of one text look at each other (not at a different text).", "m06");
  T("query", "query", "A vector each token makes that asks “what am I looking for?”", "m06");
  T("key", "key", "A vector each token makes that says “what do I offer?” Queries are compared with keys.", "m06");
  T("value", "value", "A vector each token makes that holds “what I pass on if chosen”.", "m06");
  T("causal-mask", "causal mask", "A rule that hides later tokens, so each token can only look at itself and earlier tokens.", "m06");
  T("softmax", "softmax", "Turns any list of scores into positive weights that add up to 1: raise e to each score, then divide by the total.", "m06");
  T("multi-head", "multi-head attention", "Several attention “heads” running side by side, each with its own query, key and value weights, so each can look for something different.", "m06");
  T("attention-head", "attention head", "One of the parallel attention units inside a layer.", "m06");
  T("rope", "RoPE (rotary position embedding)", "A way to add word order: rotate parts of each query and key by an angle that depends on position, so attention can sense distance.", "m06");
  T("kv-cache", "KV cache", "Saved keys and values of earlier tokens, so they are not recomputed for every new token. It grows with the text.", "m06");
  T("gqa", "GQA (grouped-query attention)", "Several query heads share one key–value head, which shrinks the KV cache.", "m06");
  T("attention-sink", "attention sink", "A token (usually the first) where a head parks its attention when nothing else is useful, because softmax weights must add up to 1.", "m06");
  T("induction-head", "induction head", "A pair of heads that copies patterns: if “A B” appeared earlier, then on seeing “A” again they predict “B”.", "m07");
  T("transformer-block", "transformer block", "One layer of a Transformer: attention (tokens talk) and an MLP (each token thinks alone), each adding to the residual stream.", "m07");
  T("mlp", "MLP (feed-forward network)", "The part of a block that works on each token alone: widen the vector about 4 times, bend it, narrow it back.", "m07");
  T("residual-stream", "residual stream", "The running vector each token carries up through the layers. Every layer adds its result to it instead of replacing it.", "m07");
  T("residual-connection", "residual connection", "The “+” that adds a layer's output back onto its input.", "m07");
  T("layer-norm", "normalisation (LayerNorm, RMSNorm)", "Rescaling a vector into a steady range before a layer uses it. RMSNorm divides by the root-mean-square and multiplies by a learned gain.", "m07");
  T("swiglu", "SwiGLU", "An MLP variant that multiplies one projection by a gated copy of another. It trains better than a plain MLP.", "m07");
  T("logit-lens", "logit lens", "Decoding the residual stream at a middle layer, to see what the model would predict if it stopped there.", "m07");
  T("moe", "Mixture of Experts (MoE)", "Many MLP “experts” plus a router that sends each token to only a few of them, so the model is huge but each token uses a fraction of it.", "m07");
  T("unembedding", "unembedding", "The last step: compare the final vector with every token's output vector to get one score per token.", "m08");
  T("logit", "logit", "A raw score for one token, before softmax. Only differences between logits matter.", "m08");
  T("temperature", "temperature", "A setting that divides the logits before softmax. Below 1 sharpens the choices; above 1 flattens them.", "m08");
  T("top-k", "top-k", "Keep only the k most likely tokens before sampling.", "m08");
  T("top-p", "top-p (nucleus sampling)", "Keep the smallest set of top tokens whose chances add up to p, then sample from those.", "m08");
  T("min-p", "min-p", "Keep tokens whose chance is at least a set fraction of the top token's chance.", "m08");
  T("beam-search", "beam search", "Keeping several candidate sentences at once and extending the best ones; common in translation, rare in chat.", "m08");
  T("repetition-penalty", "repetition penalty", "Lowering the scores of tokens already used, to stop loops.", "m08");
  T("weight-tying", "weight tying", "Using the same table for turning tokens into vectors and for scoring the next token. GPT-2 and Maya-LM do this.", "m08");
  T("calibration", "calibration", "Whether confidence matches accuracy: a calibrated “70% sure” is right about 70% of the time.", "m08");
  T("constrained-decoding", "constrained decoding", "Blocking every token that would break a required format (such as valid JSON) before sampling.", "m08");
  T("speculative-decoding", "speculative decoding", "A small model drafts a few tokens; the big model checks them all at once; the output stays exactly as the big model would choose.", "m08");
  T("context-window", "context window", "The most tokens a model can see at once: its working memory for this call.", "m09");
  T("prefill", "prefill", "Reading the whole prompt at once, in parallel, before the first new token.", "m09");
  T("decode", "decode", "Making new tokens one at a time after the prompt is read.", "m09");
  T("statelessness", "statelessness", "The model keeps nothing between calls. Chat apps re-send the whole conversation every time.", "m09");
  T("system-prompt", "system prompt", "Instructions placed at the start of the context by the app, before the user's messages.", "m09");
  T("few-shot", "few-shot prompting", "Putting a few worked examples in the prompt so the model copies the pattern.", "m09");
  T("in-context-learning", "in-context learning", "Adapting to examples in the prompt without changing any weight. The “learning” lives in activations.", "m09");
  T("chain-of-thought", "chain-of-thought", "Writing intermediate steps before the answer. Each written token gives the model another full pass of computation.", "m09");
  T("reasoning-model", "reasoning model", "A model trained to think at length before answering, spending more computation at answer time.", "m09");
  T("test-time-compute", "test-time compute", "Computation spent while answering (for example, thinking tokens), as opposed to during training.", "m09");
  // Act III
  T("pretraining", "pretraining", "The first, biggest training stage: predict the next token across trillions of tokens of text.", "m10");
  T("self-supervised", "self-supervised learning", "Learning where the data supplies its own answers (the next token), so no human labels are needed.", "m10");
  T("scaling-law", "scaling law", "The finding that loss falls smoothly and predictably as parameters, data and compute grow.", "m10");
  T("compute-optimal", "compute-optimal training", "Splitting a fixed budget well between model size and data. Chinchilla (2022) found about 20 tokens per parameter.", "m10");
  T("flops", "FLOPs (operations)", "Floating-point operations: the count of multiply-and-add steps. Training costs about 6 × parameters × tokens.", "m10");
  T("gpu", "GPU", "A graphics chip with thousands of small calculators. It does the matrix maths of AI very fast.", "m10");
  T("parallelism", "data, tensor and pipeline parallelism", "Ways to split training across many chips: by data, by splitting each matrix, or by splitting the layers.", "m10");
  T("validation-loss", "validation loss", "The loss on text held back from training. It shows whether the model generalises.", "m10");
  T("memorisation", "memorisation", "Recalling training text word for word. It happens most for rare text that was repeated many times.", "m10");
  T("base-model", "base model", "The model straight after pretraining: it continues documents but does not follow instructions well.", "m11");
  T("post-training", "post-training", "The training after pretraining (SFT, preference tuning, RL) that shapes how the model behaves.", "m11");
  T("sft", "SFT (supervised fine-tuning)", "Training on example conversations: an instruction and an ideal reply.", "m11");
  T("rlhf", "RLHF", "Reinforcement learning from human feedback: people compare answers, a reward model learns their taste, and the LLM is trained to score higher.", "m11");
  T("reward-model", "reward model", "A model trained to score answers the way people would rank them.", "m11");
  T("kl-penalty", "KL penalty (the leash)", "A cost for drifting too far from the starting model during preference tuning.", "m11");
  T("kl-divergence", "KL divergence", "How different one probability distribution is from another: the extra surprise caused by using the wrong one.", "m11");
  T("ppo", "PPO", "A common reinforcement-learning method that changes the model in small, clipped steps.", "m11");
  T("dpo", "DPO (direct preference optimisation)", "Learning straight from pairs of chosen and rejected answers, with no separate reward model.", "m11");
  T("grpo", "GRPO", "Sample several answers to one question and reward each by how much better it did than the group's average.", "m11");
  T("rlvr", "RLVR", "Reinforcement learning with verifiable rewards: reward only answers that can be checked, such as maths results or passing code tests.", "m11");
  T("constitutional-ai", "Constitutional AI", "Training where the model critiques and revises its own answers against written principles, and AI feedback replaces some human labels.", "m11");
  T("distillation", "distillation", "A big teacher model trains a small student model, using the teacher's full probability lists.", "m11");
  T("quantisation", "quantisation", "Storing weights with fewer bits (8 or 4 instead of 16) to save memory.", "m11");
  T("lora", "LoRA", "Fine-tuning by training small add-on matrices instead of every weight.", "m11");
  T("reward-hacking", "reward hacking", "Finding a trick that scores well with the reward model without truly being better.", "m11");
  T("sycophancy", "sycophancy", "Telling people what they want to hear: flattery or agreeing too easily.", "m11");
  T("red-teaming", "red-teaming", "Attacking a model on purpose to find its failures before others do.", "m11");
  T("goodhart", "Goodhart's law", "When a measure becomes a target, it stops being a good measure.", "m11");
  // Act IV
  T("hallucination", "hallucination", "Fluent, confident text that is false. It is the model producing plausible text, as it was trained to.", "m12");
  T("parametric-knowledge", "parametric knowledge", "Knowledge stored in the weights during training.", "m12");
  T("knowledge-cutoff", "knowledge cutoff", "The date after which the training data stops, so the weights know nothing newer.", "m12");
  T("rag", "RAG (retrieval-augmented generation)", "Find relevant documents with a search system and paste them into the prompt, so the model answers from them.", "m12");
  T("chunking", "chunking", "Cutting documents into passages before embedding them. Size and overlap matter.", "m12");
  T("embedding-model", "embedding model", "A separate model that turns a whole passage or question into one vector, trained so that matching questions and passages land close together.", "m12");
  T("vector-database", "vector database", "A database built to store vectors (with their text) and find the nearest ones fast.", "m12");
  T("ann", "ANN (approximate nearest neighbour) search", "Finding vectors that are almost certainly the nearest, much faster than checking every one.", "m12");
  T("hnsw", "HNSW", "A search index that links each vector to near neighbours in layers, like motorways, main roads and streets; a search hops greedily closer.", "m12");
  T("bm25", "BM25", "Classic keyword scoring that rewards rare words that match exactly.", "m12");
  T("hybrid-search", "hybrid search", "Combining keyword search and vector search, then merging the two ranked lists.", "m12");
  T("reranker", "reranker (cross-encoder)", "A slower, more careful model that reads the question and each candidate passage together and re-scores them.", "m12");
  T("bi-encoder", "bi-encoder", "An embedding model that embeds questions and passages separately, so passages can be embedded once, in advance.", "m12");
  T("contrastive", "contrastive learning", "Training that pulls matching pairs together and pushes non-matching pairs apart.", "m12");
  T("recall-at-k", "recall@k", "Whether the right passage appears among the top k search results.", "m12");
  T("prompt-injection", "prompt injection", "Hostile instructions hidden inside text the model reads (a web page, a review, a document).", "m12");
  T("tool-calling", "tool calling (function calling)", "The model writes a structured request (tool name and arguments); a program runs the tool and returns the result as text.", "m13");
  T("json", "JSON", "A simple text format for structured data, like {\"city\": \"Paris\"}.", "m13");
  T("json-schema", "JSON Schema", "A description of what a piece of JSON must look like: which fields, which types.", "m13");
  T("structured-output", "structured output", "Making the model's answer fit an exact format, such as a JSON object with set fields.", "m13");
  T("react", "ReAct", "A loop of reason → act → observe → repeat, from a 2022 paper. The basic agent pattern.", "m13");
  T("agent", "agent", "An LLM in a loop that decides its own next steps and uses tools until it chooses to stop.", "m13");
  T("mcp", "MCP (Model Context Protocol)", "An open standard for connecting tools and data sources to AI apps.", "m13");
  T("tool-search", "tool search", "Finding the few tools a request needs by searching their descriptions, so only those are loaded into the context.", "m13");
  T("lethal-trifecta", "lethal trifecta", "An agent with private data, untrusted content and a way to send data out can be tricked into leaking. Remove one of the three.", "m13");
  T("vit", "Vision Transformer (ViT)", "A Transformer for images: cut the picture into small squares (patches), turn each into a vector, and run attention over them.", "s1");
  T("diffusion-model", "diffusion model", "A model that makes an image by starting from pure noise and removing noise step by step, guided by text.", "s1");
  T("clip", "CLIP", "A pair of encoders (image and text) trained so a picture and its caption land close together.", "s1");
  T("multimodal", "multimodal model", "A model that reads more than one kind of input, such as text and images, in one sequence.", "s1");
  T("guidance", "classifier-free guidance", "Running a diffusion model with and without the prompt, then pushing harder in the direction the prompt adds. Its strength is the guidance scale.", "s1");
  T("cross-attention", "cross-attention", "Attention where the queries come from one sequence (an image being made) and the keys and values from another (the prompt's words).", "s1");
  T("audio-codec", "neural audio codec", "A network that turns sound into a short stream of tokens from learned codebooks, and turns tokens back into sound.", "s1");
  T("latent-diffusion", "latent diffusion", "Diffusion done on a compressed version of the image, which is far cheaper than raw pixels.", "s1");
  // Phase 2
  T("workflow", "workflow", "An LLM app whose steps follow code paths you fixed in advance.", "a01");
  T("pass-at-k", "pass@k", "The chance that at least one of k tries succeeds.", "a01");
  T("pass-hat-k", "pass^k", "The chance that all k tries succeed: what a customer-facing agent needs.", "a01");
  T("error-compounding", "error compounding", "Small chances of error at each step multiply into a big chance that something goes wrong.", "a01");
  T("langgraph", "LangGraph", "An open-source framework for building agent systems as graphs with shared state, loops, saves and pauses.", "a02");
  T("graph", "graph", "A set of nodes (things) joined by edges (connections). In LangGraph, the nodes are steps of work.", "a02");
  T("node", "node", "A unit of work in a graph: an LLM call, a tool, a plain function, a human step, or a whole sub-team.", "a02");
  T("edge", "edge", "A connection that says what runs next.", "a02");
  T("conditional-edge", "conditional edge", "An edge that runs a small routing function on the state to choose the next node.", "a04");
  T("start-end", "START and END", "Special nodes: START is where the input enters; END is where a branch finishes.", "a02");
  T("dag", "DAG", "A directed acyclic graph: a graph with no loops.", "a02");
  T("stategraph", "StateGraph", "LangGraph's main builder: a graph whose nodes all share one state.", "a02");
  T("compile", "compile", "Checking a graph's structure and attaching services such as the checkpointer, before it can run.", "a02");
  T("pregel", "Pregel", "Google's 2010 system for computing on huge graphs in rounds. LangGraph's runtime is built on the same idea.", "a02");
  T("state", "state", "One shared record of everything a graph run knows, with named fields.", "a03");
  T("state-schema", "state schema", "The list of named fields in the state and their types.", "a03");
  T("reducer", "reducer", "A field's merge rule: how a new update combines with the old value (replace, append, or a custom rule).", "a03");
  T("channel", "channel", "The internal slot behind each state field, with its own merge rule and version number.", "a03");
  T("add-messages", "add_messages", "LangGraph's reducer for chat messages: append new ones, replace any with the same ID.", "a03");
  T("command", "Command", "A node's return value that carries both a state update and the name of the next node.", "a04");
  T("recursion-limit", "recursion limit", "A cap on the number of super-steps in one run. Hitting it stops the run with an error.", "a04");
  T("super-step", "super-step", "One round of a graph run: run every scheduled node, merge their updates, save, schedule the next round.", "a05");
  T("send", "Send", "A way to start tasks at run time, each with its own private input. Used for fan-out (map-reduce).", "a05");
  T("fan-out", "fan-out / fan-in", "Splitting work into parallel branches, then joining their results.", "a05");
  T("barrier", "barrier (join)", "A point where the graph waits for every branch to finish before going on.", "a05");
  T("pending-writes", "pending writes", "Writes of tasks that finished in a round where another task failed. They are kept, so finished work is not redone.", "a05");
  T("streaming", "streaming modes", "Ways to watch a run live: values (full state each round), updates (what changed), messages (LLM tokens), custom (your own events).", "a05");
  T("tool-node", "tool node", "A node that runs every tool call the LLM asked for and adds the results as tool messages.", "a06");
  T("middleware", "middleware", "Hooks that run before or after each model call or tool call, for example to trim history or ask for approval.", "a06");
  T("subagent", "subagent", "A specialist agent that a main agent calls like a tool. It starts fresh each time and returns a short answer.", "a07");
  T("handoff", "handoff", "Passing control from one agent to another, like a relay baton.", "a07");
  T("router", "router", "A step that classifies the input and sends it to the right specialist.", "a07");
  T("subgraph", "subgraph", "A whole compiled graph used as one node inside a bigger graph.", "a07");
  T("context-engineering", "context engineering", "Designing what goes into each model call: write, select, compress and isolate information.", "a07");
  T("checkpointer", "checkpointer", "The component that saves the state at every super-step (in memory, SQLite or Postgres).", "a08");
  T("checkpoint", "checkpoint", "One saved snapshot: the state values, which nodes run next, metadata and a link to the previous checkpoint.", "a08");
  T("thread", "thread", "One conversation or run, named by a thread ID. Saves are filed under it.", "a08");
  T("store", "Store (long-term memory)", "Memory kept across threads, filed under namespaces such as (\"maya\", \"preferences\").", "a08");
  T("time-travel", "time travel", "Replaying from an earlier checkpoint, or forking: editing the state there and running a new branch.", "a08");
  T("durable-execution", "durable execution", "A run can stop and continue later from its last save.", "a08");
  T("interrupt", "interrupt()", "A call inside a node that pauses the run, saves everything and waits for a person's answer.", "a09");
  T("resume", "resume", "Continuing a paused run with Command(resume=answer). The paused node runs again from its first line.", "a09");
  T("idempotent", "idempotent", "Safe to repeat: doing it twice has the same effect as doing it once.", "a09");
  T("guardrail", "guardrail", "A check on inputs or outputs: format, policy or budget.", "a10");
  T("tracing", "tracing", "Recording every step, prompt, tool call and token count of a run, so it can be inspected later.", "a10");
  T("span", "span", "One recorded step in a trace, with its inputs, outputs, tokens and time.", "a10");
  T("llm-judge", "LLM-as-judge", "Using a model with a scoring rubric to grade another model's answers.", "a10");
  T("least-privilege", "least privilege", "Giving each agent only the tools it truly needs.", "a10");
  T("double-texting", "double-texting", "When a user sends a new message while a run is still going: reject, queue, interrupt or roll back.", "a10");
  T("a2a", "A2A (Agent2Agent)", "A protocol that lets agents from different systems work together.", "s2");
  C.glossary = g;

  /* ---------------------------------------------------------------- the concept inventory (Concept Constellation) */
  C.concepts = {
    m00: ["the whole pipeline", "training vs use", "three mysteries"],
    m01: ["language model", "probability distribution", "conditional probability", "chain rule", "log-probability", "bits of surprise", "cross-entropy", "perplexity", "prediction as compression", "generative vs discriminative", "autoregression", "n-gram model", "smoothing", "sparsity"],
    m02: ["neuron", "weight and bias", "layer", "activation function", "universal approximation", "depth and feature hierarchies", "loss", "gradient", "gradient descent", "backpropagation", "mini-batches", "momentum and Adam", "initialisation", "generalisation and overfitting", "weight decay", "parameters vs activations vs hyperparameters"],
    m03: ["token", "tokeniser", "vocabulary", "token ID", "BPE training and encoding", "pre-splitting rules", "vocabulary-size trade-off", "the language tax", "glitch tokens", "special tokens", "chat template", "Unigram and byte-level alternatives"],
    m04: ["vector", "embedding", "embedding table as a matrix", "model width", "distributional hypothesis", "dot product", "cosine similarity", "near-orthogonality and superposition", "negative sampling", "weight tying", "contextual vectors", "projection (PCA, UMAP)"],
    m05: ["RNN", "hidden state", "vanishing and exploding gradients", "gradient clipping", "LSTM and GRU", "gates", "additive cell path", "seq2seq", "bottleneck", "alignment", "state-space models", "the bitter lesson", "the hardware lottery"],
    m06: ["self-attention", "query, key, value", "scaled dot product", "causal mask", "softmax", "QK and OV circuits", "multi-head attention", "permutation equivariance", "RoPE", "teacher forcing", "attention cost", "KV-cache memory", "grouped-query attention", "attention sinks", "induction heads"],
    m07: ["transformer block", "pre-norm", "residual stream", "RMSNorm", "MLP as key–value memory", "SwiGLU", "superposition and sparse autoencoders", "parameter count", "compute per token", "mixture of experts and routing", "encoder vs decoder", "hybrid architectures", "logit lens and tuned lens"],
    m08: ["unembedding", "logits", "shift invariance", "score gaps as ratios", "greedy decoding", "sampling", "temperature", "top-k", "top-p", "min-p", "repetition penalty", "beam search", "likelihood trap", "calibration", "constrained decoding", "speculative decoding"],
    m09: ["generation loop", "prefill vs decode", "compute-bound vs memory-bound", "time to first token", "KV cache", "continuous batching", "paged attention", "prompt caching", "context window", "statelessness", "system prompt", "in-context learning", "chain-of-thought", "test-time compute"],
    m10: ["self-supervised learning", "cross-entropy gradient", "loss curves", "scaling laws", "compute-optimal training", "training compute (6 × N × D)", "training memory", "data, tensor and pipeline parallelism", "deduplication and filtering", "memorisation", "the emergence debate", "world-model evidence"],
    m11: ["base model", "SFT", "reward model (Bradley–Terry)", "RLHF and the KL leash", "PPO", "DPO", "GRPO", "outcome vs process rewards", "Constitutional AI", "distillation", "quantisation", "LoRA", "Goodhart's law"],
    m12: ["hallucination", "parametric vs non-parametric knowledge", "RAG", "chunking", "contrastive training (InfoNCE)", "bi-encoder vs cross-encoder", "vector database", "ANN search", "HNSW", "IVF and PQ", "curse of dimensionality", "hybrid search (BM25, rank fusion)", "contextual retrieval", "recall@k, MRR, faithfulness", "agentic RAG"],
    m13: ["tool calling", "JSON Schema", "constrained calls", "parallel tool calls", "ReAct", "agent loop", "quadratic context cost", "code as action", "MCP", "tool search", "lethal trifecta (preview)"],
    s1: ["images as tokens", "Vision Transformer", "CLIP", "diffusion training", "latent diffusion", "autoregressive images", "audio tokens", "multimodal LLMs"],
    a01: ["workflow vs agent", "workflow patterns", "reliability, cost and time maths", "pass@k vs pass^k", "policy view of agents", "planning styles", "Contract Net Protocol"],
    a02: ["graph", "node", "edge", "StateGraph", "Pregel actors and channels", "compile", "Functional API"],
    a03: ["state schema", "channel types", "reducer", "add_messages", "Overwrite", "runtime context"],
    a04: ["branch function", "path map", "Command", "recursion limit", "safe LLM routers", "loop caps"],
    a05: ["super-step phases", "pull and push tasks", "Send", "barrier joins", "deferred nodes", "pending writes", "retry policies", "streaming modes", "durability modes"],
    a06: ["message types and pairing", "tool node", "create_agent and middleware", "structured output", "quadratic agent cost"],
    a07: ["subagents", "handoffs", "skills", "router", "custom workflow", "subgraph", "context engineering", "topologies and the blackboard", "MAST failure families", "debate and voting"],
    a08: ["checkpointer", "thread", "checkpoint contents", "replay", "fork", "Store and namespaces", "hot-path vs background memory", "memory types", "memory hygiene"],
    a09: ["interrupt", "resume and order matching", "idempotency", "typed interrupts", "breakpoints"],
    a10: ["lethal trifecta", "injection defences", "evaluation layers", "traces and spans", "cost control", "double-texting", "safe rollout"],
    s2: ["MCP", "A2A", "the Rosetta table"]};
})();
