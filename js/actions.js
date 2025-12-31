import { ITEMS } from './items.js';

export function removeBuildingAt(cell) {
    if(cell.type !== 'empty' && cell.type !== 'core' && !cell.type.startsWith('source')) {
        cell.type = cell.sourceType
            ? (cell.sourceType === ITEMS.RED ? 'source_red' : (cell.sourceType === ITEMS.BLUE ? 'source_blue' : 'source_gold'))
            : 'empty';
        cell.level = 1;
        cell.contents = [];
        cell.buffer = { red: 0, blue: 0, green: 0, purple: 0 };
        cell.mode = 1;
        cell.channel = 1;
        cell.fuelMultiplier = 1;
        cell.fuelTimer = 0;
        cell.fuelQueue = [];
    }
}
