<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries } from '@/api/dolibarr'
import { groupSalariesByEmployee, filterGroups, sumGroups } from '@/services/salaryListService'
import { money, tsToFr, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')

// ── Filtres ───────────────────────────────────────────────────
const filters = ref({
  search: '',   // nom / référence salarié
  status: ''    // '', 'solde', 'encours'
})

// ── Vues dérivées (logique dans salaryListService) ────────────
const groups         = computed(() => groupSalariesByEmployee(employees.value, salaries.value))
const filteredGroups = computed(() => filterGroups(groups.value, filters.value))
const grandTotal     = computed(() => sumGroups(filteredGroups.value))

async function loadData() {
  loading.value = true
  error.value   = ''
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

function clearFilters() {
  filters.value = { search: '', status: '' }
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

onMounted(loadData)
</script>

<template>
  <div class="page salaire-lignes">
    <header class="page-header">
      <h1>Salaires &amp; historique</h1>
      <div class="header-actions">
        <button @click="router.push({ name: 'frontoffice-home' })" class="btn-clear">← Accueil</button>
        <button @click="loadData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Chargement…' : 'Actualiser' }}
        </button>
      </div>
    </header>

    <!-- Filtres -->
    <div class="filters">
      <div class="filter-group">
        <label for="search">Recherche</label>
        <input id="search" type="text" v-model="filters.search"
               placeholder="Nom ou référence salarié…" class="filter-input" />
      </div>
      <div class="filter-group">
        <label for="status">Statut</label>
        <select id="status" v-model="filters.status" class="filter-select">
          <option value="">Tous</option>
          <option value="solde">Soldé</option>
          <option value="encours">En cours</option>
        </select>
      </div>
      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>

      <div class="grand-total" v-if="filteredGroups.length">
        {{ grandTotal.count }} salaire(s) · Dû {{ money(grandTotal.due) }}
        · Payé {{ money(grandTotal.paid) }} · Reste <strong>{{ money(grandTotal.rest) }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading && salaries.length === 0" class="loading">Chargement des salaires…</div>

    <div v-else-if="filteredGroups.length" class="groups">
      <section v-for="g in filteredGroups" :key="g.id" class="group-card">
        <!-- En-tête salarié -->
        <div class="group-head">
          <div class="who">
            <strong>{{ g.name }}</strong>
            <span class="muted">Réf. {{ g.ref ?? '-' }} · {{ genderLabel(g.gender) }} · {{ g.job || '—' }}</span>
          </div>
          <div class="group-totals">
            <span>{{ g.count }} salaire(s)</span>
            <span>Dû {{ money(g.due) }}</span>
            <span>Payé {{ money(g.paid) }}</span>
            <span :class="['status-badge', g.solde ? 'active' : 'pending']">
              {{ g.solde ? 'Soldé' : 'Reste ' + money(g.rest) }}
            </span>
            <button @click="goToPay(g.id)" class="btn-pay">Créer / Payer</button>
          </div>
        </div>

        <!-- Historique des salaires -->
        <table class="data-table">
          <thead>
            <tr>
              <th>Période</th>
              <th>Montant</th>
              <th>Payé</th>
              <th>Reste</th>
              <th>Règlements</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in g.lines" :key="s.id">
              <td class="name-cell">Du {{ tsToFr(s.datesp) }} au {{ tsToFr(s.dateep) }}</td>
              <td>{{ money(s.amount) }}</td>
              <td>{{ money(s.totalPaye) }}</td>
              <td>{{ money(s.reste) }}</td>
              <td>
                <span v-if="s.payments.length">{{ s.payments.length }} règlement(s)</span>
                <span v-else class="muted">aucun</span>
              </td>
              <td>
                <span :class="['status-badge', s.solde ? 'active' : 'pending']">
                  {{ s.solde ? 'Soldé' : 'En cours' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <div v-else class="no-results">
      <p v-if="salaries.length">Aucun salaire ne correspond aux critères.</p>
      <p v-else>Aucun salaire trouvé.</p>
    </div>
  </div>
</template>
