<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries, runPaymentPlan } from '@/api/dolibarr'
import { buildDispatchPlan, buildRecap } from '@/services/paymentDispatcherService'
import { distinctJobs } from '@/services/employeeService'
import { money, tsToFr } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')
const success   = ref('')
const lastRun   = ref(null)

const now   = new Date()
const today = now.toISOString().split('T')[0]

// ── Critères + montant à répartir ─────────────────────────────
const form = ref({
  amount     : '',
  month      : now.getMonth() + 1,
  year       : now.getFullYear(),
  priorityJob: ''
})

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

// ── Vues dérivées (toute la logique vit dans les services) ────
const jobs         = computed(() => distinctJobs(employees.value))
const recap        = computed(() => buildRecap(lastRun.value?.results))
const dispatchPlan = computed(() => {
  const budget = parseFloat(form.value.amount) || 0
  if (budget <= 0) return { plan: [], totalPaid: 0, unusedBudget: 0 }
  return buildDispatchPlan({
    budget,
    month      : form.value.month,
    year       : form.value.year,
    priorityJob: form.value.priorityJob,
    salaries   : salaries.value,
    employees  : employees.value
  })
})

async function loadAll() {
  loading.value = true; error.value = ''
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value  = sal
  } catch (e) {
    error.value = 'Erreur chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

// ── Payer : délègue l'exécution du plan au service API ────────
async function handlePay() {
  error.value = ''; success.value = ''; lastRun.value = null

  const budget = parseFloat(form.value.amount) || 0
  if (budget <= 0) { error.value = 'Montant invalide.'; return }
  if (dispatchPlan.value.plan.length === 0) {
    error.value = 'Aucun salaire à payer avec ces critères.'; return
  }

  const nb   = dispatchPlan.value.plan.length
  const paid = dispatchPlan.value.totalPaid
  if (!confirm(`Répartir ${money(paid)} sur ${nb} salaire(s) ?`)) return

  loading.value = true
  try {
    const run = await runPaymentPlan(dispatchPlan.value.plan, { date: today })
    lastRun.value = run

    if (run.ko === 0) {
      success.value = `${money(run.paidOk)} payés sur ${run.ok} salaire(s).`
      form.value.amount = ''
    } else {
      error.value = `${run.ok} succès, ${run.ko} échec(s).`
    }
    await loadAll()
  } catch (e) {
    error.value = 'Erreur globale : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries' })
}

onMounted(loadAll)
</script>

<template>
  <div class="page payment-generate">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Générer un ordre de paiement</h1>
    </header>

    <!-- ── Filtres + Priorité ─────────────────────────── -->
    <section class="card">
      <h2>Critères</h2>
      <div class="form-row">
        <div class="form-group">
          <label>Mois</label>
          <select v-model.number="form.month">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Année</label>
          <input type="number" min="2000" max="2100" v-model.number="form.year" />
        </div>

        <div class="form-group">
          <label>Poste prioritaire</label>
          <select v-model="form.priorityJob">
            <option value="">Aucun</option>
            <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- ── Montant ────────────────────────────────────── -->
    <section class="card">
      <h2>Montant à répartir</h2>
      <div class="form-group">
        <label>Montant (€)</label>
        <input type="number" step="0.01" min="0.01"
               v-model="form.amount" placeholder="Ex: 1500" />
      </div>
    </section>

    <!-- ── Aperçu de l'ordre de paiement ─────────────── -->
    <section v-if="dispatchPlan.plan.length" class="card">
      <h2>
        Ordre de paiement — {{ dispatchPlan.plan.length }} salaire(s),
        total {{ money(dispatchPlan.totalPaid) }}
        <span v-if="dispatchPlan.unusedBudget > 0">
          (reste non utilisé : {{ money(dispatchPlan.unusedBudget) }})
        </span>
      </h2>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Salarié</th>
              <th>Poste</th>
              <th>Période salaire</th>
              <th class="align-right">Reste avant</th>
              <th class="align-right">À payer</th>
              <th class="align-right">Reste après</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, i) in dispatchPlan.plan" :key="line.salaryId"
                :class="{ 'row-unfunded': !line.funded }">
              <td>{{ i + 1 }}</td>
              <td class="name-cell">{{ line.name }}</td>
              <td>{{ line.job || '-' }}</td>
              <td>{{ tsToFr(line.datesp) }} → {{ tsToFr(line.dateep) }}</td>
              <td class="align-right">{{ money(line.resteBefore) }}</td>
              <td class="align-right"><strong>{{ money(line.payment) }}</strong></td>
              <td class="align-right">{{ money(line.resteAfter) }}</td>
              <td>
                <span v-if="!line.funded" class="status-badge inactive">Non financé</span>
                <span v-else-if="line.partial" class="status-badge pending">Partiel</span>
                <span v-else class="status-badge active">Soldé</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="form.amount" class="no-results">
      Aucun salaire ne correspond aux critères ou tout est déjà payé.
    </section>

    <!-- ── Bouton Payer ───────────────────────────────── -->
    <div class="form-actions">
      <button @click="handlePay"
              class="btn-generate"
              :disabled="loading || dispatchPlan.plan.length === 0">
        {{ loading ? 'Paiement en cours…' : `Payer ${money(dispatchPlan.totalPaid)}` }}
      </button>
    </div>

    <div v-if="error"   class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">{{ success }}</div>

    <!-- ── Résultat détaillé ──────────────────────────── -->
    <section v-if="lastRun" class="run-result">
      <h3>Résultat</h3>
      <p>
        <strong>{{ lastRun.ok }}</strong> paiement(s) réussi(s) —
        total effectivement payé : <strong>{{ money(lastRun.paidOk) }}</strong>
        <span v-if="lastRun.ko"> · {{ lastRun.ko }} échec(s)</span>
      </p>
      <details v-if="lastRun.ko > 0">
        <summary>Voir les échecs</summary>
        <ul>
          <li v-for="(r, i) in lastRun.results.filter(x => !x.success)" :key="i">
            {{ r.name }} — {{ money(r.payment) }} : {{ r.error }}
          </li>
        </ul>
      </details>
    </section>

    <!-- ── Récapitulatif par employé concerné ────────── -->
    <section v-if="recap.length" class="card recap">
      <h3>Employé(s) concerné(s)</h3>
      <div class="recap-grid">
        <article v-for="r in recap" :key="r.userId" class="recap-card">
          <header class="recap-head">
            <span class="recap-name">{{ r.name }}</span>
            <span v-if="r.job" class="recap-job">{{ r.job }}</span>
            <span class="recap-badge" :class="r.solde ? 'solde' : 'partiel'">
              {{ r.solde ? 'Soldé' : 'Reste dû' }}
            </span>
          </header>
          <dl class="recap-lines">
            <div><dt>Salaire total à payer</dt><dd>{{ money(r.totalDue) }}</dd></div>
            <div class="hl"><dt>Salaire déjà payé</dt><dd>{{ money(r.totalPaid) }}</dd></div>
            <div class="hl highlight-reste">
              <dt> Reste à payer</dt>
              <dd :class="r.totalReste > 0 ? 'reste-due' : 'reste-zero'">
                {{ money(r.totalReste) }}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </div>
</template>
