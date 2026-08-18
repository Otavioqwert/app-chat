export function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
    try {
      return marked.parse(text);
    } catch (e) {
      return simpleMarkdown(text);
    }
  }
  return simpleMarkdown(text);
}

function simpleMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createMessageElement(content, type, rawContent) {
  const container = document.createElement('div');
  container.className = `message ${type}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = renderMarkdown(content);
  container.appendChild(contentDiv);

  const toolbar = document.createElement('div');
  toolbar.className = 'message-toolbar';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copiar';
  copyBtn.title = 'Copiar texto puro';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(rawContent).then(() => {
      showToast('Copiado!', 'success', 1500);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = rawContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copiado!', 'success', 1500);
    });
  });
  toolbar.appendChild(copyBtn);

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️ Editar';
  editBtn.title = 'Editar mensagem';
  editBtn.addEventListener('click', () => {
    const novo = prompt('Editar mensagem:', rawContent);
    if (novo !== null) {
      const trimmed = novo.trim();
      if (trimmed) {
        contentDiv.innerHTML = renderMarkdown(trimmed);
        container.dataset.rawContent = trimmed;
        showToast('Mensagem editada localmente.', 'success', 2000);
        const event = new CustomEvent('message-edited', {
          detail: { container, newContent: trimmed, oldContent: rawContent }
        });
        document.dispatchEvent(event);
      }
    }
  });
  toolbar.appendChild(editBtn);

  const rawBtn = document.createElement('button');
  rawBtn.textContent = '🔍 Raw';
  rawBtn.title = 'Ver texto puro';
  rawBtn.addEventListener('click', () => {
    const raw = container.dataset.rawContent || rawContent;
    alert(raw);
  });
  toolbar.appendChild(rawBtn);

  container.appendChild(toolbar);
  container.dataset.rawContent = rawContent;

  return container;
}

function showToast(msg, type = 'success', duration = 2000) {
  import('./notifications.js').then(module => {
    module.showToast(msg, type, duration);
  }).catch(() => {
    console.log(msg);
  });
}
