<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, bulkCreateSalary } from '@/api/dolibarr'
import { distinctJobs, filterEmployees } from '@/services/employeeService'
import { money, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const loading   = ref(false)
const error     = ref('')
const success   = ref('')
const lastRun   = ref(null)   // résultat du dernier bulk

const today = new Date().toISOString().split('T')[0]

// ── Filtres ───────────────────────────────────────────────────
const filters = ref({
  job     : '',
  gender  : '',
  hoursMin: '',
  hoursMax: ''
})

// ── Formulaire génération ─────────────────────────────────────
const form = ref({
  amount   : '',
  dateStart: today,
  dateEnd  : today
})

// ── Sélection des salariés (logique dans employeeService) ─────
const jobs     = computed(() => distinctJobs(employees.value))
const filtered = computed(() => filterEmployees(employees.value, filters.value))

async function loadEmployees() {
  loading.value = true
  error.value   = ''
  try {
    employees.value = await getEmployees()
  } catch (e) {
    error.value = 'Erreur chargement salariés : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = { job: '', gender: '', hoursMin: '', hoursMax: '' }
}

async function handleGenerate() {
  error.value = ''; success.value = ''; lastRun.value = null

  const amount = parseFloat(form.value.amount)
  if (!amount || amount <= 0) { error.value = 'Montant invalide.'; return }
  if (form.value.dateEnd < form.value.dateStart) {
    error.value = 'La date de fin doit être postérieure à la date de début.'; return
  }
  if (filtered.value.length === 0) {
    error.value = 'Aucun salarié ne correspond aux filtres.'; return
  }

  const confirmed = confirm(
    `Générer un salaire de ${money(amount)} pour ${filtered.value.length} salarié(s) ?`
  )
  if (!confirmed) return

  loading.value = true
  try {
    const userIds = filtered.value.map(e => e.id)
    const results = await bulkCreateSalary(userIds, {
      amount,
      dateStart: form.value.dateStart,
      dateEnd  : form.value.dateEnd
    })

    const ok = results.filter(r => r.success).length
    const ko = results.filter(r => !r.success).length
    lastRun.value = { ok, ko, results }

    if (ko === 0) {
      success.value = `${ok} salaire(s) généré(s) avec succès.`
      form.value.amount = ''
    } else {
      error.value = `${ok} succès, ${ko} échec(s). Voir le détail ci-dessous.`
    }
  } catch (e) {
    error.value = 'Erreur globale : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

const nameOf = (userId) => {
  const e = employees.value.find(x => x.id === userId)
  return e?.name || `#${userId}`
}

function goBack() {
  router.push({ name: 'frontoffice-home' })
}

onMounted(loadEmployees)
</script>

<template>
  <div class="page page-lg salarie-generate">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Générer des salaires en masse</h1>
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

    <!-- ── Aperçu ────────────────────────────────────────── -->
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

    <!-- ── Formulaire génération ─────────────────────────── -->
    <section class="card">
      <h2>Paramètres du salaire à générer</h2>

      <form @submit.prevent="handleGenerate" class="gen-form">
        <div class="form-row">
          <div class="form-group">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0.01"
                   v-model="form.amount" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label>Date début</label>
            <input type="date" v-model="form.dateStart" required />
          </div>
          <div class="form-group">
            <label>Date fin</label>
            <input type="date" v-model="form.dateEnd" required />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit"
                  :disabled="loading || filtered.length === 0"
                  class="btn-generate">
            {{ loading ? 'Génération…' : `Générer ${filtered.length} salaire(s)` }}
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
              {{ nameOf(r.userId) }} → {{ r.error }}
            </li>
          </ul>
        </details>
      </div>
    </section>
  </div>
</template>
