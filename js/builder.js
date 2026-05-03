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
        
        // アイコンは innerHTML ではなく、中のテキスト(絵文字)だけを抽出する
        const iconText = champ.querySelector('.champ-icon').textContent;
        const itemIcons = Array.from(parentHex.querySelectorAll('.item-slot')).map(s => s.textContent);

        const data = {
            type: 'champ',
            icon: iconText, // HTMLタグを含まない純粋な文字
            stars: champ.dataset.stars || "1",
            items: itemIcons
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
    if (!container || !data || !data.icon) return;
    
    // 1. マスを一旦クリア
    container.innerHTML = ''; 

    // 2. チャンピオン要素の作成
    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    const sCount = parseInt(data.stars) || 1;
    champ.dataset.stars = sCount; 
    
    // アイコン表示を統一（常に同じ構造で作る）[cite: 4, 8]
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    // 3. アイテムコンテナの作成[cite: 4, 8]
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(iconText => {
            if (typeof window.addItemSlot === 'function') {
                window.addItemSlot(itemsDiv, iconText); // core.jsの関数を使用[cite: 5]
            }
        });
    }

    // 4. 星ラベルの作成[cite: 4, 8]
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = sCount > 1 ? '★'.repeat(sCount - 1) : '';

    // クリック（mouseup）で星を切り替え
    starLabel.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    // 5. 要素をマスに追加
    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel); 

    // 6. ドラッグ機能を付与
    addDragToChampion(champ);
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const dragData = JSON.parse(rawData); // 移動させたいAのデータ[cite: 4]

        if (dragData.type === 'champ') {
            const source = window.currentDragSource;
            const targetChamp = hex.querySelector('.champ');

            if (!source || source === hex) return;

            if (targetChamp) {
                // --- 【STEP 1: ダミーに退避】 ---
                // iconはtextContentではなくinnerHTMLで「中身丸ごと」保存する[cite: 4]
                const dummyBox = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML, 
                    stars: targetChamp.dataset.stars || 1,[cite: 4]
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent)[cite: 4, 5]
                };

                // --- 【STEP 2: 同時リセット】 ---
                source.innerHTML = ''; // 元の場所をクリア[cite: 4]
                hex.innerHTML = '';    // 移動先をクリア[cite: 4]

                // --- 【STEP 3: 再配置】 ---
                // placeChampion内で再度HTMLが組み立てられる[cite: 4]
                placeChampion(source, dummyBox); 
                placeChampion(hex, dragData);
                
            } else {
                // 通常移動
                source.innerHTML = '';[cite: 4]
                placeChampion(hex, dragData);[cite: 4]
            }
        } else if (dragData.type === 'item') {
            // アイテムドロップ用（関数が定義されている場合）
            if (typeof handleItemDrop === 'function') {
                handleItemDrop(hex, dragData);
            }
        }
    } catch (err) {
        // ベンチからの新規ドロップ
        const plainIcon = e.dataTransfer.getData('text/plain');
        if (plainIcon && plainIcon.length < 4) {
            placeChampion(hex, { icon: plainIcon, stars: 1, items: [] });[cite: 4]
        }
    }
}

function init() {
    createBoard(); //[cite: 4]
    
    // アイテムパレット初期化[cite: 4]
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

    // 全体ドロップ（場外削除）[cite: 4]
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