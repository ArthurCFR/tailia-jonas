'use strict';

// Ambiances de fond disponibles (mariage). La clé est envoyée par le client.
const BACKGROUNDS = {
  'exterieur': {
    label: 'Mariage en extérieur',
    scene:
      "en extérieur lors d'un mariage élégant : jardin verdoyant d'un château français, " +
      "lumière naturelle douce de fin d'après-midi, arrière-plan délicatement flou (bokeh)",
  },
  'salle-de-bal': {
    label: 'Salle de bal',
    scene:
      "dans la salle de bal d'une réception de mariage : grand salon avec lustres en cristal, " +
      "moulures dorées et parquet, lumière chaude et tamisée, arrière-plan délicatement flou",
  },
};

/**
 * Construit le prompt de génération pour un costume donné.
 * Reprend les consignes du tailleur (cf. Prompt.txt) : on ne change QUE la tenue,
 * jamais le visage ni la morphologie.
 *
 * @param {{name:string, fabric:string}} suit  entrée catalogue (suits.json)
 * @param {string} backgroundKey               clé d'ambiance ('exterieur' | 'salle-de-bal')
 * @returns {string}
 */
function buildPrompt(suit, backgroundKey) {
  const bg = BACKGROUNDS[backgroundKey] || BACKGROUNDS['exterieur'];

  // Prompt de base du consultant (Prompt.txt), minimalement adapté :
  // la 1re image = la personne, la 2e = la référence du costume ; on injecte
  // la description du costume sélectionné et l'ambiance.
  return [
    "Je te fournis une photo de moi en pied (première image). Agis comme un conseiller en style spécialisé dans les costumes de mariage. À partir de cette photo, crée une visualisation réaliste de moi portant le costume montré dans la seconde image.",
    "Consignes importantes :",
    "- Ne modifie absolument pas ma morphologie : garde exactement mon visage, ma taille, ma silhouette, mes proportions, ma carrure et mes traits physiques.",
    "- Ne m'affine pas, ne me rends pas plus musclé, plus grand ou différent.",
    "- Le but est uniquement de changer la tenue, pas la personne.",
    "- Garde une apparence naturelle et réaliste, comme si j'avais réellement essayé ce costume en boutique.",
    "- Respecte mon teint, ma couleur de cheveux et mes caractéristiques physiques.",
    `Le costume à essayer : ${suit.fabric}.`,
    `Ambiance : ${bg.scene}.`,
    "Ne change pas la photo de base : transforme uniquement ma tenue.",
  ].join('\n');
}

module.exports = { buildPrompt, BACKGROUNDS };
