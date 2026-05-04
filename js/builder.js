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

        // ====================== チャンピオン移動・スワップ ======================
        if (data.type === 'champ') {
            const source = window.currentDragSource;
            if (!source || source === hex) return;

            // ターゲット（移動先）の現在の情報を保存
            const targetChamp = hex.querySelector('.champ');
            let targetData = null;

            if (targetChamp) {
                targetData = {
                    type: 'champ',
                    icon: targetChamp.dataset.name || '',
                    stars: targetChamp.dataset.stars || "1",
                    items: Array.from(hex.querySelectorAll('.item-slot'))
                                .map(s => s.dataset.name || '')
                };
            }

            // 元の場所のデータを保存
            const sourceData = {
                type: 'champ',
                icon: source.querySelector('.champ')?.dataset.name || data.icon,
                stars: source.querySelector('.champ')?.dataset.stars || data.stars || "1",
                items: Array.from(source.querySelectorAll('.item-slot'))
                            .map(s => s.dataset.name || '')
            };

            // 元の場所をクリア
            source.innerHTML = '';

            // スワップ処理
            if (targetData) {
                placeChampion(source, targetData);
            }

            // ドラッグしてきたチャンピオンを移動先へ
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

            // ① 同じチャンピオン内でスワップ
            if (draggedSlot && itemsContainer.contains(draggedSlot)) {
                const targetSlot = e.target.closest('.item-slot');
                if (targetSlot && targetSlot !== draggedSlot) {
                    // シンプルにinnerHTMLとdatasetを交換
                    const tempHTML = draggedSlot.innerHTML;
                    const tempName = draggedSlot.dataset.name;

                    draggedSlot.innerHTML = targetSlot.innerHTML;
                    draggedSlot.dataset.name = targetSlot.dataset.name;

                    targetSlot.innerHTML = tempHTML;
                    targetSlot.dataset.name = tempName;
                }
                return;
            }

            // ② 別のチャンピオンへ移動（空きがあれば）
            if (itemsContainer.children.length < 3) {
                addItemSlot(itemsContainer, data.icon);
                if (draggedSlot) draggedSlot.remove();  // 元のアイテムを削除
            }
        }
    } catch (err) {
        // Benchから直接ドロップ
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
        sourceSlot: slot
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


// === ベンチ（7列 + 小さめアイコン）===
const bench = document.getElementById('bench');
if (bench) {
    bench.innerHTML = '';
    bench.style.display = 'grid';
    bench.style.gridTemplateColumns = 'repeat(7, 54px)';
    bench.style.gap = '6px';
    bench.style.justifyContent = 'center';
    bench.style.padding = '20px 40px';   // 左右スペース

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
                <div style="position:absolute; bottom:4px; left:0; right:0; 
                    text-align:center; color:white; font-size:11.5px; 
                    text-shadow: 0 0 4px black; pointer-events:none;
                    white-space: nowrap; overflow: hidden; 
                    text-overflow: ellipsis; padding: 0 2px;">
                  ${name}
                </div>
            </div>
        `;

        // ドラッグ設定
        p.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', name);
            p.classList.add('dragging-hidden');
            window.currentDragSourceBench = p;
        });

        p.addEventListener('dragend', () => p.classList.remove('dragging-hidden'));

        bench.appendChild(p);
    });

    // ====================== 空欄追加 ======================
    for (let i = 0; i < 28; i++) {        // 28個の空欄（4行分くらい）
        const empty = document.createElement('div');
        empty.className = 'piece empty-slot';
        empty.style.width = '50px';
        empty.style.height = '50px';
        empty.style.background = '#1a1a2a';
        empty.style.border = '2px dashed #555';
        empty.style.opacity = '0.5';
        
        bench.appendChild(empty);
    }
}

// アイテムエリアの並び替え（強化版）
itemsArea.addEventListener('dragover', e => e.preventDefault());
itemsArea.addEventListener('drop', e => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    
    try {
        const data = JSON.parse(rawData);
        if (data.type !== 'item') return;

        const draggedItem = Array.from(itemsArea.querySelectorAll('.item'))
            .find(item => item.querySelector('img')?.alt === data.icon);

        const targetItem = e.target.closest('.item');

        if (draggedItem && targetItem && draggedItem !== targetItem) {
            const children = Array.from(itemsArea.children);
            const fromIdx = children.indexOf(draggedItem);
            const toIdx = children.indexOf(targetItem);

            if (fromIdx < toIdx) {
                itemsArea.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                itemsArea.insertBefore(draggedItem, targetItem);
            }
        }
    } catch (err) {
        console.log("アイテム並び替えエラー", err);
    }
});

window.currentDragSource = null;
window.currentDragSourceBench = null;
}

init();