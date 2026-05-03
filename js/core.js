/* core.js */
/* core.js */
window.ITEM_LIST = ['⚔️','🛡️','🏹','🔥','❄️','🌩️','💎','🧪','👑'];
window.currentDragSource = null; // スワップ時に「どこから動かしたか」を保存する用

// プロジェクト管理用
const VERSION = "2.2";
window.undoStack = []; // 以前のコードの「,」を「;」に修正
window.redoStack = []; 
window.hasChanges = false; 

// 共通関数
window.addItemSlot = function(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    container.appendChild(slot);
};


const rows = [7, 7, 7, 7];
const builderState = [];
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
let curPalette = 'c';
const items = (window.itemFiles || []).map(name => `../img/item/${name}`);

const VERSION = "2.2";
let project = { version: VERSION, assets: { c: [], i: [], a: [], g: [] }, guides: [], activeIndex: 0 };
let selSlot = null; 
let undoStack = []; // カンマをセミコロンに修正
let redoStack = []; 
let hasChanges = false; 
let nextAutoSave = 60; 

// --- 共通ロジック ---
function saveHistory() {
    undoStack.push(JSON.stringify(project));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}

function markChanged() {
    hasChanges = true;
    if (typeof updateTabData === 'function') updateTabData();
}

// 共通パーツ生成
function addItemSlot(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    container.appendChild(slot);
}