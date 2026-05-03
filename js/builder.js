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
        const parentHex = champ.parentElement;
        window.currentDragSource = parentHex;
        
        // アイテムスロットから「中身の文字」だけを抽出して配列化
        const itemIcons = Array.from(parentHex.querySelectorAll('.item-slot')).map(s => s.textContent);

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: champ.dataset.stars || "1",
            items: itemIcons // ここで純粋なアイコン文字を保存
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => {
            if(champ) champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        document.querySelectorAll('.dragging-hidden').forEach(el => el.classList.remove('dragging-hidden'));
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; // マスを初期化[cite: 4]

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = data.stars || 1; 
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    
    // アイテムを復元
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(iconText => {
            if (typeof window.addItemSlot === 'function') {
                window.addItemSlot(itemsDiv, iconText); // core.jsの関数を使用[cite: 5]
            }
        });
    }

    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    const sCount = parseInt(data.stars) || 1;
    starLabel.textContent = sCount > 1 ? '★'.repeat(sCount - 1) : '';

    // 星変更ロジック
    starLabel.addEventListener('mouseup', (e) => {
        e.stopPropagation();
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
        if (!rawData) return;
        const dragData = JSON.parse(rawData);

        if (dragData.type === 'champ') {
            const source = window.currentDragSource;
            const targetChamp = hex.querySelector('.champ');

            if (source && source !== hex) {
                if (targetChamp) {
                    // --- 【スワップ処理】 ---
                    // 1. 移動先にいる駒(B)のデータを完全にコピー[cite: 4]
                    const targetData = {
                        type: 'champ',
                        icon: targetChamp.querySelector('.champ-icon').innerHTML,
                        stars: targetChamp.dataset.stars || 1,
                        items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent)
                    };

                    // 2. 両方を一旦空にする（上書きバグ防止）
                    source.innerHTML = '';
                    hex.innerHTML = '';

                    // 3. データを入れ替えて配置
                    placeChampion(source, targetData); // 元の場所にBを置く
                    placeChampion(hex, dragData);      // 新しい場所にAを置く
                } else {
                    // --- 【通常移動】 ---
                    source.innerHTML = ''; 
                    placeChampion(hex, dragData);
                }
            }
        } else if (dragData.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container');
                if (!itemsDiv) {
                    itemsDiv = document.createElement('div');
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                    // 移動元が盤面アイテムなら削除
                    if (dragData.fromHexIndex !== undefined) {
                        const allHexes = document.querySelectorAll('.hex');
                        const fromHex = allHexes[dragData.fromHexIndex];
                        if (fromHex) {
                            const draggingItem = fromHex.querySelector('.item-slot.dragging-hidden');
                            if (draggingItem) draggingItem.remove();
                        }
                    }
                    window.addItemSlot(itemsDiv, dragData.icon);
                }
            }
        }
    } catch (err) {
        // ベンチからの新規配置
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 4) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

// 既存のinit関数内のドロップ処理も修正してボード外削除を有効化
function init() {
    createBoard();
    
    // アイテム・ベンチの初期化（省略せず既存通り実行）...
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
        if (isOverHex) return;

        if (!isOverBoard && window.currentDragSource) {
            window.currentDragSource.innerHTML = '';
            window.currentDragSource = null;
        }
    });
}

init();