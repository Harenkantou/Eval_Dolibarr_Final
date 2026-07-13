# Dashboard — Montant des salaires par genre et par mois

> Fonctionnalité J1 · point **1.d** — BackOffice
> Afficher **le montant de salaire par genre** et **le montant de salaire par
> mois** (la *date de règlement* servant de référence).

Ce document décrit, étape par étape, comment la fonctionnalité a été
implémentée **en respectant la structure existante du projet** (Vue 3
`<script setup>`, services Axios dans `src/services/`, communication 100 %
via l'API Dolibarr).

---

## 1. Analyse des données disponibles

Avant de coder, on a inspecté l'API Dolibarr pour savoir d'où venaient les
données :

| Donnée nécessaire | Source dans l'API Dolibarr |
|-------------------|----------------------------|
| Montant d'un salaire | `GET /salaries` → champ `amount` |
| Employé d'un salaire | `GET /salaries` → champ `fk_user` |
| **Genre** de l'employé | `GET /users` → champ `gender` (`man` / `woman`) |
| **Date de règlement** | encodée dans le `label` du salaire |

### Point important sur la « date de règlement »

Dans ce projet, les paiements ne sont **pas** stockés comme paiements
Dolibarr réels :

- le champ `datep` du salaire est **vide** ;
- l'endpoint `GET /salaries/{id}/payments` renvoie **404** (inexistant).

Le détail des règlements est écrit dans le **`label`** du salaire par
[`importService.createSalary()`](../src/services/importService.js), au format :

```
Salaire du 01/03/2026 au 08/03/2026 — Payé: 780€/780€ (08/03/2026: 480€ | 08/03/2026: 300€)
```

➡️ On **parse donc le `label`** pour retrouver chaque couple
`(date de règlement, montant réglé)`.

> 💡 Les dates de la période (`du 01/03/2026 au 08/03/2026`) ne sont jamais
> suivies de `": montant"`, elles ne sont donc pas confondues avec des
> règlements.

---

## 2. Créer le service `dashboardService.js`

📄 **Nouveau fichier : [`src/services/dashboardService.js`](../src/services/dashboardService.js)**

Il suit le même style que `importService.js` / `resetService.js` :
en-tête commenté, helper `errMsg`, client `http` partagé, fonctions **pures**
séparées des appels réseau (donc testables).

### 2.1 — Extraire les règlements du `label`

```js
export const extractPayments = (label = '') => {
  const regex = /(\d{2})\/(\d{2})\/(\d{4})\s*:\s*([\d.,]+)/g
  const payments = []

  for (const [, day, month, year, rawAmount] of label.matchAll(regex)) {
    const amount = parseFloat(rawAmount.replace(',', '.')) || 0
    payments.push({
      month : `${year}-${month}`,        // "2026-03" → triable
      date  : new Date(`${year}-${month}-${day}`),
      amount
    })
  }
  return payments
}
```

### 2.2 — Charger les données brutes (API Dolibarr)

```js
// Map { id → { gender, name, ref } } pour retrouver le genre via fk_user
const getUsersById = async () => {
  const res = await http.get('/users', { params: { limit: 500 } })
  const map = {}
  for (const u of res.data || []) {
    map[u.id] = {
      gender: u.gender,
      name  : u.lastname,
      ref   : u.array_options?.options_ref_employe || null
    }
  }
  return map
}

// 404 = aucune donnée → tableau vide (même convention que resetService)
export const getSalaries = async () => {
  try {
    const res = await http.get('/salaries', { params: { limit: 500 } })
    return res.data || []
  } catch (e) {
    if (e.response?.status === 404) return []
    throw e
  }
}
```

### 2.3 — Agréger **par genre**

```js
export const salaryByGender = (salaries, usersById) => {
  const totals = { man: 0, woman: 0, unknown: 0 }
  for (const s of salaries) {
    const amount = parseFloat(s.amount) || 0
    const gender = usersById[s.fk_user]?.gender
    if (gender === 'man')        totals.man   += amount
    else if (gender === 'woman') totals.woman += amount
    else                         totals.unknown += amount
  }
  return totals
}
```

### 2.4 — Agréger **par mois** (date de règlement)

```js
export const salaryByMonth = (salaries) => {
  const byMonth = {}
  for (const s of salaries)
    for (const p of extractPayments(s.label))
      byMonth[p.month] = (byMonth[p.month] || 0) + p.amount

  const MOIS = ['Janv','Févr','Mars','Avr','Mai','Juin',
                'Juil','Août','Sept','Oct','Nov','Déc']

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))     // ordre chronologique
    .map(([month, total]) => {
      const [year, m] = month.split('-')
      return { month, label: `${MOIS[+m - 1]} ${year}`, total: Math.round(total * 100) / 100 }
    })
}
```

### 2.5 — Point d'entrée unique + formatage

```js
export const getDashboardStats = async () => {
  const [salaries, usersById] = await Promise.all([getSalaries(), getUsersById()])
  const byGender = salaryByGender(salaries, usersById)
  const byMonth  = salaryByMonth(salaries)
  return {
    byGender,
    byMonth,
    totalSalaries: salaries.length,
    totalAmount  : Math.round((byGender.man + byGender.woman + byGender.unknown) * 100) / 100
  }
}

export const formatMoney = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
```

---

## 3. Brancher la vue `DashboardView.vue`

📄 **Fichier modifié : [`src/views/backoffice/DashboardView.vue`](../src/views/backoffice/DashboardView.vue)**

On garde le `BackofficeLayout` et le style « cartes blanches / accents bleus »
déjà en place. La vue :

1. appelle `getDashboardStats()` dans `onMounted` ;
2. gère les états **chargement / erreur / données** ;
3. affiche deux mini-graphiques en **barres CSS** (aucune librairie ajoutée).

```js
import { getDashboardStats, formatMoney } from '@/services/dashboardService'

const loading = ref(true), error = ref(''), stats = ref(null)

async function loadStats() {
  loading.value = true; error.value = ''
  try   { stats.value = await getDashboardStats() }
  catch (e) { error.value = e.message }
  finally   { loading.value = false }
}
onMounted(loadStats)
```

- **Par genre** : largeur des barres = `montant / total` (Hommes = bleu,
  Femmes = rose, Non renseigné = gris).
- **Par mois** : largeur des barres = `montant du mois / mois le plus élevé`,
  triées chronologiquement.

> Aucune route ni entrée de menu à ajouter : le Dashboard est déjà la route
> `dashboard` (`/backoffice`) et figure déjà dans la sidebar.

---

## 4. Vérification

L'API tournant en local, on a rejoué la logique d'agrégation sur les données
réelles (`4 salaires`) :

```
Par genre : { man: 2170, woman: 677.56, unknown: 0 }
Par mois  : 2026-03 = 1670   2026-05 = 200
```

Détail du contrôle :

| Salaire | Employé | Genre | Montant | Règlement(s) |
|--------:|---------|-------|--------:|--------------|
| #1 | user 53 | homme | 890 | 08/03 : 890 |
| #2 | user 53 | homme | 780 | 08/03 : 480 + 300 |
| #3 | user 53 | homme | 500 | 08/05 : 200 |
| #4 | user 54 | femme | 677,56 | *aucun paiement* |

- **Par genre** : hommes = 890 + 780 + 500 = **2170 €** ✓ · femmes = **677,56 €** ✓
- **Par mois** : mars = 890 + (480 + 300) = **1670 €** ✓ · mai = **200 €** ✓

> Note : *par genre* utilise le montant **dû** (`amount`) ; *par mois* utilise
> le montant **réglé** (date de règlement comme référence) — d'où l'écart
> attendu (le salaire #4 n'a encore aucun règlement).

### Lancer en local

```bash
cd NewApp_Dolibarr
npm run dev
# → http://localhost:5173  →  BackOffice  →  code : admin  →  Dashboard
```

---

## 5. Récapitulatif des fichiers

| Fichier | Nature | Rôle |
|---------|--------|------|
| `src/services/dashboardService.js` | **ajouté** | Chargement + agrégations (genre / mois) |
| `src/views/backoffice/DashboardView.vue` | **modifié** | Affichage des deux graphiques |

Aucun autre fichier n'a été touché (router, sidebar, services existants
inchangés).
