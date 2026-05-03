function createBoard() {
    const board = document.getElementById('board');
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
        window.currentDragSource = champ.parentElement; // 元の場所を記録

        const data = {
            type: 'champ',
            icon: champ.querySelector('div:last-child').innerHTML,
            stars: champ.dataset.stars,
            items: Array.from(window.currentDragSource.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        // ドラッグ中は元の場所を空にする（スワップに失敗した場合はあとで戻る）
        setTimeout(() => { if(champ.parentElement) champ.parentElement.innerHTML = ''; }, 10);
    });
}

function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; // マスを掃除
    const newChamp = createChampion(data.icon);
    newChamp.dataset.stars = data.stars;
    newChamp.querySelector('.star').textContent = '★'.repeat(data.stars);

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items';
    if (data.items) {
        data.items.forEach(icon => addItemSlot(itemsDiv, icon));
    }
    container.appendChild(newChamp);
    container.appendChild(itemsDiv);
}

function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) throw new Error("No Data");
        const data = JSON.parse(rawData);

        if (data.type === 'champ') {
            // 移動先に既に駒がいるか確認
            const targetChamp = hex.querySelector('.champ');
            if (targetChamp && window.currentDragSource) {
                // スワップ：移動先の駒データを取得
                const targetData = {
                    type: 'champ',
                    icon: targetChamp.querySelector('div:last-child').innerHTML,
                    stars: targetChamp.dataset.stars,
                    items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
                };
                // 1. 元の場所にターゲットを配置
                placeChampion(window.currentDragSource, targetData);
                // 2. 現在の場所にドラッグしてきた駒を配置
                placeChampion(hex, data);
            } else {
                // 通常移動
                placeChampion(hex, data);
            }
        } else if (data.type === 'item') {
            const existingChamp = hex.querySelector('.champ');
            if (existingChamp) {
                let itemsDiv = hex.querySelector('.items') || document.createElement('div');
                itemsDiv.className = 'items';
                hex.appendChild(itemsDiv);
                if (itemsDiv.children.length < 3) addItemSlot(itemsDiv, data.icon);
            }
        }
    } catch (err) {
        // ベンチからの新規配置など
        const icon = e.dataTransfer.getData('text/plain') || '🐻';
        placeChampion(hex, { icon: icon, stars: 1, items: [] });
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
    createBoard();
    
    // アイテムパレットのロード（ITEM_LISTを使用）
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

  init();