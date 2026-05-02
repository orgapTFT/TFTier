window.onload = () => {
    // 1. まずプロジェクトデータを共通処理で読み込む
    initCommonProject();

    // 2. ガイドが一つもない場合は新規作成、ある場合は読み込み
    if (project.guides.length === 0) {
        addNewGuide(); 
    } else {
        renderGuideList();
        loadActiveGuide();
    }

    // 3. パレットの表示
    renderPalette();

    // 4. エディタ特有のイベント設定
    const boardArea = document.getElementById('board-area');
    if (boardArea) {
        boardArea.addEventListener('contextmenu', showBoardContextMenu);
    }
};

function ensureProjectAssets(data) {
    if (!data.assets) data.assets = { c: [], i: [], a: [], g: [] };
    data.assets.c = data.assets.c || [];
    data.assets.i = data.assets.i || [];
    data.assets.a = data.assets.a || [];
    data.assets.g = data.assets.g || [];
    return data;
}

function loadChampionsIntoPalette() {
    championFiles.forEach(file => {
        const name = file.replace('.avif', '');
        const src = `img/champ/17/${file}`;
        project.assets.c.push({ src: src, name: name, hidden: false });
    });
}

function loadItemsIntoPalette() {
    itemFiles.forEach(file => {
        const name = file.replace('.avif', '');
        const src = `img/item/${file}`;
        project.assets.i.push({ src: src, name: name, hidden: false });
    });
}

function loadGodsIntoPalette() {
    godFiles.forEach(file => {
        const name = file.replace('.avif', '');
        const src = `img/god/${file}`;
        project.assets.g.push({ src: src, name: name, hidden: false });
    });
}

function loadAugmentsIntoPalette() {
    ['s','g','p'].forEach(tier => {
        augFiles[tier].forEach(file => {
            const name = file.replace('.avif', '');
            const src = `img/aug/${tier}/${file}`;
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
        document.getElementById('save-timer-display').innerText = `保存まで: ${nextAutoSave}s`;
    } else {
        if (hasChanges) executeAutoSave();
        nextAutoSave = 60;
    }
}, 1000);

function markChanged() {
    hasChanges = true;
    updateTabData();
}

function executeAutoSave() {
    localStorage.setItem('tft_autosave', JSON.stringify(project));
    const status = document.getElementById('autosave-status');
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 2000);
    hasChanges = false;
}

function patchProjectData(data) {
    data = ensureProjectAssets(data);
    if (data.guides) {
        data.guides.forEach(g => { if (g.urlProg === undefined) g.urlProg = ""; });
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

window.onload = () => {
    const query = getBuilderQuery();
    const saved = localStorage.getItem('tft_autosave');
    if (saved) {
        try {
            project = patchProjectData(JSON.parse(saved));
            loadDefaultAssets();
            renderPalette(); renderGuideList(); loadActiveGuide();
        } catch(e) {
            addNewGuide();
            loadDefaultAssets();
            renderPalette();
        }
    } else {
        addNewGuide();
        loadDefaultAssets();
        renderPalette();
        if (query.guide) project.guides.pop();
    }

    const boardArea = document.getElementById('board-area');
    if (boardArea) {
        boardArea.addEventListener('contextmenu', showBoardContextMenu);
    }
    document.addEventListener('click', hideBoardContextMenu);

    if (query.guide) {
        saveHistory();
        project.guides.push({ title: query.guide, html: document.getElementById('canvas').innerHTML, url: '', urlProg: '' });
        project.activeIndex = project.guides.length - 1;
        renderGuideList();
        loadActiveGuide();
        document.getElementById('in-title').innerText = query.guide;
        if (query.note) document.getElementById('f-desc').innerText = query.note;
        updateTabData();
    }
};

function saveHistory() {
    undoStack.push(JSON.stringify(project));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(project));
    project = JSON.parse(undoStack.pop());
    renderPalette(); renderGuideList(); loadActiveGuide();
    markChanged();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(project));
    project = JSON.parse(redoStack.pop());
    renderPalette(); renderGuideList(); loadActiveGuide();
    markChanged();
}

function initCanvasStructure() {
    const alt = document.getElementById('row-alt'); alt.innerHTML = '';
    for (let n = 0; n < 10; n++) addSlot(alt, 'size-M');
    const prog = document.getElementById('row-prog'); prog.innerHTML = '';
    for (let i = 0; i < 14; i++) addSlot(prog, 'size-M');
    const eqArea = document.getElementById('equip-area'); eqArea.innerHTML = '';
    for (let j = 0; j < 3; j++) {
        const row = document.createElement('div'); row.className = 'row-wrap';
        const lv = document.createElement('div'); lv.className = 'lv-label';
        lv.innerHTML = `<div class="lv-val" contenteditable="true" oninput="markChanged()">Lv8</div>`;
        const grp = document.createElement('div'); grp.className = 'slot-group';
        addSlot(grp, 'size-L');
        for (let k = 0; k < 15; k++) addSlot(grp, 'item-slot size-M');
        row.append(lv, grp); eqArea.appendChild(row);
    }
    const aug = document.getElementById('row-aug'); aug.innerHTML = '';
    for (let l = 0; l < 5; l++) addSlot(aug, 'aug-slot size-M');
    const god = document.getElementById('row-god'); god.innerHTML = '';
    for (let m = 0; m < 5; m++) {
        const wrap = document.createElement('div'); wrap.className = 'god-wrap size-L';
        const s = document.createElement('div'); s.className = `slot god-slot`;
        s.onclick = (e) => { e.stopPropagation(); sel(s); };
        s.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(s); };
        const lbl = document.createElement('div'); lbl.className = 'god-name-label';
        wrap.append(s, lbl); god.appendChild(wrap);
    }
}

function addSlot(parent, cls) {
    const d = document.createElement('div'); d.className = `slot ${cls}`;
    d.onclick = (e) => { e.stopPropagation(); sel(d); };
    d.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(d); };
    parent.appendChild(d);
}

function clearSlotContent(slot) {
    saveHistory();
    slot.innerHTML = '';
    if (slot.parentElement && slot.parentElement.classList.contains('god-wrap')) {
        slot.parentElement.querySelector('.god-name-label').innerText = '';
    }
    markChanged();
}

function sel(el) {
    if (selSlot) selSlot.classList.remove('selected');
    selSlot = el; if (el) el.classList.add('selected');
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
    if (parent.classList.contains('god-wrap')) {
        const wraps = Array.from(document.querySelectorAll('.god-wrap'));
        const idx = wraps.indexOf(parent);
        return wraps[idx + 1] ? wraps[idx + 1].querySelector('.slot') : null;
    }
    const slots = Array.from(parent.querySelectorAll('.slot'));
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
        if (!s) { s = document.createElement('div'); s.className = 'star-row'; selSlot.appendChild(s); }
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
    const colors = ["#22c55e", "#eab308", "#ef4444"];
    box.innerHTML = '';
    for (let i = 0; i < n; i++) box.innerHTML += `<div class="diff-sq" style="background:${colors[n-1]}"></div>`;
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
                img.src = ev.target.result; img.style.display = 'block';
                document.getElementById('board-msg').style.display = 'none';
                markChanged();
            };
            reader.readAsDataURL(blob);
        }
    }
}

async function savePNG() {
    document.querySelectorAll('.rem-btn').forEach(b => b.classList.add('no-export'));
    document.querySelectorAll('.slot').forEach(s => { if(!s.innerHTML) s.classList.add('empty-slot-hide'); });
    if (selSlot) selSlot.classList.remove('selected');
    const resCanvas = await html2canvas(document.getElementById('canvas'), { backgroundColor: "#060e20", scale: 2, width: 1080, height: 1440, useCORS: true });
    const blob = await new Promise(resolve => resCanvas.toBlob(resolve, 'image/png'));
    const titleText = document.getElementById('in-title').innerText.trim() || 'tft_guide';
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: `${titleText}.png`, types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }] });
            const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
        } catch (err) {}
    } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${titleText}.png`; a.click();
    }
    document.querySelectorAll('.no-export').forEach(b => b.classList.remove('no-export'));
    document.querySelectorAll('.empty-slot-hide').forEach(s => s.classList.remove('empty-slot-hide'));
}

async function exportProject() {
    updateTabData();
    const titleText = document.getElementById('in-title').innerText.trim() || 'tft_project';
    const blob = new Blob([JSON.stringify(project)], {type: "application/json"});
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: `${titleText}.json`, types: [{ description: 'JSON Project File', accept: { 'application/json': ['.json'] } }] });
            const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
        } catch (err) {}
    } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${titleText}.json`; a.click();
    }
}

function setPalette(t) { curPalette = t; document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); renderPalette(); }
function handleAssetUpload(e) { saveHistory(); Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = (ev) => { project.assets[curPalette].push({ src: ev.target.result, name: f.name, hidden: false }); renderPalette(); markChanged(); }; r.readAsDataURL(f); }); }

function renderPalette() {
    const g = document.getElementById('palette-grid'); g.innerHTML = '';
    const showHidden = document.getElementById('show-hidden-toggle').checked;
    project.assets[curPalette].forEach((asset, index) => {
        if (asset.hidden && !showHidden) return;
        const d = document.createElement('div'); d.className = `asset ${asset.hidden ? 'hidden-asset' : ''}`; d.draggable = true;
        d.innerHTML = `<img src="${asset.src}"><span>${asset.name}</span>`;
        d.onclick = () => { if (!asset.hidden) fill(asset.src, asset.name); };
        d.ondblclick = () => { saveHistory(); asset.hidden = !asset.hidden; renderPalette(); markChanged(); };
        d.ondragstart = () => { draggedIndex = index; };
        d.ondrop = () => { saveHistory(); const list = project.assets[curPalette]; const item = list.splice(draggedIndex, 1)[0]; list.splice(index, 0, item); renderPalette(); markChanged(); };
        d.ondragover = (e) => e.preventDefault();
        g.appendChild(d);
    });
}

function addNewGuide() {
    saveHistory(); initCanvasStructure();
    document.getElementById('in-title').innerText = "";
    document.getElementById('f-bold').innerText = "";
    document.getElementById('f-desc').innerText = "";
    document.getElementById('tt-url').value = "";
    document.getElementById('tt-url-prog').value = "";
    project.guides.push({ title: "", html: document.getElementById('canvas').innerHTML, url: "", urlProg: "" });
    project.activeIndex = project.guides.length - 1;
    renderGuideList(); loadActiveGuide(); setDifficulty(2);
}

function renderGuideList() {
    const l = document.getElementById('guide-list'); l.innerHTML = '';
    project.guides.forEach((g, i) => {
        const d = document.createElement('div'); d.className = `guide-tab ${i === project.activeIndex ? 'active' : ''}`;
        d.innerHTML = `<span>${g.title || 'Untitled'}</span><b onclick="deleteGuide(event, ${i})">×</b>`;
        d.onclick = () => { if (project.activeIndex === i) return; updateTabData(); project.activeIndex = i; loadActiveGuide(); renderGuideList(); };
        l.appendChild(d);
    });
}

function deleteGuide(e, index) {
    e.stopPropagation();
    if (confirm("このガイドを削除しますか？")) {
        saveHistory(); project.guides.splice(index, 1);
        if (project.activeIndex >= project.guides.length) project.activeIndex = Math.max(0, project.guides.length - 1);
        if (project.guides.length === 0) addNewGuide(); else { renderGuideList(); loadActiveGuide(); markChanged(); }
    }
}

function loadActiveGuide() {
    const g = project.guides[project.activeIndex]; if (!g) return;
    document.getElementById('canvas').innerHTML = g.html;
    document.getElementById('in-title').innerText = g.title;
    document.getElementById('tt-url').value = g.url || "";
    document.getElementById('tt-url-prog').value = g.urlProg || "";
    document.querySelectorAll('.slot').forEach(slot => {
        slot.onclick = (e) => { e.stopPropagation(); sel(slot); };
        slot.oncontextmenu = (e) => { e.preventDefault(); clearSlotContent(slot); };
    });
    const img = document.getElementById('board-img'); if (img && img.src) document.getElementById('board-msg').style.display = 'none';
    selSlot = null;
}

function updateTabData() {
    if (!project.guides.length) return;
    const g = project.guides[project.activeIndex];
    g.title = document.getElementById('in-title').innerText;
    g.url = document.getElementById('tt-url').value;
    g.urlProg = document.getElementById('tt-url-prog').value;
    g.html = document.getElementById('canvas').innerHTML;
    renderGuideList();
}

function importProject(e) {
    const r = new FileReader();
    r.onload = (ev) => { project = patchProjectData(JSON.parse(ev.target.result)); renderPalette(); renderGuideList(); loadActiveGuide(); markChanged(); };
    r.readAsText(e.target.files[0]);
}

async function pasteFromClipboard(targetId) {
    try { const text = await navigator.clipboard.readText(); document.getElementById(targetId).value = text; markChanged(); } catch (err) {}
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
                        img.src = ev.target.result;
                        img.style.display = 'block';
                        document.getElementById('board-msg').style.display = 'none';
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
    const url = document.getElementById(targetId).value;
    if (url && url.startsWith('http')) window.open(url, '_blank');
}