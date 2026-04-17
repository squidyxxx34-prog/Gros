async function analyze() {
  const objectif = document.getElementById("objectif").value.trim();
  const deadline = document.getElementById("deadline").value.trim();
  const niveau = document.getElementById("niveau").value.trim();
  const actions = document.getElementById("actions").value.trim();
  const resultats = document.getElementById("resultats").value.trim();

  const output = document.getElementById("output");

  // 🔴 Check obligatoire (démarrage contrôlé)
  if (!objectif || !deadline || !niveau || !actions || !resultats) {
    output.innerText =
`Donne-moi :
1) Ton objectif mensuel (€)
2) Ta deadline
3) Ta situation actuelle (niveau, activité)
4) Ce que tu as fait aujourd’hui
5) Tes résultats concrets (clients, prospects, ventes, etc.)

Sans ça, je ne peux pas analyser.`;
    return;
  }

  const prompt = `
Tu es "BRUTAL", un coach business d’élite spécialisé dans la performance et les résultats mesurables.

IDENTITÉ :
- Tu es direct, froid, analytique.
- Tu ne motives pas.
- Tu ne félicites pas l’effort sans résultat.
- Tu exposes les incohérences entre objectifs et actions.
- Tu privilégies uniquement ce qui génère des résultats concrets.

MISSION :
Forcer l’utilisateur à atteindre son objectif financier en éliminant tout ce qui est inutile et en se concentrant sur les actions à fort impact.

CONTEXTE UTILISATEUR :
Objectif mensuel (€) : ${objectif}
Deadline : ${deadline}
Niveau actuel : ${niveau}

DONNÉES DU JOUR :
Actions réalisées : ${actions}
Résultats mesurables : ${resultats}

RÈGLES D’ANALYSE :
- Compare les actions avec l’objectif financier
- Détermine si le rythme permet d’atteindre l’objectif
- Identifie le fake work (travail sans impact business)
- Ignore tout ce qui ne génère pas de revenus
- Priorité : vente, prospection, acquisition

FORMAT STRICT :

RÉALITÉ :
PROBLÈME :
ERREUR PRINCIPALE :
CE QUI COMPTE VRAIMENT :
PLAN POUR DEMAIN :
PRESSION :
SCORE :
`;

  output.innerText = "Analyse en cours...";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost",
        "X-Title": "BRUTAL Coach"
      },
      body: JSON.stringify({
        model: "openrouter/elephant-alpha",
        messages: [
          {
            role: "system",
            content: "Tu es BRUTAL. Tu analyses uniquement la performance business et les résultats mesurables."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      output.innerText = "Erreur API : réponse invalide.";
      return;
    }

    output.innerText = data.choices[0].message.content;

  } catch (error) {
    output.innerText = "Erreur API ou réseau : " + error.message;
  }
}
