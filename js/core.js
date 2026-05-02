const rows = [7, 7, 7, 7];
const builderState = [];
let champions = [];
let selectedSlot = null;
let selectedChampion = null;
let dragSource = null;
let curPalette = 'c';
const items = (window.itemFiles || []).map(name => `../img/item/${name}`);

const VERSION = "2.2";
let project = { version: VERSION, assets: { c: [], i: [], a: [], g: [] }, guides: [], activeIndex: 0 };
let curPalette = 'c'; let selSlot = null; let draggedIndex = null;
let undoStack = [], redoStack = []; let hasChanges = false; let nextAutoSave = 60;


/**
 * 現在の画面上の入力内容をプロジェクトデータ（project.guides）に同期する
 */
function updateTabData() {
    // ガイドデータが存在しない場合は何もしない
    if (!project || !project.guides || !project.guides.length) return;

    // 現在アクティブなガイドの参照を取得
    const g = project.guides[project.activeIndex];
    if (!g) return;

    // --- 共通要素の同期 ---
    // どちらの画面にもある可能性がある要素
    const titleEl = document.getElementById('in-title');
    if (titleEl) {
        g.title = titleEl.innerText || titleEl.value || ""; 
    }

    const urlEl = document.getElementById('tt-url');
    if (urlEl) {
        g.url = urlEl.value;
    }

    const urlProgEl = document.getElementById('tt-url-prog');
    if (urlProgEl) {
        g.urlProg = urlProgEl.value;
    }

    // --- エディタ専用要素の同期 ---
    // editor.html のキャンバス内容を保存する[cite: 2]
    const canvasEl = document.getElementById('canvas');
    if (canvasEl) {
        // rem-btn（削除ボタン）などは保存したくない場合は、一時的に非表示にするなどの処理をここに挟む
        g.html = canvasEl.innerHTML;
    }

    // フッターの解説文など（editor.html 専用）
    const fBoldEl = document.getElementById('f-bold');
    if (fBoldEl) {
        g.fBold = fBoldEl.innerText; // 必要に応じてプロパティを拡張
    }

    const fDescEl = document.getElementById('f-desc');
    if (fDescEl) {
        g.fDesc = fDescEl.innerText;
    }

    // --- サイドバー表示の更新 ---
    // ガイド一覧の表示を最新のタイトルで更新する
    if (typeof renderGuideList === 'function') {
        renderGuideList();
    }
}

// 代わりに共通の初期化ロジックを関数にする
function initCommonProject() {
    const saved = localStorage.getItem('tft_autosave');
    if (saved) {
        try {
            project = patchProjectData(JSON.parse(saved));
        } catch(e) {
            console.error("ロード失敗:", e);
            project.guides = []; // 失敗時は空にする
        }
    }
    loadDefaultAssets(); // data.jsの関数
}