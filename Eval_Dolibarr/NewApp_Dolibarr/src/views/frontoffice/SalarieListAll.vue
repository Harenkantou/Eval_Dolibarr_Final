<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees } from '@/api/dolibarr'
import { genderLabel } from '@/services/formatService'

const router = useRouter()
const employees = ref([])
const loading   = ref(false)
const error     = ref('')

async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    employees.value = await getEmployees()
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

function goToDetail(id) {
  router.push({ name: 'frontoffice-salarie-detail', params: { id } })
}

function goHome() {
  router.push({ name: 'frontoffice-home' })
}

onMounted(loadData)
</script>

<template>
  <div class="page salarie-list-all">
    <header class="page-header">
      <button @click="goHome" class="btn-back">← Accueil</button>
      <h1>Liste complète des salariés</h1>
      <button @click="loadData" :disabled="loading" class="btn-refresh">
        {{ loading ? 'Chargement…' : 'Actualiser' }}
      </button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>

    <div v-if="loading && employees.length === 0" class="loading">Chargement…</div>

    <div v-else-if="employees.length" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Nom</th>
            <th>Identifiant</th>
            <th>Genre</th>
            <th>Poste</th>
            <th>Heures/sem.</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in employees" :key="e.id">
            <td>{{ e.ref ?? '-' }}</td>
            <td class="name-cell">{{ e.name }}</td>
            <td>{{ e.login || '-' }}</td>
            <td>{{ genderLabel(e.gender) }}</td>
            <td>{{ e.job || '-' }}</td>
            <td>{{ e.hours ?? '-' }}</td>
            <td>
              <button @click="goToDetail(e.id)" class="btn-detail">
                Voir la fiche →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty">Aucun salarié trouvé.</div>

    <div v-if="employees.length" class="footer-stats">
      {{ employees.length }} salarié(s) au total
    </div>
  </div>
</template>
