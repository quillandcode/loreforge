import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// --- CONFIG & STATE ---
const CATEGORIES = {
    nature: { label: "⚛️ Nature", desc: "Laws of nature, gravity, weather, biology, and environment." },
    magic: { label: "✨ Magic", desc: "Spells, mana costs, limitations, and supernatural rules." },
    tech: { label: "🛡️ Tech", desc: "Weapons, tools, transportation, and technology levels." },
    society: { label: "👑 Society", desc: "Laws, hierarchy, etiquette, currency, and culture." },
    lore: { label: "📜 Lore", desc: "History, plot points, relationships, and recent events." }
};

const STORAGE_KEY = 'loreforge_anvils_v2'; // Changed key to avoid conflict with old data

// Default data structure for a new world
const createNewAnvil = (name) => ({
    id: Date.now(),
    name: name,
    data: {
        nature: "",
        magic: "",
        tech: "",
        society: "",
        lore: ""
    }
});

let anvils = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
    createNewAnvil("Default World")
];

let currentAnvilId = anvils[0].id;
let activeCategory = 'nature'; // Which tab is open for editing
let checkedCategories = new Set(Object.keys(CATEGORIES)); // Which boxes are checked (default all)
let engine = null;

const ui = {
    storyText: document.getElementById('storyText'),
    anvilEditor: document.getElementById('anvilEditor'),
    anvilSelect: document.getElementById('anvilSelect'),
    warningsList: document.getElementById('warningsList'),
    runBtn: document.getElementById('runHammer'),
    status: document.getElementById('engineStatus'),
    newAnvilBtn: document.getElementById('newAnvilBtn'),
    categoryStrip: document.getElementById('categoryStrip'),
    activeLabel: document.getElementById('activeCategoryLabel'),
    resizer: document.getElementById('resizer'),
    leftPane: document.querySelector('.left-pane'),
    rightPane: document.querySelector('.right-pane'),
    mainContainer: document.querySelector('.main-container')
};

// --- ANVIL MANAGEMENT ---
function saveAnvils() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anvils));
}

function getCurrentAnvil() {
    return anvils.find(a => a.id == currentAnvilId);
}

// Render the Checkboxes & Tabs
function renderCategories() {
    ui.categoryStrip.innerHTML = '';

    Object.keys(CATEGORIES).forEach(key => {
        const conf = CATEGORIES[key];

        const div = document.createElement('div');
        div.className = `cat-item ${key === activeCategory ? 'active-tab' : ''}`;

        // 1. Checkbox (Include in Hammer)
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = checkedCategories.has(key);
        chk.onclick = (e) => {
            e.stopPropagation(); // Don't trigger tab switch
            if (chk.checked) checkedCategories.add(key);
            else checkedCategories.delete(key);
        };

        // 2. Label (Switch Tab)
        const lbl = document.createElement('span');
        lbl.className = 'cat-label';
        lbl.textContent = conf.label;
        lbl.onclick = () => switchTab(key);

        // 3. Info Icon (Tooltip)
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
    renderCategories(); // Re-render to update active styling

    const anvil = getCurrentAnvil();
    ui.anvilEditor.value = anvil.data[key] || "";
    ui.activeLabel.textContent = `Editing: ${CATEGORIES[key].label}`;
    ui.activeLabel.style.borderColor = "#2ecc71"; // Visual flash
    ui.anvilEditor.focus();
}

// Load saved story draft if it exists
function autoLoad() {
    const savedStory = localStorage.getItem('loreforge_story_draft');
    if (savedStory) {
        ui.storyText.value = savedStory;
    }
}

// Handle Typing in Editor
ui.anvilEditor.addEventListener('input', () => {
    const anvil = getCurrentAnvil();
    anvil.data[activeCategory] = ui.anvilEditor.value;
    saveAnvils();
});

// Dropdown Logic
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

ui.anvilSelect.addEventListener('change', (e) => {
    currentAnvilId = parseInt(e.target.value);
    switchTab(activeCategory); // Refresh editor
});

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

// --- AUTO-SAVE STORY ---
ui.storyText.addEventListener('input', () => {
    localStorage.setItem('loreforge_story_draft', ui.storyText.value);
});

// --- THE HAMMER (AI) ---
const initProgressCallback = (report) => {
    ui.status.style.display = 'block';
    ui.status.textContent = report.text;
};

async function initLLM() {
    try {
        const selectedModel = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
        engine = await webllm.CreateMLCEngine(selectedModel, { initProgressCallback });
        ui.status.textContent = "Engine Ready";
        ui.status.classList.add('ready');
        ui.runBtn.disabled = false;
    } catch (err) {
        ui.status.textContent = "Engine Failed";
        addWarning("System", "Error loading WebLLM: " + err.message);
    }
}

function addWarning(type, text) {
    const li = document.createElement('li');
    li.className = type.toLowerCase();
    li.textContent = text;
    ui.warningsList.appendChild(li);
    ui.warningsList.scrollTop = ui.warningsList.scrollHeight;
}

ui.runBtn.addEventListener('click', async () => {
    const story = ui.storyText.value;
    const anvil = getCurrentAnvil();

    if (!story.trim()) {
        addWarning("System", "The Hammer needs raw material. Write a story first.");
        return;
    }

    // Build the Prompt from Checked Categories
    let loreContext = "";
    let activeCategoriesList = [];

    checkedCategories.forEach(key => {
        const content = anvil.data[key];
        if (content && content.trim().length > 0) {
            loreContext += `--- ${CATEGORIES[key].label.toUpperCase()} RULES ---\n${content}\n\n`;
            activeCategoriesList.push(CATEGORIES[key].label);
        }
    });

    if (loreContext === "") {
        addWarning("System", "No anvil rules selected or rules are empty. Please check boxes and add text.");
        return;
    }

    ui.runBtn.disabled = true;
    ui.runBtn.textContent = "Forging...";
    ui.warningsList.innerHTML = '';
    addWarning("System", `Analyzing against: ${activeCategoriesList.join(', ')}...`);

    try {
        const messages = [
            {
                role: "system",
                content: `You are a strict logic filter. Your ONLY job is to catch violations.
                
                RULES OF ENGAGEMENT:
                1. If a story action fits the rules, STAY SILENT. Do not report "It is allowed."
                2. If a story action is neutral, STAY SILENT.
                3. ONLY report if there is a direct contradiction.
                
                EXAMPLES:
                Rule: "No Red clothing."
                Story: "He wore a grey cloak."
                Output: { "inconsistencies": [] }  <-- CORRECT (Silence)
                
                Rule: "No Red clothing."
                Story: "He wore a red cloak."
                Output: { "inconsistencies": [{ "category": "Society", "message": "Red is forbidden." }] } <-- CORRECT (Violation)
    
                Respond ONLY with the raw JSON object.`
            },
            {
                role: "user",
                content: `THE ANVIL (RULES):\n${loreContext}\nTHE HAMMER (STORY):\n${story}\n\nIdentify inconsistencies:`
            }
        ];

        // 1. Get the raw string from the AI
        const reply = await engine.chat.completions.create({ messages });
        const rawContent = reply.choices[0].message.content;

        // 2. CLEANUP: Remove Markdown code blocks (```json ... ```) if the AI adds them
        // This regex looks for code block markers and removes them to leave pure JSON
        const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

        // 3. Parse the cleaned string
        const data = JSON.parse(cleanJson);
        const list = data.inconsistencies; // Assuming your prompt asks for this key

        // 4. Loop through the array
        if (Array.isArray(list) && list.length > 0) {
            list.forEach((warning) => {
                // Use the specific item from the loop!
                // Assuming your JSON has "category" and "message" keys
                addWarning(warning.category || "Issue", warning.message);
            });
        } else {
            addWarning("Success", "No inconsistencies found.");
        }

    } catch (error) {
        addWarning("System", "Error: " + error.message);
    } finally {
        ui.runBtn.disabled = false;
        ui.runBtn.textContent = "Run Hammer";
    }
});

// --- RESIZER ---
let isResizing = false;
ui.resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; });
document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerWidth = ui.mainContainer.offsetWidth;
    const leftPercent = (e.clientX / containerWidth) * 100;
    if (leftPercent > 20 && leftPercent < 80) {
        ui.leftPane.style.flex = `0 0 ${leftPercent}%`;
        ui.rightPane.style.flex = `0 0 ${100 - leftPercent}%`;
    }
});
document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; });

// INIT
renderAnvilSelect();
renderCategories();
switchTab('nature'); // Start on Nature
autoLoad();
initLLM();