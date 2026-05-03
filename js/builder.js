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
        // ドラッグ開始時の親要素（マス）を確実に保持
        window.currentDragSource = champ.parentElement;

        // 現在の星の数を取得（未設定なら1）
        const currentStars = champ.dataset.stars || "1";

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: currentStars,
            // アイテムスロットからアイコンを取得
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        // 残像を残して本体を隠す
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

    // 数値として扱う
    let currentStars = parseInt(data.stars) || 1;

    // 1. チャンピオン本体
    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars; 
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    // 2. アイテム（星より下に配置するため先に作る）
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items) {
        data.items.forEach(icon => {
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    // 3. 星（.hexの直下。-17pxの位置調整などがCSSで効くようにする）
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星のクリック/ドラッグ判定
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

        // 星1(非)→2(★)→3(★★)→4(★★★)→5(★★★★)→1(非)
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    // まとめて追加（順番：下から アイコン -> アイテム -> 星）
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
            const targetChamp = hex.querySelector('.champ');

            if (targetChamp && source && source !== hex) {
                // --- 【スワップ実行】 ---
                // 移動先（target）の情報を一時保存
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,
                    stars: targetChamp.dataset.stars,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };

                // 1. 元の場所(source)に、移動先にいた駒を置く
                placeChampion(source, targetData);
                // 2. 移動先(hex)に、ドラッグしてきた駒を置く
                placeChampion(hex, data);
                
            } else {
                // --- 【通常移動】 ---
                if (source) source.innerHTML = '';
                placeChampion(hex, data);
            }
        } else if (data.type === 'item') {
            // アイテムドロップ処理
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                if (!hex.querySelector('.items-container')) {
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                if (itemsDiv.children.length < 3) {
                    document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                    addItemSlot(itemsDiv, data.icon);
                }
            }
        }
    } catch (err) {
        // ベンチからの新規配置
        const icon = e.dataTransfer.getData('text/plain');
        if (icon) placeChampion(hex, { icon: icon, stars: 1, items: [] });
    }
}

function init() {
    createBoard();
    
    const itemsArea = document.getElementById('items');
    if (itemsArea) {
        itemsArea.innerHTML = '';
        ITEM_LIST.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'item';
            item.textContent = icon;
            item.draggable = true;
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('application/json', JSON.stringify({type:'item', icon:icon}));
            });
            itemsArea.appendChild(item);
        });
    }

    const bench = document.getElementById('bench');
    if (bench) {
        bench.innerHTML = '';
        const champIcons = ['🐻','🐺','🐉','🦅','🐍','🦁'];
        champIcons.forEach(icon => {
            const p = document.createElement('div');
            p.className = 'piece';
            p.draggable = true;
            p.textContent = icon;
            p.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', icon));
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

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) throw new Error();
        const data = JSON.parse(rawData);

        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ');
            
            // 移動が確定したので元の場所をクリア
            const source = window.currentDragSource;
            if (source) source.innerHTML = '';

            if (targetChamp) {
                // 入れ替え先のデータ作成
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,
                    stars: parseInt(targetChamp.dataset.stars) || 1,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };
                placeChampion(source, targetData);
            }
            placeChampion(hex, data);
        } else if (data.type === 'item') {
            // アイテムドロップ処理（既存通り）
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
                if (!hex.querySelector('.items-container')) {
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                if (itemsDiv.children.length < 3) {
                    document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                    addItemSlot(itemsDiv, data.icon);
                }
            }
        }
    } catch (err) {
        // ベンチからの新規配置
        const icon = e.dataTransfer.getData('text/plain');
        if (icon) placeChampion(hex, { icon: icon, stars: 1, items: [] });
    }

    };
}

init();