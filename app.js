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

  const prompt = buildPrompt({ objectif, deadline, niveau, actions, resultats });

  output.textContent =
`BRUTAL PRO est actif.

Le moteur prive n'est pas expose dans cette interface publique.
Prompt prepare pour execution securisee :

${prompt}`;
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
