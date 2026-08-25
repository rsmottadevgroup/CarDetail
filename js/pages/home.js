/* ============================================================
   HOME.JS
   Busca os serviços do Supabase e renderiza os cards premium
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const grid = document.getElementById('services-grid');
    if (!grid || !window.db) return;

    const { data: servicos, error } = await window.db.from('servicos').select('id, nome, descricao, duracao_min, preco, foto_url').eq('ativo', true);
    if (error) throw error;

    if (!servicos || !servicos.length) {
      grid.innerHTML = '<p style="color:var(--color-silver);">Nenhum serviço cadastrado ainda.</p>';
      return;
    }

    grid.innerHTML = servicos.map(s => `
      <article class="service-card">
        <div class="service-media"><img src="${s.foto_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=7a7b7c'}" alt="${s.nome}" loading="lazy"></div>
        <div class="service-body">
          <h3>${s.nome}</h3>
          <p class="service-desc">${s.descricao || ''}</p>
          <div class="service-meta">
            <span>${s.duracao_min ? s.duracao_min + ' min' : ''}</span>
            <span class="price">${s.preco ? 'R$ ' + Number(s.preco).toFixed(2) : ''}</span>
          </div>
          <div class="service-actions">
            <a href="pages/agendar.html" class="btn btn-cta small">Agendar</a>
            <button class="btn btn-outline small" data-id="${s.id}">Ver detalhes</button>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error('Erro carregando serviços', err);
  }
});
/* ============================================================
   HOME.JS
   Comportamento exclusivo da página inicial: carrossel premium
   e envio do formulário de contato.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initCarousel();
  initContactForm();
});

function initCarousel() {
  const track = document.getElementById("carousel-track");
  const controls = document.getElementById("carousel-controls");
  if (!track) return;

  const slides = track.children;
  let current = 0;

  // Cria os pontos indicadores dinamicamente
  for (let i = 0; i < slides.length; i++) {
    const dot = document.createElement("button");
    dot.className = "carousel-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Ir para slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    controls.appendChild(dot);
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    [...controls.children].forEach((d, i) => d.classList.toggle("active", i === current));
  }

  document.querySelector(".carousel-arrow.prev").addEventListener("click", () => goTo(current - 1));
  document.querySelector(".carousel-arrow.next").addEventListener("click", () => goTo(current + 1));

  // Autoplay a cada 6 segundos
  setInterval(() => goTo(current + 1), 6000);
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("contact-email");

    if (!isValidEmail(email.value)) {
      showFieldError(email, "Informe um e-mail válido.");
      return;
    }
    clearFieldError(email);

    // Aqui a mensagem poderia ser gravada em uma tabela "mensagens_contato" no Supabase.
    // Mantido simples por padrão para não exigir tabela extra sem uso definido.
    showToast("Mensagem enviada! Em breve entraremos em contato.", "success");
    form.reset();
  });
}
