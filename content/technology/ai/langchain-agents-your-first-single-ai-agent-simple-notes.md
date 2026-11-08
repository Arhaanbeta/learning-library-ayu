---
id: tech-langchain-first-agent
title: "LangChain Agents – Your First Single AI Agent (Simple Notes)"
summary: "In this lesson, we build our first AI agent using LangChain, run it, add our own tool to it, give it a simple web page, and put it on the internet for free."
minutes: 30
source: "https://claude.ai/artifact/UsaTaxkvFUNQrXjRWx5ZMW"
---
## 1. The big picture: what this lesson is about

In this lesson, we build our **first AI agent** using **LangChain**, run it, add our own tool to it, give it a simple web page, and put it on the internet for free.

**Where this lesson fits in the course**

The teacher's course on **Agentic AI** (AI systems that can plan and act by themselves, not just answer questions) has about **12 phases** (big parts of the course).

| Phase | What it covers |
| --- | --- |
| Phase 1 (done) | What AI agents are: their workflow (the order of steps they follow), components (parts), characteristics (special qualities), and how they work |
| Phase 2 (done) | **Asynchronous programming** (code that can do many waiting jobs at the same time, like a cook boiling rice while cutting vegetables) and **Pydantic** (a Python library that checks that data has the right shape and type, for example that "age" is a number) |
| **Phase 3 (this lesson)** | **LangChain agent fundamentals** (the basic ideas of building agents with LangChain) |
| Later phases | LangGraph, CrewAI, Microsoft AutoGen, n8n and more |

**Why learn LangChain first?**

- **LangChain** is a **Generative AI framework** (a ready-made set of code tools that helps you build apps that create text, like chatbots). For example, it gives you ready code to talk to ChatGPT-like models.
- When AI agents first appeared, there were no special **agentic orchestration frameworks** (tools made only to connect and manage the parts of an agent, like a music conductor who controls all the players). So people used LangChain to build agents.
- Today, newer frameworks made only for agents exist: **LangGraph**, **CrewAI**, **Microsoft AutoGen**.
- If you first learn the "old way" with LangChain, you will clearly see **why** these new frameworks came, and what problems (drawbacks) developers faced. The teacher will explain these limits in the next video.

**What we build in this lesson**

- A **single-agent system** (an app where only one agent does all the work). A **multi-agent system** (many agents working together as a team) comes in the next video.
- We also **deploy** it (put it on a cloud computer so anyone on the internet can use it).

**Prerequisite** (something you must know before starting): basic LangChain. If you are completely new to LangChain, first watch the teacher's video "Ultimate LangChain Crash Course for Developers".

## 2. Quick revision: a normal LLM vs an AI agent

A normal LLM can only answer from what it already learned; an AI agent can also **go out and fetch new information** using tools.

**Definition of an AI agent (in simple words)**

An **AI agent** is a smart computer system. You give it a **high-level goal** (a big task, like "Find the capital of India and its weather"). Then, **by itself** (autonomously), it:

1. **Plans** (breaks the big goal into small steps),
2. **Decides** (chooses what to do next),
3. **Executes** (does the actions one by one, in a sequence),
4. uses **external tools** (outside helpers, like a web search), **APIs** (Application Programming Interface: a door through which one program asks another program for data, like a waiter taking your order to the kitchen), or **knowledge sources** (places with information, like documents or databases),
5. keeps the **context** (remembers what happened in earlier steps),
6. **reasons over multiple steps** (thinks step by step),
7. **adapts** to new information (changes its plan when it learns something new),
8. and works towards the **intended outcome** (the result you wanted).

**The key difference**

|  | Normal LLM | AI agent |
| --- | --- | --- |
| How it works | Prompt in, answer out. One step. | Thinks, uses tools, checks results, repeats, then answers |
| Connection to outside tools/APIs | None | Yes |
| Knows new facts (after training)? | No. It only knows its **knowledge base** (what it learned during **training**, the time when it was taught using huge amounts of text) | Yes, by using tools like web search |
| Role of the LLM | It is the whole system | It is only the **brain** (used for **reasoning**: thinking and deciding) |

- **LLM** = Large Language Model (a very big AI program trained on lots of text, which can understand and write language; for example, GPT-3.5 Turbo behind ChatGPT).
- **Prompt** = the question or instruction you type to the AI.
- **Why reasoning matters:** with reasoning, the agent decides **when** to use **which** tool.

**What is an orchestration framework doing here?**

To make an agent, we must join three things together: the **LLM**, the **tools/APIs/knowledge**, and the **reasoning ability**. The **orchestration framework** is the code library that joins them. In this lesson, that framework is **LangChain**.

> Memory line: **LLM = brain only. Agent = brain + hands (tools) + a loop of thinking.**

## 3. Setup: environment, packages and API keys

Before coding, we make a clean Python space, install the needed packages, and save our secret API keys in a `.env` file.

**Step 1: Open the project**

Open the project folder in **VS Code** (Visual Studio Code: a free app for writing code) and open its **terminal** (a window where you type commands for the computer).

**Step 2: Create and activate a virtual environment**

A **virtual environment** is a separate, clean box for one project's Python and packages, so different projects do not mix. For example, Project A can use one version of a library and Project B another.

```bash
conda create -n langagent python=3.11 -y
conda activate langagent
```

- **conda** = a tool that creates and manages these environments.
- `-n langagent` = the name of the box (you can choose any name).
- `python=3.11` = the Python version.
- `-y` = "yes" to all questions, so it does not stop to ask.
- **activate** = "enter" the box so that your commands use it.

The teacher keeps all these commands in a `README.md` file (a text file that explains a project; `.md` means **Markdown**, a simple way to format text).

**Step 3: List the packages in `requirements.txt`**

A **package** (or **library**) is ready-made code you can download and use. `requirements.txt` is a list of all packages the project needs.

| Package | Why we need it |
| --- | --- |
| `langchain` | The main orchestration framework |
| `langchain-community` | Extra tools made by the community (other developers), such as the Tavily search tool |
| `langchain-core` | The basic building blocks LangChain needs to run (a **dependency**: something another package depends on) |
| `langchain-openai` | Lets LangChain talk to OpenAI's models (our LLM brain) |
| `langchainhub` | Lets us download ready-made prompts from **LangChain Hub** |
| `requests` | Lets Python call websites and APIs (we use it later for weather data) |
| `tavily-python` | The Tavily internet search tool |
| `python-dotenv` | Reads secret keys from the `.env` file (**environment management**) |
| `streamlit` (added later) | Builds a simple web page for our agent |

Install them all:

```bash
pip install -r requirements.txt
```

**pip** is Python's package installer. `-r` means "read the list from this file".

**Step 4: Get API keys and save them in `.env`**

An **API key** is a secret password that lets your code use a paid or online service. A **`.env` file** stores these secrets outside your code (env = environment).

| Key | Where to get it | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API platform → **API keys** (left side) → create new key | For the LLM |
| `TAVILY_API_KEY` | tavily.com → sign up → dashboard → create key | New accounts get **1,000 free credits**: enough for learning; production needs a paid plan |
| `WEATHERSTACK_API_KEY` | weatherstack.com → sign up free → dashboard | Used later for the weather tool; the free plan gives current weather only |

- Never share your keys. The teacher deletes his keys after recording. Create **your own**.
- You can use **any LLM provider**, not only OpenAI. Free options: **OpenRouter**, **Groq**, **Gemini**. Free models often give weaker answers, so the teacher uses OpenAI to show the best results.

**Step 5: Make a notebook for experiments**

Create a folder `research` and inside it a **Jupyter Notebook** file `agent_demo.ipynb` (a file where you run code in small blocks called **cells** and see the result under each one; good for testing). Copy the `.env` file into `research` too, so the notebook can find the keys. Select the `langagent` environment as the notebook's **kernel** (the Python engine that runs the cells). The first time, VS Code may install **ipykernel** (a helper package that lets Jupyter use your environment).

## 4. Imports, loading keys, and Tool 1: Tavily search

Tavily is the agent's "internet eyes": a **search tool** that looks up fresh information on the web.

**Imports** (bringing ready-made code into our file)

```python
import os
import certifi
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain import hub
from langchain.agents import create_react_agent, AgentExecutor
```

| Import | What it is |
| --- | --- |
| `os` | Lets Python talk to the **operating system** (Windows, macOS, Linux), for example to read environment variables |
| `certifi` | Gives an up-to-date list of trusted security certificates (see the SSL fix below) |
| `load_dotenv` | Reads the keys from `.env` |
| `ChatOpenAI` | A **class** (a blueprint for making objects) used to load any OpenAI chat model |
| `TavilySearchResults` | The Tavily search tool, from `langchain_community` |
| `hub` | Downloads ready prompts from LangChain Hub |
| `create_react_agent` | A **function** (a named block of code that does one job) that builds a ReAct agent |
| `AgentExecutor` | The "engine" that runs the agent step by step |

**Loading the keys**

```python
os.environ["SSL_CERT_FILE"] = certifi.where()   # optional fix for Windows
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
```

- An **environment variable** is a named value stored outside your code, such as `OPENAI_API_KEY`. `os.getenv("NAME")` reads it.
- **The SSL fix (optional):** **SSL** (Secure Sockets Layer) is the lock that keeps internet connections safe; it uses **certificates** (digital ID cards that prove a website is real). Trusted certificates come from a **Certificate Authority** (CA: a trusted organisation that issues these ID cards). On **Windows**, Python sometimes points to an old certificate **path** (file location) and you get errors. This line tells Python to always use `certifi`'s fresh, trusted list. On macOS or Linux you usually do not need it. Add it only if you see a path or certificate error.

**Creating and testing the search tool**

```python
search_tool = TavilySearchResults(max_results=2)
result = search_tool.invoke("Give me the latest news on AI")
print(result)
```

- `max_results=2` = how many search results (reference websites) you want. 2 gives two websites; 5 gives five.
- `.invoke(...)` = "run this now with this input". In LangChain, almost everything is run with `.invoke()`.
- The result is a list of website **URLs** (web addresses) with text from each page. In the demo, it returned AI news from March 2026, including a page from Google's blog.

> Memory line: **Tavily = the agent's Google search. `max_results` = how many websites it reads.**

## 5. The brain: loading the LLM

The LLM is the agent's brain; on its own it only knows facts up to its training date, which is exactly why the agent needs tools.

```python
llm = ChatOpenAI(
    model="gpt-3.5-turbo",
    temperature=0,
    api_key=OPENAI_API_KEY,
)

llm.invoke("What year is it?")
llm.invoke("Tell me a joke about AI")
```

- `model` = which OpenAI model to use. The teacher uses **GPT-3.5 Turbo**; you can choose a newer one (he mentions GPT-4/4.5).
- `temperature` = the **creativity** setting. **0** = very focused, gives almost the same answer every time (good for facts). A higher number like 0.8 = more random and creative (good for stories).
- `api_key` = your OpenAI key.

**The important test**

- Asked "What year is it?", GPT-3.5 Turbo answered **2022**, even though the real year is 2026.
- Why? Its **training data** (the text it learned from) stops around 2022. It has no newer facts.
- The joke question worked fine, so the LLM itself works. It just has **old knowledge**.

> Memory line: **An LLM is like a very smart student who has been asleep since 2022. Tools wake it up with today's news.**

## 6. The ReAct prompt from LangChain Hub

The prompt is the agent's **rule book**: it tells the agent to think, act, observe, and repeat until it knows the final answer.

**What is LangChain Hub?**

**LangChain Hub** is an online library of ready-made prompts shared by many developers. You can download one instead of writing your own. For `create_react_agent`, the recommended prompt is the popular `hwchase17/react` prompt.

```python
prompt = hub.pull("hwchase17/react")
print(prompt)
```

`hub.pull(...)` = download this prompt from the Hub.

**What the prompt says (the important parts)**

```text
Answer the following questions as best you can.
You have access to the following tools: {tools}

Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!
Question: {input}
Thought: {agent_scratchpad}
```

| Part | Meaning in simple words |
| --- | --- |
| `{tools}`, `{tool_names}` | **Placeholders** (empty boxes that LangChain fills in automatically) for the list of tools the agent can use |
| **Question** | The user's input |
| **Thought** | "What should I do next?" The LLM thinks |
| **Action** | Which tool to use (must be one of the given tools) |
| **Action Input** | What to send to that tool (for example, the search words) |
| **Observation** | What the tool sent back (the result) |
| "can repeat N times" | The loop keeps going |
| "I now know the final answer" | The **stop signal**: end the loop |
| **Final Answer** | The answer shown to the user |
| `{agent_scratchpad}` | The agent's **rough notebook**: it holds all earlier Thoughts, Actions and Observations, so the agent remembers what it already did |

**Why use this ready prompt?** If you write your own and forget a part (for example, the stop rule or the scratchpad), the agent may give wrong answers or loop forever. **Good prompting is very important when you build agents.**

## 7. Building and running the agent

We need only two calls: `create_react_agent` builds the agent from **LLM + tools + prompt**, and `AgentExecutor` runs it.

**Step 1: Put the tools in a list**

```python
tools = [search_tool]
```

A **list** in Python is a collection of items inside `[ ]`. You can add many tools here, even hundreds.

**Step 2: Create the agent (3 ingredients)**

```python
agent = create_react_agent(llm, tools, prompt)
```

| Ingredient | Its job |
| --- | --- |
| `llm` | The **brain**: does the reasoning |
| `tools` | The **hands**: fetch outside information |
| `prompt` | The **rule book**: tells the agent how to behave |

This returns an **agent object** (a ready-to-use thing in memory that holds the agent). But it cannot run by itself yet.

**Step 3: Wrap it in an AgentExecutor (3 arguments)**

```python
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

An **argument** (or **parameter**) is a value you pass into a function.

| Argument | Meaning |
| --- | --- |
| `agent` | The agent we just made |
| `tools` | The same tools. The executor needs them because **the executor is the one that actually calls the tools** |
| `verbose` | `True` = show the **logs** (step-by-step messages of what the agent is thinking and doing) in the output. `False` = hide the logs; you still get the final answer |

**Step 4: Run it**

```python
response = agent_executor.invoke({"input": "Find the capital of India"})
print(response["output"])
```

- The input goes in a **dictionary** (a Python collection of key–value pairs inside `{ }`, like `{"input": "..."}`).
- The answer is in `response["output"]`.

**What happened in the demos**

| Question | What the agent did | Result |
| --- | --- | --- |
| "Find the capital of India" | Thought "I should search", used the Tavily tool, read a website | **New Delhi** |
| "Tell me the latest news about the Iran–USA war" | Used Tavily, read several online sources | Fresh 2026 news, even though GPT-3.5 Turbo only knows up to 2022 |

**Experiment: what if we give NO tools?**

```python
tools = []   # empty list
```

- The agent kept trying to find a tool to get the latest news, but there was none.
- It went round and round in the loop until it hit the limit.
- Final message: **"Agent stopped due to iteration limit or time limit."**
- An **iteration** is one round of the loop. The executor has a maximum number of rounds and a time limit, so it does not run forever.

> Lesson: **Without tools, an agent with an old LLM cannot get new facts. Tools are what make it an agent.**

## 8. How ReAct works: Thought → Action → Observation

**ReAct = Reasoning + Acting.** It is a **design pattern** (a well-known, reusable way of solving a problem) where the LLM thinks a little, does an action with a tool, looks at the result, and repeats, instead of answering in one go.

- It lets the LLM **interleave** (mix, one after the other) thinking and actions in a **structured, multi-step process**.
- The tool can be anything: a web search, an API, a **calculator**, and so on.
- `create_react_agent` in LangChain already has all this **orchestration code** (the code that connects the LLM and the tools and runs the steps) written inside it. It was the most popular agent function in LangChain.

**The 3 steps of every round**

| Step | Simple meaning | Who does it |
| --- | --- | --- |
| 1. **Thought** | "What do I need to do next?" | The LLM (reasoning) |
| 2. **Action** | Use a tool, with an input | The tool (for example, Tavily) |
| 3. **Observation** | Look at what the tool returned | The agent reads the result |

**Worked example:** "What is the capital of France, and what is its population?"

| Round | Thought | Action | Observation |
| --- | --- | --- | --- |
| 1 | I need to find the capital of France | Search: "capital of France" | The capital is **Paris** |
| 2 | Now I need the population of Paris | Search: "population of Paris" | About **2.1 million** |
| 3 | **I now know the final answer** | (no action) | Loop stops |

**Final Answer:** Paris is the capital of France and has a population of about 2.1 million.

**How does the agent know when to stop?** The prompt tells it: when the Thought becomes "I now know the final answer", give the Final Answer and **break the loop** (exit the loop).

> Memory trick: **T-A-O = "Think, Act, Observe"**, like a detective: think of a clue, go check it, see what you found, think again.

## 9. How AgentExecutor runs the loop

The **agent only decides**; the **AgentExecutor does the running**: it carries messages between the agent and the tools, round after round, until the agent says it has the final answer.

<figure class="docfig" data-node="b0df9d1e-958f"><svg viewBox="0 0 760 350" role="img" aria-label="The executor carries messages until the agent knows the answer" font-size="13"><defs><marker id="exec-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--cds-chart-axis)"></path></marker></defs><text data-claude-text-id="title" x="24" y="34" font-size="15" font-weight="600" fill="var(--cds-text-primary)">The executor carries messages until the agent knows the answer</text><g data-claude-anchor="connectors" fill="none" stroke="var(--cds-chart-axis)" stroke-width="1.25"><path d="M195 120H295" marker-end="url(#exec-arrow)"></path><path d="M465 110H565" marker-end="url(#exec-arrow)"></path><path d="M565 130H465" marker-end="url(#exec-arrow)"></path><path d="M430 148V242" marker-end="url(#exec-arrow)"></path><path d="M450 242V148" marker-end="url(#exec-arrow)"></path><path d="M320 148V270H195" marker-end="url(#exec-arrow)"></path></g><g data-claude-anchor="box-user"><rect x="25" y="92" width="170" height="56" rx="8" fill="none" fill-opacity="1" stroke="var(--cds-chart-axis)" stroke-width="1.25"></rect><text data-claude-text-id="user" x="110" y="116" text-anchor="middle" font-weight="600" fill="var(--cds-text-primary)">User</text><text data-claude-text-id="user-line" x="110" y="134" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">asks a question</text></g><g data-claude-anchor="box-executor"><rect x="295" y="92" width="170" height="56" rx="8" fill="var(--cds-chart-categorical-1)" fill-opacity="0.12" stroke="var(--cds-chart-categorical-1)" stroke-width="2"></rect><text data-claude-text-id="executor" x="380" y="116" text-anchor="middle" font-weight="600" fill="var(--cds-text-primary)">AgentExecutor</text><text data-claude-text-id="executor-line" x="380" y="134" text-anchor="middle" font-size="11.5" fill="var(--cds-text-primary)">runs the loop</text></g><g data-claude-anchor="box-agent"><rect x="565" y="92" width="170" height="56" rx="8" fill="none" fill-opacity="1" stroke="var(--cds-chart-axis)" stroke-width="1.25"></rect><text data-claude-text-id="agent" x="650" y="116" text-anchor="middle" font-weight="600" fill="var(--cds-text-primary)">Agent (LLM brain)</text><text data-claude-text-id="agent-line" x="650" y="134" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">thinks and decides</text></g><g data-claude-anchor="box-tools"><rect x="355" y="242" width="170" height="56" rx="8" fill="none" fill-opacity="1" stroke="var(--cds-chart-axis)" stroke-width="1.25"></rect><text data-claude-text-id="tools" x="440" y="266" text-anchor="middle" font-weight="600" fill="var(--cds-text-primary)">Tools</text><text data-claude-text-id="tools-line" x="440" y="284" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">Tavily, weather</text></g><g data-claude-anchor="box-answer"><rect x="25" y="242" width="170" height="56" rx="8" fill="none" fill-opacity="1" stroke="var(--cds-chart-axis)" stroke-width="1.25"></rect><text data-claude-text-id="answer" x="110" y="266" text-anchor="middle" font-weight="600" fill="var(--cds-text-primary)">Final Answer</text><text data-claude-text-id="answer-line" x="110" y="284" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">returned to the user</text></g><text data-claude-text-id="lbl-input" x="245" y="110" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">input</text><text data-claude-text-id="lbl-send" x="515" y="102" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">input + history</text><text text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)"><tspan data-claude-text-id="lbl-reply-1" x="515" y="152">next tool, or</tspan><tspan data-claude-text-id="lbl-reply-2" x="515" y="168">final answer</tspan></text><text data-claude-text-id="lbl-call" x="422" y="199" text-anchor="end" font-size="11.5" fill="var(--cds-text-secondary)">call tool</text><text data-claude-text-id="lbl-observe" x="458" y="199" font-size="11.5" fill="var(--cds-text-secondary)">observation</text><text data-claude-text-id="lbl-final" x="257.5" y="260" text-anchor="middle" font-size="11.5" fill="var(--cds-text-secondary)">when final answer</text><text data-claude-text-id="note" x="24" y="332" font-size="11.5" fill="var(--cds-text-secondary)">One round = Thought, Action, Observation. It repeats until the agent says: I now know the final answer.</text></svg><figcaption>AgentExecutor loop · user, executor, agent, tools</figcaption></figure>

Read it left to right: the executor sits in the middle, passing messages to the agent and the tools until the agent gives the final answer.

Think of a **cricket captain and a runner**: the captain (agent) decides the plan; the runner (executor) actually runs between the wickets (tools) and brings back the result.

**The executor's job, step by step**

1. **Send** the user's input + the history (earlier Thought, Action, Observation) to the agent. In the very first round, the history is **empty**.
2. The agent **reasons** (using the LLM) and replies with one of two things:
   - "Use this tool with this input" (for example, Tavily with "capital of France"), or
   - "I now know the final answer: ...".
3. If a tool is needed, the **executor calls the tool** and gets the result.
4. The executor **adds the result (Observation) to the history** (the scratchpad).
5. **Repeat** from step 1, now with a fuller history.
6. When the agent gives the **Final Answer**, the executor **stops the loop** and returns the output.

**The France example through the executor's eyes**

| Round | Executor sends to agent | Agent says | Executor does | Added to history |
| --- | --- | --- | --- | --- |
| 1 | Question + empty history | "Use Tavily: capital of France" | Calls Tavily | Observation: Paris |
| 2 | Question + round 1 history | "Use Tavily: population of Paris" | Calls Tavily | Observation: 2.1 million |
| 3 | Question + rounds 1–2 history | "I now know the final answer" | **Stops**, returns the answer | (none) |

**Safety limits:** the executor also has a maximum number of iterations and a time limit. That is why, with no tools, we saw "Agent stopped due to iteration limit or time limit".

> Rule to remember: **`create_react_agent` → you must use `AgentExecutor` to run it.** Without the executor, the Thought → Action → Observation steps cannot run.

## 10. Adding your own tool: the weather tool

Any normal Python function becomes an agent tool when you put `@tool` above it; then you just add it to the tools list.

**Two kinds of tools**

| Kind | Meaning | Example |
| --- | --- | --- |
| **Predefined tool** | Already built by another company or developer | `TavilySearchResults` |
| **Custom tool** | You write it yourself | `get_weather_data` |

**The data source: Weatherstack API**

- **weatherstack.com** gives live weather through an API. Sign up free and copy the key from the dashboard.
- The **free plan** gives **current weather** only. Paid plans add location search, **astronomy data** (sunrise, moon phase), hour-by-hour data and full historical data.
- Save it in `.env` as `WEATHERSTACK_API_KEY` and load it with `os.getenv("WEATHERSTACK_API_KEY")`.
- Test: open the API **URL** with your key and `query=Mumbai` in the browser. You get a big **JSON** reply (JavaScript Object Notation: a common text format for data, made of `"key": value` pairs, like a Python dictionary). The live weather sits under the key `current`.

**The function**

```python
import requests
from langchain.tools import tool

WEATHERSTACK_API_KEY = os.getenv("WEATHERSTACK_API_KEY")

@tool
def get_weather_data(city: str) -> str:
    """Get the current weather for a given city."""
    url = f"http://api.weatherstack.com/current?access_key={WEATHERSTACK_API_KEY}&query={city}"
    response = requests.get(url)
    data = response.json()

    if "current" not in data:
        return "Could not fetch weather data."

    city_name = data["location"]["name"]
    temperature = data["current"]["temperature"]
    weather = data["current"]["weather_descriptions"][0]
    humidity = data["current"]["humidity"]
    return f"{city_name}: {temperature}°C, {weather}, humidity {humidity}%"
```

| Line | What it does |
| --- | --- |
| `@tool` | A **decorator** (a label with `@` placed above a function that adds extra powers to it). Here it turns the function into a LangChain tool |
| The `"""..."""` line | A **docstring** (a short description inside the function). LangChain gives it to the LLM so the LLM knows **what the tool does and when to use it**. Write it clearly |
| `requests.get(url)` | Calls the Weatherstack API over the internet |
| `.json()` | Turns the reply into a Python dictionary |
| `if "current" not in data` | **Error handling**: if there is no weather data (for example, a wrong city), return a polite message |
| Last lines | Pick out city, temperature, weather and humidity. You can pick other fields too |

An **f-string** (a string starting with `f`, like `f"{city}"`) puts variable values inside text.

**Add it to the agent**

```python
tools = [search_tool, get_weather_data]
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
agent_executor.invoke({"input": "Find the capital of India and then find its current weather"})
```

**What the agent did**

1. Thought: first find the capital → used **Tavily** → **New Delhi**.
2. Thought: now get its weather → used **get\_weather\_data** → about **37°C, haze**.
3. Final Answer combined both.

The LLM chose the **right tool for each step by itself**, thanks to ReAct reasoning. The **AgentExecutor** made the actual tool calls.

> Memory line: **Function + `@tool` + docstring = a new skill for your agent.**

## 11. From notebook to app.py, then a Streamlit web page

Notebooks are for **experiments**; real apps (**production**: the live version real users use) are plain Python files, so we copy the same code into `app.py` and then add a simple web page.

**Step 1: Make `app.py`**

- Copy all the notebook code into `app.py` (no changes).
- Put a `.env` file in the **main project folder** too. The first run failed because `app.py` could not find the Tavily key: the `.env` was only inside `research`.
- Run it in the terminal:

```bash
python app.py
```

Result: "The capital of India is New Delhi and the current weather is 37°C with haze."

**Step 2: Add a user interface with Streamlit**

- A **user interface (UI)** is the screen people click and type on.
- **Streamlit** is a Python package that makes a web page from Python code, with **no HTML or CSS** needed (HTML builds a web page's structure; CSS gives it colour and style).
- The teacher asked ChatGPT to write the Streamlit code for him. You can do the same.
- He renamed the old file to `main.py`, and put the new Streamlit version in `app.py`.
- Add `streamlit` to `requirements.txt` and install again.

What the Streamlit code adds (the agent code stays the same):

| Part | What it shows |
| --- | --- |
| `st.set_page_config(...)` | Page title "Agentic Assistant", an icon, a centred **layout** (the arrangement of things on the page) |
| `st.title(...)` / `st.markdown(...)` | A heading and the text "Search and Weather AI Agent using LangChain" |
| A text input box | Where the user types the question |
| A "Run Agent" button | When clicked, calls `agent_executor.invoke(...)` and shows the answer |

Run it:

```bash
streamlit run app.py
```

- On Windows, the certificate error came back, so he added the `certifi` SSL fix line to `app.py` as well.
- It opens on **localhost** (your own computer acting as a web server; only you can see it).
- Test: "Find the capital of France and its current weather" → **Paris, 11°C, rain and thunderstorm**.
- While it works, the page shows the agent "thinking". Every agent (VS Code agent, Claude desktop, Gemini) shows this, because it is running the Thought → Action → Observation steps inside.

## 12. Deploying for free on Render

To let anyone use the agent, we push the code to **GitHub** (hiding the secret keys), then let **Render** run it on a free cloud computer.

- **Cloud platform** = companies that rent you computers over the internet, such as **AWS** (Amazon), **GCP** (Google Cloud), **Azure** (Microsoft). These need an account and usually a paid plan.
- **Render** (render.com) has a **free** option, good for learning.

**Step 1: Hide secrets with `.gitignore`**

A **`.gitignore`** file lists files that **Git** (a tool that tracks changes in your code) must **not** upload. Add:

```text
.env
research/
```

If you upload `.env`, your API keys become public and anyone can use (and spend) them.

**Step 2: Put the code on GitHub**

**GitHub** is a website that stores code online. A **repository (repo)** is one project's folder on GitHub.

1. On GitHub: New repository → name it (for example, "search-and-weather-ai-agent-using-langchain") → add a README → keep it **Public** → Create.
2. Copy the repo link and **clone** it (download a copy to your computer): `git clone <link>`.
3. Move the hidden `.git` folder from the cloned folder into your project folder, then delete the extra folder.
4. **Commit** (save a snapshot of changes) and **push** (send them to GitHub):

```bash
git add .
git commit -m "updated"
git push origin main
```

- `git add .` = choose all changed files.
- `-m` = a short message describing the change.
- `origin main` = send to the GitHub copy (`origin`), on the `main` **branch** (a line of work in the project).

Check GitHub: all files are there, but **not** `.env`.

**Step 3: Create a Web Service on Render**

1. Log in to render.com → Dashboard → **New → Web Service**.
2. Choose **Public Git repository** and paste the repo link → Connect.
3. Render finds `requirements.txt` and installs the packages automatically.
4. **Start command** (how to run the app on the server), for example:

```bash
streamlit run app.py --server.port $PORT --server.address 0.0.0.0
```

5. Choose the **Free instance** (an **instance** is one rented virtual computer). It has **512 MB RAM** (short-term working memory) and **0.1 CPU** (a small slice of a processor), so it is a bit slow. Fine for learning; paid plans are faster.
6. Add **environment variables** on Render: `OPENAI_API_KEY`, `TAVILY_API_KEY`, `WEATHERSTACK_API_KEY` with their values. (Remember: `.env` was not uploaded, so Render needs the keys here.)
7. Click **Deploy Web Service**. Render **builds** the app (sets up the computer and installs everything). Wait until it says **Live**.

**Step 4: Test the live app**

- Render gives you a public **URL**. Anyone with the link can use your agent.
- Test: "Find the capital of Nepal and tell me its weather" → **Kathmandu, 20°C, drizzle, 94% humidity**.
- The free instance can be slow, especially the first request.

Later in the course, the teacher will show **CI/CD** (Continuous Integration / Continuous Deployment: an automatic system that tests and re-deploys your app every time you push new code).

## 13. Important update: LangChain 1.0 changed these imports

The ideas in this lesson are still correct, but in **LangChain 1.0** (released 22 October 2025) `create_react_agent` and `AgentExecutor` became **legacy** (old code kept only for older projects) and moved to a separate package.

| What | Old way (this lesson) | New way |
| --- | --- | --- |
| Old-style agent code | `from langchain.agents import create_react_agent, AgentExecutor` | `pip install langchain-classic`, then `from langchain_classic.agents import create_react_agent, AgentExecutor` |
| Recommended way to build agents now | `create_react_agent` + `AgentExecutor` | `from langchain.agents import create_agent` |
| Python version | 3.11 used here | All LangChain packages now need **Python 3.10 or newer** |

- If `from langchain.agents import create_react_agent` gives an **ImportError** (Python cannot find the thing you asked for), you probably have LangChain 1.0 or newer. Either install `langchain-classic` and change the import, or install an older LangChain version to follow the video exactly.
- `create_agent` still runs the same **think → use tool → observe** loop inside, so everything you learned about ReAct still applies.
- `@tool` functions still work as tools with `create_agent`.

Sources: [LangChain v1 migration guide](https://docs.langchain.com/oss/python/migrate/langchain-v1), [create\_react\_agent source in langchain\_classic](https://repos.supermodeltools.com/langchain/fn-agent-py-create-react-agent.html), [LangChain v1.0 overview (Japanese)](https://www.issoh.co.jp/tech/details/9663/).

## 14. Memory boosters: summary, tricks and self-test

If you remember only one thing: **Agent = LLM (brain) + Tools (hands) + Prompt (rules), run by AgentExecutor in a Think → Act → Observe loop.**

**The whole lesson in 10 lines**

1. A plain LLM only knows old training data (GPT-3.5 Turbo said the year was 2022).
2. An agent adds **tools**, so it can get fresh facts.
3. LangChain was the first framework people used to build agents.
4. Tavily = internet search tool; `max_results` = number of websites.
5. `ChatOpenAI(model, temperature=0, api_key)` = the brain.
6. `hub.pull("hwchase17/react")` = the ready ReAct rule book.
7. `create_react_agent(llm, tools, prompt)` builds the agent.
8. `AgentExecutor(agent, tools, verbose=True)` runs the loop and calls the tools.
9. `@tool` + docstring turns your own function into a tool (the weather tool).
10. Notebook → `app.py` → Streamlit page → GitHub (hide `.env`) → Render = live app.

**Memory tricks**

- **"B-H-R"**: **B**rain (LLM), **H**ands (tools), **R**ules (prompt) = the 3 ingredients of `create_react_agent`.
- **"T-A-O"**: **T**hought, **A**ction, **O**bservation = one round of ReAct.
- **Captain and runner**: the agent decides, the executor runs.
- **"Sleeping student"**: the LLM is smart but asleep since 2022; tools bring today's newspaper.
- **Stop words**: "I now know the final answer" ends the loop.
- **No tools = stuck in a loop** → "iteration limit or time limit".

**Common mistakes to avoid**

- Uploading `.env` to GitHub (keys leak). Always use `.gitignore`.
- Forgetting `.env` in the folder where you run the code.
- Writing your own ReAct prompt and missing the stop rule or `{agent_scratchpad}`.
- Giving the agent no tools, or a tool with no clear docstring.
- Forgetting to add the API keys as environment variables on Render.

**Test yourself** (answers in brackets; cover them first)

1. Why did GPT-3.5 Turbo say the year was 2022? \[Its training data stops around 2022.\]
2. What does ReAct stand for? \[Reasoning + Acting.\]
3. Name the 3 steps of one ReAct round. \[Thought, Action, Observation.\]
4. What 3 things does `create_react_agent` need? \[LLM, tools, prompt.\]
5. Why does `AgentExecutor` also need the tools? \[It is the one that actually calls them.\]
6. What does `verbose=True` do? \[Shows the step-by-step logs.\]
7. What is `agent_scratchpad`? \[The agent's rough notebook of earlier Thoughts, Actions and Observations.\]
8. What happens if the tools list is empty and the question needs new facts? \[The agent loops until it stops at the iteration or time limit.\]
9. How do you turn a Python function into a tool? \[Put `@tool` above it and give it a docstring.\]
10. What does `temperature=0` mean? \[Focused, almost the same answer each time; low creativity.\]
11. Why do we add `.env` to `.gitignore`? \[So secret API keys are not uploaded publicly.\]
12. In LangChain 1.0, where does `AgentExecutor` live now? \[In the `langchain-classic` package; new agents use `create_agent`.\]

**Coming next:** a **multi-agent system** with LangChain, and the **limits of LangChain** that led to LangGraph, CrewAI and AutoGen.
