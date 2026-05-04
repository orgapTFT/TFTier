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
                          .map(slot => slot.dataset.name);  // ← ここを変更！（名前だけ保存）

        const data = {
            type: 'champ',
            icon: champ.dataset.name,
            stars: currentStars,
            items: items  // ["GiantSlayer", "InfinityEdge", ...]
        };

        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => champ.classList.add('dragging-hidden'), 10);
    });
 
    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
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
    
    <!-- チャンピオン名表示 -->
    <div class="champ-name-onboard">
        ${champName}
    </div>
`;

    // 星
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星クリック処理（省略可）

    // Items
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';

    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(itemName => {
            if (itemName && typeof itemName === 'string' && itemName.trim() !== '') {
                addItemSlot(itemsDiv, itemName.trim());  // 名前だけ渡す
            }
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
                icon: source.querySelector('.champ')?.dataset.name || '',
                stars: source.querySelector('.champ')?.dataset.stars || "1",
                items: Array.from(source.querySelectorAll('.item-slot'))
                            .map(s => s.dataset.name || '')
            };

            source.innerHTML = '';

            if (targetChamp) {
                placeChampion(source, { ...sourceData, type: 'champ' });
            }

            placeChampion(hex, data);
            window.currentDragSource = null;
        }

        // ====================== アイテム移動 ======================
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

            // ① 同じチャンピオン内でアイテム同士を入れ替え（スワップ）
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

            // ② 別のチャンピオンへアイテムを移動
            if (itemsContainer.children.length < 3) {
                addItemSlot(itemsContainer, data.icon);
                if (draggedSlot) draggedSlot.remove();   // 元の場所から削除
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

    slot.addEventListener('dragstart', e => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'item',
            icon: iconName,
            sourceSlot: slot,
            fromBoard: true   // 盤面上からドラッグしたことを明示
        }));
        slot.classList.add('dragging-hidden');
        e.stopPropagation();
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
    
// ==================== アイテムエリア（全部表示） ====================
const itemsArea = document.getElementById('items');
if (itemsArea) {
    itemsArea.innerHTML = '';
    
    // グリッド設定（横10個）
    itemsArea.style.display = 'grid';
    itemsArea.style.gridTemplateColumns = 'repeat(10, 62px)';
    itemsArea.style.gap = '8px';
    itemsArea.style.justifyContent = 'center';
    itemsArea.style.padding = '15px';

    itemFiles.forEach(filename => {
        const itemName = filename.replace('.avif', '');  // 拡張子を除去

        const item = document.createElement('div');
        item.className = 'item';
        item.draggable = true;
        
item.innerHTML = `
    <img src="./img/item/${filename}" 
         alt="${itemName}" 
         style="width:100%; height:100%; object-fit:contain;"
         onerror="this.style.display='none'; 
                  this.parentElement.textContent='?'">
`;
        
        // ドラッグ時のデータ
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'item', 
                icon: itemName        // 拡張子なしで渡す
            }));
        });
        
        itemsArea.appendChild(item);
    });
}


// === ベンチに全チャンピオンを表示 ===
// === ベンチに全チャンピオンを表示 ===
const bench = document.getElementById('bench');
if (bench) {
    bench.innerHTML = '';
    bench.style.display = 'grid';
    bench.style.gridTemplateColumns = 'repeat(5, 72px)';
    bench.style.gap = '8px';
    bench.style.justifyContent = 'center';

    championFiles.forEach(filename => {
        const name = filename.replace('.avif', '');
        
        const p = document.createElement('div');
        p.className = 'piece';
        p.draggable = true;
        
        p.innerHTML = `
            <div style="position:relative; width:100%; height:100%;">
                <img src="./img/champ/17/${filename}" 
                     alt="${name}" 
                     style="width:100%; height:100%; object-fit:contain; border-radius:8px;">
                    <div style="position:absolute; bottom:5px; left:0; right:0; 
                        text-align:center; color:white; font-size:15px; 
                        text-shadow: 0 0 4px black; pointer-events:none;
                        white-space: nowrap; overflow: hidden; 
                        text-overflow: ellipsis; padding: 0 4px;">
                      ${name}
                    </div>
            </div>
        `;

        // ベンチ内並び替え + 盤面へ移動用のドラッグ
        p.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', name);
            p.classList.add('dragging-hidden');
            window.currentDragSourceBench = p;   // ベンチ用ソース
        });

        p.addEventListener('dragend', () => {
            p.classList.remove('dragging-hidden');
        });

        bench.appendChild(p);
    });

    // ベンチ自体にドロップイベントを追加（並び替え用）
    bench.addEventListener('dragover', e => e.preventDefault());
    bench.addEventListener('drop', e => {
        e.preventDefault();
        const name = e.dataTransfer.getData('text/plain');
        if (!name) return;

        // ベンチ内の並び替え処理
        const draggedPiece = window.currentDragSourceBench;
        if (draggedPiece && draggedPiece.parentElement === bench) {
            const targetPiece = e.target.closest('.piece');
            
            if (targetPiece && targetPiece !== draggedPiece) {
                // 並び替え
                const pieces = Array.from(bench.children);
                const fromIndex = pieces.indexOf(draggedPiece);
                const toIndex = pieces.indexOf(targetPiece);
                
                if (fromIndex < toIndex) {
                    bench.insertBefore(draggedPiece, targetPiece.nextSibling);
                } else {
                    bench.insertBefore(draggedPiece, targetPiece);
                }
            }
        }
        window.currentDragSourceBench = null;
    });
}

    
// アイテムエリアにドロップイベントを追加（並び替え用）
itemsArea.addEventListener('dragover', e => e.preventDefault());
// 盤面外ドロップ（削除・解除）
document.addEventListener('drop', (e) => {
    const isOverBoard = e.target.closest('#board');
    
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (rawData) {
            const data = JSON.parse(rawData);

            // アイテムを盤面外にドラッグ → 解除
            if (data.type === 'item' && data.sourceSlot && !isOverBoard) {
                data.sourceSlot.remove();
            }

            // チャンピオンを盤面外にドラッグ → 削除
            else if (!isOverBoard && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        }
    } catch (err) {}
});

window.currentDragSource = null;
window.currentDragSourceBench = null;
}

init();