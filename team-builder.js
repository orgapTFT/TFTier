const rows = [6, 5, 6, 5, 6];
const builderState = [];
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
const items = [
  "img/item/bluebuff.avif",
  "img/item/rapidfirecannon.avif",
  "img/item/giantsbelt.avif",
  "img/item/hextechgunblade.avif",
  "img/item/bloodthirster.avif",
  "img/item/infinityedge.avif",
  "img/item/redbuff.avif",
  "img/item/guardianangel.avif",
  "img/item/spatula.avif",
  "img/item/jeweledgauntlet.avif",
  "img/item/archangelsstaff.avif",
  "img/item/runaanshurricane.avif"
];

window.addEventListener('load', () => {
  initBuilderState();
  buildBoard();
  loadChampions();
  renderItems();
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
      renderChampionPalette();
    })
    .catch(error => console.error('Champion JSON load failed:', error));
}

function buildBoard() {
  const boardGrid = document.getElementById('board-grid');
  boardGrid.innerHTML = '';
  let index = 0;

  rows.forEach((count, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'hex-row';
    if (count === 5) row.classList.add('offset');

    for (let cell = 0; cell < count; cell++) {
      const slot = document.createElement('div');
      slot.className = 'hex-slot';
      slot.dataset.index = index;
      slot.addEventListener('click', () => selectSlot(index));
      slot.addEventListener('contextmenu', event => clearSlot(event, index));
      slot.addEventListener('dragover', allowDrop);
      slot.addEventListener('drop', event => onDropSlot(event, index));

      const inner = document.createElement('div');
      inner.className = 'hex-inner';
      inner.addEventListener('dragstart', event => onDragSlot(event, index));
      inner.setAttribute('draggable', 'false');

      const starBox = document.createElement('div');
      starBox.className = 'hex-stars';

      const itemsBox = document.createElement('div');
      itemsBox.className = 'hex-items';

      slot.appendChild(inner);
      slot.appendChild(starBox);
      slot.appendChild(itemsBox);
      row.appendChild(slot);
      index += 1;
    }

    boardGrid.appendChild(row);
  });

  renderBoard();
}

function renderBoard() {
  builderState.forEach((state, index) => renderSlot(index));
}

function renderSlot(index) {
  const slot = document.querySelector(`.hex-slot[data-index='${index}']`);
  if (!slot) return;
  const state = builderState[index];
  const inner = slot.querySelector('.hex-inner');
  const starBox = slot.querySelector('.hex-stars');
  const itemsBox = slot.querySelector('.hex-items');

  slot.classList.toggle('selected', selectedSlot === index);

  if (state.champ) {
    inner.style.backgroundImage = `url('${state.champ.file}')`;
    inner.style.backgroundSize = 'cover';
    inner.style.backgroundPosition = 'center';
    inner.setAttribute('draggable', 'true');
  } else {
    inner.style.backgroundImage = 'none';
    inner.style.backgroundColor = '#111827';
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
    icon.addEventListener('contextmenu', event => removeItem(event, index, itemIndex));
    itemsBox.appendChild(icon);
  });
}

function renderChampionPalette() {
  const palette = document.getElementById('champion-palette');
  palette.innerHTML = '';
  champions.forEach(champ => {
    const button = document.createElement('button');
    button.className = 'champ-card';
    button.type = 'button';
    button.addEventListener('click', () => selectChampion(champ));
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

function renderItems() {
  const palette = document.getElementById('item-palette');
  palette.innerHTML = '';
  items.forEach(item => {
    const button = document.createElement('button');
    button.className = 'item-card';
    button.type = 'button';
    button.addEventListener('click', () => addItemToSelected(item));

    const image = document.createElement('img');
    image.src = item;
    image.alt = item;
    image.className = 'item-thumb';

    button.appendChild(image);
    palette.appendChild(button);
  });
}

function selectSlot(index) {
  selectedSlot = index;
  if (selectedChampion) {
    builderState[index].champ = selectedChampion;
    if (builderState[index].stars === 0) builderState[index].stars = 1;
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

function allowDrop(event) {
  event.preventDefault();
}

function onDragChampion(event, champName) {
  event.dataTransfer.setData('type', 'champion');
  event.dataTransfer.setData('name', champName);
}

function onDragSlot(event, sourceIndex) {
  const state = builderState[sourceIndex];
  if (!state.champ) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('type', 'slot');
  event.dataTransfer.setData('index', sourceIndex);
}

function onDropSlot(event, targetIndex) {
  event.preventDefault();
  const type = event.dataTransfer.getData('type');
  if (type === 'champion') {
    const name = event.dataTransfer.getData('name');
    const champ = champions.find(c => c.name === name);
    if (!champ) return;
    builderState[targetIndex].champ = champ;
    if (builderState[targetIndex].stars === 0) builderState[targetIndex].stars = 1;
    renderSlot(targetIndex);
    selectedSlot = targetIndex;
    selectedChampion = champ;
    updateSelectedInfo();
  }
  if (type === 'slot') {
    const sourceIndex = Number(event.dataTransfer.getData('index'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    const temp = builderState[targetIndex];
    builderState[targetIndex] = builderState[sourceIndex];
    builderState[sourceIndex] = temp;
    renderSlot(sourceIndex);
    renderSlot(targetIndex);
    selectedSlot = targetIndex;
    updateSelectedInfo();
  }
}
