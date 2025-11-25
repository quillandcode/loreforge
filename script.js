import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// --- 1. STATE & UI REFERENCES ---
const STORAGE_KEY = 'loreforge_anvils';
let anvils = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
    { id: 1, name: "Default World", content: "The sky is always purple.\nGravity is low.\nCats can talk." }
];
let currentAnvilId = anvils[0].id;
let isEditingAnvil = false;
let engine = null;

const ui = {
    storyText: document.getElementById('storyText'),
    anvilDisplay: document.getElementById('anvilDisplay'),
    anvilEditor: document.getElementById('anvilEditor'),
    anvilSelect: document.getElementById('anvilSelect'),
    warningsList: document.getElementById('warningsList'),
    runBtn: document.getElementById('runHammer'),
    editBtn: document.getElementById('editAnvil'),
    status: document.getElementById('engineStatus'),
    newAnvilBtn: document.getElementById('newAnvilBtn'),
    // Resizer elements
    resizer: document.getElementById('resizer'),
    leftPane: document.querySelector('.left-pane'),
    rightPane: document.querySelector('.right-pane'),
    mainContainer: document.querySelector('.main-container')
};

// --- 2. ANVIL MANAGEMENT (Storage) ---
function saveAnvils() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anvils));
}

function renderAnvilSelect() {
    ui.anvilSelect.innerHTML = '';
    anvils.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if(a.id === currentAnvilId) opt.selected = true;
        ui.anvilSelect.appendChild(opt);
    });
    loadCurrentAnvil();
}

function loadCurrentAnvil() {
    const anvil = anvils.find(a => a.id == currentAnvilId);
    if(anvil) {
        ui.anvilDisplay.textContent = anvil.content;
        ui.anvilEditor.value = anvil.content;
    }
}

// Event: Change Anvil
ui.anvilSelect.addEventListener('change', (e) => {
    currentAnvilId = parseInt(e.target.value);
    loadCurrentAnvil();
});

// Event: Create New Anvil
ui.newAnvilBtn.addEventListener('click', () => {
    const name = prompt("Name your new world:");
    if(name) {
        const newId = Date.now();
        anvils.push({ id: newId, name: name, content: "Enter world details..." });
        currentAnvilId = newId;
        saveAnvils();
        renderAnvilSelect();
    }
});

// Event: Toggle Edit Mode
ui.editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isEditingAnvil = !isEditingAnvil;
    
    if (isEditingAnvil) {
        // Switch to Edit Mode
        ui.anvilDisplay.style.display = 'none';
        ui.anvilEditor.style.display = 'block';
        ui.editBtn.textContent = 'Save';
        ui.editBtn.style.borderColor = '#2ecc71';
        ui.editBtn.style.color = '#2ecc71';
    } else {
        // Save and Switch to View Mode
        const anvil = anvils.find(a => a.id == currentAnvilId);
        anvil.content = ui.anvilEditor.value;
        saveAnvils();
        loadCurrentAnvil();
        
        ui.anvilDisplay.style.display = 'block';
        ui.anvilEditor.style.display = 'none';
        ui.editBtn.textContent = 'Edit';
        ui.editBtn.style.borderColor = '#444';
        ui.editBtn.style.color = '#888';
    }
});

// --- 3. WEBLLM INTEGRATION ---
const initProgressCallback = (report) => {
    ui.status.style.display = 'block';
    ui.status.textContent = report.text;
};

async function initLLM() {
    try {
        const selectedModel = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
        
        engine = await webllm.CreateMLCEngine(
            selectedModel,
            { initProgressCallback: initProgressCallback }
        );
        
        ui.status.textContent = "Engine Ready";
        ui.status.classList.add('ready');
        ui.runBtn.disabled = false;
        
        addWarning("System", "Loreforge Engine initialized. Ready to forge.");
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

// --- 4. THE HAMMER LOGIC ---
ui.runBtn.addEventListener('click', async () => {
    const story = ui.storyText.value;
    const lore = ui.anvilEditor.value;

    if (!story.trim()) {
        addWarning("System", "The Hammer needs raw material. Write a story first.");
        return;
    }

    ui.runBtn.disabled = true;
    ui.runBtn.textContent = "Forging...";
    ui.warningsList.innerHTML = ''; // Clear previous
    addWarning("System", "Analyzing consistency...");

    try {
        const messages = [
            { 
                role: "system", 
                content: "You are a continuity editor. You will be given World Rules (Anvil) and a Story Segment (Hammer). Identify inconsistencies. If none, state 'Consistent'." 
            },
            {
                role: "user",
                content: `THE ANVIL (RULES):\n${lore}\n\nTHE HAMMER (STORY):\n${story}\n\nAnalyze for inconsistencies:`
            }
        ];

        const reply = await engine.chat.completions.create({ messages });
        addWarning("Success", reply.choices[0].message.content);

    } catch (error) {
        addWarning("System", "Error during analysis: " + error.message);
    } finally {
        ui.runBtn.disabled = false;
        ui.runBtn.textContent = "Run Hammer";
    }
});

// --- 5. RESIZER LOGIC ---
let isResizing = false;

ui.resizer.addEventListener('mousedown', () => { 
    isResizing = true; 
    document.body.style.cursor = 'col-resize'; 
    document.body.style.userSelect = 'none'; 
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerWidth = ui.mainContainer.offsetWidth;
    const leftPercent = (e.clientX / containerWidth) * 100;
    if (leftPercent > 20 && leftPercent < 80) {
        ui.leftPane.style.flex = `0 0 ${leftPercent}%`;
        ui.rightPane.style.flex = `0 0 ${100 - leftPercent}%`;
    }
});

document.addEventListener('mouseup', () => { 
    isResizing = false; 
    document.body.style.cursor = 'default'; 
    document.body.style.userSelect = 'auto'; 
});

// Start initialization
renderAnvilSelect();
initLLM();