/* builder.js - 完全なドラッグ&ドロップ実装 */

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    board.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const hex = document.createElement('div');
        hex.classList.add('hex');
        hex.dataset.index = i;
        
        // dragover: 色を緑に変更
        hex.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            hex.classList.add('dragover');
        });
        
        // dragleave: 色を戻す
        hex.addEventListener('dragleave', e => {
            // ネストされた要素から出た場合の防止
            if (e.target === hex) {
                hex.classList.remove('dragover');
            }
        });
        
        // drop: ドロップ処理
        hex.addEventListener('drop', e => handleHexDrop(e, hex));
        
        board.appendChild(hex);
    }
}

function handleHexDrop(e, hex) {
    e.preventDefault();
    e.stopPropagation();
    hex.classList.remove('dragover');
    
    try {
let data = null;

// =====================
// application/json 優先
// =====================
const rawData = e.dataTransfer.getData('application/json');

if (rawData) {

    try {
        data = JSON.parse(rawData);
    }
    catch(err) {
        console.error(err);
    }
}

// =====================
// fallback
// editor.js の drag 用
// =====================
if (!data) {

    const src = e.dataTransfer.getData('text/plain');
    const name = e.dataTransfer.getData('text/name');

    if (src || name) {

        const isChamp =
            src.includes('/champ/')
            || hex.classList.contains('hex');

        data = {
            type: isChamp ? 'champ' : 'item',
            icon: name || '',
            stars: '1',
            lv: '0',
            items: []
        };
    }
}

if (!data) return;
        
        // ===================== チャンピオン配置 =====================
        if (data.type === 'champ') {
            const source = window.currentDragSource;
            
            // ソースがあれば、ソースのデータを取得
            const sourceData = source ? getHexChampionData(source) : data;
            const targetData = hex.querySelector('.champ') ? getHexChampionData(hex) : null;
            
            // スワップ処理
            hex.innerHTML = '';
            if (source && source !== hex) {
                source.innerHTML = '';
                if (targetData) {
                    placeChampionOnHex(source, targetData);
                }
            }
            
            if (sourceData) {
                placeChampionOnHex(hex, sourceData);
            }
            
            window.currentDragSource = null;
            return;
        }
        
        // ===================== アイテム移動 =====================
        if (data.type === 'item' && data.icon) {
            const champDiv = hex.querySelector('.champ');
            if (!champDiv) return; // チャンピオンがいなければ何もしない
            
            let itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                hex.appendChild(itemsContainer);
            }
            
            const currentItems = Array.from(itemsContainer.querySelectorAll('.item-slot'));
            
            if (currentItems.length < 3) {
                // 空きあり
                addItemSlotToHex(itemsContainer, data.icon);
            } else {
                // 満杯時：マウス位置に最も近いアイテムと交換
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
                addItemSlotToHex(itemsContainer, data.icon);
            }
            
            return;
        }
        
    } catch (err) {
        console.error('HEX Drop error:', err);
    }
}

function placeChampionOnHex(hex, data) {
    if (!hex || !data) return;

    hex.innerHTML = '';

    const champName = data.icon || data.name || '';
    const currentStars = parseInt(data.stars) || 1;
    const currentLv = parseInt(data.lv) || 0;

    // =============================
    // CHAMP生成
    // =============================
    const champ = document.createElement('div');

    champ.className = 'champ';
    champ.draggable = true;

    champ.dataset.stars = currentStars;
    champ.dataset.name = champName;
    champ.dataset.lv = currentLv;

    champ.innerHTML = `
        <img class="champ-img"
             src="./img/champ/17/${champName}.avif"
             alt="${champName}"
             draggable="false"
             onerror="this.style.display='none';">

        <div class="champ-name-onboard">${champName}</div>

        <div class="lv-display"
             style="display:${currentLv >= 3 ? 'block' : 'none'}">
             Lv${currentLv}
        </div>
    `;

    // =============================
    // DRAG START
    // =============================
    champ.addEventListener('dragstart', e => {

        e.stopPropagation();

        window.currentDragSource = hex;

        e.dataTransfer.effectAllowed = 'move';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'champ',
            icon: champName,
            stars: champ.dataset.stars,
            lv: champ.dataset.lv,
            items: Array.from(
                hex.querySelectorAll('.item-slot')
            ).map(s => s.dataset.name)
        }));
    });

    // =============================
    // CLICK
    // =============================
    champ.addEventListener('click', e => {

        e.stopPropagation();

        const rect = champ.getBoundingClientRect();
        const clickY = e.clientY - rect.top;

        // 上半分 = 星
        if (clickY < rect.height * 0.4) {

            let s = (parseInt(champ.dataset.stars) % 4) + 1;

            champ.dataset.stars = s;

            const starLabel = hex.querySelector('.star');

            if (starLabel) {
                starLabel.textContent =
                    s > 1 ? '★'.repeat(s - 1) : '';
            }
        }

        // 下半分 = Lv
        else if (clickY > rect.height * 0.6) {

            let lv = parseInt(champ.dataset.lv) || 3;

            lv = lv >= 10 ? 3 : lv + 1;

            champ.dataset.lv = lv;

            const lvDisplay = champ.querySelector('.lv-display');

            if (lvDisplay) {

                if (lv >= 3) {
                    lvDisplay.textContent = `Lv${lv}`;
                    lvDisplay.style.display = 'block';
                } else {
                    lvDisplay.style.display = 'none';
                }
            }
        }
    });

    // =============================
    // RIGHT CLICK DELETE
    // =============================
    champ.addEventListener('contextmenu', e => {

        e.preventDefault();

        hex.innerHTML = '';
    });

    // =============================
    // APPEND
    // =============================
    hex.appendChild(champ);

    // STAR
    const starLabel = document.createElement('div');

    starLabel.className = 'star';

    starLabel.textContent =
        currentStars > 1
            ? '★'.repeat(currentStars - 1)
            : '';

    hex.appendChild(starLabel);

    // ITEMS
    const itemsDiv = document.createElement('div');

    itemsDiv.className = 'items-container';

    if (data.items && Array.isArray(data.items)) {

        data.items.forEach(itemName => {

            if (itemName?.trim()) {
                addItemSlotToHex(itemsDiv, itemName.trim());
            }
        });
    }

    hex.appendChild(itemsDiv);
}

function addItemSlotToHex(container, iconName) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.dataset.name = iconName;
    slot.draggable = true;
    
    slot.innerHTML = `<img src="./img/item/${iconName}.avif" alt="${iconName}" onerror="this.style.display='none';">`;
    
    slot.addEventListener('dragstart', e => {
        e.stopImmediatePropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'item',
            icon: iconName
        }));
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

function getHexChampionData(hex) {
    const champ = hex.querySelector('.champ');
    if (!champ) return null;
    return {
        type: 'champ',
        icon: champ.dataset.name,
        stars: champ.dataset.stars || '1',
        lv: champ.dataset.lv || '0',
        items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.dataset.name)
    };
}

function setupBenchDragDrop() {
    const bench = document.getElementById('bench');
    if (!bench) return;
    
    bench.addEventListener('dragover', e => e.preventDefault());
    
    // ベンチからのドラッグ
    bench.addEventListener('dragstart', e => {
        if (e.target.classList.contains('piece')) {
            const name = e.target.dataset.name || e.target.querySelector('.champ-name')?.textContent || '';
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'champ',
                icon: name,
                stars: '1',
                lv: '0',
                items: []
            }));
            window.currentDragSource = null;
            e.target.classList.add('dragging-hidden');
        }
    }, true);
}

function setupSlotDragDrop() {

    document.addEventListener('dragover', e => {

        // Hexはbuilder側に任せる
        if (e.target.closest('.hex')) return;

        const slot = e.target.closest('.slot, .god-slot, .aug-slot');

        if (slot) {

            e.preventDefault();

            const parent =
                slot.classList.contains('god-slot')
                    ? slot.closest('.god-wrap')
                    : slot;

            parent.classList.add('dragover');
        }
    });

    document.addEventListener('dragleave', e => {

        // Hexはbuilder側に任せる
        if (e.target.closest('.hex')) return;

        const slot = e.target.closest('.slot, .god-slot, .aug-slot');

        if (slot) {

            const parent =
                slot.classList.contains('god-slot')
                    ? slot.closest('.god-wrap')
                    : slot;

            if (e.target === slot || e.target === parent) {
                parent.classList.remove('dragover');
            }
        }
    });

    document.addEventListener('drop', e => {

        // =========================
        // HEX は builder.js に任せる
        // =========================
        if (e.target.closest('.hex')) return;

        const slot = e.target.closest('.slot, .god-slot, .aug-slot');

        const godWrap = e.target.closest('.god-wrap');

        const targetSlot = godWrap || slot;

        if (!targetSlot) return;

        e.preventDefault();
        e.stopPropagation();

        targetSlot.classList.remove('dragover');

        try {

            const rawData =
                e.dataTransfer.getData('application/json');

            const src =
                e.dataTransfer.getData('text/plain');

            const name =
                e.dataTransfer.getData('text/name') || '';

            if (rawData) {

                const data = JSON.parse(rawData);

                if (data.src) {
                    fillSlot(targetSlot, data.src, name);
                }

            } else if (src) {

                fillSlot(targetSlot, src, name);
            }

        } catch (err) {

            console.error('Slot drop error:', err);
        }
    });
}

function fillSlot(slot, src, name = '') {
    slot.innerHTML = `<img src="${src}" alt="" onerror="this.style.display='none';">`;
    if (slot.classList.contains('god-slot')) {
        const label = slot.closest('.god-wrap')?.querySelector('.god-name-label');
        if (label) label.textContent = name.split('.')[0] || '';
    }
}



function init() {
    createBoard();
    setupBenchDragDrop();
    setupSlotDragDrop();
    
    // グローバルドラッグ終了
    document.addEventListener('dragend', e => {
        document.querySelectorAll('.dragging-hidden').forEach(el => {
            el.classList.remove('dragging-hidden');
        });
        document.querySelectorAll('.dragover').forEach(el => {
            el.classList.remove('dragover');
        });
    });
}

// DOMContentLoaded で実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}