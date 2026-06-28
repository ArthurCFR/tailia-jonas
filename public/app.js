'use strict';

// ===== État =====
const state = {
  photo: null, // { mimeType, data } base64 (sans préfixe data:)
  suits: [], // catalogue chargé
  selectedSuits: [], // ids
  background: null, // clé ambiance
};
const MAX_SUITS = 3;

const AMBIANCE_EMOJI = { 'exterieur': '🌳', 'salle-de-bal': '💎' };

// ===== Navigation entre écrans =====
const screens = document.querySelectorAll('.screen');
function show(name) {
  screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
  const active = document.querySelector(`.screen[data-screen="${name}"]`);
  if (active) active.scrollTop = 0;
}

document.querySelectorAll('[data-go]').forEach((btn) => {
  btn.addEventListener('click', () => { if (!btn.disabled) show(btn.dataset.go); });
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => show(btn.dataset.back));
});

// ===== Étape 1 : photo + redimensionnement client (canvas) =====
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const placeholder = document.getElementById('uploaderPlaceholder');
const toSuitsBtn = document.getElementById('toSuits');

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const { dataUrl, mimeType, base64 } = await resizeImage(file, 1024);
    state.photo = { mimeType, data: base64 };
    photoPreview.src = dataUrl;
    photoPreview.hidden = false;
    placeholder.hidden = true;
    toSuitsBtn.disabled = false;
  } catch (err) {
    alert("Impossible de lire cette image. Essayez-en une autre.");
    console.error(err);
  }
});

// Redimensionne dans un canvas → JPEG base64 (≤ maxDim sur le plus grand côté).
function resizeImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          dataUrl,
          mimeType: 'image/jpeg',
          base64: dataUrl.split(',')[1],
        });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== Étape 2 : catalogue costumes =====
const grid = document.getElementById('suitsGrid');
const suitCountEl = document.getElementById('suitCount');
const toAmbianceBtn = document.getElementById('toAmbiance');

async function loadCatalog() {
  const res = await fetch('/catalog/suits.json');
  state.suits = await res.json();
  grid.innerHTML = '';
  state.suits.forEach((suit) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = suit.id;
    card.innerHTML = `
      <span class="card__check">✓</span>
      <img class="card__img" src="${suit.thumb}" alt="${suit.name}" loading="lazy" />
      <div class="card__name">${suit.name}</div>`;
    card.addEventListener('click', () => toggleSuit(suit.id, card));
    grid.appendChild(card);
  });
}

function toggleSuit(id, card) {
  const idx = state.selectedSuits.indexOf(id);
  if (idx >= 0) {
    state.selectedSuits.splice(idx, 1);
    card.classList.remove('is-selected');
  } else {
    if (state.selectedSuits.length >= MAX_SUITS) {
      alert(`Vous pouvez choisir jusqu'à ${MAX_SUITS} costumes.`);
      return;
    }
    state.selectedSuits.push(id);
    card.classList.add('is-selected');
  }
  suitCountEl.textContent = state.selectedSuits.length;
  toAmbianceBtn.disabled = state.selectedSuits.length === 0;
}

// ===== Étape 3 : ambiances =====
const ambianceList = document.getElementById('ambianceList');
const generateBtn = document.getElementById('generateBtn');

async function loadBackgrounds() {
  const res = await fetch('/api/backgrounds');
  const bgs = await res.json();
  ambianceList.innerHTML = '';
  bgs.forEach((bg) => {
    const el = document.createElement('div');
    el.className = 'ambiance';
    el.dataset.key = bg.key;
    el.innerHTML = `
      <span class="ambiance__emoji">${AMBIANCE_EMOJI[bg.key] || '✨'}</span>
      <span class="ambiance__label">${bg.label}</span>`;
    el.addEventListener('click', () => {
      state.background = bg.key;
      document.querySelectorAll('.ambiance').forEach((a) => a.classList.remove('is-selected'));
      el.classList.add('is-selected');
      generateBtn.disabled = false;
    });
    ambianceList.appendChild(el);
  });
}

// ===== Génération =====
const loadingStatus = document.getElementById('loadingStatus');
const resultsList = document.getElementById('resultsList');

generateBtn.addEventListener('click', async () => {
  if (!state.photo || state.selectedSuits.length === 0 || !state.background) return;
  show('loading');
  loadingStatus.textContent = `Création de ${state.selectedSuits.length} essayage(s)…`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo: state.photo,
        suitIds: state.selectedSuits,
        background: state.background,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur de génération.');
    renderResults(data.results);
    show('results');
  } catch (err) {
    console.error(err);
    alert(err.message || 'Une erreur est survenue. Réessayez.');
    show('ambiance');
  }
});

function renderResults(results) {
  resultsList.innerHTML = '';
  results.forEach((r) => {
    const wrap = document.createElement('div');
    if (!r.image) {
      wrap.className = 'result result--error';
      wrap.textContent = `« ${r.name} » : génération impossible. ${r.error || ''}`;
      resultsList.appendChild(wrap);
      return;
    }
    const src = `data:${r.image.mimeType};base64,${r.image.data}`;
    wrap.className = 'result';
    wrap.innerHTML = `
      <img class="result__img" src="${src}" alt="${r.name}" />
      <div class="result__bar">
        <span class="result__name">${r.name}</span>
        <div class="result__actions">
          <button class="iconbtn" data-act="share">Partager</button>
          <button class="iconbtn" data-act="download">Enregistrer</button>
        </div>
      </div>`;
    const filename = `jonas-${r.suitId}.png`;
    wrap.querySelector('[data-act="download"]').addEventListener('click', () => downloadImage(src, filename));
    wrap.querySelector('[data-act="share"]').addEventListener('click', () => shareImage(src, filename, r.name));
    resultsList.appendChild(wrap);
  });
}

function downloadImage(src, filename) {
  const a = document.createElement('a');
  a.href = src; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

async function shareImage(src, filename, name) {
  try {
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `JONAS & Cie — ${name}` });
      return;
    }
  } catch (err) { /* annulation ou non supporté → fallback */ }
  downloadImage(src, filename);
}

// ===== Recommencer =====
document.getElementById('restartBtn').addEventListener('click', () => {
  state.selectedSuits = [];
  state.background = null;
  suitCountEl.textContent = '0';
  document.querySelectorAll('.card.is-selected').forEach((c) => c.classList.remove('is-selected'));
  document.querySelectorAll('.ambiance.is-selected').forEach((a) => a.classList.remove('is-selected'));
  toAmbianceBtn.disabled = true;
  generateBtn.disabled = true;
  show('suits');
});

// ===== Init =====
loadCatalog();
loadBackgrounds();
