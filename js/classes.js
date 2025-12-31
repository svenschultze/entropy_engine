export class Cell {
    constructor(x, y, type = 'empty') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.dir = 1;
        this.contents = [];
        this.processing = 0;
        this.buffer = { red: 0, blue: 0, green: 0, purple: 0 };
        this.sourceType = null;
        this.splitterIndex = 0;
        this.level = 1;
        this.mode = 1;
        this.channel = 1;
        this.fuelMultiplier = 1;
        this.fuelTimer = 0;
        this.fuelQueue = [];
    }
}

export class Item {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.progress = 0.0;
        this.targetCell = null;
        this.moveDir = null;
        this.stuck = false;
        this.decay = 0;
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
        return this.life > 0;
    }
}
