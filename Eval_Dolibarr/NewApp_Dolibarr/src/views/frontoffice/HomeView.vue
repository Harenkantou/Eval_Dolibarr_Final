<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goChangeSpace() {
  router.push({ name: 'select-space' })
}

function goToBackoffice() {
  router.push({ name: 'login' })
}

function goToSalaries() {
  router.push({ name: 'frontoffice-salaries' })
}

function goToSalariesAll() {
  router.push({ name: 'frontoffice-salaries-all' })
}

function goToSalariesGenerate() {
  router.push({ name: 'frontoffice-salaries-generate' })
}

function goToSalariesGenerateMonthly() {
  router.push({ name: 'frontoffice-salaries-generate-monthly' })
}

function goToListSalary() {
  router.push({ name: 'frontoffice-salaries-history' })
}

function goToPayGenerate() {
  router.push({ name: 'frontoffice-payment-generate' })
}

function goToResteMensuel() {
  router.push({ name: 'frontoffice-reste-mensuel' })
}

</script>

<template>
  <div class="frontoffice-home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">FrontOffice</p>
        <h1>Votre espace de consultation</h1>
        <p>
          Accédez à une présentation claire des informations et retrouvez les actions
          rapides pour suivre vos données Dolibarr.
        </p>

        <div class="hero-actions">
          <button class="primary" @click="goChangeSpace">Changer d’espace</button>
          <button class="secondary" @click="goToBackoffice">Aller au BackOffice</button>
          <button class="secondary" @click="goToSalaries">Voir les salariés</button>
          <button class="secondary" @click="goToListSalary">Voir la liste des salaires </button>
          <!-- <button class="secondary" @click="goToPayGenerate">Voir la page liste générer paiement </button>
 -->        </div>
      </div>
    </section>

    <section class="quick-links">
      <h2>Accès rapide</h2>
      <div class="links-grid">
        <article class="quick-card">
          <span class="card-icon">🔍</span>
          <h3>Rechercher un salarié</h3>
          <p>Liste avec recherche multi-critères, création et paiement d'un salaire.</p>
          <button class="inline-action" @click="goToSalaries">Ouvrir</button>
        </article>

        <article class="quick-card">
          <span class="card-icon">📋</span>
          <h3>Liste complète</h3>
          <p>Consultez la fiche détaillée de chaque salarié : infos, historique et reste à payer.</p>
          <button class="inline-action" @click="goToSalariesAll">Ouvrir</button>
        </article>

        <article class="quick-card highlight">
          <span class="card-icon">⚡</span>
          <h3>Générer salaires en masse</h3>
          <p>Filtrez les salariés (poste, genre, heures) puis créez plusieurs salaires en une fois.</p>
          <button class="inline-action alt" @click="goToSalariesGenerate">Ouvrir</button>
        </article>
        <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Générer par mois (jours fériés)</h3>
          <p>Générez les salaires des jours non couverts d'un mois, avec majoration des jours fériés.</p>
          <button class="inline-action alt" @click="goToSalariesGenerateMonthly">Ouvrir</button>
        </article>

         <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Generer paiement </h3>
          <p>Veuillez entrer le paiement</p>
          <button class="inline-action alt" @click="goToPayGenerate">Ouvrir</button>
        </article>


        <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Reste à payer par mois </h3>
          <p>Veuillez voir le reste à payer mensuel dans cette page</p>
          <button class="inline-action alt" @click="goToResteMensuel">Ouvrir</button>
        </article>


      </div>
    </section>
  </div>
</template>
