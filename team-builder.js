const rows = [7, 7, 7, 7];
const builderState = [];
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
let curPalette = 'c';
const items = (window.itemFiles || []).map(name => `img/item/${name}`);


window.addEventListener('load', () => {
  initBuilderState();
  buildBoard();
  loadChampions();
  renderPalette();
  updateSelectedInfo();
});

function initBuilderState() {
  const total = rows.reduce((sum, count) => sum + count, 0);
  for (let i = 0; i < total; i++) {
    builderState[i] = { champ: null, stars: 0, items: [] };
  }
}

function loadChampions() {
  fetch('tft17-champions.json')
    .then(response => response.json())
    .then(data => {
      champions = data.champions;
      renderPalette();
    })
    .catch(error => console.error('Champion JSON load failed:', error));
}




function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  for (let i = 0; i < 28; i++) {
    const slot = document.createElement('div');
    slot.className = 'hex-slot';
    slot.dataset.index = i;

    // クリックやドロップのイベント設定[cite: 2]
    slot.onclick = () => selectSlot(i);
    slot.ondragover = (e) => { e.preventDefault(); slot.classList.add('dragover'); };
    slot.ondragleave = () => slot.classList.remove('dragover');
    slot.ondrop = (e) => onDropSlot(e, i);

    // ★ ここがポイント：崩れない内部構造をJSで生成
    slot.innerHTML = `
      <div class="hex-inner">
        <div class="champ-display"></div>  <!-- チャンピオン表示用 -->
        <div class="items-container"></div> <!-- アイテム表示用 -->
      </div>
    `;

    board.appendChild(slot);
  }
}

// ドラッグ開始：スロット全体のデータを保持
function handleDragStart(event) {
  const index = event.currentTarget.parentElement.dataset.index;
  const state = builderState[index];
  if (!state.champ) return;

  event.dataTransfer.setData('application/json', JSON.stringify({
    sourceIndex: index,
    state: state
  }));
  // ドラッグ中のゴースト画像を見やすく設定
  event.dataTransfer.effectAllowed = 'move';
}

// ドロップ処理：中身のデータだけを入れ替えて再描画
function onDropSlot(event, targetIndex) {
  event.preventDefault();
  const data = JSON.parse(event.dataTransfer.getData('application/json'));
  const sourceIndex = data.sourceIndex;

  if (sourceIndex === targetIndex) return;

  // データの入れ替え（元の場所とターゲット）
  const temp = builderState[targetIndex];
  builderState[targetIndex] = builderState[sourceIndex];
  builderState[sourceIndex] = temp;

  // 再描画（DOM構造は変えず、画像やテキストのみ更新）
  renderSlot(sourceIndex);
  renderSlot(targetIndex);
}

// 描画関数：innerHTMLを壊さず、特定の要素のプロパティだけ変える
function renderSlot(index) {
  const slot = document.querySelector(`.hex-slot[data-index='${index}']`);
  const champDisp = slot.querySelector('.champ-display');
  const itemCont = slot.querySelector('.items-container');
  const state = builderState[index];

  if (state.champ) {
    champDisp.style.backgroundImage = `url('${state.champ.file}')`;
    // アイテムの描画
    itemCont.innerHTML = state.items.map(item => `<img src="${item}">`).join('');
  } else {
    champDisp.style.backgroundImage = 'none';
    itemCont.innerHTML = '';
  }
}

// ドラッグ開始時（データを正しくセット）
function handleInnerDragStart(event) {
  const slot = event.target.closest('.hex-slot');
  if (!slot) return;
  const index = parseInt(slot.dataset.index);
  const state = builderState[index];
  if (!state.champ) return;

  const payload = {
    type: 'slot',
    index: index,
    champ: state.champ,
    stars: state.stars,
    items: state.items
  };

  event.dataTransfer.setData('application/json', JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'move';

  // 元の位置を少し遅らせてクリア（視覚的に自然に）
  setTimeout(() => {
    builderState[index] = { champ: null, stars: 0, items: [] };
    renderSlot(index);
  }, 10);
}


function renderBoard() {
  builderState.forEach((state, index) => renderSlot(index));
}



  starBox.innerHTML = '';
  if (state.stars > 0) {
    for (let i = 0; i < state.stars; i++) {
      const star = document.createElement('span');
      star.className = 'hex-star';
      star.textContent = '★';
      starBox.appendChild(star);
    }
  }

  itemsBox.innerHTML = '';
  state.items.forEach((item, itemIndex) => {
    const icon = document.createElement('img');
    icon.src = item;
    icon.alt = `Item ${itemIndex + 1}`;
    icon.title = '右クリックで削除';
    icon.className = 'hex-item-icon';
    icon.addEventListener('contextmenu', event => removeItem(event, index, itemIndex));
    itemsBox.appendChild(icon);
  });
}


function handleInnerContextmenu(event, index) {
  event.preventDefault();
  builderState[index] = { champ: null, stars: 0, items: [] };
  if (selectedSlot === index) selectedChampion = null;
  renderSlot(index);
  updateSelectedInfo();
}

function renderPalette() {
  const palette = document.getElementById('palette-grid');
  if (!palette) return;
  palette.innerHTML = '';

  if (curPalette === 'c') {
    renderChampionPalette(palette);
  } else if (curPalette === 'i') {
    renderItemPalette(palette);
  } else {
    renderPlaceholderPalette(palette, curPalette);
  }
}

function setPalette(t) {
  curPalette = t;
  document.querySelectorAll('.p-tab').forEach(b => b.classList.toggle('active', b.id === 'tab-' + t));
  renderPalette();
}

function renderChampionPalette(palette) {
  champions.forEach(champ => {
    const button = document.createElement('button');
    button.className = 'champ-card';
    button.type = 'button';
    button.addEventListener('click', () => selectChampion(champ));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      addChampionToBoard(champ);
    });
    button.addEventListener('dragstart', event => onDragChampion(event, champ.name));
    button.draggable = true;

    const image = document.createElement('img');
    image.src = champ.file;
    image.alt = champ.name;
    image.className = 'champ-thumb';

    const name = document.createElement('span');
    name.textContent = champ.name;
    name.className = 'champ-name';

    button.appendChild(image);
    button.appendChild(name);
    palette.appendChild(button);
  });
}

function renderItemPalette(palette) {
  items.forEach(item => {
    const button = document.createElement('button');
    button.className = 'item-card';
    button.type = 'button';
    button.addEventListener('click', () => addItemToSelected(item));
    button.addEventListener('dragstart', event => onDragItem(event, item));
    button.draggable = true;

    const image = document.createElement('img');
    image.src = item;
    image.alt = item;
    image.className = 'item-thumb';

    button.appendChild(image);
    palette.appendChild(button);
  });
}

function renderPlaceholderPalette(palette, type) {
  const label = document.createElement('div');
  label.className = 'text-zinc-400 p-4 text-sm';
  label.textContent = type === 'a' ? 'AUGアイテムはまだ未実装です。' : 'GODアイテムはまだ未実装です。';
  palette.appendChild(label);
}

function selectSlot(index, assignChampion = true) {
  selectedSlot = index;
  if (assignChampion && selectedChampion) {
    builderState[index].champ = selectedChampion;
    if (builderState[index].stars === 0) builderState[index].stars = 1;
    renderSlot(index);
  }
  updateSelectedInfo();
  renderBoard();
}

function selectChampion(champ) {
  selectedChampion = champ;
  if (selectedSlot !== null) {
    builderState[selectedSlot].champ = champ;
    if (builderState[selectedSlot].stars === 0) builderState[selectedSlot].stars = 1;
    renderSlot(selectedSlot);
    const next = findNextEmptySlot(selectedSlot);
    if (next !== null) selectSlot(next, false);
  } else {
    addChampionToBoard(champ);
  }
  updateSelectedInfo();
}

function setStars(value) {
  if (selectedSlot === null) return;
  builderState[selectedSlot].stars = value;
  renderSlot(selectedSlot);
  updateSelectedInfo();
}

function addItemToSelected(item) {
  if (selectedSlot === null) return;
  const state = builderState[selectedSlot];
  if (!state.champ) return;
  if (state.items.length >= 3) return;
  state.items.push(item);
  renderSlot(selectedSlot);
}

function removeItem(event, slotIndex, itemIndex) {
  event.preventDefault();
  const state = builderState[slotIndex];
  if (!state || !state.items[itemIndex]) return;
  state.items.splice(itemIndex, 1);
  renderSlot(slotIndex);
}

function clearSlot(event, index) {
  event.preventDefault();
  builderState[index] = { champ: null, stars: 0, items: [] };
  if (selectedSlot === index) selectedChampion = null;
  renderSlot(index);
  updateSelectedInfo();
}

function clearSelectedSlot() {
  if (selectedSlot === null) return;
  builderState[selectedSlot] = { champ: null, stars: 0, items: [] };
  selectedChampion = null;
  renderSlot(selectedSlot);
  updateSelectedInfo();
}

function updateSelectedInfo() {
  const label = document.getElementById('selected-slot-label');
  const info = document.getElementById('selected-champion-info');
  if (!label || !info) return;

  if (selectedSlot === null) {
    label.textContent = 'スロットが選択されていません。';
    info.textContent = 'なし';
    return;
  }

  label.textContent = `スロット ${selectedSlot + 1} が選択されています。`;
  const state = builderState[selectedSlot];
  if (!state.champ) {
    info.textContent = 'このスロットにはチャンピオンが配置されていません。チャンピオンを選択してください。';
    return;
  }

  const itemText = state.items.length > 0 ? `アイテム ${state.items.length}個` : 'アイテムなし';
  info.innerHTML = `<strong>${state.champ.name}</strong><br>星: ${state.stars || 0} / ${itemText}`;
}

function sel(slotElement) {
  if (!slotElement || !slotElement.dataset || slotElement.dataset.index === undefined) return;
  const index = parseInt(slotElement.dataset.index, 10);
  if (Number.isNaN(index)) return;
  selectSlot(index);
}

function fill(src, name = '') {
  if (selectedSlot === null) return;
  const state = builderState[selectedSlot];
  if (curPalette === 'i') {
    if (!state.champ) return;
    if (state.items.length >= 3) return;
    state.items.push(src);
    renderSlot(selectedSlot);
    updateSelectedInfo();
    return;
  }

  const champ = champions.find(c => c.file === src || c.name === name) || { file: src, name: name || 'Custom', description: '', role: '', traits: [] };
  state.champ = champ;
  if (state.stars === 0) state.stars = 1;
  renderSlot(selectedSlot);
  updateSelectedInfo();
}

function insertSymbol(symbol) {
  if (selectedSlot === null) return;
  const state = builderState[selectedSlot];
  state.champ = { file: '', name: symbol, description: '', role: 'symbol', traits: [] };
  state.stars = 0;
  state.items = [];
  renderSlot(selectedSlot);
  updateSelectedInfo();
}

function changeSelectedSlotSize(size) {
  // GuideビルダーのUIと一致させるためのボタンを表示するために存在します。
}

function addChampionToBoard(champ) {
  if (selectedSlot !== null) {
    selectedChampion = champ;
    builderState[selectedSlot].champ = champ;
    if (builderState[selectedSlot].stars === 0) builderState[selectedSlot].stars = 1;
    renderSlot(selectedSlot);
    const next = findNextEmptySlot(selectedSlot);
    if (next !== null) selectSlot(next, false);
    updateSelectedInfo();
    return;
  }
  const target = getFirstEmptySlot();
  if (target !== null) {
    selectedSlot = target;
    selectedChampion = champ;
    builderState[target].champ = champ;
    builderState[target].stars = 1;
    renderSlot(target);
    const next = findNextEmptySlot(target);
    if (next !== null) selectSlot(next, false);
    updateSelectedInfo();
  }
}

function getFirstEmptySlot() {
  // 盤面左下（row 3）から左から右へ探して、埋まっていれば上の行へ移動
  for (let row = rows.length - 1; row >= 0; row--) {
    const rowStart = rows.slice(0, row).reduce((sum, count) => sum + count, 0);
    const rowEnd = rowStart + rows[row];
    for (let i = rowStart; i < rowEnd; i++) {
      if (!builderState[i].champ) return i;
    }
  }
  return null;
}

function findNextEmptySlot(currentIndex) {
  for (let i = currentIndex + 1; i < builderState.length; i++) {
    if (!builderState[i].champ) return i;
  }
  return null;
}

function onDragItem(event, itemPath) {
  const payload = JSON.stringify({ type: 'item', item: itemPath });
  event.dataTransfer.setData('application/json', payload);
  event.dataTransfer.setData('text/plain', payload);
  event.dataTransfer.effectAllowed = 'copy';
}

function copyBuilderLink() {
  const state = builderState.map(slot => ({
    champ: slot.champ ? slot.champ.name : null,
    stars: slot.stars,
    items: slot.items
  }));
  const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ slots: state })))));
  const base = location.href.split('?')[0];
  const url = `${base}?builder=${payload}`;
  const input = document.getElementById('builder-link');
  input.value = url;
  navigator.clipboard.writeText(url).then(() => {
    document.getElementById('builder-copy-status').textContent = 'ビルダーリンクをクリップボードにコピーしました。';
  }).catch(() => {
    document.getElementById('builder-copy-status').textContent = 'リンクのコピーに失敗しました。手動でコピーしてください。';
  });
}

async function copyBoardImage() {
  const grid = document.getElementById('board-container');
  const canvas = await html2canvas(grid, { backgroundColor: '#000000', useCORS: true, scale: 2 });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (navigator.clipboard && navigator.clipboard.write) {
    const item = new ClipboardItem({ 'image/png': blob });
    try {
      await navigator.clipboard.write([item]);
      document.getElementById('builder-copy-status').textContent = '盤面画像をクリップボードにコピーしました。';
      return;
    } catch (err) {
      // fallback to download if clipboard write not allowed
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tft-builder-board.png';
  a.click();
  document.getElementById('builder-copy-status').textContent = '画像をダウンロードしました。';
}

function allowDrop(event) {
  event.preventDefault();
}

function onDragChampion(event, champName) {
  const payload = JSON.stringify({ type: 'champion', name: champName });
  event.dataTransfer.setData('application/json', payload);
  event.dataTransfer.setData('text/plain', payload);
  event.dataTransfer.effectAllowed = 'copy';
}

function onDragSlot(event, sourceIndex) {
  const state = builderState[sourceIndex];
  if (!state.champ) {
    event.preventDefault();
    return;
  }
  const payload = JSON.stringify({ type: 'slot', index: sourceIndex });
  event.dataTransfer.setData('application/json', payload);
  event.dataTransfer.setData('text/plain', payload);
  event.dataTransfer.effectAllowed = 'move';
}



// === シンプルドラッグ＆ドロップ版（上書き用）===
let builderState = []; // 必要なら既存のものと統合

const itemEmojis = ['⚔️','🛡️','🏹','🔥','❄️','🌩️','💎','🧪','👑'];

function initSimpleBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';
  board.style.display = 'grid';
  board.style.gridTemplateColumns = 'repeat(7, 1fr)';
  board.style.gap = '10px 5px';
  board.style.width = 'fit-content';
  board.style.margin = '0 auto';

  for (let i = 0; i < 28; i++) {
    const hex = document.createElement('div');
    hex.className = 'hex';
    hex.style.width = '88px';
    hex.style.height = '102px';
    hex.style.background = '#334455';
    hex.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    hex.style.display = 'flex';
    hex.style.flexDirection = 'column';
    hex.style.alignItems = 'center';
    hex.style.justifyContent = 'center';
    hex.style.position = 'relative';
    hex.style.cursor = 'pointer';

    if (i % 7 === 0 && Math.floor(i/7) % 2 === 1) {
      hex.style.marginTop = '51px';
    }

    hex.ondragover = e => { e.preventDefault(); hex.style.background = '#0a5'; };
    hex.ondragleave = () => hex.style.background = '#334455';
    hex.ondrop = e => handleDropOnHex(e, hex);

    board.appendChild(hex);
  }

  // ベンチ
  const bench = document.getElementById('bench');
  ['🐻','🐺','🐉','🦅','🐍','🦁'].forEach(icon => {
    const p = document.createElement('div');
    p.className = 'piece';
    p.style.width = '70px'; p.style.height = '70px';
    p.style.fontSize = '42px';
    p.style.background = '#222';
    p.style.border = '3px solid #666';
    p.style.borderRadius = '12px';
    p.style.display = 'flex';
    p.style.alignItems = 'center';
    p.style.justifyContent = 'center';
    p.draggable = true;
    p.textContent = icon;
    p.ondragstart = e => e.dataTransfer.setData('text/plain', icon);
    bench.appendChild(p);
  });

  // アイテムパレット
  const itemPal = document.getElementById('items-palette');
  itemEmojis.forEach(emo => {
    const i = document.createElement('div');
    i.style.fontSize = '32px';
    i.style.width = '52px';
    i.style.height = '52px';
    i.style.background = '#222';
    i.style.borderRadius = '10px';
    i.style.display = 'flex';
    i.style.alignItems = 'center';
    i.style.justifyContent = 'center';
    i.draggable = true;
    i.textContent = emo;
    i.ondragstart = e => e.dataTransfer.setData('text/plain', 'item:' + emo);
    itemPal.appendChild(i);
  });
}

// ドラッグ開始時に「どのスロットから」動かしたかを記録しておく
let dragSourceSlot = null;

function handleDragStart(e) {
    dragSourceSlot = e.currentTarget; // 動かし始めたスロットを保存
    // ...その他の処理（データのセットなど）
}

function handleDrop(e) {
    e.preventDefault();
    const targetSlot = e.currentTarget; // 重ねた先のスロット

    if (dragSourceSlot && dragSourceSlot !== targetSlot) {
        // 1. 移動先のデータを一時保存
        const targetData = {
            champ: targetSlot.dataset.champ,
            items: targetSlot.dataset.items 
        };

        // 2. 移動先にドラッグ元のデータをセット
        updateSlot(targetSlot, {
            champ: dragSourceSlot.dataset.champ,
            items: dragSourceSlot.dataset.items
        });

        // 3. ★ここが重要：元の位置を「移動先のデータ」で上書き（入れ替え）
        // 移動先が空だったなら、元の位置も空（null）になる
        updateSlot(dragSourceSlot, targetData);
        
        dragSourceSlot = null; // リセット
    }
}

// ページ読み込み時に実行
window.addEventListener('load', () => {
  // 既存の初期化はそのまま残して
  setTimeout(() => {
    initSimpleBoard();
  }, 800);
});