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
        
        // 少し遅らせて隠す（ちらつき防止）
        setTimeout(() => {
            champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
        // 念のため親要素もクリーン
        if (champ.parentElement) {
            champ.parentElement.classList.remove('dragging-hidden');
        }
    });

    // 右クリック解除
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

    // Lv切り替え（左ダブルクリック）
    const lvDisplay = champ.querySelector('.lv-display');
    let currentLvNum = currentLv || 3;

    champ.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        currentLvNum = (currentLvNum % 10) + 3;
        if (currentLvNum > 10) {
            currentLvNum = 3;
            lvDisplay.style.display = 'none';
        } else {
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

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        
        const data = JSON.parse(rawData);

        // ====================== チャンピオン ======================
        if (data.type === 'champ') {
            const source = window.currentDragSource || window.currentDragSourceBench;
            if (!source || source === hex) return;

            const isFromBench = source.closest && source.closest('#bench');

            const sourceChamp = source.querySelector('.champ');
            const sourceData = {
                type: 'champ',
                icon: sourceChamp ? sourceChamp.dataset.name : data.icon,
                stars: sourceChamp ? (sourceChamp.dataset.stars || "1") : (data.stars || "1"),
                items: Array.from(source.querySelectorAll('.item-slot')).map(s => s.dataset.name),
                lv: source.dataset.lv || data.lv || '0'
            };

            const targetData = hex.querySelector('.champ') ? {
                type: 'champ',
                icon: hex.querySelector('.champ').dataset.name,
                stars: hex.querySelector('.champ').dataset.stars || "1",
                items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.name),
                lv: hex.dataset.lv || '0'
            } : null;

            hex.innerHTML = '';
            if (!isFromBench) source.innerHTML = '';

            if (targetData) placeChampion(source, targetData);
            placeChampion(hex, sourceData);

            window.currentDragSource = null;
            window.currentDragSourceBench = null;
            return;
        }

        // ====================== アイテム ======================
        else if (data.type === 'item' && data.icon) {
            const itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) return;

            // アイテム枠チェック
            if (itemsContainer.children.length >= 3) {
                console.log("アイテム枠がいっぱいです");
                return;
            }

            // 元の位置から削除（移動）
            if (data.sourceSlot) {
                data.sourceSlot.remove();
            }

            // 装備
            addItemSlot(itemsContainer, data.icon);
            console.log(`アイテム装備: ${data.icon}`);
        }

    } catch (err) {
        // text/plain フォールバック（ベンチから直接ドラッグなど）
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 30) {
            hex.innerHTML = '';
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

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

    // ドラッグ開始
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'item',
            icon: iconName,
            sourceSlot: slot          // これだけ残せばOK
        }));

        slot.classList.add('dragging-hidden');
    });

    slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging-hidden');
    });

    // 右クリックで解除
    slot.addEventListener('contextmenu', e => {
        e.preventDefault();
        slot.remove();
    });

    container.appendChild(slot);
}

function init() {
    createBoard();
    
      // ==================== アイテムエリア ====================
    const itemsArea = document.getElementById('items');
    if (itemsArea) {
        itemsArea.innerHTML = '';
        itemsArea.style.display = 'grid';
        itemsArea.style.gridTemplateColumns = 'repeat(12, 50px)';
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

        // 空白追加
        for (let i = 0; i < 10; i++) {
            const empty = document.createElement('div');
            empty.className = 'item empty-slot';
            empty.draggable = true;
            empty.style.width = '50px';
            empty.style.height = '50px';
            itemsArea.appendChild(empty);
        }

        setupSortable(itemsArea);
    }

    // ==================== ベンチ ====================
    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        bench.style.display = 'grid';
        bench.style.gridTemplateColumns = 'repeat(7, 54px)';
        bench.style.gap = '2px';
        bench.style.justifyContent = 'center';
        bench.style.padding = '20px 30px';

        // 実際のチャンピオン
        championFiles.forEach(filename => {
            const name = filename.replace('.avif', '');
            const p = document.createElement('div');
            p.className = 'piece';
            p.draggable = true;
            p.style.width = '50px';
            p.style.height = '50px';

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

        setupBenchSortable(bench);   // 必要なら残す
    }



    window.currentDragSource = null;
    window.currentDragSourceBench = null;



 // 全体でドロップを許可
document.body.addEventListener('dragover', e => {
    e.preventDefault();
});

// ドロップイベント
document.body.addEventListener('drop', e => {
    e.preventDefault();

    // .hex の内側にドロップしたかどうか
    const droppedOnHex = e.target.closest('.hex');

    if (!droppedOnHex) {
        // === .hex の外側にドロップされた場合 ===
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;

        try {
            const data = JSON.parse(rawData);

            if (data.type === 'item') {
                // ドラッグ中のアイテムを削除（解除）
                document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                
                console.log("🗑️ .hex外ドロップ → アイテム解除");
            }
            
            if (data.type === 'champ' && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                console.log("✅ チャンピオン解除完了");
                window.currentDragSource = null;
            }
        } catch (err) {
            console.log("解除処理でエラー:", err);
        }
    });

}

// 共通並び替え関数（アイテム用）
function setupSortable(container) {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    container.addEventListener('drop', e => {
        e.preventDefault();
        e.stopImmediatePropagation();   // ← これを追加

        const dragged = Array.from(container.children).find(el => 
            el.classList.contains('dragging-hidden')
        );
        if (!dragged) return;
        dragged.classList.remove('dragging-hidden');

        const target = e.target.closest('.item, .item-slot');
        if (target && target !== dragged) {
            const tempHTML = dragged.innerHTML;
            const tempName = dragged.dataset.name;

            dragged.innerHTML = target.innerHTML;
            dragged.dataset.name = target.dataset.name;

            target.innerHTML = tempHTML;
            target.dataset.name = tempName;
        }
    });
}

// ==================== ベンチ専用スワップ関数 ====================
function setupBenchSortable(bench) {
    bench.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    bench.addEventListener('drop', e => {
        e.preventDefault();
        
        const dragged = Array.from(bench.children).find(el => el.classList.contains('dragging-hidden'));
        if (!dragged) return;
        dragged.classList.remove('dragging-hidden');

        const target = e.target.closest('.piece');
        if (!target || target === dragged) return;

        const tempHTML = dragged.innerHTML;
        const tempClass = dragged.className;
        const tempStyle = dragged.style.cssText;
        const tempData = { ...dragged.dataset };

        dragged.innerHTML = target.innerHTML;
        dragged.className = target.className;
        dragged.style.cssText = target.style.cssText;
        Object.keys(dragged.dataset).forEach(k => delete dragged.dataset[k]);
        Object.assign(dragged.dataset, target.dataset);

        target.innerHTML = tempHTML;
        target.className = tempClass;
        target.style.cssText = tempStyle;
        Object.keys(target.dataset).forEach(k => delete target.dataset[k]);
        Object.assign(target.dataset, tempData);
    });
}

init();