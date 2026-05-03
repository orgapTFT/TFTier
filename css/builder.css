/* builder.js */

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    board.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        // ドラッグオーバー時の視覚効果[cite: 4, 8]
        hex.addEventListener('dragover', e => { 
            e.preventDefault(); 
            hex.classList.add('dragover'); 
        });
        hex.addEventListener('dragleave', () => hex.classList.remove('dragover'));
        hex.addEventListener('drop', e => handleDrop(e, hex));
        board.appendChild(hex);
    }
}

function addDragToChampion(champ) {
    champ.addEventListener('dragstart', e => {
        const parentHex = champ.parentElement;
        window.currentDragSource = parentHex; // 移動元のマスを保持
        
        // アイテムと星の情報を抽出[cite: 4, 5]
        const itemIcons = Array.from(parentHex.querySelectorAll('.item-slot')).map(s => s.textContent);

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: champ.dataset.stars || "1",
            items: itemIcons
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        // ドラッグ中に元の表示を隠す
        setTimeout(() => {
            if(champ) champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        document.querySelectorAll('.dragging-hidden').forEach(el => el.classList.remove('dragging-hidden'));
    });
}

function placeChampion(container, data) {
    if (!container || !data) return;
    container.innerHTML = ''; // マスをリセット

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    const sCount = parseInt(data.stars) || 1;
    champ.dataset.stars = sCount; 
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`; // アイコン設定[cite: 4]

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    
    // アイテムスロットの復元[cite: 4, 5]
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(iconText => {
            if (typeof window.addItemSlot === 'function') {
                window.addItemSlot(itemsDiv, iconText);
            }
        });
    }

    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = sCount > 1 ? '★'.repeat(sCount - 1) : '';

    // 星の数変更[cite: 4]
    starLabel.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel); 

    addDragToChampion(champ); // ドラッグ機能再付与[cite: 4]
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) {
            // ベンチからのテキストドロップ対応[cite: 4]
            const plainIcon = e.dataTransfer.getData('text/plain');
            if (plainIcon && plainIcon.length < 4) {
                placeChampion(hex, { icon: plainIcon, stars: 1, items: [] });
            }
            return;
        }

        const dragData = JSON.parse(rawData);

        // チャンピオンの移動・スワップ[cite: 4]
        if (dragData.type === 'champ') {
            const source = window.currentDragSource;
            if (!source || source === hex) return;

            const targetChamp = hex.querySelector('.champ');

            if (targetChamp) {
                // 【スワップ】ダミー変数にBを退避[cite: 4]
                const dummyB = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,
                    stars: targetChamp.dataset.stars || 1,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent)
                };

                // 両方のマスを一度クリアして衝突を防ぐ[cite: 4]
                source.innerHTML = '';
                hex.innerHTML = '';

                placeChampion(source, dummyB); // 元の場所にBを置く[cite: 4]
                placeChampion(hex, dragData);  // 新しい場所にAを置く[cite: 4]
            } else {
                // 【通常移動】
                source.innerHTML = '';
                placeChampion(hex, dragData);
            }
            window.currentDragSource = null;
        } 
        // アイテムのドロップ[cite: 4, 5]
        else if (dragData.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                itemsDiv.className = 'items-container';
                if (!hex.contains(itemsDiv)) hex.appendChild(itemsDiv);

                if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                    // 盤面内移動なら元のアイテムを消す[cite: 5]
                    if (dragData.fromHexIndex !== undefined) {
                        const fromHex = document.querySelectorAll('.hex')[dragData.fromHexIndex];
                        const dragItem = fromHex?.querySelector('.item-slot.dragging-hidden');
                        if (dragItem) dragItem.remove();
                    }
                    window.addItemSlot(itemsDiv, dragData.icon);
                }
            }
        }
    } catch (err) {
        console.error("Drop Error:", err);
    }
}

function init() {
    createBoard(); // ボード作成[cite: 4]
    
    // アイテムパレット初期化[cite: 4, 5]
    const itemsArea = document.getElementById('items');
    if (itemsArea && typeof ITEM_LIST !== 'undefined') {
        itemsArea.innerHTML = '';
        ITEM_LIST.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'item';
            item.textContent = icon;
            item.draggable = true;
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('application/json', JSON.stringify({type:'item', icon:icon}));
            });
            itemsArea.appendChild(item);
        });
    }

    // ベンチ初期化[cite: 4]
    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        const champIcons = ['🐻','🐺','🐉','🦅','🐍','🦁'];
        champIcons.forEach(icon => {
            const p = document.createElement('div');
            p.className = 'piece';
            p.draggable = true;
            p.textContent = icon;
            p.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', icon));
            bench.appendChild(p);
        });
    }

    // ボード外ドロップでの削除[cite: 4]
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', (e) => {
        const isOverBoard = e.target.closest('#board');
        const isOverHex = e.target.closest('.hex');
        
        if (!isOverHex && !isOverBoard && window.currentDragSource) {
            window.currentDragSource.innerHTML = '';
            window.currentDragSource = null;
        }
    });
}

// 起動
init();