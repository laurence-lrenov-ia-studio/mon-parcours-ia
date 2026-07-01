/**
 * ═══════════════════════════════════════════════════════════════
 * CPF IA — BACKEND APPS SCRIPT
 * Connecte la PWA apprenant + le cockpit formateur au Google Sheet
 * ═══════════════════════════════════════════════════════════════
 *
 * INSTALLATION (5 minutes) :
 * 1. Ouvre ton Google Sheet
 * 2. Menu Extensions → Apps Script
 * 3. Colle ce code (remplace tout)
 * 4. Clique sur "Déployer" → "Nouveau déploiement"
 * 5. Type : "Application web"
 * 6. Exécuter en tant que : Moi
 * 7. Qui a accès : "Tout le monde"
 * 8. Copie l'URL générée → c'est ton APPS_SCRIPT_URL
 * 9. Colle cette URL dans les 2 fichiers HTML (PWA + cockpit)
 *    à la ligne : const APPS_SCRIPT_URL = '...'
 *
 * ───────────────────────────────────────────────────────────────
 * STRUCTURE DU GOOGLE SHEET (onglets à créer avec ces noms exacts) :
 *
 * Onglet "Apprenants" :
 *   A: Prénom | B: Session | C: Lien Meet | D: Visio1_date | E: Visio1_heure
 *   F: Visio2_date | G: Visio2_heure | H: Visio3_date | I: Visio3_heure
 *   J: Etape_projet (0,1,2,3)
 *
 * Onglet "Sessions" :
 *   A: ID (S1,S2) | B: Label | C: Atelier1_date | D: Atelier1_heure | E: Atelier1_meet
 *   F: Atelier2_date | G: Atelier2_heure | H: Atelier2_meet
 *
 * Onglet "Progression" :
 *   A: Prénom | B: Module | C: Tache | D: Cochee | E: Date
 *
 * Onglet "Notes" :
 *   A: Prénom | B: Module | C: Texte | D: Date
 *
 * Onglet "Evaluations" :
 *   A: Prénom | B: Module | C: Question | D: Reponse | E: Date
 *
 * Onglet "Quiz" :
 *   A: Prénom | B: Visio | C: Question | D: Reponse | E: Date
 *
 * Onglet "Projet" :
 *   A: Prénom | B: Bloc | C: Texte | D: Date
 *
 * Onglet "Messages" :
 *   A: Destinataire | B: Message | C: Lu | D: Date
 * ───────────────────────────────────────────────────────────────
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ─── POINT D'ENTRÉE GET (lecture : la PWA récupère les données) ───
function doGet(e) {
  const action = e.parameter.action;
  const user = e.parameter.user;
  let result = {};

  try {
    if (action === 'get_apprenant') {
      result = getApprenantData(user);
    } else if (action === 'get_all') {
      result = getAllData();
    } else {
      result = { error: 'Action inconnue' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── POINT D'ENTRÉE POST (écriture : coches, notes, messages...) ───
function doPost(e) {
  let result = {};
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'progression') {
      appendRow('Progression', [data.user, data.module, data.tache, data.cochee, new Date()]);
    } else if (action === 'note') {
      appendRow('Notes', [data.user, data.module, data.texte, new Date()]);
    } else if (action === 'evaluation') {
      appendRow('Evaluations', [data.user, data.module, data.question, data.reponse, new Date()]);
    } else if (action === 'quiz') {
      appendRow('Quiz', [data.user, data.visio, data.question, data.reponse, new Date()]);
    } else if (action === 'idees' || action === 'cadrage' || action === 'productions' || action === 'soutenance') {
      appendRow('Projet', [data.user, action, data.texte, new Date()]);
    } else if (action === 'set_etape_projet') {
      setEtapeProjet(data.apprenant, data.etape);
    } else if (action === 'send_message') {
      appendRow('Messages', [data.dest, data.content, false, new Date()]);
    }

    // ─── NOTIFICATION EMAIL À LAURENCE (événements importants) ───
    var EMAIL_LAURENCE = 'laurence@lrenov-ia.studio'; // ← modifie si besoin
    if (action === 'quiz') {
      MailApp.sendEmail(EMAIL_LAURENCE, 'CPF IA — ' + data.user + ' a préparé sa visio',
        data.user + ' vient de remplir son questionnaire pré-visio ' + data.visio + '.\n\nConsulte son espace formateur pour voir ses réponses.');
    } else if (action === 'evaluation' && data.question == 0) {
      MailApp.sendEmail(EMAIL_LAURENCE, 'CPF IA — ' + data.user + ' a répondu à une évaluation',
        data.user + ' a répondu au questionnaire du module ' + (parseInt(data.module)+1) + '.');
    }
    result = { success: true };
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── FONCTIONS UTILITAIRES ───
function appendRow(sheetName, row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet) sheet.appendRow(row);
}

function getApprenantData(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Apprenants');
  const data = appSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user) {
      return {
        prenom: data[i][0], session: data[i][1], meet: data[i][2],
        visios: [
          { date: data[i][3], heure: data[i][4] },
          { date: data[i][5], heure: data[i][6] },
          { date: data[i][7], heure: data[i][8] }
        ],
        etape_projet: data[i][9] || 0,
        progression: getProgressionUser(user),
        notes: getNotesUser(user)
      };
    }
  }
  return { error: 'Apprenant non trouvé' };
}

function getProgressionUser(user) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Progression');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] === user).map(r => ({ module: r[1], tache: r[2], cochee: r[3] }));
}

function getNotesUser(user) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notes');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] === user).map(r => ({ module: r[1], texte: r[2] }));
}

function setEtapeProjet(user, etape) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Apprenants');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user) {
      sheet.getRange(i + 1, 10).setValue(etape); // colonne J
      return;
    }
  }
}

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Apprenants');
  const apprenants = appSheet.getDataRange().getValues().slice(1).map(r => ({
    prenom: r[0], session: r[1], meet: r[2],
    visios: [{date:r[3],heure:r[4]},{date:r[5],heure:r[6]},{date:r[7],heure:r[8]}],
    etape_projet: r[9] || 0
  }));
  return { apprenants: apprenants };
}
