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

  return [
    "Tu es un conseiller en style spécialisé dans les costumes de mariage haut de gamme.",
    "La PREMIÈRE image est une photo en pied de la personne. La SECONDE image est une photo de référence d'un costume du tailleur.",
    "",
    "Génère une visualisation photoréaliste de CETTE personne portant ce costume, comme si elle l'avait réellement essayé.",
    "",
    "Règles absolues, non négociables :",
    "- Ne modifie ABSOLUMENT PAS la morphologie : garde exactement le visage, la taille, la silhouette, les proportions, la carrure et tous les traits physiques de la personne de la première image.",
    "- Ne l'affine pas, ne la rends ni plus musclée, ni plus grande, ni différente.",
    "- Respecte fidèlement son teint, sa couleur de cheveux, sa coupe et ses caractéristiques physiques.",
    "- Le SEUL changement autorisé est la tenue. C'est un essayage, pas une nouvelle personne.",
    "",
    `Costume à faire porter : « ${suit.name} » — ${suit.fabric}. Reproduis fidèlement la couleur, la matière et la coupe du costume de la photo de référence.`,
    "Tenue complète et soignée, plein pied, posture naturelle et élégante, chaussures habillées assorties.",
    "",
    `Mise en scène : la personne est ${bg.scene}.`,
    "Cadrage portrait vertical en pied, rendu réaliste de qualité photographique professionnelle.",
  ].join('\n');
}

module.exports = { buildPrompt, BACKGROUNDS };
