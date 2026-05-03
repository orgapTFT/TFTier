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
        window.currentDragSource = champ.parentElement;
        const currentStars = champ.dataset.stars || "1";

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: currentStars,
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => {
            if(champ) champ.classList.add('dragging-hidden');
        }, 10);
    });

champ.addEventListener('dragend', () => {
    champ.classList.remove('dragging-hidden');
    document.querySelectorAll('.dragging-hidden').forEach(el => {
        el.classList.remove('dragging-hidden');
    });
    window.currentDragSourceItem = null;
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

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items) {
        data.items.forEach(icon => {
            // addItemSlotが外部(main.js等)にある前提
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    let startX, startY;
    starLabel.addEventListener('mousedown', (e) => {
        startX = e.screenX; startY = e.screenY;
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

        // --- チャンピオンのドラッグ時 ---
        if (data.type === 'champ') {
            const source = window.currentDragSource;
            const targetChamp = hex.querySelector('.champ');

            // 1. 自分自身（元のマス）に落とした場合は何もしない
            if (source === hex) return;

            // 2. 移動先が「別のマス」である場合のみ処理開始
            if (source) {
                if (targetChamp) {
                    // --- 【挙動：スワップ】 ---
                    // 移動先にいたBの情報を一時保存
                    const targetData = {
                        type: 'champ',
                        icon: targetChamp.querySelector('.champ-icon').innerHTML,
                        stars: targetChamp.dataset.stars || 1,
                        items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                    };

                    // AとB、両方のマスを完全にクリアする
                    source.innerHTML = '';
                    hex.innerHTML = '';

                    // 入れ替えて配置
                    placeChampion(source, targetData); // Aの場所にBを置く
                    placeChampion(hex, data);          // Bの場所にAを置く
                    console.log("スワップ完了");
                } else {
                    // --- 【挙動：空きマスへの移動】 ---
                    source.innerHTML = ''; // 元のマスを削除
                    placeChampion(hex, data); // 新しいマスに表示
                    console.log("移動完了");
                }
            }
        } 
        // --- アイテムのドラッグ時 ---
        else if (data.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container');
                if (!itemsDiv) {
                    itemsDiv = document.createElement('div');
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                    // 盤面からのアイテム移動なら元を消す（必要に応じて）
                    document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                    addItemSlot(itemsDiv, data.icon);
                }
            }
        }
    } catch (err) {
        // ベンチからの新規配置（移動ではなくコピー）
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 4) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

function init() {
    createBoard();
    
    // アイテムパレット
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

    // ベンチ
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

    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', (e) => {
    const isOverBoard = e.target.closest('#board');
    const isOverHex = e.target.closest('.hex');

    // もし六角形（hex）の上でドロップされたなら、handleDrop側で処理するのでここでは無視
    if (isOverHex) return;

    // 盤面(board)の外側にドロップした場合
    if (!isOverBoard) {
        if (window.currentDragSource) {
            window.currentDragSource.innerHTML = ''; // チャンピオン・星・アイテムを全削除
            window.currentDragSource = null;
            console.log("ボード外ドロップ：削除しました");
        }
    } 
    // 盤面(board)の内側だが、マス(hex)ではない隙間の場合
    else {
        // 何もしない。
        // dragendイベントにより、.dragging-hidden が自動的に解除されるため元の場所に表示される。
        console.log("ボード内の隙間：移動をキャンセルしました");
    }
});
}

init();