<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getEmployee,
  getEmployeeSalaries,
  createSalary,
  addPayment
} from '@/api/dolibarr'
import { sumSalaries } from '@/services/salaryListService'
import { money, genderLabel, initials } from '@/services/formatService'

const route  = useRoute()
const router = useRouter()
const userId = route.params.id

const employee = ref(null)
const salaries = ref([])
const loading  = ref(false)
const error    = ref('')
const success  = ref('')

const today = new Date().toISOString().split('T')[0]

// ── Formulaire : création d'un salaire ────────────────────────
const salaryForm = ref({
  amount   : '',
  dateStart: today,
  dateEnd  : today
})

// ── État des mini-formulaires de paiement (un par salaire) ────
// payForms[salaryId] = { date, amount }
const payForms = ref({})

// ── Totaux du salarié ─────────────────────────────────────────
const totals = computed(() => sumSalaries(salaries.value))

// ── Chargement ────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal] = await Promise.all([
      getEmployee(userId),
      getEmployeeSalaries(userId)
    ])
    employee.value = emp
    salaries.value = sal
    // init des mini-formulaires
    const forms = {}
    for (const s of sal) forms[s.id] = { date: today, amount: '' }
    payForms.value = forms
  } catch (e) {
    error.value = 'Erreur lors du chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

// ── Créer un salaire ──────────────────────────────────────────
async function handleCreateSalary() {
  error.value = ''; success.value = ''
  const amount = parseFloat(salaryForm.value.amount)

  if (!amount || amount <= 0) { error.value = 'Montant du salaire invalide.'; return }
  if (salaryForm.value.dateEnd < salaryForm.value.dateStart) {
    error.value = 'La date de fin doit être postérieure à la date de début.'; return
  }

  loading.value = true
  try {
    await createSalary({
      fk_user  : parseInt(userId),
      amount,
      dateStart: salaryForm.value.dateStart,
      dateEnd  : salaryForm.value.dateEnd
    })
    success.value = `Salaire de ${money(amount)} créé.`
    salaryForm.value.amount = ''
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors de la création : ' + (e.response?.data?.error?.message || e.message)
  } finally {
    loading.value = false
  }
}

// ── Ajouter un paiement (paiement en plusieurs fois) ──────────
async function handlePay(salary) {
  error.value = ''; success.value = ''
  const form   = payForms.value[salary.id]
  const amount = parseFloat(form.amount)

  if (!amount || amount <= 0) { error.value = 'Montant du paiement invalide.'; return }
  if (amount > salary.reste + 0.001) {
    error.value = `Le paiement dépasse le reste dû (${money(salary.reste)}).`; return
  }

  loading.value = true
  try {
    await addPayment(salary.id, { date: form.date, amount })
    success.value = `Paiement de ${money(amount)} enregistré.`
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors du paiement : ' + (e.response?.data?.error?.message || e.message)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries' })
}

onMounted(loadData)
</script>

<template>
  <div class="page page-md salarie-pay">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Créer / Payer un salaire</h1>
    </header>

    <div v-if="loading && !employee" class="loading">Chargement…</div>

    <div v-else class="content">
      <!-- Infos salarié -->
      <div class="card salarie-card">
        <div class="salarie-avatar">{{ initials(employee?.name) }}</div>
        <div class="salarie-info">
          <h2>{{ employee?.name }}</h2>
          <p class="job">Réf. {{ employee?.ref ?? '-' }} · {{ genderLabel(employee?.gender) }}</p>
          <p class="email">Identifiant : {{ employee?.login || '-' }}</p>
        </div>
      </div>

      <!-- Récapitulatif -->
      <div class="payment-summary">
        <h3>Récapitulatif</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total dû</span>
            <span class="value">{{ money(totals.due) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total payé</span>
            <span class="value">{{ money(totals.paid) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Reste à payer</span>
            <span class="value">{{ money(totals.rest) }}</span>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>

      <!-- Créer un salaire -->
      <div class="payment-form-card">
        <h3>Créer un salaire</h3>
        <form @submit.prevent="handleCreateSalary" class="payment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="amount">Montant (€)</label>
              <input id="amount" type="number" step="0.01" min="0.01"
                     v-model="salaryForm.amount" placeholder="0.00" required />
            </div>
            <div class="form-group">
              <label for="ds">Début de période</label>
              <input id="ds" type="date" v-model="salaryForm.dateStart" required />
            </div>
            <div class="form-group">
              <label for="de">Fin de période</label>
              <input id="de" type="date" v-model="salaryForm.dateEnd" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="loading" class="btn-submit">
              {{ loading ? 'Enregistrement…' : 'Créer le salaire' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Salaires existants + paiements -->
      <div class="payments-history">
        <h3>Salaires du salarié</h3>

        <div v-if="salaries.length === 0" class="no-payments">
          Aucun salaire pour ce salarié. Créez-en un ci-dessus.
        </div>

        <div v-for="s in salaries" :key="s.id" class="salary-block">
          <div class="salary-head">
            <div>
              <strong>{{ s.baseLabel || ('Salaire #' + s.id) }}</strong>
              <span :class="['status-badge', s.solde ? 'active' : 'pending']">
                {{ s.solde ? 'Soldé' : 'En cours' }}
              </span>
            </div>
            <div class="salary-amounts">
              Payé {{ money(s.totalPaye) }} / {{ money(s.amount) }}
              · Reste <strong>{{ money(s.reste) }}</strong>
            </div>
          </div>

          <!-- Historique des paiements de ce salaire -->
          <table v-if="s.payments.length" class="payments-table">
            <thead>
              <tr><th>Date de règlement</th><th>Montant</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in s.payments" :key="i">
                <td>{{ p.date }}</td>
                <td class="amount">{{ money(p.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="no-payments small">Aucun règlement pour l'instant.</p>

          <!-- Mini-formulaire : ajouter un paiement -->
          <form v-if="!s.solde && payForms[s.id]"
                @submit.prevent="handlePay(s)" class="pay-inline">
            <input type="date" v-model="payForms[s.id].date" required />
            <input type="number" step="0.01" min="0.01" :max="s.reste"
                   v-model="payForms[s.id].amount" placeholder="Montant à payer" required />
            <button type="submit" :disabled="loading" class="btn-pay">Payer</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
