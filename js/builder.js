/* builder.js - 完全に動作するドラッグ＆ドロップシステム */

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    board.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        hex.dataset.index = i;
        
        // ドラッグオーバー時のハイライト
        hex.addEventListener('dragover', e => {
            e.preventDefault();
            hex.classList.add('dragover');
        });
        
        hex.addEventListener('dragleave', () => {
            hex.classList.remove('dragover');
        });
        
        // ドロップ処理
        hex.addEventListener('drop', e => handleDrop(e, hex));
        
        board.appendChild(hex);
    }
}

// ==================== ドロップ処理 ====================
function handleDrop(e, hex) {
    e.preventDefault();
    e.stopPropagation();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        
        const data = JSON.parse(rawData);

        // ====================== チャンピオン配置・移動 ======================
        if (data.type === 'champ') {
            const sourceHex = data.sourceHex ? document.querySelector(`.hex[data-index="${data.sourceHex}"]`) : window.currentDragSource;
            
            // 同じマスなら何もしない
            if (sourceHex === hex) return;
            
            // ソースからチャンピオンデータを取得
            const sourceData = sourceHex ? getChampionData(sourceHex) : null;
            const targetData = hex.querySelector('.champ') ? getChampionData(hex) : null;

            if (sourceData) {
                // ターゲットにチャンピオンがいる場合はスワップ
                if (targetData) {
                    placeChampion(sourceHex, targetData);
                } else if (sourceHex) {
                    sourceHex.innerHTML = '';
                }
                placeChampion(hex, sourceData);
            }

            window.currentDragSource = null;
            window.currentDragSourceBench = null;
            return;
        }

        // ====================== アイテム移動 ======================
        if (data.type === 'item') {
            handleItemDrop(e, hex, data);
            return;
        }

    } catch (err) {
        console.error("Drop error:", err);
    }
}

// アイテムドロップ処理
function handleItemDrop(e, hex, data) {
    const newItemName = data.icon || data.name || '';
    if (!newItemName) return;

    // ターゲットのチャンピオンを確認
    const champ = hex.querySelector('.champ');
    if (!champ) return; // チャンピオンがいないマスにはアイテムは置けない

    // ターゲットのアイテムコンテナを取得または作成
    let targetItemsContainer = hex.querySelector('.items-container');
    if (!targetItemsContainer) {
        targetItemsContainer = document.createElement('div');
        targetItemsContainer.className = 'items-container';
        hex.appendChild(targetItemsContainer);
    }

    const currentItems = Array.from(targetItemsContainer.querySelectorAll('.item-slot'));

    if (currentItems.length < 3) {
        // 空きあり → 追加
        addItemSlot(targetItemsContainer, newItemName);
    } else {
        // 3つ満杯 → マウス位置に最も近いアイテムと交換
        const rect = targetItemsContainer.getBoundingClientRect();
        const dropX = e.clientX - rect.left;

        let targetIndex = 0;
        let minDistance = Infinity;

        currentItems.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2 - rect.left;
            const distance = Math.abs(dropX - itemCenter);

            if (distance < minDistance) {
                minDistance = distance;
                targetIndex = index;
            }
        });

        currentItems[targetIndex].remove();
        addItemSlot(targetItemsContainer, newItemName);
    }

    // ソーススロットから削除
    if (data.sourceSlot) {
        data.sourceSlot.remove();
    }
}

// ==================== チャンピオン配置 ====================
function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = '';

    const currentStars = parseInt(data.stars) || 1;
    const champName = data.icon || data.name || '';
    const currentLv = parseInt(data.lv) || 0;

    container.dataset.type = 'champ';
    container.dataset.name = champName;
    container.dataset.lv = currentLv;

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars;
    champ.dataset.name = champName;

    champ.innerHTML = `
        <img src="./img/champ/17/${champName}.avif" 
             alt="${champName}" 
             class="champ-icon"
             style="width:88%; height:88%; object-fit:contain;"
             onerror="this.style.display='none';">
        <div class="champ-name-onboard">${champName}</div>
        <div class="lv-display" style="display:${currentLv >= 3 ? 'block' : 'none'}">Lv${currentLv}</div>
    `;

    // ==================== 星コンテナと星表示 ====================
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';
    starLabel.style.cursor = 'pointer';

    // 星クリックで星数をインクリメント
    let starStartX, starStartY;
    starLabel.addEventListener('mousedown', e => {
        starStartX = e.screenX;
        starStartY = e.screenY;
    });

    starLabel.addEventListener('mouseup', e => {
        e.stopPropagation();
        // ドラッグではなくクリックの場合のみ
        if (Math.abs(e.screenX - starStartX) > 5 || Math.abs(e.screenY - starStartY) > 5) return;
        
        // 0 → 1 → 2 → 3 → 4 → 1（ループ）
        let s = (parseInt(champ.dataset.stars) % 4) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
        container.dataset.stars = s;
        markChanged();
    });

    // ==================== レベル表示とクリック処理 ====================
    const lvDisplay = champ.querySelector('.lv-display');
    let currentLvNum = currentLv >= 3 ? currentLv : 3;
    let lvStartX, lvStartY;

    champ.addEventListener('mousedown', (e) => {
        lvStartX = e.screenX;
        lvStartY = e.screenY;
    });

    champ.addEventListener('mouseup', (e) => {
        // ドラッグではなくクリックの場合のみ
        if (Math.abs(e.screenX - lvStartX) > 5 || Math.abs(e.screenY - lvStartY) > 5) return;

        e.preventDefault();

        // 3 → 4 → 5 → ... → 10 → 3（非表示）のループ
        if (currentLvNum >= 10) {
            currentLvNum = 3;
            lvDisplay.style.display = 'none';
        } else {
            currentLvNum++;
            lvDisplay.textContent = `Lv${currentLvNum}`;
            lvDisplay.style.display = 'block';
        }

        container.dataset.lv = currentLvNum;
        markChanged();
    });

    // ==================== アイテムコンテナ ====================
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(itemName => {
            if (itemName?.trim()) addItemSlot(itemsDiv, itemName.trim());
        });
    }

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel);

    addDragToChampion(champ, container);
}

// ==================== チャンピオンのドラッグ設定 ====================
function addDragToChampion(champ, container) {
    champ.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        
        const sourceHexIndex = container.dataset.index || Array.from(document.querySelectorAll('.hex')).indexOf(container);
        
        const data = {
            type: 'champ',
            icon: champ.dataset.name,
            stars: champ.dataset.stars || "1",
            items: Array.from(container.querySelectorAll('.item-slot')).map(slot => slot.dataset.name),
            lv: container.dataset.lv || '0',
            sourceHex: sourceHexIndex
        };

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        window.currentDragSource = container;
        setTimeout(() => {
            champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
        if (container) {
            container.classList.remove('dragging-hidden');
        }
    });

    // 右クリックで削除
    champ.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (container) container.innerHTML = '';
    });
}

// ==================== アイテムスロット作成 ====================
function addItemSlot(container, iconName) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.draggable = true;
    slot.dataset.name = iconName;

    slot.innerHTML = `
        <img src="./img/item/${iconName}.avif" 
             alt="${iconName}" 
             style="width:100%; height:100%; object-fit:contain;">
    `;

    // アイテムドラッグ開始
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();

        const data = {
            type: 'item',
            icon: iconName,
            name: iconName,
            sourceSlot: slot
        };

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        slot.classList.add('dragging-hidden');
    });

    slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging-hidden');
    });

    // 右クリックで削除
    slot.addEventListener('contextmenu', e => {
        e.preventDefault();
        slot.remove();
    });

    container.appendChild(slot);
}

// ==================== チャンピオンデータ取得 ====================
function getChampionData(container) {
    const champ = container.querySelector('.champ');
    if (!champ) return null;

    return {
        type: 'champ',
        icon: champ.dataset.name,
        stars: champ.dataset.stars || "1",
        items: Array.from(container.querySelectorAll('.item-slot')).map(s => s.dataset.name),
        lv: container.dataset.lv || '0'
    };
}

// ==================== 初期化 ====================
function init() {
    createBoard();

    // ==================== アイテムエリア ====================
    const itemsArea = document.getElementById('items');
    if (itemsArea) {
        itemsArea.innerHTML = '';
        itemsArea.style.display = 'grid';
        itemsArea.style.gridTemplateColumns = 'repeat(30, 42px)';
        itemsArea.style.gap = '2px';
        itemsArea.style.justifyContent = 'center';
        itemsArea.style.padding = '15px';

        itemFiles.forEach(filename => {
            const itemName = filename.replace('.avif', '');
            const item = document.createElement('div');
            item.className = 'item';
            item.draggable = true;
            item.innerHTML = `
                <img src="./img/item/${filename}" 
                     alt="${itemName}" 
                     style="width:100%; height:100%; object-fit:contain;"
                     onerror="this.style.display='none'; this.parentElement.textContent='?'">
            `;
            
            item.addEventListener('dragstart', e => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'item', 
                    icon: itemName,
                    name: itemName
                }));
                item.classList.add('dragging-hidden');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging-hidden');
            });
            
            itemsArea.appendChild(item);
        });
    }

    // ==================== ベンチ ====================
    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        bench.style.display = 'grid';
        bench.style.gridTemplateColumns = 'repeat(10, 42px)';
        bench.style.gap = '2px';
        bench.style.justifyContent = 'center';
        bench.style.padding = '20px 30px';

        championFiles.forEach(filename => {
            const name = filename.replace('.avif', '');
            
            const p = document.createElement('div'); 
            p.className = 'piece';
            p.draggable = true;
            p.style.width = '40px';
            p.style.height = '40px';

            p.innerHTML = `
                <div style="position:relative; width:100%; height:100%;">
                    <img src="./img/champ/17/${filename}" 
                         alt="${name}" 
                         style="width:100%; height:100%; object-fit:contain; border-radius:8px;">
                    <div style="position:absolute; bottom:3px; left:0; right:0; 
                        text-align:center; color:white; font-size:10.5px; 
                        text-shadow: 0 0 4px black; pointer-events:none;">
                      ${name}
                    </div>
                </div>
            `;

            p.addEventListener('dragstart', e => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'champ',
                    icon: name,
                    stars: "1",
                    items: []
                }));
                p.classList.add('dragging-hidden');
                window.currentDragSourceBench = p;
            });

            p.addEventListener('dragend', () => p.classList.remove('dragging-hidden'));

            bench.appendChild(p);
        });
    }

    window.currentDragSource = null;
    window.currentDragSourceBench = null;

    document.body.addEventListener('dragover', e => e.preventDefault());

    // ドラッグ終了時の処理
    document.addEventListener('drop', (e) => {
        if (e.target.closest('.hex')) return;

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.type === 'champ' && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        } catch (err) {}
    });
}

// ページロード時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
