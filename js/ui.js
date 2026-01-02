import { state } from './state.js';
import { CONFIG } from './config.js';
import { BUILDINGS } from './buildings.js';
import { formatValue } from './items.js';
import { spawnParticles } from './effects.js';
import { removeBuildingAt } from './actions.js';
import { canvas } from './dom.js';

export function buildToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';

    const selBtn = document.createElement('button');
    selBtn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-blue-900/20 rounded-lg border-2 border-blue-600 flex flex-col items-center justify-center gap-0.5 ${state.selectedTool==='select'?'active':''}`;
    selBtn.onclick = () => { state.selectedTool = 'select'; closeInspector(); buildToolbar(); };
    selBtn.innerHTML = `<div class="text-2xl text-blue-400">↖</div><div class="text-[10px] font-bold text-gray-300 leading-none">Select</div>`;
    toolbar.appendChild(selBtn);

    const groups = [
        ['belt', 'phase_belt', 'splitter', 'bridge', 'hopper', 'teleporter'],
        ['miner', 'mixer', 'condenser', 'reactor', 'extractor', 'dm_source', 'core_fragment'],
        ['beacon']
    ];

    const unlocked = Object.values(BUILDINGS).filter(b => !b.locked);
    groups.forEach(group => {
        unlocked
            .filter(b => group.includes(b.id))
            .forEach(b => {
                const btn = document.createElement('button');
                btn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-gray-800 rounded-lg border-2 border-gray-600 flex flex-col items-center justify-center gap-0.5 ${state.selectedTool===b.id ? 'active' : ''}`;
                btn.onclick = () => { state.selectedTool = b.id; closeInspector(); buildToolbar(); };
                btn.innerHTML = `<div class="text-2xl" style="color:${b.color}">${b.symbol}</div><div class="text-[10px] font-bold text-gray-300 leading-none">${b.name}</div><div class="text-[8px] text-gray-500 leading-none">$${formatValue(b.cost)}</div>`;
                toolbar.appendChild(btn);
            });
    });

    const delBtn = document.createElement('button');
    delBtn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-red-900/20 rounded-lg border-2 border-red-900 flex flex-col items-center justify-center gap-0.5 ${state.selectedTool==='delete'?'active':''}`;
    delBtn.onclick = () => { state.selectedTool = 'delete'; closeInspector(); buildToolbar(); };
    delBtn.innerHTML = `<div class="text-2xl text-red-500">✕</div><div class="text-[10px] font-bold text-gray-300 leading-none">Remove</div>`;
    toolbar.appendChild(delBtn);
}

let lastTechEntropy = null;
let techUiBuilt = false;
const techRowMap = new Map();

export function resetTechUI() {
    techUiBuilt = false;
    techRowMap.clear();
}

export function updateUI() {
    document.getElementById('score-display').innerText = formatValue(state.entropy);
    document.getElementById('dm-display').innerText = `Dark Matter: ${state.darkMatter} (+${Math.round(state.darkMatter*1)}%)`;
    const epsEl = document.getElementById('eps-display');
    if(epsEl) epsEl.innerText = `Entropy/s: ${formatValue(state.entropyPerSecond)}`;
    const singBtn = document.getElementById('singularity-btn');
    if(state.entropy >= CONFIG.PRESTIGE_THRESHOLD) {
        singBtn.classList.remove('hidden');
        singBtn.classList.add('singularity-ready');
    } else {
        singBtn.classList.add('hidden');
        singBtn.classList.remove('singularity-ready');
    }

    const techModal = document.getElementById('tech-modal');
    if(techModal && !techModal.classList.contains('hidden')) {
        if(lastTechEntropy === null || lastTechEntropy !== state.entropy) {
            lastTechEntropy = state.entropy;
            refreshTechTree();
        }
    }
}

export function showNotification(msg) {
    const el = document.getElementById('notification-area');
    el.innerHTML = `<div class="inline-block bg-red-500/80 text-white px-3 py-1 rounded shadow-lg text-sm font-bold shake">${msg}</div>`;
    setTimeout(() => { el.innerHTML = ''; }, 2000);
}

export function showFloatText(text, gx, gy, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.style.color = color;
    el.innerText = text;
    const T = state.scale * CONFIG.TILE_SIZE;
    const rect = canvas.getBoundingClientRect();
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;
    el.style.left = (rect.left + OX + gx * T + T/2) + 'px';
    el.style.top = (rect.top + OY + gy * T) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

export function openInspector(cell) {
    state.selectedCell = cell;
    const panel = document.getElementById('inspector-panel');
    panel.classList.add('open');
    updateInspector();
}

export function closeInspector() {
    state.selectedCell = null;
    document.getElementById('inspector-panel').classList.remove('open');
}

export function updateInspector() {
    if(!state.selectedCell) return;
    const cell = state.selectedCell;
    const nameEl = document.getElementById('inspect-name');
    const statsEl = document.getElementById('inspect-stats');
    const costEl = document.getElementById('inspect-cost');
    const actionBtn = document.getElementById('inspect-action');
    const bDef = Object.values(BUILDINGS).find(b => b.id === cell.type);

    nameEl.innerText = `${bDef.name} Lv.${cell.level}`;

    let speedText = '';
    actionBtn.classList.add('hidden');

    if(cell.type === 'miner' || cell.type === 'mixer' || cell.type === 'belt' || cell.type === 'phase_belt') {
        speedText = `Speed: ${(1 + (cell.level-1)*0.2).toFixed(1)}x`;
    }
    if(cell.type === 'splitter') {
        const doubleChance = Math.min(50, (cell.level - 1) * 1);
        const tripleChance = Math.min(20, (cell.level - 1) * 0.2);
        speedText = `Dup: +${doubleChance.toFixed(1)}% (2x), +${tripleChance.toFixed(1)}% (3x)`;
    }
    if(cell.type === 'beacon') {
        const fuelNote = cell.fuelTimer > 0 ? ` (Fuel x${cell.fuelMultiplier.toFixed(1)} | ${Math.ceil(cell.fuelTimer)}s)` : '';
        const fuelQueue = cell.fuelQueue && cell.fuelQueue.length ? ` (Queue: ${cell.fuelQueue.length}/10)` : '';
        speedText = `Buff: +${(cell.level*20)}%${fuelNote}${fuelQueue}`;
    }
    if(cell.type === 'bridge') speedText = 'Crossing (non-directional)';
    if(cell.type === 'reactor') {
        const chance = state.tech.reactorDarkMatterChance * 100;
        speedText = `Converts: 1 GREEN + 1 PURPLE -> 1 GOLD (DM: ${chance.toFixed(1)}%)`;
    }
    if(cell.type === 'hopper') speedText = 'Range: 3x3';
    if(cell.type === 'core_fragment') speedText = 'Core Extension';
    if(cell.type === 'extractor') speedText = `Extracts DM: ${cell.level}/s`;
    if(cell.type === 'dm_source') {
        const target = cell.mode === 1 ? 150 : (cell.mode === 2 ? 300 : (cell.mode === 3 ? 600 : 500));
        const modeName = cell.mode === 1 ? 'BLUE' : (cell.mode === 2 ? 'RED' : (cell.mode === 3 ? 'GREEN' : 'PURPLE'));
        speedText = `Charging: ${cell.dmStored}/${target} (${modeName})`;
        actionBtn.classList.remove('hidden');
        actionBtn.style.backgroundColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : (cell.mode === 3 ? '#22c55e' : '#d884ff'));
        actionBtn.innerText = 'CYCLE MODE';
        actionBtn.onclick = () => { cell.mode = (cell.mode % 4) + 1; updateInspector(); };
    }
    if(cell.type === 'teleporter') {
        speedText = `Channel: ${cell.channel}`;
        actionBtn.classList.remove('hidden');
        actionBtn.style.backgroundColor = '#8b5cf6';
        actionBtn.innerText = 'CYCLE CHANNEL';
        actionBtn.onclick = () => { cell.channel = (cell.channel % CONFIG.TELEPORTER_CHANNELS) + 1; updateInspector(); };
    }
    if(cell.type === 'condenser') {
        const modeName = cell.mode === 1 ? 'BLUE' : (cell.mode === 2 ? 'RED' : 'GREEN');
        const modeColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : '#22c55e');
        speedText = `Output: ${modeName}`;
        actionBtn.classList.remove('hidden');
        actionBtn.style.backgroundColor = modeColor;
        actionBtn.innerText = 'CYCLE MODE';
        actionBtn.onclick = () => { cell.mode = (cell.mode % 3) + 1; updateInspector(); };
    }

    statsEl.innerText = speedText;
    const upgradeCost = Math.floor(bDef.cost * Math.pow(1.35, cell.level));
    costEl.innerText = `$${formatValue(upgradeCost)}`;

    document.getElementById('inspect-upgrade').onclick = () => {
        if(state.entropy >= upgradeCost) {
            state.entropy -= upgradeCost;
            cell.level++;
            spawnParticles(cell.x, cell.y, '#00ff00', 10);
            updateInspector();
        }
    };
    document.getElementById('inspect-rotate').onclick = () => { cell.dir = (cell.dir + 1) % 4; };
    document.getElementById('inspect-delete').onclick = () => {
        state.selectedTool = 'delete';
        removeBuildingAt(cell);
        state.selectedTool = 'select';
        closeInspector();
        buildToolbar();
    };
}

export function openTechTree() {
    buildTechTree();
    refreshTechTree();
    document.getElementById('tech-modal').classList.remove('hidden');
}

function buildTechTree() {
    if(techUiBuilt) return;
    const list = document.getElementById('tech-list');
    list.innerHTML = '';
    techRowMap.clear();
    state.currentTechTree.forEach(tech => {
        const row = document.createElement('div');
        row.className = 'bg-gray-700 p-3 rounded flex justify-between items-center';
        const info = document.createElement('div');
        info.innerHTML = `<div class="font-bold text-white">${tech.name}</div><div class="text-xs text-gray-400">${tech.desc}</div>`;
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 rounded text-sm font-bold';
        btn.onclick = () => {
            if(state.entropy >= tech.cost) {
                state.entropy -= tech.cost;
                if(tech.oneTime) {
                    tech.effect(state);
                    state.techCompleted.add(tech.id);
                } else {
                    tech.effect(state);
                    tech.cost = Math.floor(tech.cost * tech.scale);
                }
                refreshTechTree();
            }
        };
        row.appendChild(info);
        row.appendChild(btn);
        list.appendChild(row);
        techRowMap.set(tech.id, { row, btn, tech });
    });
    techUiBuilt = true;
}

function refreshTechTree() {
    techRowMap.forEach(({ row, btn, tech }) => {
        const prereq = tech.prereq || [];
        const hasPrereq = prereq.every(id => state.techCompleted.has(id));
        const isDone = tech.oneTime && state.techCompleted.has(tech.id);
        if(!hasPrereq || isDone) {
            row.classList.add('hidden');
            return;
        }
        row.classList.remove('hidden');
        const canAfford = state.entropy >= tech.cost;
        btn.innerText = `$${formatValue(tech.cost)}`;
        btn.classList.toggle('bg-blue-600', canAfford);
        btn.classList.toggle('hover:bg-blue-500', canAfford);
        btn.classList.toggle('text-white', canAfford);
        btn.classList.toggle('bg-gray-600', !canAfford);
        btn.classList.toggle('text-gray-400', !canAfford);
        btn.classList.toggle('cursor-not-allowed', !canAfford);
    });
}
