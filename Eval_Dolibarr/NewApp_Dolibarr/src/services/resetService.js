// src/services/resetService.js
// ─────────────────────────────────────────────────────────────
// Réinitialisation Dolibarr : suppression des données importées.
// Le DELETE /salaries/{id} fonctionne maintenant
// (fonction delete décommentée dans api_salaries.class.php)
// ─────────────────────────────────────────────────────────────
import http from './http'
import { listJoursFeries, deleteAllJoursFeries } from '@/api/joursFeriesApi'

const errMsg = (err) =>
  err.response?.data?.error?.message ||
  err.response?.data?.error ||
  err.message

// ═════════════════════════════════════════════════════════════
// RESET SALAIRES
// ═════════════════════════════════════════════════════════════

export const resetSalaries = async (onProgress = null) => {
  let salaries = []

  try {
    const res = await http.get('/salaries', { params: { limit: 500 } })
    salaries = res.data || []
  } catch (e) {
    // 404 = aucune donnée → rien à supprimer
    if (e.response?.status === 404) {
      return { success: true, total: 0, deleted: 0, errors: 0 }
    }
    throw e
  }

  let deleted = 0
  let errors  = 0

  for (let i = 0; i < salaries.length; i++) {
    try {
      await http.delete(`/salaries/${salaries[i].id}`)
      deleted++
    } catch (e) {
      errors++
      console.error(`[Reset salaire ${salaries[i].id}]`, errMsg(e))
    }
    if (onProgress) onProgress({ current: i + 1, total: salaries.length })
  }

  return { success: errors === 0, total: salaries.length, deleted, errors }
}

// ═════════════════════════════════════════════════════════════
// RESET EMPLOYÉS
// ═════════════════════════════════════════════════════════════

export const resetEmployees = async (onProgress = null) => {
  let users = []

  try {
    const res = await http.get('/users', { params: { limit: 500 } })
    users = (res.data || []).filter(u =>
      u.array_options?.options_ref_employe && u.login !== 'admin'
    )
  } catch (e) {
    if (e.response?.status === 404) {
      return { success: true, total: 0, deleted: 0, errors: 0 }
    }
    throw e
  }

  let deleted = 0
  let errors  = 0

  for (let i = 0; i < users.length; i++) {
    try {
      await http.delete(`/users/${users[i].id}`)
      deleted++
    } catch (e) {
      errors++
      console.error(`[Reset user ${users[i].login}]`, errMsg(e))
    }
    if (onProgress) onProgress({ current: i + 1, total: users.length })
  }

  return { success: errors === 0, total: users.length, deleted, errors }
}


// ═════════════════════════════════════════════════════════════
// RESET DOCUMENTS (images orphelines du module users)
// ═════════════════════════════════════════════════════════════

/**
 * Purge les images uploadées dans le dossier des utilisateurs Dolibarr.
 * À appeler APRÈS resetEmployees (les fichiers deviennent orphelins
 * une fois les users supprimés).
 *
 * Stratégie : on parcourt tous les users encore présents + on tente
 * une plage d'IDs pour attraper les orphelins. Les 404 sont ignorés.
 *
 * @param  {Function} onProgress
 * @returns {Promise<{success, deleted, errors}>}
 */
export const resetDocuments = async (onProgress = null) => {
  let deleted = 0
  let errors  = 0

  // ── 1. Récupérer les users encore présents (avec leurs docs) ──
  let users = []
  try {
    const res = await http.get('/users', { params: { limit: 500 } })
    users = res.data || []
  } catch (e) {
    if (e.response?.status !== 404) throw e
  }

  // ── 2. Pour chaque user, lister ses documents et les supprimer ──
  const filesToDelete = []

  for (const user of users) {
    try {
      const docsRes = await http.get('/documents', {
        params: { modulepart: 'user', id: user.id }
      })
      const docs = docsRes.data || []
      for (const doc of docs) {
        // Chemin relatif attendu par DELETE : "{userId}/{filename}"
        filesToDelete.push(`${user.id}/${doc.name || doc.level1name}`)
      }
    } catch (e) {
      if (e.response?.status !== 404) {
        console.warn(`[resetDocuments] liste docs user ${user.id}:`, e.message)
      }
    }
  }

  // ── 3. Supprimer chaque fichier ──
  for (let i = 0; i < filesToDelete.length; i++) {
    try {
      await http.delete('/documents', {
        params: {
          modulepart   : 'user',
          original_file: filesToDelete[i]
        }
      })
      deleted++
    } catch (e) {
      // 404 = fichier déjà absent → OK
      if (e.response?.status !== 404) {
        errors++
        console.error(`[resetDocuments ${filesToDelete[i]}]`,
          e.response?.data?.error?.message || e.message)
      }
    }
    if (onProgress) onProgress({ current: i + 1, total: filesToDelete.length })
  }

  return { success: errors === 0, total: filesToDelete.length, deleted, errors }
}

// ═════════════════════════════════════════════════════════════
// RESET JOURS FÉRIÉS (SQLite via SpringBoot)
// ═════════════════════════════════════════════════════════════

export const resetJoursFeries = async (onProgress = null) => {
  let total = 0

  try {
    // Compter avant suppression (pour le rapport)
    const list = await listJoursFeries()
    total = list.length

    if (onProgress) onProgress({ current: 0, total })

    if (total === 0) {
      return { success: true, total: 0, deleted: 0, errors: 0 }
    }

    await deleteAllJoursFeries()

    if (onProgress) onProgress({ current: total, total })

    return { success: true, total, deleted: total, errors: 0 }
  } catch (e) {
    console.error('[resetJoursFeries]', errMsg(e))
    return {
      success: false,
      total,
      deleted: 0,
      errors : 1,
      error  : errMsg(e)
    }
  }
}

// ═════════════════════════════════════════════════════════════
// RESET TOUT (salaires d'abord, puis employés)
// ═════════════════════════════════════════════════════════════



export const resetAll = async (onProgress = null) => {
  const salaries = await resetSalaries(p =>
    onProgress?.({ step: 'salaries', ...p })
  )

  const documents = await resetDocuments(p =>
    onProgress?.({ step: 'documents', ...p})
  )
  const employees = await resetEmployees(p =>
    onProgress?.({ step: 'employees', ...p })
  )

  const joursFeries = await resetJoursFeries(p =>
    onProgress?.({ step: 'joursFeries', ...p })
  )


  return {
    success: salaries.success && documents.success && employees.success,
    salaries,
    documents,
    employees,
    joursFeries
  }
}