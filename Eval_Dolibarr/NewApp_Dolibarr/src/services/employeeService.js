// src/services/employeeService.js
// ─────────────────────────────────────────────────────────────
// Sélection / filtrage des salariés (côté interface).
// Module « pur » : aucune dépendance à Vue ni au réseau.
// ─────────────────────────────────────────────────────────────

/** Liste triée des postes distincts présents dans une liste de salariés. */
export function distinctJobs(employees = []) {
  const set = new Set()
  for (const e of employees) if (e.job) set.add(e.job)
  return [...set].sort()
}

/**
 * Filtre une liste de salariés selon poste / genre / plage d'heures.
 * @param {Array}  employees
 * @param {Object} filters  { job, gender, hoursMin, hoursMax }
 *                          hoursMin/hoursMax vides ('' ou null) = pas de borne.
 */
export function filterEmployees(employees = [], { job, gender, hoursMin, hoursMax } = {}) {
  const min = hoursMin === '' || hoursMin == null ? -Infinity : parseFloat(hoursMin)
  const max = hoursMax === '' || hoursMax == null ?  Infinity : parseFloat(hoursMax)
  return employees.filter(e => {
    if (job    && e.job    !== job)    return false
    if (gender && e.gender !== gender) return false
    const h = Number(e.hours) || 0
    if (h < min || h > max) return false
    return true
  })
}
