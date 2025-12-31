import { CONFIG } from './config.js';

export const state = {
    entropy: 100,
    totalEntropy: 100,
    entropyPrev: 100,
    entropyGained: 0,
    entropyEarned: 0,
    entropyEarnedTime: 0,
    entropyPerSecond: 0,
    darkMatter: 0,
    grid: [],
    items: [],
    particles: [],
    width: CONFIG.GRID_SIZE,
    height: CONFIG.GRID_SIZE,
    selectedTool: 'select',
    lastTick: 0,
    scale: 1,
    tech: { beltSpeed: 1, minerSpeed: 1, spawnRate: 50, reactorDarkMatterChance: 0.001 },
    lastInteraction: { x: -1, y: -1 },
    isDragging: false,
    selectedCell: null,
    currentTechTree: [],
    techCompleted: new Set()
};

export function addEntropy(amount) {
    state.entropy += amount;
    state.totalEntropy += amount;
    state.entropyGained += amount;
}
