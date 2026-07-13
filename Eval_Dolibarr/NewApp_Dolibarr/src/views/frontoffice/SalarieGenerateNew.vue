<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries, runSalaryGeneration } from '@/api/dolibarr'
import { listJoursFeries } from '@/api/joursFeriesApi'
import { buildPreview, previewTotal as sumPreview } from '@/services/salaryGenerationService'
import { distinctJobs, filterEmployees } from '@/services/employeeService'
import { money, pad, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees   = ref([])
const salaries    = ref([])
const joursFeries = ref([])
const loading     = ref(false)
const error       = ref('')
const success     = ref('')
const lastRun     = ref(null)

const now = new Date()

// ── Filtres ───────────────────────────────────────────────────
const filters = ref({
  job     : '',
  gender  : '',
  hoursMin: '',
  hoursMax: ''
})

// ── Formulaire génération ─────────────────────────────────────
const form = ref({
  month               : now.getMonth() + 1,
  year                : now.getFullYear(),
  dailyAmount         : '',
  majorationPct       : 50,
  includeSaturday     : false,
  includeSunday       : false,
  weekendMajorationPct: 100
})

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

// ── Sélection des salariés (logique dans employeeService) ─────
const jobs     = computed(() => distinctJobs(employees.value))
const filtered = computed(() => filterEmployees(employees.value, filters.value))

// ── Aperçu global (1 ligne = 1 intervalle = 1 montant) ────────
// Toute la logique métier vit dans salaryGenerationService.js.
const preview = computed(() =>
  buildPreview(filtered.value, salaries.value, {
    month               : form.value.month,
    year                : form.value.year,
    dailyAmount         : form.value.dailyAmount,
    majorationPct       : form.value.majorationPct,
    weekendMajorationPct: form.value.weekendMajorationPct,
    includeSaturday     : form.value.includeSaturday,
    includeSunday       : form.value.includeSunday,
    joursFeries         : joursFeries.value
  })
)

const previewTotal = computed(() => sumPreview(preview.value))

// ── Chargement ────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal, jf] = await Promise.all([
      getEmployees(), getSalaries(), listJoursFeries()
    ])
    employees.value   = emp
    salaries.value    = sal
    joursFeries.value = jf
  } catch (e) {
    error.value = 'Erreur chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = { job: '', gender: '', hoursMin: '', hoursMax: '' }
}

async function handleGenerate() {
  error.value = ''; success.value = ''; lastRun.value = null

  if (!form.value.dailyAmount || parseFloat(form.value.dailyAmount) <= 0) {
    error.value = 'Salaire journalier invalide.'; return
  }
  if (filtered.value.length === 0) {
    error.value = 'Aucun salarié ne correspond aux filtres.'; return
  }
  if (preview.value.length === 0) {
    error.value = 'Aucun intervalle libre à générer.'; return
  }

  const confirmed = confirm(
    `Générer ${preview.value.length} ligne(s) — total ${money(previewTotal.value)} ?`
  )
  if (!confirmed) return

  loading.value = true
  try {
    const run = await runSalaryGeneration(preview.value, {
      month: form.value.month,
      year : form.value.year
    })
    lastRun.value = run

    if (run.ko === 0) {
      success.value = `${run.ok} salaire(s) généré(s) avec succès.`
      form.value.dailyAmount = ''
    } else {
      error.value = `${run.ok} succès, ${run.ko} échec(s). Voir le détail ci-dessous.`
    }
    await loadAll()  // rafraîchir occupations
  } catch (e) {
    error.value = 'Erreur globale : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-home' })
}

onMounted(loadAll)
</script>

<template>
  <div class="page page-lg salarie-generate">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Générer par mois (avec jours fériés)</h1>
    </header>

    <!-- ── Filtres ───────────────────────────────────────── -->
    <section class="card">
      <h2>Filtres de sélection</h2>
      <div class="filter-grid">
        <div class="form-group">
          <label>Poste</label>
          <select v-model="filters.job">
            <option value="">Tous</option>
            <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Genre</label>
          <select v-model="filters.gender">
            <option value="">Tous</option>
            <option value="man">Homme</option>
            <option value="woman">Femme</option>
          </select>
        </div>

        <div class="form-group">
          <label>Heures min / semaine</label>
          <input type="number" min="0" v-model="filters.hoursMin" placeholder="Ex: 20" />
        </div>

        <div class="form-group">
          <label>Heures max / semaine</label>
          <input type="number" min="0" v-model="filters.hoursMax" placeholder="Ex: 40" />
        </div>

        <button @click="clearFilters" class="btn-clear">Réinitialiser</button>
      </div>
    </section>

    <!-- ── Aperçu salariés ──────────────────────────────── -->
    <section class="card">
      <div class="preview-header">
        <h2>Salariés sélectionnés</h2>
        <span class="counter">{{ filtered.length }} / {{ employees.length }}</span>
      </div>

      <div v-if="loading && employees.length === 0" class="loading">Chargement…</div>

      <table v-else-if="filtered.length" class="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Nom</th>
            <th>Poste</th>
            <th>Genre</th>
            <th>Heures/sem.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filtered" :key="e.id">
            <td>{{ e.ref ?? '-' }}</td>
            <td class="name-cell">{{ e.name }}</td>
            <td>{{ e.job || '-' }}</td>
            <td>{{ genderLabel(e.gender) }}</td>
            <td>{{ e.hours ?? '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun salarié ne correspond aux filtres.</div>
    </section>

    <!-- ── Paramètres génération ────────────────────────── -->
    <section class="card">
      <h2>Paramètres du salaire à générer</h2>

      <form @submit.prevent="handleGenerate" class="gen-form">
        <div class="form-row cols-4">
          <div class="form-group">
            <label>Mois</label>
            <select v-model.number="form.month" required>
              <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Année</label>
            <input type="number" min="2000" max="2100" v-model.number="form.year" required />
          </div>
          <div class="form-group">
            <label>Salaire / jour (€)</label>
            <input type="number" step="0.01" min="0.01"
                   v-model="form.dailyAmount" placeholder="Ex: 50" required />
          </div>
          <div class="form-group">
            <label>Majoration jour férié (%)</label>
            <input type="number" step="1" min="0" v-model.number="form.majorationPct" />
          </div>
        </div>

        <!-- ── Options week-end ───────────────────────────── -->
        <div class="weekend-row">
          <label class="check">
            <input type="checkbox" v-model="form.includeSaturday" />
            Inclure les samedis
          </label>
          <label class="check">
            <input type="checkbox" v-model="form.includeSunday" />
            Inclure les dimanches
          </label>
          <div class="form-group">
            <label>Majoration week-end (%)</label>
            <input type="number" step="1" min="0" max="200"
                   v-model.number="form.weekendMajorationPct"
                   :disabled="!form.includeSaturday && !form.includeSunday" />
          </div>
        </div>

        <!-- ── Aperçu des lignes à générer ────────────────── -->
        <div v-if="preview.length" class="run-result">
          <h3>Aperçu ({{ preview.length }} ligne(s) — total {{ money(previewTotal) }})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Salarié</th>
                <th>Intervalle</th>
                <th>Jours normaux</th>
                <th>Jours fériés</th>
                <th>Samedis</th>
                <th>Dimanches</th>
                <th>Maj. samedi</th>
                <th>Maj. dimanche</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in preview" :key="i">
                <td class="name-cell">{{ r.name }}</td>
                <td>{{ pad(r.start) }}/{{ pad(form.month) }} → {{ pad(r.end) }}/{{ pad(form.month) }}/{{ form.year }}</td>
                <td>{{ r.normal }}</td>
                <td>{{ r.ferie }}</td>
                <td>{{ r.samedi }}</td>
                <td>{{ r.dimanche }}</td>
                <td>{{ money(r.majSamedi) }}</td>
                <td>{{ money(r.majDimanche) }}</td>
                <td>{{ money(r.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="filtered.length" class="empty">
          Aucun intervalle libre à générer (tous les jours du mois sont déjà couverts).
        </div>

        <div class="form-actions">
          <button type="submit"
                  :disabled="loading || preview.length === 0"
                  class="btn-generate">
            {{ loading ? 'Génération…' : `Générer ${preview.length} ligne(s)` }}
          </button>
        </div>
      </form>

      <div v-if="error"   class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <!-- ── Résultat détaillé ────────────────────────────── -->
      <div v-if="lastRun" class="run-result">
        <h3>Résultat</h3>
        <p><strong>{{ lastRun.ok }}</strong> succès · <strong>{{ lastRun.ko }}</strong> échec(s)</p>
        <details v-if="lastRun.ko > 0">
          <summary>Voir les échecs</summary>
          <ul>
            <li v-for="(r, i) in lastRun.results.filter(x => !x.success)" :key="i">
              {{ r.name }} ({{ pad(r.start) }} → {{ pad(r.end) }}) : {{ r.error }}
            </li>
          </ul>
        </details>
      </div>
    </section>
  </div>
</template>
