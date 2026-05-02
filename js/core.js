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
let selSlot = null;    // 選択中のスロット
let undoStack = [], 
let redoStack = []; 
let hasChanges = false; 
let nextAutoSave = 60; // 自動保存のタイマー

// --- 共通ロジック ---
function saveHistory() {
    undoStack.push(JSON.stringify(project));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}

function markChanged() {
    hasChanges = true;
    updateTabData();
}