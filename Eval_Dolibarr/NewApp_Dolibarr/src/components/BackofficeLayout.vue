<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BackofficeSidebar from '@/components/BackofficeSidebar.vue'

const sidebarCollapsed = ref(false)
const router = useRouter()
const auth = useAuthStore()

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function goSpaceSelection() {
  router.push({ name: 'select-space' })
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="backoffice-layout">
    <BackofficeSidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />

    <div class="layout-content" :class="{ collapsed: sidebarCollapsed }">
      <header class="layout-header">
        <div class="header-title">
          <p>BackOffice</p>
          <h2>Administration</h2>
        </div>

        <div class="header-actions">
          <button class="ghost-button" @click="goSpaceSelection">Changer d’espace</button>
          <button class="primary-button" @click="logout">Déconnexion</button>
        </div>
      </header>

      <main class="layout-main">
        <slot />
      </main>
    </div>
  </div>
</template>
