/* ============================================================
   GALLERY.JS
   Lightbox simples para visualizar pares Antes/Depois
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('gallery-grid');
  const modal = document.getElementById('gd-modal');
  const btnClose = document.getElementById('gd-close');
  const beforeImg = document.getElementById('gd-before');
  const afterImg = document.getElementById('gd-after');
  const btnBefore = document.getElementById('gd-show-before');
  const btnAfter = document.getElementById('gd-show-after');

  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    const before = item.dataset.before;
    const after = item.dataset.after;
    openModal(before, after);
  });

  btnClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  btnBefore.addEventListener('click', () => showState('before'));
  btnAfter.addEventListener('click', () => showState('after'));

  function openModal(before, after) {
    beforeImg.src = before;
    afterImg.src = after;
    showState('after');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    beforeImg.src = '';
    afterImg.src = '';
  }
  function showState(state) {
    if (state === 'before') {
      beforeImg.style.display = 'block';
      afterImg.style.display = 'none';
    } else {
      beforeImg.style.display = 'none';
      afterImg.style.display = 'block';
    }
  }
});
