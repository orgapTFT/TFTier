  function createBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 0; i < 28; i++) {  // 4行×7列
      const hex = document.createElement('div');
      hex.classList.add('hex');
      hex.addEventListener('dragover', e => { e.preventDefault(); hex.classList.add('dragover'); });
      hex.addEventListener('dragleave', () => hex.classList.remove('dragover'));
      hex.addEventListener('drop', e => handleDrop(e, hex));
      board.appendChild(hex);
    }
  }

  function createChampion(icon = '🐻') {
    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = 1;
    champ.innerHTML = `
      <div class="star">★</div>
      <div>${icon}</div>
    `;

    // 星クリック
    champ.querySelector('.star').addEventListener('click', (e) => {
      e.stopPropagation();
      let s = parseInt(champ.dataset.stars);
      s = s >= 4 ? 1 : s + 1;
      champ.dataset.stars = s;
      champ.querySelector('.star').textContent = '★'.repeat(s);
    });

    addDragToChampion(champ);
    return champ;
  }

function addDragToChampion(champ) {
  champ.addEventListener('dragstart', e => {
    const hex = champ.parentElement;
    window.currentDragSource = hex; // 元の場所をグローバルに保存

    const data = {
      type: 'champ',
      icon: champ.querySelector('div:last-child').innerHTML,
      stars: champ.dataset.stars,
      items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
    };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    
    // 消去を少し遅らせる（スワップ判定が終わるまで残すため）
    setTimeout(() => { 
      if (hex.innerHTML === champ.parentElement.innerHTML) { // まだ中身が変わってなければ
        hex.innerHTML = ''; 
      }
    }, 50);
  });
}

  function handleDrop(e, hex) {
  e.preventDefault();
  hex.classList.remove('dragover');

  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));

    if (data.type === 'champ') {
      // --- スワップ実装のキモ ---
      // 1. ドロップ先（今ここ）に既に駒がいるかキープ
      const targetChamp = hex.querySelector('.champ');
      let targetData = null;
      if (targetChamp) {
        targetData = {
          type: 'champ',
          icon: targetChamp.querySelector('div:last-child').innerHTML,
          stars: targetChamp.dataset.stars,
          items: Array.from(hex.querySelectorAll('.item-slot')).map(s => s.innerHTML)
        };
      }

      // 2. ドロップ先を一旦空にして、移動してきた駒を配置
      hex.innerHTML = '';
      placeChampion(hex, data);

      // 3. もし移動先に駒がいたなら、ドラッグ開始地点（元の場所）にそれを配置
      if (targetData && window.currentDragSource) {
        placeChampion(window.currentDragSource, targetData);
      }
      // ------------------------
    }
    // ... アイテムの処理などはそのまま
  } catch (err) {
    // 新規配置など
  }
}

// 駒を配置する共通関数（スワップで使い回すため分離）
function placeChampion(container, data) {
  const newChamp = createChampion(data.icon);
  newChamp.dataset.stars = data.stars;
  newChamp.querySelector('.star').textContent = '★'.repeat(data.stars);
  
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'items';
  data.items.forEach(icon => addItemSlot(itemsDiv, icon));
  
  container.appendChild(newChamp);
  container.appendChild(itemsDiv);
}

  function addItemSlot(container, icon) {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.textContent = icon;
    container.appendChild(slot);
  }

  // 初期化
  function init() {
    createBoard();

    // チャンピオン
    const bench = document.getElementById('bench');
    ['🐻','🐺','🐉','🦅','🐍','🦁'].forEach(icon => {
      const p = document.createElement('div');
      p.className = 'piece';
      p.draggable = true;
      p.textContent = icon;
      p.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', icon));
      bench.appendChild(p);
    });

    // アイテム
    const itemsArea = document.getElementById('items');
    itemList.forEach(icon => {
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