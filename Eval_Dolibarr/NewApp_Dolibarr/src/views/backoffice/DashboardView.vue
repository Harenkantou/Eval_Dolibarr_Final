<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BackofficeLayout from '@/components/BackofficeLayout.vue'
import { getDashboardStats, formatMoney } from '@/services/dashboardService'

const auth = useAuthStore()
const router = useRouter()

// ── État ──────────────────────────────────────────────────────
const loading = ref(true)
const error   = ref('')
const stats   = ref(null)

// ── Chargement des statistiques au montage ────────────────────
async function loadStats() {
  loading.value = true
  error.value   = ''
  try {
    stats.value = await getDashboardStats()
  } catch (e) {
    error.value = e.message || 'Impossible de charger les statistiques.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)

// ── Genre : total pour calculer les proportions des barres ────
const genderTotal = computed(() => {
  if (!stats.value) return 0
  const g = stats.value.byGender
  return g.man + g.woman + g.unknown
})

const pct = (part) =>
  genderTotal.value > 0 ? Math.round((part / genderTotal.value) * 100) : 0

// ── Mois : max pour dimensionner les barres ───────────────────
const monthMax = computed(() => {
  if (!stats.value || stats.value.byMonth.length === 0) return 0
  return Math.max(...stats.value.byMonth.map(m => m.total))
})

const monthPct = (total) =>
  monthMax.value > 0 ? Math.round((total / monthMax.value) * 100) : 0

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <BackofficeLayout>
    <section class="dashboard-overview">
      <!-- ── En-tête ─────────────────────────────────────────── -->
      <div class="headline-card">
        <div>
          <p class="eyebrow">Dashboard</p>
          <h1>Statistiques des salaires</h1>
          <p>Montant de salaire par genre et par mois (date de début comme référence).</p>
        </div>
        <div class="head-actions">
          <button class="refresh-button" :disabled="loading" @click="loadStats">
            {{ loading ? '⏳' : '🔄' }} Actualiser
          </button>
          <button class="logout-button" @click="logout">Se déconnecter</button>
        </div>
      </div>

      <!-- ── Chargement / erreur ─────────────────────────────── -->
      <div v-if="loading" class="state-card">⏳ Chargement des statistiques…</div>
      <div v-else-if="error" class="state-card state-error">❌ {{ error }}</div>

      <template v-else-if="stats">
        <!-- ── Bandeau de totaux ─────────────────────────────── -->
        <div class="stats-grid">
          <article class="stat-card">
            <span class="stat-title">Total salaires</span>
            <strong>{{ stats.totalSalaries }}</strong>
            <p>Nombre de fiches de salaire enregistrées.</p>
          </article>
          <article class="stat-card">
            <span class="stat-title">Montant total</span>
            <strong>{{ formatMoney(stats.totalAmount) }}</strong>
            <p>Somme de tous les salaires dus.</p>
          </article>
          <article class="stat-card">
            <span class="stat-title">Mois couverts</span>
            <strong>{{ stats.byMonth.length }}</strong>
            <p>Mois distincts avec au moins un salaire.</p>
          </article>
        </div>

        <!-- ── Montant par genre ─────────────────────────────── -->
        <article class="panel">
          <h2>💶 Montant de salaire par genre</h2>

          <div class="gender-row">
            <span class="gender-label">👨 Hommes</span>
            <div class="bar-track">
              <div class="bar-fill man" :style="{ width: pct(stats.byGender.man) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.man) }}</span>
          </div>

          <div class="gender-row">
            <span class="gender-label">👩 Femmes</span>
            <div class="bar-track">
              <div class="bar-fill woman" :style="{ width: pct(stats.byGender.woman) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.woman) }}</span>
          </div>

          <div v-if="stats.byGender.unknown > 0" class="gender-row">
            <span class="gender-label">❓ Non renseigné</span>
            <div class="bar-track">
              <div class="bar-fill unknown" :style="{ width: pct(stats.byGender.unknown) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.unknown) }}</span>
          </div>

          <p class="panel-total">
            Total général : <strong>{{ formatMoney(stats.totalAmount) }}</strong>
          </p>
        </article>

        <!-- ── Montant par mois ──────────────────────────────── -->
        <article class="panel">
          <h2>📅 Montant de salaire par mois (date de début)</h2>

          <p v-if="stats.byMonth.length === 0" class="empty">
            Aucun salaire enregistré pour le moment.
          </p>

          <div v-for="m in stats.byMonth" :key="m.month" class="month-row">
            <span class="month-label">{{ m.label }}</span>
            <div class="bar-track">
              <div class="bar-fill month" :style="{ width: monthPct(m.total) + '%' }"></div>
            </div>
            <span class="month-amount">{{ formatMoney(m.total) }}</span>
          </div>

          <p v-if="stats.byMonth.length" class="panel-total">
            Total général : <strong>{{ formatMoney(stats.totalAmount) }}</strong>
          </p>
        </article>
      </template>
    </section>
  </BackofficeLayout>
</template>
