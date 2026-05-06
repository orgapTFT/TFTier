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
        const currentStars = champ.dataset.stars || "1";
        const items = Array.from(parent.querySelectorAll('.item-slot'))
                          .map(slot => slot.dataset.name);

        const data = {
            type: 'champ',
            icon: champ.dataset.name,
            stars: currentStars,
            items: items
        };

        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        setTimeout(() => {
            champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
        if (champ.parentElement) {
            champ.parentElement.classList.remove('dragging-hidden');
        }
    });

    // 右クリックで解除
    champ.addEventListener('contextmenu', e => {
        e.preventDefault();
        const parent = champ.parentElement;
        if (parent) parent.innerHTML = '';
    });
}

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

    // 星
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星クリック
    let startX, startY;
    starLabel.addEventListener('mousedown', e => { startX = e.screenX; startY = e.screenY; });
    starLabel.addEventListener('mouseup', e => {
        e.stopPropagation();
        if (Math.abs(e.screenX - startX) > 5 || Math.abs(e.screenY - startY) > 5) return;
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

// Lv切り替え（左クリック）
const lvDisplay = champ.querySelector('.lv-display');
let currentLvNum = currentLv || 3;
let lvStartX, lvStartY;

// 押し始めの座標を記録
champ.addEventListener('mousedown', (e) => {
    lvStartX = e.screenX;
    lvStartY = e.screenY;
});

// 指を離したときに、動いていなければレベルアップ
champ.addEventListener('mouseup', (e) => {
    // ドラッグ操作（移動）と区別するため、5px以上動いていたら無視
    if (Math.abs(e.screenX - lvStartX) > 5 || Math.abs(e.screenY - lvStartY) > 5) return;

    e.preventDefault();
    // 他のイベント（星クリックなど）に干渉させない場合は stopPropagation を使用
    // e.stopPropagation(); 

    // 3 → 4 → 5 → ... → 10 → 3（非表示）の順番で回す
    if (currentLvNum >= 10) {
        currentLvNum = 3;
        lvDisplay.style.display = 'none';
    } else {
        currentLvNum++;
        lvDisplay.textContent = `Lv${currentLvNum}`;
        lvDisplay.style.display = 'block';
    }

    container.dataset.lv = currentLvNum;
});

    // アイテム
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

    addDragToChampion(champ);
}


  // ==================== ドロップ処理（アイテムの他チャンプ移動対応） ====================
function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        // ====================== チャンピオン移動 ======================
        if (data.type === 'champ') {
            const source = window.currentDragSource || window.currentDragSourceBench;
            if (!source || source === hex) return;

            const sourceData = getChampionData(source);
            const targetData = hex.querySelector('.champ') ? getChampionData(hex) : null;

            hex.innerHTML = '';
            if (source !== window.currentDragSourceBench) source.innerHTML = '';

            if (targetData) placeChampion(source, targetData);
            placeChampion(hex, sourceData);

            window.currentDragSource = null;
            window.currentDragSourceBench = null;
            return;
        }

        // ====================== アイテム移動（大幅強化） ======================
        if (data.type === 'item' && data.icon) {
            const newItemName = data.icon;

            // 移動元スロット
            const sourceSlot = data.sourceSlot;
            if (sourceSlot) sourceSlot.remove();   // 必ず元のアイテムを削除

            // 元のアイテムを必ず削除
            if (sourceSlot) {
                sourceSlot.remove();
            }

            // ドロップ先のitems-containerを探す
            let targetItemsContainer = hex.querySelector('.items-container');

            // チャンピオンが置かれていない場合は何もしない
            if (!targetItemsContainer) {
                const champDiv = hex.querySelector('.champ');
                if (!champDiv) return; // 空のhexならアイテム捨てる

                // items-container が存在しない場合は作成
                targetItemsContainer = document.createElement('div');
                targetItemsContainer.className = 'items-container';
                hex.appendChild(targetItemsContainer);
            }

            const currentItems = Array.from(targetItemsContainer.querySelectorAll('.item-slot'));

            if (currentItems.length < 3) {
                // 空きあり → 追加
                addItemSlot(targetItemsContainer, newItemName);
            } else {
                // 3つ満杯 → ドロップ位置で上書き（前回の改善版をそのまま使用）
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

            return;
        }

    } catch (err) {
        // フォールバック（ベンチから直接チャンプ追加）
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 30) {
            hex.innerHTML = '';
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }

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

    // アイテムドラッグ開始（これを強化）
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();   // 重要：親のchampドラッグを阻止

        const data = {
            type: 'item',
            icon: iconName,
            sourceSlot: slot,
            sourceHex: slot.closest('.hex')   // 移動元を記録
        };

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

// チャンピオンデータ取得用ヘルパー
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

function init() {
    createBoard();

    // ==================== アイテムエリア ====================
    const itemsArea = document.getElementById('items');
    if (itemsArea) {
        itemsArea.innerHTML = '';
        itemsArea.style.display = 'grid';
        itemsArea.style.gridTemplateColumns = 'repeat(20, 45px)';
        itemsArea.style.gap = '2px';
        itemsArea.style.justifyContent = 'center';
        itemsArea.style.padding = '15px';

        itemFiles.forEach(filename => {
            const itemName = filename.replace('.avif', '');
            const item = document.createElement('div');
            item.className = 'item';
            item.draggable = true;
            item.style.width = '40px';
            item.innerHTML = `
                <img src="./img/item/${filename}" 
                     alt="${itemName}" 
                     style="width:100%; height:100%; object-fit:contain;"
                     onerror="this.style.display='none'; this.parentElement.textContent='?'">
            `;
            
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'item', 
                    icon: itemName
                }));
                item.classList.add('dragging-hidden');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging-hidden');
            });
            
            itemsArea.appendChild(item);
        });

        setupSortable(itemsArea);
    }

    // ==================== ベンチ ====================
    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        bench.style.display = 'grid';
        bench.style.gridTemplateColumns = 'repeat(10, 50px)';
        bench.style.gap = '2px';
        bench.style.justifyContent = 'center';
        bench.style.padding = '20px 30px';

        championFiles.forEach(filename => {
            const name = filename.replace('.avif', '');
            p.className = 'piece';
            p.draggable = true;
            p.style.width = '45px';
            p.style.height = '45px';

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
                e.dataTransfer.setData('text/plain', name);
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

    // HEX外ドロップで解除
    document.addEventListener('drop', (e) => {
        if (e.target.closest('.hex')) return;

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.type === 'item-slot' && data.sourceSlot) {
                data.sourceSlot.remove();
            }
            if (data.type === 'champ' && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        } catch (err) {}
    });

// アイテムエリア（itemsArea）の設定箇所に追加
itemsArea.addEventListener('dragover', e => e.preventDefault());
itemsArea.addEventListener('drop', e => {
    e.preventDefault();
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        // もしドラッグされたのがチャンピオンなら、元の場所を空にする
        if (data.type === 'champ' && window.currentDragSource) {
            window.currentDragSource.innerHTML = '';
            window.currentDragSource = null;
        }
    } catch (err) {
        console.error("Drop error:", err);
    }
});

}

// ==================== アイテム並び替え ====================
function setupSortable(container) {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    container.addEventListener('drop', e => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const dragged = Array.from(container.children).find(el => 
            el.classList.contains('dragging-hidden')
        );
        if (!dragged) return;
        dragged.classList.remove('dragging-hidden');

        // ドロップ先の対象を .item-slot のみに限定（ベンチは別途処理）
        const target = e.target.closest('.item-slot');
        
        if (target && target !== dragged && target.parentElement === container) {
            const tempHTML = dragged.innerHTML;
            const tempName = dragged.dataset.name;

            dragged.innerHTML = target.innerHTML;
            dragged.dataset.name = target.dataset.name;

            target.innerHTML = tempHTML;
            target.dataset.name = tempName;
        }
    });
}

init();