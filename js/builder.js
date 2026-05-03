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
        const currentStars = champ.dataset.stars || "1";

        const data = {
            type: 'champ',
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: currentStars,
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
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

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    if (data.items) {
        data.items.forEach(icon => {
            // addItemSlotが外部(main.js等)にある前提
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    let startX, startY;
    starLabel.addEventListener('mousedown', (e) => {
        startX = e.screenX; startY = e.screenY;
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

            if (source && source !== hex) {
                if (targetChamp) {
                    // スワップ実行
                    const targetData = {
                        type: 'champ',
                        icon: targetChamp.querySelector('.champ-icon').innerHTML,
                        stars: targetChamp.dataset.stars || 1,
                        items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                    };
                    source.innerHTML = '';
                    hex.innerHTML = '';
                    placeChampion(source, targetData);
                    placeChampion(hex, data);
                } else {
                    // 通常移動
                    source.innerHTML = '';
                    placeChampion(hex, data);
                }
            }
        } else if (data.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items-container');
                if (!itemsDiv) {
                    itemsDiv = document.createElement('div');
                    itemsDiv.className = 'items-container';
                    hex.appendChild(itemsDiv);
                }
                
                if (itemsDiv.querySelectorAll('.item-slot').length < 3) {
                    // 元の場所からアイテムを消す処理（移動の場合）
                    if (window.currentDragSource && window.currentDragSource.contains(document.querySelector('.dragging-hidden'))) {
                         // アイテム移動ロジックが必要な場合はここに追加
                    }
                    addItemSlot(itemsDiv, data.icon);
                }
            }
        }
    } catch (err) {
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 4) { // アイコン単体（ベンチ）の場合
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}

function init() {
    createBoard();
    
    // アイテムパレット
    const itemsArea = document.getElementById('items');
    if (itemsArea && typeof ITEM_LIST !== 'undefined') {
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

    // ベンチ
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

    // 全体ドロップ（場外削除）
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', (e) => {
        const isOverBoard = e.target.closest('#board');
        const isOverHex = e.target.closest('.hex');

        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        if (!isOverBoard) {
            // ボード外なら削除
            if (window.currentDragSource) {
                window.currentDragSource.innerHTML = '';
                window.currentDragSource = null;
            }
        }
    });
}

init();