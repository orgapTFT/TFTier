// ==================== ドロップ処理 ====================
function handleDrop(e, hex) {
    e.preventDefault();
    hex.classList.remove('dragover');

    try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        // ====================== チャンピオン移動 ======================
        if (data.type === 'champ') {
            // ...（今のチャンピオン移動処理はそのまま）...
            const source = window.currentDragSource || window.currentDragSourceBench;
            if (!source || source === hex) return;

            const sourceData = getChampionData(source);
            const targetData = hex.querySelector('.champ') ? getChampionData(hex) : null;

            hex.innerHTML = '';
            if (source !== window.currentDragSourceBench) source.innerHTML = '';

            if (targetData) placeChampion(source, targetData);
            placeChampion(hex, sourceData);

            window.currentDragSource = null;
            window.currentDragSourceBench = null;
            return;
        }

        // ====================== アイテム移動（ここを修正） ======================
        if (data.type === 'item' && data.icon) {
            const newItemName = data.icon;
            const sourceSlot = data.sourceSlot;

            // 元のアイテムを必ず削除
            if (sourceSlot) {
                sourceSlot.remove();
            }

            // ドロップ先の .items-container を探す
            let targetItemsContainer = hex.querySelector('.items-container');

            // チャンピオンが置かれていない場合は何もしない
            if (!targetItemsContainer) {
                const champDiv = hex.querySelector('.champ');
                if (!champDiv) return; // 空のhexならアイテム捨てる

                // items-container が存在しない場合は作成
                targetItemsContainer = document.createElement('div');
                targetItemsContainer.className = 'items-container';
                hex.appendChild(targetItemsContainer);
            }

            const currentItems = Array.from(targetItemsContainer.querySelectorAll('.item-slot'));

            if (currentItems.length < 3) {
                // 空きあり → 追加
                addItemSlot(targetItemsContainer, newItemName);
            } else {
                // 3つ満杯 → 一番近いアイテムと置き換え
                const rect = targetItemsContainer.getBoundingClientRect();
                const dropX = e.clientX - rect.left;

                let targetIndex = 0;
                let minDistance = Infinity;

                currentItems.forEach((item, index) => {
                    const itemRect = item.getBoundingClientRect();
                    const itemCenter = itemRect.left + itemRect.width / 2 - rect.left;
                    const distance = Math.abs(dropX - itemCenter);

                    if (distance < minDistance) {
                        minDistance = distance;
                        targetIndex = index;
                    }
                });

                currentItems[targetIndex].remove();
                addItemSlot(targetItemsContainer, newItemName);
            }

            return;
        }

    } catch (err) {
        // フォールバック
        const icon = e.dataTransfer.getData('text/plain');
        if (icon && icon.length < 30) {
            hex.innerHTML = '';
            placeChampion(hex, { icon: icon, stars: 1, items: [] });
        }
    }
}