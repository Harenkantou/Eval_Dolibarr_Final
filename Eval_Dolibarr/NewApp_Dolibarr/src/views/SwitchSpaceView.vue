<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function selectSpace(space) {
  localStorage.setItem('seenSpaceSelection', 'true')
  if (space === 'frontoffice') {
    router.push({ name: 'frontoffice-home' })
  } else {
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <div class="switch-space-page">
    <div class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Bienvenue dans NewApp Dolibarr</p>
        <h1>Sélectionnez votre espace</h1>
        <p>
          Choisissez le mode d’accès qui correspond à votre usage :
          gestion administrative ou consultation frontale.
        </p>
      </div>

      <div class="space-cards">
        <article class="space-card frontoffice-card">
          <div class="space-icon">🏠</div>
          <h2>FrontOffice</h2>
          <p>Accédez à l’espace client, visualisez les données et consultez le contenu.</p>
          <button @click="selectSpace('frontoffice')">Accéder au FrontOffice</button>
        </article>

        <article class="space-card backoffice-card">
          <div class="space-icon">⚙️</div>
          <h2>BackOffice</h2>
          <p>Accédez à l’administration, importez des fichiers et gérez les réinitialisations.</p>
          <button @click="selectSpace('backoffice')">Accéder au BackOffice</button>
        </article>
      </div>
    </div>
  </div>
</template>
