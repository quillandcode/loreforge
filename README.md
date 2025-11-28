# ⚒ Loreforge

**A Worldbuilding Engine.**

Loreforge is a local-first, browser-bound crucible where story and system meet. Writers bring their worlds, their rules, and their narrative. The engine brings the **Anvil**—a logic layer where text is tested, refined, and made true.

When a scene bends physics or a character slips out of established lore, Loreforge feels the tremor and alerts the author. In this space, worldbuilding becomes craft, and story becomes metal shaped with intent.

---

## 🏗 Core Architecture

Loreforge is engineered as a **Zero-Backend** application that leverages modern browser capabilities to run Large Language Models (LLMs) entirely on the client side.

### Local-First & Privacy Focused
All logic, processing, and persistence occur within the user’s browser. No story data is ever sent to a remote inference server. This design ensures:
* **Zero Server Cost:** No API fees or GPU cluster bills.
* **Total Privacy:** Drafts never leave the local machine.
* **Offline Capability:** Once the model is cached, the tool runs without an internet connection.

### Cloud Infrastructure (AWS)
While the runtime is local, the delivery infrastructure is architected for performance and security using **Amazon Web Services**:
* **Hosting:** Static assets deployed to **Amazon S3** via **CloudFront** (CDN) for global edge caching.
* **Security:** Access restricted via **Origin Access Control (OAC)**, ensuring the bucket remains private while the CDN serves content.
* **High-Performance Headers:** Custom **Response Header Policies** inject `Cross-Origin-Opener-Policy` (COOP) and `Cross-Origin-Embedder-Policy` (COEP). This unlocks the `SharedArrayBuffer` API required for **WebGPU** multithreading in the browser.

---

## 🧠 The AI Engine

Loreforge bypasses traditional cloud APIs (like OpenAI) in favor of Edge AI.

* **Framework:** [WebLLM](https://webllm.mlc.ai/) (MLC AI).
* **Model:** `Llama-3.2-3B-Instruct-q4f16_1-MLC`.
* **Hardware Acceleration:** Utilizes **WebGPU** to run inference directly on the user's graphics card.
* **Context Window:** 4k token context allows for comprehensive rule-checking against chapter-length segments.

### Prompt Engineering Strategy
The engine utilizes a **"Chain of Thought" JSON Schema** pattern. Rather than a simple pass/fail, the System Prompt instructs the model to:
1.  **Analyze:** Perform a step-by-step logic comparison in a hidden field.
2.  **Verify:** Detect explicit contradictions against the provided rules.
3.  **Report:** Return a strict JSON object containing only valid inconsistencies.

This approach significantly reduces hallucinations by forcing the model to "show its work" internally before flagging an error.

---

## ⚡ Features

### 🛡 The Anvil (Rule Management)
Rules are organized into five distinct "Shards" to allow targeted context loading:
* **🌿 Nature:** Physics, gravity, biology, environment.
* **✨ Magic:** Hard magic systems, costs, limitations.
* **🛡️ Tech:** Weaponry, tools, historical eras.
* **👑 Society:** Laws, customs, hierarchy, economics.
* **📜 Lore:** Plot continuity, character relationships.

### 🔨 The Hammer (Analysis Engine)
* **Active Context:** Users can toggle specific Shards (e.g., check a fight scene against only *Nature* and *Tech* rules).
* **Visual Feedback:** Inconsistencies are parsed from JSON and color-coded by category (e.g., Purple for Magic violations, Cyan for Physics).
* **Auto-Save:** All inputs are persisted to `localStorage` instantly.

---

## 🛠 Development

To run Loreforge locally, you must serve it over HTTP(S) with specific security headers, or the WebGPU engine will fail to initialize.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/loreforge.git](https://github.com/YOUR_USERNAME/loreforge.git)
    ```

2.  **Serve with Headers:**
    Simple HTTP servers won't work out of the box. You must set `COOP: same-origin` and `COEP: require-corp`.

    *VS Code Solution:* Install the "Live Server" extension and configure the settings `settings.json` to include these headers.

---

## 🗺 Roadmap (v0.2)

* **Entity Registry:** Define structured data for characters and artifacts to allow "Fact-Checking" alongside "Logic-Checking."
* **Networked Anvils:** Link multiple rule sets into a shared universe.
* **Export/Import:** Save lore guides as JSON/Markdown for backup and sharing.
