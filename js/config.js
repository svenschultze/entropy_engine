export const CONFIG = {
    GRID_SIZE: 12,
    TILE_SIZE: 48,
    PRESTIGE_THRESHOLD: 10000,
    TELEPORTER_CHANNELS: 4,
    COLORS: {
        grid: '#1a1a20', gridLine: '#2a2a35',
        belt: '#3b3b45', beltArrow: '#606070',
        phase_belt: '#22d3ee', teleporter: '#8b5cf6',
        core: '#ffffff', miner: '#ef4444',
        splitter: '#eab308', mixer: '#a855f7',
        beacon: '#06b6d4', condenser: '#14b8a6', reactor: '#facc15',
        bridge: '#f97316', hopper: '#10b981',
        itemRed: '#ff5555', itemBlue: '#55aaff',
        itemGold: '#fbbf24', itemPurple: '#d884ff',
        itemGreen: '#22c55e', itemDarkMatter: '#7c3aed'
    }
};

export const DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
];
