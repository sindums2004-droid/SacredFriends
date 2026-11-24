export function initContact() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-form-status');
  const submit = document.getElementById('contact-submit');

  if (!form || !status || !submit) return;

  form.addEventListener('submit', event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const topic = String(data.get('topic') || '').trim();
    const message = String(data.get('message') || '').trim();
    const subject = encodeURIComponent(`Sacred Friends - ${topic}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`
    );

    submit.disabled = true;
    status.textContent = 'Opening your email application...';
    window.location.href = `mailto:support@qcubic.in?subject=${subject}&body=${body}`;

    window.setTimeout(() => {
      submit.disabled = false;
      status.textContent = 'If no email app opened, please email support@qcubic.in.';
    }, 1200);
  });
}
