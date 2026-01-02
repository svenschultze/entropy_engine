import { state, addEntropy } from './state.js';
import { CONFIG, DIRS } from './config.js';
import { BUILDINGS } from './buildings.js';
import { spawnParticles } from './effects.js';
import { removeBuildingAt } from './actions.js';
import { openInspector, closeInspector, updateInspector, showNotification, showFloatText, openTechTree } from './ui.js';
import { resizeCanvas } from './render.js';
import { canvas } from './dom.js';

let listenersBound = false;

function handleInteract(gx, gy) {
    if(gx < 0 || gx >= state.width || gy < 0 || gy >= state.height) return;
    const cell = state.grid[gy][gx];

    if(cell.type === 'core') {
        const valueBonus = 1 + (state.darkMatter * 0.01);
        const gained = 1 * valueBonus;
        addEntropy(gained);
        showFloatText(`+${gained.toFixed(1)}`, gx, gy, '#fff');
        spawnParticles(gx, gy, '#fff', 2);
        return;
    }

    if(state.selectedTool === 'select') {
        if(cell.type !== 'empty' && !cell.type.startsWith('source') && cell.type !== 'core') {
            openInspector(cell);
        } else {
            closeInspector();
        }
        return;
    }

    if(state.selectedTool === 'delete') {
        removeBuildingAt(cell);
        closeInspector();
        return;
    }

    const building = BUILDINGS[state.selectedTool.toUpperCase()];
    if(!building) return;

    if(cell.type === 'empty' || cell.type.startsWith('source')) {
        if(state.entropy >= building.cost) {
            if(building.id === 'miner' && !cell.sourceType) {
                showNotification('Needs Ore!');
                return;
            }
            if(building.id === 'extractor') {
                const adjacentCore = (gx > 0 && state.grid[gy][gx - 1].type === 'core')
                    || (gx < state.width - 1 && state.grid[gy][gx + 1].type === 'core')
                    || (gy > 0 && state.grid[gy - 1][gx].type === 'core')
                    || (gy < state.height - 1 && state.grid[gy + 1][gx].type === 'core');
                if(!adjacentCore) {
                    showNotification('Must be adjacent to Core!');
                    return;
                }
            }
            state.entropy -= building.cost;
            const keptSource = cell.sourceType;
            cell.type = building.id;
            cell.sourceType = keptSource;
            if(building.id === 'belt' || building.id === 'phase_belt') {
                cell.dir = getAutoBeltDir(gx, gy);
                state.lastBeltDir = cell.dir;
            } else {
                cell.dir = 1;
            }
            spawnParticles(gx, gy, '#ffffff', 5);
        } else {
            showNotification('Not enough Entropy!');
        }
    } else if (cell.type === building.id) {
        cell.dir = (cell.dir + 1) % 4;
        if(cell.type === 'belt' || cell.type === 'phase_belt') {
            state.lastBeltDir = cell.dir;
        }
        if(state.selectedCell === cell) updateInspector();
    } else {
        openInspector(cell);
    }
}

function handleInput(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const T = state.scale * CONFIG.TILE_SIZE;
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;
    const gx = Math.floor((cx - rect.left - OX) / T);
    const gy = Math.floor((cy - rect.top - OY) / T);
    if(gx === state.lastInteraction.x && gy === state.lastInteraction.y) return;
    state.lastInteraction = { x: gx, y: gy };
    handleInteract(gx, gy);
}

export function setupEventListeners({ onSingularityConfirm }) {
    if(listenersBound) return;
    listenersBound = true;

    const resetInteraction = () => {
        state.isDragging = false;
        state.lastInteraction = { x: -1, y: -1 };
    };

    canvas.addEventListener('mousedown', e => {
        state.isDragging = true;
        handleInput(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousemove', e => { if(state.isDragging) handleInput(e.clientX, e.clientY); });
    window.addEventListener('mouseup', resetInteraction);

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        state.isDragging = true;
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if(state.isDragging) handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener('touchend', resetInteraction);
    window.addEventListener('touchcancel', resetInteraction);

    window.addEventListener('resize', resizeCanvas);
    if(window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeCanvas);
        window.visualViewport.addEventListener('scroll', resizeCanvas);
    }

    document.getElementById('tech-btn').onclick = openTechTree;
    document.getElementById('close-tech').onclick = () => document.getElementById('tech-modal').classList.add('hidden');
    const helpBtn = document.getElementById('help-btn');
    if(helpBtn) helpBtn.onclick = () => document.getElementById('help-modal').classList.remove('hidden');
    const closeHelp = document.getElementById('close-help');
    if(closeHelp) closeHelp.onclick = () => document.getElementById('help-modal').classList.add('hidden');
    document.getElementById('inspect-close').onclick = closeInspector;

    const singModal = document.getElementById('singularity-modal');
    document.getElementById('singularity-btn').onclick = () => {
        const gain = Math.floor(state.entropy / 1000);
        document.getElementById('prestige-gain').innerText = gain;
        singModal.classList.remove('hidden');
    };
    document.getElementById('cancel-singularity').onclick = () => singModal.classList.add('hidden');
    document.getElementById('confirm-singularity').onclick = () => {
        singModal.classList.add('hidden');
        onSingularityConfirm();
    };
}

function getAutoBeltDir(x, y) {
    const beltDirs = [];
    for(let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d].x;
        const ny = y + DIRS[d].y;
        if(nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) continue;
        const neighbor = state.grid[ny][nx];
        if(neighbor.type === 'belt' || neighbor.type === 'phase_belt') beltDirs.push(d);
    }
    if(beltDirs.length) {
        const preferred = (state.lastBeltDir || 1);
        const match = beltDirs.find(d => (d + 2) % 4 === preferred);
        const chosen = match !== undefined ? match : beltDirs[0];
        return (chosen + 2) % 4;
    }
    return state.lastBeltDir || 1;
}



