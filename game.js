
/**
 * THE ENTROPY ENGINE: FINAL
 */

window.onerror = function(msg, url, line, col, error) {
    document.getElementById('error-log').style.display = 'block';
    document.getElementById('error-log').innerText = `CRASH: ${msg}\nLine: ${line}`;
};

// --- Config & Data ---
const CONFIG = {
    GRID_SIZE: 12,
    TILE_SIZE: 48, 
    PRESTIGE_THRESHOLD: 10000,
    COLORS: {
        grid: '#1a1a20', gridLine: '#2a2a35',
        belt: '#3b3b45', beltArrow: '#606070',
        core: '#ffffff', miner: '#ef4444',
        splitter: '#eab308', mixer: '#a855f7',
        beacon: '#06b6d4', condenser: '#14b8a6', reactor: '#facc15',
        bridge: '#f97316', hopper: '#10b981',
        itemRed: '#ff5555', itemBlue: '#55aaff',
        itemGold: '#fbbf24', itemPurple: '#d884ff'
    }
};

const ITEMS = {
    RED: { id: 0, color: CONFIG.COLORS.itemRed, value: 2 },
    BLUE: { id: 1, color: CONFIG.COLORS.itemBlue, value: 1 },
    GOLD: { id: 3, color: CONFIG.COLORS.itemGold, value: 50 },
    PURPLE: { id: 2, color: CONFIG.COLORS.itemPurple, value: 8 }
};


const BASE_ITEM_VALUES = {
    RED: 2,
    BLUE: 1,
    GOLD: 50
};



function recomputePurpleValue() {
    // Purple is always derived from current red/blue values
    ITEMS.PURPLE.value = (ITEMS.RED.value + ITEMS.BLUE.value) * 3;
}

function formatValue(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

recomputePurpleValue();

const BUILDINGS = {
    BELT: { id: 'belt', name: 'Belt', cost: 10, color: CONFIG.COLORS.belt, symbol: '➜', locked: false },
    MINER: { id: 'miner', name: 'Miner', cost: 50, color: CONFIG.COLORS.miner, symbol: '⚒', locked: false },
    SPLITTER: { id: 'splitter', name: 'Splitter', cost: 100, color: CONFIG.COLORS.splitter, symbol: '⑂', locked: true },
    BRIDGE: { id: 'bridge', name: 'Bridge', cost: 300, color: CONFIG.COLORS.bridge, symbol: '+', locked: true },
    REACTOR: { id: 'reactor', name: 'Reactor', cost: 100000, color: '#facc15', symbol: '☢', locked: true },
    MIXER: { id: 'mixer', name: 'Mixer', cost: 200, color: CONFIG.COLORS.mixer, symbol: '⚗', locked: true },
    HOPPER: { id: 'hopper', name: 'Hopper', cost: 1000, color: CONFIG.COLORS.hopper, symbol: '▼', locked: true },
    BEACON: { id: 'beacon', name: 'Beacon', cost: 5000, color: CONFIG.COLORS.beacon, symbol: '✴', locked: true },
    CONDENSER: { id: 'condenser', name: 'Condenser', cost: 20000, color: CONFIG.COLORS.condenser, symbol: '◎', locked: true }
};

const DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

function getTechTree() {
    return [
        { 
            id: 'logistics', name: 'Logistics I', cost: 200, 
            desc: 'Unlocks Splitters.', oneTime: true,
            effect: (s) => { BUILDINGS.SPLITTER.locked = false; buildToolbar(); }
        },
        { 
            id: 'logistics2', name: 'Logistics II', cost: 1000, 
            desc: 'Unlocks Bridges (Non-directional crossing tile).', oneTime: true,
            effect: (s) => { BUILDINGS.BRIDGE.locked = false; buildToolbar(); }
        },
        { 
            id: 'chemistry', name: 'Chemistry I', cost: 500, 
            desc: 'Unlocks Mixers.', oneTime: true,
            effect: (s) => { BUILDINGS.MIXER.locked = false; buildToolbar(); }
        },
        { 
            id: 'logistics3', name: 'Logistics III', cost: 3000, 
            desc: 'Unlocks Hoppers (Collects loose items).', oneTime: true,
            effect: (s) => { BUILDINGS.HOPPER.locked = false; buildToolbar(); }
        },
        { 
            id: 'overclock', name: 'Overclocking', cost: 2500, 
            desc: 'Unlocks Beacons.', oneTime: true,
            effect: (s) => { BUILDINGS.BEACON.locked = false; buildToolbar(); }
        },
        {
            id: 'matter_gen', name: 'Matter Gen', cost: 10000,
            desc: 'Unlocks Condensers.', oneTime: true,
            effect: (s) => { BUILDINGS.CONDENSER.locked = false; buildToolbar(); }
        },
        {
            id: 'reactor_unlock', name: 'Nuclear Synthesis', cost: 50000,
            desc: 'Unlocks Reactors (1 GOLD → 1 RED + 2 BLUE).', oneTime: true,
            effect: (s) => { BUILDINGS.REACTOR.locked = false; buildToolbar(); }
        },

        // --- Infinite value research (late game scaling) ---
        {
            id: 'entropy_red', name: 'Red Entropy Amplification', cost: 5000,
            desc: 'Increases Red fuel entropy gain by ×1.1 (stackable).', oneTime: false, scale: 2.0,
            effect: (s) => { ITEMS.RED.value *= 1.1; recomputePurpleValue(); }
        },
        {
            id: 'entropy_blue', name: 'Blue Entropy Amplification', cost: 5000,
            desc: 'Increases Blue fuel entropy gain by ×1.1 (stackable).', oneTime: false, scale: 2.0,
            effect: (s) => { ITEMS.BLUE.value *= 1.1; recomputePurpleValue(); }
        },
        {
            id: 'gold_price', name: 'Gold Price Refinement', cost: 8000,
            desc: 'Increases Gold fuel entropy gain by ×1.2 (stackable).', oneTime: false, scale: 2.0,
            effect: (s) => { ITEMS.GOLD.value *= 1.2; }
        },

        { 
            id: 'speed_inf', name: 'Belt Efficiency', cost: 150, 
            desc: '+5% Global Belt Speed.', oneTime: false, scale: 1.5,
            effect: (s) => { s.tech.beltSpeed *= 1.05; }
        },
        { 
            id: 'mine_inf', name: 'Drill Efficiency', cost: 300, 
            desc: '+5% Global Mining & Condenser Speed.', oneTime: false, scale: 1.5,
            effect: (s) => { s.tech.minerSpeed *= 1.05; }
        }
    
        ,
        {
            id: 'cheat_entropy',
            name: 'Entropy Injection (Cheat)',
            cost: 0,
            desc: 'Immediately grants 100,000 Entropy. Repeatable.',
            oneTime: false,
            scale: 1,
            effect: (s) => { s.entropy += 100000; }
        }
];
}

const state = {
    entropy: 100, 
    darkMatter: 0,
    grid: [],
    items: [],
    particles: [],
    width: CONFIG.GRID_SIZE,
    height: CONFIG.GRID_SIZE,
    selectedTool: 'select', 
    lastTick: 0,
    scale: 1,
    tech: { beltSpeed: 1, minerSpeed: 1, spawnRate: 60 },
    lastInteraction: { x: -1, y: -1 },
    isDragging: false,
    selectedCell: null
};

let currentTechTree = getTechTree();

class Cell {
    constructor(x, y, type = 'empty') {
        this.x = x; this.y = y;
        this.type = type; 
        this.dir = 1; 
        this.contents = []; 
        this.processing = 0; 
        this.buffer = { red: 0, blue: 0, gold: 0 };
        this.sourceType = null;
        this.splitterIndex = 0;
        this.level = 1;
        this.mode = 1; 
    }
}

class Item {
    constructor(type, x, y) {
        this.type = type;
        this.x = x; this.y = y; 
        this.progress = 0.0;
        this.targetCell = null;
        this.moveDir = null; // Direction of travel (for non-directional bridges, etc.)
        this.stuck = false;
        this.decay = 0; // Seconds alive
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        this.life = 1.0;
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 0.1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= 0.05;
        return this.life > 0;
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// --- Core Logic ---
function initGame(resetTech = false) {
    if(resetTech) {
        state.entropy = 100;
        state.items = [];
        state.particles = [];
        state.tech = { beltSpeed: 1, minerSpeed: 1, spawnRate: 60 };
        // Reset item values (infinite research does not persist through resets)
        ITEMS.RED.value = BASE_ITEM_VALUES.RED;
        ITEMS.BLUE.value = BASE_ITEM_VALUES.BLUE;
        ITEMS.GOLD.value = BASE_ITEM_VALUES.GOLD;
        recomputePurpleValue();
        // Lock everything
        Object.keys(BUILDINGS).forEach(k => {
             if(k !== 'BELT' && k !== 'MINER') BUILDINGS[k].locked = true;
        });
        currentTechTree = getTechTree();
    }

    state.grid = [];
    for(let y=0; y<state.height; y++) {
        let row = [];
        for(let x=0; x<state.width; x++) {
            row.push(new Cell(x, y));
        }
        state.grid.push(row);
    }

    const cx = Math.floor(state.width/2) - 1;
    const cy = Math.floor(state.height/2) - 1;
    state.grid[cy][cx].type = 'core'; state.grid[cy][cx+1].type = 'core';
    state.grid[cy+1][cx].type = 'core'; state.grid[cy+1][cx+1].type = 'core';

    placeSource('source_red', ITEMS.RED, 3);
    placeSource('source_blue', ITEMS.BLUE, 3);
    if(state.darkMatter > 0) placeSource('source_gold', ITEMS.GOLD, 1);

    state.selectedCell = null;
    state.selectedTool = 'select'; 
    closeInspector();
    resizeCanvas();
    buildToolbar();
    setupEventListeners();
    updateUI();
}

function placeSource(visualType, itemType, count) {
    for(let i=0; i<count; i++) {
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

function update(dt) {
    const dmBonus = 1 + (state.darkMatter * 0.10);

    for(let y=0; y<state.height; y++) {
        for(let x=0; x<state.width; x++) {
            const cell = state.grid[y][x];
            
            // Beacon Buff Calculation (5x5 Area)
            let localMult = 1;
            // Check 5x5 area centered on cell
            for(let by = Math.max(0, y-2); by <= Math.min(state.height-1, y+2); by++) {
                for(let bx = Math.max(0, x-2); bx <= Math.min(state.width-1, x+2); bx++) {
                    const neighbor = state.grid[by][bx];
                    if(neighbor.type === 'beacon') {
                        const dist = Math.max(Math.abs(x - bx), Math.abs(y - by));
                        if(dist <= 1) localMult += (neighbor.level * 0.2); // Inner: 20%
                        else localMult += (neighbor.level * 0.1); // Outer: 10%
                    }
                }
            }
            
            const speedMult = dmBonus * state.tech.minerSpeed * localMult * (1 + (cell.level-1)*0.2);

            // Miner Logic
            if(cell.type === 'miner') {
                cell.processing += speedMult;
                let threshold = state.tech.spawnRate;
                if(cell.sourceType === ITEMS.RED) threshold *= 2; 
                if(cell.processing >= threshold) {
                    if(cell.sourceType) { spawnItem(cell.sourceType, x, y); cell.processing = 0; }
                }
            }

            // Condenser Logic
            if(cell.type === 'condenser') {
                let targetItem = ITEMS.BLUE;
                let speedFactor = 0.5; 
                if(cell.mode === 2) { targetItem = ITEMS.RED; speedFactor = 0.25; }
                else if (cell.mode === 3) { targetItem = ITEMS.GOLD; speedFactor = 0.1; }
                
                cell.processing += speedMult * speedFactor;
                if(cell.processing >= state.tech.spawnRate) {
                    const rDir = Math.floor(Math.random() * 4);
                    spawnItem(targetItem, x, y, rDir);
                    cell.processing = 0;
                }
            }
            
            
            // Reactor Logic (splits GOLD into 1 RED + 2 BLUE)
            if(cell.type === 'reactor') {
                if(cell.buffer.gold > 0) {
                    // Reactors are intentionally late-game: moderate processing rate, still affected by buffs.
                    cell.processing += speedMult * 0.5;
                    if(cell.processing >= 60) {
                        cell.buffer.gold--;
                        // Output: 1 red forward, 2 blue on the opposing sides (left/right)
                        spawnItem(ITEMS.RED, x, y, cell.dir);
                        spawnItem(ITEMS.BLUE, x, y, (cell.dir + 1) % 4);
                        spawnItem(ITEMS.BLUE, x, y, (cell.dir + 3) % 4);
                        cell.processing = 0;
                        spawnParticles(x, y, '#facc15', 8);
                    }
                } else {
                    cell.processing = 0;
                }
            }


            // Hopper Logic
            if(cell.type === 'hopper') {
                for(let by = Math.max(0, y-1); by <= Math.min(state.height-1, y+1); by++) {
                    for(let bx = Math.max(0, x-1); bx <= Math.min(state.width-1, x+1); bx++) {
                        if(bx === x && by === y) continue;
                        const nCell = state.grid[by][bx];
                        if(nCell.type === 'empty' || nCell.type.startsWith('source')) {
                             const looseItem = state.items.find(it => it.x === bx && it.y === by && !it.targetCell && it.progress < 0.1);
                             if(looseItem) {
                                 looseItem.targetCell = { x: x, y: y }; // Suck into hopper
                                 looseItem.stuck = false;
                             }
                        }
                    }
                }
            }

            // Mixer Logic
            if(cell.type === 'mixer') {
                if(cell.buffer.red > 0 && cell.buffer.blue > 0) {
                    cell.processing += speedMult;
                    if(cell.processing >= 20) {
                        cell.buffer.red--; cell.buffer.blue--;
                        spawnItem(ITEMS.PURPLE, x, y, cell.dir);
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
        
        // Decay Logic
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

        const cellLevel = (cell.type === 'belt' || cell.type === 'bridge' || cell.type === 'hopper') ? cell.level : 1;
        const speed = 0.05 * state.tech.beltSpeed * dmBonus * (1 + (cellLevel-1)*0.1); 
        
        if(!item.targetCell) {
            let dx = 0, dy = 0;

            // Directional movers
            if(cell.type === 'belt' || cell.type === 'miner' || cell.type === 'mixer' || cell.type.startsWith('source') || cell.type === 'hopper') {
                item.moveDir = cell.dir;
                dx = DIRS[item.moveDir].x;
                dy = DIRS[item.moveDir].y;
            }
            // Non-directional bridge: continue in the same direction the item was already travelling
            else if (cell.type === 'bridge') {
                if(item.moveDir === null) item.moveDir = cell.dir; // safe fallback
                dx = DIRS[item.moveDir].x;
                dy = DIRS[item.moveDir].y;
            }
            // Splitter chooses an output direction (round-robin) and sets the item's travel direction.
            else if (cell.type === 'splitter') {
                const outputs = [(cell.dir + 3) % 4, cell.dir, (cell.dir + 1) % 4];
                let found = false;
                for(let k=0; k<3; k++) {
                    const idx = (cell.splitterIndex + k) % 3;
                    const tryDir = outputs[idx];
                    const tx = item.x + DIRS[tryDir].x;
                    const ty = item.y + DIRS[tryDir].y;
                    if(isValidMove(tx, ty, item)) {
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
                if(isValidMove(nextX, nextY, item)) {
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
                        // Reactor only accepts GOLD as input.
                        if(item.type === ITEMS.GOLD && nextCell.buffer.gold < 5) {
                            nextCell.buffer.gold++;
                            state.items.splice(i, 1);
                            continue;
                        }
                        item.stuck = true;
                        continue;
                    }
                    item.targetCell = { x: nextX, y: nextY };
                    item.stuck = false;
                } else {
                    item.stuck = true;
                }
            }
        }

        if(item.targetCell) {
            item.progress += speed;
            if(item.progress >= 1.0) {
                item.x = item.targetCell.x; item.y = item.targetCell.y;
                item.progress = 0; item.targetCell = null;
            }
        }
    }

    for(let i = state.particles.length - 1; i >= 0; i--) {
        if(!state.particles[i].update()) state.particles.splice(i, 1);
    }
    updateUI();
}

function isValidMove(tx, ty, item) {
    if(tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) return false;
    const target = state.grid[ty][tx];
    if(target.type === 'core') return true;
    if(target.type === 'miner' || target.type.startsWith('source')) return false;
    if(target.type === 'condenser') return false; 
    const itemAhead = state.items.find(it => it.x === tx && it.y === ty && it.progress < 0.5);
    if(itemAhead) return false;
    return true;
}

function spawnItem(typeObj, x, y, dir = -1) {
    if(dir !== -1) {
        const dx = DIRS[dir].x; const dy = DIRS[dir].y;
        const nx = x + dx; const ny = y + dy;
        if(isValidMove(nx, ny, {x:x, y:y})) {
            const existing = state.items.find(it => it.x === nx && it.y === ny && it.progress < 0.5);
            if(!existing) {
                const it = new Item(typeObj, x, y); 
                it.targetCell = { x: nx, y: ny }; 
                state.items.push(it);
            }
        }
    } else {
        const existing = state.items.find(it => it.x === x && it.y === y && it.progress < 0.2);
        if(!existing) state.items.push(new Item(typeObj, x, y));
    }
}

function consumeItem(item) {
    state.entropy += item.type.value;
    showFloatText(`+${formatValue(item.type.value)}`, item.x, item.y, item.type.color);
    spawnParticles(item.x, item.y, '#ffffff', 3);
}

function spawnParticles(gx, gy, color, count) {
    for(let i=0; i<count; i++) state.particles.push(new Particle(gx + 0.5, gy + 0.5, color));
}

// --- Interaction ---
function handleInteract(gx, gy) {
    if(gx < 0 || gx >= state.width || gy < 0 || gy >= state.height) return;
    const cell = state.grid[gy][gx];

    if(cell.type === 'core') {
        state.entropy++;
        showFloatText('+1', gx, gy, '#fff');
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
        if(cell.type !== 'empty' && cell.type !== 'core' && !cell.type.startsWith('source')) {
            cell.type = cell.sourceType ? (cell.sourceType === ITEMS.RED ? 'source_red' : (cell.sourceType === ITEMS.BLUE ? 'source_blue' : 'source_gold')) : 'empty';
            cell.level = 1;
            cell.contents = []; cell.buffer = {red:0, blue:0, gold:0};
            cell.mode = 1;
            closeInspector();
        }
        return;
    }

    const building = BUILDINGS[state.selectedTool.toUpperCase()];
    if(!building) return;

    if((cell.type === 'empty' || cell.type.startsWith('source'))) {
        if(state.entropy >= building.cost) {
            if(building.id === 'miner' && !cell.sourceType) { showNotification("Needs Ore!"); return; }
            state.entropy -= building.cost;
            const keptSource = cell.sourceType;
            cell.type = building.id;
            cell.sourceType = keptSource;
            cell.dir = 1; 
            spawnParticles(gx, gy, '#ffffff', 5);
        } else {
            showNotification("Not enough Entropy!");
        }
    } else if (cell.type === building.id) {
        cell.dir = (cell.dir + 1) % 4;
        if(state.selectedCell === cell) updateInspector();
    } else {
        openInspector(cell);
    }
}

function openInspector(cell) {
    state.selectedCell = cell;
    const panel = document.getElementById('inspector-panel');
    panel.classList.add('open');
    updateInspector();
}

function closeInspector() {
    state.selectedCell = null;
    document.getElementById('inspector-panel').classList.remove('open');
}

function updateInspector() {
    if(!state.selectedCell) return;
    const cell = state.selectedCell;
    const nameEl = document.getElementById('inspect-name');
    const statsEl = document.getElementById('inspect-stats');
    const costEl = document.getElementById('inspect-cost');
    const actionBtn = document.getElementById('inspect-action');
    const bDef = Object.values(BUILDINGS).find(b => b.id === cell.type);

    nameEl.innerText = `${bDef.name} Lv.${cell.level}`;
    
    let speedText = "";
    actionBtn.classList.add('hidden');
    
    if(cell.type === 'miner' || cell.type === 'mixer' || cell.type === 'belt') speedText = `Speed: ${(1 + (cell.level-1)*0.2).toFixed(1)}x`;
    if(cell.type === 'beacon') speedText = `Buff: +${(cell.level*20)}%`;
    if(cell.type === 'bridge') speedText = `Crossing (non-directional)`;
    if(cell.type === 'reactor') speedText = `Converts: 1 GOLD → 1 RED + 2 BLUE`;
    if(cell.type === 'hopper') speedText = `Range: 3x3`;
    if(cell.type === 'condenser') {
        const modeName = cell.mode === 1 ? 'BLUE' : (cell.mode === 2 ? 'RED' : 'GOLD');
        const modeColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : '#fbbf24');
        speedText = `Output: ${modeName}`;
        actionBtn.classList.remove('hidden');
        actionBtn.style.backgroundColor = modeColor;
        actionBtn.innerText = "CYCLE MODE";
        actionBtn.onclick = () => { cell.mode = (cell.mode % 3) + 1; updateInspector(); };
    }

    statsEl.innerText = speedText;
    const upgradeCost = Math.floor(bDef.cost * Math.pow(1.5, cell.level));
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
    document.getElementById('inspect-delete').onclick = () => { state.selectedTool = 'delete'; handleInteract(cell.x, cell.y); state.selectedTool = 'select'; buildToolbar(); };
}

// --- Draw ---
function draw() {
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const T = state.scale * CONFIG.TILE_SIZE;
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;
    
    ctx.lineWidth = 1; ctx.strokeStyle = CONFIG.COLORS.gridLine;
    for(let y=0; y<state.height; y++) {
        for(let x=0; x<state.width; x++) {
            const dx = OX + x * T; const dy = OY + y * T;
            ctx.strokeRect(dx, dy, T, T);
            const cell = state.grid[y][x];

            if(state.selectedCell === cell) {
                ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
                ctx.fillRect(dx, dy, T, T);
                ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
                ctx.strokeRect(dx, dy, T, T);
                ctx.lineWidth = 1; ctx.strokeStyle = CONFIG.COLORS.gridLine;
            }

            if(cell.sourceType || cell.type.startsWith('source')) {
                let color = 'rgba(255, 255, 255, 0.1)'; let solidColor = '#fff';
                if(cell.sourceType === ITEMS.RED) { color='rgba(255,85,85,0.2)'; solidColor=ITEMS.RED.color; }
                if(cell.sourceType === ITEMS.BLUE) { color='rgba(85,170,255,0.2)'; solidColor=ITEMS.BLUE.color; }
                if(cell.sourceType === ITEMS.GOLD) { color='rgba(251, 191, 36, 0.2)'; solidColor=ITEMS.GOLD.color; }
                ctx.fillStyle = color; ctx.fillRect(dx+2, dy+2, T-4, T-4);
                ctx.fillStyle = solidColor; ctx.fillRect(dx+T/2-4, dy+T/2-4, 8, 8);
            }

            if(cell.type !== 'empty' && !cell.type.startsWith('source')) {
                let c = CONFIG.COLORS[cell.type] || '#fff';
                ctx.fillStyle = c;
                
                if(cell.type !== 'core') {
                    if(cell.level > 1) { ctx.shadowColor = c; ctx.shadowBlur = cell.level * 3; }
                    ctx.fillRect(dx+2, dy+2, T-4, T-4);
                    ctx.shadowBlur = 0;

                    if(cell.type === 'belt') drawArrow(ctx, dx, dy, T, cell.dir, CONFIG.COLORS.beltArrow);
                    else if(cell.type === 'splitter') {
                         drawSmallArrow(ctx, dx, dy, T, (cell.dir+3)%4); drawSmallArrow(ctx, dx, dy, T, cell.dir); drawSmallArrow(ctx, dx, dy, T, (cell.dir+1)%4);
                    }
                    else if(cell.type === 'bridge') {
                         // Non-directional crossing tile
                         ctx.fillStyle="white"; 
                         ctx.textAlign='center'; 
                         ctx.textBaseline='middle'; 
                         ctx.font=`${T/2}px Arial`; 
                         ctx.fillText('+', dx+T/2, dy+T/2);
                    }
                    else if(cell.type === 'hopper') {
                         ctx.fillStyle="white"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${T/2}px Arial`; ctx.fillText('▼', dx+T/2, dy+T/2);
                         if(state.selectedCell === cell) {
                             ctx.strokeStyle = "rgba(16, 185, 129, 0.3)"; ctx.lineWidth = 1;
                             ctx.strokeRect(Math.round(dx-T)+0.5, Math.round(dy-T)+0.5, Math.round(T*3), Math.round(T*3));
                         }
                         drawSmallArrow(ctx, dx, dy, T, cell.dir);
                    }
                    else if(cell.type === 'beacon') {
                        ctx.fillStyle="white"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${T/2}px Arial`; ctx.fillText('✴', dx+T/2, dy+T/2);
                        if(state.selectedCell === cell) {
                            ctx.strokeStyle = CONFIG.COLORS.beacon; ctx.lineWidth = 1;
                            ctx.strokeRect(Math.round(dx-T)+0.5, Math.round(dy-T)+0.5, Math.round(T*3), Math.round(T*3)); // inner
                            ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
                            ctx.strokeRect(Math.round(dx-T*2)+0.5, Math.round(dy-T*2)+0.5, Math.round(T*5), Math.round(T*5)); // outer 5x5
                        }
                    }
                    else if(cell.type === 'reactor') {
                         ctx.fillStyle="white"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${T/2}px Arial`; 
                         ctx.fillText('☢', dx+T/2, dy+T/2);
                         drawSmallArrow(ctx, dx, dy, T, cell.dir);
                    }
                    else if(cell.type === 'condenser') {
                         ctx.fillStyle="white"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${T/2}px Arial`; ctx.fillText('◎', dx+T/2, dy+T/2);
                         const modeColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : '#fbbf24');
                         ctx.fillStyle = modeColor; ctx.beginPath(); ctx.arc(dx+T-6, dy+6, 3, 0, Math.PI*2); ctx.fill();
                    }
                    else {
                        const sym = cell.type === 'miner' ? '⚒' : '⚗';
                        ctx.fillStyle="white"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${T/2}px Arial`; ctx.fillText(sym, dx+T/2, dy+T/2);
                        drawSmallArrow(ctx, dx, dy, T, cell.dir);
                    }

                    if(cell.level > 1) { ctx.fillStyle = "white"; ctx.font = "10px monospace"; ctx.fillText(cell.level, dx+T-6, dy+10); }
                } else {
                    ctx.fillStyle = CONFIG.COLORS.core;
                    const pulse = Math.sin(Date.now()/200)*2;
                    ctx.fillRect(dx+2-pulse, dy+2-pulse, T-4+pulse*2, T-4+pulse*2);
                }
            }
        }
    }

    for(const item of state.items) {
        const dx = OX + item.x * T; const dy = OY + item.y * T;
        let tx = dx, ty = dy;
        if(item.targetCell) {
            tx = dx + (item.targetCell.x - item.x) * item.progress * T;
            ty = dy + (item.targetCell.y - item.y) * item.progress * T;
        }
        ctx.fillStyle = item.type.color;
        ctx.shadowColor = item.type.color; ctx.shadowBlur = 5;
        
        const cell = state.grid[item.y][item.x];
        if(cell.type === 'empty' || cell.type.startsWith('source')) {
             const alpha = 1 - (item.decay / 10);
             ctx.globalAlpha = Math.max(0.1, alpha);
        }

        ctx.beginPath(); ctx.arc(tx + T/2, ty + T/2, T/6, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;
    }

    for(const p of state.particles) {
        const px = OX + p.x * T; const py = OY + p.y * T;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(px, py, 4*state.scale, 4*state.scale); ctx.globalAlpha = 1.0;
    }
}

function drawArrow(c, x, y, size, dir, color) {
    c.fillStyle = color; c.save(); c.translate(x+size/2, y+size/2);
    c.rotate(dir*Math.PI/2);
    c.beginPath(); c.moveTo(-size/4, size/4); c.lineTo(0, -size/4); c.lineTo(size/4, size/4); c.fill();
    c.restore();
}

function drawSmallArrow(c, x, y, size, dir) {
    c.fillStyle = "rgba(0,0,0,0.5)"; c.save(); c.translate(x+size/2, y+size/2);
    c.rotate(dir*Math.PI/2); c.translate(0, -size/3);
    c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, -3); c.lineTo(3, 0); c.fill();
    c.restore();
}

function buildToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';
    
    const selBtn = document.createElement('button');
    selBtn.className = `tool-btn flex-shrink-0 w-16 h-16 bg-blue-900/20 rounded-lg border-2 border-blue-600 flex flex-col items-center justify-center ${state.selectedTool==='select'?'active':''}`;
    selBtn.onclick = () => { state.selectedTool = 'select'; closeInspector(); buildToolbar(); };
    selBtn.innerHTML = `<div class="text-2xl mb-1 text-blue-400">↖️</div><div class="text-[10px] font-bold text-gray-300">Select</div>`;
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
    delBtn.innerHTML = `<div class="text-2xl mb-1 text-red-500">✕</div><div class="text-[10px] font-bold text-gray-300">Remove</div>`;
    toolbar.appendChild(delBtn);
}

function updateUI() {
    document.getElementById('score-display').innerText = Math.floor(state.entropy);
    document.getElementById('dm-display').innerText = `Dark Matter: ${state.darkMatter} (+${Math.round(state.darkMatter*10)}%)`;
    const singBtn = document.getElementById('singularity-btn');
    if(state.entropy >= CONFIG.PRESTIGE_THRESHOLD) {
        singBtn.classList.remove('hidden'); singBtn.classList.add('singularity-ready');
    } else {
        singBtn.classList.add('hidden'); singBtn.classList.remove('singularity-ready');
    }
}

function showNotification(msg) {
    const el = document.getElementById('notification-area');
    el.innerHTML = `<div class="inline-block bg-red-500/80 text-white px-3 py-1 rounded shadow-lg text-sm font-bold shake">${msg}</div>`;
    setTimeout(() => el.innerHTML = '', 2000);
}

function showFloatText(text, gx, gy, color) {
    const el = document.createElement('div');
    el.className = 'float-text'; el.style.color = color; el.innerText = text;
    const T = state.scale * CONFIG.TILE_SIZE;
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;
    el.style.left = (OX + gx * T + T/2) + 'px';
    el.style.top = (OY + gy * T) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function setupEventListeners() {
    const resetInteraction = () => {
        state.isDragging = false;
        state.lastInteraction = { x: -1, y: -1 };
    };

    canvas.addEventListener('mousedown', e => { state.isDragging = true; handleInput(e.clientX, e.clientY); });
    canvas.addEventListener('mousemove', e => { if(state.isDragging) handleInput(e.clientX, e.clientY); });
    window.addEventListener('mouseup', resetInteraction);
    
    canvas.addEventListener('touchstart', e => { e.preventDefault(); state.isDragging = true; handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    canvas.addEventListener('touchmove', e => { e.preventDefault(); if(state.isDragging) handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    window.addEventListener('touchend', resetInteraction);
    window.addEventListener('touchcancel', resetInteraction);

    window.addEventListener('resize', resizeCanvas);

    document.getElementById('tech-btn').onclick = openTechTree;
    document.getElementById('close-tech').onclick = () => document.getElementById('tech-modal').classList.add('hidden');
    document.getElementById('help-btn').onclick = () => document.getElementById('help-modal').classList.remove('hidden');
    document.getElementById('close-help').onclick = () => document.getElementById('help-modal').classList.add('hidden');
    document.getElementById('inspect-close').onclick = closeInspector;
    
    const singModal = document.getElementById('singularity-modal');
    document.getElementById('singularity-btn').onclick = () => {
        const gain = Math.floor(state.entropy / 1000);
        document.getElementById('prestige-gain').innerText = gain;
        singModal.classList.remove('hidden');
    };
    document.getElementById('cancel-singularity').onclick = () => singModal.classList.add('hidden');
    document.getElementById('confirm-singularity').onclick = () => {
        const gain = Math.floor(state.entropy / 1000);
        state.darkMatter += gain;
        singModal.classList.add('hidden');
        initGame(true);
        showNotification("UNIVERSE RESET.");
    };
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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const minDim = Math.min(canvas.width, canvas.height);
    state.scale = (minDim * 0.9) / (state.width * CONFIG.TILE_SIZE) || 1;
}

function openTechTree() {
    const list = document.getElementById('tech-list');
    list.innerHTML = '';
    currentTechTree.forEach(tech => {
        const div = document.createElement('div');
        div.className = "bg-gray-700 p-3 rounded flex justify-between items-center";
        const canAfford = state.entropy >= tech.cost;
        div.innerHTML = `<div><div class="font-bold text-white">${tech.name}</div><div class="text-xs text-gray-400">${tech.desc}</div></div><button class="px-3 py-1 rounded text-sm font-bold ${canAfford ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">$${tech.cost}</button>`;
        if(canAfford) {
            div.querySelector('button').onclick = () => {
                if(state.entropy >= tech.cost) {
                    state.entropy -= tech.cost;
                    if(tech.oneTime) {
                        tech.effect(state);
                        tech.cost = 999999999; div.remove(); 
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

function gameLoop() {
    try {
        const now = Date.now();
        update((now - state.lastTick) / 1000);
        draw();
        state.lastTick = now;
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error(e);
    }
}

window.onload = function() {
    initGame(true);
    state.lastTick = Date.now();
    gameLoop();
};