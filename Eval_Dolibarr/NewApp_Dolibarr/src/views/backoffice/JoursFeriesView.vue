<!-- src/views/backoffice/JoursFeriesView.vue -->
<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useJoursFeriesStore } from '@/stores/joursFeries'

const store = useJoursFeriesStore()

// ── État du formulaire (création + édition) ──────────────────
const form = reactive({
  id       : null,     // null → création, id → édition
  libelle  : '',
  dateFerie: '',
  recurrent: false
})

const isEditing = ref(false)
const successMsg = ref('')

// ── Reset formulaire ─────────────────────────────────────────
function resetForm() {
  form.id        = null
  form.libelle   = ''
  form.dateFerie = ''
  form.recurrent = false
  isEditing.value = false
}

// ── Soumission formulaire ────────────────────────────────────
async function handleSubmit() {
  successMsg.value = ''
  const payload = {
    libelle  : form.libelle.trim(),
    dateFerie: form.dateFerie,
    recurrent: form.recurrent
  }

  const ok = isEditing.value
    ? await store.update(form.id, payload)
    : await store.create(payload)

  if (ok) {
    successMsg.value = isEditing.value
      ? 'Jour férié mis à jour.'
      : 'Jour férié créé.'
    resetForm()
    setTimeout(() => (successMsg.value = ''), 3000)
  }
}

// ── Édition : préremplir le formulaire ───────────────────────
function handleEdit(jf) {
  form.id        = jf.id
  form.libelle   = jf.libelle
  form.dateFerie = jf.dateFerie
  form.recurrent = jf.recurrent
  isEditing.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Suppression ──────────────────────────────────────────────
async function handleDelete(jf) {
  if (!confirm(`Supprimer le jour férié "${jf.libelle}" (${jf.dateFerie}) ?`)) return
  const ok = await store.remove(jf.id)
  if (ok) {
    successMsg.value = 'Jour férié supprimé.'
    setTimeout(() => (successMsg.value = ''), 3000)
  }
}

const formatDate = (iso) => {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="jours-feries-view">
    <h1>📅 Jours Fériés</h1>
    <p class="subtitle">Gestion locale (SQLite via SpringBoot).</p>

    <!-- ── Formulaire ─────────────────────────────────────── -->
    <div class="form-card">
      <h2>{{ isEditing ? 'Modifier' : 'Ajouter' }} un jour férié</h2>

      <form @submit.prevent="handleSubmit" class="form-grid">
        <div class="form-group">
          <label for="libelle">Libellé</label>
          <input
            id="libelle"
            type="text"
            v-model="form.libelle"
            placeholder="Ex: Nouvel An"
            required
          />
        </div>

        <div class="form-group">
          <label for="dateFerie">Date</label>
          <input
            id="dateFerie"
            type="date"
            v-model="form.dateFerie"
            required
          />
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="form.recurrent" />
            Récurrent (chaque année)
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="store.loading" class="btn-primary">
            {{ store.loading ? '...' : (isEditing ? 'Enregistrer' : 'Ajouter') }}
          </button>
          <button
            v-if="isEditing"
            type="button"
            @click="resetForm"
            class="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>

      <div v-if="successMsg" class="alert success">{{ successMsg }}</div>
      <div v-if="store.error" class="alert error">{{ store.error }}</div>
    </div>

    <!-- ── Liste ──────────────────────────────────────────── -->
    <div class="list-card">
      <div class="list-header">
        <h2>Liste ({{ store.count }})</h2>
        <button @click="store.fetchAll()" :disabled="store.loading" class="btn-refresh">
          {{ store.loading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>

      <div v-if="store.loading && store.list.length === 0" class="loading">
        Chargement...
      </div>

      <table v-else-if="store.sortedByDate.length" class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Récurrent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="jf in store.sortedByDate" :key="jf.id">
            <td>{{ formatDate(jf.dateFerie) }}</td>
            <td>{{ jf.libelle }}</td>
            <td>
              <span :class="['badge', jf.recurrent ? 'yes' : 'no']">
                {{ jf.recurrent ? 'Oui' : 'Non' }}
              </span>
            </td>
            <td class="actions">
              <button @click="handleEdit(jf)" class="btn-edit">Modifier</button>
              <button @click="handleDelete(jf)" class="btn-delete">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun jour férié enregistré.</div>
    </div>
  </div>
</template>
