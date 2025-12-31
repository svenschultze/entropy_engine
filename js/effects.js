import { state } from './state.js';
import { Particle } from './classes.js';

export function spawnParticles(gx, gy, color, count) {
    for(let i = 0; i < count; i++) {
        state.particles.push(new Particle(gx + 0.5, gy + 0.5, color));
    }
}
