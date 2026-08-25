/* ============================================================
   ADMIN-PROFISSIONAIS.JS
   CRUD para profissionais
   ============================================================ */

let profCache = [];
let profAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
  const perfil = await Auth.protegerPagina('admin');
  if (!perfil) return;

  document.getElementById('novo-prof').addEventListener('click', () => abrirModalProf());
  document.getElementById('fechar-modal-prof').addEventListener('click', fecharModalProf);
  document.getElementById('salvar-prof').addEventListener('click', salvarProf);
  document.getElementById('excluir-prof').addEventListener('click', excluirProf);

  await carregarProfissionais();
});

async function carregarProfissionais() {
  const tbody = document.getElementById('prof-tbody');
  tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    let { data, error } = await window.db.from('profissionais').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    profCache = data || [];

    // Se não encontrou profissionais, tenta a tabela `funcionarios` (alguns esquemas usam este nome)
    if (!profCache.length) {
      const res = await window.db.from('funcionarios').select('*').order('criado_em', { ascending: false });
      if (!res.error && res.data && res.data.length) {
        // Mapeia campos de funcionarios para o formato esperado
        profCache = (res.data || []).map(f => ({
          id: f.id,
          nome: f.nome,
          funcao: f.funcao || null,
          especialidades: (f.certificado || f.especializacoes || '') ? String(f.certificado || f.especializacoes).split(',').map(s => s.trim()).filter(Boolean) : [],
          ativo: f.ativo !== undefined ? f.ativo : true,
          foto_url: f.foto_url || null,
          biografia: f.biografia || null
        }));
      }
    }
    if (!profCache.length) { tbody.innerHTML = '<tr><td colspan="5">Nenhum profissional cadastrado.</td></tr>'; return; }
    tbody.innerHTML = profCache.map(p => `
      <tr>
        <td>${p.nome}</td>
        <td>${p.funcao || ''}</td>
        <td>${(p.especialidades || []).join(', ')}</td>
        <td>${p.ativo ? 'Sim' : 'Não'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="editarProf('${p.id}')">Editar</button></td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar.</td></tr>`; showToast(err.message, 'error'); }
}

function abrirModalProf(p = null) {
  profAtual = p;
  document.getElementById('modal-prof').classList.remove('hidden');
  if (!p) {
    document.getElementById('modal-prof-title').textContent = 'Novo profissional';
    document.getElementById('prof-nome').value = '';
    document.getElementById('prof-funcao').value = '';
    document.getElementById('prof-espec').value = '';
    document.getElementById('prof-bio').value = '';
    document.getElementById('prof-foto').value = '';
    document.getElementById('excluir-prof').classList.add('hidden');
  } else {
    document.getElementById('modal-prof-title').textContent = 'Editar profissional';
    document.getElementById('prof-nome').value = p.nome || '';
    document.getElementById('prof-funcao').value = p.funcao || '';
    document.getElementById('prof-espec').value = (p.especialidades || []).join(', ');
    document.getElementById('prof-bio').value = p.biografia || '';
    document.getElementById('prof-foto').value = p.foto_url || '';
    document.getElementById('excluir-prof').classList.remove('hidden');
  }
}

function fecharModalProf() { document.getElementById('modal-prof').classList.add('hidden'); }

async function salvarProf() {
  const nome = document.getElementById('prof-nome').value.trim();
  if (!nome) { showToast('Nome é obrigatório', 'warning'); return; }
  const payload = {
    nome,
    funcao: document.getElementById('prof-funcao').value.trim(),
    biografia: document.getElementById('prof-bio').value.trim(),
    especialidades: document.getElementById('prof-espec').value.split(',').map(s => s.trim()).filter(Boolean),
    foto_url: document.getElementById('prof-foto').value.trim(),
    ativo: true
  };
  try {
    if (!profAtual) {
      await window.db.from('profissionais').insert(payload);
      showToast('Profissional criado', 'success');
    } else {
      await window.db.from('profissionais').update(payload).eq('id', profAtual.id);
      showToast('Profissional atualizado', 'success');
    }
    fecharModalProf();
    await carregarProfissionais();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editarProf(id) { const p = profCache.find(x => x.id === id); abrirModalProf(p); }

async function excluirProf() {
  if (!profAtual) return; if (!confirm('Excluir este profissional?')) return;
  try { await window.db.from('profissionais').delete().eq('id', profAtual.id); showToast('Profissional excluído', 'success'); fecharModalProf(); await carregarProfissionais(); } catch (err) { showToast(err.message, 'error'); }
}

window.editarProf = editarProf;
