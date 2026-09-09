/* ============================================================
   BOOKING.JS
   Lógica de agendamento de consultas: monta o calendário
   (FullCalendar), calcula horários disponíveis a partir da
   tabela "disponibilidade" e grava novas consultas no Supabase.
   Depende de: config/supabase-config.js, utils/toast.js, modules/auth.js
   ============================================================ */

const Booking = {
  DURACAO_PADRAO_MIN: 30,

  /** Retorna true se a string parece um UUID v4/algum UUID (simples check) */
  _isUUID(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  },

  /** Inicializa o FullCalendar no elemento #calendar-container */
  async iniciarCalendario(onDateClick) {
    const calendarEl = document.getElementById("calendar-container");
    if (!calendarEl || !window.FullCalendar) return null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "pt-BR",
      height: "auto",
      selectable: true,
      headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" },
      // Traduções PT-BR explícitas para botões, dias e textos auxiliares
      buttonText: {
        today: "Hoje",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        list: "Lista"
      },
      allDayText: "Dia todo",
      firstDay: 1,
      dayHeaderFormat: { weekday: 'short' },
      validRange: { start: new Date().toISOString().split("T")[0] },
      dateClick: async (info) => {
        const status = await this.getStatusDia(info.dateStr);
        if (status === "indisponivel") {
          showToast("A estética não atende neste dia.", "warning");
          return;
        }
        if (status === "lotado") {
          showToast("Todos os horários deste dia já foram preenchidos.", "warning");
          return;
        }
        onDateClick(info.dateStr);
      },
      dayCellDidMount: async (arg) => {
        const status = await this.getStatusDia(arg.date.toISOString().split("T")[0]);
        if (status === "disponivel") arg.el.classList.add("fc-day-available");
        if (status === "lotado") arg.el.classList.add("fc-day-full");
        if (status === "indisponivel") arg.el.classList.add("fc-day-unavailable");
      }
    });
    calendar.render();
    return calendar;
  },

  /** Retorna "disponivel" | "lotado" | "indisponivel" para uma data (YYYY-MM-DD) */
  async getStatusDia(dataStr) {
    const diaSemana = new Date(dataStr + "T12:00:00").getDay(); // 0=domingo ... 6=sábado

    // Verifica disponibilidade por profissional (prioridade)
    const { data: disponProf } = await window.db
      .from("disponibilidade_profissionais")
      .select("*")
      .eq("dia_semana", diaSemana)
      .eq("ativo", true);

    if (disponProf && disponProf.length) {
      // Se existir ao menos um profissional com vaga, considera disponível
      for (const dp of disponProf) {
        const horarios = this.gerarHorarios({
          horario_inicio: dp.horario_inicio,
          horario_fim: dp.horario_fim,
          intervalo_inicio: dp.intervalo_inicio,
          intervalo_fim: dp.intervalo_fim,
          duracao_consulta_min: dp.duracao_min
        });
        const { count } = await window.db
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("data", dataStr)
          .eq("profissional_id", dp.profissional_id)
          .in("status", ["aguardando", "confirmado"]);
        if ((count || 0) < horarios.length) return "disponivel";
      }
      return "lotado";
    }

    // Fallback para disponibilidade global
    const { data: disponibilidade } = await window.db
      .from("disponibilidade")
      .select("*")
      .eq("dia_semana", diaSemana)
      .eq("ativo", true)
      .maybeSingle();

    if (!disponibilidade) return "indisponivel";

    const horarios = this.gerarHorarios(disponibilidade);
    const { count } = await window.db
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("data", dataStr)
      .in("status", ["aguardando", "confirmado"]);

    if ((count || 0) >= horarios.length) return "lotado";
    return "disponivel";
  },

  /** Gera a lista de horários (HH:MM) a partir de uma regra de disponibilidade */
  gerarHorarios(disp) {
    const slots = [];
    const duracao = disp.duracao_consulta_min || disp.duracao_atendimento_min || disp.duracao_min || this.DURACAO_PADRAO_MIN;

    const adicionarIntervalo = (inicio, fim) => {
      let [h, m] = inicio.split(":").map(Number);
      const [hf, mf] = fim.split(":").map(Number);
      while (h < hf || (h === hf && m < mf)) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        m += duracao;
        if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
      }
    };

    adicionarIntervalo(disp.horario_inicio, disp.intervalo_inicio || disp.horario_fim);
    if (disp.intervalo_fim) adicionarIntervalo(disp.intervalo_fim, disp.horario_fim);

    return slots;
  },

  /** Retorna os horários livres de uma data específica */
  async getHorariosDisponiveis(dataStr, profissionalId = null) {
    // Se o profissionalId não for um UUID válido, ignora e trata como "todos"
    if (profissionalId && !this._isUUID(profissionalId)) {
      profissionalId = null;
    }
    const diaSemana = new Date(dataStr + "T12:00:00").getDay();
    let disp = null;
    if (profissionalId) {
      const { data } = await window.db
        .from("disponibilidade_profissionais")
        .select("*")
        .eq("dia_semana", diaSemana)
        .eq("profissional_id", profissionalId)
        .eq("ativo", true)
        .maybeSingle();
      disp = data;
    }

    if (!disp) {
      const { data } = await window.db
        .from("disponibilidade")
        .select("*")
        .eq("dia_semana", diaSemana)
        .eq("ativo", true)
        .maybeSingle();
      disp = data;
    }
    if (!disp) return [];

    const todosHorarios = this.gerarHorarios(disp);
    let query = window.db.from("agendamentos").select("horario").eq("data", dataStr).in("status", ["aguardando", "confirmado"]);
    if (profissionalId) query = query.eq("profissional_id", profissionalId);
    const { data: ocupados } = await query;

    const horariosOcupados = new Set((ocupados || []).map(a => a.horario));
    return todosHorarios.map(h => ({ horario: h, disponivel: !horariosOcupados.has(h) }));
  },

  /** Cria uma nova solicitação de consulta com status "aguardando" */
  async criarAgendamento({ clienteId, data, horario, observacoes, profissionalId = null, servicoId = null, veiculo = null }) {
    let veiculoId = null;
    let observacoesExtras = [];

    // Se servicoId/profissionalId vierem como valores não-UUID (opções estáticas),
    // não os envie ao banco como FK — em vez disso, anexe como observação.
    if (profissionalId && !this._isUUID(profissionalId)) {
      observacoesExtras.push(`Profissional preferido: ${profissionalId}`);
      profissionalId = null;
    }
    if (servicoId && !this._isUUID(servicoId)) {
      observacoesExtras.push(`Serviço solicitado: ${servicoId}`);
      servicoId = null;
    }
    if (veiculo && veiculo.marca) {
      const { data: novoVeic, error: errV } = await window.db
        .from("veiculos")
        .insert({
          cliente_id: clienteId,
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          ano: veiculo.ano,
          cor: veiculo.cor,
          placa: veiculo.placa,
          observacoes: veiculo.observacoes
        })
        .select()
        .single();
      if (errV) throw errV;
      veiculoId = novoVeic.id;
    }

    const observacoesFinais = sanitizeInput(((observacoes || "") + (observacoesExtras.length ? `\n${observacoesExtras.join(' | ')}` : '')).trim());

    const { data: novo, error } = await window.db
      .from("agendamentos")
      .insert({
        cliente_id: clienteId,
        data,
        horario,
        observacoes: observacoesFinais,
        profissional_id: profissionalId,
        servico_id: servicoId,
        veiculo_id: veiculoId,
        status: "aguardando"
      })
      .select()
      .single();
    if (error) throw error;

    // Dispara a notificação push para o administrador (ver modules/notifications.js)
    if (window.Notifications) {
      window.Notifications.notificarNovoAgendamento(novo);
    }
    return novo;
  },

  async cancelarAgendamento(agendamentoId) {
    const { error } = await window.db
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", agendamentoId);
    if (error) throw error;
  },

  async listarMeusAgendamentos(clienteId) {
    const { data, error } = await window.db
      .from("agendamentos")
      .select("*, profissionais:profissional_id (nome, funcao, foto_url), servicos:servico_id (nome), veiculos:veiculo_id (marca, modelo, placa)")
      .eq("cliente_id", clienteId)
      .order("data", { ascending: false });
    if (error) throw error;
    return data;
  }
};

window.Booking = Booking;
