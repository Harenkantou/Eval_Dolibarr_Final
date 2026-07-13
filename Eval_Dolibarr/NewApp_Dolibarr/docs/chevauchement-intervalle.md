# Règle : chevauchement d'intervalle

## 1. Le problème

Un salaire existant peut **déborder du mois** qu'on veut générer.

Exemple : un salaire couvre **15/06/2024 → 20/07/2024**.

- Quand on génère **juin 2024**, les jours **15 → 30 juin** sont déjà occupés.
- Quand on génère **juillet 2024**, les jours **01 → 20 juillet** sont déjà occupés.

La logique actuelle (`occupiedDays`) raisonne en « numéro de jour du mois » et filtre au passage. On veut la rendre **explicite** : calculer la **portion du salaire qui chevauche le mois cible**, puis n'occuper que ces jours-là. Il faut aussi gérer :

- deux salaires existants qui **se chevauchent entre eux** (ex. `15/06→20/07` et `18/06→25/06`) → on prend l'**union** des jours ;
- un salaire **entièrement hors du mois** → aucun jour occupé.

## 2. Le flux

```
buildPreview(employees, salaries, params)
│
├─ pour chaque salarié filtré :
│   │
│   └─ freeIntervals(userId, salaries, month, year)
│       │
│       ├─ monthBounds(month, year) ........... plage [01 → dernier jour] du mois
│       │
│       ├─ pour chaque salaire du salarié :
│       │   └─ intersectRange(salaireRange, monthBounds)   ← CŒUR DU CHEVAUCHEMENT
│       │        │  renvoie la portion qui chevauche le mois, ou null
│       │        └─ occupiedDays += jours de cette portion   (Set = union automatique)
│       │
│       └─ complément du Set sur [1 → dernier jour] = intervalles LIBRES
│           (si aucun jour occupé → [] : rien à générer)
│
└─ computeInterval(interval, params) pour chaque intervalle libre
    → 1 intervalle = 1 ligne = 1 montant (fériés majorés)
```

Point clé : **rien ne change** en aval (calcul du montant, majoration, aperçu). Le chevauchement se règle **uniquement** dans le calcul des jours occupés, via une fonction d'intersection de plages.

## 3. Les fonctions à écrire

Tout se passe dans `src/services/salaryGenerationService.js`.

### 3.1 `toRange(salary)` — normaliser un salaire en plage de dates

```
Entrée : salaire { datesp, dateep }  (timestamps Unix en secondes)
Sortie : { start: Date, end: Date }  (à minuit, pour comparer par jour)
```

Convertit `datesp`/`dateep` en objets `Date` normalisés à 00:00 (évite les décalages d'heure).

### 3.2 `monthBounds(month, year)` — bornes du mois cible

```
Entrée : month (1..12), year
Sortie : { start: Date(1er du mois), end: Date(dernier jour du mois) }
```

S'appuie sur `daysInMonth(month, year)` déjà existant.

### 3.3 `rangesOverlap(a, b)` — deux plages se chevauchent-elles ? (booléen)

```
Entrée : a = { start, end }, b = { start, end }
Sortie : true si a.start <= b.end ET b.start <= a.end
```

Utile pour les gardes et les tests. C'est la définition mathématique du chevauchement.

### 3.4 `intersectRange(a, b)` — portion commune de deux plages ⭐

C'est **la** fonction du chevauchement.

```
Entrée : a = { start, end }, b = { start, end }
Sortie : { start: max(a.start, b.start), end: min(a.end, b.end) }
         ou null s'il n'y a pas de chevauchement
```

Exemple `a = 15/06→20/07`, `b = 01/06→30/06` (juin) → `15/06→30/06`.

### 3.5 `occupiedDays(...)` — À MODIFIER

Au lieu de parcourir jour par jour tout le salaire, on :

1. calcule `bounds = monthBounds(month, year)` ;
2. pour chaque salaire du salarié : `inter = intersectRange(toRange(salaire), bounds)` ;
3. si `inter !== null`, on ajoute au `Set` les **numéros de jour** de `inter.start.getDate()` à `inter.end.getDate()`.

Le `Set` gère automatiquement l'**union** quand deux salaires se chevauchent.

### 3.6 `freeIntervals(...)` — inchangée

Elle continue de calculer le complément du `Set` sur `[1 → daysInMonth]`. Le garde `if (occ.size === 0) return []` reste valable.

## 4. Signatures finales (résumé)

```js
export function toRange(salary)                 // { start:Date, end:Date }
export function monthBounds(month, year)        // { start:Date, end:Date }
export function rangesOverlap(a, b)             // boolean
export function intersectRange(a, b)            // { start, end } | null
export function occupiedDays(userId, salaries, month, year)  // Set<number>  (MODIFIÉE)
export function freeIntervals(userId, salaries, month, year) // [{start,end}] (inchangée)
```

## 5. Cas de test à couvrir

| Salaire existant       | Mois généré | Jours occupés attendus | Intervalles libres attendus |
|------------------------|-------------|------------------------|-----------------------------|
| 15/06 → 20/07/2024     | Juin 2024   | 15 → 30                | 1 → 14                      |
| 15/06 → 20/07/2024     | Juillet 2024| 1 → 20                 | 21 → 31                     |
| 15/06→20/07 + 18/06→25/06 | Juin 2024| 15 → 30 (union)        | 1 → 14                      |
| 01/05 → 10/05/2024     | Juin 2024   | ∅ (hors mois)          | [] (rien à générer)         |
| 01/06 → 30/06/2024     | Juin 2024   | 1 → 30                 | [] (mois plein)             |
