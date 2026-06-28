'use strict';

const fs = require('fs');
const path = require('path');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
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
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status} : ${detail.slice(0, 500)}`);
  }

  const json = await resp.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData && p.inlineData.data);

  if (!imgPart) {
    // Gemini peut refuser et renvoyer du texte (ex. modération) — on le remonte.
    const textPart = parts.find((p) => p.text);
    throw new Error(
      'Aucune image renvoyée par Gemini.' +
        (textPart ? ` Réponse : ${textPart.text.slice(0, 300)}` : '')
    );
  }

  return {
    mimeType: imgPart.inlineData.mimeType || 'image/png',
    data: imgPart.inlineData.data,
  };
}

module.exports = { generateTryOn, readReferenceImage, MODEL };
