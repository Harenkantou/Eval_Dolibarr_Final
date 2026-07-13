// src/services/salaryGenerationService.js
// ─────────────────────────────────────────────────────────────
// Logique métier de la génération de salaires « par mois » avec
// majoration des jours fériés.
//
// Règle (énoncé J4) :
//   → On génère les jours d'un mois qui n'ont PAS encore de salaire.
//   → Un salarié SANS aucun salaire ce mois-ci a donc le mois entier de libre :
//     on lui génère une ligne du 1er au dernier jour du mois.
//     (Remplace la règle J2/J3 « pas de salaire de référence → rien à générer ».)
//   → Chaque jour férié tombant dans un intervalle est majoré du %.
//   → 1 intervalle libre = 1 ligne = 1 montant (il peut y en avoir plusieurs).
//
// Ce module est « pur » : aucune dépendance à Vue ni au réseau.
// Le composant se contente d'appeler buildPreview() puis createSalary().
// ─────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0')

/** Nombre de jours dans le mois (month = 1..12). */
export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

/** Un jour est-il férié ? `joursFeries` = [{ dateFerie:'YYYY-MM-DD', recurrent }]. */
export function isHoliday(day, month, year, joursFeries) {
  const mm = pad(month), dd = pad(day)
  return joursFeries.some(jf => {
    const [y, m, d] = jf.dateFerie.split('-')
    if (jf.recurrent) return m === mm && d === dd
    return y === String(year) && m === mm && d === dd
  })
}

/** Jours du mois déjà couverts par un salaire existant (Set de numéros de jour). */
export function occupiedDays(userId, salaries, month, year) {
  const set = new Set()
  for (const s of salaries) {
    if (Number(s.fk_user) !== Number(userId) || !s.datesp || !s.dateep) continue
    for (let d = new Date(s.datesp * 1000); d <= new Date(s.dateep * 1000); d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() + 1 === month) set.add(d.getDate())
    }
  }
  return set
}

/** Intervalles libres du mois pour un salarié : [{ start, end }]. */
export function freeIntervals(userId, salaries, month, year) {
  const occ = occupiedDays(userId, salaries, month, year)
  const max = daysInMonth(month, year)
  if (occ.size === 0) return [{ start: 1, end: max }]   // aucun salaire ce mois-ci → le mois entier est libre
  const gaps = []
  let start = null
  for (let d = 1; d <= max; d++) {
    if (!occ.has(d) && start === null) start = d
    if ((occ.has(d) || d === max) && start !== null) {
      const end = occ.has(d) ? d - 1 : d
      gaps.push({ start, end })
      start = null
    }
  }
  return gaps
}

/** Un jour est-il un samedi ? (0 = dimanche … 6 = samedi) */
export function isSaturday(day, month, year) {
  return new Date(year, month - 1, day).getDay() === 6
}

/** Un jour est-il un dimanche ? */
export function isSunday(day, month, year) {
  return new Date(year, month - 1, day).getDay() === 0
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Montant d'un intervalle avec majoration des jours fériés ET du week-end.
 *
 * Règles (énoncé Alea_J3, en surcouche NON destructive de J2) :
 *   → Par défaut (cases décochées), un samedi ou un dimanche est payé
 *     EXACTEMENT comme un jour de semaine — aucun découpage d'intervalle,
 *     aucune modification du résultat J2.
 *   → `includeSaturday` / `includeSunday` : cocher un jour applique EN PLUS
 *     la majoration `weekendMajorationPct` (un seul champ, jusqu'à 200 %).
 *   → Un jour à la fois férié ET week-end coché prend le MAX des deux majorations
 *     (ex. week-end 100 % vs férié 150 % → 150 %).
 *   → Les majorations samedi et dimanche sont exposées séparément pour pouvoir
 *     les déduire individuellement.
 */
export function computeInterval(interval, {
  month, year, dailyAmount, majorationPct,
  weekendMajorationPct = 0, includeSaturday = false, includeSunday = false,
  joursFeries
}) {
  const daily    = parseFloat(dailyAmount) || 0
  const feriePct = parseFloat(majorationPct) || 0
  const weekPct  = parseFloat(weekendMajorationPct) || 0

  let total = 0
  let normal = 0, ferie = 0, samedi = 0, dimanche = 0
  let majFerie = 0, majSamedi = 0, majDimanche = 0

  for (let d = interval.start; d <= interval.end; d++) {
    const holiday = isHoliday(d, month, year, joursFeries)

    // ── Samedi coché → majoration week-end (max avec férié) ───
    if (isSaturday(d, month, year) && includeSaturday) {
      const pct   = Math.max(weekPct, holiday ? feriePct : 0)
      const extra = daily * pct / 100
      total += daily + extra
      majSamedi += extra
      samedi++
      continue
    }

    // ── Dimanche coché → majoration week-end (max avec férié) ─
    if (isSunday(d, month, year) && includeSunday) {
      const pct   = Math.max(weekPct, holiday ? feriePct : 0)
      const extra = daily * pct / 100
      total += daily + extra
      majDimanche += extra
      dimanche++
      continue
    }

    // ── Jour de semaine OU week-end décoché → comportement J2 ─
    if (holiday) {
      const extra = daily * feriePct / 100
      total += daily + extra
      majFerie += extra
      ferie++
    } else {
      total += daily
      normal++
    }
  }

  return {
    total: round2(total),
    normal, ferie, samedi, dimanche,
    majFerie   : round2(majFerie),
    majSamedi  : round2(majSamedi),
    majDimanche: round2(majDimanche)
  }
}

/**
 * Aperçu global : 1 ligne = 1 intervalle = 1 montant.
 * @param {Array}  employees     salariés déjà filtrés (interface)
 * @param {Array}  salaries      tous les salaires existants
 * @param {Object} params        { month, year, dailyAmount, majorationPct,
 *                                  weekendMajorationPct, includeSaturday, includeSunday, joursFeries }
 * @returns {Array} [{ userId, name, start, end, total, normal, ferie, samedi, dimanche, majFerie, majSamedi, majDimanche }]
 */
export function buildPreview(employees, salaries, params) {
  const rows = []
  for (const e of employees) {
    for (const g of freeIntervals(e.id, salaries, params.month, params.year)) {
      const c = computeInterval(g, params)
      rows.push({ userId: e.id, name: e.name, start: g.start, end: g.end, ...c })
    }
  }
  return rows
}

/** Somme des montants d'un aperçu. */
export function previewTotal(rows) {
  return Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100
}
