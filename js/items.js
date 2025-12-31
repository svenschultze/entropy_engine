import { CONFIG } from './config.js';

export const ITEMS = {
    RED: { id: 0, color: CONFIG.COLORS.itemRed, value: 3 },
    BLUE: { id: 1, color: CONFIG.COLORS.itemBlue, value: 1.5 },
    GOLD: { id: 3, color: CONFIG.COLORS.itemGold, value: 50 },
    PURPLE: { id: 2, color: CONFIG.COLORS.itemPurple, value: 8 },
    GREEN: { id: 4, color: CONFIG.COLORS.itemGreen, value: 6 },
    DARK_MATTER: { id: 5, color: CONFIG.COLORS.itemDarkMatter, value: 0 }
};

export const BASE_ITEM_VALUES = {
    RED: 3,
    BLUE: 1.5,
    GREEN: 6
};

export function recomputeGoldValue() {
    ITEMS.GOLD.value = ITEMS.PURPLE.value * ITEMS.GREEN.value;
}

export function recomputePurpleValue() {
    // Purple is always derived from current red/blue values
    ITEMS.PURPLE.value = (ITEMS.RED.value + ITEMS.BLUE.value) * 3;
    recomputeGoldValue();
}

export function formatValue(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

recomputePurpleValue();
