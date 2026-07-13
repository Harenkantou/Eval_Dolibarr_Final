# Aléas 4 & 5 — Fonctionnalités encore implémentables sur le « reste à payer »

Document établi à partir du code réel de `ResteAPayerMensuel.vue`,
`salaryMonthlyService.js` et `paymentDispatcherService.js`.
Chaque proposition indique **le manque constaté**, **les fichiers touchés** et **le coût**.

---

## 0. Rappel des énoncés

**Aléa 4** — Tableau croisé : lignes = `Mois + Année`, colonnes = employés, cellule = reste à payer.
Tri par mois. Clic sur un montant → détail du reste à payer (salaire + paiements).

**Aléa 5** — Dans la même page : un bouton **Payer** par ligne et par colonne.
Un champ **pourcentage** saisi *avant*, qui détermine quelle part du reste de la ligne / colonne est réellement payée.

## 0 bis. Ce qui est déjà couvert

| Brique | Où | Statut |
|---|---|---|
| Pivot Mois×Salarié, cellule = reste | `buildMonthlyRest` + `buildPivot` | ✅ Aléa 4 |
| Tri croissant / décroissant sur Mois & Année | `sortPeriods` | ✅ Aléa 4 |
| Clic montant → détail salaires + règlements | `paymentsOfRow` + `.detail-panel` | ✅ Aléa 4 |
| Champ % saisi avant, borné 0–100 | `pct` (computed) | ✅ Aléa 5 |
| Payer une **ligne** (un mois, tous les salariés) | `cellsOfPeriod` → `payPeriod` | ✅ Aléa 5 |
| Payer une **colonne** (un salarié, tous les mois) | `cellsOfEmployee` → `payEmployee` | ✅ Aléa 5 |
| Répartition **au prorata** du reste de chaque salaire | `buildPercentPlan` | ✅ Aléa 5 |
| Montant cible affiché avant clic (`.target`) | `rowTarget` / `colTarget` | ✅ |
| Totaux : reste par colonne (`tfoot`) + grand total | `restOf` / `sumRows` | ✅ |

**Les deux aléas sont donc fonctionnellement satisfaits.** Ce qui suit sont des
extensions, classées par axe.

---

## A. Élargir le périmètre du paiement

### A.1 — Payer **une seule cellule** (un croisement mois × salarié) `[très faible]`

**Manque :** on peut payer toute une ligne ou toute une colonne, mais **pas le
croisement unique** — alors que c'est précisément l'objet du clic de l'aléa 4.
Aujourd'hui le panneau de détail ne propose que « Créer / Payer → » qui **quitte
la page** vers `SalariePay`.

**Pourquoi c'est le meilleur candidat :** toute la mécanique existe.
`payCells()` accepte déjà un tableau de croisements — il suffit de lui passer
`[selectedRow]`.

```js
function payCell(row) {
  payCells([row], `${row.monthLabel} ${row.year} · ${row.name}`, `cell:${row.key}`)
}
```

**Touche :** `ResteAPayerMensuel.vue` uniquement (1 fonction + 1 bouton dans `.detail-actions`).

### A.2 — Payer **tout le tableau** au pourcentage `[très faible]`

**Manque :** il existe un grand total (`grandTotal.rest`) mais aucun bouton pour
le payer. La cellule du coin bas-droit du `tfoot` est vide.

`payCells(allRows, 'Tout le tableau', 'all')` — `allRows` est déjà le tableau
complet des croisements filtrés.

**Touche :** `ResteAPayerMensuel.vue`. **Attention :** confirmer explicitement, l'action est massive.

### A.3 — Payer un **sous-ensemble sélectionné** (cases à cocher) `[moyen]`

**Manque :** le périmètre est imposé (ligne entière / colonne entière). Impossible
de payer « ces 3 salariés-là, pour ce mois-ci ».

Ajouter une case par cellule + un bouton « Payer la sélection » qui appelle
`payCells(selection, …)`. Le service n'a **rien** à changer.

**Touche :** `ResteAPayerMensuel.vue` (état `selection: Set<key>`).

---

## B. Enrichir la stratégie de répartition

### B.1 — Mode **montant fixe** en plus du pourcentage `[faible]`

**Manque :** on ne peut exprimer le paiement **qu'en %**. Payer « 500 € sur la
ligne de février » est impossible ici (il faut passer par `PaymentGenerate`, qui
ne connaît pas la notion de ligne/colonne).

Un sélecteur `% | €` : en mode €, `target = min(montantSaisi, totalRest)` et on
réutilise **la même** boucle de répartition.

**Touche :** `buildPercentPlan` (paramètre `target` explicite au lieu de `percent`)
+ 1 `<select>`. Le prorata reste identique.

### B.2 — Stratégie de répartition **configurable** `[moyen]`

**Manque :** la répartition est **au prorata, en dur** (`reste * pct / 100` sur
chaque salaire). Deux stratégies métier classiques manquent :

| Stratégie | Comportement | Existe ? |
|---|---|---|
| **Prorata** | chaque salaire reçoit X % de *son* reste | ✅ actuel |
| **Séquentielle** | solder les salaires les plus anciens d'abord, jusqu'à épuisement du montant cible | ❌ |
| **Par priorité de poste** | servir les techniciens avant les comptables | ❌ (existe dans `sortByPriority`, non branché ici) |

À noter : `dispatchBudget()` de `paymentDispatcherService` implémente **déjà** la
stratégie séquentielle. Il s'agit de la brancher, pas de l'écrire.

**Touche :** `buildPercentPlan` (paramètre `strategy`) + 1 `<select>`.

### B.3 — Seuil minimum / arrondi `[faible]`

**Manque :** payer 1 % d'un reste de 8 € génère un règlement de **0,08 €**. Le
prorata crée des micro-paiements qui polluent l'historique.

Ajouter `minPayment` (ignorer les lignes sous le seuil) et/ou un arrondi à
l'euro. L'écart d'arrondi est déjà absorbé par la dernière ligne — la mécanique
est en place.

**Touche :** `buildPercentPlan`.

### B.4 — Filtre **poste** sur le tableau `[faible]`

**Manque :** la page filtre par mois et année, **pas par poste** — alors que
`distinctJobs()` existe et que les autres écrans l'utilisent. « Payer 50 % du
reste de tous les techniciens » est donc impossible.

Filtrer `columns` (et donc les colonnes du pivot) par `job`.

**Touche :** `ResteAPayerMensuel.vue` + `pivotColumns(employees, { job })`.

---

## C. Sûreté et réversibilité *(les vrais trous)*

### C.1 — **Annuler un paiement** `[moyen — le plus critique]`

**Manque :** `addPayment` sait ajouter un règlement ; **rien ne sait en retirer un**.
Un clic malheureux sur « Payer 100 % » de tout le tableau est **irréversible**
sans un reset complet de la base.

Les deux briques nécessaires existent déjà dans `api/dolibarr.js` :
`parsePaymentsFromLabel` et la reconstruction du label. Un
`removePayment(salaryId, index)` reconstruirait le label sans la ligne visée.

**Touche :** `api/dolibarr.js` + un bouton « Annuler » dans le tableau des
règlements du `.detail-panel`.

### C.2 — Paiement **transactionnel** `[moyen]`

**Manque :** `runPaymentPlan` s'arrête sur un décompte `ok / ko` et **laisse les
paiements déjà passés en place**. Si la 15ᵉ ligne sur 30 échoue, 14 règlements
existent, non annulés — et l'utilisateur voit « 14 succès, 16 échecs » sans
savoir quoi refaire.

`importService` applique pourtant, lui, une loi du tout-ou-rien avec `rollback()`.
Le patron est à réutiliser (il devient trivial une fois C.1 fait).

**Touche :** `api/dolibarr.js`.

### C.3 — **Aperçu détaillé** avant de payer `[faible]`

**Manque :** la confirmation est un `confirm()` natif qui n'affiche qu'un total.
L'utilisateur valide sans voir **quel salaire reçoit quoi**.

`buildPercentPlan` retourne pourtant déjà un `plan` complet
(`{name, resteBefore, payment, resteAfter, partial}`). `PaymentGenerate` affiche
exactement cette table. Il suffit de la réutiliser dans un panneau d'aperçu
avant validation.

**Touche :** `ResteAPayerMensuel.vue` (aucun service à modifier).

### C.4 — **Date de règlement** choisie `[très faible]`

**Manque :** la date du paiement est **`today` en dur** (`payCells` →
`runPaymentPlan(plan, { date: today })`). Impossible d'enregistrer un règlement
antidaté, alors que la saisie manuelle de `SalariePay` le permet.

**Touche :** `ResteAPayerMensuel.vue` (1 `<input type="date">` dans `.filters`).

---

## D. Lecture et analyse du reste

### D.1 — Masquer les colonnes vides ou soldées `[faible]`

**Manque :** `pivotColumns()` produit **une colonne par employé, y compris ceux
qui n'ont aucun salaire** (le commentaire du service le dit explicitement). Avec
30 salariés dont 5 concernés, le tableau est illisible.

Une case « Masquer les salariés soldés / sans salaire » filtrerait `columns` sur
`columnRest[userId] > 0`.

**Touche :** `ResteAPayerMensuel.vue` (computed `visibleColumns`).

### D.2 — Trier par **montant restant** `[faible]`

**Manque :** `sortPeriods` ne trie que sur `(année, mois)`. On ne peut pas
ordonner les périodes par reste décroissant pour attaquer les plus gros retards.

**Touche :** `sortPeriods` (ajouter `by: 'period' | 'rest'`).

### D.3 — Le **reste à payer** dans le Dashboard `[faible]`

**Manque :** `dashboardService` ne calcule que le **montant de salaire** par genre
et par mois. Le **reste à payer** — la donnée centrale des aléas 4-5 — n'apparaît
nulle part dans les statistiques.

`sumRows()` fait déjà le calcul. Il suffit de l'appeler.

**Touche :** `dashboardService.js` + `DashboardView.vue`.

### D.4 — Export CSV du tableau croisé `[faible]`

**Manque :** le pivot est affiché puis perdu. Pur front, aucune dépendance.

---

## E. Ergonomie du pourcentage

### E.1 — Pourcentage **par ligne / par colonne** `[moyen]`

**Manque :** le champ % est **global** au tableau. On ne peut pas payer 50 % sur
février et 20 % sur mars dans la même passe.

Un petit champ % inline dans chaque cellule d'action, avec le champ global comme
valeur par défaut.

### E.2 — Boutons rapides 25 / 50 / 75 / 100 % `[très faible]`

Confort pur, 5 lignes de template, aucun service touché.

### E.3 — Simulation dans le panneau de détail `[très faible]`

Quand un croisement est déplié, afficher « Au pourcentage courant ({{ pct }} %),
ce croisement recevrait **X €** » — `rowTarget()` existe déjà.

---

## F. Récapitulatif — quoi faire en premier

### Si l'objectif est de **marquer des points vite** (contexte d'évaluation)

| # | Fonctionnalité | Coût | Pourquoi |
|---|---|---|---|
| **A.1** | Payer une cellule | très faible | Complète logiquement l'aléa 4 : on clique sur un montant, on doit pouvoir le payer |
| **A.2** | Payer tout le tableau | très faible | Complète la symétrie ligne / colonne / global |
| **C.3** | Aperçu avant paiement | faible | Le `plan` est déjà calculé, la table existe dans `PaymentGenerate` |
| **D.1** | Masquer colonnes vides | faible | Rend la page réellement utilisable avec 30 salariés |

Ces quatre-là ne touchent **que** `ResteAPayerMensuel.vue`. Aucun service modifié,
donc aucun risque de régression sur les aléas déjà validés.

### Si l'objectif est la **solidité**

**C.1 (annuler un paiement)** d'abord — c'est le seul vrai trou fonctionnel : la
page permet aujourd'hui de payer 100 % de toute la base en deux clics, sans
retour arrière possible. **C.2 (transactionnel)** en découle presque gratuitement.

### Le piège à éviter

**B.2 (stratégie configurable)** et **E.1 (% par ligne)** ressemblent à de simples
`<select>` mais changent la **sémantique du montant annoncé** (`.target`) affiché
avant le clic. Si l'affichage et la répartition divergent, l'utilisateur paie
autre chose que ce qu'il a lu. À ne traiter qu'avec C.3 (aperçu) en place.
