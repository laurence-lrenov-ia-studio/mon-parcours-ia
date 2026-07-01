═══════════════════════════════════════════════════════════
  MON PARCOURS IA — GUIDE DE DÉPLOIEMENT
═══════════════════════════════════════════════════════════

CONTENU DU DOSSIER :
- index.html          → page d'accueil (tri apprenant/formateur)
- apprenant.html      → espace apprenant (PWA installable)
- formateur.html      → cockpit Laurence + Yann
- manifest.json       → config app installable
- sw.js               → service worker (hors-ligne + notifs)
- icon-192.png / icon-512.png → icônes de l'app
- apps-script-backend.gs → code backend Google Sheets (déjà installé)

ACCÈS :
- Apprenants : cliquent "Je suis apprenant", pas de code
- Laurence + Yann : cliquent "formateur" + code → cpfia2026

═══════════════════════════════════════════════════════════
  ÉTAPE 1 — TESTER SUR GITHUB PAGES
═══════════════════════════════════════════════════════════

1. Va sur github.com/laurence-lrenov-ia-studio/mon-parcours-ia
2. Add file → Upload files
3. Glisse TOUS les fichiers de ce dossier (sauf ce README)
4. Commit changes
5. Settings → Pages → Source : branche "main" → dossier "/ (root)"
6. Attends 1-2 min → ton URL :
   https://laurence-lrenov-ia-studio.github.io/mon-parcours-ia/

═══════════════════════════════════════════════════════════
  ÉTAPE 2 — DÉPLOYER SUR NETLIFY (identique, zéro modif)
═══════════════════════════════════════════════════════════

1. netlify.com → glisse ce dossier entier dans la zone de dépôt
2. Site settings → Change site name → mon-parcours-ia
3. URL : https://mon-parcours-ia.netlify.app

Les MÊMES fichiers marchent sur les deux — rien à changer.

═══════════════════════════════════════════════════════════
  NOTIFICATIONS
═══════════════════════════════════════════════════════════

- Pastille dans l'app (point orange) : quand Laurence débloque
  une étape projet → l'apprenant voit un point sur "Mon projet"
- Email à Laurence : quand un apprenant remplit un questionnaire
  pré-visio ou une évaluation (adresse dans le fichier .gs)
- Le backend Google Sheets est déjà connecté (URL Apps Script
  injectée dans les fichiers)
