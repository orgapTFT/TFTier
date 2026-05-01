const rows = [7, 7, 7, 7];
const builderState = {};
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
let curPalette = 'c'; // 初期値を設定
const items = (window.itemFiles || []).map(name => `img/item/${name}`);


window.addEventListener('load', () => {
  initBuilderState();
  buildBoard();
  loadChampions();
  renderPalette();
  updateSelectedInfo();
});

function initBuilderState() {
  const rowLabels = ['A', 'B', 'C', 'D'];
  rows.forEach((count, rowIndex) => {
    for (let col = 1; col <= count; col++) {
      const coord = rowLabels[rowIndex] + col;
      builderState[coord] = { champ: null, stars: 0, items: [] };
    }
  });
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
  const boardGrid = document.getElementById('board-grid');
  boardGrid.innerHTML = '';
  const rowLabels = ['A', 'B', 'C', 'D'];

  rows.forEach((count, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'hex-row';
    if (rowIndex % 2 === 1) row.classList.add('offset');

    for (let cell = 0; cell < count; cell++) {
      const coord = rowLabels[rowIndex] + (cell + 1);
      const slot = document.createElement('div');
      slot.className = 'hex-slot';
      slot.dataset.coord = coord;
      slot.addEventListener('click', () => selectSlot(coord));
      slot.addEventListener('contextmenu', event => clearSlot(event, coord));
      slot.addEventListener('dragover', allowDrop);
      slot.addEventListener('drop', event => onDropSlot(event, coord));

      const inner = document.createElement('div');
      inner.className = 'hex-inner';
      inner.setAttribute('draggable', 'false');
      inner.addEventListener('dragstart', event => onDragSlot(event, coord));

      const starBox = document.createElement('div');
      starBox.className = 'hex-stars';

      const itemsBox = document.createElement('div');
      itemsBox.className = 'hex-items';

      slot.appendChild(inner);
      slot.appendChild(starBox);
      slot.appendChild(itemsBox);
      row.appendChild(slot);
    }

    boardGrid.appendChild(row);
  });

  renderBoard();
}

function renderBoard() {
  Object.keys(builderState).forEach(coord => renderSlot(coord));
}

function renderSlot(coord) {
  const slot = document.querySelector(`.hex-slot[data-coord='${coord}']`);
  if (!slot) return;
  const state = builderState[coord];
  const inner = slot.querySelector('.hex-inner');
  const starBox = slot.querySelector('.hex-stars');
  const itemsBox = slot.querySelector('.hex-items');

  slot.classList.toggle('selected', selectedSlot === coord);

  // Remove old listeners before recreating
  inner.removeEventListener('dragstart', handleInnerDragStart);
  inner.removeEventListener('contextmenu', handleInnerContextmenu);

  if (state.champ && state.champ.file) {
    inner.innerHTML = `<img src="${state.champ.file}" alt="${state.champ.name}" class="champ-portrait" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;">`;
    inner.setAttribute('draggable', 'true');
    inner.addEventListener('dragstart', handleInnerDragStart);
    inner.addEventListener('contextmenu', (event) => handleInnerContextmenu(event, coord));
  } else if (state.champ && state.champ.name) {
    inner.innerHTML = `<span class="hex-symbol">${state.champ.name}</span>`;
    inner.setAttribute('draggable', 'true');
    inner.addEventListener('dragstart', handleInnerDragStart);
    inner.addEventListener('contextmenu', (event) => handleInnerContextmenu(event, coord));
  } else {
    inner.innerHTML = '';
    inner.setAttribute('draggable', 'false');
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
    icon.addEventListener('contextmenu', event => removeItem(event, coord, itemIndex));
    itemsBox.appendChild(icon);
  });
}

function handleInnerDragStart(event) {
  const slot = event.target.closest('.hex-slot');
  if (!slot) return;
  const coord = slot.dataset.coord;
  const state = builderState[coord];
  if (!state.champ) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('type', 'slot');
  event.dataTransfer.setData('coord', coord);
}

function handleInnerContextmenu(event, coord) {
  event.preventDefault();
  builderState[coord] = { champ: null, stars: 0, items: [] };
  if (selectedSlot === coord) selectedChampion = null;
  renderSlot(coord);
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

function selectSlot(coord, assignChampion = true) {
  selectedSlot = coord;
  if (assignChampion && selectedChampion) {
    builderState[coord].champ = selectedChampion;
    if (builderState[coord].stars === 0) builderState[coord].stars = 1;
    renderSlot(coord);
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

function removeItem(event, coord, itemIndex) {
  event.preventDefault();
  const state = builderState[coord];
  if (!state || !state.items[itemIndex]) return;
  state.items.splice(itemIndex, 1);
  renderSlot(coord);
}

function clearSlot(event, coord) {
  event.preventDefault();
  builderState[coord] = { champ: null, stars: 0, items: [] };
  if (selectedSlot === coord) selectedChampion = null;
  renderSlot(coord);
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

  label.textContent = `スロット ${selectedSlot} が選択されています。`;
  const state = builderState[selectedSlot];
  if (!state.champ) {
    info.textContent = 'このスロットにはチャンピオンが配置されていません。チャンピオンを選択してください。';
    return;
  }

  const itemText = state.items.length > 0 ? `アイテム ${state.items.length}個` : 'アイテムなし';
  info.innerHTML = `<strong>${state.champ.name}</strong><br>星: ${state.stars || 0} / ${itemText}`;
}

function sel(slotElement) {
  if (!slotElement || !slotElement.dataset || slotElement.dataset.coord === undefined) return;
  const coord = slotElement.dataset.coord;
  if (!builderState[coord]) return;
  selectSlot(coord);
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
  const rowLabels = ['D', 'C', 'B', 'A'];
  for (const rowLabel of rowLabels) {
    for (let col = 1; col <= 7; col++) {
      const coord = rowLabel + col;
      if (!builderState[coord].champ) return coord;
    }
  }
  return null;
}

function findNextEmptySlot(currentCoord) {
  const coords = Object.keys(builderState).sort();
  const currentIndex = coords.indexOf(currentCoord);
  for (let i = currentIndex + 1; i < coords.length; i++) {
    if (!builderState[coords[i]].champ) return coords[i];
  }
  return null;
}

function onDragItem(event, itemPath) {
  event.dataTransfer.setData('type', 'item');
  event.dataTransfer.setData('item', itemPath);
}

function copyBuilderLink() {
  const state = {};
  Object.keys(builderState).forEach(coord => {
    state[coord] = {
      champ: builderState[coord].champ ? builderState[coord].champ.name : null,
      stars: builderState[coord].stars,
      items: builderState[coord].items
    };
  });
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
  event.dataTransfer.setData('type', 'champion');
  event.dataTransfer.setData('name', champName);
}

function onDragSlot(event, sourceCoord) {
  const state = builderState[sourceCoord];
  if (!state.champ) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('type', 'slot');
  event.dataTransfer.setData('coord', sourceCoord);
}

function onDropSlot(event, targetCoord) {
  event.preventDefault();
  const type = event.dataTransfer.getData('type');
  if (type === 'champion') {
    const name = event.dataTransfer.getData('name');
    const champ = champions.find(c => c.name === name);
    if (!champ) return;
    builderState[targetCoord].champ = champ;
    if (builderState[targetCoord].stars === 0) builderState[targetCoord].stars = 1;
    renderSlot(targetCoord);
    selectedSlot = targetCoord;
    selectedChampion = champ;
    updateSelectedInfo();
  }
  if (type === 'item') {
    const item = event.dataTransfer.getData('item');
    if (!item) return;
    const state = builderState[targetCoord];
    if (!state.champ || state.items.length >= 3) return;
    state.items.push(item);
    renderSlot(targetCoord);
    selectedSlot = targetCoord;
    updateSelectedInfo();
    return;
  }
  if (type === 'slot') {
    const sourceCoord = event.dataTransfer.getData('coord');
    if (!sourceCoord || sourceCoord === targetCoord) return;
    const temp = builderState[targetCoord];
    builderState[targetCoord] = builderState[sourceCoord];
    builderState[sourceCoord] = temp;
    renderSlot(sourceCoord);
    renderSlot(targetCoord);
    selectedSlot = targetCoord;
    updateSelectedInfo();
  }
}
