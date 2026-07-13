// src/stores/joursFeries.js
// ─────────────────────────────────────────────────────────────
// Store Pinia pour les jours fériés (SpringBoot + SQLite).
// State + actions CRUD. Recharge la liste après chaque mutation
// pour rester simple et cohérent.
// ─────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import {
  listJoursFeries,
  createJourFerie,
  updateJourFerie,
  deleteJourFerie
} from '@/api/joursFeriesApi'

export const useJoursFeriesStore = defineStore('joursFeries', {
  state: () => ({
    list   : [],
    loading: false,
    error  : null
  }),

  getters: {
    sortedByDate: (state) =>
      [...state.list].sort((a, b) => a.dateFerie.localeCompare(b.dateFerie)),

    count: (state) => state.list.length
  },

  actions: {
    // ── Extraction propre du message d'erreur backend ────────
    _extractError(err) {
      return err.response?.data?.message
          || err.response?.data?.error
          || err.message
          || 'Erreur inconnue'
    },

    // ── Fetch all ────────────────────────────────────────────
    async fetchAll() {
      this.loading = true
      this.error   = null
      try {
        this.list = await listJoursFeries()
      } catch (err) {
        this.error = this._extractError(err)
      } finally {
        this.loading = false
      }
    },

    // ── Create ───────────────────────────────────────────────
    async create(payload) {
      this.loading = true
      this.error   = null
      try {
        await createJourFerie(payload)
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = this._extractError(err)
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Update ───────────────────────────────────────────────
    async update(id, payload) {
      this.loading = true
      this.error   = null
      try {
        await updateJourFerie(id, payload)
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = this._extractError(err)
        return false
      } finally {
        this.loading = false
      }
    },

    // ── Delete ───────────────────────────────────────────────
    async remove(id) {
      this.loading = true
      this.error   = null
      try {
        await deleteJourFerie(id)
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = this._extractError(err)
        return false
      } finally {
        this.loading = false
      }
    }
  }
})