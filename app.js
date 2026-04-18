const STORAGE_KEY = "brutal-membership";

const output = document.getElementById("output");
const responseEmpty = document.getElementById("responseEmpty");
const responseCard = document.getElementById("responseCard");
const discussionSection = document.getElementById("discussionSection");
const discussionPanel = document.getElementById("discussionPanel");
const discussionMessages = document.getElementById("discussionMessages");
const discussionInput = document.getElementById("discussionInput");
const openDiscussionButton = document.getElementById("openDiscussionButton");
const sendDiscussionButton = document.getElementById("sendDiscussionButton");
const membershipPill = document.getElementById("membershipPill");
const lockedOverlay = document.getElementById("lockedOverlay");
const checkoutMessage = document.getElementById("checkoutMessage");
const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const authModal = document.getElementById("authModal");
const thankYouModal = document.getElementById("thankYouModal");
const authTitle = document.getElementById("authTitle");
const authCopy = document.getElementById("authCopy");
const authEyebrow = document.getElementById("authEyebrow");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authMessage = document.getElementById("authMessage");
const loginTrigger = document.getElementById("loginTrigger");
const signupTrigger = document.getElementById("signupTrigger");
const authSubmit = document.getElementById("authSubmit");
const purchaseCompleteButton = document.getElementById("purchaseCompleteButton");
const thankYouCta = document.getElementById("thankYouCta");

let authMode = "login";
let lastAnalysis = null;
let lastPrompt = "";
let discussionNotes = [];

let membershipState = loadMembership();

function loadMembership() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      plan: "preview",
      unlocked: false,
      name: "",
      email: "",
      accountReady: false
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
      accountReady: false
    };
  }
}

function saveMembership() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(membershipState));
}

function syncMembershipUI() {
  const isUnlocked = Boolean(membershipState.unlocked);

  membershipPill.textContent = isUnlocked ? "BRUTAL Pro actif" : "Mode aperçu";
  membershipPill.classList.toggle("is-pro", isUnlocked);
  lockedOverlay.classList.toggle("is-hidden", isUnlocked);

  customerName.value = membershipState.name || "";
  customerEmail.value = membershipState.email || "";
  authName.value = membershipState.name || "";
  authEmail.value = membershipState.email || "";
}

function setCheckoutMessage(message, isError = false) {
  checkoutMessage.textContent = message;
  checkoutMessage.style.color = isError ? "#ff9f8c" : "";
}

function unlockPro() {
  const name = customerName.value.trim() || membershipState.name || "";
  const email = customerEmail.value.trim() || membershipState.email || "";

  if (!name || !email) {
    setCheckoutMessage("Nom et email requis pour activer BRUTAL Pro après achat.", true);
    return;
  }

  membershipState = {
    plan: "pro",
    unlocked: true,
    name,
    email,
    accountReady: true
  };

  saveMembership();
  syncMembershipUI();
  setCheckoutMessage("BRUTAL Pro est actif sur ce navigateur.");
  openThankYouModal();
  document.getElementById("member-zone").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAccess() {
  membershipState = {
    plan: "preview",
    unlocked: false,
    name: "",
    email: "",
    accountReady: false
  };

  saveMembership();
  syncMembershipUI();
  setCheckoutMessage("Le paywall est reverrouillé. Reprends un plan Pro pour réactiver l'analyse.");
}

function buildPrompt({ objectif, deadline, niveau, actions, resultats }) {
  return `
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
`.trim();
}

function extractFirstNumber(value) {
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function inferActivityVolume(actions) {
  const lower = actions.toLowerCase();
  const count = extractFirstNumber(actions);

  if (count !== null) {
    return count;
  }

  if (lower.includes("mail") || lower.includes("email")) {
    return 20;
  }

  if (lower.includes("appel") || lower.includes("call")) {
    return 5;
  }

  return 0;
}

function inferResultsScore(resultats) {
  const lower = resultats.toLowerCase();
  const count = extractFirstNumber(resultats) || 0;

  if (lower.includes("vente") || lower.includes("closing") || lower.includes("paiement")) {
    return Math.max(count, 1) * 3;
  }

  if (lower.includes("rdv") || lower.includes("appel")) {
    return Math.max(count, 1) * 2;
  }

  if (lower.includes("refus")) {
    return 0;
  }

  return count;
}

function buildAnalysis({ objectif, deadline, niveau, actions, resultats }) {
  const objectifValue = extractFirstNumber(objectif);
  const activityVolume = inferActivityVolume(actions);
  const resultsScore = inferResultsScore(resultats);
  const lowerActions = actions.toLowerCase();
  const lowerResults = resultats.toLowerCase();
  const mentionsRevenue =
    lowerResults.includes("vente") ||
    lowerResults.includes("paiement") ||
    lowerResults.includes("client");
  const hasOnlyOutbound =
    lowerActions.includes("mail") ||
    lowerActions.includes("email") ||
    lowerActions.includes("relance") ||
    lowerActions.includes("prospection");
  const scoreBase = Math.min(10, Math.max(2, resultsScore + (mentionsRevenue ? 2 : 0) + (hasOnlyOutbound ? 1 : 0)));
  const score = `${scoreBase}/10`;
  const revenueLine = objectifValue !== null
    ? `Ton objectif annoncé est ${objectifValue} € et il ne pardonne aucun faux mouvement.`
    : "Ton objectif est annoncé sans montant clair, donc ton niveau d'exigence reste flou.";
  const resultsLine = mentionsRevenue
    ? "Tu as au moins un signal de revenu ou de client à exploiter."
    : "Tu n'as produit aucun signal de revenu aujourd'hui.";
  const paceLine = activityVolume >= 50 && !mentionsRevenue
    ? "Le volume existe, la conversion n'existe pas."
    : "Le rythme ne vaut rien sans conversion commerciale mesurable.";
  const problemLine = hasOnlyOutbound && !mentionsRevenue
    ? "Tu mesures l'effort de prospection, pas la qualité de l'offre, du ciblage ou du suivi."
    : "Tu accumules des actions sans preuve claire que ces actions rapprochent du cash.";
  const errorLine = activityVolume > 0 && !mentionsRevenue
    ? "Tu confonds activité brute et traction. Envoyer plus n'est pas vendre."
    : "Tu n'as pas encore assez d'actions reliées à un canal qui ferme vraiment.";
  const focusLine = hasOnlyOutbound
    ? "Offre claire, ciblage restaurants plus précis, relances courtes, appel de qualification, closing."
    : "Uniquement les actions qui produisent un rendez-vous, un devis signé ou un paiement.";
  const tomorrowPlan = [
    "Reprends les 20 leads les plus proches du problème et réécris ton angle en bénéfice cash ou temps gagné.",
    "Lance 10 relances ultra courtes sur les prospects déjà touchés au lieu d'ajouter du volume aveugle.",
    "Obtiens au moins 2 conversations qualifiées demain, pas juste des ouvertures ou des refus.",
    "Si personne ne veut parler, change l'offre ou le message avant de renvoyer 100 mails."
  ];
  const pressureLine = `Deadline : ${deadline}. ${revenueLine} ${paceLine}`;

  return {
    "RÉALITÉ": `${resultsLine} ${revenueLine} ${paceLine}`,
    "PROBLÈME": problemLine,
    "ERREUR PRINCIPALE": errorLine,
    "CE QUI COMPTE VRAIMENT": `${focusLine} Niveau actuel observé : ${niveau}.`,
    "PLAN POUR DEMAIN": tomorrowPlan,
    "PRESSION": pressureLine,
    "SCORE": score
  };
}

function renderAnalysis(analysis) {
  output.innerHTML = "";

  Object.entries(analysis).forEach(([title, value]) => {
    const block = document.createElement("section");
    block.className = "response-block";

    const heading = document.createElement("h3");
    heading.textContent = title;
    block.appendChild(heading);

    if (Array.isArray(value)) {
      const list = document.createElement("ul");
      value.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      block.appendChild(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = value;
      block.appendChild(paragraph);
    }

    output.appendChild(block);
  });

  responseEmpty.classList.add("is-hidden");
  responseCard.classList.remove("is-hidden");
  discussionSection.classList.remove("is-hidden");
}

function addDiscussionMessage(role, title, message) {
  const bubble = document.createElement("div");
  bubble.className = `discussion-bubble ${role}`;

  const heading = document.createElement("strong");
  heading.textContent = title;
  bubble.appendChild(heading);

  const body = document.createElement("div");
  body.textContent = message;
  bubble.appendChild(body);

  discussionMessages.appendChild(bubble);
}

function buildDiscussionReply(userMessage) {
  const lower = userMessage.toLowerCase();
  const reality = lastAnalysis?.["RÉALITÉ"] || "";
  const mainError = lastAnalysis?.["ERREUR PRINCIPALE"] || "";
  const tomorrowPlan = Array.isArray(lastAnalysis?.["PLAN POUR DEMAIN"])
    ? lastAnalysis["PLAN POUR DEMAIN"].slice(0, 2).join(" ")
    : "";
  const note = lower.includes("offre")
    ? "Note : tu doutes du positionnement ou de la formulation de l'offre."
    : lower.includes("prix")
      ? "Note : tu questionnes la valeur perçue ou le prix."
      : lower.includes("mail") || lower.includes("message")
        ? "Note : tu veux améliorer le message de prospection."
        : "Note : tu cherches à débloquer l'exécution à partir de l'analyse.";

  discussionNotes.push(note);

  let advice = "Conseil : arrête de chercher une phrase parfaite. Choisis un angle simple, fais-le sortir aujourd'hui, puis mesure les réponses réelles.";

  if (lower.includes("offre")) {
    advice = "Conseil : formule ton offre comme un résultat concret pour restaurant. Promets un gain clair, par exemple plus de réservations, plus de réponses client, ou moins d'appels perdus.";
  } else if (lower.includes("prix")) {
    advice = "Conseil : ne baisse pas ton prix avant d'avoir testé un positionnement plus précis. Si le prospect ne comprend pas le retour business, le prix sera toujours perçu comme trop haut.";
  } else if (lower.includes("mail") || lower.includes("message")) {
    advice = "Conseil : ton message doit partir d'une douleur restaurant visible en 5 secondes. Une phrase de problème, une phrase de résultat, une question de qualification. Pas plus.";
  } else if (lower.includes("refus")) {
    advice = "Conseil : un refus n'est pas un verdict final. C'est un signal de ciblage, d'angle ou de timing. Tu ajustes, tu repars, tu n'abandonnes pas.";
  }

  const motivation = "Motivation : tu n'es pas loin d'un déclic, tu es au milieu de la partie difficile où presque tout le monde lâche. Toi, tu restes, tu corriges, tu renvoies plus intelligemment, et c'est là que l'écart se crée.";

  return `${note}\n\nJe comprends ton point. ${reality}\n\nLe nœud principal reste : ${mainError}\n\n${advice}\n\nAction immédiate : ${tomorrowPlan}\n\n${motivation}`;
}

async function analyze() {
  if (!membershipState.unlocked) {
    responseEmpty.textContent = "Accès refusé. Débloque BRUTAL Pro pour lancer l'analyse complète.";
    document.getElementById("offer").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const objectif = document.getElementById("objectif").value.trim();
  const deadline = document.getElementById("deadline").value.trim();
  const niveau = document.getElementById("niveau").value.trim();
  const actions = document.getElementById("actions").value.trim();
  const resultats = document.getElementById("resultats").value.trim();

  if (!objectif || !deadline || !niveau || !actions || !resultats) {
    responseEmpty.textContent =
`Donne-moi :
1. Ton objectif mensuel (€)
2. Ta deadline
3. Ta situation actuelle (niveau, activité)
4. Ce que tu as fait aujourd'hui
5. Tes résultats concrets (clients, prospects, ventes, etc.)

Sans ça, je ne peux pas analyser.`;
    return;
  }

  lastPrompt = buildPrompt({ objectif, deadline, niveau, actions, resultats });
  lastAnalysis = buildAnalysis({ objectif, deadline, niveau, actions, resultats });
  discussionNotes = [];
  discussionMessages.innerHTML = "";
  discussionInput.value = "";
  discussionPanel.classList.add("is-hidden");
  openDiscussionButton.textContent = "Continuer la discussion";

  renderAnalysis(lastAnalysis);
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  authEyebrow.textContent = isSignup ? "Inscription BRUTAL" : "Connexion BRUTAL";
  authTitle.textContent = isSignup ? "Créer ton accès" : "Connexion";
  authCopy.textContent = isSignup
    ? "Crée ton accès pour retrouver BRUTAL Pro et poursuivre l'activation."
    : "Entre dans ton espace pour retrouver ton accès et ton historique.";
  authSubmit.textContent = isSignup ? "Créer mon accès" : "Me connecter";
  authMessage.textContent = "Accès local pour cette version de démo.";
}

function openModal(modal) {
  modal.classList.remove("is-hidden");
}

function closeModal(modal) {
  modal.classList.add("is-hidden");
}

function openThankYouModal() {
  openModal(thankYouModal);
}

function submitAuth() {
  const name = authName.value.trim();
  const email = authEmail.value.trim();

  if (!name || !email) {
    authMessage.textContent = "Nom et email requis.";
    authMessage.style.color = "#ff9f8c";
    return;
  }

  membershipState = {
    ...membershipState,
    name,
    email,
    accountReady: true
  };

  saveMembership();
  syncMembershipUI();
  customerName.value = name;
  customerEmail.value = email;
  authMessage.textContent = authMode === "signup"
    ? "Compte créé localement. Tu peux passer au checkout Stripe."
    : "Connexion locale active. Tu peux reprendre le checkout Stripe.";
  authMessage.style.color = "";
  closeModal(authModal);
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
      setCheckoutMessage("Passe par Stripe puis confirme l'achat pour activer BRUTAL Pro.");
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

function toggleDiscussion() {
  const willOpen = discussionPanel.classList.contains("is-hidden");
  discussionPanel.classList.toggle("is-hidden");
  openDiscussionButton.textContent = willOpen ? "Masquer la discussion" : "Continuer la discussion";

  if (willOpen && discussionMessages.children.length === 0 && lastAnalysis) {
    addDiscussionMessage(
      "assistant",
      "BRUTAL",
      "Je t'écoute. Pose ta question sur l'analyse, ton offre, ton message, ton prix ou ton exécution. Je note, je te réponds, et on avance."
    );
  }
}

function sendDiscussion() {
  const message = discussionInput.value.trim();

  if (!message || !lastAnalysis) {
    return;
  }

  addDiscussionMessage("user", "Toi", message);
  addDiscussionMessage("assistant", "BRUTAL", buildDiscussionReply(message));
  discussionInput.value = "";
}

document.getElementById("resetAccessButton").addEventListener("click", resetAccess);
document.getElementById("analyzeButton").addEventListener("click", analyze);
document.getElementById("closeAuthModal").addEventListener("click", () => closeModal(authModal));
document.getElementById("closeThankYouModal").addEventListener("click", () => closeModal(thankYouModal));
loginTrigger.addEventListener("click", () => {
  setAuthMode("login");
  openModal(authModal);
});
signupTrigger.addEventListener("click", () => {
  setAuthMode("signup");
  openModal(authModal);
});
authSubmit.addEventListener("click", submitAuth);
purchaseCompleteButton.addEventListener("click", unlockPro);
thankYouCta.addEventListener("click", () => {
  closeModal(thankYouModal);
  document.getElementById("member-zone").scrollIntoView({ behavior: "smooth", block: "start" });
});
openDiscussionButton.addEventListener("click", toggleDiscussion);
sendDiscussionButton.addEventListener("click", sendDiscussion);

setupScrollButtons();
setupPlanButtons();
setupRevealAnimations();
setAuthMode("login");
syncMembershipUI();
