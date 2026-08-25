/* ============================================================
   AGENDAR.JS
   Conecta o calendário (Booking.iniciarCalendario) ao modal de
   horários e envia a solicitação de agendamento ao Supabase.
   ============================================================ */

let perfilAtual = null;
let dataEscolhida = null;
let horarioEscolhido = null;

document.addEventListener("DOMContentLoaded", async () => {
  perfilAtual = await Auth.protegerPagina("cliente");
  if (!perfilAtual) return;

  document.getElementById("logout-btn").addEventListener("click", () => Auth.logout());

  await Booking.iniciarCalendario(abrirModalHorarios);

  document.getElementById("fechar-modal").addEventListener("click", fecharModal);
  document.getElementById("confirmar-agendamento").addEventListener("click", confirmarAgendamento);
});

async function abrirModalHorarios(dataStr) {
  dataEscolhida = dataStr;
  horarioEscolhido = null;
  document.getElementById("modal-data-titulo").textContent = `Horários para ${formatarData(dataStr)}`;
  document.getElementById("confirmar-agendamento").disabled = true;
  const container = document.getElementById("time-slots");
  container.innerHTML = "Carregando...";

  // Carrega serviços e profissionais nos selects (se ainda não carregados)
  await carregarServicosEProfissionais();

  const profissionalSelect = document.getElementById("select-profissional");
  const profissionalId = profissionalSelect.value || null;

  const horarios = await Booking.getHorariosDisponiveis(dataStr, profissionalId);
  if (!horarios.length) {
    container.innerHTML = "<p>Nenhum horário configurado para este dia.</p>";
  } else {
    container.innerHTML = horarios.map(h => `
      <button class="time-slot" data-horario="${h.horario}" ${h.disponivel ? "" : "disabled"}>${h.horario}</button>
    `).join("");
    container.querySelectorAll(".time-slot:not(:disabled)").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        horarioEscolhido = btn.dataset.horario;
        document.getElementById("confirmar-agendamento").disabled = false;
      });
    });
  }

  // Atualiza horários quando trocar profissional
  document.getElementById("select-profissional").onchange = async (e) => {
    const profId = e.target.value || null;
    const slots = await Booking.getHorariosDisponiveis(dataStr, profId);
    container.innerHTML = slots.map(h => `
      <button class="time-slot" data-horario="${h.horario}" ${h.disponivel ? "" : "disabled"}>${h.horario}</button>
    `).join("");
    container.querySelectorAll(".time-slot:not(:disabled)").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        horarioEscolhido = btn.dataset.horario;
        document.getElementById("confirmar-agendamento").disabled = false;
      });
    });
  };

  document.getElementById("modal-horarios").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("modal-horarios").classList.add("hidden");
}

/** Carrega serviços e profissionais para os selects do modal (cache simples) */
async function carregarServicosEProfissionais() {
  const servicoSelect = document.getElementById("select-servico");
  const profSelect = document.getElementById("select-profissional");
  if (!servicoSelect || !profSelect) return;
  if (servicoSelect.dataset.loaded === "true") return;

  // opções padrão solicitadas pelo usuário
  const defaultServicos = [
    { id: "lavagem", nome: "Lavagem" },
    { id: "lavagem-detalhada", nome: "Lavagem Detalhada" },
    { id: "polimento-tecnico", nome: "Polimento Tecnico" },
    { id: "vitrificacao", nome: "Vitrificação" }
  ];
  const defaultProfs = [
    { id: "joao", nome: "João" },
    { id: "luis", nome: "Luis" }
  ];

  const [{ data: servicos }, { data: profs }] = await Promise.all([
    window.db.from("servicos").select("id, nome, duracao_min, preco").eq("ativo", true),
    window.db.from("profissionais").select("id, nome, funcao, foto_url").eq("ativo", true)
  ]);

  // mescla mantendo as opções padrão no topo e evitando duplicatas por nome
  // Serviços: manter os padrões no topo e adicionar serviços do banco que não duplicam por nome
  const servicosList = [...defaultServicos];
  (servicos || []).forEach(s => {
    if (!servicosList.some(ds => String(ds.nome).toLowerCase() === String(s.nome).toLowerCase())) {
      servicosList.push({ id: s.id, nome: s.nome, duracao_min: s.duracao_min });
    }
  });

  // Profissionais: priorizar registros do banco (usando seus UUIDs). Se João/Luis não existirem no DB, adiciona os padrões.
  const profsList = (profs || []).map(p => ({ id: p.id, nome: p.nome, funcao: p.funcao }));
  defaultProfs.forEach(dp => {
    if (!profsList.some(p => String(p.nome).toLowerCase() === String(dp.nome).toLowerCase())) {
      profsList.push(dp);
    }
  });

  servicoSelect.innerHTML = ` <option value="">— Selecionar serviço —</option> ` + servicosList.map(s => `<option value="${s.id}">${s.nome}${s.duracao_min? ` — ${s.duracao_min} min` : ''}</option>`).join("");
  profSelect.innerHTML = ` <option value="">— Selecionar profissional —</option> ` + profsList.map(p => `<option value="${p.id}">${p.nome}${p.funcao? ` — ${p.funcao}` : ''}</option>`).join("");

  servicoSelect.dataset.loaded = "true";
  profSelect.dataset.loaded = "true";
}

async function confirmarAgendamento() {
  const btn = document.getElementById("confirmar-agendamento");
  const observacoes = document.getElementById("observacoes").value;

  const servicoId = document.getElementById("select-servico").value || null;
  const profissionalId = document.getElementById("select-profissional").value || null;
  const veiculo = {
    marca: document.getElementById("veiculo-marca").value.trim(),
    modelo: document.getElementById("veiculo-modelo").value.trim(),
    ano: document.getElementById("veiculo-ano").value ? parseInt(document.getElementById("veiculo-ano").value, 10) : null,
    cor: document.getElementById("veiculo-cor").value.trim(),
    placa: document.getElementById("veiculo-placa").value.trim(),
    observacoes: observacoes
  };

  btn.disabled = true;
  btn.textContent = "Agendando...";

  try {
    await Booking.criarAgendamento({
      clienteId: perfilAtual.id,
      data: dataEscolhida,
      horario: horarioEscolhido,
      observacoes,
      profissionalId,
      servicoId,
      veiculo
    });
    showToast("Agendamento solicitado! Aguarde a confirmação.", "success");
    fecharModal();
    setTimeout(() => (window.location.href = "dashboard.html"), 1200);
  } catch (err) {
    showToast(err.message.includes("duplicate") ? "Este horário acabou de ser reservado. Escolha outro." : err.message, "error");
    btn.disabled = false;
    btn.textContent = "Confirmar agendamento";
  }
}
