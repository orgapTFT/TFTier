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
        window.currentDragSource = champ.parentElement;

        const data = {
            type: 'champ',
            icon: champ.querySelector('div:last-child').innerHTML,
            stars: champ.dataset.stars,
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setTimeout(() => { if(champ.parentElement) champ.parentElement.innerHTML = ''; }, 10);
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; 

    // チャンピオン本体（背景画像的な扱い）
    const newChamp = createChampion(data.icon);
    newChamp.dataset.stars = data.stars;
    newChamp.querySelector('.star').textContent = '★'.repeat(data.stars);

    // アイテムコンテナ（チャンピオンの上に重ねる）
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container'; // クラス名を変更
    if (data.items) {
        data.items.forEach(icon => addItemSlot(itemsDiv, icon));
    }
    
    container.appendChild(newChamp);
    container.appendChild(itemsDiv); // あとから追加して上に重ねる
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
    const icon = e.dataTransfer.getData('text/plain');
    if (icon) {
        // 直接 innerHTML をいじらず、必ず placeChampion を通す
        placeChampion(hex, { 
            icon: icon, 
            stars: 1, 
            items: [] 
        });
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

document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', e => {
    // もしドロップ先が .hex 以外なら
    if (!e.target.closest('.hex')) {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);
        
        if (data.type === 'item') {
            // ドラッグ中のアイテム（元の場所のやつ）を削除して解除成立
            document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
            console.log("枠外ドロップでアイテム解除");
        }
    }
});

}

// 実行
init();