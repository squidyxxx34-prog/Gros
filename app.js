const STORAGE_KEY = "brutal-membership";

const output = document.getElementById("output");
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

  membershipPill.textContent = isUnlocked ? "BRUTAL Pro actif" : "Mode apercu";
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
    setCheckoutMessage("Nom et email requis pour activer BRUTAL Pro apres achat.", true);
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
  setCheckoutMessage("Le paywall est reverrouille. Reprends un plan Pro pour reactiver l'analyse.");
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
    ? `Ton objectif annonce est ${objectifValue} EUR.`
    : "Ton objectif est annonce sans montant clair.";
  const resultsLine = mentionsRevenue
    ? "Tu as au moins un signal de revenu ou de client a exploiter."
    : "Tu n'as produit aucun signal de revenu aujourd'hui.";
  const paceLine = activityVolume >= 50 && !mentionsRevenue
    ? "Le volume existe, la conversion n'existe pas."
    : "Le rythme ne dit rien sans conversion commerciale mesurable.";
  const problemLine = hasOnlyOutbound && !mentionsRevenue
    ? "Tu mesures l'effort de prospection, pas la qualite de l'offre, du ciblage ou du follow-up."
    : "Tu accumules des actions sans preuve claire que ces actions rapprochent du cash.";
  const errorLine = activityVolume > 0 && !mentionsRevenue
    ? "Tu confonds activite brute et traction. Envoyer plus n'est pas vendre."
    : "Tu n'as pas assez d'actions reliees a un canal qui ferme vraiment.";
  const focusLine = hasOnlyOutbound
    ? "Ce qui compte: offre claire, ciblage restaurants plus precis, relances courtes, appel de qualification, closing."
    : "Ce qui compte: uniquement les actions qui produisent un rendez-vous, un devis signe ou un paiement.";
  const tomorrowPlan = [
    "1. Reprends les 20 leads les plus proches du probleme et reecris ton angle en benefice cash ou temps gagne.",
    "2. Lance 10 relances ultra courtes sur les prospects deja touches au lieu d'ajouter du volume aveugle.",
    "3. Obtiens au moins 2 conversations qualifiees demain, pas juste des ouvertures ou des refus.",
    "4. Si personne ne veut parler, change l'offre ou le message avant de renvoyer 100 mails."
  ].join("\n");
  const pressureLine = `Deadline: ${deadline}. ${revenueLine} ${paceLine}`;

  return `REALITE :
${resultsLine} ${revenueLine} ${paceLine}

PROBLEME :
${problemLine}

ERREUR PRINCIPALE :
${errorLine}

CE QUI COMPTE VRAIMENT :
${focusLine}
Niveau actuel observe: ${niveau}.

PLAN POUR DEMAIN :
${tomorrowPlan}

PRESSION :
${pressureLine}

SCORE :
${score}`;
}

async function analyze() {
  if (!membershipState.unlocked) {
    output.textContent = "Acces refuse. Debloque BRUTAL Pro pour lancer l'analyse complete.";
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

  output.textContent = buildAnalysis({ objectif, deadline, niveau, actions, resultats });
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  authEyebrow.textContent = isSignup ? "Inscription BRUTAL" : "Connexion BRUTAL";
  authTitle.textContent = isSignup ? "Creer ton acces" : "Connexion";
  authCopy.textContent = isSignup
    ? "Cree ton acces pour retrouver BRUTAL Pro et poursuivre l'activation."
    : "Entre dans ton espace pour retrouver ton acces et ton historique.";
  authSubmit.textContent = isSignup ? "Creer mon acces" : "Me connecter";
  authMessage.textContent = "Acces local pour cette version de demo.";
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
    ? "Compte cree localement. Tu peux passer au checkout Stripe."
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

setupScrollButtons();
setupPlanButtons();
setupRevealAnimations();
setAuthMode("login");
syncMembershipUI();
