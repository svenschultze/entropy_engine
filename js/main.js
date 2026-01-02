import { startGame, loadGame, saveGame, resumeGame } from './game.js';

window.onerror = function(msg, url, line, col, error) {
    document.getElementById('error-log').style.display = 'block';
    document.getElementById('error-log').innerText = `CRASH: ${msg}\nLine: ${line}`;
};

window.addEventListener('load', () => {
    if(loadGame()) { resumeGame(); } else { startGame(); }
});

window.addEventListener('beforeunload', () => {
    saveGame();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}

