function placeChampion(container, data) {
    if (!container) return;
    container.innerHTML = ''; 

    const currentStars = parseInt(data.stars) || 1;

    const champ = document.createElement('div');
    champ.className = 'champ';
    champ.draggable = true;
    champ.dataset.stars = currentStars;
    champ.innerHTML = `<div class="champ-icon">${data.icon}</div>`;

    // 星
    const starLabel = document.createElement('div');
    starLabel.className = 'star';
    starLabel.textContent = currentStars > 1 ? '★'.repeat(currentStars - 1) : '';

    // 星クリック処理（省略可、必要なら残して）

    // === アイテム部分を強化 ===
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items-container';

    if (data.items && Array.isArray(data.items) && typeof addItemSlot === 'function') {
        data.items.forEach(iconHTML => {
            if (iconHTML && iconHTML.trim() !== '') {
                addItemSlot(itemsDiv, iconHTML);
            }
        });
    }

    container.appendChild(champ);
    container.appendChild(itemsDiv);
    container.appendChild(starLabel);

    addDragToChampion(champ);
}