# Fonctionnalités implémentables — analyse de dépendance

Document établi à partir du code réel (branche `feature/J1`, HEAD = `2adfe0e`).
Chaque proposition indique **de quoi elle dépend** et **quel fichier elle touche**.

---

## 0. État des lieux — ce qui existe

| Brique | Fichier | Statut |
|---|---|---|
| Import CSV + images, tout-ou-rien avec rollback | `services/importService.js` | ✅ |
| Reset des données | `services/resetService.js` | ✅ |
| Dashboard (salaire par genre, par mois) | `services/dashboardService.js` | ✅ |
| CRUD jours fériés (API SpringBoot/SQLite) | `api/joursFeriesApi.js` | ✅ |
| Filtrage salariés (poste, genre, heures) | `services/employeeService.js` | ✅ |
| Génération mensuelle + majoration férié | `services/salaryGenerationService.js` | ✅ J2 |
| Majoration samedi / dimanche | `services/salaryGenerationService.js` | ✅ J3 |
| Dispatch de budget + ordre de paiement | `services/paymentDispatcherService.js` | ✅ |
| Paiement fractionné (encodé dans le `label`) | `api/dolibarr.js` | ✅ |

**Aucun test automatisé n'existe** (`package.json` n'a que `dev`, `build`, `preview`).

---

## 1. Extensions **dépendantes** de la logique J3

Ces fonctionnalités se greffent directement sur `computeInterval()`.
Elles sont ordonnées du moins coûteux au plus structurant.

### 1.1 — Taux distincts samedi / dimanche `[très faible coût]`

L'énoncé impose un champ unique, mais la logique est **déjà prête** : les deux
branches calculent leur `pct` indépendamment. Passer de `weekendMajorationPct` à
`saturdayPct` / `sundayPct` ne change qu'une ligne par branche. Les
accumulateurs `majSamedi` / `majDimanche` existent déjà.

**Dépend de :** branches samedi/dimanche (J3).
**Touche :** `computeInterval` + 1 champ dans `SalarieGenerateNew.vue`.

### 1.2 — Politique de conflit configurable `[faible]`

Le `Math.max(weekPct, holiday ? feriePct : 0)` est **codé en dur**. Un métier
pourrait vouloir : `max` (actuel), `cumul` (100 % + 150 % = 250 %),
`férié prioritaire`, ou `week-end prioritaire`. Extraire cette décision dans une
fonction `resolvePct(weekPct, feriePct, holiday, policy)` rend la règle testable
et paramétrable sans toucher la boucle.

**Dépend de :** règle du maximum (J3).
**Risque :** modifie le comportement par défaut si mal défaulté → garder `max`.

### 1.3 — Borne serveur sur le pourcentage `[très faible]`

Le plafond de 200 % n'existe que dans l'attribut HTML `max="200"`.
`computeInterval` accepte `weekendMajorationPct = 5000` sans broncher. Un
`clamp(0, 200)` dans la logique fermerait l'écart entre la contrainte affichée
et la contrainte réelle.

**Dépend de :** J3. **Touche :** `computeInterval` uniquement.

### 1.4 — Mode « exclusion » du week-end `[moyen]`

Aujourd'hui, case décochée = jour payé au tarif normal. Une variante métier
courante est : case décochée = **jour non payé du tout**. Cela impliquerait de
découper les intervalles autour des week-ends exclus, donc de modifier
`freeIntervals` — et de faire éclater une ligne d'aperçu en plusieurs.

**Dépend de :** J3 **et** `freeIntervals`.
**Attention :** c'est la seule proposition qui **casse** l'invariant
« 1 intervalle libre = 1 ligne ». À traiter comme une fonctionnalité à part
entière, pas comme une option de case à cocher.

### 1.5 — Barème par poste ou par salarié `[moyen]`

`dailyAmount` et les pourcentages sont **globaux** pour toute la génération. Un
technicien et un comptable reçoivent le même salaire journalier. Un barème
`{ job → { daily, feriePct, weekendPct } }` passé à `buildPreview` permettrait de
générer tous les postes en une passe.

**Dépend de :** `buildPreview` (boucle salariés) + `computeInterval` (params).
**Synergie :** rend le filtre « poste » de `employeeService` beaucoup plus utile.

### 1.6 — Jours fériés mobiles `[moyen]`

`isHoliday` ne compare que des dates fixes (`jj/mm` si `recurrent`, sinon
`aaaa/mm/jj`). Pâques, le lundi de Pentecôte ou l'Ascension changent de date
chaque année et ne peuvent **pas** être exprimés avec le modèle actuel : il
faudrait les saisir manuellement année par année. Ajouter un type
`mobile: 'easter+1'` calculé par l'algorithme de Butcher couvrirait le cas.

**Dépend de :** `isHoliday` + modèle de données SpringBoot (`JourFerie`).
**Portée :** touche l'API SpringBoot, pas seulement le front.

### 1.7 — Persistance du détail des majorations `[moyen]`

`runSalaryGeneration` n'envoie que `row.total`. Les champs `majSamedi`,
`majDimanche`, `majFerie`, et les compteurs de jours, sont **perdus** dès la
création du salaire. Impossible, après coup, de justifier un montant ou
d'auditer une génération. Deux voies : les encoder dans le `label` (cohérent
avec l'existant, mais aggrave la dette du §3.1), ou créer des extrafields
Dolibarr sur `/salaries` (propre, mais demande une config serveur).

**Dépend de :** J3 (production des champs) + `createSalary`.

### 1.8 — Génération transversale aux mois `[élevé]`

`freeIntervals` est **borné au mois calendaire** (`daysInMonth`). Un intervalle
libre du 28/02 au 03/03 est nécessairement scindé en deux lignes, sur deux
générations distinctes. Une génération « du … au … » libre supposerait de
réécrire `occupiedDays` et `freeIntervals` sur une plage arbitraire.

**Dépend de :** tout le socle de génération. C'est une refonte, pas un ajout.

---

## 2. Extensions **dépendantes** du moteur de paiement

Indépendantes de J3, elles s'appuient sur `paymentDispatcherService.js`.

### 2.1 — Priorité multi-postes ordonnée `[faible]`

`sortByPriority` ne gère qu'**un seul** poste prioritaire, via un booléen
(`priA = jobA === priorityJob ? 0 : 1`). L'énoncé Alea2 évoque pourtant
« Comptable : first, … » — c'est-à-dire un **ordre**. Remplacer le booléen par
`priorityJobs.indexOf(job)` (avec `-1` → dernier) suffirait.

**Dépend de :** `sortByPriority`. **Aucun impact** sur le dispatch.

### 2.2 — Annulation / correction d'un paiement `[moyen]`

`addPayment` sait ajouter un règlement, rien ne sait en **retirer un**. Une
erreur de saisie est aujourd'hui irréversible sans passer par un reset complet.
Un `removePayment(salaryId, index)` reconstruirait le label sans la ligne visée.

**Dépend de :** `parsePaymentsFromLabel` + `buildLabel` (les deux existent).

### 2.3 — Reprise du budget sur plusieurs mois `[moyen]`

`buildDispatchPlan` filtre sur **un** mois. Le budget non consommé
(`unusedBudget`) est retourné mais jamais réinjecté. Un mode « déborder sur le
mois suivant tant qu'il reste du budget » est une boucle autour de l'existant.

### 2.4 — Génération transactionnelle `[moyen]`

Asymétrie notable : `importService` applique une **loi du tout ou rien** avec
rollback complet. `runSalaryGeneration` et `runPaymentPlan`, eux, s'arrêtent sur
un décompte `ok / ko` et **laissent les créations partielles en place**. Si la
15ᵉ ligne sur 30 échoue, 14 salaires existent, non annulés. Réutiliser le patron
`rollback()` d'`importService` rendrait ces deux opérations atomiques.

**Dépend de :** `api/dolibarr.js`. **Fort gain de fiabilité pour un coût modeste.**

---

## 3. Chantiers **indépendants** (dette technique et transversal)

### 3.1 — Sortir les paiements du `label` `[élevé — le plus structurant]`

C'est la dépendance cachée de tout le projet. Le `label` d'un salaire est la
**source de vérité** des règlements, lu par regex dans **trois modules
distincts** (`dolibarr.js`, `dashboardService.js`, et indirectement
`paymentDispatcherService` via `s.reste`). Conséquences directes :

- `addPayment` fait un **read-modify-write** non atomique (GET puis PUT). Deux
  paiements concurrents sur le même salaire → le second écrase le premier.
- Toute modification du format de label casse silencieusement le parsing.
- Le champ Dolibarr `paye` est envoyé mais ignoré ; le statut « soldé » est
  **déduit** du label.

Migrer vers des extrafields, ou vers de vrais paiements Dolibarr, fiabiliserait
l'ensemble. À défaut, centraliser le parsing dans **un seul** module
(`dolibarr.js` expose déjà `parsePaymentsFromLabel` — `dashboardService` en a sa
propre copie, `extractPayments`, qu'il faudrait supprimer).

### 3.2 — Tests unitaires sur les services purs `[faible coût, fort rendement]`

`salaryGenerationService`, `paymentDispatcherService` et `employeeService` sont
explicitement conçus comme des modules **purs** (« aucune dépendance à Vue ni au
réseau »). Ils sont testables tels quels, sans mock. Ajouter Vitest et couvrir
la table de vérité du §5 du document J3 (samedi férié coché, décoché, `Math.max`,
invariant du total) verrouillerait la non-régression J2 ↔ J3.

**Dépend de : rien.** C'est le meilleur rapport valeur/effort de cette liste.

### 3.3 — Unifier le traitement des fuseaux `[moyen]`

Trois conventions coexistent aujourd'hui :

- `isoToTs` construit un minuit **UTC** ;
- `snapDay` arrondit au minuit UTC le plus proche pour absorber le décalage
  serveur (UTC+1) ;
- `occupiedDays` lit ensuite ce timestamp avec des accesseurs **locaux**
  (`getDate`, `setDate`), alors que `filterByMonth` le lit avec des accesseurs
  **UTC** (`getUTCFullYear`).

Le résultat est correct pour un fuseau positif (UTC+1, UTC+3), mais
`occupiedDays` décalerait d'un jour dans un fuseau négatif. Choisir UTC partout,
ou manipuler des chaînes `YYYY-MM-DD` plutôt que des `Date`, supprimerait la
classe de bug entière.

### 3.4 — Export de l'aperçu et de l'ordre de paiement `[faible]`

Les deux écrans produisent un tableau riche (`preview`, `plan`) affiché puis
perdu au rechargement. Un export CSV/PDF est du pur front, sans dépendance.

### 3.5 — Pagination réelle `[faible]`

`limit: 500` est codé en dur dans **quatre** appels (`getEmployees`,
`getSalaries`, `getUsersMap`, `getUsersById`). Au-delà de 500 utilisateurs ou
salaires, les données sont **silencieusement tronquées** — sans erreur, sans
avertissement. Une boucle de pagination, ou au minimum un avertissement quand
`data.length === 500`, éviterait des résultats faux et inexplicables.

### 3.6 — Rôles et permissions `[moyen]`

Le routeur ne connaît que `requiresAuth` (`router/index.js:132`). Le backoffice
(import, reset, jours fériés) est protégé par une simple authentification, sans
notion de rôle. `resetService` est une opération destructrice accessible à tout
compte authentifié.

---

## 4. Graphe de dépendance résumé

```
socle : occupiedDays / freeIntervals / isHoliday
   │
   ├── J2 : majoration férié
   │      └── J3 : majoration samedi / dimanche  (surcouche non destructive)
   │             ├── 1.1 taux distincts          ← trivial
   │             ├── 1.2 politique de conflit
   │             ├── 1.3 clamp du pct
   │             ├── 1.5 barème par poste
   │             └── 1.7 persistance du détail
   │
   ├── 1.4 exclusion week-end   ← touche AUSSI freeIntervals (rupture d'invariant)
   ├── 1.6 jours fériés mobiles ← touche AUSSI l'API SpringBoot
   └── 1.8 génération multi-mois ← refonte du socle

label = source de vérité des paiements
   ├── dolibarr.js (parsePaymentsFromLabel)
   ├── dashboardService.js (extractPayments — duplicata)
   └── paymentDispatcherService.js (via s.reste)
          ├── 2.1 priorité multi-postes
          ├── 2.2 annulation de paiement
          └── 2.3 budget multi-mois
   ⇒ 3.1 : sortir les paiements du label débloque et fiabilise tout ce sous-arbre

indépendants : 3.2 tests · 3.4 export · 3.5 pagination · 3.6 rôles
```

---

## 5. Recommandation d'ordre

Si l'objectif est la **valeur démontrable à court terme** : 1.1 (taux distincts),
2.1 (priorité ordonnée), 3.4 (export). Trois fonctionnalités visibles, aucune
touchant au socle.

Si l'objectif est la **solidité** : 3.2 (tests) d'abord — les services purs sont
déjà écrits pour ça et rien ne verrouille aujourd'hui la compatibilité J2 ↔ J3 —
puis 2.4 (génération transactionnelle), puis 3.1 (sortir les paiements du label),
qui est le prérequis silencieux de presque tout le reste.

Les deux propositions à ne **pas** sous-estimer malgré une description courte
sont 1.4 (rompt l'invariant « 1 intervalle = 1 ligne ») et 1.8 (refonte du
découpage). Toutes deux ressemblent à des options de formulaire et sont en
réalité des changements de modèle.
