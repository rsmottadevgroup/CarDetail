/* ============================================================
   ADMIN-CONFIGURACOES.JS
   Edita pares chave/valor na tabela configuracoes
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const perfil = await Auth.protegerPagina('admin');
  if (!perfil) return;

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('save-config').addEventListener('click', salvar);

  await carregar();
});

async function carregar() {
  try {
    const conf = await Admin.getConfiguracoes();
    document.getElementById('wh-number').value = conf.whatsapp_number || '';
    document.getElementById('wh-msg').value = conf.whatsapp_message || '';
  } catch (err) { showToast(err.message, 'error'); }
}

async function salvar() {
  const num = document.getElementById('wh-number').value.trim();
  const msg = document.getElementById('wh-msg').value.trim();
  try {
    await Admin.salvarConfiguracao('whatsapp_number', num);
    await Admin.salvarConfiguracao('whatsapp_message', msg);
    showToast('Configurações salvas', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}
