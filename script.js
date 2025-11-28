import * as webllm from "https://esm.run/@mlc-ai/web-llm";

/* =========================================
   1. CONFIGURATION & CONSTANTS
   ========================================= */
const STORAGE_KEY = 'loreforge_anvils_v2';
const STORY_KEY = 'loreforge_story_draft';

const CATEGORIES = {
    nature:  { label: "🌿 Nature",  desc: "Laws of nature, gravity, weather, biology, and environment." },
    magic:   { label: "✨ Magic",   desc: "Spells, mana costs, limitations, and supernatural rules." },
    tech:    { label: "🛡️ Tech",    desc: "Weapons, tools, transportation, and technology levels." },
    society: { label: "👑 Society", desc: "Laws, hierarchy, etiquette, currency, and culture." },
    lore:    { label: "📜 Lore",    desc: "History, plot points, relationships, and recent events." }
};

// UI References (The "Switchboard")
const ui = {
    mainContainer: document.querySelector('.main-container'),
    leftPane:      document.querySelector('.left-pane'),
    rightPane:     document.querySelector('.right-pane'),
    resizer:       document.getElementById('resizer'),
    
    storyText:     document.getElementById('storyText'),
    runBtn:        document.getElementById('runHammer'),
    warningsList:  document.getElementById('warningsList'),
    status:        document.getElementById('engineStatus'),
    
    anvilEditor:   document.getElementById('anvilEditor'),
    anvilSelect:   document.getElementById('anvilSelect'),
    newAnvilBtn:   document.getElementById('newAnvilBtn'),
    categoryStrip: document.getElementById('categoryStrip'),
    activeLabel:   document.getElementById('activeCategoryLabel'),
};

/* =========================================
   2. STATE MANAGEMENT
   ========================================= */
// Helper to generate empty anvil structure
const createNewAnvil = (name) => ({
    id: Date.now(),
    name: name,
    data: { nature: "", magic: "", tech: "", society: "", lore: "" }
});

// Load Anvils from Storage
let anvils = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [ createNewAnvil("Default World") ];

// Application State
let currentAnvilId = anvils[0].id;
let activeCategory = 'nature'; 
let checkedCategories = new Set(Object.keys(CATEGORIES)); 
let engine = null;
let isResizing = false;

/* =========================================
   3. CORE FUNCTIONS (The Logic)
   ========================================= */

// --- Data Persistence ---
function saveAnvils() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anvils));
}

function saveStoryDraft() {
    localStorage.setItem(STORY_KEY, ui.storyText.value);
}

function loadStoryDraft() {
    const saved = localStorage.getItem(STORY_KEY);
    if (saved) ui.storyText.value = saved;
}

function getCurrentAnvil() {
    return anvils.find(a => a.id == currentAnvilId);
}

// --- UI Rendering ---
function renderAnvilSelect() {
    ui.anvilSelect.innerHTML = '';
    anvils.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if (a.id === currentAnvilId) opt.selected = true;
        ui.anvilSelect.appendChild(opt);
    });
}

function renderCategories() {
    ui.categoryStrip.innerHTML = '';

    Object.keys(CATEGORIES).forEach(key => {
        const conf = CATEGORIES[key];
        const div = document.createElement('div');
        div.className = `cat-item ${key === activeCategory ? 'active-tab' : ''}`;

        // Checkbox
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = checkedCategories.has(key);
        chk.onclick = (e) => {
            e.stopPropagation();
            if (chk.checked) checkedCategories.add(key);
            else checkedCategories.delete(key);
        };

        // Label
        const lbl = document.createElement('span');
        lbl.className = 'cat-label';
        lbl.textContent = conf.label;
        lbl.onclick = () => switchTab(key);

        // Tooltip
        const info = document.createElement('span');
        info.className = 'info-icon';
        info.textContent = '?';
        info.setAttribute('data-tooltip', conf.desc);

        div.append(chk, lbl, info);
        ui.categoryStrip.appendChild(div);
    });
}

function switchTab(key) {
    activeCategory = key;
    renderCategories(); // Re-render for styling
    
    const anvil = getCurrentAnvil();
    ui.anvilEditor.value = anvil.data[key] || "";
    
    // Visual feedback
    ui.activeLabel.textContent = `Editing: ${CATEGORIES[key].label}`;
    ui.activeLabel.style.borderColor = "#2ecc71";
    setTimeout(() => ui.activeLabel.style.borderColor = "#2ecc71", 500); // Visual flash trick
    
    ui.anvilEditor.focus();
}

function addWarning(type, text) {
    const li = document.createElement('li');
    li.className = type.toLowerCase();
    li.textContent = text;
    ui.warningsList.appendChild(li);
    ui.warningsList.scrollTop = ui.warningsList.scrollHeight;
}

// --- LLM Logic ---
async function initLLM() {
    try {
        const selectedModel = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
        engine = await webllm.CreateMLCEngine(selectedModel, { 
            initProgressCallback: (report) => {
                ui.status.style.display = 'block';
                ui.status.textContent = report.text;
            }
        });
        ui.status.textContent = "Engine Ready";
        ui.status.classList.add('ready');
        ui.runBtn.disabled = false;
    } catch (err) {
        ui.status.textContent = "Engine Failed";
        addWarning("System", "Error loading WebLLM: " + err.message);
    }
}

async function runHammer() {
    const story = ui.storyText.value;
    const anvil = getCurrentAnvil();

    if (!story.trim()) {
        addWarning("System", "The Hammer needs raw material. Write a story first.");
        return;
    }

    // 1. Build Context
    let loreContext = "";
    let activeList = [];
    checkedCategories.forEach(key => {
        const content = anvil.data[key];
        if (content && content.trim().length > 0) {
            loreContext += `--- ${CATEGORIES[key].label.toUpperCase()} RULES ---\n${content}\n\n`;
            activeList.push(CATEGORIES[key].label);
        }
    });

    if (loreContext === "") {
        addWarning("System", "No anvil rules selected or rules are empty.");
        return;
    }

    // 2. Prepare UI
    ui.runBtn.disabled = true;
    ui.runBtn.textContent = "Forging...";
    ui.warningsList.innerHTML = '';
    addWarning("System", `Analyzing against: ${activeList.join(', ')}...`);

    // 3. Construct Prompt
    const messages = [
        {
            role: "system",
            content: `You are a strict logic filter. Your job is to compare the Story against the Rules.
            
            INSTRUCTIONS:
            1. You must analyze the story step-by-step in the "analysis" field.
            2. If you find a direct contradiction, list it in "inconsistencies".
            3. If the story implies a violation but doesn't explicitly state it, give the benefit of the doubt (Stay Silent).
            
            RESPONSE FORMAT:
            {
                "analysis": "Brief step-by-step comparison of the story actions against the active rules.",
                "inconsistencies": [
                    { "category": "CategoryName", "message": "Explanation of the error." }
                ]
            }
            
            EXAMPLE 1 (Violation):
            Rules: "Gravity is 3x Earth."
            Story: "He jumped over the house."
            Output: { 
                "analysis": "The rule states gravity is high (3x). The story shows a character jumping over a house, which requires low gravity. This is a contradiction.", 
                "inconsistencies": [{ "category": "Nature", "message": "Jumping over a house is impossible in 3x gravity." }] 
            }

            EXAMPLE 2 (Compliance):
            Rules: "No Red clothing."
            Story: "He wore a grey cloak."
            Output: { 
                "analysis": "The rule forbids red. The character is wearing grey. There is no contradiction.", 
                "inconsistencies": [] 
            }

            Respond ONLY with the raw JSON object.`
        },
        {
            role: "user",
            content: `THE ANVIL (RULES):\n${loreContext}\nTHE HAMMER (STORY):\n${story}\n\nPerform analysis and identify inconsistencies:`
        }
    ];

    // 4. Execute & Parse
    try {
        const reply = await engine.chat.completions.create({ messages });
        const rawContent = reply.choices[0].message.content;
        const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);
        const list = data.inconsistencies;

        if (Array.isArray(list) && list.length > 0) {
            list.forEach(w => addWarning(w.category || "Issue", w.message));
        } else {
            addWarning("Success", "No inconsistencies found.");
        }
    } catch (error) {
        addWarning("System", "Error: " + error.message);
        console.error(error);
    } finally {
        ui.runBtn.disabled = false;
        ui.runBtn.textContent = "Swing Hammer";
    }
}

/* =========================================
   4. EVENT LISTENERS
   ========================================= */

// Story Input
ui.storyText.addEventListener('input', saveStoryDraft);

// Anvil Editor Input
ui.anvilEditor.addEventListener('input', () => {
    const anvil = getCurrentAnvil();
    anvil.data[activeCategory] = ui.anvilEditor.value;
    saveAnvils();
});

// Anvil Selection
ui.anvilSelect.addEventListener('change', (e) => {
    currentAnvilId = parseInt(e.target.value);
    switchTab(activeCategory);
});

// New Anvil Button
ui.newAnvilBtn.addEventListener('click', () => {
    const name = prompt("Name your new world:");
    if (name) {
        const newObj = createNewAnvil(name);
        anvils.push(newObj);
        currentAnvilId = newObj.id;
        saveAnvils();
        renderAnvilSelect();
        switchTab('nature');
    }
});

// The Hammer Button
ui.runBtn.addEventListener('click', runHammer);

// Resizer Logic
ui.resizer.addEventListener('mousedown', () => { 
    isResizing = true; 
    document.body.style.cursor = 'col-resize'; 
    document.body.style.userSelect = 'none'; 
});
document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const w = ui.mainContainer.offsetWidth;
    const pct = (e.clientX / w) * 100;
    if (pct > 20 && pct < 80) {
        ui.leftPane.style.flex = `0 0 ${pct}%`;
        ui.rightPane.style.flex = `0 0 ${100 - pct}%`;
    }
});
document.addEventListener('mouseup', () => { 
    isResizing = false; 
    document.body.style.cursor = 'default'; 
    document.body.style.userSelect = 'auto'; 
});

/* =========================================
   5. INITIALIZATION
   ========================================= */
renderAnvilSelect();
renderCategories();
switchTab('nature');
loadStoryDraft();
initLLM();