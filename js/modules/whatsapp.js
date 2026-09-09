/* ============================================================
   WHATSAPP.JS
   Exibe botão flutuante que lê configuração em 'configuracoes'
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // garantir que window.db exista
    if (!window.db) return;
    const { data, error } = await window.db.from('configuracoes').select('*').in('chave', ['whatsapp_number','whatsapp_message']);
    if (error) return;
    const conf = {};
    (data || []).forEach(r => conf[r.chave] = r.valor);

    const number = conf.whatsapp_number || '';
    const message = conf.whatsapp_message || 'Olá, gostaria de agendar um serviço.';
    if (!number) return; // não exibir botão sem número

    const a = document.createElement('a');
    a.id = 'wa-float';
    a.href = `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(message)}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'wa-float';
    a.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
    document.body.appendChild(a);
  } catch (err) {
    // não quebrar a página por falha no botão
    console.debug('WhatsApp widget error', err.message);
  }
});
