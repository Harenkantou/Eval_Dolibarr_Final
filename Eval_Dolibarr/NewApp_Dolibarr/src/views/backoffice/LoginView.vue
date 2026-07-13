<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const code = ref('')
const error = ref('')

// Pré-remplir le champ avec le code par défaut (énoncé 1.a)
onMounted(() => {
  code.value = auth.getDefaultCode()
})

function submit() {
  error.value = ''
  if (auth.login(code.value)) {
    const redirect = route.query.redirect || { name: 'dashboard' }
    router.push(redirect)
  } else {
    error.value = 'Code invalide.'
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <h1>NewApp</h1>
      <p class="subtitle">BackOffice — accès protégé</p>

      <label for="code">Code d'accès</label>
      <input
        id="code"
        v-model="code"
        type="password"
        autocomplete="off"
        placeholder="Entrez le code"
      />
      <p class="hint">Code par défaut : <strong>admin</strong></p>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit">Entrer</button>
    </form>
  </div>
</template>
