/* core.js */
// どこからでも見えるように window をつける
window.ITEM_LIST = ['⚔️','🛡️','🏹','🔥','❄️','🌩️','💎','🧪','👑'];
window.currentDragSource = null;

const VERSION = "2.2";
window.undoStack = []; // ← ここが以前「,」になっていたので修正
window.redoStack = []; 
window.hasChanges = false; 

// アイテムを追加する関数も window に入れる
window.addItemSlot = function(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    container.appendChild(slot);
};