import { state, addEntropy } from './state.js';
import { DIRS } from './config.js';
import { ITEMS, BASE_ITEM_VALUES, recomputePurpleValue, recomputeGoldValue, formatValue } from './items.js';
import { BUILDINGS } from './buildings.js';
import { Cell, Item } from './classes.js';
import { spawnParticles } from './effects.js';
import { buildToolbar, closeInspector, updateUI, showNotification, showFloatText } from './ui.js';
import { resizeCanvas, draw } from './render.js';
import { setupEventListeners } from './input.js';
import { getTechTree } from './tech.js';

const SAVE_KEY = 'entropy_engine_save_v1';
const SAVE_VERSION = 2;
let lastSave = 0;
let isRunning = false;

function placeSource(visualType, itemType, count) {
    for(let i = 0; i < count; i++) {
        let placed = false;
        let attempts = 0;
        while(!placed && attempts < 100) {
            let rx = Math.floor(Math.random() * state.width);
            let ry = Math.floor(Math.random() * state.height);
            if(state.grid[ry][rx].type === 'empty' && Math.abs(rx - state.width/2) > 2) {
                state.grid[ry][rx].type = visualType;
                state.grid[ry][rx].sourceType = itemType;
                placed = true;
            }
            attempts++;
        }
    }
}

function handleSingularityConfirm() {
    const gain = Math.floor(state.totalEntropy / 1000);
    state.darkMatter += gain;
    initGame(true);
    showNotification('UNIVERSE RESET.');
}

export function initGame(resetTech = false) {
    if(resetTech) {
        state.entropy = 100;
        state.totalEntropy = 100;
        state.entropyPrev = state.entropy;
        state.items = [];
        state.particles = [];
        state.tech = { beltSpeed: 1, minerSpeed: 1, spawnRate: 50, reactorDarkMatterChance: 0.001 };
        state.techCompleted = new Set();
        ITEMS.RED.value = BASE_ITEM_VALUES.RED;
        ITEMS.BLUE.value = BASE_ITEM_VALUES.BLUE;
        ITEMS.GREEN.value = BASE_ITEM_VALUES.GREEN;
        recomputePurpleValue();
        recomputeGoldValue();
        Object.keys(BUILDINGS).forEach(k => {
            if(k !== 'BELT' && k !== 'MINER') BUILDINGS[k].locked = true;
        });
        state.currentTechTree = getTechTree(buildToolbar);
    }

    state.grid = [];
    for(let y = 0; y < state.height; y++) {
        let row = [];
        for(let x = 0; x < state.width; x++) {
            row.push(new Cell(x, y));
        }
        state.grid.push(row);
    }

    const cx = Math.floor(state.width/2) - 1;
    const cy = Math.floor(state.height/2) - 1;
    state.grid[cy][cx].type = 'core';
    state.grid[cy][cx+1].type = 'core';
    state.grid[cy+1][cx].type = 'core';
    state.grid[cy+1][cx+1].type = 'core';

    placeSource('source_red', ITEMS.RED, 3);
    placeSource('source_blue', ITEMS.BLUE, 3);
    if(state.darkMatter > 0) placeSource('source_gold', ITEMS.GOLD, 1);

    state.selectedCell = null;
    state.selectedTool = 'select';
    state.lastInteraction = { x: -1, y: -1 };
    closeInspector();
    resizeCanvas();
    buildToolbar();
    setupEventListeners({ onSingularityConfirm: handleSingularityConfirm });
    updateUI();
}

function isValidMove(tx, ty, item, reserved) {
    if(tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) return false;
    const target = state.grid[ty][tx];
    if(target.type === 'core') return true;
    if(target.type === 'miner' || target.type.startsWith('source')) return false;
    if(target.type === 'condenser') return false;
    const limit = getCellCapacity(target.type);
    if(limit === 1 && isCellOccupied(tx, ty, item, reserved)) return false;
    if(limit > 1 && getItemCountAt(tx, ty, item, reserved) >= limit) return false;
    return true;
}

function spawnItem(typeObj, x, y, dir = -1, reserved = null) {
    const reservations = reserved || buildReservationSet();
    if(dir !== -1) {
        const dx = DIRS[dir].x;
        const dy = DIRS[dir].y;
        const nx = x + dx;
        const ny = y + dy;
        if(isValidMove(nx, ny, { x: x, y: y }, reservations)) {
            const it = new Item(typeObj, x, y);
            it.targetCell = { x: nx, y: ny };
            state.items.push(it);
            if(getCellCapacity(state.grid[ny][nx].type) === 1) reservations.add(cellKey(nx, ny));
        }
    } else {
        if(state.grid[y][x].type === 'phase_belt' || !isCellOccupied(x, y, null, reservations)) {
            state.items.push(new Item(typeObj, x, y));
        }
    }
}

function consumeItem(item) {
    if(item.type === ITEMS.DARK_MATTER) {
        state.darkMatter += 1;
        showFloatText('+1 DM', item.x, item.y, item.type.color);
        spawnParticles(item.x, item.y, '#7c3aed', 3);
        return;
    }

    const valueBonus = 1 + (state.darkMatter * 0.01);
    const gained = item.type.value * valueBonus;
    addEntropy(gained);
    showFloatText(`+${formatValue(gained)}`, item.x, item.y, item.type.color);
    spawnParticles(item.x, item.y, '#ffffff', 3);
}

function cellKey(x, y) {
    return `${x},${y}`;
}

function buildReservationSet() {
    const reserved = new Set();
    for(const it of state.items) {
        if(it.targetCell) {
            const target = state.grid[it.targetCell.y]?.[it.targetCell.x];
            if(!target || target.type !== 'phase_belt') {
                reserved.add(cellKey(it.targetCell.x, it.targetCell.y));
            }
        }
    }
    return reserved;
}

function isCellOccupied(x, y, ignoreItem, reserved) {
    const occupied = state.items.some(it => it !== ignoreItem && it.x === x && it.y === y);
    if(occupied) return true;
    if(reserved && reserved.has(cellKey(x, y))) return true;
    return false;
}

function getCellCapacity(type) {
    if(type === 'phase_belt') return 10;
    if(type === 'bridge') return 5;
    return 1;
}

function getItemCountAt(x, y, ignoreItem, reserved) {
    let count = 0;
    for(const it of state.items) {
        if(it !== ignoreItem && it.x === x && it.y === y) count++;
    }
    if(reserved && reserved.has(cellKey(x, y))) count++;
    return count;
}

function findTeleporterDestinations(channel, excludeCell) {
    const matches = [];
    for(let y = 0; y < state.height; y++) {
        for(let x = 0; x < state.width; x++) {
            const cell = state.grid[y][x];
            if(cell.type === 'teleporter' && cell.channel === channel) {
                if(!excludeCell || cell !== excludeCell) matches.push(cell);
            }
        }
    }
    return matches;
}

function getItemKey(item) {
    return Object.keys(ITEMS).find(key => ITEMS[key] === item) || null;
}

function getItemByKey(key) {
    return key && ITEMS[key] ? ITEMS[key] : null;
}

function serializeState() {
        const grid = state.grid.map(row => row.map(cell => ({
            x: cell.x,
            y: cell.y,
            type: cell.type,
            dir: cell.dir,
            level: cell.level,
            mode: cell.mode,
            channel: cell.channel,
            fuelMultiplier: cell.fuelMultiplier,
            fuelTimer: cell.fuelTimer,
            fuelQueue: cell.fuelQueue,
            channel: cell.channel,
            splitterIndex: cell.splitterIndex,
            processing: cell.processing,
            sourceType: getItemKey(cell.sourceType),
            buffer: { ...cell.buffer }
        })));

    const items = state.items.map(item => ({
        type: getItemKey(item.type),
        x: item.x,
        y: item.y,
        progress: item.progress,
        targetCell: item.targetCell ? { ...item.targetCell } : null,
        moveDir: item.moveDir,
        stuck: item.stuck,
        decay: item.decay,
        id: item.id
    }));

    const techCosts = {};
    state.currentTechTree.forEach(tech => { techCosts[tech.id] = tech.cost; });

    return {
        version: SAVE_VERSION,
        width: state.width,
        height: state.height,
        entropy: state.entropy,
        totalEntropy: state.totalEntropy,
        darkMatter: state.darkMatter,
        tech: { ...state.tech },
        techCompleted: Array.from(state.techCompleted),
        techCosts,
        itemsValues: {
            RED: ITEMS.RED.value,
            BLUE: ITEMS.BLUE.value,
            GREEN: ITEMS.GREEN.value
        },
        selectedTool: state.selectedTool,
        grid,
        items
    };
}

export function saveGame() {
    try {
        const payload = JSON.stringify(serializeState());
        localStorage.setItem(SAVE_KEY, payload);
    } catch (e) {
        console.warn('Save failed', e);
    }
}

export function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if(!raw) return false;
        const data = JSON.parse(raw);
        if(!data || data.version !== SAVE_VERSION) {
            localStorage.removeItem(SAVE_KEY);
            return false;
        }
        if(data.width !== state.width || data.height !== state.height) return false;

        state.entropy = data.entropy ?? 100;
        state.totalEntropy = data.totalEntropy ?? state.entropy;
        state.entropyPrev = state.entropy;
        state.darkMatter = data.darkMatter ?? 0;
        state.tech = data.tech || { beltSpeed: 1, minerSpeed: 1, spawnRate: 50, reactorDarkMatterChance: 0.001 };
        if(typeof state.tech.reactorDarkMatterChance !== 'number') {
            state.tech.reactorDarkMatterChance = 0.001;
        }
        state.techCompleted = new Set(data.techCompleted || []);
        state.selectedTool = data.selectedTool || 'select';
        state.entropyGained = 0;
        state.entropyEarned = 0;
        state.entropyEarnedTime = 0;
        state.entropyPerSecond = 0;

        ITEMS.RED.value = data.itemsValues?.RED ?? BASE_ITEM_VALUES.RED;
        ITEMS.BLUE.value = data.itemsValues?.BLUE ?? BASE_ITEM_VALUES.BLUE;
        ITEMS.GREEN.value = data.itemsValues?.GREEN ?? BASE_ITEM_VALUES.GREEN;
        recomputePurpleValue();

        Object.keys(BUILDINGS).forEach(k => {
            if(k !== 'BELT' && k !== 'MINER') BUILDINGS[k].locked = true;
        });
        state.currentTechTree = getTechTree(buildToolbar);
        state.currentTechTree.forEach(tech => {
            if(data.techCosts && typeof data.techCosts[tech.id] === 'number') {
                tech.cost = data.techCosts[tech.id];
            }
        });
        state.currentTechTree.forEach(tech => {
            if(tech.oneTime && state.techCompleted.has(tech.id)) {
                tech.effect(state);
            }
        });

        state.grid = [];
        for(let y = 0; y < state.height; y++) {
            const row = [];
            for(let x = 0; x < state.width; x++) {
                const cellData = data.grid?.[y]?.[x];
                const cell = new Cell(x, y);
                if(cellData) {
                    cell.type = cellData.type || 'empty';
                    cell.dir = cellData.dir ?? 1;
                    cell.level = cellData.level ?? 1;
                    cell.mode = cellData.mode ?? 1;
                    cell.channel = cellData.channel ?? 1;
                    cell.fuelMultiplier = cellData.fuelMultiplier ?? 1;
                    cell.fuelTimer = cellData.fuelTimer ?? 0;
                    cell.fuelQueue = Array.isArray(cellData.fuelQueue) ? cellData.fuelQueue.slice(0, 10) : [];
                    cell.channel = cellData.channel ?? 1;
                    cell.splitterIndex = cellData.splitterIndex ?? 0;
                    cell.processing = cellData.processing ?? 0;
                    cell.sourceType = getItemByKey(cellData.sourceType);
                    cell.buffer = {
                        red: cellData.buffer?.red ?? 0,
                        blue: cellData.buffer?.blue ?? 0,
                        green: cellData.buffer?.green ?? 0,
                        purple: cellData.buffer?.purple ?? 0
                    };
                }
                row.push(cell);
            }
            state.grid.push(row);
        }

        state.items = [];
        if(Array.isArray(data.items)) {
            for(const itemData of data.items) {
                const typeObj = getItemByKey(itemData.type);
                if(!typeObj) continue;
                const it = new Item(typeObj, itemData.x, itemData.y);
                it.progress = itemData.progress ?? 0;
                it.targetCell = itemData.targetCell ? { ...itemData.targetCell } : null;
                it.moveDir = itemData.moveDir ?? null;
                it.stuck = !!itemData.stuck;
                it.decay = itemData.decay ?? 0;
                it.id = itemData.id || it.id;
                state.items.push(it);
            }
        }

        closeInspector();
        resizeCanvas();
        buildToolbar();
        setupEventListeners({ onSingularityConfirm: handleSingularityConfirm });
        updateUI();
        return true;
    } catch (e) {
        console.warn('Load failed', e);
        localStorage.removeItem(SAVE_KEY);
        return false;
    }
}

function update(dt) {
    const reservations = buildReservationSet();

    for(let y = 0; y < state.height; y++) {
        for(let x = 0; x < state.width; x++) {
            const cell = state.grid[y][x];

            if(cell.type === 'beacon') {
                if(cell.fuelTimer > 0) {
                    cell.fuelTimer -= dt;
                    if(cell.fuelTimer <= 0) {
                        cell.fuelTimer = 0;
                        if(cell.fuelQueue.length > 0) {
                            cell.fuelMultiplier = cell.fuelQueue.shift();
                            cell.fuelTimer = 1;
                        } else {
                            cell.fuelMultiplier = 1;
                        }
                    }
                } else if(cell.fuelQueue.length > 0) {
                    cell.fuelMultiplier = cell.fuelQueue.shift();
                    cell.fuelTimer = 1;
                }
            }

            let localMult = 1;
            for(let by = Math.max(0, y-2); by <= Math.min(state.height-1, y+2); by++) {
                for(let bx = Math.max(0, x-2); bx <= Math.min(state.width-1, x+2); bx++) {
                    const neighbor = state.grid[by][bx];
                    if(neighbor.type === 'beacon') {
                        const dist = Math.max(Math.abs(x - bx), Math.abs(y - by));
                        const fuelMult = neighbor.fuelTimer > 0 ? neighbor.fuelMultiplier : 1;
                        if(dist <= 1) localMult += (neighbor.level * 0.2) * fuelMult;
                        else localMult += (neighbor.level * 0.1) * fuelMult;
                    }
                }
            }

            const levelMult = 1 + (cell.level-1)*0.2;
            const speedMult = state.tech.minerSpeed * localMult * levelMult;

            if(cell.type === 'miner') {
                cell.processing += speedMult;
                let threshold = state.tech.spawnRate;
                if(cell.sourceType === ITEMS.RED) threshold *= 2;
                if(cell.processing >= threshold) {
                    if(cell.sourceType) { spawnItem(cell.sourceType, x, y, -1, reservations); cell.processing = 0; }
                }
            }

            if(cell.type === 'condenser') {
                let targetItem = ITEMS.BLUE;
                let speedFactor = 0.5;
                if(cell.mode === 2) { targetItem = ITEMS.RED; speedFactor = 0.25; }
                else if (cell.mode === 3) { targetItem = ITEMS.GREEN; speedFactor = 0.1; }

                const condenserLevelMult = 1 + (cell.level-1)*0.4;
                cell.processing += speedMult * speedFactor * condenserLevelMult;
                if(cell.processing >= state.tech.spawnRate) {
                    const rDir = Math.floor(Math.random() * 4);
                    spawnItem(targetItem, x, y, rDir, reservations);
                    cell.processing = 0;
                }
            }

            if(cell.type === 'reactor') {
                if(cell.buffer.green > 0 && cell.buffer.purple > 0) {
                    cell.processing += speedMult * 0.5;
                    if(cell.processing >= 60) {
                        cell.buffer.green--;
                        cell.buffer.purple--;
                        const dmProc = Math.random() < state.tech.reactorDarkMatterChance;
                        spawnItem(dmProc ? ITEMS.DARK_MATTER : ITEMS.GOLD, x, y, cell.dir, reservations);
                        cell.processing = 0;
                        spawnParticles(x, y, '#facc15', 8);
                    }
                } else {
                    cell.processing = 0;
                }
            }

            if(cell.type === 'hopper') {
                for(let by = Math.max(0, y-1); by <= Math.min(state.height-1, y+1); by++) {
                    for(let bx = Math.max(0, x-1); bx <= Math.min(state.width-1, x+1); bx++) {
                        if(bx === x && by === y) continue;
                        const nCell = state.grid[by][bx];
                        if(nCell.type === 'empty' || nCell.type.startsWith('source')) {
                            const looseItem = state.items.find(it => it.x === bx && it.y === by && !it.targetCell && it.progress < 0.1);
                            if(looseItem) {
                                looseItem.targetCell = { x: x, y: y };
                                looseItem.stuck = false;
                            }
                        }
                    }
                }
            }

            if(cell.type === 'mixer') {
                if(cell.buffer.red > 0 && cell.buffer.blue > 0) {
                    cell.processing += speedMult;
                    if(cell.processing >= 20) {
                        cell.buffer.red--;
                        cell.buffer.blue--;
                        spawnItem(ITEMS.PURPLE, x, y, cell.dir, reservations);
                        cell.processing = 0;
                        spawnParticles(x, y, '#d884ff', 5);
                    }
                }
            }
        }
    }

    for(let i = state.items.length - 1; i >= 0; i--) {
        const item = state.items[i];
        const cell = state.grid[item.y][item.x];

        if(cell.type === 'empty' || cell.type.startsWith('source')) {
            item.decay += dt;
            if(item.decay > 10) {
                state.items.splice(i, 1);
                spawnParticles(item.x, item.y, '#555', 3);
                continue;
            }
        } else {
            item.decay = 0;
        }

        const cellLevel = (cell.type === 'belt' || cell.type === 'phase_belt' || cell.type === 'bridge' || cell.type === 'hopper') ? cell.level : 1;
        const speed = 0.05 * state.tech.beltSpeed * (1 + (cellLevel-1)*0.1);

        if(cell.type === 'teleporter' && !item.targetCell) {
            const destinations = findTeleporterDestinations(cell.channel, cell);
                if(destinations.length > 0) {
                    let destCell;
                    if(destinations.length <= 2) {
                        destCell = destinations[0];
                    } else {
                        destCell = destinations[Math.floor(Math.random() * destinations.length)];
                    }
                if(destCell) {
                    if(!isCellOccupied(destCell.x, destCell.y, item, reservations)) {
                        item.x = destCell.x;
                        item.y = destCell.y;
                        item.progress = 0;
                        item.targetCell = null;
                        item.moveDir = destCell.dir;
                        reservations.add(cellKey(destCell.x, destCell.y));
                        item.stuck = false;
                        continue;
                    }
                    item.stuck = true;
                }
            }
        }

        if(!item.targetCell) {
            let dx = 0, dy = 0;

            if(cell.type === 'belt' || cell.type === 'miner' || cell.type === 'mixer' || cell.type.startsWith('source') || cell.type === 'hopper') {
                item.moveDir = cell.dir;
                dx = DIRS[item.moveDir].x;
                dy = DIRS[item.moveDir].y;
            }
            else if (cell.type === 'phase_belt') {
                item.moveDir = cell.dir;
                dx = DIRS[item.moveDir].x;
                dy = DIRS[item.moveDir].y;
            }
            else if (cell.type === 'bridge') {
                if(item.moveDir === null) item.moveDir = cell.dir;
                dx = DIRS[item.moveDir].x;
                dy = DIRS[item.moveDir].y;
            }
            else if (cell.type === 'splitter') {
                const outputs = [(cell.dir + 3) % 4, cell.dir, (cell.dir + 1) % 4];
                let found = false;
                for(let k = 0; k < 3; k++) {
                    const idx = (cell.splitterIndex + k) % 3;
                    const tryDir = outputs[idx];
                    const tx = item.x + DIRS[tryDir].x;
                    const ty = item.y + DIRS[tryDir].y;
                    if(isValidMove(tx, ty, item, reservations)) {
                        item.moveDir = tryDir;
                        dx = DIRS[tryDir].x;
                        dy = DIRS[tryDir].y;
                        cell.splitterIndex = (idx + 1) % 3;
                        found = true;
                        break;
                    }
                }
                if(!found) { item.stuck = true; continue; }
            }

            const nextX = item.x + dx;
            const nextY = item.y + dy;

            if(dx !== 0 || dy !== 0) {
                if(isValidMove(nextX, nextY, item, reservations)) {
                    const nextCell = state.grid[nextY][nextX];

                    if(nextCell.type === 'core') {
                        consumeItem(item);
                        state.items.splice(i, 1);
                        continue;
                    }

                    if(nextCell.type === 'mixer') {
                        if(item.type === ITEMS.RED && nextCell.buffer.red < 5) {
                            nextCell.buffer.red++;
                            state.items.splice(i, 1);
                            continue;
                        } else if (item.type === ITEMS.BLUE && nextCell.buffer.blue < 5) {
                            nextCell.buffer.blue++;
                            state.items.splice(i, 1);
                            continue;
                        }
                        item.stuck = true;
                        continue;
                    }
                    if(nextCell.type === 'reactor') {
                        if(item.type === ITEMS.GREEN && nextCell.buffer.green < 5) {
                            nextCell.buffer.green++;
                            state.items.splice(i, 1);
                            continue;
                        }
                        if(item.type === ITEMS.PURPLE && nextCell.buffer.purple < 5) {
                            nextCell.buffer.purple++;
                            state.items.splice(i, 1);
                            continue;
                        }
                        item.stuck = true;
                        continue;
                    }
                    if(nextCell.type === 'beacon') {
                        if(nextCell.fuelTimer <= 0 && nextCell.fuelQueue.length === 0) {
                            nextCell.fuelMultiplier = item.type.value;
                            nextCell.fuelTimer = 1;
                        } else if(nextCell.fuelQueue.length < 10) {
                            nextCell.fuelQueue.push(item.type.value);
                        }
                        state.items.splice(i, 1);
                        spawnParticles(nextX, nextY, item.type.color, 4);
                        continue;
                    }
                    item.targetCell = { x: nextX, y: nextY };
                    if(getCellCapacity(nextCell.type) === 1) reservations.add(cellKey(nextX, nextY));
                    item.stuck = false;
                } else {
                    item.stuck = true;
                }
            }
        }

        if(item.targetCell) {
            item.progress += speed;
            if(item.progress >= 1.0) {
                item.x = item.targetCell.x;
                item.y = item.targetCell.y;
                item.progress = 0;
                item.targetCell = null;
            }
        }
    }

    const safeDt = Math.max(dt, 0.001);
    const gained = state.entropyGained;
    state.entropyGained = 0;
    state.entropyEarned += gained;
    state.entropyEarnedTime += safeDt;
    if(state.entropyEarnedTime >= 5) {
        state.entropyPerSecond = state.entropyEarned / state.entropyEarnedTime;
        state.entropyEarned = 0;
        state.entropyEarnedTime = 0;
    }

    for(let i = state.particles.length - 1; i >= 0; i--) {
        if(!state.particles[i].update()) state.particles.splice(i, 1);
    }
    updateUI();

    const now = Date.now();
    if(now - lastSave > 2000) {
        saveGame();
        lastSave = now;
    }
}

export function gameLoop() {
    try {
        isRunning = true;
        const now = Date.now();
        update((now - state.lastTick) / 1000);
        draw();
        state.lastTick = now;
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error(e);
    }
}

export function startGame() {
    if(isRunning) return;
    initGame(true);
    state.lastTick = Date.now();
    gameLoop();
}

export function resumeGame() {
    if(isRunning) return;
    state.lastTick = Date.now();
    gameLoop();
}










