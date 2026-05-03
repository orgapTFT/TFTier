/* builder.js */

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    board.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        hex.addEventListener('dragover', e => { e.preventDefault(); hex.classList.add('dragover'); });
        hex.addEventListener('dragleave', () => hex.classList.remove('dragover'));
        hex.addEventListener('drop', e => handleDrop(e, hex));
        board.appendChild(hex);
    }
}

function addDragToChampion(champ) {
    champ.addEventListener('dragstart', e => {
        const parent = champ.parentElement;
        window.currentDragSource = parent;

        // 【重要】星の数は champ.dataset.stars から確実に取得
        const currentStars = champ.dataset.stars || "1";

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: currentStars,
            items: Array.from(parent.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => {
            if(champ) champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; 

    let currentStars = parseInt(data.stars) || 1;

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars; 
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    // 星の要素
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    let startX, startY;
    starLabel.addEventListener('mousedown', (e) => {
        startX = e.screenX;
        startY = e.screenY;
    });

    starLabel.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        const diffX = Math.abs(e.screenX - startX);
        const diffY = Math.abs(e.screenY - startY);
        if (diffX > 5 || diffY > 5) return;

        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items) {
        data.items.forEach(icon => {
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    // 重なり順：下から チャンピョン -> アイテム -> 星
    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel); 

    addDragToChampion(champ);
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        
        // データがない場合は、ベンチからの簡易ドラッグとして処理
        if (!rawData) {
            const icon = e.dataTransfer.getData('text/plain');
            if (icon && icon.length < 4) {
                placeChampion(hex, { icon: icon, stars: 1, items: [] });[cite: 4]
            }
            return;
        }

        const data = JSON.parse(rawData);

        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ');
            const source = window.currentDragSource;

            // 移動元がない、または自分自身に落とした場合は何もしない
            if (!source || source === hex) return;[cite: 4]

            if (targetChamp) {
                // --- 【ダミー変数への退避】 ---
                const dummyData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,[cite: 4]
                    stars: targetChamp.dataset.stars || 1,[cite: 4]
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent)[cite: 4, 5]
                };

                // --- 【両方のマスをクリア】 ---
                source.innerHTML = '';[cite: 4]
                hex.innerHTML = '';   [cite: 4]

                // --- 【入れ替えて再配置】 ---
                placeChampion(source, dummyData);[cite: 4]
                placeChampion(hex, data);        [cite: 4]
            } else {
                // 通常移動
                source.innerHTML = '';[cite: 4]
                placeChampion(hex, data);[cite: 4]
            }
            window.currentDragSource = null;
        } else if (data.type === 'item') {
            // アイテムのドロップ処理
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                itemsDiv.className = 'items-container';
                if (!hex.contains(itemsDiv)) hex.appendChild(itemsDiv);

                if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                    // 盤面内移動なら元のアイテムを消す
                    if (data.fromHexIndex !== undefined) {
                        const allHexes = document.querySelectorAll('.hex');
                        const fromHex = allHexes[data.fromHexIndex];
                        const dragItem = fromHex?.querySelector('.item-slot.dragging-hidden');
                        if (dragItem) dragItem.remove();
                    }
                    window.addItemSlot(itemsDiv, data.icon);[cite: 5]
                }
            }
        }
    } catch (err) {
        console.error("Drop Error:", err);
    }
}

function init() {
    createBoard();
    
    const itemsArea = document.getElementById('items');
    if (itemsArea) {
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
}
    
    // 盤面外ドロップ（削除）の判定
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', (e) => {
    const isOverBoard = e.target.closest('#board'); // 盤面エリア全体
    const isOverHex = e.target.closest('.hex');     // 六角形のマス

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    const data = JSON.parse(rawData);

    if (!isOverBoard) {
        // 1. 盤面の完全外側なら「削除」
        if (window.currentDragSource) {
            window.currentDragSource.innerHTML = '';
            window.currentDragSource = null;
        }
    } else if (isOverBoard && !isOverHex) {
        // 2. 盤面エリア内だが、マスの上ではない（隙間）なら「元の場所に戻す」
        // 何もしないことで、dragend後のhidden解除により元の場所に見えるようになる
        console.log("盤面内の隙間なのでキャンセル");
    }
});

init();