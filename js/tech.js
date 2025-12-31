import { BUILDINGS } from './buildings.js';
import { ITEMS, recomputePurpleValue, recomputeGoldValue } from './items.js';
import { addEntropy } from './state.js';

export function getTechTree(buildToolbar) {
    return [
        {
            id: 'logistics', name: 'Logistics I', cost: 200,
            desc: 'Unlocks Splitters.', oneTime: true, prereq: [],
            effect: () => { BUILDINGS.SPLITTER.locked = false; buildToolbar(); }
        },
        {
            id: 'logistics2', name: 'Logistics II', cost: 1000,
            desc: 'Unlocks Bridges (Non-directional crossing tile).', oneTime: true, prereq: ['logistics'],
            effect: () => { BUILDINGS.BRIDGE.locked = false; buildToolbar(); }
        },
        {
            id: 'chemistry', name: 'Chemistry I', cost: 500,
            desc: 'Unlocks Mixers.', oneTime: true, prereq: [],
            effect: () => { BUILDINGS.MIXER.locked = false; buildToolbar(); }
        },
        {
            id: 'logistics3', name: 'Logistics III', cost: 3000,
            desc: 'Unlocks Hoppers (Collects loose items).', oneTime: true, prereq: ['logistics2'],
            effect: () => { BUILDINGS.HOPPER.locked = false; buildToolbar(); }
        },
        {
            id: 'logistics4', name: 'Logistics IV', cost: 10000,
            desc: 'Unlocks Phase Belts (items can pass through each other).', oneTime: true, prereq: ['logistics3'],
            effect: () => { BUILDINGS.PHASE_BELT.locked = false; buildToolbar(); }
        },
        {
            id: 'logistics5', name: 'Logistics V', cost: 30000,
            desc: 'Unlocks Teleporters (channel-based transport).', oneTime: true, prereq: ['logistics4'],
            effect: () => { BUILDINGS.TELEPORTER.locked = false; buildToolbar(); }
        },
        {
            id: 'overclock', name: 'Overclocking', cost: 2500,
            desc: 'Unlocks Beacons.', oneTime: true, prereq: [],
            effect: () => { BUILDINGS.BEACON.locked = false; buildToolbar(); }
        },
        {
            id: 'matter_gen', name: 'Matter Gen', cost: 10000,
            desc: 'Unlocks Condensers.', oneTime: true, prereq: ['chemistry'],
            effect: () => { BUILDINGS.CONDENSER.locked = false; buildToolbar(); }
        },
        {
            id: 'reactor_unlock', name: 'Nuclear Synthesis', cost: 50000,
            desc: 'Unlocks Reactors (1 GREEN + 1 PURPLE ? 1 GOLD).', oneTime: true, prereq: ['matter_gen'],
            effect: () => { BUILDINGS.REACTOR.locked = false; buildToolbar(); }
        },

        // --- Infinite value research (late game scaling) ---
        {
            id: 'entropy_red', name: 'Red Entropy Amplification', cost: 5000,
            desc: 'Increases Red fuel entropy gain by 1.1 (stackable).', oneTime: false, scale: 1.4, prereq: [],
            effect: () => { ITEMS.RED.value *= 1.1; recomputePurpleValue(); }
        },
        {
            id: 'entropy_blue', name: 'Blue Entropy Amplification', cost: 5000,
            desc: 'Increases Blue fuel entropy gain by 1.1 (stackable).', oneTime: false, scale: 1.4, prereq: [],
            effect: () => { ITEMS.BLUE.value *= 1.1; recomputePurpleValue(); }
        },
        {
            id: 'green_price', name: 'Green Fuel Refinement', cost: 8000,
            desc: 'Increases Green fuel entropy gain by 1.1 (stackable).', oneTime: false, scale: 1.4, prereq: [],
            effect: () => { ITEMS.GREEN.value *= 1.1; recomputeGoldValue(); }
        },

        {
            id: 'speed_inf', name: 'Belt Efficiency', cost: 150,
            desc: '+5% Global Belt Speed.', oneTime: false, scale: 1.25, prereq: [],
            effect: (s) => { s.tech.beltSpeed *= 1.05; }
        },
        {
            id: 'mine_inf', name: 'Drill Efficiency', cost: 300,
            desc: '+5% Global Mining & Condenser Speed.', oneTime: false, scale: 1.25, prereq: [],
            effect: (s) => { s.tech.minerSpeed *= 1.05; }
        },
        {
            id: 'quantum_fluctuation', name: 'Quantum Fluctuation', cost: 20000,
            desc: 'Reactors have a small chance to output Dark Matter (+0.1% each upgrade).', oneTime: false, scale: 2.0, prereq: ['reactor_unlock'],
            effect: (s) => { s.tech.reactorDarkMatterChance += 0.001; }
        },
        {
            id: 'cheat_entropy',
            name: 'Entropy Injection (Cheat)',
            cost: 0,
            desc: 'Immediately grants 100,000 Entropy. Repeatable.',
            oneTime: false,
            scale: 1,
            effect: () => { addEntropy(100000); }
        }
    ];
}


