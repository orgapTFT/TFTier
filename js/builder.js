/* builder.js - 完全修正版 */

// ==================== グローバル変数 ====================
window.currentDragSource = null;
window.currentDragSourceBench = null;

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    
    board.innerHTML = '';
    
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        hex.dataset.index = i;
        
        // ドラッグ&ドロップイベント
        hex.addEventListener('dragover', handleHexDragOver);
        hex.addEventListener('dragleave', handleHexDragLeave);
        hex.addEventListener('drop', e => handleHexDrop(e, hex));
        
        // 六角形内をクリック可能にする
        hex.addEventListener('click', e => e.stopPropagation());
        
        board.appendChild(hex);
    }
}

// ==================== HEX ドラッグ&ドロップ処理 ====================
function handleHexDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('dragover');
}

function handleHexDragLeave(e) {
    if (e.target === this) {
        this.classList.remove('dragover');
    }
}

function handleHexDrop(e, hex) {
    e.preventDefault();
    e.stopPropagation();
    hex.classList.remove('dragover');
    
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        
        const data = JSON.parse(rawData);
        
        // ====================== チャンピオン移動 ======================
        if (data.type === 'champ') {
            const sourceContainer = window.currentDragSource || window.currentDragSourceBench;
            
            if (!sourceContainer || sourceContainer === hex) {
                window.currentDragSource = null;
                window.currentDragSourceBench = null;
                return;
            }
            
            // 現在のデータを取得
            const sourceData = getChampionData(sourceContainer);
            const targetData = getChampionData(hex);
            
            // スワップ処理
            if (targetData) {
                placeChampion(sourceContainer, targetData);
            } else {
                sourceContainer.innerHTML = '';
            }
            
            if (sourceData) {
                placeChampion(hex, sourceData);
            }
            
            window.currentDragSource = null;
            window.currentDragSourceBench = null;
            return;
        }
        
        // ====================== アイテム移動 ======================
        if (data.type === 'item' && data.icon) {
            const champContainer = hex.querySelector('.champ-container');
            if (!champContainer) return; // チャンピオンがいない
            
            let itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                champContainer.appendChild(itemsContainer);
            }
            
            const currentItems = Array.from(itemsContainer.querySelectorAll('.item-slot'));
            
            if (currentItems.length < 3) {
                // 空きあり：追加
                addItemSlot(itemsContainer, data.icon);
            } else {
                // 満杯：マウス位置で判定して上書き
                const rect = itemsContainer.getBoundingClientRect();
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
                addItemSlot(itemsContainer, data.icon);
            }
            
            // 移動元のアイテムを削除
            if (data.sourceSlot && data.sourceSlot.parentElement) {
                data.sourceSlot.remove();
            }
            
            return;
        }
        
    } catch (err) {
        console.error('Drop error:', err);
    }
}

// ==================== スロット（四角）のドラッグ&ドロップ ====================
function setupSlotDragDrop(slot) {
    slot.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('dragover');
    });
    
    slot.addEventListener('dragleave', e => {
        if (e.target === slot) {
            slot.classList.remove('dragover');
        }
    });
    
    slot.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        slot.classList.remove('dragover');
        
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) {
                const plainData = e.dataTransfer.getData('text/plain');
                if (plainData && plainData.length < 50) {
                    placeAssetInSlot(slot, plainData, '');
                }
                return;
            }
            
            const data = JSON.parse(rawData);
            
            if (data.type === 'champ') {
                placeAssetInSlot(slot, data.icon, data.icon);
            } else if (data.type === 'item') {
                placeAssetInSlot(slot, data.icon, data.icon);
            } else if (data.type === 'aug') {
                placeAssetInSlot(slot, data.src, data.name);
            } else if (data.type === 'god') {
                placeAssetInSlot(slot, data.src, data.name);
            }
            
        } catch (err) {
            console.error('Slot drop error:', err);
        }
    });
}

function placeAssetInSlot(slot, src, name) {
    slot.innerHTML = `
        <img src="${src}" alt="${name}" draggable="false">
        <button class="rem-btn" onclick="event.stopPropagation(); clearSlotContent(this.parentElement);" style="display:none;">×</button>
    `;
    
    // ホバー時に削除ボタンを表示
    const remBtn = slot.querySelector('.rem-btn');
    slot.addEventListener('mouseenter', () => {
        if (remBtn) remBtn.style.display = 'flex';
    });
    slot.addEventListener('mouseleave', () => {
        if (remBtn) remBtn.style.display = 'none';
    });
    
    // AUG スロットなら画像を丸くクリップ
    if (slot.classList.contains('aug-slot')) {
        const img = slot.querySelector('img');
        if (img) {
            img.style.clipPath = 'circle(50%)';
            img.style.width = '120%';
            img.style.height = '120%';
            img.style.objectFit = 'cover';
        }
    }
}

function clearSlotContent(slot) {
    slot.innerHTML = '';
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
    
    // チャンピオンコンテナ
    const champContainer = document.createElement('div');
    champContainer.className = 'champ-container';
    
    // チャンピオン要素
    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars;
    champ.dataset.name = champName;
    
    champ.innerHTML = `
        <img src="./img/champ/17/${champName}.avif" 
             alt="${champName}" 
             class="champ-img"
             onerror="this.style.display='none';">
        <div class="champ-name-onboard">${champName}</div>
        <div class="lv-display" style="display:${currentLv >= 3 ? 'block' : 'none'}">Lv${currentLv}</div>
    `;
    
    // 星表示
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';
    
    // アイテムコンテナ
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(itemName => {
            if (itemName?.trim()) addItemSlot(itemsDiv, itemName.trim());
        });
    }
    
    // DOM構造
    champContainer.appendChild(champ);
    champContainer.appendChild(itemsDiv);
    champContainer.appendChild(starLabel);
    container.appendChild(champContainer);
    
    // ドラッグイベント
    addDragToChampion(champ, container);
    
    // クリックイベント
    champ.addEventListener('mousedown', e => {
        champ.dataset.clickX = e.screenX;
        champ.dataset.clickY = e.screenY;
    });
    
    champ.addEventListener('click', e => {
        e.stopPropagation();
        
        const moveX = Math.abs(e.screenX - (champ.dataset.clickX || 0));
        const moveY = Math.abs(e.screenY - (champ.dataset.clickY || 0));
        
        if (moveX > 5 || moveY > 5) return; // ドラッグと判定
        
        const rect = champ.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // 上部1/3をクリック：星の切り替え
        if (clickY < rect.height / 3) {
            let s = (parseInt(champ.dataset.stars) % 4) + 1;
            champ.dataset.stars = s;
            starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
            container.dataset.stars = s;
        } 
        // 下部2/3をクリック：Lvの切り替え
        else {
            let lvNum = parseInt(container.dataset.lv) || 3;
            if (lvNum >= 10) {
                lvNum = 3;
            } else {
                lvNum++;
            }
            container.dataset.lv = lvNum;
            const lvDisplay = champ.querySelector('.lv-display');
            if (lvDisplay) {
                lvDisplay.textContent = `Lv${lvNum}`;
                lvDisplay.style.display = lvNum >= 3 ? 'block' : 'none';
            }
        }
    });
}

// ==================== チャンピオンドラッグイベント ====================
function addDragToChampion(champ, container) {
    champ.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        
        window.currentDragSource = container;
        
        const data = {
            type: 'champ',
            icon: champ.dataset.name,
            stars: champ.dataset.stars || '1',
            items: Array.from(container.querySelectorAll('.item-slot'))
                .map(slot => slot.dataset.name),
            lv: container.dataset.lv || '0'
        };
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        setTimeout(() => champ.classList.add('dragging-hidden'), 0);
    });
    
    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
        window.currentDragSource = null;
    });
}

// ==================== アイテムスロット作成 ====================
function addItemSlot(container, iconName) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.draggable = true;
    slot.dataset.name = iconName;
    
    slot.innerHTML = `<img src="./img/item/${iconName}.avif" alt="${iconName}">`;
    
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        
        const data = {
            type: 'item',
            icon: iconName,
            sourceSlot: slot
        };
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        slot.classList.add('dragging-hidden');
    });
    
    slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging-hidden');
    });
    
    slot.addEventListener('contextmenu', e => {
        e.preventDefault();
        slot.remove();
    });
    
    container.appendChild(slot);
}

// ==================== ヘルパー関数 ====================
function getChampionData(container) {
    const champ = container.querySelector('.champ');
    if (!champ) return null;
    
    return {
        type: 'champ',
        icon: champ.dataset.name,
        stars: champ.dataset.stars || '1',
        items: Array.from(container.querySelectorAll('.item-slot')).map(s => s.dataset.name),
        lv: container.dataset.lv || '0'
    };
}

// ==================== 初期化 ====================
function init() {
    // ボード作成
    createBoard();
    
    // ベンチ作成
    const bench = document.getElementById('bench');
    if (bench && championFiles) {
        bench.innerHTML = '';
        
        championFiles.forEach(filename => {
            const name = filename.replace('.avif', '');
            
            const piece = document.createElement('div');
            piece.className = 'piece';
            piece.draggable = true;
            piece.dataset.name = name;
            
            piece.innerHTML = `
                <img src="./img/champ/17/${filename}" alt="${name}">
                <div class="champ-name">${name}</div>
            `;
            
            piece.addEventListener('dragstart', e => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'champ',
                    icon: name,
                    stars: '1',
                    items: [],
                    lv: '0'
                }));
                e.dataTransfer.setData('text/plain', name);
                
                window.currentDragSourceBench = piece;
                piece.classList.add('dragging-hidden');
            });
            
            piece.addEventListener('dragend', () => {
                piece.classList.remove('dragging-hidden');
                window.currentDragSourceBench = null;
            });
            
            bench.appendChild(piece);
        });
    }
    
    // スロット（四角）のドラッグ&ドロップ設定
    document.querySelectorAll('.slot').forEach(slot => {
        setupSlotDragDrop(slot);
    });
    
    // グローバルドラ��グオーバー
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => {
        if (e.target.closest('.hex') || e.target.closest('.slot')) return;
        e.preventDefault();
    });
}

// DOMContentLoaded 後に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
