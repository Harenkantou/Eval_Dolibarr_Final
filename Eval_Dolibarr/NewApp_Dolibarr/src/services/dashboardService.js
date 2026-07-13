// src/services/dashboardService.js
// ─────────────────────────────────────────────────────────────
// Statistiques du Dashboard BackOffice (énoncé J1 — point 1.d) :
//   → le montant de salaire par GENRE
//   → le montant de salaire par MOIS
//
// Les deux graphiques mesurent la MÊME chose : le montant du salaire
// (`salary.amount`). Seul l'axe de regroupement change (genre / mois).
// Le mois de référence est celui de la DATE DE DÉBUT du salaire (`datesp`),
// si bien que la somme des mois retombe toujours sur le montant total.
//
// Communication 100% via API Dolibarr :
//   → GET /users     (pour récupérer le genre de chaque employé)
//   → GET /salaries  (pour récupérer les salaires)
// ─────────────────────────────────────────────────────────────
import http from './http'

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

const errMsg = (err) =>
  err.response?.data?.error?.message ||
  err.response?.data?.error ||
  err.message

/**
 * « Snap » d'un timestamp Dolibarr au minuit UTC le plus proche.
 * Dolibarr stocke minuit dans SON fuseau (UTC+1) et nous le renvoie décalé
 * de -1h : le salaire du 01/03 arrive à 2026-02-28T23:00Z. Sans correction,
 * getUTCMonth() le classerait en février. (Même helper que api/dolibarr.js.)
 */
const snapDay = (ts) => Math.round(Number(ts) / 86400) * 86400

/**
 * Timestamp Dolibarr → clé de mois triable "AAAA-MM".
 * @returns {string|null} null si la date est absente.
 */
const monthKey = (ts) => {
  if (ts == null || ts === '') return null
  const d = new Date(snapDay(ts) * 1000)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// ═════════════════════════════════════════════════════════════
// CHARGEMENT DES DONNÉES BRUTES (API Dolibarr)
// ═════════════════════════════════════════════════════════════

/**
 * Map { id Dolibarr → { gender, name, ref } } pour retrouver le genre
 * d'un salaire via son fk_user.
 */
const getUsersById = async () => {
  const res = await http.get('/users', { params: { limit: 500 } })
  const map = {}
  for (const u of res.data || []) {
    map[u.id] = {
      gender: u.gender,                                   // 'man' | 'woman' | null
      name  : u.lastname,
      ref   : u.array_options?.options_ref_employe || null
    }
  }
  return map
}

/** Récupère tous les salaires (404 = aucune donnée → tableau vide). */
export const getSalaries = async () => {
  try {
    const res = await http.get('/salaries', { params: { limit: 500 } })
    return res.data || []
  } catch (e) {
    if (e.response?.status === 404) return []
    throw e
  }
}

// ═════════════════════════════════════════════════════════════
// AGRÉGATIONS (fonctions PURES → testables sans réseau)
// ═════════════════════════════════════════════════════════════

/**
 * Montant total de salaire par genre.
 * Utilise le montant DÛ (salary.amount), groupé selon le genre de l'employé.
 *
 * @param  {Object[]} salaries   - salaires bruts de l'API
 * @param  {Object}   usersById  - map issue de getUsersById()
 * @returns {{ man: number, woman: number, unknown: number }}
 */
export const salaryByGender = (salaries, usersById) => {
  const totals = { man: 0, woman: 0, unknown: 0 }

  for (const s of salaries) {
    const amount = parseFloat(s.amount) || 0
    const gender = usersById[s.fk_user]?.gender

    if (gender === 'man')        totals.man   += amount
    else if (gender === 'woman') totals.woman += amount
    else                         totals.unknown += amount
  }

  return totals
}

/**
 * Montant total de salaire par mois.
 * Chaque salaire est rattaché au mois de sa DATE DE DÉBUT (`datesp`) et
 * compte pour son montant dû (`amount`) — un salaire n'est donc jamais
 * scindé entre deux mois, et la somme des mois = montant total.
 *
 * @param  {Object[]} salaries - salaires bruts de l'API
 * @returns {Array<{ month: string, label: string, total: number }>}
 *          Trié par ordre chronologique croissant.
 */
export const salaryByMonth = (salaries) => {
  const byMonth = {}

  for (const s of salaries) {
    const key = monthKey(s.datesp)
    if (!key) continue                       // salaire sans date de début : ignoré
    byMonth[key] = (byMonth[key] || 0) + (parseFloat(s.amount) || 0)
  }

  const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
                'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => {
      const [year, m] = month.split('-')
      return {
        month,                                     // "2026-03"
        label: `${MOIS[parseInt(m) - 1]} ${year}`, // "Mars 2026"
        total: Math.round(total * 100) / 100
      }
    })
}

// ═════════════════════════════════════════════════════════════
// POINT D'ENTRÉE UNIQUE POUR LE DASHBOARD
// ═════════════════════════════════════════════════════════════

/**
 * Charge et agrège toutes les statistiques nécessaires au Dashboard.
 *
 * @returns {Promise<{
 *   byGender: { man, woman, unknown },
 *   byMonth : Array<{ month, label, total }>,
 *   totalSalaries: number,
 *   totalAmount  : number
 * }>}
 */
export const getDashboardStats = async () => {
  const [salaries, usersById] = await Promise.all([
    getSalaries(),
    getUsersById()
  ])

  const byGender = salaryByGender(salaries, usersById)
  const byMonth  = salaryByMonth(salaries)

  return {
    byGender,
    byMonth,
    totalSalaries: salaries.length,
    totalAmount  : Math.round((byGender.man + byGender.woman + byGender.unknown) * 100) / 100
  }
}

// Utilitaire exposé pour la vue (formatage monétaire homogène)
export const formatMoney = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(Number(n) || 0)
