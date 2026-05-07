// ================ ファイルの先頭に追加 ================
let project = {};
let selSlot = null;
let curPalette = 'c';
let hasChanges = false;
let nextAutoSave = 60;
let draggedIndex = 0;
let undoStack = [];
let redoStack = [];

const VERSION = "1.0";

let query = { guide: null, note: null };

// ==================== 重要な関数 ====================
function saveHistory() {
    undoStack.push(JSON.stringify(project));
    redoStack = [];
}

function markChanged() {
    hasChanges = true;
    nextAutoSave = 60;
}

// =====================================================================

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    query = {
        guide: urlParams.get('guide'),
        note: urlParams.get('note')
    };

    const saved = localStorage.getItem('tft_autosave');

    if (saved) {
        try {
            project = patchProjectData(JSON.parse(saved));
            loadDefaultAssets();

            if (typeof initCanvasStructure === 'function') {
                initCanvasStructure();
            }

            renderPalette();
            renderGuideList();
            loadActiveGuide();
        } catch (e) {
            console.error("Load Error:", e);
            setupInitialGuide();
        }
    } else {
        setupInitialGuide();
    }

    // query パラメータ処理
    if (query.guide) {
        saveHistory();
        const canvas = document.getElementById('canvas');
        if (canvas) {
            project.guides.push({
                title: query.guide,
                html: canvas.innerHTML,
                url: '',
                urlProg: ''
            });
            project.activeIndex = project.guides.length - 1;
            renderGuideList();
            loadActiveGuide();

            const inTitle = document.getElementById('in-title');
            if (inTitle) inTitle.innerText = query.guide;

            if (query.note) {
                const fDesc = document.getElementById('f-desc');
                if (fDesc) fDesc.innerText = query.note;
            }
            updateTabData();
        }
    }
};

function setupInitialGuide() {
    if (typeof initCanvasStructure === 'function') initCanvasStructure();
    addNewGuide();
    loadDefaultAssets();
    renderPalette();
}

function ensureProjectAssets(data) {
    if (!data.assets) data.assets = { c: [], i: [], a: [], g: [] };
    data.assets.c = data.assets.c || [];
    data.assets.i = data.assets.i || [];
    data.assets.a = data.assets.a || [];
    data.assets.g = data.assets.g || [];
    return data;
}

function ensureProjectGuides(data) {
    if (!data.guides) data.guides = [];
    if (!('activeIndex' in data)) data.activeIndex = 0;
    return data;
}

function loadChampionsIntoPalette() {
    if (typeof championFiles === 'undefined') return;
    championFiles.forEach(file => {
        const name = file.replace('.avif', '');
        project.assets.c.push({
            src: `./img/champ/17/${file}`,
            name: name,
            hidden: false
        });
    });
}

function loadItemsIntoPalette() {
    if (typeof itemFiles === 'undefined') return;
    itemFiles.forEach(file => {
        const name = file.replace('.avif', '');
        const src = `./img/item/${file}`;
        project.assets.i.push({ src: src, name: name, hidden: false });
    });
}

function loadGodsIntoPalette() {
    if (typeof godFiles === 'undefined') return;
    godFiles.forEach(file => {
        const name = file.replace('.avif', '');
        const src = `img/god/${file}`;
        project.assets.g.push({ src: src, name: name, hidden: false });
    });
}

function loadAugmentsIntoPalette() {
    if (typeof augFiles === 'undefined') return;
    ['s', 'g', 'p'].forEach(tier => {
        augFiles[tier].forEach(file => {
            const name = file.replace('.avif', '');
            const src = `./img/aug/${tier}/${file}`;
            project.assets.a.push({ src: src, name: name, hidden: false });
        });
    });
}

function loadDefaultAssets() {
    project = ensureProjectAssets(project);
    if (!project.assets.c.length) loadChampionsIntoPalette();
    if (!project.assets.i.length) loadItemsIntoPalette();
    if (!project.assets.a.length) loadAugmentsIntoPalette();
    if (!project.assets.g.length) loadGodsIntoPalette();
}

setInterval(() => {
    if (nextAutoSave > 0) {
        nextAutoSave--;
        const timerDisplay = document.getElementById('save-timer-display');
        if (timerDisplay) {
            timerDisplay.innerText = `保存まで: ${nextAutoSave}s`;
        }
    } else {
        if (hasChanges) executeAutoSave();
        nextAutoSave = 60;
    }
}, 1000);

function executeAutoSave() {
    localStorage.setItem('tft_autosave', JSON.stringify(project));
    const status = document.getElementById('autosave-status');
    if (status) {
        status.classList.add('show');
        setTimeout(() => status.classList.remove('show'), 2000);
    }
    hasChanges = false;
}

function patchProjectData(data) {
    data = ensureProjectAssets(data);
    data = ensureProjectGuides(data);
    if (data.guides) {
        data.guides.forEach(g => {
            if (g.urlProg === undefined) g.urlProg = "";
        });
    }
    data.version = VERSION;
    return data;
}

function getBuilderQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        guide: params.get('guide'),
        note: params.get('note')
    };
}

const boardArea = document.getElementById('board-area');
if (boardArea) {
    boardArea.addEventListener('contextmenu', showBoardContextMenu);
}
document.addEventListener('click', hideBoardContextMenu);

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(project));
    project = JSON.parse(undoStack.pop());
    renderPalette();
    renderGuideList();
    loadActiveGuide();
    markChanged();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(project));
    project = JSON.parse(redoStack.pop());
    renderPalette();
    renderGuideList();
    loadActiveGuide();
    markChanged();
}

function initCanvasStructure() {
    const alt = document.getElementById('row-alt');
    if (alt) {
        alt.innerHTML = '';
        for (let n = 0; n < 10; n++) addSlot(alt, 'size-M');
    }

    const prog = document.getElementById('row-prog');
    if (prog) {
        prog.innerHTML = '';
        for (let i = 0; i < 14; i++) addSlot(prog, 'size-M');
    }

    const eqArea = document.getElementById('equip-area');
    if (eqArea) {
        eqArea.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const row = document.createElement('div');
            row.className = 'row-wrap';
            const lv = document.createElement('div');
            lv.className = 'lv-label';
            lv.innerHTML = `<div class="lv-val" contenteditable="true" oninput="markChanged()">Lv8</div>`;
            const grp = document.createElement('div');
            grp.className = 'slot-group';
            addSlot(grp, 'size-L');
            for (let k = 0; k < 15; k++) addSlot(grp, 'item-slot size-M');
            row.append(lv, grp);
            eqArea.appendChild(row);
        }
    }

    const aug = document.getElementById('row-aug');
    if (aug) {
        aug.innerHTML = '';
        for (let l = 0; l < 5; l++) addSlot(aug, 'aug-slot size-M');
    }

    const god = document.getElementById('row-god');
    if (god) {
        god.innerHTML = '';
        for (let m = 0; m < 5; m++) {
            const wrap = document.createElement('div');
            wrap.className = 'god-wrap size-L';
            const s = document.createElement('div');
            s.className = `slot god-slot`;
            s.onclick = (e) => { e.stopPropagation(); sel(s); };
            s.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(s); };
            const lbl = document.createElement('div');
            lbl.className = 'god-name-label';
            wrap.append(s, lbl);
            god.appendChild(wrap);
        }
    }
}

function addSlot(parent, cls) {
    const d = document.createElement('div');
    d.className = `slot ${cls}`;

    d.onclick = (e) => { e.stopPropagation(); sel(d); };
    d.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(d); };

    // ドラッグ＆ドロップ対応
    d.ondragover = (e) => {
        e.preventDefault();
        d.classList.add('dragover');
    };

    d.ondragleave = () => {
        d.classList.remove('dragover');
    };

    d.ondrop = (e) => {
        e.preventDefault();
        d.classList.remove('dragover');

        const src = e.dataTransfer.getData('text/plain');
        const name = e.dataTransfer.getData('text/name') || '';

        if (src) {
            saveHistory();
            fillWithDrag(d, src, name);
        }
    };

    parent.appendChild(d);
}

function fillWithDrag(slot, src, name = "") {
    if (!slot) return;

    saveHistory();

    // Godスロット特別処理
    if (slot.parentElement?.classList.contains('god-wrap')) {
        const label = slot.parentElement.querySelector('.god-name-label');
        if (label) label.innerText = name ? name.replace('.avif', '') : '';
    }

    slot.innerHTML = `
        <img src="${src}" draggable="false">
        <button class="rem-btn" onclick="event.stopPropagation(); clearSlotContent(this.parentElement);">×</button>
    `;

    const next = findNextSlot(slot);
    if (next) sel(next);

    markChanged();
}

function clearSlotContent(slot) {
    saveHistory();
    slot.innerHTML = '';
    if (slot.parentElement && slot.parentElement.classList.contains('god-wrap')) {
        const label = slot.parentElement.querySelector('.god-name-label');
        if (label) label.innerText = '';
    }
    markChanged();
}

function sel(el) {
    if (selSlot) selSlot.classList.remove('selected');
    selSlot = el;
    if (el) el.classList.add('selected');
}

function changeSelectedSlotSize(size) {
    if (!selSlot) return;
    saveHistory();
    selSlot.classList.remove('size-L', 'size-M', 'size-S');
    if (selSlot.classList.contains('god-slot')) {
        selSlot.parentElement.classList.remove('size-L', 'size-M', 'size-S');
        selSlot.parentElement.classList.add(`size-${size}`);
    }
    selSlot.classList.add(`size-${size}`);
    markChanged();
}

function fill(src, name = "") {
    if (!selSlot) return;
    saveHistory();
    if (curPalette === 'g' && selSlot.parentElement.classList.contains('god-wrap')) {
        const label = selSlot.parentElement.querySelector('.god-name-label');
        if (label && name) label.innerText = name.split('.')[0];
    }
    selSlot.innerHTML = `<img src="${src}"><button class="rem-btn" onclick="event.stopPropagation(); clearSlotContent(this.parentElement);">×</button>`;
    let next = findNextSlot(selSlot);
    if (next) sel(next);
    markChanged();
}

function findNextSlot(current) {
    const parent = current.parentElement;
    if (parent && parent.classList.contains('god-wrap')) {
        const wraps = Array.from(document.querySelectorAll('.god-wrap'));
        const idx = wraps.indexOf(parent);
        return wraps[idx + 1] ? wraps[idx + 1].querySelector('.slot') : null;
    }
    const slots = Array.from(parent?.querySelectorAll('.slot') || []);
    const index = slots.indexOf(current);
    return (index >= 0 && index < slots.length - 1) ? slots[index + 1] : null;
}

function setStars(n) {
    if (!selSlot) return;
    saveHistory();
    let s = selSlot.querySelector('.star-row');
    if (n === 0) {
        if (s) s.remove();
    } else {
        if (!s) {
            s = document.createElement('div');
            s.className = 'star-row';
            selSlot.appendChild(s);
        }
        s.innerHTML = '<span>★</span>'.repeat(n);
    }
    markChanged();
}

function insertSymbol(symbol) {
    if (!selSlot) return;
    if (selSlot.classList.contains('god-slot')) return;
    saveHistory();
    selSlot.innerHTML = `<span class="symbol-text">${symbol}</span><button class="rem-btn" onclick="event.stopPropagation(); clearSlotContent(this.parentElement);">×</button>`;
    const next = findNextSlot(selSlot);
    if (next) sel(next);
    markChanged();
}

function setDifficulty(n) {
    saveHistory();
    const box = document.getElementById('difficulty-box');
    if (!box) return;
    const colors = ["#22c55e", "#eab308", "#ef4444"];
    box.innerHTML = '';
    for (let i = 0; i < n; i++) box.innerHTML += `<div class="diff-sq" style="background:${colors[n - 1]}"></div>`;
    markChanged();
}

function handlePaste(e) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            saveHistory();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.getElementById('board-img');
                if (img) {
                    img.src = ev.target.result;
                    img.style.display = 'block';
                }
                const msg = document.getElementById('board-msg');
                if (msg) msg.style.display = 'none';
                markChanged();
            };
            reader.readAsDataURL(blob);
        }
    }
}

async function savePNG() {
    document.querySelectorAll('.rem-btn').forEach(b => b.classList.add('no-export'));
    document.querySelectorAll('.slot').forEach(s => { if (!s.innerHTML) s.classList.add('empty-slot-hide'); });
    if (selSlot) selSlot.classList.remove('selected');

    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const resCanvas = await html2canvas(canvas, { backgroundColor: "#060e20", scale: 2, width: 1080, height: 1440, useCORS: true });
    const blob = await new Promise(resolve => resCanvas.toBlob(resolve, 'image/png'));
    const titleEl = document.getElementById('in-title');
    const titleText = (titleEl?.innerText?.trim() || 'tft_guide');
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: `${titleText}.png`, types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }] });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) { }
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${titleText}.png`;
        a.click();
    }
    document.querySelectorAll('.no-export').forEach(b => b.classList.remove('no-export'));
    document.querySelectorAll('.empty-slot-hide').forEach(s => s.classList.remove('empty-slot-hide'));
}

async function exportProject() {
    updateTabData();
    const titleEl = document.getElementById('in-title');
    const titleText = (titleEl?.innerText?.trim() || 'tft_project');
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: `${titleText}.json`, types: [{ description: 'JSON Project File', accept: { 'application/json': ['.json'] } }] });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) { }
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${titleText}.json`;
        a.click();
    }
}

function setPalette(t) {
    curPalette = t;
    document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById('tab-' + t);
    if (tab) tab.classList.add('active');
    renderPalette();
}

function handleAssetUpload(e) {
    saveHistory();
    Array.from(e.target.files).forEach(f => {
        const r = new FileReader();
        r.onload = (ev) => {
            project.assets[curPalette].push({ src: ev.target.result, name: f.name, hidden: false });
            renderPalette();
            markChanged();
        };
        r.readAsDataURL(f);
    });
}

function renderPalette() {
    const g = document.getElementById('palette-grid');
    if (!g) return;
    g.innerHTML = '';

    const showHidden = document.getElementById('show-hidden-toggle')?.checked || false;

    if (!project.assets || !project.assets[curPalette]) return;

    project.assets[curPalette].forEach((asset, index) => {
        if (asset.hidden && !showHidden) return;

        const d = document.createElement('div');
        d.className = `asset ${asset.hidden ? 'hidden-asset' : ''}`;
        d.draggable = true;

        d.innerHTML = `<img src="${asset.src}" draggable="false"><span>${asset.name}</span>`;

        // クリックで従来通り配置
        d.onclick = () => {
            if (!asset.hidden) fill(asset.src, asset.name);
        };

        // ダブルクリックで非表示切り替え
        d.ondblclick = () => {
            saveHistory();
            asset.hidden = !asset.hidden;
            renderPalette();
            markChanged();
        };

        // ドラッグ開���
        d.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', asset.src);
            e.dataTransfer.setData('text/name', asset.name || '');
            d.classList.add('dragging');
        };

        d.ondragend = () => d.classList.remove('dragging');

        g.appendChild(d);
    });
}

function addNewGuide() {
    saveHistory();
    initCanvasStructure();
    const inTitle = document.getElementById('in-title');
    if (inTitle) inTitle.innerText = "";
    const fBold = document.getElementById('f-bold');
    if (fBold) fBold.innerText = "";
    const fDesc = document.getElementById('f-desc');
    if (fDesc) fDesc.innerText = "";
    const ttUrl = document.getElementById('tt-url');
    if (ttUrl) ttUrl.value = "";

    project = ensureProjectGuides(project);
    const canvas = document.getElementById('canvas');
    if (canvas) {
        project.guides.push({ title: "", html: canvas.innerHTML, url: "", urlProg: "" });
    }
    project.activeIndex = project.guides.length - 1;
    renderGuideList();
    loadActiveGuide();
    setDifficulty(2);
}

function renderGuideList() {
    const l = document.getElementById('guide-list');
    if (!l) return;
    l.innerHTML = '';

    project = ensureProjectGuides(project);

    project.guides.forEach((g, i) => {
        const d = document.createElement('div');
        d.className = `guide-tab ${i === project.activeIndex ? 'active' : ''}`;
        d.innerHTML = `<span>${g.title || 'Untitled'}</span><b onclick="deleteGuide(event, ${i})">×</b>`;
        d.onclick = () => {
            if (project.activeIndex === i) return;
            updateTabData();
            project.activeIndex = i;
            loadActiveGuide();
            renderGuideList();
        };
        l.appendChild(d);
    });
}

function deleteGuide(e, index) {
    e.stopPropagation();
    if (confirm("このガイドを削除しますか？")) {
        saveHistory();
        project.guides.splice(index, 1);
        if (project.activeIndex >= project.guides.length) {
            project.activeIndex = Math.max(0, project.guides.length - 1);
        }
        if (project.guides.length === 0) {
            addNewGuide();
        } else {
            renderGuideList();
            loadActiveGuide();
            markChanged();
        }
    }
}

function loadActiveGuide() {
    project = ensureProjectGuides(project);
    const g = project.guides[project.activeIndex];
    if (!g) return;

    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.innerHTML = g.html;
    }

    // 動的に生成されたスロットすべてにドラッグイベントを再付与
    document.querySelectorAll('.slot').forEach(slot => {
        slot.onclick = (e) => { e.stopPropagation(); sel(slot); };
        slot.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(slot); };

        // ドラッグ＆ドロップ再設定
        slot.ondragover = (e) => {
            e.preventDefault();
            slot.classList.add('dragover');
        };
        slot.ondragleave = () => slot.classList.remove('dragover');

        slot.ondrop = (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');

            const src = e.dataTransfer.getData('text/plain');
            const name = e.dataTransfer.getData('text/name') || '';
            if (src) {
                saveHistory();
                fillWithDrag(slot, src, name);
            }
        };
    });

    selSlot = null;
}

function updateTabData() {
    if (!project.guides || !project.guides.length) return;
    const g = project.guides[project.activeIndex];
    if (!g) return;

    const inTitle = document.getElementById('in-title');
    if (inTitle) g.title = inTitle.innerText;

    const ttUrl = document.getElementById('tt-url');
    if (ttUrl) g.url = ttUrl.value;

    const canvas = document.getElementById('canvas');
    if (canvas) g.html = canvas.innerHTML;

    renderGuideList();
}

function importProject(e) {
    const r = new FileReader();
    r.onload = (ev) => {
        project = patchProjectData(JSON.parse(ev.target.result));
        renderPalette();
        renderGuideList();
        loadActiveGuide();
        markChanged();
    };
    r.readAsText(e.target.files[0]);
}

async function pasteFromClipboard(targetId) {
    try {
        const text = await navigator.clipboard.readText();
        const el = document.getElementById(targetId);
        if (el) {
            el.value = text;
            markChanged();
        }
    } catch (err) { }
}

function insertBuilderLink(targetId) {
    pasteFromClipboard(targetId);
}

async function pasteImageFromClipboard() {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = document.getElementById('board-img');
                        if (img) {
                            img.src = ev.target.result;
                            img.style.display = 'block';
                        }
                        const msg = document.getElementById('board-msg');
                        if (msg) msg.style.display = 'none';
                        markChanged();
                    };
                    reader.readAsDataURL(blob);
                    hideBoardContextMenu();
                    return;
                }
            }
        }
        alert('クリップボードに画像が見つかりませんでした。');
    } catch (err) {
        alert('画像の貼り付けに失敗しました。');
    }
}

function showBoardContextMenu(event) {
    event.preventDefault();
    const menu = document.getElementById('board-context-menu');
    if (!menu) return;
    menu.innerHTML = '<button onclick="pasteImageFromClipboard()">ビルダー画像を貼り付け</button>';
    menu.style.display = 'block';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
}

function hideBoardContextMenu() {
    const menu = document.getElementById('board-context-menu');
    if (menu) menu.style.display = 'none';
}

function openLink(targetId) {
    const url = document.getElementById(targetId)?.value;
    if (url && url.startsWith('http')) window.open(url, '_blank');
}
