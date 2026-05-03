/* core.js */
// どこからでも見えるように window をつける
window.ITEM_LIST = ['⚔️','🛡️','🏹','🔥','❄️','🌩️','💎','🧪','👑'];
window.currentDragSource = null;

const VERSION = "2.2";
window.undoStack = []; // ← ここが以前「,」になっていたので修正
window.redoStack = []; 
window.hasChanges = false; 

// アイテム追加
window.addItemSlot = function(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    slot.draggable = true; // アイ体単体での移動を許可

    // 右クリック解除
    slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        slot.remove();
    });

    // アイテム単体のドラッグ開始
    slot.addEventListener('dragstart', e => {
        const parentHex = slot.closest('.hex');
        const data = {
            type: 'item',
            icon: icon,
            fromHexIndex: Array.from(document.querySelectorAll('.hex')).indexOf(parentHex),
            slotElement: slot.outerHTML // スワップ用に自分の情報を保持
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        // ドラッグ開始したら、一旦元のスロットを非表示（ドロップ成功で削除、失敗で復活させるため）
        setTimeout(() => slot.classList.add('dragging-hidden'), 10);
    });

    container.appendChild(slot);
};