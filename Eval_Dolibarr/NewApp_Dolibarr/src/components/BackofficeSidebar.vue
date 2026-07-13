<script setup>
import { useRoute } from 'vue-router'
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['toggle'])
const route = useRoute()

const navItems = [
  { label: 'Dashboard', routeName: 'dashboard' },
  { label: 'Import', routeName: 'backoffice-import' },
  { label: 'Reset', routeName: 'backoffice-reset' },
  { label: 'Jours Fériés', routeName: 'backoffice-jours-feries' }
]

function toggleSidebar() {
  emit('toggle')
}
</script>

<template>
  <aside class="backoffice-sidebar" :class="{ collapsed: props.collapsed }">
    <div class="brand-section">
      <div class="brand-icon">🧩</div>
      <div class="brand-copy">
        <strong>BackOffice</strong>
        <span>Admin</span>
      </div>
    </div>

    <nav class="nav-list">
      <router-link
        v-for="item in navItems"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        class="nav-link"
        :class="{ active: route.name === item.routeName }"
      >
        {{ item.label }}
      </router-link>
    </nav>

    <button class="toggle-button" type="button" @click="toggleSidebar">
      <span>{{ props.collapsed ? 'Ouvrir le menu' : 'Réduire le menu' }}</span>
    </button>
  </aside>
</template>
