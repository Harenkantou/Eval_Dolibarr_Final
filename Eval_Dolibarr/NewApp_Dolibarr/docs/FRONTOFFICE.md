# FrontOffice — Logique et fonctions utilisées

> Fonctionnalité FrontOffice · vue d’ensemble
> Ce document décrit la logique, les fonctions et les composants utilisés pour
> implémenter l’espace FrontOffice de l’application NewApp Dolibarr.

---

## 1. Objectif du FrontOffice

L’espace FrontOffice permet de :

- afficher la page d’accueil de l’application ;
- consulter la liste des salariés ;
- ouvrir la page de gestion d’un salarié pour visualiser ses salaires et ses paiements ;
- créer un nouveau salaire ;
- enregistrer un paiement en plusieurs fois.

---

## 2. Données utilisées

Les vues FrontOffice reposent sur deux types de données principales :

- les salariés / utilisateurs Dolibarr ;
- les salaires associés à chaque utilisateur.

### Données issues de l’API Dolibarr

| Donnée | Source | Utilisation |
|--------|--------|-------------|
| Utilisateurs | `GET /users` | récupérer les salariés à afficher |
| Salaires | `GET /salaries` | récupérer les salaires et leurs montants |
| Paiements | encodés dans le `label` | permettre l’historique des paiements |

---

## 3. Logique API utilisée

La logique d’accès aux données a été centralisée dans [src/api/dolibarr.js](../src/api/dolibarr.js).

### 3.1 Fonctions principales

#### `getEmployees()`

Permet de récupérer la liste des salariés depuis l’API Dolibarr.

```js
export async function getEmployees() {
  const { data } = await api.get('/users', { params: { limit: 500 } })
  return (data || [])
    .filter(u => u.array_options?.options_ref_employe)
    .map(normalizeEmployee)
}
```

#### `getSalaries()`

Récupère tous les salaires, puis les normalise pour l’affichage.

```js
export async function getSalaries() {
  try {
    const { data } = await api.get('/salaries', { params: { limit: 500 } })
    return (data || []).map(normalizeSalary)
  } catch (e) {
    if (e.response?.status === 404) return []
    throw e
  }
}
```

#### `getEmployeeSalaries(userId)`

Filtre les salaires d’un salarié précis.

```js
export async function getEmployeeSalaries(userId) {
  const all = await getSalaries()
  return all.filter(s => s.fk_user === parseInt(userId))
}
```

#### `createSalary({ fk_user, amount, dateStart, dateEnd })`

Crée un nouveau salaire pour un utilisateur.

```js
export async function createSalary({ fk_user, amount, dateStart, dateEnd }) {
  const amt = round2(amount)
  const baseLabel = `Salaire du ${isoToFr(dateStart)} au ${isoToFr(dateEnd)}`
  const label = buildLabel(baseLabel, amt, [])

  const { data } = await api.post('/salaries', {
    fk_user,
    amount: amt,
    datesp: isoToTs(dateStart),
    dateep: isoToTs(dateEnd),
    label,
    paye: 0
  })

  return data
}
```

#### `addPayment(salaryId, payment)`

Ajoute un paiement à un salaire déjà existant.

```js
export async function addPayment(salaryId, payment) {
  const { data: s } = await api.get(`/salaries/${salaryId}`)

  const amount = parseFloat(s.amount) || 0
  const payments = parsePaymentsFromLabel(s.label)
  payments.push({ date: isoToFr(payment.date), amount: round2(payment.amount) })

  const baseLabel = baseOfLabel(s.label) || `Salaire du ${tsToFr(s.datesp)} au ${tsToFr(s.dateep)}`
  const label = buildLabel(baseLabel, amount, payments)
  const totalPaye = round2(payments.reduce((a, p) => a + p.amount, 0))

  await api.put(`/salaries/${salaryId}`, {
    label,
    paye: totalPaye >= amount ? 1 : 0
  })

  return normalizeSalary({ ...s, label })
}
```

### 3.2 Helpers utilisés

- `parsePaymentsFromLabel(label)` : lit les paiements enregistrés dans le label.
- `baseOfLabel(label)` : récupère la partie du texte avant la partie paiement.
- `buildLabel(baseLabel, amount, payments)` : reconstruit le label avec le détail des paiements.
- `normalizeEmployee(user)` : transforme les données API en objet métier simple.
- `normalizeSalary(salary)` : transforme un salaire brut en objet prêt à l’affichage.

---

## 4. Routage FrontOffice

La navigation FrontOffice a été ajoutée dans [src/router/index.js](../src/router/index.js).

### Routes principales

- `/frontoffice` → page d’accueil FrontOffice
- `/frontoffice/salaries` → liste des salariés
- `/frontoffice/salaries/:id/pay` → page de gestion d’un salarié

### Redirections utiles

- `/salaries` → redirige vers la liste des salariés
- `/salaries/:id/pay` → redirige vers la page de paiement correspondante

### Logique de garde

Le router vérifie :

- si l’utilisateur a déjà sélectionné un espace ;
- si une page protégée demande une authentification.

---

## 5. Vue d’accueil FrontOffice

Le composant [src/views/frontoffice/HomeView.vue](../src/views/frontoffice/HomeView.vue) sert de page d’entrée.

### Fonctions utilisées

- `goChangeSpace()` : retourne vers la page de sélection d’espace.
- `goToBackoffice()` : ouvre l’espace BackOffice.
- `goToSalaries()` : ouvre la liste des salariés.

### Rôle

Cette vue donne un accès rapide à :

- la liste des salariés ;
- le changement d’espace ;
- le BackOffice.

---

## 6. Vue de liste des salariés

Le composant [src/views/frontoffice/SalarieList.vue](../src/views/frontoffice/SalarieList.vue) affiche les salariés et leurs statuts de paiement.

### Logique principale

#### `loadData()`

Charge les salariés et les salaires en parallèle.

```js
async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value = sal
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}
```

#### `rows` et `filteredRows`

- `rows` enrichit chaque salarié avec ses données de salaires.
- `filteredRows` applique les filtres côté client : recherche, genre, statut de paiement.

#### `goToPay(userId)`

Redirige vers la page de gestion du salarié sélectionné.

```js
function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}
```

### Fonctionnalités affichées

- recherche multi-critères ;
- filtre par genre ;
- filtre par statut de paiement ;
- bouton d’accès vers la page de paiement.

---

## 7. Vue de gestion d’un salarié

Le composant [src/views/frontoffice/SalariePay.vue](../src/views/frontoffice/SalariePay.vue) permet de gérer les salaires et paiements d’un salarié.

### Logique principale

#### `loadData()`

Charge les données du salarié et ses salaires associés.

```js
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [employeeData, salaryData] = await Promise.all([
      getEmployee(userId),
      getEmployeeSalaries(userId)
    ])

    employee.value = employeeData
    salaries.value = salaryData
    payForms.value = Object.fromEntries(salaryData.map(s => [s.id, { date: today, amount: '' }]))
  } catch (e) {
    error.value = 'Erreur lors du chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}
```

#### `handleCreateSalary()`

Crée un nouveau salaire avec une période donnée.

```js
async function handleCreateSalary() {
  error.value = ''
  success.value = ''

  const amount = parseFloat(salaryForm.value.amount)
  if (!amount || amount <= 0) {
    error.value = 'Montant du salaire invalide.'
    return
  }

  loading.value = true
  try {
    await createSalary({
      fk_user: Number(userId),
      amount,
      dateStart: salaryForm.value.dateStart,
      dateEnd: salaryForm.value.dateEnd
    })
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors de la création : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}
```

#### `handlePay(salary)`

Ajoute un paiement à un salaire, en vérifiant que le montant ne dépasse pas le reste à payer.

```js
async function handlePay(salary) {
  error.value = ''
  success.value = ''

  const form = payForms.value[salary.id]
  const amount = parseFloat(form.amount)

  if (!amount || amount <= 0) {
    error.value = 'Montant du paiement invalide.'
    return
  }

  if (amount > salary.reste + 0.001) {
    error.value = 'Le montant dépasse le reste à payer.'
    return
  }

  loading.value = true
  try {
    await addPayment(salary.id, { date: form.date, amount })
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors du paiement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}
```

### Éléments affichés

- informations du salarié ;
- montant total dû / total payé ;
- formulaire de création d’un salaire ;
- formulaire de paiement par salaire ;
- historique des paiements.

---

## 8. Vérification et accès

Pour tester la fonctionnalité FrontOffice localement :

```bash
cd NewApp_Dolibarr
npm run dev
```

Puis ouvrir :

- `http://localhost:5173/` → sélection de l’espace
- `http://localhost:5173/frontoffice` → accueil FrontOffice
- `http://localhost:5173/frontoffice/salaries` → liste des salariés
- `http://localhost:5173/frontoffice/salaries/1/pay` → page de gestion d’un salarié

---

## 9. Résumé des fichiers principaux

| Fichier | Rôle |
|--------|------|
| [src/router/index.js](../src/router/index.js) | ajout des routes FrontOffice |
| [src/views/frontoffice/HomeView.vue](../src/views/frontoffice/HomeView.vue) | page d’accueil |
| [src/views/frontoffice/SalarieList.vue](../src/views/frontoffice/SalarieList.vue) | liste des salariés |
| [src/views/frontoffice/SalariePay.vue](../src/views/frontoffice/SalariePay.vue) | gestion des salaires et paiements |
| [src/api/dolibarr.js](../src/api/dolibarr.js) | logique API et transformation des données |
