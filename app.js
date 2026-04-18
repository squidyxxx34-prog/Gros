const STORAGE_KEY = "brutal-membership";
const DEFAULT_MODEL = "openrouter/elephant-alpha";

const output = document.getElementById("output");
const membershipPill = document.getElementById("membershipPill");
const lockedOverlay = document.getElementById("lockedOverlay");
const checkoutMessage = document.getElementById("checkoutMessage");
const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const apiKeyInput = document.getElementById("apiKey");

let membershipState = loadMembership();

function loadMembership() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      plan: "preview",
      unlocked: false,
      name: "",
      email: "",
      apiKey: ""
    };
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return {
      plan: "preview",
      unlocked: false,
      name: "",
      email: "",
      apiKey: ""
    };
  }
}

function saveMembership() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(membershipState));
}

function syncMembershipUI() {
  const isUnlocked = Boolean(membershipState.unlocked);

  membershipPill.textContent = isUnlocked ? "BRUTAL Pro actif" : "Mode apercu";
  membershipPill.classList.toggle("is-pro", isUnlocked);
  lockedOverlay.classList.toggle("is-hidden", isUnlocked);

  customerName.value = membershipState.name || "";
  customerEmail.value = membershipState.email || "";
  apiKeyInput.value = membershipState.apiKey || "";
}

function setCheckoutMessage(message, isError = false) {
  checkoutMessage.textContent = message;
  checkoutMessage.style.color = isError ? "#ff9f8c" : "";
}

function unlockPro() {
  const name = customerName.value.trim();
  const email = customerEmail.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!name || !email || !apiKey) {
    setCheckoutMessage("Nom, email et cle OpenRouter requis pour debloquer le plan Pro.", true);
    return;
  }

  membershipState = {
    plan: "pro",
    unlocked: true,
    name,
    email,
    apiKey
  };

  saveMembership();
  syncMembershipUI();
  setCheckoutMessage("BRUTAL Pro est actif sur ce navigateur. Tu peux lancer l'analyse.");
  document.getElementById("member-zone").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAccess() {
  membershipState = {
    plan: "preview",
    unlocked: false,
    name: "",
    email: "",
    apiKey: ""
  };

  saveMembership();
  syncMembershipUI();
  setCheckoutMessage("Le paywall est reverrouille. Reprends un plan Pro pour reactiver l'analyse.");
}

function buildPrompt({ objectif, deadline, niveau, actions, resultats }) {
  return `
Tu es "BRUTAL", un coach business d'elite specialise dans la performance et les resultats mesurables.

IDENTITE :
- Tu es direct, froid, analytique.
- Tu ne motives pas.
- Tu ne felicites pas l'effort sans resultat.
- Tu exposes les incoherences entre objectifs et actions.
- Tu privilegies uniquement ce qui genere des resultats concrets.

MISSION :
Forcer l'utilisateur a atteindre son objectif financier en eliminant tout ce qui est inutile et en se concentrant sur les actions a fort impact.

CONTEXTE UTILISATEUR :
Objectif mensuel (EUR) : ${objectif}
Deadline : ${deadline}
Niveau actuel : ${niveau}

DONNEES DU JOUR :
Actions realisees : ${actions}
Resultats mesurables : ${resultats}

REGLES D'ANALYSE :
- Compare les actions avec l'objectif financier
- Determine si le rythme permet d'atteindre l'objectif
- Identifie le fake work (travail sans impact business)
- Ignore tout ce qui ne genere pas de revenus
- Priorite : vente, prospection, acquisition

FORMAT STRICT :

REALITE :
PROBLEME :
ERREUR PRINCIPALE :
CE QUI COMPTE VRAIMENT :
PLAN POUR DEMAIN :
PRESSION :
SCORE :
`.trim();
}

async function analyze() {
  if (!membershipState.unlocked || !membershipState.apiKey) {
    output.textContent = "Acces refuse. Debloque BRUTAL Pro et renseigne ta cle OpenRouter pour lancer l'analyse complete.";
    document.getElementById("offer").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const objectif = document.getElementById("objectif").value.trim();
  const deadline = document.getElementById("deadline").value.trim();
  const niveau = document.getElementById("niveau").value.trim();
  const actions = document.getElementById("actions").value.trim();
  const resultats = document.getElementById("resultats").value.trim();

  if (!objectif || !deadline || !niveau || !actions || !resultats) {
    output.textContent =
`Donne-moi :
1. Ton objectif mensuel (EUR)
2. Ta deadline
3. Ta situation actuelle (niveau, activite)
4. Ce que tu as fait aujourd'hui
5. Tes resultats concrets (clients, prospects, ventes, etc.)

Sans ca, je ne peux pas analyser.`;
    return;
  }

  const prompt = buildPrompt({ objectif, deadline, niveau, actions, resultats });

  output.textContent = "Analyse en cours...";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${membershipState.apiKey}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "BRUTAL"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "Tu es BRUTAL. Tu analyses uniquement la performance business et les resultats mesurables."
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

    if (!response.ok) {
      throw new Error(`Requete invalide (${response.status})`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      output.textContent = "Erreur API : reponse invalide.";
      return;
    }

    output.textContent = content;
  } catch (error) {
    output.textContent = `Erreur API ou reseau : ${error.message}`;
  }
}

function setupScrollButtons() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetSelector = button.getAttribute("data-scroll-target");
      const target = document.querySelector(targetSelector);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function setupPlanButtons() {
  document.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      const plan = button.getAttribute("data-plan");

      if (plan === "preview") {
        resetAccess();
        return;
      }

      document.getElementById("checkout").scrollIntoView({ behavior: "smooth", block: "start" });
      setCheckoutMessage("Entre tes infos pour activer BRUTAL Pro sur ce navigateur.");
    });
  });
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

document.getElementById("unlockButton").addEventListener("click", unlockPro);
document.getElementById("resetAccessButton").addEventListener("click", resetAccess);
document.getElementById("analyzeButton").addEventListener("click", analyze);

setupScrollButtons();
setupPlanButtons();
setupRevealAnimations();
syncMembershipUI();
