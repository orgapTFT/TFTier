document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('contextmenu', event => {
      event.preventDefault();
      const guide = card.dataset.guide;
      const note = card.dataset.note || '';
      const url = new URL('builder.html', window.location.href);
      url.searchParams.set('guide', guide);
      if (note) url.searchParams.set('note', note);
      window.open(url.toString(), '_blank');
    });

    card.addEventListener('click', () => {
      const guide = card.dataset.guide;
      const url = new URL('builder.html', window.location.href);
      url.searchParams.set('guide', guide);
      window.location.href = url.toString();
    });
  });
});
