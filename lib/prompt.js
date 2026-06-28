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
    "Je vais bientôt me marier et, avant d'aller essayer en boutique, je voudrais voir comment JE rends dans ce costume. Aide-moi avec cet essayage virtuel à partir de MA photo.",
    "",
    "La PREMIÈRE photo, c'est MOI (en pied). La SECONDE photo montre seulement le costume qui m'intéresse : sers-t'en uniquement comme référence de couleur, de matière et de coupe, et ignore totalement son décor, son mannequin et toute autre personne qui y figure.",
    "",
    "Montre-moi une photo réaliste de MOI portant ce costume, comme si je l'avais vraiment enfilé.",
    "",
    "Le plus important : garde-moi EXACTEMENT tel que je suis sur ma photo.",
    "- Mon visage à l'identique : forme du visage, yeux, nez, bouche, sourcils, mâchoire, oreilles, pilosité (barbe/moustache), grains de beauté.",
    "- Ma tête, mon orientation, mon regard, mon expression et ma coiffure (couleur, longueur, implantation) inchangés.",
    "- SURTOUT ma silhouette : ma carrure, ma taille, mon poids, mes proportions et ma posture EXACTEMENT les mêmes. Ne m'affine pas, ne m'élargis pas, ne me grandis pas, ne me muscle pas, ne me rajeunis pas, ne m'embellis pas, ne lisse pas ma peau. Je dois être parfaitement reconnaissable par mes proches.",
    "- Respecte mon teint et ma carnation.",
    "",
    "Si je porte une casquette, un chapeau, un bonnet, des lunettes (de soleil ou de vue) ou des écouteurs sur ma photo, retire-les et montre mes vrais cheveux et mon vrai visage dégagé.",
    "",
    `Le costume à me faire porter : « ${suit.name} » — ${suit.fabric}. Reproduis fidèlement sa couleur, sa matière et sa coupe, bien ajusté sur MON corps, tenue complète et soignée avec des chaussures habillées assorties.`,
    "",
    `Le décor : place-moi ${bg.scene}. Adapte l'éclairage sur moi de façon réaliste, sans jamais modifier mes traits ni ma silhouette.`,
    "",
    "Les SEULES choses que tu changes sont mes vêtements et l'arrière-plan. Tout le reste (mon visage, ma tête, mon corps) reste strictement identique à ma photo. Rendu : photographie réaliste, plein pied, cadrage portrait vertical, qualité professionnelle.",
  ].join('\n');
}

module.exports = { buildPrompt, BACKGROUNDS };
