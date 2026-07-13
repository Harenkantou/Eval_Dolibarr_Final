# Aléa J3 — Logique de majoration Samedi / Dimanche

Document de référence décrivant **la logique réellement implémentée** dans
`src/services/salaryGenerationService.js` (fonction `computeInterval`), telle
qu'elle est consommée par `src/views/frontoffice/SalarieGenerateNew.vue`.

---

## 1. Entrées de la logique

La génération reçoit un objet de paramètres unique, construit depuis le
formulaire :

| Paramètre | Type | Origine (formulaire) | Rôle |
|---|---|---|---|
| `month`, `year` | number | Mois / Année | Période générée |
| `dailyAmount` | number | Salaire / jour (€) | Base de calcul journalière |
| `majorationPct` | number | Majoration jour férié (%) | Majoration férié (héritée de J2) |
| `includeSaturday` | boolean | Case « Inclure les samedis » | Active la majoration sur les samedis |
| `includeSunday` | boolean | Case « Inclure les dimanches » | Active la majoration sur les dimanches |
| `weekendMajorationPct` | number | Majoration week-end (%) | **Un seul champ** partagé samedi + dimanche, borné à 200 % |
| `joursFeries` | array | API `listJoursFeries()` | `[{ dateFerie: 'YYYY-MM-DD', recurrent }]` |

Le champ « Majoration week-end » est désactivé dans l'interface tant qu'aucune
des deux cases n'est cochée (`:disabled="!includeSaturday && !includeSunday"`).

---

## 2. Principe directeur : surcouche non destructive de J2

La règle centrale est que **cocher une case ajoute une majoration, elle n'en
retire jamais**.

- Cases **décochées** → un samedi et un dimanche sont payés **exactement comme
  un jour de semaine**. Le résultat est bit à bit identique à celui de J2 : pas
  de découpage d'intervalle, pas d'exclusion de jour, pas de recalcul.
- Case **cochée** → le jour concerné reçoit **en plus** la majoration
  `weekendMajorationPct`.

Concrètement, les deux cases n'agissent **que** comme conditions d'entrée dans
les branches samedi / dimanche. Aucune branche ne supprime un jour du total.

---

## 3. Classification d'un jour

Pour chaque jour `d` d'un intervalle libre, la logique évalue trois prédicats
indépendants :

```js
const holiday  = isHoliday(d, month, year, joursFeries)
const saturday = isSaturday(d, month, year)   // new Date(...).getDay() === 6
const sunday   = isSunday(d, month, year)     // new Date(...).getDay() === 0
```

`isHoliday` gère deux natures de jour férié :

- `recurrent === true` → comparaison sur **mois + jour** uniquement (l'année est ignorée) ;
- `recurrent === false` → comparaison sur **année + mois + jour**.

---

## 4. Ordre d'évaluation (le point clé)

Les branches sont testées dans cet ordre strict, et **chaque branche est
terminale** (`continue`) :

1. **`saturday && includeSaturday`** → branche samedi
2. **`sunday && includeSunday`** → branche dimanche
3. **sinon** → branche J2 (férié ou normal)

Conséquence directe : un samedi **férié** dont la case est cochée n'entre
**jamais** dans la branche férié. Il est compté comme samedi, et c'est la
branche samedi qui absorbe la majoration férié via le `Math.max`. Il n'y a donc
aucun risque de double comptage : chaque jour incrémente exactement un compteur
(`normal`, `ferie`, `samedi` ou `dimanche`) et contribue exactement une fois au
total.

Symétriquement, un samedi férié dont la case est **décochée** retombe en branche
3 et reste un jour férié majoré à `majorationPct` — le comportement J2 est
préservé.

---

## 5. Règle du maximum (férié vs week-end)

C'est la traduction de l'exigence « samedi férié coché : 100 et 150 → on prend 150 ».

Dans les branches samedi et dimanche :

```js
const pct   = Math.max(weekPct, holiday ? feriePct : 0)
const extra = daily * pct / 100
total += daily + extra
```

Les deux majorations **ne se cumulent pas** : on retient la plus avantageuse.

| Jour | Coché ? | Férié ? | `weekPct` | `feriePct` | % appliqué |
|---|---|---|---|---|---|
| Samedi | oui | non | 100 | 150 | **100** |
| Samedi | oui | oui | 100 | 150 | **150** (max) |
| Samedi | oui | oui | 200 | 150 | **200** (max) |
| Samedi | non | oui | 100 | 150 | **150** (branche J2) |
| Samedi | non | non | 100 | 150 | **0** (jour normal) |
| Dimanche | oui | non | 100 | 150 | **100** |
| Lundi | — | oui | 100 | 150 | **150** |
| Lundi | — | non | 100 | 150 | **0** |

Le `holiday ? feriePct : 0` garantit qu'un week-end non férié ne récupère pas
accidentellement le taux férié : le max est alors pris contre `0`.

---

## 6. Formule du montant

Pour un jour donné, avec `daily = dailyAmount` :

```
montant_jour = daily + daily × pct_effectif / 100
```

où `pct_effectif` vaut :

- `Math.max(weekPct, holiday ? feriePct : 0)` pour un week-end coché ;
- `feriePct` pour un jour férié non couvert par une case cochée ;
- `0` pour un jour normal.

Le montant d'un intervalle est la somme des montants de ses jours, arrondi à
2 décimales en **fin** de boucle uniquement (`round2`), pour éviter
l'accumulation d'erreurs d'arrondi intermédiaires.

---

## 7. Déduction individuelle samedi / dimanche

L'énoncé impose de pouvoir « déduire la majoration pour samedi individuellement
et de même pour dimanche ». Bien qu'un **seul** champ de saisie existe, la
logique accumule les majorations dans **trois accumulateurs distincts** :

| Accumulateur | Alimenté par |
|---|---|
| `majFerie` | branche J2 férié |
| `majSamedi` | branche samedi (uniquement l'`extra`, hors base journalière) |
| `majDimanche` | branche dimanche (uniquement l'`extra`, hors base journalière) |

Chacun ne reçoit que la **partie majoration** (`extra`), jamais le salaire de
base. Les compteurs `normal`, `ferie`, `samedi`, `dimanche` comptent les jours
correspondants.

L'objet retourné par `computeInterval` :

```js
{
  total,                          // montant final arrondi
  normal, ferie, samedi, dimanche,   // nombres de jours par catégorie
  majFerie, majSamedi, majDimanche   // montants de majoration, arrondis
}
```

Ces trois montants sont affichés colonne par colonne dans le tableau d'aperçu,
ce qui rend la majoration samedi et la majoration dimanche lisibles et
vérifiables séparément.

**Invariant :** `total = daily × (normal + ferie + samedi + dimanche) + majFerie + majSamedi + majDimanche`
(aux arrondis près).

---

## 8. Articulation avec les intervalles libres

La majoration week-end n'intervient **qu'après** le découpage en intervalles
libres, qui reste inchangé par rapport à J2 :

1. `occupiedDays(userId, salaries, month, year)` → jours du mois déjà couverts
   par un salaire existant.
2. Si l'ensemble est **vide**, le salarié n'a aucun salaire ce mois-ci → le mois
   entier est libre, une ligne `1 → dernier jour` est générée.
   (Règle J4 ; en J2/J3 ce cas ne générait **rien**.)
3. `freeIntervals(...)` → liste des trous `[{ start, end }]`.
4. Pour chaque trou : `computeInterval(trou, params)` → 1 ligne = 1 intervalle
   = 1 montant.

Les cases samedi / dimanche **ne modifient pas** ce découpage : elles n'excluent
aucun jour, elles ne font que changer le tarif appliqué à certains jours à
l'intérieur d'un intervalle déjà déterminé.

---

## 9. Pseudo-code condensé

```
pour chaque jour d de [start .. end] :
    holiday ← estFerie(d)

    si estSamedi(d) et includeSaturday :
        pct   ← max(weekPct, holiday ? feriePct : 0)
        extra ← daily × pct / 100
        total ← total + daily + extra
        majSamedi ← majSamedi + extra
        samedi ← samedi + 1
        jour suivant

    si estDimanche(d) et includeSunday :
        pct   ← max(weekPct, holiday ? feriePct : 0)
        extra ← daily × pct / 100
        total ← total + daily + extra
        majDimanche ← majDimanche + extra
        dimanche ← dimanche + 1
        jour suivant

    si holiday :
        extra ← daily × feriePct / 100
        total ← total + daily + extra
        majFerie ← majFerie + extra
        ferie ← ferie + 1
    sinon :
        total ← total + daily
        normal ← normal + 1
```

---

## 10. Exemple chiffré

Paramètres : `daily = 50 €`, `feriePct = 150`, `weekPct = 100`,
`includeSaturday = true`, `includeSunday = false`.
Intervalle : vendredi 1 → lundi 4. Le samedi 2 est férié.

| Jour | Nature | Branche | pct | Montant |
|---|---|---|---|---|
| Ven. 1 | normal | J2 normal | 0 | 50,00 |
| Sam. 2 | samedi + férié, coché | samedi | max(100, 150) = **150** | 125,00 |
| Dim. 3 | dimanche, **non coché** | J2 normal | 0 | 50,00 |
| Lun. 4 | normal | J2 normal | 0 | 50,00 |

Résultat : `total = 275,00`, `normal = 3`, `ferie = 0`, `samedi = 1`,
`dimanche = 0`, `majSamedi = 75,00`, `majDimanche = 0`, `majFerie = 0`.

Vérification de l'invariant : `50 × 4 + 75 = 275`. ✔

---

## 11. Persistance

`runSalaryGeneration` (`src/api/dolibarr.js`) ne connaît que `row.total` : il
crée un salaire Dolibarr par ligne d'aperçu, avec `amount = row.total` et les
dates `start` / `end` de l'intervalle. Le détail des majorations
(`majSamedi`, `majDimanche`, `majFerie`) est donc une information **d'aperçu et
de contrôle**, pas une donnée persistée.
