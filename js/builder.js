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
    const currentLv = data.lv || container.dataset.lv || '0';

    // 共通データ構造
    container.dataset.type = 'champ';
    container.dataset.name = champName;
    container.dataset.text = champName;
    container.dataset.color = data.color || '#222';
    container.dataset.size = data.size || 'M';
    container.dataset.lv = currentLv;   // Lvを保持

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
        
        <!-- Lv表示 -->
        <div class="lv-display" style="${currentLv !== '0' ? 'display:block' : 'display:none'}">Lv${currentLv}</div>
    `;

    // 星
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // Lv切り替え（右クリック）
    const lvDisplay = champ.querySelector('.lv-display');
    let currentLvNum = parseInt(currentLv) || 3;

    champ.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentLvNum = (currentLvNum % 8) + 3;
        if (currentLvNum > 10) {
            currentLvNum = 0;
            lvDisplay.style.display = 'none';
            container.dataset.lv = '0';
        } else {
            lvDisplay.textContent = `Lv${currentLvNum}`;
            lvDisplay.style.display = 'block';
            container.dataset.lv = currentLvNum;
        }
    });

    // アイテムコンテナなど（省略せず残す）
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
        if (rawData) {
            const data = JSON.parse(rawData);

            if (data.type === 'champ') {
                const source = window.currentDragSource || window.currentDragSourceBench;
                if (!source || source === hex) return;

                const isFromBench = source.closest && source.closest('#bench');

                // ★★★ 最新のデータを確実に取得 ★★★
                const sourceChampElement = source.querySelector('.champ');
                
                const sourceData = {
                    type: 'champ',
                    icon: sourceChampElement ? sourceChampElement.dataset.name : (data.icon || ''),
                    stars: sourceChampElement ? (sourceChampElement.dataset.stars || "1") : (data.stars || "1"),
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

                source.innerHTML = '';
                hex.innerHTML = '';

                if (targetData) placeChampion(source, targetData);
                placeChampion(hex, sourceData);   // ← ここをsourceDataに変更

                window.currentDragSource = null;
                window.currentDragSourceBench = null;
                return;
            }

            // BOXは盤面に置けない
            if (data.type === 'box') return;

            // アイテム
            if (data.type === 'item' && data.icon) {
                const itemsContainer = hex.querySelector('.items-container');
                if (!itemsContainer || Array.from(itemsContainer.children).length >= 3) return;

                if (data.sourceSlot) data.sourceSlot.remove();
                addItemSlot(itemsContainer, data.icon);
            }
        }
    } catch (err) {
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

// 空マス編集関数
let selectedColorTemp = ''; // 選択中の色を一時保持

// 共通表示更新関数（チャンピオン＋空マス対応）
function updatePieceDisplay(slot) {
    if (!slot) return;

    const textDiv = slot.querySelector('.empty-text, .champ-name-onboard');
    if (!textDiv) return;

    const displayText = slot.dataset.text || slot.dataset.name || '';
    textDiv.innerHTML = displayText.replace(/\n/g, '<br>');

    textDiv.style.color = '#ffffff';
    textDiv.style.fontWeight = 'bold';
    textDiv.style.textAlign = 'center';
    textDiv.style.lineHeight = '1.15';
    textDiv.style.textShadow = '3px 3px 5px #000';

    const sizeMap = { 'LL': '23px', 'L': '16px', 'M': '12.5px', 'S': '9.5px' };
    textDiv.style.fontSize = sizeMap[slot.dataset.size] || '12.5px';

    slot.style.display = 'flex';
    slot.style.alignItems = 'center';
    slot.style.justifyContent = 'center';
    slot.style.overflow = 'hidden';
}

// 編集モーダル呼び出し
function editEmptySlot(slot) {
    window.editingSlot = slot;
    const colorOptions = ['#2a2a3a', '#00000000', '#ffffff', '#1d1dad', '#ff2d55', '#ff9500', '#ffcc00', '#ffeb3b', '#32ff7e', '#00f0ff', '#d2a5e3'];
    
    let html = `
        <div id="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;">
            <div style="padding:20px; min-width:320px; background:#1f1f2e; border:2px solid #555; border-radius:8px; color:white;">
                <h3 style="margin-top:0;">空マス編集</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px;">
                    ${colorOptions.map(c => `
                        <div class="color-option" onclick="selectColor(this, '${c}')" 
                             style="width:35px;height:35px;background:${c};border:3px solid ${slot.dataset.color===c?'#ff2d55':'#fff'};cursor:pointer;border-radius:4px;">
                        </div>
                    `).join('')}
                </div>
                <p>テキスト (改行OK):</p>
                <textarea id="emptyText" style="width:100%; height:60px; padding:8px; background:#333; color:white; border:1px solid #555;">${slot.dataset.text || ''}</textarea>
                <p>サイズ:</p>
                <select id="emptySize" style="width:100%; padding:8px; background:#333; color:white;">
                    <option value="LL" ${slot.dataset.size==='LL'?'selected':''}>LL</option>
                    <option value="L" ${slot.dataset.size==='L'?'selected':''}>L</option>
                    <option value="M" ${slot.dataset.size==='M'?'selected':''}>M</option>
                    <option value="S" ${slot.dataset.size==='S'?'selected':''}>S</option>
                </select>
                <div style="text-align:right; margin-top:15px;">
                    <button onclick="this.closest('#modal-overlay').remove()" style="margin-right:10px; padding:8px 16px;">キャンセル</button>
                    <button onclick="saveEmptySlot()" style="padding:8px 20px; background:#ff2d55; color:white; border:none; border-radius:4px; cursor:pointer;">保存</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
}

window.selectColor = function(el, color) {
    selectedColorTemp = color;
    document.querySelectorAll('.color-picker-item').forEach(item => item.style.border = '2px solid #fff');
    el.style.border = '3px solid #ff2d55';
};

window.closeModal = function() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
};

window.saveEmptySlot = function() {
    const slot = window.editingSlot;
    if (!slot) return;

    const textValue = document.getElementById('emptyText').value;
    const sizeValue = document.getElementById('emptySize').value;

    // データ属性の更新
    slot.dataset.text = textValue;
    slot.dataset.size = sizeValue;
    slot.dataset.color = selectedColorTemp;
    
    // 見た目の更新
    slot.style.backgroundColor = selectedColorTemp;
    updateEmptySlotDisplay(slot);

    closeModal();
};

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
        bench.style.gridTemplateColumns = 'repeat(10, 54px)';
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

        // ==================== Box画像（空箱代わり） ====================
        const boxFiles = [
            'Gray.avif','Gray.avif','Gray.avif','Gray.avif','Gray.avif',
            'Gray.avif','Gray.avif','Gray.avif','Gray.avif','Gray.avif',
            'A.avif', 'B.avif', 'C.avif', 'D.avif', 'E.avif',
            'F.avif', 'G.avif', 'LightGray.avif', 'Black.avif'
        ];

        boxFiles.forEach(filename => {
            const boxName = filename.replace('.avif', '');
            const box = document.createElement('div');
            box.className = 'piece box-slot';
            box.draggable = true;
            box.style.width = '50px';
            box.style.height = '50px';

            box.innerHTML = `
                <img src="./img/box/${filename}" 
                     alt="${boxName}" 
                     style="width:100%; height:100%; object-fit:contain;">
            `;

            box.dataset.type = 'box';
            box.dataset.name = boxName;

            box.addEventListener('dragstart', e => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'box',
                    icon: boxName
                }));
                box.classList.add('dragging-hidden');
            });

            box.addEventListener('dragend', () => box.classList.remove('dragging-hidden'));

            // 右クリックで解除
            box.addEventListener('contextmenu', e => {
                e.preventDefault();
                box.remove();
            });

            bench.appendChild(box);
        });

        setupBenchSortable(bench);
    }



    window.currentDragSource = null;
    window.currentDragSourceBench = null;



     // ========== 盤面外ドロップで解除 ==========
    // ========== 盤面外（#boardの外）にドロップしたら解除 ==========
    document.addEventListener('drop', (e) => {
        // #board, #bench, #items の上なら無視
        if (e.target.closest('#board') || 
            e.target.closest('#bench') || 
            e.target.closest('#items')) {
            return;
        }

        console.log("🗑️ 盤面外ドロップ検知 → 解除処理");

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            
            const data = JSON.parse(rawData);

            // アイテム解除
            if (data.type === 'item' && data.sourceSlot) {
                data.sourceSlot.remove();
                console.log("✅ アイテム解除完了");
            }

            // チャンピオン / BOX解除
            if ((data.type === 'champ' || data.type === 'box') && window.currentDragSource) {
                if (window.currentDragSource) {
                    window.currentDragSource.innerHTML = '';
                    console.log("✅ チャンピオン/BOX解除完了");
                }
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

        console.log(`スワップ: ${dragged.dataset.type || 'empty'} ↔ ${target.dataset.type || 'empty'}`);

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

        // 表示更新
        updatePieceDisplay(dragged);
        updatePieceDisplay(target);
    });
}

init();

// 空マス表示更新関数
function updateEmptySlotDisplay(slot) {
    const textDiv = slot.querySelector('.empty-text');
    if (!textDiv) return;
    
    const text = slot.dataset.text || '';
    textDiv.textContent = text;
    
    // サイズに応じたスタイル（後で調整）
    if (slot.dataset.size === 'LL') textDiv.style.fontSize = '18px';
    else if (slot.dataset.size === 'L') textDiv.style.fontSize = '14px';
    else if (slot.dataset.size === 'S') textDiv.style.fontSize = '9px';
    else textDiv.style.fontSize = '11px';
}