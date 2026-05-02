const rows = [7, 7, 7, 7];
const builderState = [];
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
let curPalette = 'c';
const items = (window.itemFiles || []).map(name => `../img/item/${name}`);