'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const { buildPrompt, BACKGROUNDS } = require('./lib/prompt');
const { generateTryOn, readReferenceImage, MODEL } = require('./lib/gemini');

const app = express();
const PORT = process.env.PORT || 3000;

// Le client envoie la photo + métadonnées en base64 dans du JSON.
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Catalogue (chargé une fois) ---
const SUITS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public', 'catalog', 'suits.json'), 'utf8')
);
const SUITS_BY_ID = new Map(SUITS.map((s) => [s.id, s]));

// --- Garde-fou coût : plafond strict de costumes par requête ---
const MAX_SUITS_PER_REQUEST = 3;

// --- Rate-limit léger en mémoire (anti-emballement, sans dépendance) ---
// Fenêtre glissante : N générations max par IP par heure.
const RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxImages: 30 };
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip, count, now) {
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (arr.length + count > RATE_LIMIT.maxImages) return true;
  for (let i = 0; i < count; i++) arr.push(now);
  hits.set(ip, arr);
  return false;
}

// Expose les ambiances dispo (label lisible) au frontend.
app.get('/api/backgrounds', (_req, res) => {
  res.json(
    Object.entries(BACKGROUNDS).map(([key, v]) => ({ key, label: v.label }))
  );
});

/**
 * POST /api/generate
 * body: { photo: {mimeType, data}, suitIds: string[], background: string }
 * -> { results: [{ suitId, name, image: {mimeType, data} | null, error? }] }
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { photo, suitIds, background } = req.body || {};

    if (!photo || !photo.data || !photo.mimeType) {
      return res.status(400).json({ error: 'Photo manquante ou invalide.' });
    }
    if (!Array.isArray(suitIds) || suitIds.length === 0) {
      return res.status(400).json({ error: 'Sélectionne au moins un costume.' });
    }
    if (suitIds.length > MAX_SUITS_PER_REQUEST) {
      return res
        .status(400)
        .json({ error: `Maximum ${MAX_SUITS_PER_REQUEST} costumes par génération.` });
    }
    const suits = suitIds.map((id) => SUITS_BY_ID.get(id)).filter(Boolean);
    if (suits.length === 0) {
      return res.status(400).json({ error: 'Aucun costume valide sélectionné.' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
      .toString()
      .split(',')[0]
      .trim();
    if (rateLimited(ip, suits.length, Date.now())) {
      return res.status(429).json({
        error: 'Trop de générations récentes. Réessaie dans un moment.',
      });
    }

    // 1 image par costume, séquentiel (maîtrise du coût + ordre stable).
    const results = [];
    for (const suit of suits) {
      try {
        const suitImage = readReferenceImage(suit.ref);
        const prompt = buildPrompt(suit, background);
        const image = await generateTryOn(prompt, photo, suitImage);
        results.push({ suitId: suit.id, name: suit.name, image });
      } catch (err) {
        console.error(`[generate] échec costume ${suit.id} :`, err.message);
        results.push({ suitId: suit.id, name: suit.name, image: null, error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[generate] erreur serveur :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la génération.' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () => {
  console.log(`TailIA — JONAS & Cie en écoute sur http://localhost:${PORT}`);
  console.log(`Modèle image : ${MODEL}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠  GEMINI_API_KEY non définie — la génération échouera tant qu\'elle est absente.');
  }
});
