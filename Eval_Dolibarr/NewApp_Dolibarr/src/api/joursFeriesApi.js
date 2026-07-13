// src/services/api/joursFeriesApi.js
// ─────────────────────────────────────────────────────────────
// Client Axios pour l'API SpringBoot (SQLite).
// Base séparée du client Dolibarr : pas de header DOLAPIKEY,
// autre baseURL (localhost:8081).
// ─────────────────────────────────────────────────────────────
import axios from 'axios'

const springApi = axios.create({
  baseURL: import.meta.env.VITE_SPRING_API_URL || 'http://localhost:8081/api',
  headers: { 'Content-Type': 'application/json' }
})

// ═════════════════════════════════════════════════════════════
// CRUD Jours Fériés
// ═════════════════════════════════════════════════════════════

const BASE = '/jours-feries'

/** GET /api/jours-feries → tous les jours fériés */
export const listJoursFeries = async () => {
  const { data } = await springApi.get(BASE)
  return data
}

/** GET /api/jours-feries/{id} → un jour férié */
export const getJourFerie = async (id) => {
  const { data } = await springApi.get(`${BASE}/${id}`)
  return data
}

/**
 * POST /api/jours-feries → créer
 * @param {{ libelle:string, dateFerie:string, recurrent:boolean }} payload
 *        dateFerie au format "YYYY-MM-DD"
 */
export const createJourFerie = async (payload) => {
  const { data } = await springApi.post(BASE, payload)
  return data
}

/** PUT /api/jours-feries/{id} → mettre à jour */
export const updateJourFerie = async (id, payload) => {
  const { data } = await springApi.put(`${BASE}/${id}`, payload)
  return data
}

/** DELETE /api/jours-feries/{id} → supprimer */
export const deleteJourFerie = async (id) => {
  await springApi.delete(`${BASE}/${id}`)
}

/** DELETE /api/jours-feries → supprimer TOUS les jours fériés */
export const deleteAllJoursFeries = async () => {
  await springApi.delete(BASE)
}

export default springApi