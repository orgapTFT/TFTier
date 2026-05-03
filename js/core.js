/* core.js */
window.ITEM_LIST = ['⚔️','🛡️','🏹','🔥','❄️','🌩️','💎','🧪','👑'];
window.currentDragSource = null;

// プロジェクト設定
window.undoStack = []; 
window.redoStack = []; 

// アイテムスロット作成（共通関数）
window.addItemSlot = function(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    slot.draggable = true;

    // 右クリックで解除
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
            // 盤面の全hexから自分がどこにいたか記録（builder.jsの判定で使う）
            fromHexIndex: Array.from(document.querySelectorAll('.hex')).indexOf(parentHex)
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        // ドラッグ中に元の場所を薄くする（CSSで定義が必要）
        setTimeout(() => slot.classList.add('dragging-hidden'), 10);
    });

    container.appendChild(slot);
};