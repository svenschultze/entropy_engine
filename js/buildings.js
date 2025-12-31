import { CONFIG } from './config.js';

export const BUILDINGS = {
    BELT: { id: 'belt', name: 'Belt', cost: 10, color: CONFIG.COLORS.belt, symbol: '➜', locked: false },
    PHASE_BELT: { id: 'phase_belt', name: 'Phase Belt', cost: 2000, color: CONFIG.COLORS.phase_belt, symbol: 'Φ', locked: true },
    MINER: { id: 'miner', name: 'Miner', cost: 50, color: CONFIG.COLORS.miner, symbol: '⚒', locked: false },
    SPLITTER: { id: 'splitter', name: 'Splitter', cost: 100, color: CONFIG.COLORS.splitter, symbol: '⑂', locked: true },
    BRIDGE: { id: 'bridge', name: 'Bridge', cost: 300, color: CONFIG.COLORS.bridge, symbol: '+', locked: true },
    REACTOR: { id: 'reactor', name: 'Reactor', cost: 100000, color: '#facc15', symbol: '☢', locked: true },
    MIXER: { id: 'mixer', name: 'Mixer', cost: 200, color: CONFIG.COLORS.mixer, symbol: '⚗', locked: true },
    HOPPER: { id: 'hopper', name: 'Hopper', cost: 1000, color: CONFIG.COLORS.hopper, symbol: '▼', locked: true },
    BEACON: { id: 'beacon', name: 'Beacon', cost: 5000, color: CONFIG.COLORS.beacon, symbol: '✴', locked: true },
    CONDENSER: { id: 'condenser', name: 'Condenser', cost: 20000, color: CONFIG.COLORS.condenser, symbol: '◎', locked: true },
    TELEPORTER: { id: 'teleporter', name: 'Teleporter', cost: 15000, color: CONFIG.COLORS.teleporter, symbol: '◉', locked: true }
};
