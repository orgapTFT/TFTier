/* builder.js - 表示・スワップ不具合修正版 */

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
        
        // チャンピオンまたはアイテムのドロップ（JSON形式）[cite: 4]
        if (rawData) {
            const dragData = JSON.parse(rawData);

            if (dragData.type === 'champ') {
                const source = window.currentDragSource;
                const targetChamp = hex.querySelector('.champ');

                if (source && source !== hex) {
                    if (targetChamp) {
                        // --- 【スワップ実行】 ---
                        // ドロップ先(B)の情報を退避[cite: 4]
                        const targetData = {
                            type: 'champ',
                            icon: targetChamp.querySelector('.champ-icon').textContent,
                            stars: targetChamp.dataset.stars || 1,
                            items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent)
                        };

                        // 双方のマスを空にしてから再配置（上書き・消滅バグ防止）[cite: 4]
                        source.innerHTML = '';
                        hex.innerHTML = '';

                        placeChampion(source, targetData); // Aの場所にBを復元
                        placeChampion(hex, dragData);      // Bの場所にAを配置
                    } else {
                        // --- 【通常移動】 ---
                        source.innerHTML = ''; 
                        placeChampion(hex, dragData);
                    }
                }
                return;
            } else if (dragData.type === 'item') {
                // アイテムのドロップ処理[cite: 4, 5]
                const existingChamp = hex.querySelector('.champ');
                if (existingChamp) {
                    let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                    itemsDiv.className = 'items-container';
                    if (!hex.contains(itemsDiv)) hex.appendChild(itemsDiv);

                    if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                        // 盤面内移動の場合は元アイテムを削除
                        if (dragData.fromHexIndex !== undefined) {
                            const fromHex = document.querySelectorAll('.hex')[dragData.fromHexIndex];
                            if (fromHex) {
                                const dragItem = fromHex.querySelector('.item-slot.dragging-hidden');
                                if (dragItem) dragItem.remove();
                            }
                        }
                        window.addItemSlot(itemsDiv, dragData.icon);
                    }
                }
                return;
            }
        }

        // ベンチからの新規ドロップ（テキスト形式）[cite: 4]
        const plainIcon = e.dataTransfer.getData('text/plain');
        if (plainIcon && plainIcon.length < 4) {
            placeChampion(hex, { icon: plainIcon, stars: 1, items: [] });
        }

    } catch (err) {
        console.error("Drop error:", err);
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