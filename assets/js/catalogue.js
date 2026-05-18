(function () {
  const choreographies = [
    // TIER S — Bestsellers & New 2025
    { id: 1, title: "Ordinary", artist: "Alex Warren", style: "slow", tags: ["new"], rank: 1, slug: "ordinary-alex-warren" },
    { id: 2, title: "Die With A Smile", artist: "Lady Gaga & Bruno Mars", style: "valse", tags: ["bestseller"], rank: 2, slug: "die-with-a-smile-lady-gaga-bruno-mars" },
    { id: 3, title: "Beautiful Things", artist: "Benson Boone", style: "slow", tags: ["bestseller"], rank: 3, slug: "beautiful-things-benson-boone" },
    { id: 4, title: "Carry You Home", artist: "Alex Warren", style: "slow", tags: ["new"], rank: 4, slug: "carry-you-home-alex-warren" },
    { id: 5, title: "Can't Help Falling In Love", artist: "Elvis Presley", style: "valse", tags: ["bestseller"], rank: 5, slug: "cant-help-falling-in-love-elvis-presley" },
    { id: 6, title: "Hold My Hand", artist: "Lady Gaga (Top Gun)", style: "valse", tags: ["bestseller"], rank: 6, slug: "hold-my-hand-lady-gaga-top-gun" },
    { id: 7, title: "Young and Beautiful", artist: "Lana Del Rey", style: "slow", tags: ["bestseller"], rank: 7, slug: "young-and-beautiful-lana-del-rey" },
    { id: 8, title: "A Thousand Years", artist: "Christina Perri", style: "valse", tags: ["bestseller"], rank: 8, slug: "a-thousand-years-christina-perri" },
    { id: 9, title: "Perfect", artist: "Ed Sheeran (version simple)", style: "valse", tags: ["bestseller"], rank: 9, slug: "perfect-ed-sheeran" },
    { id: 10, title: "You Are The Reason", artist: "Calum Scott", style: "slow", tags: ["bestseller"], rank: 10, slug: "you-are-the-reason-calum-scott" },
    { id: 11, title: "Can I Have This Dance", artist: "High School Musical", style: "slow", tags: ["bestseller"], rank: 11, slug: "can-i-have-this-dance-hsm" },
    { id: 12, title: "Rewrite The Stars", artist: "Anne-Marie & James Arthur", style: "slow", tags: ["bestseller"], rank: 12, slug: "rewrite-the-stars-anne-marie-james-arthur" },
    { id: 13, title: "Iris", artist: "Goo Goo Dolls", style: "slow", tags: ["bestseller"], rank: 13, slug: "iris-goo-goo-dolls" },
    { id: 14, title: "MIX Can't Help & Carry You Home", artist: "Elvis Presley × Alex Warren", style: "mix", tags: ["bestseller"], rank: 14, price: 105, slug: "mix-cant-help-carry-you-home" },
    { id: 15, title: "MIX A Thousand Years & Rewrite The Stars", artist: "Christina Perri × Anne-Marie", style: "mix", tags: ["bestseller"], rank: 15, price: 105, slug: "mix-a-thousand-years-rewrite-the-stars" },
    { id: 16, title: "Perfect For Me", artist: "Bradley Marshall", style: "slow", tags: ["new"], rank: 16, slug: "perfect-for-me-bradley-marshall" },
    { id: 17, title: "Biblical", artist: "Calum Scott", style: "slow", tags: ["bestseller"], rank: 17, slug: "biblical-calum-scott" },
    { id: 18, title: "I Think They Call This Love", artist: "Elliot James Reay", style: "valse", tags: ["new"], rank: 18, slug: "i-think-they-call-this-love-elliot-james-reay" },
    { id: 19, title: "A Thousand Years (version courte)", artist: "Christina Perri", style: "valse", tags: ["bestseller"], rank: 19, slug: "a-thousand-years-christina-perri" },
    { id: 20, title: "Can You Feel the Love Tonight", artist: "Elton John (Le Roi Lion)", style: "valse", tags: ["bestseller"], rank: 20, slug: "can-you-feel-the-love-tonight-elton-john" },
    { id: 21, title: "Stand By Me", artist: "Ben E. King", style: "slow", tags: [], rank: 21, slug: "stand-by-me-ben-e-king" },
    { id: 22, title: "I Don't Want to Miss a Thing", artist: "Aerosmith", style: "slow", tags: ["bestseller"], rank: 22, slug: "i-dont-want-to-miss-a-thing-aerosmith" },
    { id: 23, title: "Can't Take My Eyes Off You", artist: "Frankie Valli", style: "rock", tags: ["bestseller"], rank: 23, slug: "cant-take-my-eyes-off-you-frankie-valli" },
    { id: 24, title: "The Time of My Life", artist: "Dirty Dancing", style: "rock", tags: ["new"], rank: 24, slug: "the-time-of-my-life-dirty-dancing" },
    { id: 25, title: "Love Story", artist: "Indila", style: "slow", tags: ["bestseller", "francais"], rank: 25, slug: "love-story-indila" },
    { id: 26, title: "All of Me", artist: "John Legend (version simple)", style: "slow", tags: ["bestseller"], rank: 26, slug: "all-of-me-john-legend" },
    { id: 27, title: "Ordinary (version mariage)", artist: "Alex Warren", style: "slow", tags: ["new"], rank: 27, slug: "ordinary-alex-warren" },
    { id: 28, title: "You're Still The One", artist: "Teddy Swims", style: "slow", tags: ["new"], rank: 28, slug: "youre-still-the-one-teddy-swims" },
    { id: 29, title: "Thinking Out Loud", artist: "Ed Sheeran", style: "slow", tags: ["bestseller"], rank: 29, slug: "thinking-out-loud-ed-sheeran" },
    { id: 30, title: "At Last", artist: "Etta James", style: "slow", tags: [], rank: 30, slug: "at-last-etta-james" },
    { id: 31, title: "Perfect Duet", artist: "Ed Sheeran (version longue)", style: "valse", tags: [], rank: 31, slug: "perfect-ed-sheeran" },
    { id: 32, title: "All of Me", artist: "John Legend (original)", style: "slow", tags: [], rank: 32, slug: "all-of-me-john-legend" },
    { id: 33, title: "Lover", artist: "Taylor Swift", style: "slow", tags: [], rank: 33, slug: "lover-taylor-swift" },
    { id: 34, title: "Wildest Dreams (Bridgerton)", artist: "Duomo", style: "valse", tags: [], rank: 34, slug: "wildest-dreams-bridgerton-duomo" },
    { id: 35, title: "Lifetime", artist: "Justin Bieber", style: "slow", tags: [], rank: 35, slug: "lifetime-justin-bieber" },
    { id: 36, title: "Until I Found You", artist: "Stephen Sanchez", style: "slow", tags: [], rank: 36, slug: "until-i-found-you-stephen-sanchez" },
    { id: 37, title: "Dancing in the Moonlight", artist: "Toploader", style: "rock", tags: [], rank: 37, slug: "dancing-in-the-moonlight-toploader" },
    { id: 38, title: "Unchained Melody", artist: "Righteous Brothers", style: "slow", tags: [], rank: 38, slug: "unchained-melody-righteous-brothers" },
    { id: 39, title: "Dandelions", artist: "Ruth B.", style: "slow", tags: [], rank: 39, slug: "dandelions-ruth-b" },
    { id: 40, title: "Your Song", artist: "Elton John", style: "slow", tags: [], rank: 40, slug: "your-song-elton-john" },
    { id: 41, title: "La Vie En Rose", artist: "Daniela Andrade", style: "slow", tags: ["francais"], rank: 41, slug: "la-vie-en-rose-daniela-andrade" },
    { id: 42, title: "Stumblin' In", artist: "Chris Norman & Suzi Quatro", style: "rock", tags: [], rank: 42, slug: "stumblin-in-chris-norman-suzi-quatro" },
    { id: 43, title: "Stumblin' In", artist: "CYRIL (version moderne)", style: "rock", tags: [], rank: 43, slug: "stumblin-in-cyril" },
    { id: 44, title: "Hallelujah", artist: "Alexandra Burke", style: "slow", tags: [], rank: 44, slug: "hallelujah-alexandra-burke" },
    { id: 45, title: "Marry You", artist: "Bruno Mars", style: "rock", tags: [], rank: 45, slug: "marry-you-bruno-mars" },
    { id: 46, title: "Photograph", artist: "Ed Sheeran", style: "slow", tags: [], rank: 46, slug: "photograph-ed-sheeran" },
    { id: 47, title: "Love Me Like You Do", artist: "Ellie Goulding", style: "slow", tags: [], rank: 47, slug: "love-me-like-you-do-ellie-goulding" },
    { id: 48, title: "Make You Feel My Love", artist: "Adele", style: "slow", tags: [], rank: 48, slug: "make-you-feel-my-love-adele" },
    { id: 49, title: "LOVE", artist: "Nat King Cole", style: "slow", tags: [], rank: 49, slug: "love-nat-king-cole" },
    { id: 50, title: "Forever My Love", artist: "J Balvin & Ed Sheeran", style: "slow", tags: [], rank: 50, slug: "forever-my-love-j-balvin-ed-sheeran" },
    { id: 51, title: "Enchanted", artist: "Taylor Swift", style: "slow", tags: [], rank: 51, slug: "enchanted-taylor-swift" },
    { id: 52, title: "I Belong to You", artist: "Jacob Lee", style: "slow", tags: [], rank: 52, slug: "i-belong-to-you-jacob-lee" },
    { id: 53, title: "Be More", artist: "Stephen Sanchez", style: "slow", tags: [], rank: 53, slug: "be-more-stephen-sanchez" },
    { id: 54, title: "Who We Love", artist: "Sam Smith & Ed Sheeran", style: "slow", tags: [], rank: 54, slug: "who-we-love-sam-smith-ed-sheeran" },
    { id: 55, title: "Give Me Everything (Bridgerton)", artist: "Archer Marsh", style: "rock", tags: [], rank: 55, slug: "give-me-everything-bridgerton-archer-marsh" },
    { id: 56, title: "Lose Control", artist: "Teddy Swims", style: "slow", tags: ["new"], rank: 56, slug: "lose-control-teddy-swims" }
  ];

  const cardColors = ["#E8C9B8", "#D9A89C", "#C87856", "#B8985F", "#A8364C", "#8B3A1F"];
  const styleLabels = { valse: "VALSE", slow: "SLOW", rock: "ROCK", mix: "MIX" };

  let currentFilter = "all";
  let currentSort = "popular";
  let currentSearch = "";

  const grid = document.getElementById("catalogue-grid");
  const empty = document.getElementById("catalogue-empty");
  const count = document.getElementById("results-count");
  const sortSelect = document.getElementById("sort-select");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const resetBtn = document.getElementById("reset-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");

  function normalize(str) {
    return String(str).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applySearch(list) {
    const q = currentSearch.trim();
    if (!q) return list;
    const needle = normalize(q);
    return list.filter((c) => normalize(c.title).includes(needle) || normalize(c.artist).includes(needle));
  }

  function applyFilter(list) {
    if (currentFilter === "all") return list;
    if (["valse", "slow", "rock", "mix"].includes(currentFilter)) {
      return list.filter((c) => c.style === currentFilter);
    }
    return list.filter((c) => c.tags.includes(currentFilter));
  }

  function applySort(list) {
    const arr = [...list];
    if (currentSort === "popular") {
      arr.sort((a, b) => a.rank - b.rank);
    } else if (currentSort === "new") {
      arr.sort((a, b) => {
        const aNew = a.tags.includes("new") ? 0 : 1;
        const bNew = b.tags.includes("new") ? 0 : 1;
        return aNew - bNew || a.rank - b.rank;
      });
    } else if (currentSort === "az") {
      arr.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    } else if (currentSort === "za") {
      arr.sort((a, b) => b.title.localeCompare(a.title, "fr"));
    }
    return arr;
  }

  function cardHTML(c, i) {
    const color = cardColors[i % cardColors.length];
    const price = c.price || 89;
    const styleLabel = styleLabels[c.style] || "SLOW";
    const isNew = c.tags.includes("new");
    const isBest = c.tags.includes("bestseller");
    const flag = isNew
      ? '<span class="card-badge card-badge-new">Nouveau</span>'
      : isBest
        ? '<span class="card-badge card-badge-best">Bestseller</span>'
        : "";

    const hasPage = Boolean(c.slug);
    const cta = hasPage
      ? '<span class="choreo-modules">Découvrir →</span>'
      : '<span class="choreo-modules choreo-modules--soon">Bientôt</span>';

    const cardInner = `
      <div class="choreo-card-visual" style="background: ${color};">
        <span class="choreo-style-badge">${styleLabel}</span>
        ${flag}
        <button class="choreo-play" aria-label="Voir un aperçu de ${escapeHtml(c.title)}"${hasPage ? '' : ' disabled'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBF8F3" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <div class="choreo-card-info">
        <h3 class="choreo-title">${escapeHtml(c.title)}</h3>
        <p class="choreo-artist">${escapeHtml(c.artist)}</p>
        <div class="choreo-footer">
          <span class="choreo-price">${price}€</span>
          ${cta}
        </div>
      </div>
    `;

    if (hasPage) {
      return `<a class="choreo-card choreo-card--linked" href="choregraphies/${c.slug}.html" aria-label="Découvrir la chorégraphie ${escapeHtml(c.title)}">${cardInner}</a>`;
    }
    return `<article class="choreo-card choreo-card--soon" aria-label="${escapeHtml(c.title)}, fiche bientôt disponible">${cardInner}</article>`;
  }

  function render() {
    const list = applySort(applyFilter(applySearch(choreographies)));

    if (count) {
      const isFiltered = currentSearch.trim() !== "" || currentFilter !== "all";
      count.textContent = isFiltered
        ? `${list.length} résultat${list.length > 1 ? "s" : ""}`
        : "";
    }

    if (!list.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = list.map(cardHTML).join("");
  }

  // Recherche
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      if (searchClear) searchClear.hidden = currentSearch.trim() === "";
      render();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      currentSearch = "";
      searchClear.hidden = true;
      render();
      searchInput.focus();
    });
  }

  // Filtres
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Tri
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      render();
    });
  }

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentSearch = "";
      currentFilter = "all";
      currentSort = "popular";
      if (searchInput) searchInput.value = "";
      if (searchClear) searchClear.hidden = true;
      filterBtns.forEach((b) => b.classList.toggle("active", b.dataset.filter === "all"));
      if (sortSelect) sortSelect.value = "popular";
      render();
    });
  }

  render();
})();
