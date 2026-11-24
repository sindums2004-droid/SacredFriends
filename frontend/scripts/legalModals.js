/**
 * Legal Modals (Terms & Conditions, Privacy Policy)
 */

export function initLegalModals() {
  const termsModal = document.getElementById('terms-modal');
  const privacyModal = document.getElementById('privacy-modal');

  const openTermsBtns = document.querySelectorAll('.action-open-terms');
  const openPrivacyBtns = document.querySelectorAll('.action-open-privacy');

  const closeTermsBtn = document.getElementById('terms-modal-close');
  const closePrivacyBtn = document.getElementById('privacy-modal-close');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openTermsBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(termsModal);
    });
  });

  openPrivacyBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(privacyModal);
    });
  });

  closeTermsBtn?.addEventListener('click', () => closeModal(termsModal));
  closePrivacyBtn?.addEventListener('click', () => closeModal(privacyModal));

  [termsModal, privacyModal].forEach((m) => {
    m?.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(termsModal);
      closeModal(privacyModal);
    }
  });
}

