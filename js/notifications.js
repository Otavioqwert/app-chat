// js/notifications.js
let toastContainer = document.getElementById('toastContainer');

export function showToast(message, type = 'error', duration = 6000) {
  if (!toastContainer) {
    console.warn('Toast container não encontrado, criando fallback...');
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText =
    'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px;pointer-events:none;';
    document.body.appendChild(container);
    toastContainer = container;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = type === 'error' ? '#ff4444' : '#ffaa44';
  toast.style.cssText +=
  'background:#2a1a1a;color:#fff;padding:14px 20px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.6);font-size:14px;line-height:1.4;pointer-events:auto;animation:slideIn 0.3s ease-out;display:flex;align-items:center;gap:10px;';

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = type === 'error' ? '❌' : '⚠️';
  icon.style.cssText = 'font-size:20px;flex-shrink:0;';

  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = message;
  msg.style.cssText = 'flex:1;';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.style.cssText =
  'background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;padding:0 4px;';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, duration);
}
