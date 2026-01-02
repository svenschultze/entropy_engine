import { state } from './state.js';
import { CONFIG } from './config.js';
import { ITEMS } from './items.js';
import { canvas, ctx } from './dom.js';

export function resizeCanvas() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const topBar = document.getElementById('top-bar');
    const bottomBar = document.getElementById('bottom-bar');
    const topH = topBar ? topBar.getBoundingClientRect().height : 0;
    const bottomH = bottomBar ? bottomBar.getBoundingClientRect().height : 0;
    const container = document.getElementById('game-container');
    const containerW = container ? container.clientWidth : vw;

    document.documentElement.style.setProperty('--ui-top-height', `${topH}px`);
    document.documentElement.style.setProperty('--ui-bottom-height', `${bottomH}px`);

    canvas.width = containerW;
    canvas.height = Math.max(0, vh - topH - bottomH);
    const usableHeight = Math.max(0, vh - topH - bottomH);
    const minDim = Math.min(canvas.width, usableHeight);
    state.scale = (minDim * 0.9) / (state.width * CONFIG.TILE_SIZE) || 1;
}

export function draw() {
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const T = state.scale * CONFIG.TILE_SIZE;
    const OX = (canvas.width - state.width * T) / 2;
    const OY = (canvas.height - state.height * T) / 2;

    let coreMinX = Infinity, coreMinY = Infinity, coreMaxX = -Infinity, coreMaxY = -Infinity;

    ctx.lineWidth = 1;
    ctx.strokeStyle = CONFIG.COLORS.gridLine;
    for(let y = 0; y < state.height; y++) {
        for(let x = 0; x < state.width; x++) {
            const dx = OX + x * T;
            const dy = OY + y * T;
            ctx.strokeRect(dx, dy, T, T);
            const cell = state.grid[y][x];

            if(cell.type === 'core') {
                coreMinX = Math.min(coreMinX, x);
                coreMinY = Math.min(coreMinY, y);
                coreMaxX = Math.max(coreMaxX, x);
                coreMaxY = Math.max(coreMaxY, y);
            }

            if(state.selectedCell === cell) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
                ctx.fillRect(dx, dy, T, T);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.strokeRect(dx, dy, T, T);
                ctx.lineWidth = 1;
                ctx.strokeStyle = CONFIG.COLORS.gridLine;
            }

            if(cell.sourceType || cell.type.startsWith('source')) {
                let color = 'rgba(255, 255, 255, 0.1)';
                let solidColor = '#fff';
                if(cell.sourceType === ITEMS.RED) { color = 'rgba(255,85,85,0.2)'; solidColor = ITEMS.RED.color; }
                if(cell.sourceType === ITEMS.BLUE) { color = 'rgba(85,170,255,0.2)'; solidColor = ITEMS.BLUE.color; }
                if(cell.sourceType === ITEMS.GOLD) { color = 'rgba(251, 191, 36, 0.2)'; solidColor = ITEMS.GOLD.color; }
                if(cell.sourceType === ITEMS.GREEN) { color = 'rgba(34, 197, 94, 0.2)'; solidColor = ITEMS.GREEN.color; }
                if(cell.sourceType === ITEMS.PURPLE) { color = 'rgba(216, 132, 255, 0.2)'; solidColor = ITEMS.PURPLE.color; }
                ctx.fillStyle = color;
                ctx.fillRect(dx + 2, dy + 2, T - 4, T - 4);
                ctx.fillStyle = solidColor;
                ctx.fillRect(dx + T/2 - 4, dy + T/2 - 4, 8, 8);
            }

            if(cell.type !== 'empty' && !cell.type.startsWith('source') && cell.type !== 'core') {
                let c = CONFIG.COLORS[cell.type] || '#fff';
                if((cell.type === 'miner' && cell.sourceType) || cell.type === 'condenser') {
                    if(cell.type === 'condenser') {
                        c = cell.mode === 1 ? ITEMS.BLUE.color : (cell.mode === 2 ? ITEMS.RED.color : ITEMS.GREEN.color);
                    } else {
                        c = cell.sourceType.color;
                    }
                }
                ctx.fillStyle = c;

                if(cell.type === 'phase_belt') {
                    ctx.fillStyle = CONFIG.COLORS.belt;
                }
                if(cell.level > 1) { ctx.shadowColor = c; ctx.shadowBlur = cell.level * 3; }
                ctx.fillRect(dx + 2, dy + 2, T - 4, T - 4);
                ctx.shadowBlur = 0;

                if(cell.type === 'belt') drawArrow(ctx, dx, dy, T, cell.dir, CONFIG.COLORS.beltArrow);
                else if(cell.type === 'phase_belt') drawArrow(ctx, dx, dy, T, cell.dir, CONFIG.COLORS.phase_belt);
                else if(cell.type === 'splitter') {
                    drawSmallArrow(ctx, dx, dy, T, (cell.dir + 3) % 4);
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                    drawSmallArrow(ctx, dx, dy, T, (cell.dir + 1) % 4);
                }
                else if(cell.type === 'bridge') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('+', dx + T/2, dy + T/2);
                }
                else if(cell.type === 'hopper') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('▼', dx + T/2, dy + T/2);
                    if(state.selectedCell === cell) {
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(Math.round(dx - T) + 0.5, Math.round(dy - T) + 0.5, Math.round(T * 3), Math.round(T * 3));
                    }
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                }
                else if(cell.type === 'beacon') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('✴', dx + T/2, dy + T/2);
                    if(state.selectedCell === cell) {
                        ctx.strokeStyle = CONFIG.COLORS.beacon;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(Math.round(dx - T) + 0.5, Math.round(dy - T) + 0.5, Math.round(T * 3), Math.round(T * 3));
                        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
                        ctx.strokeRect(Math.round(dx - T * 2) + 0.5, Math.round(dy - T * 2) + 0.5, Math.round(T * 5), Math.round(T * 5));
                    }
                }
                else if(cell.type === 'reactor') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('☢', dx + T/2, dy + T/2);
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                }
                else if(cell.type === 'condenser') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('◎', dx + T/2, dy + T/2);
                    const modeColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : '#22c55e');
                    ctx.fillStyle = modeColor;
                    ctx.beginPath();
                    ctx.arc(dx + T - 6, dy + 6, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                else if(cell.type === 'teleporter') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('◉', dx + T/2, dy + T/2);
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                    ctx.fillStyle = '#c4b5fd';
                    ctx.font = '10px monospace';
                    ctx.fillText(cell.channel, dx + T - 8, dy + 10);
                }
                else if(cell.type === 'dm_source') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('◈', dx + T/2, dy + T/2);
                    const modeColor = cell.mode === 1 ? '#55aaff' : (cell.mode === 2 ? '#ff5555' : (cell.mode === 3 ? '#22c55e' : '#d884ff'));
                    ctx.fillStyle = modeColor;
                    ctx.beginPath();
                    ctx.arc(dx + T - 6, dy + 6, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                else if(cell.type === 'extractor') {
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText('⌬', dx + T/2, dy + T/2);
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                }
                else {
                    const sym = cell.type === 'miner'
                        ? '⚒'
                        : (cell.type === 'mixer' ? '⇄' : (cell.type === 'core_fragment' ? '◇' : '⚗'));
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${T/2}px Arial`;
                    ctx.fillText(sym, dx + T/2, dy + T/2);
                    drawSmallArrow(ctx, dx, dy, T, cell.dir);
                }

                if(cell.level > 1) {
                    ctx.fillStyle = 'white';
                    ctx.font = '10px monospace';
                    ctx.fillText(cell.level, dx + T - 6, dy + 10);
                }
            }
        }
    }

    if(coreMaxX >= coreMinX && coreMaxY >= coreMinY) {
        ctx.fillStyle = CONFIG.COLORS.core;
        const coreX = OX + coreMinX * T;
        const coreY = OY + coreMinY * T;
        const coreW = (coreMaxX - coreMinX + 1) * T;
        const coreH = (coreMaxY - coreMinY + 1) * T;
        ctx.fillRect(coreX, coreY, coreW, coreH);
    }

    for(const item of state.items) {
        const dx = OX + item.x * T;
        const dy = OY + item.y * T;
        let tx = dx;
        let ty = dy;
        if(item.targetCell) {
            tx = dx + (item.targetCell.x - item.x) * item.progress * T;
            ty = dy + (item.targetCell.y - item.y) * item.progress * T;
        }
        ctx.fillStyle = item.type.color;
        ctx.shadowColor = item.type.color;
        ctx.shadowBlur = 5;

        const cell = state.grid[item.y][item.x];
        if(cell.type === 'phase_belt') {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.globalAlpha = 0.3 + pulse * 0.7;
        } else if(cell.type === 'empty' || cell.type.startsWith('source')) {
            const alpha = 1 - (item.decay / 10);
            ctx.globalAlpha = Math.max(0.1, alpha);
        }

        ctx.beginPath();
        ctx.arc(tx + T/2, ty + T/2, T/6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }

    for(const p of state.particles) {
        const px = OX + p.x * T;
        const py = OY + p.y * T;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(px, py, 4 * state.scale, 4 * state.scale);
        ctx.globalAlpha = 1.0;
    }
}

function drawArrow(c, x, y, size, dir, color) {
    c.fillStyle = color;
    c.save();
    c.translate(x + size/2, y + size/2);
    c.rotate(dir * Math.PI / 2);
    c.beginPath();
    c.moveTo(-size/4, size/4);
    c.lineTo(0, -size/4);
    c.lineTo(size/4, size/4);
    c.fill();
    c.restore();
}

function drawSmallArrow(c, x, y, size, dir) {
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.save();
    c.translate(x + size/2, y + size/2);
    c.rotate(dir * Math.PI / 2);
    c.translate(0, -size/3);
    c.beginPath();
    c.moveTo(-3, 0);
    c.lineTo(0, -3);
    c.lineTo(3, 0);
    c.fill();
    c.restore();
}
