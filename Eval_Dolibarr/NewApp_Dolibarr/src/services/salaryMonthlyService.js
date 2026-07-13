import { round2, pad } from './formatService'

export const MONTH_NAMES = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']

export const monthLabel = (m) => MONTH_NAMES[m - 1]

const periodOf= (ts) => {
    const d = new Date(Number(ts) * 1000)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() +  1}
}

export function listYears(salaries = []) {
    const years = new Set()
    for (const s of salaries) {
        if (!s.datesp) continue
        years.add(periodOf(s.datesp).year)
    }
    return [...years].sort((a,b) => b - a)
}


/**Construction d'un ligne par croisement
 * @params {Array} employees issus de getEmployees()
 * @params {Array} salaries issus de getSalaires()
 * @params {Objects} opts {year, month} filtres optionnels (null = tous)
 * @return {Array} [{key, year, month, monthLabel,userId, name, ref, job, etc}]
 */

export function buildMonthlyRest(employees = [], salaries = [], { year = null, month = null } = {}) {
    const empById = new Map(employees.map(e => [String(e.id), e]))
    const rows = new Map()
    for(const s of salaries) {
        if (!s.datesp) continue
        const { year: y, month: m} = periodOf(s.datesp)
        if (year && y !== year ) continue
        if (month && m !== month) continue

        const key = `${y}-${m}-${s.fk_user}`
        const emp = empById.get(String(s.fk_user))
        const row = rows.get(key) || {
            key,
            year    : y,
            month   : m,
            monthLabel  : monthLabel(m),
            userId  : s.fk_user,
            name    : emp?.name ?? `#${s.fk_user}`,
            ref : emp?.ref ?? null,
            job : emp?.job ?? null,
            lines   : [],
            due : 0,
            paid    : 0
        }
        row.lines.push(s)
        row.due += s.amount
        row.paid += s.totalPaye
        rows.set(key, row)
    }

    return [...rows.values()].map(r => {
        const rest = round2(r.due - r.paid)
        return {
            ...r,
            lines: r.lines.slice().sort((a,b) => (a.datesp || 0) - (b.datesp || 0)),
            due : round2(r.due),
            paid : round2(r.paid),
            rest,
            solde: rest <=0.001
        }
    })
}

/**Colonnes du tableau croisé : un salarié = une colonne, y compris ceux
 * qui n'ont aucun salaire (leur colonne reste vide).
 * @params {Array} employees
 * @return {Array} [{ userId, name, ref }] trié par référence puis nom
 */
export function pivotColumns(employees = []) {
    return [...employees]
        .sort((a, b) =>
            (Number(a.ref) || 0) - (Number(b.ref) || 0) ||
            (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ userId: String(e.id), name: e.name, ref: e.ref ?? null }))
}

/**Pivot : une ligne par couple (Mois, Année), une cellule par salarié.
 * Seules les périodes portant au moins un salaire produisent une ligne.
 * @params {Array} rows croisements issus de buildMonthlyRest()
 * @return {Array} [{ key, year, month, monthLabel, cells: {userId: row}, rest }]
 */
export function buildPivot(rows = []) {
    const periods = new Map()
    for (const r of rows) {
        const key = `${r.year}-${pad(r.month)}`
        const p = periods.get(key) || {
            key,
            year      : r.year,
            month     : r.month,
            monthLabel: monthLabel(r.month),
            cells     : {},
            rest      : 0
        }
        p.cells[String(r.userId)] = r
        p.rest += r.rest
        periods.set(key, p)
    }
    return [...periods.values()].map(p => ({ ...p, rest: round2(p.rest) }))
}

/**Tri des périodes du pivot (colonne « Mois & Année »).
 * @params {Object} opts {dir: 'asc'|'desc'}
 */
export function sortPeriods(periods = [], { dir = 'asc' } = {}) {
    const sign = dir === 'desc' ? -1 : 1
    return [...periods].sort((a, b) =>
        sign * (a.year - b.year) || sign * (a.month - b.month))
}

//Totaux des ensembles
export function sumRows(rows = []) {
    const due = rows.reduce((s, r) => s + r.due, 0)
    const paid = rows.reduce((s, r) => s + r.paid, 0)
    return {
        count: rows.length,
        due  : round2(due),
        paid : round2(paid),
        rest : round2(due - paid)
    }
}

//Règlement d'un croisement
export function paymentsOfRow(row) {
    if (!row) return []
    return row.lines.flatMap(s => s.payments.map(p => ({
        ...p,
        salaryId: s.id,
        datesp  : s.datesp,
        dateep  : s.dateep
    })))
}

//ALEA_5
export function cellsOfPeriod(period, columns = []) {
    if (!period) return []
    return columns.map(c => period.cells[String(c.userId)]).filter(Boolean)
}

export function cellsOfEmployee(rows = [], userId) {
    return rows.filter(r => String(r.userId) === String(userId))
}

export function restOf(cells = []) {
    return round2(cells.reduce((s, c) => s + (c.rest || 0), 0))
}