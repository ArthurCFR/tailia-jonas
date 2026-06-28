'use strict';

const fs = require('fs');
const path = require('path');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Lit une image de référence costume depuis /public/catalog et la renvoie en base64.
 * @param {string} relRef  chemin web type "/catalog/suits/caviar-bleu.jpg"
 * @returns {{mimeType:string, data:string}}
 */
function readReferenceImage(relRef) {
  const safe = relRef.replace(/^\/+/, '').replace(/\.\./g, '');
  const abs = path.join(__dirname, '..', 'public', safe);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { mimeType, data: buf.toString('base64') };
}

/**
 * Appelle Gemini (generateContent) pour produire une image : personne + costume de référence.
 *
 * @param {string} promptText
 * @param {{mimeType:string, data:string}} personImage  photo utilisateur (base64)
 * @param {{mimeType:string, data:string}} suitImage    référence costume (base64)
 * @returns {Promise<{mimeType:string, data:string}>}   image générée (base64)
 */
async function generateTryOn(promptText, personImage, suitImage) {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY manquante côté serveur.');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText },
          { inlineData: { mimeType: personImage.mimeType, data: personImage.data } },
          { inlineData: { mimeType: suitImage.mimeType, data: suitImage.data } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      // Portrait plein pied + 2K = plus de détail sur le visage (meilleure fidélité).
      imageConfig: { aspectRatio: '3:4', imageSize: '2K' },
    },
  };

  // Gemini renvoie parfois une réponse sans image (flake) ou une 5xx transitoire.
  // On retente quelques fois avant d'abandonner.
  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const detail = await resp.text().catch(() => '');
        // 4xx (hors 429) = erreur définitive : inutile de retenter.
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          throw new Error(`Gemini ${resp.status} : ${detail.slice(0, 500)}`);
        }
        lastErr = new Error(`Gemini ${resp.status} : ${detail.slice(0, 300)}`);
      } else {
        const json = await resp.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p.inlineData && p.inlineData.data);
        if (imgPart) {
          return {
            mimeType: imgPart.inlineData.mimeType || 'image/png',
            data: imgPart.inlineData.data,
          };
        }
        const textPart = parts.find((p) => p.text);
        const finish = json?.candidates?.[0]?.finishReason;
        lastErr = new Error(
          'Aucune image renvoyée par Gemini.' +
            (finish ? ` (finishReason: ${finish})` : '') +
            (textPart ? ` Réponse : ${textPart.text.slice(0, 200)}` : '')
        );
      }
    } catch (err) {
      lastErr = err;
      // Erreur définitive 4xx → on arrête tout de suite.
      if (/Gemini 4\d\d/.test(err.message) && !/Gemini 429/.test(err.message)) break;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }

  throw lastErr || new Error('Échec de génération Gemini.');
}

module.exports = { generateTryOn, readReferenceImage, MODEL };
