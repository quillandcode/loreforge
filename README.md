# ⚒ Loreforge: Proof of Concept v0.1  
A Worldbuilding Engine for Those Who Shape Realms

Loreforge is a local-first, browser-bound crucible where story and system meet. Writers bring their worlds, their rules, their fragile sparks of narrative. The engine brings the Anvil, a place where text is tested, refined, and made true. When a scene bends physics or a character slips out of time, Loreforge feels the tremor and whispers it back to you.

In this space, worldbuilding becomes craft. Story becomes metal shaped with intent.

## 1. Core Architecture

### Local-First Approach  
All logic, processing, and persistence occur within the user’s browser. There is no external backend, no remote database, and no network communication. This design provides zero server cost, complete user privacy, and offline functionality.

### Local Persistence via Browser Storage  
All Anvil rule sets and story drafts are written to localStorage in real time. Data restores automatically on page reload. No configuration is required.

### Technology Stack  
The project uses plain HTML5, CSS3, and JavaScript ES Modules. No frontend frameworks or build systems are required. Dependencies are limited to WebLLM and MLC model assets.

## 2. AI Engine and Model Execution

Loreforge runs a quantized large language model inside the browser using WebGPU for GPU-accelerated inference.

- Framework: WebLLM (from MLC AI)  
- Model: Llama-3.2-3B-Instruct-q4f16_1-MLC  
- Effective Size: Approximately 2 GB cached locally  
- Execution: WebGPU kernels compiled at runtime

This deployment strategy provides fast inference on consumer hardware while maintaining a local-only execution pipeline.

### System Prompt and Behavior Control  
The application uses a few-shot system prompt pattern to define consistent behavior. It supplies the model with positive and negative examples that demonstrate the correct handling of contradictions. The model is instructed to remain silent when rules are followed and speak only when conflicts exist. This reduces hallucinations and improves precision.

## 3. Feature Overview

### The Anvil: Rule Management System  
Rules are organized into five categories called Shards. These allow targeted analysis and reduce unnecessary context load.

- Nature: physics, environment, biological constraints  
- Magic: capabilities, limitations, energy costs  
- Tech: weaponry, tools, and technological eras  
- Society: laws, customs, social structures  
- Lore: history, character relationships, continuity data

Each Shard is independently toggled during analysis. Users can switch between multiple saved Anvils to support different worlds or universes.

### The Hammer: Story Analysis Engine  
Loreforge compares story text against active Shard rules using a defined JSON schema. Key behaviors include:

- Structured contradiction detection  
- Per-keystroke autosave  
- Resizable split-pane layout for simultaneous editing of story and rules

### Feedback and Result Parsing  
Model output is structured and parsed into a categorized list of warnings.

- Category-based color coding  
- Direct mapping between rule source and conflict  
- Suppression of neutral or irrelevant text  
- Clear JSON schema for advanced users who want raw output

## 4. Roadmap for v0.2
Planned feature expansions focus on interoperability, structured data, and cross-world scalability.
- **Entity Registration**  
  Introduce a registry for characters, locations, artifacts, factions, and other entities. This will allow consistency checks that reference structured data rather than free text alone.
- **Networked Anvils**  
  Enable multiple Anvils to link into a shared “World Network”. This supports hierarchical rule structures, reduces duplication, and allows consistency checks across related regions or story scopes.
- **Import and Export**  
  Provide export formats for stories and Anvil data, and add import support for restoring or sharing project files between users or devices.
