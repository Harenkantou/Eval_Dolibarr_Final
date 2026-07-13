import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Authentification du BackOffice — 100% frontend.
 * Code unique en dur, pré-rempli dans le formulaire (énoncé 1.a).
 * L'état "connecté" est persisté (localStorage via plugin) pour survivre au refresh.
 *
 * NB : protection "légère" côté client (le code est dans le bundle).
 * Suffisant pour l'usage demandé (pas de login, simple code d'accès).
 */
export const DEFAULT_CODE = 'admin'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)

  const isAuthenticated = computed(() => authenticated.value)

  /** Code par défaut à pré-remplir dans le formulaire. */
  function getDefaultCode() {
    return DEFAULT_CODE
  }

  /** Vérifie le code. Retourne true si OK. */
  function login(code) {
    if (code === DEFAULT_CODE) {
      authenticated.value = true
      return true
    }
    return false
  }

  function logout() {
    authenticated.value = false
  }

  return { authenticated, isAuthenticated, getDefaultCode, login, logout }
})