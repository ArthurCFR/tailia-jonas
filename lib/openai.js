'use strict';

// Provider OpenAI (images.edit). gpt-image-2 traite chaque image en haute fidélité
// automatiquement ; gpt-image-1 / 1.5 acceptent input_fidelity="high".
// Pour préserver le visage : la photo de la personne doit être passée EN PREMIER.

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-image-2';
// low ≈ 26s (bon compromis vitesse/fidélité), medium ≈ 65s, high ≈ 130s.
const OPENAI_QUALITY = process.env.OPENAI_QUALITY || 'low';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function b64ToBlob(b64, mimeType) {
  return new Blob([Buffer.from(b64, 'base64')], { type: mimeType || 'image/jpeg' });
}

/**
 * @param {string} promptText
 * @param {{mimeType:string,data:string}} personImage  EN PREMIER (visage préservé)
 * @param {{mimeType:string,data:string}} suitImage    référence costume
 * @returns {Promise<{mimeType:string,data:string}>}
 */
async function generateTryOnOpenAI(promptText, personImage, suitImage) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY manquante côté serveur.');

  const form = new FormData();
  form.append('model', OPENAI_MODEL);
  form.append('prompt', promptText);
  form.append('quality', OPENAI_QUALITY);
  form.append('output_format', 'jpeg');
  form.append('size', '1024x1536'); // portrait plein pied
  // input_fidelity n'est réglable que sur gpt-image-1 / 1.5 (gpt-image-2 = auto high).
  if (!/^gpt-image-2/.test(OPENAI_MODEL)) form.append('input_fidelity', 'high');
  // Personne en premier, costume ensuite.
  form.append('image[]', b64ToBlob(personImage.data, personImage.mimeType), 'person.jpg');
  form.append('image[]', b64ToBlob(suitImage.data, suitImage.mimeType), 'suit.jpg');

  const MAX_ATTEMPTS = 2;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => '');
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          throw new Error(`OpenAI ${resp.status} : ${detail.slice(0, 400)}`);
        }
        lastErr = new Error(`OpenAI ${resp.status} : ${detail.slice(0, 300)}`);
      } else {
        const json = await resp.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (b64) return { mimeType: 'image/jpeg', data: b64 };
        lastErr = new Error('Aucune image renvoyée par OpenAI.');
      }
    } catch (err) {
      lastErr = err;
      if (/OpenAI 4\d\d/.test(err.message) && !/OpenAI 429/.test(err.message)) break;
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw lastErr || new Error('Échec de génération OpenAI.');
}

module.exports = { generateTryOnOpenAI, OPENAI_MODEL, OPENAI_QUALITY };
