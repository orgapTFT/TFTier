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
        if (!rawData) throw new Error();
        const data = JSON.parse(rawData);

        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ');
            const source = window.currentDragSource;

            // 1. 自分自身にドロップした場合は何もしない
            if (!source || source === hex) return;

            // 2. 移動元の場所を一旦空にする（これがスワップ成功の鍵）
            source.innerHTML = '';

            if (targetChamp) {
                // 3. 【スワップ】移動先の情報を保存して、元の場所(source)に配置
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,
                    stars: targetChamp.dataset.stars || "1",
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };
                // 元の場所にターゲットを置く
                placeChampion(source, targetData);
            }

            // 4. 新しい場所(hex)にドラッグした駒を置く
            placeChampion(hex, data);

        } else if (data.type === 'item') {
            // アイテムのドロップ処理（既存通り）[cite: 8, 9]
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                if (!hex.querySelector('.items-container')) {
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                if (itemsDiv.children.length < 3) {
                    document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                    if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, data.icon);
                }
            }
        }
    } catch (err) {
        // ベンチからの新規ドロップ対応[cite: 8, 9]
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 4) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
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
}

init();