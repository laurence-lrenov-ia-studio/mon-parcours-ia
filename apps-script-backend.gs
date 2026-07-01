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
 *   A: Prénom | B: Email | C: Session | D: Lien Meet | E: Visio1_date
 *   F: Visio1_heure | G: Visio2_date | H: Visio2_heure
 *   I: Visio3_date | J: Visio3_heure | K: Etape_projet (0,1,2,3)
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
    } else if (action === 'login_email') {
      result = getApprenantByEmail(e.parameter.email);
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
    } else if (action === 'set_visio') {
      result = setVisio(data.apprenant, data.visio, data.date, data.heure, data.meet);
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
    if (!result || Object.keys(result).length === 0) result = { success: true };
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

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function headerMap(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[normalizeHeader(header)] = index;
  });
  return map;
}

function cell(row, map, header) {
  const index = map[normalizeHeader(header)];
  return index === undefined ? '' : row[index];
}

function findApprenantRow(value, header) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Apprenants');
  if (!sheet) return null;
  const data = sheet.getDataRange().getDisplayValues();
  if (!data.length) return null;
  const map = headerMap(data[0]);
  const column = map[normalizeHeader(header)];
  if (column === undefined) return null;
  const needle = String(value || '').trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][column] || '').trim().toLowerCase() === needle) {
      return { sheet: sheet, row: data[i], rowNumber: i + 1, map: map };
    }
  }
  return null;
}

function apprenantFromRow(row, map) {
  const sessionId = cell(row, map, 'Session');
  return {
    prenom: cell(row, map, 'Prénom'),
    email: cell(row, map, 'Email'),
    session: sessionId,
    meet: cell(row, map, 'Lien Meet'),
    visios: [1, 2, 3].map(function(n) {
      return {
        date: cell(row, map, 'Visio' + n + '_date'),
        heure: cell(row, map, 'Visio' + n + '_heure')
      };
    }),
    etape_projet: parseInt(cell(row, map, 'Etape_projet'), 10) || 0
  };
}

function getApprenantData(user) {
  const found = findApprenantRow(user, 'Prénom');
  if (!found) return { error: 'Apprenant non trouvé' };
  const result = apprenantFromRow(found.row, found.map);
  result.progression = getProgressionUser(result.prenom);
  result.progression_pct = getProgressionPourcentage(result.prenom);
  result.notes = getNotesUser(result.prenom);
  result.session_data = getSessionData(result.session);
  return result;
}

function getApprenantByEmail(email) {
  const found = findApprenantRow(email, 'Email');
  if (!found) return { found: false };
  const result = apprenantFromRow(found.row, found.map);
  result.found = true;
  result.progression_pct = getProgressionPourcentage(result.prenom);
  result.session_data = getSessionData(result.session);
  return result;
}

function getProgressionUser(user) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Progression');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] === user).map(r => ({ module: r[1], tache: r[2], cochee: r[3] }));
}

// Nombre total de tâches attendues sur tout le parcours (6 modules × 5 étapes)
// Ajuste ce chiffre si le nombre réel d'étapes par module change.
const TOTAL_TACHES_PARCOURS = 30;

function isCochee(value) {
  return value === true || value === 'TRUE' || value === 'VRAI' || value === 1;
}

// Calcule le vrai % de progression d'un apprenant à partir de ses coches réelles.
// progressionCache (optionnel) évite de relire tout l'onglet à chaque apprenant.
function getProgressionPourcentage(user, progressionCache) {
  const rows = progressionCache || SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Progression').getDataRange().getValues().slice(1);
  const cochees = rows.filter(r => r[0] === user && isCochee(r[3])).length;
  return TOTAL_TACHES_PARCOURS > 0
    ? Math.min(100, Math.round((cochees / TOTAL_TACHES_PARCOURS) * 100))
    : 0;
}

function getNotesUser(user) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notes');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] === user).map(r => ({ module: r[1], texte: r[2] }));
}

function setEtapeProjet(user, etape) {
  const found = findApprenantRow(user, 'Prénom');
  if (!found) throw new Error('Apprenant non trouvé');
  const column = found.map[normalizeHeader('Etape_projet')];
  if (column === undefined) throw new Error('Colonne Etape_projet introuvable');
  found.sheet.getRange(found.rowNumber, column + 1).setValue(parseInt(etape, 10) || 0);
}

function setVisio(user, visio, date, heure, meet) {
  const number = parseInt(visio, 10);
  if (number < 1 || number > 3) throw new Error('Numéro de visio invalide');
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const found = findApprenantRow(user, 'Prénom');
    if (!found) throw new Error('Apprenant non trouvé');
    const dateColumn = found.map[normalizeHeader('Visio' + number + '_date')];
    const timeColumn = found.map[normalizeHeader('Visio' + number + '_heure')];
    const meetColumn = found.map[normalizeHeader('Lien Meet')];
    if (dateColumn === undefined || timeColumn === undefined) {
      throw new Error('Colonnes de la visio introuvables');
    }
    found.sheet.getRange(found.rowNumber, dateColumn + 1).setValue(String(date || '').trim());
    found.sheet.getRange(found.rowNumber, timeColumn + 1).setValue(String(heure || '').trim());
    if (meetColumn !== undefined && meet !== undefined) {
      found.sheet.getRange(found.rowNumber, meetColumn + 1).setValue(String(meet || '').trim());
    }
    SpreadsheetApp.flush();
    return { success: true, apprenant: getApprenantData(user) };
  } finally {
    lock.releaseLock();
  }
}

function getSessionData(sessionId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sessions');
  if (!sheet) return null;
  const data = sheet.getDataRange().getDisplayValues();
  if (!data.length) return null;
  const map = headerMap(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (String(cell(data[i], map, 'ID')) === String(sessionId)) {
      return {
        id: cell(data[i], map, 'ID'),
        label: cell(data[i], map, 'Label'),
        ateliers: [1, 2].map(function(n) {
          return {
            date: cell(data[i], map, 'Atelier' + n + '_date'),
            heure: cell(data[i], map, 'Atelier' + n + '_heure'),
            meet: cell(data[i], map, 'Atelier' + n + '_meet')
          };
        })
      };
    }
  }
  return null;
}

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Apprenants');
  const data = appSheet.getDataRange().getDisplayValues();
  const map = headerMap(data[0] || []);
  const progSheet = ss.getSheetByName('Progression');
  const progressionCache = progSheet ? progSheet.getDataRange().getValues().slice(1) : [];
  const apprenants = data.slice(1)
    .filter(function(row) { return cell(row, map, 'Prénom'); })
    .map(function(row) {
      const apprenant = apprenantFromRow(row, map);
      apprenant.progression_pct = getProgressionPourcentage(apprenant.prenom, progressionCache);
      return apprenant;
    });
  const sessionIds = {};
  apprenants.forEach(function(apprenant) { sessionIds[apprenant.session] = true; });
  const sessions = Object.keys(sessionIds).map(getSessionData).filter(function(session) { return session; });
  return { apprenants: apprenants, sessions: sessions };
}
