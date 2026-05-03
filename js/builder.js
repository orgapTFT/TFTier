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

        // 【重要】星の数は champ.dataset.stars から確実に取得
        const currentStars = champ.dataset.stars || "1";

const data = {
    type: 'champ',
    icon: champ.dataset.name || champ.querySelector('img')?.alt || champName,  // 名前を渡す
    stars: currentStars,
    items: Array.from(parent.querySelectorAll('.item-slot')).map(s => s.innerHTML)
};
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => {
            if(champ) champ.classList.add('dragging-hidden');
        }, 10);
    });

    champ.addEventListener('dragend', () => {
        champ.classList.remove('dragging-hidden');
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; 

    const currentStars = parseInt(data.stars) || 1;
    const champName = data.icon;   // ← ここが名前になっているはず

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars; 
    champ.dataset.name = champName;    // 念のため保存

    // 画像表示
    champ.innerHTML = `
        <img src="./img/champ/17/${champName}.avif" 
             alt="${champName}" 
             class="champ-icon"
             style="width:88%; height:88%; object-fit:contain;"
             onerror="this.style.display='none'; this.parentElement.innerHTML += '<span style=\"font-size:45px; opacity:0.6\">${champName}</span>';">

        <!-- 盤面用チャンピオン名 -->
        <div class="champ-name-onboard">
            ${champName}
        </div>
    `;

    // 星の要素（そのまま）
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星クリック処理（省略せず残す）
    let startX, startY;
    starLabel.addEventListener('mousedown', (e) => { startX = e.screenX; startY = e.screenY; });
    starLabel.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        const diffX = Math.abs(e.screenX - startX);
        const diffY = Math.abs(e.screenY - startY);
        if (diffX > 5 || diffY > 5) return;

        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    // items-container
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items && Array.isArray(data.items) && typeof addItemSlot === 'function') {
        data.items.forEach(iconHTML => {
            if (iconHTML && iconHTML.trim() !== '') {
                addItemSlot(itemsDiv, iconHTML);
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

if (data.type === 'champ') {
    const source = window.currentDragSource;
    if (!source || source === hex) return;

    const targetChamp = hex.querySelector('.champ');
    const targetItems = Array.from(hex.querySelectorAll('.item-slot'))
                          .map(s => s.innerHTML);

    // 元の場所のデータを確実に保存
    const sourceData = {
        type: 'champ',
        icon: source.querySelector('.champ')?.dataset.name || 
              source.querySelector('img')?.alt || '',
        stars: source.querySelector('.champ')?.dataset.stars || "1",
        items: Array.from(source.querySelectorAll('.item-slot')).map(s => s.innerHTML)
    };

    source.innerHTML = '';

    if (targetChamp) {
        placeChampion(source, {
            type: 'champ',
            icon: targetChamp.dataset.name || targetChamp.querySelector('img')?.alt || '',
            stars: targetChamp.dataset.stars || "1",
            items: targetItems
        });
    }

    placeChampion(hex, data);   // ドラッグしてきた方を置く

    window.currentDragSource = null;
}
        else if (data.type === 'item') {
            // ==================== アイテム装備処理 ====================
            const champ = hex.querySelector('.champ');
            if (!champ) return; // チャンプがいなければ何もしない

            let itemsContainer = hex.querySelector('.items-container');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                // items-containerをchampの後ろに挿入
                if (champ.nextSibling) {
                    hex.insertBefore(itemsContainer, champ.nextSibling);
                } else {
                    hex.appendChild(itemsContainer);
                }
            }

            // 最大3個まで
            if (itemsContainer.children.length < 3) {
                if (typeof addItemSlot === 'function') {
                    addItemSlot(itemsContainer, data.icon);
                }
            }
        }
    } catch (err) {
        // Benchからチャンプを直接置く場合
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 10) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

function addItemSlot(container, iconName) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    
    slot.innerHTML = `
        <img src="./img/item/${iconName}.avif" 
             alt="${iconName}" 
             style="width:100%; height:100%; object-fit:contain;">
    `;

    slot.dataset.name = iconName;   // ツールチップ用

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
                 onerror="this.style.display='none'; this.parentElement.textContent='?'">
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
// === ベンチ（右側・5列）===
const bench = document.getElementById('bench');
if (bench) {
    bench.innerHTML = '';
    bench.style.display = 'grid';
    bench.style.gridTemplateColumns = 'repeat(5, 72px)';  // 横5体
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
                <div style="position:absolute; bottom:4px; left:0; right:0; 
                            text-align:center; color:white; font-size:11px; 
                            text-shadow: 0 0 4px black; pointer-events:none;">
                    ${name}
                </div>
            </div>
        `;
        
        p.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', name);
        });
        
        bench.appendChild(p);
    });
}

    
    // 盤面外ドロップ（削除）の判定
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', (e) => {
    const isOverBoard = e.target.closest('#board'); // 盤面エリア全体
    const isOverHex = e.target.closest('.hex');     // 六角形のマス

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    const data = JSON.parse(rawData);

    if (!isOverBoard) {
        // 1. 盤面の完全外側なら「削除」
        if (window.currentDragSource) {
            window.currentDragSource.innerHTML = '';
            window.currentDragSource = null;
        }
    } else if (isOverBoard && !isOverHex) {
        // 2. 盤面エリア内だが、マスの上ではない（隙間）なら「元の場所に戻す」
        // 何もしないことで、dragend後のhidden解除により元の場所に見えるようになる
        console.log("盤面内の隙間なのでキャンセル");
    }
});
}

init();