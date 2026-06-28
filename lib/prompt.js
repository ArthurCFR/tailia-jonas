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
    "TÂCHE : essayage virtuel de vêtements (retouche photo). Tu pars de la PREMIÈRE image et tu n'y remplaces QUE deux choses : les vêtements de la personne et l'arrière-plan. Tu ne crées PAS une nouvelle personne ni une nouvelle photo : tu modifies celle-ci.",
    "",
    "IMAGE 1 = la personne réelle. C'est la source d'identité, elle fait foi et est INTOUCHABLE.",
    "IMAGE 2 = simple référence du costume (couleur, matière, coupe). Ignore complètement le mannequin/visage de l'image 2.",
    "",
    "VERROUILLAGE D'IDENTITÉ — priorité absolue, aucune exception :",
    "- Le visage doit rester RIGOUREUSEMENT IDENTIQUE à l'image 1, pixel pour pixel : même forme du visage, mêmes yeux, même nez, même bouche, mêmes sourcils, même mâchoire, mêmes oreilles, mêmes rides et grains de beauté, même pilosité faciale (barbe/moustache à l'identique).",
    "- Conserve EXACTEMENT la même tête, la même orientation du visage, le même regard, la même expression et la même coiffure (couleur, longueur, implantation) que l'image 1.",
    "- Conserve la carrure, la taille, le poids, les proportions et la posture exactes de l'image 1. N'affine pas, n'élargis pas, ne grandis pas, ne rajeunis pas, n'embellis pas, ne lisse pas la peau.",
    "- Respecte fidèlement le teint et la carnation.",
    "- Résultat attendu : un proche doit reconnaître INSTANTANÉMENT la même personne. Si tu hésites, reste plus fidèle à l'image 1.",
    "",
    `COSTUME à faire porter : « ${suit.name} » — ${suit.fabric}. Reproduis fidèlement la couleur, la matière et la coupe du costume de l'image 2, bien ajusté sur le corps de la personne. Tenue complète et soignée, chaussures habillées assorties.`,
    "",
    `ARRIÈRE-PLAN : remplace le décor par : ${bg.scene}. Harmonise l'éclairage du sujet avec ce décor de façon réaliste, sans jamais altérer ses traits.`,
    "",
    "RENDU : photographie réaliste, plein pied, cadrage portrait vertical, qualité professionnelle. Le SEUL changement par rapport à l'image 1 est : la tenue + l'arrière-plan. Tout le reste (visage, tête, corps) est strictement préservé.",
  ].join('\n');
}

module.exports = { buildPrompt, BACKGROUNDS };
