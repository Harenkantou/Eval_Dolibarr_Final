<!-- src/views/backoffice/ImportView.vue -->
<template>
  <div class="page page-sm">
    <h1>📂 Import de Fichiers</h1>

    <!-- ── Formulaire ─────────────────────────────────────── -->
    <div class="card">

      <!-- Fichier Employés -->
      <div class="field">
        <label>👥 Fichier Employés <span class="required">*</span></label>
        <input
          type="file"
          accept=".csv"
          @change="e => files.employees = e.target.files[0]"
        />
        <span class="hint" v-if="files.employees">
          ✅ {{ files.employees.name }}
        </span>
      </div>

      <!-- Fichier Salaires -->
      <div class="field">
        <label>💰 Fichier Salaires <span class="required">*</span></label>
        <input
          type="file"
          accept=".csv"
          @change="e => files.salaries = e.target.files[0]"
        />
        <span class="hint" v-if="files.salaries">
          ✅ {{ files.salaries.name }}
        </span>
      </div>

      <!-- Fichier ZIP Images -->
      <div class="field">
        <label>🖼️ Images ZIP <span class="optional">(optionnel)</span></label>
        <input
          type="file"
          accept=".zip"
          @change="e => files.images = e.target.files[0]"
        />
        <span class="hint" v-if="files.images">
          ✅ {{ files.images.name }}
        </span>
      </div>

      <!-- Bouton unique -->
      <button
        class="btn-primary btn-block"
        :disabled="!canImport || loading"
        @click="handleImport"
      >
        {{ loading ? '⏳ Import en cours...' : '🚀 Lancer l\'import' }}
      </button>

    </div>

    <!-- ── Barre de progression ───────────────────────────── -->
    <div v-if="loading" class="card">

      <p class="step-label">{{ stepLabel }}</p>

      <div class="progress-track">
        <div
          class="progress-bar"
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
        {{ result.success ? '✅ Import réussi' : '❌ Import échoué' }}
      </p>

      <ul v-if="result.success">
        <li>👥 Employés créés : <strong>{{ result.users }}</strong></li>
        <li>💰 Salaires créés : <strong>{{ result.salaries }}</strong></li>
        <li v-if="result.documents !== undefined">
          🖼️ Images importées : <strong>{{ result.documents }}</strong>
        </li>
      </ul>

      <p v-else class="error-msg">{{ result.error }}</p>

      <p v-if="result.rolledBack" class="rollback-msg">
        ⚠️ Rollback effectué —
        {{ result.rolledBack.users }} employé(s) et
        {{ result.rolledBack.salaries }} salaire(s) supprimés.
      </p>
    </div>

  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { importAll }               from '@/services/importService'

// ── État ──────────────────────────────────────────────────────
const files   = reactive({ employees: null, salaries: null, images: null })
const loading = ref(false)
const result  = ref(null)

const progress = reactive({ current: 0, total: 0, step: '' })

// ── Bouton actif seulement si les 2 CSV sont sélectionnés ────
const canImport = computed(() => files.employees && files.salaries)

// ── Pourcentage de progression ────────────────────────────────
const progressPct = computed(() =>
  progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0
)

// ── Label de l'étape en cours ─────────────────────────────────
const stepLabel = computed(() => {
  const labels = {
    employees: '👥 Import des employés...',
    salaries : '💰 Import des salaires...',
    images   : '🖼️ Import des images...'
  }
  return labels[progress.step] || '⏳ Initialisation...'
})

// ── Callback de progression ───────────────────────────────────
const onProgress = ({ step, current, total }) => {
  progress.step    = step
  progress.current = current
  progress.total   = total
}

// ── Handler unique ────────────────────────────────────────────
const handleImport = async () => {
  if (!confirm('Lancer l\'import des fichiers sélectionnés ?')) return

  loading.value    = true
  result.value     = null
  progress.current = 0
  progress.total   = 0
  progress.step    = ''

  result.value = await importAll(
    files.employees,
    files.salaries,
    files.images || null,
    onProgress
  )

  loading.value = false
}
</script>
