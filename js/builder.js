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
            icon: champ.querySelector('.champ-icon').innerHTML,
            stars: champ.dataset.stars,
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        // ドラッグ開始時に元の場所を消すと、場外ドロップの判定ができないため
        // クラス付与のみ行い、削除は drop イベント側で行う
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
    
    const starText = currentStars > 1 ? '★'.repeat(currentStars) : '';
    
    champ.innerHTML = `
        <div class="star">${starText}</div>
        <div class="champ-icon">${data.icon}</div>
    `;

    const starLabel = champ.querySelector('.star');
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

        // 星1(非表示)→2(★)→3(★★)→4(★★★)→5(★★★★)→1(非表示)
        let s = (parseInt(champ.dataset.stars) % 5) + 1;
        champ.dataset.stars = s;
        starLabel.textContent = s > 1 ? '★'.repeat(s - 1) : '';
    });

    starLabel.addEventListener('click', (e) => e.stopPropagation());

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(icon => {
            if (typeof addItemSlot === 'function') addItemSlot(itemsDiv, icon);
        });
    }

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    addDragToChampion(champ);
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) throw new Error("Go to catch"); 
        const data = JSON.parse(rawData);

        if (data.type === 'champ') {
            const targetChamp = hex.querySelector('.champ');
            
            // 移動が確定したので元の場所をクリア
            if (window.currentDragSource) window.currentDragSource.innerHTML = '';

            if (targetChamp) {
                // スワップ処理
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('.champ-icon').innerHTML,
                    stars: parseInt(targetChamp.dataset.stars) || 1,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };
                placeChampion(window.currentDragSource, targetData);
            }
            placeChampion(hex, data);
        } 
        else if (data.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (!existingChamp) return;

            let itemsDiv = hex.querySelector('.items-container') || document.createElement('div');
            if (!hex.querySelector('.items-container')) {
                itemsDiv.className = 'items-container';
                hex.appendChild(itemsDiv);
            }

            if (itemsDiv.children.length < 3) {
                // 移動成功時のみ元のアイテムを消す
                document.querySelectorAll('.dragging-hidden').forEach(el => el.remove());
                addItemSlot(itemsDiv, data.icon);
            }
        }
    } catch (err) {
        const icon = e.dataTransfer.getData('text/plain');
        if (icon) {
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
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

    // 盤面外ドロップ判定
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', (e) => {
        // ドロップ先が「ボード（#board）」そのものか、その外側なら削除とみなす
        const isOnBoardContent = e.target.closest('.hex');
        
        if (!isOnBoardContent) {
            const rawData = e.dataTransfer.getData('application/json');
            if (rawData) {
                const data = JSON.parse(rawData);
                // 盤面外（マスの隙間含む）に落としたら元の場所を空にする
                if (window.currentDragSource) {
                    window.currentDragSource.innerHTML = '';
                    window.currentDragSource = null;
                }
            }
        }
    });
}

init();