const round2 = (n)  => Math.round((Number(n) || 0) * 100) / 100

//Filtre les salaires par mois/années (sur la date de début, en UTC)
export function filterByMonth(salaries, month, year) {
    return salaries.filter(s => {
        if (!s.datesp) return false
        const d = new Date(s.datesp * 1000)
        return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month
    })
}

//Function pour salaire qu'avec reste à payer 
export function keepUnpaid(salaries) {
    return salaries.filter(s => (s.reste || 0 ) > 0)
}

//Tri des salaires selon ces conditions:
// NB : e.id est une string ("99"), fk_user un number (parseInt) → on indexe
// les Map par String() des deux côtés, sinon les lookups échouent (poste, nom).
export function sortByPriority(salaries, employees, priorityJob) {
    const jobById = new Map(employees.map(e => [String(e.id), e.job]))
    const nameById = new Map(employees.map(e => [String(e.id), e.name ]))
    return [...salaries].sort((a, b) => {
    const jobA = jobById.get(String(a.fk_user))
    const jobB = jobById.get(String(b.fk_user))
    const priA = (priorityJob && jobA === priorityJob) ? 0 : 1
    const priB = (priorityJob && jobB === priorityJob) ? 0 : 1
    if (priA !== priB) return priA - priB
    if ((a.datesp || 0) !== (b.datesp || 0)) return (a.datesp || 0) - (b.datesp || 0)
    return (nameById.get(String(a.fk_user)) || '').localeCompare(nameById.get(String(b.fk_user)) || '')
  })


}

/**
 * Répartit un budget sur une liste triée de salaires.
 * Renvoie le plan de paiement (1 ligne = 1 salaire ciblé).
 *
 * L'ORDRE de paiement liste TOUS les salaires non soldés concernés (1 ligne
 * chacun), même ceux qui dépassent le budget : ces derniers apparaissent avec
 * payment = 0 et funded = false (« non financé »). Le budget détermine juste
 * combien chacun reçoit, pas combien de salaires sont listés.
 *
 * @returns {{ plan: Array, totalPaid: number, unusedBudget: number }}
 *   plan[i] = { salaryId, userId, name, job, datesp, dateep, amount,
 *               resteBefore, payment, resteAfter, partial, funded }
 */
export function dispatchBudget(budget, sortedSalaries, employees) {
  const nameById = new Map(employees.map(e => [String(e.id), e.name]))
  const jobById  = new Map(employees.map(e => [String(e.id), e.job]))

  const plan = []
  let remaining = round2(budget)

  for (const s of sortedSalaries) {
    const reste = round2(s.reste)
    if (reste <= 0) continue                       // déjà soldé → hors ordre

    const pay = round2(Math.min(Math.max(remaining, 0), reste))  // 0 si budget épuisé
    plan.push({
      salaryId    : s.id,
      userId      : s.fk_user,
      name        : nameById.get(String(s.fk_user)) || `#${s.fk_user}`,
      job         : jobById.get(String(s.fk_user))  || null,
      datesp      : s.datesp,
      dateep      : s.dateep,
      amount      : round2(s.amount),
      resteBefore : reste,
      payment     : pay,
      resteAfter  : round2(reste - pay),
      partial     : pay > 0 && pay < reste,        // partiellement payé
      funded      : pay > 0                         // false = non financé (budget épuisé)
    })
    remaining = round2(remaining - pay)
  }

  return {
    plan,
    totalPaid    : round2(budget - remaining),
    unusedBudget : remaining
  }
}

/** Point d'entrée simplifié : filtre → tri → dispatch. */
export function buildDispatchPlan({ budget, month, year, priorityJob, salaries, employees }) {
  const filtered = filterByMonth(salaries, month, year)
  const unpaid   = keepUnpaid(filtered)
  const sorted   = sortByPriority(unpaid, employees, priorityJob)
  return dispatchBudget(budget, sorted, employees)
}

/**
 * Récapitulatif par employé concerné à partir des résultats d'un run.
 * Agrège les salaires payés d'un même employé en 1 carte :
 *   - totalDue  = salaire total à payer (somme des montants concernés)
 *   - totalPaid = salaire déjà payé (cumul, import + ce run inclus)
 *
 * @param {Array} results  résultats de runPaymentPlan (plan + { success })
 * @returns {Array} [{ userId, name, job, totalDue, totalPaid, solde }]
 */
export function buildRecap(results = []) {
  const byUser = new Map()
  for (const r of results) {
    if (!r.success) continue
    const cur = byUser.get(r.userId) || {
      userId: r.userId, 
      name: r.name, 
      job: r.job, 
      totalDue: 0, 
      totalPaid: 0,
      totalReste: 0 
    }
    cur.totalDue  += Number(r.amount) || 0
    cur.totalPaid += (Number(r.amount) || 0) - (Number(r.resteAfter) || 0)

    cur.totalReste += Number(r.resteAfter) || 0
    byUser.set(r.userId, cur)
  }
  return [...byUser.values()].map(u => ({
    ...u,
    totalDue : round2(u.totalDue),
    totalPaid: round2(u.totalPaid),
    totalReste: round2(u.totalReste),
    solde    : round2(u.totalDue - u.totalPaid) <= 0
  }))
}

//ALEA_5
/**
 * Plan de paiement au pourcentage pour un ensemble de croisements
 * (une ligne « Mois & Année » ou une colonne « Salarié » du tableau croisé).
 *
 * Le pourcentage s'applique AU PRORATA sur le reste de chaque salaire : à 30 %,
 * chaque salaire non soldé reçoit 30 % de son propre reste. Le dernier salaire
 * absorbe l'écart d'arrondi pour que la somme payée corresponde exactement au
 * montant annoncé à l'utilisateur.
 *
 * @param {Object} p
 * @param {Array} p.cells     croisements (cellsOfPeriod / cellsOfEmployee)
 * @param {number} p.percent  0 -> 100
 * @param {Array} p.employees
 * @returns {{percent, totalRest, target, plan, totalPaid}}
 * plan[i] = {salaryId, userId, name, job, datesp, dateep, amount,
 * resteBefore, payment, resteAfter, partial, funded}
 */

export function buildPercentPlan({ cells = [], percent = 0, employees = []}) {
  const pct = Math.min(Math.max(Number(percent) || 0, 0), 100)
  const nameById = new Map(employees.map(e => [String(e.id), e.name]))
  const jobById = new Map(employees.map(e => [String(e.id), e.job]))
  const lines = cells
    .flatMap(c => c.lines || [])
    .filter(s => round2(s.reste) > 0)
    .sort((a, b) => (a.datesp || 0) - (b.datesp || 0))
  const totalRest = round2(lines.reduce((s, l) => s + round2(l.reste), 0))
  const target = round2(totalRest * pct / 100)
  const plan = []
  let allocated = 0

  lines.forEach((s, i) => {
    const reste = round2(s.reste)
    const last = i === lines.length - 1

    // Le dernier salaire reçoit le solde du montant cible (plafonné à son reste).
    const raw = last ? round2(target - allocated) : round2(reste * pct / 100)
    const pay = round2(Math.min(Math.max(raw, 0), reste))

    allocated = round2(allocated + pay)
    plan.push({
      salaryId    : s.id,
      userId      : s.fk_user,
      name        : nameById.get(String(s.fk_user)) || `#${s.fk_user}`,
      job         : jobById.get(String(s.fk_user)) || null,
      datesp      : s.datesp,
      dateep      : s.dateep,
      amount      : round2(s.amount),
      resteBefore : reste,
      payment     : pay,
      resteAfter  : round2(reste - pay),
      partial     : pay > 0 && pay < reste,
      funded      : pay > 0
    })
  })
  return { percent: pct, totalRest, target, plan, totalPaid: allocated }
}
