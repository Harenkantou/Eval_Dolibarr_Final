// src/services/salaryListService.js
// ─────────────────────────────────────────────────────────────
// Regroupement / filtrage / totaux des salaires par salarié,
// pour la page « Salaires & historique » (SalaireLignesList).
// Module « pur » : aucune dépendance à Vue ni au réseau.
// ─────────────────────────────────────────────────────────────
import { round2 } from './formatService'

/**
 * Regroupe les salaires par salarié (1 groupe = 1 historique).
 * @returns {Array} [{ ...employee, lines, count, due, paid, rest, solde }]
 *                  (salariés sans salaire exclus)
 */
export function groupSalariesByEmployee(employees = [], salaries = []) {
  const byUser = {}
  for (const s of salaries) (byUser[s.fk_user] ||= []).push(s)

  return employees
    .map(e => {
      const lines = (byUser[e.id] || [])
        .slice()
        .sort((a, b) => (b.datesp || 0) - (a.datesp || 0))
      const due  = lines.reduce((sum, s) => sum + s.amount, 0)
      const paid = lines.reduce((sum, s) => sum + s.totalPaye, 0)
      return {
        ...e,
        lines,
        count: lines.length,
        due  : round2(due),
        paid : round2(paid),
        rest : round2(due - paid),
        solde: lines.length > 0 && due - paid <= 0.001
      }
    })
    .filter(g => g.count > 0)
}

/**
 * Filtre les groupes par recherche (nom/réf) et statut ('solde' | 'encours' | '').
 */
export function filterGroups(groups = [], { search = '', status = '' } = {}) {
  const q = search.trim().toLowerCase()
  return groups.filter(g => {
    const matchSearch = !q ||
      (g.name || '').toLowerCase().includes(q) ||
      String(g.ref ?? '').toLowerCase().includes(q)
    const matchStatus = !status || (status === 'solde' ? g.solde : !g.solde)
    return matchSearch && matchStatus
  })
}

/** Totaux globaux sur une liste de groupes. */
export function sumGroups(groups = []) {
  const due   = groups.reduce((s, g) => s + g.due, 0)
  const paid  = groups.reduce((s, g) => s + g.paid, 0)
  const count = groups.reduce((s, g) => s + g.count, 0)
  return { count, due: round2(due), paid: round2(paid), rest: round2(due - paid) }
}

/** Totaux dû / payé / reste d'une liste de salaires (fiche salarié). */
export function sumSalaries(salaries = []) {
  const due  = salaries.reduce((s, x) => s + x.amount, 0)
  const paid = salaries.reduce((s, x) => s + x.totalPaye, 0)
  return { due: round2(due), paid: round2(paid), rest: round2(due - paid) }
}

/**
 * Agrège les salaires par salarié (fk_user) → map d'stats.
 * @returns {Object} { [fk_user]: { count, due, paid, rest, solde } }
 */
export function statsByUser(salaries = []) {
  const map = {}
  for (const s of salaries) {
    const acc = map[s.fk_user] || { count: 0, due: 0, paid: 0 }
    acc.count += 1
    acc.due   += s.amount
    acc.paid  += s.totalPaye
    map[s.fk_user] = acc
  }
  for (const k in map) {
    map[k].due   = round2(map[k].due)
    map[k].paid  = round2(map[k].paid)
    map[k].rest  = round2(map[k].due - map[k].paid)
    map[k].solde = map[k].rest <= 0 && map[k].count > 0
  }
  return map
}

/** Salariés enrichis de leurs totaux : [{ ...employee, stats }]. */
export function buildEmployeeStats(employees = [], salaries = []) {
  const stats = statsByUser(salaries)
  const empty = { count: 0, due: 0, paid: 0, rest: 0, solde: false }
  return employees.map(e => ({ ...e, stats: stats[e.id] || empty }))
}

/**
 * Filtre des salariés enrichis par recherche (nom/login/réf), genre et statut.
 * @param {Array}  rows     issus de buildEmployeeStats
 * @param {Object} filters  { search, gender, status }  status ∈ '' | 'solde' | 'encours'
 */
export function filterEmployeeRows(rows = [], { search = '', gender = '', status = '' } = {}) {
  const q = search.trim().toLowerCase()
  return rows.filter(r => {
    const matchSearch = !q ||
      (r.name  || '').toLowerCase().includes(q) ||
      (r.login || '').toLowerCase().includes(q) ||
      String(r.ref ?? '').toLowerCase().includes(q)
    const matchGender = !gender || r.gender === gender
    const matchStatus = !status ||
      (status === 'solde'   ?  r.stats.solde && r.stats.count > 0 : false) ||
      (status === 'encours' ? !r.stats.solde && r.stats.count > 0 : false)
    return matchSearch && matchGender && matchStatus
  })
}
