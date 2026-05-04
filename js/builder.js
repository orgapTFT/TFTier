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
        setTimeout(() => champ.classList.add('dragging-hidden'), 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
    });

    // ★ 右クリックで解除
    champ.addEventListener('contextmenu', e => {
        e.preventDefault();
        const parent = champ.parentElement;
        if (parent) {
            parent.innerHTML = '';
        }
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = '';

    const currentStars = parseInt(data.stars) || 1;
    const champName = data.icon;

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
    `;

    // 星
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';
    
    // 星クリック処理（省略せず残す）
    let startX, startY;
    starLabel.addEventListener('mousedown', e => { startX = e.screenX; startY = e.screenY; });
    starLabel.addEventListener('mouseup', e => {
        e.stopPropagation();
        if (Math.abs(e.screenX - startX) > 5 || Math.abs(e.screenY - startY) > 5) return;
        
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    // アイテムコンテナ
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
        // アイテム同士のスワップを有効化
    if (typeof setupSortable === 'function') {
        setupSortable(itemsDiv);
    }
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        const data = rawData ? JSON.parse(rawData) : {};

        if (data.type === 'champ') {
            const source = window.currentDragSource;
            if (!source || source === hex) return;

            const targetData = hex.querySelector('.champ') ? {
                icon: hex.querySelector('.champ').dataset.name,
                stars: hex.querySelector('.champ').dataset.stars || "1",
                items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.name)
            } : null;

            source.innerHTML = '';
            hex.innerHTML = '';

            if (targetData) placeChampion(source, targetData);
            placeChampion(hex, data);

            window.currentDragSource = null;
            return;
        }

        if (data.type === 'item' && data.icon) {
            const itemsContainer = hex.querySelector('.items-container');
            if (itemsContainer && !Array.from(itemsContainer.children).some(s => s.dataset.name === data.icon)) {
                if (data.sourceSlot) data.sourceSlot.remove();
                addItemSlot(itemsContainer, data.icon);
            }
        }
    } catch (err) {
        const icon = e.dataTransfer.getData('text/plain');
        if (icon) {
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
        sourceSlot: slot
    }));
    slot.classList.add('dragging-hidden');
});



    // 右クリックで即解除
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

        // 実際のアイテム
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
                        text-shadow: 0 0 4px black; pointer-events:none;
                        white-space: nowrap; overflow: hidden; 
                        text-overflow: ellipsis; padding: 0 1px;">
                      ${name}
                    </div>
                </div>
            `;

            p.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', name);
                p.classList.add('dragging-hidden');
                window.currentDragSourceBench = p;
            });

            p.addEventListener('dragend', () => p.classList.remove('dragging-hidden'));

            bench.appendChild(p);
        });

        // 空欄追加
        for (let i = 0; i < 28; i++) {
            const empty = document.createElement('div');
            empty.className = 'piece empty-slot';
            empty.draggable = true;
            empty.style.width = '50px';
            empty.style.height = '50px';
            bench.appendChild(empty);
        }

        setupSortable(bench);
    }

    window.currentDragSource = null;
    window.currentDragSourceBench = null;


    // ========== グローバルドロップ処理（ベンチ・アイテム移動用） ==========
    document.addEventListener('drop', (e) => {
        const boardDrop = e.target.closest('#board');
        const benchDrop = e.target.closest('#bench');
        const itemsDrop = e.target.closest('#items');

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            // アイテムをベンチにドロップ → 解除（ベンチにはアイテムは置けない）
            if (data.type === 'item' && data.sourceSlot && benchDrop) {
                data.sourceSlot.remove();
                return;
            }

            // 盤面外にドロップ → 解除
            if (data.type === 'item' && data.sourceSlot && !boardDrop && !benchDrop && !itemsDrop) {
                data.sourceSlot.remove();
            }

        } catch (err) {}
    });

// init() 内の最後に置く
document.addEventListener('drop', (e) => {
    if (e.target.closest('#board') || e.target.closest('#bench') || e.target.closest('#items')) return;

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        if (data.type === 'item' && data.sourceSlot) {
            data.sourceSlot.remove();
        }
    } catch (e) {}
});
}

// 共通並び替え関数
function setupSortable(container) {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    container.addEventListener('drop', e => {
        e.preventDefault();
        const dragged = Array.from(container.children).find(el => el.classList.contains('dragging-hidden'));
        if (!dragged) return;
        dragged.classList.remove('dragging-hidden');

        let target = e.target.closest('.piece, .item-slot');
        if (!target || target === dragged) return;

        // ベンチ内のチャンピオン移動（空マス含む）
        if (dragged.classList.contains('piece') && target.classList.contains('piece')) {
            const tempHTML = dragged.innerHTML;
            const tempDraggable = dragged.draggable;
            const tempClassName = dragged.className;

            dragged.innerHTML = target.innerHTML;
            dragged.draggable = target.draggable;
            dragged.className = tempClassName;

            target.innerHTML = tempHTML;
            target.draggable = tempDraggable;
            target.className = tempClassName;
        }

        // アイテム同士の並び替え
        if (dragged.classList.contains('item-slot') && target.classList.contains('item-slot')) {
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