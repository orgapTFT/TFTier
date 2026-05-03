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
            icon: champ.querySelector('.champ-icon').innerHTML,
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

    let currentStars = parseInt(data.stars) || 1;

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars; 
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    // 星の要素
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

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

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items) {
        data.items.forEach(icon => {
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    // 重なり順：下から チャンピョン -> アイテム -> 星
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
        const data = JSON.parse(rawData); // これがドラッグ中の「駒A」のデータ

        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ'); // 今そこにいる「駒B」
            const source = window.currentDragSource; // 駒Aが元いた場所

            if (!source) return; // ソースがない場合は中断

            if (targetChamp && source !== hex) {
                // --- 【STEP 1: 駒Bのデータをダミー変数に退避】 ---
                const dummyData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML, // アイコンHTMLを保持[cite: 4]
                    stars: targetChamp.dataset.stars || 1, // 星の数を保持[cite: 4]
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.textContent) // アイテムの文字だけ抽出
                };

                // --- 【STEP 2: 両方のマスを一旦クリア（ダミーマス化）】 ---
                source.innerHTML = ''; // 駒Aの場所を更地にする[cite: 4]
                hex.innerHTML = '';    // 駒Bの場所を更地にする[cite: 4]

                // --- 【STEP 3: データを入れ替えて再配置】 ---
                placeChampion(source, dummyData); // 元のAの場所に、退避したBを配置[cite: 4]
                placeChampion(hex, data);         // 新しいBの場所に、ドラッグしたAを配置[cite: 4]

            } else if (source !== hex) {
                // 通常移動：移動元を空にしてから配置[cite: 4]
                source.innerHTML = '';
                placeChampion(hex, data);
            }
        } else if (data.type === 'item') {
            // アイテムのドロップ処理
            handleItemDropLogic(hex, data);
        }
    } catch (err) {
        // ベンチからの新規ドロップ
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 4) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });[cite: 4]
        }
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