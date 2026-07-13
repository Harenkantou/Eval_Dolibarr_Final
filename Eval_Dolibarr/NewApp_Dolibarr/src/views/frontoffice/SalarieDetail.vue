<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEmployee, getEmployeeSalaries } from '@/api/dolibarr'
import { sumSalaries } from '@/services/salaryListService'
import { money, tsToFr, genderLabel, initials } from '@/services/formatService'

const route  = useRoute()
const router = useRouter()
const userId = route.params.id

const employee = ref(null)
const salaries = ref([])
const loading  = ref(false)
const error    = ref('')

const totals = computed(() => sumSalaries(salaries.value))

async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal] = await Promise.all([
      getEmployee(userId),
      getEmployeeSalaries(userId)
    ])
    employee.value = emp
    salaries.value = sal.sort((a, b) => (b.datesp || 0) - (a.datesp || 0))
  } catch (e) {
    error.value = 'Erreur chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries-all' })
}

function goToPay() {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

onMounted(loadData)
</script>

<template>
  <div class="page page-md salarie-detail">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour à la liste</button>
      <h1>Fiche salarié</h1>
      <button @click="loadData" :disabled="loading" class="btn-refresh">
        {{ loading ? '⏳ Chargement…' : '🔄 Actualiser' }}
      </button>
      <button @click="goToPay" class="btn-pay-link">Créer / Payer un salaire →</button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="loading && !employee" class="loading">Chargement…</div>

    <div v-else-if="employee" class="content">
      <!-- ── Infos salarié ─────────────────────────────── -->
      <section class="card salarie-card top">
        <div class="avatar">{{ initials(employee.name) }}</div>
        <div class="info-grid">
          <div>
            <span class="label">Nom</span>
            <strong>{{ employee.name }}</strong>
          </div>
          <div>
            <span class="label">Référence</span>
            <strong>{{ employee.ref ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Identifiant</span>
            <strong>{{ employee.login || '-' }}</strong>
          </div>
          <div>
            <span class="label">Genre</span>
            <strong>{{ genderLabel(employee.gender) }}</strong>
          </div>
          <div>
            <span class="label">Poste</span>
            <strong>{{ employee.job || '-' }}</strong>
          </div>
          <div>
            <span class="label">Heures / semaine</span>
            <strong>{{ employee.hours ?? '-' }}</strong>
          </div>
        </div>
      </section>

      <!-- ── Récapitulatif financier ─────────────────────── -->
      <section class="card">
        <h2>Récapitulatif</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total dû</span>
            <strong>{{ money(totals.due) }}</strong>
          </div>
          <div class="summary-item">
            <span class="label">Total payé</span>
            <strong class="paid">{{ money(totals.paid) }}</strong>
          </div>
          <div class="summary-item highlight">
            <span class="label">Reste à payer</span>
            <strong :class="totals.rest > 0 ? 'due' : 'ok'">
              {{ money(totals.rest) }}
            </strong>
          </div>
          <div class="summary-item">
            <span class="label">Nombre de salaires</span>
            <strong>{{ salaries.length }}</strong>
          </div>
        </div>
      </section>

      <!-- ── Historique salaires + paiements ─────────────── -->
      <section class="card">
        <h2>Historique des salaires et paiements</h2>

        <div v-if="salaries.length === 0" class="empty">
          Aucun salaire enregistré pour ce salarié.
        </div>

        <div v-for="s in salaries" :key="s.id" class="salary-block">
          <div class="salary-head">
            <div>
              <strong>Du {{ tsToFr(s.datesp) }} au {{ tsToFr(s.dateep) }}</strong>
              <span :class="['badge', s.solde ? 'ok' : 'pending']">
                {{ s.solde ? 'Soldé' : 'En cours' }}
              </span>
            </div>
            <div class="salary-amounts">
              Payé <strong>{{ money(s.totalPaye) }}</strong>
              / {{ money(s.amount) }}
              · Reste <strong :class="s.reste > 0 ? 'due' : 'ok'">{{ money(s.reste) }}</strong>
            </div>
          </div>

          <table v-if="s.payments.length" class="payments-table">
            <thead>
              <tr>
                <th>Date de règlement</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in s.payments" :key="i">
                <td>{{ p.date }}</td>
                <td class="amount">{{ money(p.amount) }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="no-payments">Aucun règlement pour l'instant.</p>
        </div>
      </section>
    </div>
  </div>
</template>
