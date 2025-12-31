import { state } from './state.js';
import { CONFIG } from './config.js';
import { BUILDINGS } from './buildings.js';
import { spawnParticles } from './effects.js';
import { removeBuildingAt } from './actions.js';
import { canvas } from './dom.js';

export function buildToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';

    const selBtn = document.createElement('button');
    selBtn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-blue-900/20 rounded-lg border-2 border-blue-600 flex flex-col items-center justify-center ${state.selectedTool==='select'?'active':''}`;
    selBtn.onclick = () => { state.selectedTool = 'select'; closeInspector(); buildToolbar(); };
    selBtn.innerHTML = `<div class="text-2xl mb-1 text-blue-400">⌖</div><div class="text-[10px] font-bold text-gray-300">Select</div>`;
    toolbar.appendChild(selBtn);

    Object.keys(BUILDINGS).forEach(k => {
        const b = BUILDINGS[k];
        const btn = document.createElement('button');
        const locked = b.locked;
        btn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-gray-800 rounded-lg border-2 border-gray-600 flex flex-col items-center justify-center ${state.selectedTool===b.id && !locked ? 'active' : ''} ${locked ? 'locked' : ''}`;
        if(!locked) btn.onclick = () => { state.selectedTool = b.id; closeInspector(); buildToolbar(); };
        btn.innerHTML = `<div class="text-2xl mb-1" style="color:${b.color}">${locked ? '?' : b.symbol}</div><div class="text-[10px] font-bold text-gray-300">${locked ? 'Locked' : b.name}</div><div class="text-[9px] text-gray-500">${locked ? 'Research' : '$'+b.cost}</div>`;
        toolbar.appendChild(btn);
    });

    const delBtn = document.createElement('button');
    delBtn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-red-900/20 rounded-lg border-2 border-red-900 flex flex-col items-center justify-center ${state.selectedTool==='delete'?'active':''}`;
    delBtn.onclick = () => { state.selectedTool = 'delete'; closeInspector(); buildToolbar(); };
    delBtn.innerHTML = `<div class="text-2xl mb-1 text-red-500">?</div><div class="text-[10px] font-bold text-gray-300">Remove</div>`;
    toolbar.appendChild(delBtn);
}

export function updateUI() {
    document.getElementById('score-display').innerText = Math.floor(state.entropy);
    document.getElementById('dm-display').innerText = `Dark Matter: ${state.darkMatter} (+${Math.round(state.darkMatter*1)}%)`;
    const epsEl = document.getElementById('eps-display');
    if(epsEl) epsEl.innerText = `Entropy/s: ${state.entropyPerSecond.toFixed(1)}`;
    const singBtn = document.getElementById('singularity-btn');
    if(state.entropy >= CONFIG.PRESTIGE_THRESHOLD) {
        singBtn.classList.remove('hidden');
        singBtn.classList.add('singularity-ready');
    } else {
        singBtn.classList.add('hidden');
        singBtn.classList.remove('singularity-ready');
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
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;
    el.style.left = (OX + gx * T + T/2) + 'px';
    el.style.top = (OY + gy * T) + 'px';
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
    if(cell.type === 'beacon') speedText = `Buff: +${(cell.level*20)}%`;
    if(cell.type === 'bridge') speedText = 'Crossing (non-directional)';
    if(cell.type === 'reactor') speedText = 'Converts: 1 GREEN + 1 PURPLE → 1 GOLD';
    if(cell.type === 'hopper') speedText = 'Range: 3x3';
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
    costEl.innerText = `$${upgradeCost}`;

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
    const list = document.getElementById('tech-list');
    list.innerHTML = '';
    state.currentTechTree.forEach(tech => {
        if(tech.oneTime && state.techCompleted.has(tech.id)) return;
        const prereq = tech.prereq || [];
        const hasPrereq = prereq.every(id => state.techCompleted.has(id));
        if(!hasPrereq) return;
        const div = document.createElement('div');
        div.className = 'bg-gray-700 p-3 rounded flex justify-between items-center';
        const canAfford = state.entropy >= tech.cost;
        div.innerHTML = `<div><div class="font-bold text-white">${tech.name}</div><div class="text-xs text-gray-400">${tech.desc}</div></div><button class="px-3 py-1 rounded text-sm font-bold ${canAfford ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">$${tech.cost}</button>`;
        if(canAfford) {
            div.querySelector('button').onclick = () => {
                if(state.entropy >= tech.cost) {
                    state.entropy -= tech.cost;
                    if(tech.oneTime) {
                        tech.effect(state);
                        state.techCompleted.add(tech.id);
                        openTechTree();
                    } else {
                        tech.effect(state);
                        tech.cost = Math.floor(tech.cost * tech.scale);
                        openTechTree();
                    }
                }
            };
        }
        list.appendChild(div);
    });
    document.getElementById('tech-modal').classList.remove('hidden');
}




