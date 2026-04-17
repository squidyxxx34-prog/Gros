const form = document.getElementById("brutal-form");
const output = document.getElementById("output");

const MISSING_DATA_RESPONSE = `Donne-moi :
1) Ton objectif mensuel (€)
2) Ta deadline
3) Ton niveau actuel
4) Tes actions du jour
5) Tes résultats concrets`;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const objectif = Number.parseFloat(document.getElementById("objectif").value);
  const deadline = document.getElementById("deadline").value;
  const niveau = document.getElementById("niveau").value.trim();
  const actionsText = document.getElementById("actions").value.trim();
  const resultatsText = document.getElementById("resultats").value.trim();

  if (!Number.isFinite(objectif) || !deadline || !niveau || !actionsText || !resultatsText) {
    output.textContent = MISSING_DATA_RESPONSE;
    return;
  }

  const report = buildBrutalReport({
    objectif,
    deadline,
    niveau,
    actionsText,
    resultatsText,
  });

  output.textContent = report;
});

function buildBrutalReport({ objectif, deadline, actionsText, resultatsText }) {
  const actionLines = parseLines(actionsText);
  const resultLines = parseLines(resultatsText);

  const actions = actionLines.map(analyzeAction);
  const revenue = extractRevenue(resultatsText);
  const clients = extractCount(resultatsText, ["client", "clients", "closing", "vente", "ventes", "deal", "deals"]);
  const leads = extractCount(resultatsText, ["lead", "leads", "prospect", "prospects", "rdv", "rendez-vous", "demo", "demos", "démo", "démos"]);

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(1, Math.ceil((deadlineDate - now) / dayMs));

  const avgDailyNeed = objectif / 30;
  const requiredDailyFromNow = objectif / daysLeft;

  const directActions = actions.filter((item) => item.impact >= 3).length;
  const indirectActions = actions.filter((item) => item.impact === 2).length;
  const weakActions = actions.filter((item) => item.impact <= 1).length;

  const score = computeGlobalScore({
    directActions,
    indirectActions,
    weakActions,
    revenue,
    clients,
    leads,
  });

  const status = computeStatus({ revenue, avgDailyNeed, requiredDailyFromNow, score });
  const principalProblem = computePrincipalProblem({ directActions, weakActions, revenue, clients, leads });
  const criticalError = computeCriticalError({ directActions, weakActions, revenue, clients });

  const revenueDrivers = actions
    .filter((item) => item.impact >= 2)
    .slice(0, 3)
    .map((item) => `- ${item.label} (${item.impact}/3)`)
    .join("\n") || "- Aucune action business claire aujourd'hui.";

  const plan = buildTomorrowPlan({
    score,
    directActions,
    leads,
    clients,
    requiredDailyFromNow,
  });

  const pressure = buildPressure({ score, revenue, requiredDailyFromNow, daysLeft });

  const firmSuffix = score <= 1 ? "Aucun débat." : "Exécution obligatoire.";

  return `RÉALITÉ :
- ${status}
- ${buildRealitySentence({ revenue, avgDailyNeed, requiredDailyFromNow })}

PROBLÈME PRINCIPAL :
- ${principalProblem}

ERREUR CRITIQUE :
- ${criticalError}

CE QUI CRÉE DU REVENU :
${revenueDrivers}

PLAN DEMAIN :
1) ${plan[0]}
2) ${plan[1]}
3) ${plan[2]}

SCORE :
- ${score} = ${scoreLabel(score)}

PRESSION :
- ${pressure} ${firmSuffix}`;
}

function parseLines(text) {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function analyzeAction(label) {
  const lower = label.toLowerCase();

  const directKeywords = ["appel", "prospection", "dm", "email", "closing", "vente", "offre", "demo", "démo", "rdv", "rendez-vous", "partenariat", "relance"];
  const indirectKeywords = ["contenu", "post", "newsletter", "webinaire", "landing", "pub", "publicité", "ads", "seo", "distribution"];
  const weakKeywords = ["logo", "site", "couleur", "formation", "podcast", "recherche", "organisation", "outil", "admin"];

  let impact = 1;
  if (directKeywords.some((kw) => lower.includes(kw))) {
    impact = 3;
  } else if (indirectKeywords.some((kw) => lower.includes(kw))) {
    impact = 2;
  } else if (weakKeywords.some((kw) => lower.includes(kw))) {
    impact = 0;
  }

  return { label, impact };
}

function extractRevenue(text) {
  const moneyMatches = [...text.matchAll(/(\d+[\d\s.,]*)\s?(€|eur|euros)/gi)];
  if (!moneyMatches.length) {
    return 0;
  }
  return moneyMatches.reduce((sum, match) => sum + normalizeNumber(match[1]), 0);
}

function extractCount(text, keywords) {
  const lower = text.toLowerCase();
  let total = 0;

  for (const keyword of keywords) {
    const regex = new RegExp(`(\\d+)\\s*${escapeRegex(keyword)}`, "g");
    const hits = [...lower.matchAll(regex)];
    total += hits.reduce((sum, hit) => sum + Number.parseInt(hit[1], 10), 0);
  }

  return total;
}

function normalizeNumber(raw) {
  return Number.parseFloat(raw.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".")) || 0;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeGlobalScore({ directActions, indirectActions, weakActions, revenue, clients, leads }) {
  if (revenue > 0 || clients > 0) {
    return 3;
  }
  if (directActions >= 2 || (directActions >= 1 && leads >= 5)) {
    return 2;
  }
  if (indirectActions > weakActions) {
    return 1;
  }
  return 0;
}

function computeStatus({ revenue, avgDailyNeed, requiredDailyFromNow, score }) {
  if (revenue >= requiredDailyFromNow * 1.2) {
    return "en avance";
  }
  if (revenue >= avgDailyNeed * 0.8) {
    return "dans le rythme";
  }
  if (score <= 1) {
    return "très en retard";
  }
  return "en retard";
}

function computePrincipalProblem({ directActions, weakActions, revenue, clients, leads }) {
  if (revenue <= 0 && clients <= 0 && leads <= 0) {
    return "Aucun pipeline mesurable. Pas de leads, pas de clients, pas de revenu.";
  }
  if (weakActions > directActions) {
    return "Trop de travail occupé. Le volume d'actions commerciales est insuffisant.";
  }
  if (revenue <= 0 && leads > 0) {
    return "Tu génères du mouvement mais pas de conversion.";
  }
  return "Le rythme commercial reste inférieur à l'objectif financier.";
}

function computeCriticalError({ directActions, weakActions, revenue, clients }) {
  if (revenue <= 0 && clients <= 0) {
    return "Tu as travaillé sans produire de résultat business.";
  }
  if (weakActions >= directActions) {
    return "Tu priorises des tâches secondaires au lieu de vendre.";
  }
  return "Tu ne transformes pas assez vite l'activité commerciale en cash.";
}

function buildRealitySentence({ revenue, avgDailyNeed, requiredDailyFromNow }) {
  if (revenue <= 0) {
    return `Revenu du jour: 0€. Cible minimale: ${Math.round(avgDailyNeed)}€/jour, cible corrigée: ${Math.round(requiredDailyFromNow)}€/jour.`;
  }
  return `Revenu du jour: ${Math.round(revenue)}€. Cible minimale: ${Math.round(avgDailyNeed)}€/jour, cible corrigée: ${Math.round(requiredDailyFromNow)}€/jour.`;
}

function buildTomorrowPlan({ score, directActions, leads, clients, requiredDailyFromNow }) {
  const callTarget = score <= 1 ? 40 : 25;
  const followUps = Math.max(20, leads * 2 || 20);
  const closings = clients > 0 ? 2 : 1;
  const offerValue = Math.max(500, Math.round(requiredDailyFromNow));

  return [
    `${callTarget} prises de contact sortantes avant 12:00 (appels + messages) avec tracking ligne par ligne.`,
    `${followUps} relances qualifiées envoyées avant 16:00, dont 10 avec proposition chiffrée >= ${offerValue}€.`,
    `${closings} rendez-vous de closing tenus et 1 offre finale à ${offerValue}€ minimum envoyée avant 19:00.`
  ];
}

function scoreLabel(score) {
  if (score === 3) {
    return "impact direct business";
  }
  if (score === 2) {
    return "utile indirectement";
  }
  if (score === 1) {
    return "faible impact";
  }
  return "inutile";
}

function buildPressure({ score, revenue, requiredDailyFromNow, daysLeft }) {
  if (score <= 1 && revenue <= 0) {
    return `Si rien ne change, tu finis le mois à 0€ et l'objectif devient mathématiquement impossible sous ${daysLeft} jours.`;
  }
  return `Si ce rythme continue, tu restes sous la cible de ${Math.round(requiredDailyFromNow)}€/jour et l'écart de cash se creuse.`;
}
