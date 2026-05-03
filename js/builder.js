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
        if (!rawData) throw new Error("Go to catch"); // JSONデータがない場合は新規配置へ
        const data = JSON.parse(rawData);

        // --- チャンピオンの移動・スワップ ---
        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ');
            if (targetChamp && window.currentDragSource) {
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('div:last-child').innerHTML,
                    stars: targetChamp.dataset.stars,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };
                placeChampion(window.currentDragSource, targetData);
                placeChampion(hex, data);
            } else {
                placeChampion(hex, data);
            }
        } 
        // --- アイテムの移動・入れ替え ---
        else if (data.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (!existingChamp) {
                document.querySelectorAll('.dragging-hidden').forEach(el => el.classList.remove('dragging-hidden'));
                return;
            }

            let itemsDiv = hex.querySelector('.items') || document.createElement('div');
            itemsDiv.className = 'items';
            hex.appendChild(itemsDiv);

            // 同じマス内か、3枠空いている場合のみ移動許可
            if (itemsDiv.children.length < 3 || hex === document.querySelectorAll('.hex')[data.fromHexIndex]) {
                document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                addItemSlot(itemsDiv, data.icon);
            } else {
                document.querySelectorAll('.dragging-hidden').forEach(el => el.classList.remove('dragging-hidden'));
                alert("アイテム枠がいっぱいです");
            }
        }
    } catch (err) {
        // ★ここが重要：ベンチからの新規配置処理
        const icon = e.dataTransfer.getData('text/plain');
        if (icon) {
            // マスを掃除してから新しいチャンピオンを配置
            hex.innerHTML = ''; 
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

function createChampion(icon) {
    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = 1;
    champ.innerHTML = `<div class="star">★</div><div>${icon}</div>`;
    
    champ.querySelector('.star').addEventListener('click', (e) => {
        e.stopPropagation();
        let s = (parseInt(champ.dataset.stars) % 3) + 1;
        champ.dataset.stars = s;
        champ.querySelector('.star').textContent = '★'.repeat(s);
    });

    addDragToChampion(champ);
    return champ;
}

function init() {
    console.log("Builder Init...");
    createBoard();
    
    // アイテムパレットのロード
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

    // ★ここを追加：チャンピオン（ベンチ）のロード
    const bench = document.getElementById('bench'); // HTML側のIDに合わせてください
    if (bench) {
        bench.innerHTML = '';
        const champIcons = ['🐻','🐺','🐉','🦅','🐍','🦁']; // 表示したいキャラ
        champIcons.forEach(icon => {
            const p = document.createElement('div');
            p.className = 'piece'; // CSSで .piece の見た目を整えておいてください
            p.draggable = true;
            p.textContent = icon;
            // ベンチからのドラッグはシンプルにアイコン文字列を送るだけ
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

}

// 実行
init();