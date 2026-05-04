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
    
    // 完全にクリアする前に一度保存（念のため）
    const oldItems = data.items || [];

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

    if (oldItems && Array.isArray(oldItems)) {
        oldItems.forEach(itemName => {
            if (itemName?.trim()) addItemSlot(itemsDiv, itemName.trim());
        });
    }

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel);

    addDragToChampion(champ);
    
    if (typeof setupSortable === 'function') {
        setupSortable(itemsDiv);
    }
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

                // 移動元を一時保存
                const sourceData = {
                    type: 'champ',
                    icon: source.querySelector('.champ')?.dataset.name || '',
                    stars: source.querySelector('.champ')?.dataset.stars || "1",
                    items: Array.from(source.querySelectorAll('.item-slot')).map(s => s.dataset.name)
                };

                const targetData = hex.querySelector('.champ') ? {
                    type: 'champ',
                    icon: hex.querySelector('.champ').dataset.name,
                    stars: hex.querySelector('.champ').dataset.stars || "1",
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.name)
                } : null;

                // クリアしてから配置（消滅防止）
                source.innerHTML = '';
                hex.innerHTML = '';

                if (targetData) placeChampion(source, targetData);
                placeChampion(hex, data);   // 移動元から来たデータを配置

                window.currentDragSource = null;
                window.currentDragSourceBench = null;
                return;
            }

            // アイテム装備
            if (data.type === 'item' && data.icon) {
                const itemsContainer = hex.querySelector('.items-container');
                if (!itemsContainer) return;
                if (Array.from(itemsContainer.children).length >= 3) return;

                if (data.sourceSlot) data.sourceSlot.remove();
                addItemSlot(itemsContainer, data.icon);
            }
        }
    } catch (err) {
        // ベンチからのシンプル移動
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



// 空マス表示
function updateEmptySlotDisplay(slot) {
    const textDiv = slot.querySelector('.empty-text');
    if (!textDiv) return;
    
    const text = slot.dataset.text || '';
    
    // 改行を尊重 + 長いテキストは自動折り返し
    textDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    // 真っ白 + くっきり
    textDiv.style.color = '#ffffff';
    textDiv.style.fontWeight = 'bold';
    textDiv.style.textAlign = 'center';
    textDiv.style.lineHeight = '1.15';
    textDiv.style.padding = '4px';
    textDiv.style.width = '100%';
    textDiv.style.height = '100%';
    textDiv.style.display = 'flex';
    textDiv.style.alignItems = 'center';
    textDiv.style.justifyContent = 'center';
    textDiv.style.overflowWrap = 'break-word';   // 長い単語も自動改行
    textDiv.style.wordBreak = 'break-all';       // 強制折り返し
    textDiv.style.whiteSpace = 'pre-wrap';       // 入力時の改行を尊重
    textDiv.style.textShadow = '3px 3px 5px #000, -2px -2px 4px #000';

    // サイズ設定
    const sizeMap = {
        'LL': '23px',   // 大きめ維持
        'L': '16px',
        'M': '12.5px',
        'S': '9.5px'
    };
    textDiv.style.fontSize = sizeMap[slot.dataset.size] || '12.5px';

    // 親要素設定
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
  // ==================== ベンチ ====================
    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        bench.style.display = 'grid';
        bench.style.gridTemplateColumns = 'repeat(7, 54px)';
        bench.style.gap = '2px';
        bench.style.justifyContent = 'center';
        bench.style.padding = '20px 30px';

        // 実際のチャンピオン（省略せずそのまま）
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

        // 空マス作成（そのまま）
        const emptyColors = [ /* ... あなたの色配列 ... */ ];

        for (let i = 0; i < 28; i++) {
            const empty = document.createElement('div');
            empty.className = 'piece empty-slot';
            empty.draggable = true;
            empty.style.width = '50px';
            empty.style.height = '50px';
            
            empty.dataset.color = emptyColors[i % emptyColors.length] || '#2a2a3a';
            empty.dataset.text = '';
            empty.dataset.size = 'M';
            empty.style.backgroundColor = empty.dataset.color;
            empty.style.border = '2px solid rgba(255,255,255,0.2)';

            empty.addEventListener('contextmenu', e => {
                e.preventDefault();
                editEmptySlot(empty);
            });

            const textDiv = document.createElement('div');
            textDiv.className = 'empty-text';
            textDiv.style.pointerEvents = 'none';
            empty.appendChild(textDiv);
            
            updateEmptySlotDisplay(empty);
            bench.appendChild(empty);
        }

        // ★★★ ここを追加 ★★★
        setupSortable(itemsArea);        // アイテムエリア用
        setupBenchSortable(bench);       // ベンチ専用スワップ用

    

      
    }

    window.currentDragSource = null;
    window.currentDragSourceBench = null;



     // ========== 盤面外ドロップで解除 ==========
    document.addEventListener('drop', (e) => {
        if (e.target.closest('#board') || e.target.closest('#bench') || e.target.closest('#items')) {
            return;
        }

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            // アイテム解除
            if (data.type === 'item' && data.sourceSlot) {
                data.sourceSlot.remove();
            }

            // チャンピオン解除
            if (data.type === 'champ' && window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        } catch (err) {}
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
        
        const dragged = Array.from(bench.children).find(el => 
            el.classList.contains('dragging-hidden')
        );
        if (!dragged) return;
        dragged.classList.remove('dragging-hidden');

        const target = e.target.closest('.piece');
        if (!target || target === dragged) return;

        console.log("✅ ベンチ専用スワップ実行");

        // 完全スワップ
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

        // 空マス表示更新
        if (dragged.classList.contains('empty-slot')) updateEmptySlotDisplay(dragged);
        if (target.classList.contains('empty-slot')) updateEmptySlotDisplay(target);
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