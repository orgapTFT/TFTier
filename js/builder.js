/* builder.js - 盤面ドラッグ＆ドロップシステム */

// グローバル変数
window.currentDragSource = null;
window.currentDragSourceBench = null;

/* ===================== 盤面生成 ===================== */
function createBoard() {
    const board = document.getElementById('board');
    if (!board) {
        console.error('board element not found');
        return;
    }
    
    board.innerHTML = '';
    
    // 28個の六角形を生成
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        hex.dataset.hexIndex = i;
        
        // ドラッグイベント
        hex.addEventListener('dragover', e => {
            e.preventDefault();
            hex.classList.add('dragover');
        });
        
        hex.addEventListener('dragleave', () => {
            hex.classList.remove('dragover');
        });
        
        hex.addEventListener('drop', e => handleDrop(e, hex));
        
        board.appendChild(hex);
    }
}

/* ===================== チャンピオン配置 ===================== */
function placeChampion(hex, data) {
    if (!hex || !data) return;
    
    hex.innerHTML = '';
    
    const champName = data.icon || data.name || '';
    const stars = parseInt(data.stars) || 0;
    const lv = parseInt(data.lv) || 0;
    const items = data.items || [];
    
    // チャンピオン要素
    const champDiv = document.createElement('div');
    champDiv.className = 'champ';
    champDiv.draggable = true;
    champDiv.dataset.champName = champName;
    champDiv.dataset.stars = stars;
    champDiv.dataset.lv = lv;
    
    // 画像
    const img = document.createElement('img');
    img.src = `./img/champ/17/${champName}.avif`;
    img.alt = champName;
    img.className = 'champ-img';
    img.onerror = function() { this.style.display = 'none'; };
    
    // チャンピオン名
    const nameDiv = document.createElement('div');
    nameDiv.className = 'champ-name-onboard';
    nameDiv.textContent = champName;
    
    champDiv.appendChild(img);
    champDiv.appendChild(nameDiv);
    
    // 星表示
    const starDiv = document.createElement('div');
    starDiv.className = 'star';
    starDiv.textContent = stars > 0 ? '★'.repeat(stars) : '';
    champDiv.appendChild(starDiv);
    
    // Lv表示
    const lvDiv = document.createElement('div');
    lvDiv.className = 'lv-display';
    lvDiv.textContent = `Lv${lv}`;
    lvDiv.style.display = lv >= 3 ? 'block' : 'none';
    champDiv.appendChild(lvDiv);
    
    // アイテムコンテナ
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';
    
    if (items && items.length > 0) {
        items.forEach(itemName => {
            if (itemName?.trim()) {
                addItemSlot(itemsContainer, itemName.trim());
            }
        });
    }
    
    champDiv.appendChild(itemsContainer);
    hex.appendChild(champDiv);
    
    // ドラッグ・クリックイベント設定
    setupChampionEvents(champDiv, hex);
}

/* ===================== チャンピオンイベント ===================== */
function setupChampionEvents(champDiv, hex) {
    // ドラッグ開始
    champDiv.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        
        window.currentDragSource = hex;
        
        const data = {
            type: 'champ',
            icon: champDiv.dataset.champName,
            stars: champDiv.dataset.stars,
            lv: champDiv.dataset.lv,
            items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.itemName)
        };
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        champDiv.classList.add('dragging-hidden');
    });
    
    champDiv.addEventListener('dragend', () => {
        champDiv.classList.remove('dragging-hidden');
    });
    
    // 右クリックで削除
    champDiv.addEventListener('contextmenu', e => {
        e.preventDefault();
        hex.innerHTML = '';
    });
    
    // クリックイベント（星・Lv切り替え）
    champDiv.addEventListener('click', e => {
        e.stopPropagation();
        const rect = champDiv.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // 上部30%で星切り替え
        if (clickY < rect.height * 0.3) {
            toggleStars(champDiv);
        }
        // その他の場所でLv切り替え
        else {
            toggleLevel(champDiv);
        }
    });
}

/* ===================== 星切り替え ===================== */
function toggleStars(champDiv) {
    let stars = parseInt(champDiv.dataset.stars) || 0;
    stars = (stars % 4) + 1;  // 0→1→2→3→4→1...
    
    champDiv.dataset.stars = stars;
    
    const starDiv = champDiv.querySelector('.star');
    if (starDiv) {
        starDiv.textContent = stars > 0 ? '★'.repeat(stars) : '';
    }
}

/* ===================== レベル切り替え ===================== */
function toggleLevel(champDiv) {
    let lv = parseInt(champDiv.dataset.lv) || 3;
    lv = lv >= 10 ? 3 : lv + 1;  // 3→4→5→...→10→3
    
    champDiv.dataset.lv = lv;
    
    const lvDiv = champDiv.querySelector('.lv-display');
    if (lvDiv) {
        lvDiv.textContent = `Lv${lv}`;
        lvDiv.style.display = lv >= 3 ? 'block' : 'none';
    }
}

/* ===================== アイテムスロット作成 ===================== */
function addItemSlot(container, itemName) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.draggable = true;
    slot.dataset.itemName = itemName;
    
    const img = document.createElement('img');
    img.src = `./img/item/${itemName}.avif`;
    img.alt = itemName;
    img.onerror = function() { this.parentElement.textContent = '?'; };
    
    slot.appendChild(img);
    
    // アイテムドラッグ開始
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        
        const data = {
            type: 'item',
            itemName: itemName,
            sourceHex: slot.closest('.hex')
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

/* ===================== ドロップ処理 ===================== */
function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');
    
    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) {
            // フォールバック：テキストデータ（ベンチから直接ドラッグ）
            const textData = e.dataTransfer.getData('text/plain');
            if (textData && textData.length < 30) {
                placeChampion(hex, { icon: textData, stars: 0, lv: 0, items: [] });
            }
            return;
        }
        
        const data = JSON.parse(rawData);
        
        // =============== チャンピオン移動 ===============
        if (data.type === 'champ') {
            const sourceHex = window.currentDragSource;
            
            if (!sourceHex || sourceHex === hex) {
                return;
            }
            
            // ドロップ先がチャンピオンを持っているかチェック
            const targetChamp = hex.querySelector('.champ');
            const sourceChamp = sourceHex.querySelector('.champ');
            
            if (sourceChamp) {
                // スワップ処理
                const sourceData = getChampionData(sourceHex);
                
                if (targetChamp) {
                    const targetData = getChampionData(hex);
                    placeChampion(sourceHex, targetData);
                }
                
                placeChampion(hex, sourceData);
            }
            
            window.currentDragSource = null;
            return;
        }
        
        // =============== アイテム移動 ===============
        if (data.type === 'item') {
            const sourceHex = data.sourceHex;
            const itemName = data.itemName;
            
            // ドロップ先にチャンピオンがいるか確認
            const champDiv = hex.querySelector('.champ');
            if (!champDiv) {
                return;
            }
            
            // ドロップ先のアイテムコンテナ取得
            let itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                champDiv.appendChild(itemsContainer);
            }
            
            const currentItems = Array.from(itemsContainer.querySelectorAll('.item-slot'));
            
            // ソースのアイテムを削除
            if (sourceHex && sourceHex !== hex) {
                const sourceItemsContainer = sourceHex.querySelector('.items-container');
                if (sourceItemsContainer) {
                    const sourceSlots = Array.from(sourceItemsContainer.querySelectorAll('.item-slot'));
                    const sourceSlot = sourceSlots.find(s => s.dataset.itemName === itemName);
                    if (sourceSlot) sourceSlot.remove();
                }
            }
            
            // 3つまで装備可能
            if (currentItems.length < 3) {
                addItemSlot(itemsContainer, itemName);
            } else {
                // 満杯時：マウスに最も近いアイテムとスワップ
                const rect = itemsContainer.getBoundingClientRect();
                const dropX = e.clientX - rect.left;
                
                let closestIndex = 0;
                let minDistance = Infinity;
                
                currentItems.forEach((item, index) => {
                    const itemRect = item.getBoundingClientRect();
                    const itemCenter = itemRect.left + itemRect.width / 2 - rect.left;
                    const distance = Math.abs(dropX - itemCenter);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });
                
                currentItems[closestIndex].remove();
                addItemSlot(itemsContainer, itemName);
            }
            
            return;
        }
        
    } catch (err) {
        console.error('Drop error:', err);
    }
}

/* ===================== チャンピオンデータ取得 ===================== */
function getChampionData(hex) {
    const champDiv = hex.querySelector('.champ');
    if (!champDiv) return null;
    
    return {
        type: 'champ',
        icon: champDiv.dataset.champName,
        stars: champDiv.dataset.stars || 0,
        lv: champDiv.dataset.lv || 0,
        items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.itemName)
    };
}

/* ===================== ベンチ・パレット初期化 ===================== */
function initBench() {
    const bench = document.getElementById('bench');
    if (!bench) return;
    
    bench.innerHTML = '';
    
    if (typeof championFiles === 'undefined') {
        console.error('championFiles not defined');
        return;
    }
    
    championFiles.forEach(filename => {
        const champName = filename.replace('.avif', '');
        
        const piece = document.createElement('div');
        piece.className = 'piece';
        piece.draggable = true;
        
        const img = document.createElement('img');
        img.src = `./img/champ/17/${filename}`;
        img.alt = champName;
        img.onerror = function() { this.style.display = 'none'; };
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'champ-name';
        nameLabel.textContent = champName;
        
        piece.appendChild(img);
        piece.appendChild(nameLabel);
        
        // ドラッグ開始
        piece.addEventListener('dragstart', e => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', champName);
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'champ',
                icon: champName,
                stars: 0,
                lv: 0,
                items: []
            }));
            piece.classList.add('dragging-hidden');
        });
        
        piece.addEventListener('dragend', () => {
            piece.classList.remove('dragging-hidden');
        });
        
        bench.appendChild(piece);
    });
}

function initPalette() {
    const paletteGrid = document.getElementById('palette-grid');
    if (!paletteGrid) return;
    
    paletteGrid.innerHTML = '';
    
    if (typeof itemFiles === 'undefined') {
        console.error('itemFiles not defined');
        return;
    }
    
    itemFiles.forEach(filename => {
        const itemName = filename.replace('.avif', '');
        
        const asset = document.createElement('div');
        asset.className = 'asset';
        asset.draggable = true;
        
        const img = document.createElement('img');
        img.src = `./img/item/${filename}`;
        img.alt = itemName;
        
        const label = document.createElement('span');
        label.textContent = itemName.substring(0, 15) + (itemName.length > 15 ? '...' : '');
        
        asset.appendChild(img);
        asset.appendChild(label);
        
        asset.addEventListener('dragstart', e => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'item',
                itemName: itemName,
                sourceHex: null
            }));
        });
        
        paletteGrid.appendChild(asset);
    });
}

/* ===================== 初期化 ===================== */
function init() {
    // グローバルドラッグ設定
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => {
        if (!e.target.closest('.hex')) {
            e.preventDefault();
        }
    });
    
    // 盤面生成
    createBoard();
    
    // ベンチ初期化
    initBench();
    
    // パレット初期化
    initPalette();
}

// DOM読み込み完了時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
