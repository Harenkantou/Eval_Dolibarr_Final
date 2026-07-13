<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries } from '@/api/dolibarr'
import { buildEmployeeStats, filterEmployeeRows } from '@/services/salaryListService'
import { money, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref(null)

// ── Recherche multi-critères ──────────────────────────────────
const filters = ref({
  search: '',   // nom / login / référence
  gender: '',   // '', 'man', 'woman'
  status: ''    // '', 'solde', 'encours'
})

// ── Vues dérivées (logique dans salaryListService) ────────────
const rows         = computed(() => buildEmployeeStats(employees.value, salaries.value))
const filteredRows = computed(() => filterEmployeeRows(rows.value, filters.value))

async function loadData() {
  loading.value = true
  error.value   = null
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value  = sal
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

function clearFilters() {
  filters.value = { search: '', gender: '', status: '' }
}

onMounted(loadData)
</script>

<template>
  <div class="page salarie-list">
    <header class="page-header">
      <h1>Liste des Salariés</h1>
      <div class="header-actions">
        <button @click="router.push({ name: 'frontoffice-home' })" class="btn-clear">← Accueil</button>
        <button @click="loadData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Chargement…' : 'Actualiser' }}
        </button>
      </div>
    </header>

    <!-- Recherche multi-critères -->
    <div class="filters">
      <div class="filter-group">
        <label for="search">Recherche</label>
        <input
          id="search"
          type="text"
          v-model="filters.search"
          placeholder="Nom, identifiant, référence…"
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label for="gender">Genre</label>
        <select id="gender" v-model="filters.gender" class="filter-select">
          <option value="">Tous</option>
          <option value="man">Homme</option>
          <option value="woman">Femme</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="status">Statut paiement</label>
        <select id="status" v-model="filters.status" class="filter-select">
          <option value="">Tous</option>
          <option value="solde">Soldé</option>
          <option value="encours">En cours</option>
        </select>
      </div>

      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Chargement des salariés…</div>

    <div v-else-if="filteredRows.length" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Nom</th>
            <th>Identifiant</th>
            <th>Genre</th>
            <th>Salaires</th>
            <th>Total dû</th>
            <th>Total payé</th>
            <th>Reste</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRows" :key="r.id">
            <td>{{ r.ref ?? '-' }}</td>
            <td class="name-cell">{{ r.name }}</td>
            <td>{{ r.login || '-' }}</td>
            <td>{{ genderLabel(r.gender) }}</td>
            <td>{{ r.stats.count }}</td>
            <td>{{ money(r.stats.due) }}</td>
            <td>{{ money(r.stats.paid) }}</td>
            <td>
              <span :class="['status-badge', r.stats.count === 0 ? 'inactive' : (r.stats.solde ? 'active' : 'pending')]">
                {{ r.stats.count === 0 ? 'Aucun' : (r.stats.solde ? 'Soldé' : money(r.stats.rest)) }}
              </span>
            </td>
            <td>
              <button @click="goToPay(r.id)" class="btn-pay">Créer / Payer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="no-results">
      <p v-if="employees.length">Aucun salarié ne correspond aux critères.</p>
      <p v-else>Aucun salarié trouvé.</p>
    </div>

    <div v-if="employees.length" class="stats">
      <span>{{ filteredRows.length }} salarié(s) affiché(s) sur {{ employees.length }}</span>
    </div>
  </div>
</template>
