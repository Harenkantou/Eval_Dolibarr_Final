// src/utils/csvParser.js
// ─────────────────────────────────────────────────────────────
// Fonctions PURES de parsing CSV.
// Aucune logique métier ici, juste de la transformation de données.
// Réutilisable par importService (et plus tard par SQLite).
// ─────────────────────────────────────────────────────────────

/**
 * Convertit un texte CSV brut en tableau d'objets JS.
 *
 * Gère les cas suivants :
 *   - Valeurs entre guillemets contenant des virgules  → "677,56"
 *   - Valeurs entre guillemets contenant du JSON       → "{[""08/03/26"",890]}"
 *
 * @param  {string} text      - Contenu brut du fichier CSV
 * @param  {string} delimiter - Séparateur de colonnes (défaut : ',')
 * @returns {Object[]}        - Tableau de lignes sous forme d'objets
 */
export const parseCSV = (text, delimiter = ',') => {
  const lines   = text.trim().split('\n')
  const headers = lines[0].split(delimiter).map(h => h.trim())

  return lines.slice(1).map((line) => {
    // ── Découpage intelligent : respecte les guillemets ──────
    const values = []
    let current      = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        // Double guillemet = guillemet échappé dans une valeur
        if (insideQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Dernière colonne

    // ── Assemblage objet ─────────────────────────────────────
    const obj = {}
    headers.forEach((header, i) => {
      obj[header] = values[i] !== undefined ? values[i] : ''
    })
    return obj
  })
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES DE FORMATAGE
// ─────────────────────────────────────────────────────────────

/**
 * Transforme une date "JJ/MM/AAAA" ou "JJ/MM/AA"
 * en timestamp Unix (secondes) attendu par l'API Dolibarr.
 *
 * @param  {string} dateStr
 * @returns {number|null}
 */
export const dateToTimestamp = (dateStr) => {
  if (!dateStr) return null

  const parts = dateStr.split('/')
  if (parts.length !== 3) return null

  let [day, month, year] = parts
  // Gérer les années à 2 chiffres → 2000+
  if (year.length === 2) year = `20${year}`

  const date = new Date(`${year}-${month}-${day}`)
  return isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000)
}

// ─────────────────────────────────────────────────────────────
// PARSING DES PAIEMENTS
// ─────────────────────────────────────────────────────────────

/**
 * Parse le champ paiement du CSV.
 *
 * Formats gérés :
 *   {["08/03/26",480],["08/03/26",300]}   ← format CSV original
 *   {["08/03/26",890]}                    ← un seul paiement
 *   vide / null                           ← aucun paiement
 *
 * Astuce : Le CSV utilise { } comme englobant.
 * On les remplace par [ ] pour obtenir un JSON valide.
 *
 * @param  {string} raw - Valeur brute du champ paiement
 * @returns {Array<[string, number]>} Ex: [["08/03/26", 480], ...]
 */
const parsePayments = (raw) => {

  // Vide ou absent → aucun paiement
  if (!raw || raw.trim() === '' || raw.trim().length <= 2) return []

  try {
    let cleaned = raw.trim()

    // ── Étape clé ─────────────────────────────────────────────
    // Remplacer les accolades EXTÉRIEURES par des crochets
    // {[...]}       →  [[...]]
    // {[...],[...]} →  [[...],[...]]
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      cleaned = '[' + cleaned.slice(1, -1) + ']'
    }

    // Maintenant on a un JSON valide → on parse
    return JSON.parse(cleaned)

  } catch (err) {
    console.warn(`[csvParser] Impossible de parser le paiement: "${raw}"`, err)
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// TRANSFORMATEURS SPÉCIFIQUES À CHAQUE FICHIER
// ─────────────────────────────────────────────────────────────

/**
 * Nettoie et transforme les lignes brutes du Fichier 1 (Employés).
 *
 * Entrée brute :
 *   { ref_employe, nom, genre, identifiant, mdp, heure_travail_semaine }
 *
 * Sortie prête pour l'API Dolibarr :
 *   { login, lastname, gender, password, array_options, _raw }
 *
 * @param  {Object[]} rawRows - Lignes brutes issues de parseCSV
 * @returns {Object[]}
 */
export const transformEmployees = (rawRows) => {
  return rawRows.map(row => ({
    // ── Champs Dolibarr ──────────────────────────────────────
    login    : row.identifiant,
    lastname : row.nom,
    password : row.mdp,
    gender   : row.genre === 'homme' ? 'man' : 'woman',
    job      : row.poste || null,

    // Champs extra (nécessite activation des extrafields dans Dolibarr)
    array_options: {
      options_ref_employe          : row.ref_employe,
      options_heure_travail_semaine: parseInt(row.heure_travail_semaine) || 35,
      //options_poste                : row.poste || row.job || ''
    },

    // ── Référence locale (non envoyée à Dolibarr) ────────────
    _raw: row
  }))
}

/**
 * Nettoie et transforme les lignes brutes du Fichier 2 (Salaires).
 *
 * Entrée brute :
 *   { ref_salaire, ref_employe, date_debut, date_fin, montant, paiement }
 *
 * Sortie prête pour l'API Dolibarr :
 *   { fk_user, amount, date_start, date_end, label, payments, _raw }
 *
 * @param  {Object[]} rawRows
 * @returns {Object[]}
 */
export const transformSalaries = (rawRows) => {
  return rawRows.map(row => {

    // ── Nettoyage du montant : "677,56" → 677.56 ─────────────
    const amount = parseFloat(row.montant.replace(',', '.')) || 0

    // ── Parsing des paiements (fonction dédiée corrigée) ─────
    const payments = parsePayments(row.paiement)

    // ── Formatage des paiements ──────────────────────────────
    const paymentsFormatted = payments.map(p => ({
      date_paye: dateToTimestamp(p[0]),  // ex: "08/03/26"
      amount   : p[1]
    }))

    return {
      // ── Champs Dolibarr ──────────────────────────────────────
      fk_user   : parseInt(row.ref_employe),
      amount    : amount,
      date_start: dateToTimestamp(row.date_debut),
      date_end  : dateToTimestamp(row.date_fin),
      label     : `Salaire du ${row.date_debut} au ${row.date_fin}`,
      paye      : 0,

      // ── Paiements multiples (traités après création du salaire) ─
      payments  : paymentsFormatted,

      // ── Référence locale ─────────────────────────────────────
      _raw      : row
    }
  })
}