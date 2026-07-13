# Génération de salaires — page « Générer Salaire »

> Nouvelle page : générer des salaires par mois/année à partir d'un "salaire par jour" et
> d'un pourcentage de majoration pour les jours fériés.

---

## 1. Objectif

Permettre de générer automatiquement des salaires pour des périodes qui
n'ont pas encore de salaire enregistré. L'utilisateur indique :

- un employé (ou une sélection / tous) ;
- le mois et l'année de génération ;
- le `salaire par jour` (valeur numérique) ;
- la `majoration jour férié` (pourcentage, ex : 100 pour +100%).

La génération produit pour chaque intervalle manquant une ligne (1 ligne = 1 montant) :
- l'intervalle (dates de début/fin),
- le nombre de jours,
- le montant total (incluant majoration pour jours fériés).

---

## 2. Interface / champs (BackOffice ou FrontOffice)

- Sélecteur d'employé (`employeeId`) ou case "Tous".
- Sélecteur `month` (1..12) et `year`.
- `salaireParJour` (nombre positif).
- `majorationPourcent` (nombre, ex 100 pour doublement sur jour férié).
- Bouton `Prévisualiser` → affiche la liste des intervalles manquants et montants.
- Bouton `Générer` → crée les salaires validés.

---

## 3. Données nécessaires / endpoints réutilisés

- `GET /users` → `getEmployees()` (déjà présent dans `src/api/dolibarr.js`).
- `GET /salaries` → `getSalaries()` + `getEmployeeSalaries(userId)`.
- `POST /salaries` → `createSalary({ fk_user, amount, dateStart, dateEnd })`.
- `GET /api/jours-feries` → `listJoursFeries()` (service SpringBoot).

---

## 4. Fonctions proposées (service)

Fichier conseillé : `src/services/generateSalaryService.js`

- `findSalaryCoverage(salaries)`
  - Entrée : tableau de salaires normalisés pour un employé.
  - Sortie : tableau d'intervalles existants `[{start: Date, end: Date}]`.
  - Logique : normaliser les dates et trier, fusionner les intervalles qui se touchent ou se chevauchent.

- `findMissingIntervals(month, year, coverageIntervals)`
  - Entrée : mois/année ciblés et intervalles couverts.
  - Sortie : tableau d'intervalles manquants à générer.
  - Logique : construire l'intervalle complet du mois (ex 2026-03-01 → 2026-03-31) puis soustraire les intervalles couverts pour obtenir les "trous". Supporte plusieurs intervalles manquants.

- `isHoliday(date, holidays)`
  - Entrée : `Date`, tableau `holidays` (format `YYYY-MM-DD` ou Date).
  - Sortie : boolean.

- `computeAmountForInterval(interval, salaireParJour, holidays, majorationPourcent)`
  - Entrée : interval `{start, end}`, `salaireParJour`, liste `holidays`, `majorationPourcent`.
  - Sortie : `{ daysCount, holidayDaysCount, baseAmount, majorationAmount, total }`.
  - Logique :
    - calculer `daysCount` = nombre de jours civils inclusifs entre start et end ;
    - `holidayDaysCount` = compter les joursFeries dans l'intervalle ;
    - `baseAmount` = `daysCount * salaireParJour` ;
    - `majorationAmount` = `holidayDaysCount * salaireParJour * (majorationPourcent/100)` ;
    - `total` = `baseAmount + majorationAmount`.

- `buildLabelForGeneratedSalary(interval, total, details)`
  - Réutilise le format `Salaire du DD/MM/YYYY au DD/MM/YYYY — Payé: 0€/X€ (aucun paiement)`.

- `createSalaryForInterval(userId, interval, total)`
  - Appelle `createSalary({ fk_user: userId, amount: total, dateStart, dateEnd })`.

- `generateSalariesForUser({ userId, month, year, salaireParJour, majorationPourcent })`
  - Orchestration :
    1. charger les salaires existants de l'utilisateur (`getEmployeeSalaries`).
    2. calculer `coverageIntervals` via `findSalaryCoverage`.
    3. calculer `missingIntervals` via `findMissingIntervals`.
    4. charger `holidays` via `listJoursFeries()` (filtrer par année si besoin).
    5. pour chaque `missingInterval` : calculer montant avec `computeAmountForInterval`.
    6. retourner la `preview` (liste des intervalles + montants) pour confirmation.

- `commitGeneration(previewList)`
  - Après confirmation UI : appelle `createSalaryForInterval` pour chaque item, collecte les `ids` créés et gère les erreurs partielles (option : rollback).

---

## 5. Pseudocode (extraits)

```js
// détecte les trous dans le mois cible
function findMissingIntervals(month, year, coverage) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // dernier jour du mois

  // coverage = [{start, end}, ...] trié et fusionné
  // soustraire coverage de [monthStart, monthEnd]
  // retourner tableau d'intervalles restants
}

function computeAmountForInterval(interval, salaireParJour, holidays, majoration) {
  const days = daysInclusive(interval.start, interval.end)
  const holidayDays = holidays.filter(h => dateInInterval(h, interval)).length
  const base = days * salaireParJour
  const maj = holidayDays * salaireParJour * (majoration / 100)
  return { days, holidayDays, base, maj, total: round2(base + maj) }
}
```

---

## 6. Flux d'utilisation (UI -> service -> API)

1. L'utilisateur ouvre la page `Générer Salaire`.
2. Remplit `employeeId|Tous`, `month`, `year`, `salaireParJour`, `majorationPourcent`.
3. Clique `Prévisualiser` → l'app appelle `generateSalariesForUser` :
   - récupère salaires existants,
   - calcule intervalles manquants,
   - récupère jours fériés,
   - calcule montants par intervalle.
4. Affichage d'une table de prévisualisation : `interval`, `jours`, `jours fériés`, `montant`.
5. L'utilisateur confirme (`Générer`).
6. L'app appelle `commitGeneration(previewList)` qui crée les salaires via `POST /salaries`.
7. En cas de succès : affichage message et résumé (nombre créés, total €).
8. En cas d'erreurs : afficher items en échec et proposer rollback manuel ou réessai.

---

## 7. Exemples et cas pratique

Scénario donné :

- Poste : Technicien
- Reset → Import
- Jours fériés créés : 14/02/2024 et 22/02/2024
- Salaire par jour : 20
- Majoration : 100 %

Supposons qu'il n'y ait pas de salaire du 01/02/2024 au 10/02/2024, on génère l'intervalle 11/02/2024 → 29/02/2024 (ou 28 si non bissextile) ;
- `days` = 19 (exemple),
- `holidayDays` = compter parmi {14,22} qui tombent dans l'intervalle,
- `base` = 19 * 20 = 380,
- `maj` = holidayDays * 20 * 1.0,
- `total` = base + maj.

Note : vérifier l'inclusion des bornes (utiliser inclusif start/end).

---

## 8. Cas limites et recommandations

- Gestion des chevauchements : fusionner les salaires existants pour détecter correctement les trous.
- Fuseaux horaires : travailler en dates locales (YYYY-MM-DD) sans heures.
- Validation : refuser génération si `salaireParJour <= 0` ou `majorationPourcent < 0`.
- Tests : écrire tests unitaires pour `findMissingIntervals` et `computeAmountForInterval`.
- Option avancée : proposer un mode "simulation" qui n'appelle pas `POST /salaries` mais produit un fichier CSV exportable.

---

## 9. Fichiers suggérés à créer/mettre à jour

- `src/services/generateSalaryService.js` — implémentation des fonctions ci-dessus.
- `src/views/backoffice/GenerateSalaryView.vue` (ou `frontoffice` selon besoin) — UI et preview.
- `src/api/dolibarr.js` — réutiliser `createSalary` / `getSalaries` si nécessaire.

---

## 10. Tests rapides à exécuter

- Prévisualiser pour un employé ayant déjà des salaires partiels (vérifier intervalles multiples).
- Générer et vérifier dans l'interface que les salaires créés apparaissent avec les bonnes dates et montants.
- Tester avec aucun jour férié disponible.

---

## 11. Récapitulatif

La page suit le même pattern que les autres fonctionnalités : UI simple → service pur (calculs déterministes) → appels API. Le cœur algorithmique réside dans la détection des intervalles manquants et le calcul des montants en tenant compte des jours fériés.

---

## 12. Gestion des chevauchements (règle et fonction proposée)

Règle :

- Tout intervalle existant doit être normalisé et fusionné avant de calculer les "trous" ;
- Deux intervalles qui se touchent (ex. fin = 10/06 et début = 11/06) sont considérés séparés si vous préférez « trou » sur jours civils — ici nous utilisons la convention INCLUSIF pour les bornes et nous fusionnons les intervalles qui se chevauchent ou se recouvrent (ex. 15/06/2024-20/07/2024 chevauche 01/07/2024-30/07/2024).

Fonction JS prête à l'emploi (à placer dans `src/services/generateSalaryService.js` ou un util commun) :

```js
// Helper: parse 'YYYY-MM-DD' or Date -> Date (heure 00:00)
const toDate = (d) => {
  if (!d) return null
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // assume string 'YYYY-MM-DD' or 'DD/MM/YYYY'
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [day, month, y] = d.split('/').map(Number)
    return new Date(y, month - 1, day)
  }
  return new Date(d)
}

// Merge overlapping intervals. Intervals: [{start: Date|string, end: Date|string}]
export function mergeIntervals(intervals = []) {
  const normalized = intervals
    .map(i => ({ start: toDate(i.start), end: toDate(i.end) }))
    .filter(i => i.start && i.end && i.start <= i.end)
    .sort((a, b) => a.start - b.start)

  const res = []
  for (const iv of normalized) {
    if (res.length === 0) { res.push(iv); continue }
    const last = res[res.length - 1]
    // if overlapping or contiguous (last.end >= iv.start - 1 day), merge
    if (last.end >= iv.start) {
      // extend the end if needed
      last.end = new Date(Math.max(last.end.getTime(), iv.end.getTime()))
    } else {
      res.push(iv)
    }
  }
  return res
}

// Insert a new interval and merge with existing coverage
export function insertAndMerge(existingIntervals = [], newInterval) {
  const all = existingIntervals.concat([newInterval])
  return mergeIntervals(all)
}

/*
Usage:
1. Charger les salaires de l'utilisateur et construire coverage = [{start, end}] via normalize.
2. coverage = mergeIntervals(coverage)
3. missing = findMissingIntervals(month, year, coverage)

Exemple concret:
const coverage = [ {start: '2024-06-01', end: '2024-06-30'}, {start: '2024-06-15', end: '2024-07-20'} ]
mergeIntervals(coverage) // -> [{start: '2024-06-01', end: '2024-07-20'}]
*/

Notes d'intégration :

- Ajoutez `mergeIntervals` dans `src/services/generateSalaryService.js` puis exportez-la.
- Appelez `mergeIntervals` depuis `findSalaryCoverage` juste après avoir converti les salaires en intervalles.
- Écrire des tests unitaires pour couvrir cas simples : adjacents, imbriqués, disjoints.

