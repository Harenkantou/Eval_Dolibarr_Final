<!-- src/views/backoffice/ResetView.vue -->
<template>
  <div class="page page-sm">
    <h1>🔄 Réinitialisation</h1>

    <!-- ── Avertissement ──────────────────────────────────── -->
    <div class="warning">
      ⚠️ Cette action supprime les données dans Dolibarr. Irréversible.
    </div>

    <!-- ── Sélecteur de type ─────────────────────────────── -->
    <div class="card">

      <div class="field">
        <label>Que voulez-vous réinitialiser ?</label>
        <select v-model="resetType" :disabled="loading">
          <option value="all">💣 Toutes les données </option>
          <option value="salaries">💰 Salaires uniquement</option>
          <option value="employees">👥 Employés uniquement</option>
          <option value="joursFeries"> Jours Fériés uniquement</option>
        </select>
      </div>

      <!-- Bouton unique -->
      <button
        class="btn-danger btn-block"
        :disabled="loading"
        @click="handleReset"
      >
        {{ loading ? '⏳ Suppression en cours...' : '🗑️ Réinitialiser' }}
      </button>

    </div>

    <!-- ── Barre de progression ───────────────────────────── -->
    <div v-if="loading" class="card">

      <p class="step-label">{{ stepLabel }}</p>

      <div class="progress-track">
        <div
          class="progress-bar danger"
          :style="{ width: progressPct + '%' }"
        ></div>
      </div>

      <p class="progress-text">
        {{ progress.current }} / {{ progress.total }}
        ({{ progressPct }}%)
      </p>

    </div>

    <!-- ── Résultat ───────────────────────────────────────── -->
    <div
      v-if="result"
      class="card result"
      :class="result.success ? 'result-ok' : 'result-err'"
    >
      <p class="result-title">
        {{ result.success ? '✅ Réinitialisation réussie' : '⚠️ Terminé avec erreurs' }}
      </p>

      <!-- Résultat reset ALL -->
      <ul v-if="result.salaries && result.employees">
        <li>
          💰 Salaires supprimés :
          <strong>{{ result.salaries.deleted }}</strong>
          <span v-if="result.salaries.errors > 0" class="err-count">
            ({{ result.salaries.errors }} erreur(s))
          </span>
        </li>
        <li>
          👥 Employés supprimés :
          <strong>{{ result.employees.deleted }}</strong>
          <span v-if="result.employees.errors > 0" class="err-count">
            ({{ result.employees.errors }} erreur(s))
          </span>
        </li>
        <li v-if="result.joursFeries">
        📅 Jours fériés supprimés :
        <strong>{{ result.joursFeries.deleted }}</strong>
        <span v-if="result.joursFeries.errors > 0" class="err-count">
          ({{ result.joursFeries.errors }} erreur(s))
        </span>
        </li>
      </ul>

      <!-- Résultat reset partiel -->
      <ul v-else>
        <li>
          Éléments supprimés : <strong>{{ result.deleted }}</strong>
          <span v-if="result.errors > 0" class="err-count">
            ({{ result.errors }} erreur(s))
          </span>
        </li>
      </ul>

      <p v-if="result.error" class="error-msg">{{ result.error }}</p>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import {
  resetAll,
  resetSalaries,
  resetEmployees,
  resetJoursFeries
} from '@/services/resetService'

// ── État ──────────────────────────────────────────────────────
const resetType = ref('all')
const loading   = ref(false)
const result    = ref(null)

const progress = reactive({ current: 0, total: 0, step: '' })

// ── Labels ────────────────────────────────────────────────────
const typeLabels = {
  all      : 'toutes les données',
  salaries : 'les salaires',
  employees: 'les employés',
  joursFeries: 'les jours fériés'
}

// ── Pourcentage ───────────────────────────────────────────────
const progressPct = computed(() =>
  progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0
)

// ── Label étape ───────────────────────────────────────────────
const stepLabel = computed(() => {
  const labels = {
    salaries : '💰 Suppression des salaires...',
    employees: '👥 Suppression des employés...',
    documents  : '🖼️ Suppression des images...',
    joursFeries: '📅 Suppression des jours fériés...'
  }
  return labels[progress.step] || '⏳ Initialisation...'
})

// ── Callback de progression ───────────────────────────────────
const onProgress = ({ step, current, total }) => {
  progress.step    = step    || resetType.value
  progress.current = current
  progress.total   = total
}

// ── Handler unique ────────────────────────────────────────────
const handleReset = async () => {
  const label = typeLabels[resetType.value]
  if (!confirm(`Réinitialiser ${label} ? Cette action est irréversible.`)) return

  loading.value    = true
  result.value     = null
  progress.current = 0
  progress.total   = 0
  progress.step    = ''

  try {
    if (resetType.value === 'all') {
      result.value = await resetAll(onProgress)
    } else if (resetType.value === 'salaries') {
      result.value = await resetSalaries(onProgress)
    } else if (resetType.value === 'joursFeries') {
      result.value = await resetJoursFeries(onProgress)
    } else {
      result.value = await resetEmployees(onProgress)
    }
  } catch (err) {
    result.value = { success: false, error: err.message }
  } finally {
    loading.value = false
  }
}
</script>
