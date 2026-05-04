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
        
        <!-- チャンピオン名 -->
        <div class="champ-name-onboard">
            ${champName}
        </div>
    `;

    // ====================== 星の復活 ======================
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星クリックで星数変更
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

    // ====================== アイテム ======================
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';

    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(itemName => {
            if (itemName && typeof itemName === 'string' && itemName.trim() !== '') {
                addItemSlot(itemsDiv, itemName.trim());
            }
        });
    }

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel);   // ← ここで追加

    addDragToChampion(champ);
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) throw new Error();
        const data = JSON.parse(rawData);

        // ====================== チャンピオン移動 ======================
        if (data.type === 'champ') {
            const source = window.currentDragSource;
            if (!source || source === hex) return;

            const targetChamp = hex.querySelector('.champ');
            const targetItems = Array.from(hex.querySelectorAll('.item-slot'))
                                  .map(s => s.dataset.name || '');

            const sourceData = {
                type: 'champ',
                icon: source.querySelector('.champ')?.dataset.name || '',
                stars: source.querySelector('.champ')?.dataset.stars || "1",
                items: Array.from(source.querySelectorAll('.item-slot'))
                            .map(s => s.dataset.name || '')
            };

            source.innerHTML = '';

            if (targetChamp) {
                placeChampion(source, sourceData);
            }

            placeChampion(hex, data);
            window.currentDragSource = null;
        }

        // ====================== アイテム移動（強化） ======================
        else if (data.type === 'item') {
            const champ = hex.querySelector('.champ');
            if (!champ) return;

            let itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                hex.appendChild(itemsContainer);
            }

            const draggedSlot = data.sourceSlot;

            // 同じチャンピオン内スワップ
            if (draggedSlot && itemsContainer.contains(draggedSlot)) {
                const targetSlot = e.target.closest('.item-slot');
                if (targetSlot && targetSlot !== draggedSlot) {
                    const tempHTML = draggedSlot.innerHTML;
                    const tempName = draggedSlot.dataset.name;
                    draggedSlot.innerHTML = targetSlot.innerHTML;
                    draggedSlot.dataset.name = targetSlot.dataset.name;
                    targetSlot.innerHTML = tempHTML;
                    targetSlot.dataset.name = tempName;
                }
                return;
            }

            // 別チャンピオンへ移動
            if (itemsContainer.children.length < 3) {
                addItemSlot(itemsContainer, data.icon);
                if (draggedSlot && draggedSlot.parentElement) {
                    draggedSlot.parentElement.removeChild(draggedSlot);
                }
            }
        }
    } catch (err) {
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 20) {
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

    // ドラッグ開始処理
    slot.addEventListener('dragstart', e => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'item',
            icon: iconName,
            sourceSlot: slot          // これが超重要
        }));
        slot.classList.add('dragging-hidden');
        e.stopPropagation();          // 親要素への伝播を止める
    });

    // ★ 追加：ドラッグ終了時の後処理
    slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging-hidden');
    });

    // ★ 追加：右クリックでアイテムを外す
    slot.addEventListener('contextmenu', e => {
        e.preventDefault();
        slot.remove();                // その場で削除（装備解除）
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


    // 盤面外ドロップで解除
document.addEventListener('drop', (e) => {
    const isOverBoard = e.target.closest('#board');
    
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (rawData) {
            const data = JSON.parse(rawData);

            // アイテムを盤面外へ → 解除
            if (data.type === 'item' && data.sourceSlot && !isOverBoard) {
                data.sourceSlot.remove();
            }

            // チャンピオンを盤面外へ → 解除
            else if (!isOverBoard && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        }
    } catch (err) {}
});
}

// 共通並び替え関数
function setupSortable(container) {
    container.addEventListener('dragover', e => e.preventDefault());
    
    container.addEventListener('drop', e => {
        e.preventDefault();
        
        let dragged = window.currentDragSourceBench;
        
        if (!dragged) {
            dragged = Array.from(container.children).find(el => el.classList.contains('dragging-hidden'));
        }

        if (!dragged) return;

        const target = e.target.closest('.piece, .item');
        if (target && target !== dragged && target.parentElement === container) {
            // スワップ
            const temp = document.createElement('div');
            dragged.parentNode.insertBefore(temp, dragged);
            target.parentNode.insertBefore(dragged, target);
            temp.parentNode.insertBefore(target, temp);
            temp.remove();
        }
        
        dragged.classList.remove('dragging-hidden');
        window.currentDragSourceBench = null;
    });
}

init();