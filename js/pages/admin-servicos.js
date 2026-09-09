/* ============================================================
   ADMIN-SERVICOS.JS
   CRUD simples para serviços
   ============================================================ */

let servicosCache = [];
let servicoAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
  const perfil = await Auth.protegerPagina('admin');
  if (!perfil) return;

  document.getElementById('novo-servico').addEventListener('click', () => abrirModal());
  document.getElementById('fechar-modal-servico').addEventListener('click', fecharModal);
  document.getElementById('salvar-servico').addEventListener('click', salvarServico);
  document.getElementById('excluir-servico').addEventListener('click', excluirServico);

  await carregarServicos();
});

async function carregarServicos() {
  const tbody = document.getElementById('servicos-tbody');
  tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    const { data, error } = await window.db.from('servicos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    servicosCache = data || [];
    if (!servicosCache.length) { tbody.innerHTML = '<tr><td colspan="5">Nenhum serviço cadastrado.</td></tr>'; return; }
    tbody.innerHTML = servicosCache.map(s => `
      <tr>
        <td>${s.nome}</td>
        <td>${s.duracao_min || ''} min</td>
        <td>${s.preco ? 'R$ ' + Number(s.preco).toFixed(2) : ''}</td>
        <td>${s.ativo ? 'Sim' : 'Não'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="editarServico('${s.id}')">Editar</button></td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar.</td></tr>`; showToast(err.message, 'error'); }
}

function abrirModal(serv = null) {
  servicoAtual = serv;
  document.getElementById('modal-servico').classList.remove('hidden');
  if (!serv) {
    document.getElementById('modal-title').textContent = 'Novo serviço';
    document.getElementById('serv-nome').value = '';
    document.getElementById('serv-desc').value = '';
    document.getElementById('serv-dur').value = 30;
    document.getElementById('serv-preco').value = '';
    document.getElementById('serv-foto').value = '';
    document.getElementById('excluir-servico').classList.add('hidden');
  } else {
    document.getElementById('modal-title').textContent = 'Editar serviço';
    document.getElementById('serv-nome').value = serv.nome || '';
    document.getElementById('serv-desc').value = serv.descricao || '';
    document.getElementById('serv-dur').value = serv.duracao_min || 30;
    document.getElementById('serv-preco').value = serv.preco || '';
    document.getElementById('serv-foto').value = serv.foto_url || '';
    document.getElementById('excluir-servico').classList.remove('hidden');
  }
}

function fecharModal() { document.getElementById('modal-servico').classList.add('hidden'); }

async function salvarServico() {
  const nome = document.getElementById('serv-nome').value.trim();
  if (!nome) { showToast('Nome é obrigatório', 'warning'); return; }
  const payload = {
    nome,
    descricao: document.getElementById('serv-desc').value.trim(),
    duracao_min: parseInt(document.getElementById('serv-dur').value, 10) || 30,
    preco: document.getElementById('serv-preco').value ? parseFloat(document.getElementById('serv-preco').value) : null,
    foto_url: document.getElementById('serv-foto').value.trim(),
    ativo: true
  };
  try {
    if (!servicoAtual) {
      await window.db.from('servicos').insert(payload);
      showToast('Serviço criado', 'success');
    } else {
      await window.db.from('servicos').update(payload).eq('id', servicoAtual.id);
      showToast('Serviço atualizado', 'success');
    }
    fecharModal();
    await carregarServicos();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editarServico(id) {
  const s = servicosCache.find(x => x.id === id);
  abrirModal(s);
}

async function excluirServico() {
  if (!servicoAtual) return;
  if (!confirm('Excluir este serviço?')) return;
  try {
    await window.db.from('servicos').delete().eq('id', servicoAtual.id);
    showToast('Serviço excluído', 'success');
    fecharModal();
    await carregarServicos();
  } catch (err) { showToast(err.message, 'error'); }
}

window.editarServico = editarServico;
