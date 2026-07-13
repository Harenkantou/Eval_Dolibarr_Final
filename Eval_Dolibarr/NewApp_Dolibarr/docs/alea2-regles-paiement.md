# Alea2 — Règles de gestion : génération d'un ordre de paiement

Page **« Générer un ordre de paiement »** (`PaymentGenerate.vue`).
Logique métier dans `paymentDispatcherService.js`, orchestration API dans `api/dolibarr.js`.

## 1. Objectif

À partir d'un **montant global à répartir**, produire un **ordre de paiement** :
la liste ordonnée des salaires à régler, avec le montant affecté à chacun, en
respectant une priorité de poste et l'ancienneté des salaires.

## 2. Entrées (saisies par l'utilisateur)

| Champ | Rôle |
|---|---|
| **Montant** | Budget global à répartir (€). |
| **Mois + Année** | Filtre 1 : période des salaires concernés (ex. Février 2024). |
| **Poste prioritaire** | Poste servi en premier (ex. Comptable, Technicien…). Optionnel. |

## 3. Salaires concernés (constitution de la base)

Un salaire entre dans l'ordre de paiement si **toutes** ces conditions sont vraies :

1. **Filtre mois/année** — sa **date de début** (`datesp`) tombe dans le mois+année
   choisi. Règle retenue = **date de début** (et non chevauchement de période) :
   un salaire du 28/01 → 05/02 n'est **pas** un salaire de février.
2. **Non soldé** — son **reste à payer** est strictement positif (`reste > 0`).

Le **reste** est calculé en tenant compte des **paiements déjà importés** :
les règlements sont encodés dans le `label` du salaire par l'import
(`… — Payé: X€/Y€ (JJ/MM/AAAA: montant€ | …)`) et relus au chargement.
Ainsi `reste = montant − somme des paiements (import inclus)`.

## 4. Ordre de paiement (tri)

Les salaires concernés sont triés dans cet ordre de priorité **décroissante** :

1. **Poste prioritaire d'abord** — les salaires des salariés au poste choisi
   passent avant tous les autres.
2. **Date de début la plus ancienne** — à priorité égale, le salaire qui commence
   le plus tôt est payé en premier (ex. 01, 05, 10 → 01 d'abord).
3. **Nom du salarié** (ordre alphabétique) — départage final déterministe.

## 5. Répartition du budget

On parcourt les salaires **dans l'ordre ci-dessus** et on affecte à chacun le
**maximum possible** sans dépasser son reste ni le budget restant :

```
paiement = min(budget_restant, reste_du_salaire)
```

- Un salaire est **soldé** si le paiement couvre tout son reste.
- Un salaire est **partiel** si le budget restant ne couvre qu'une partie du reste
  (règle « s'il reste 300 à payer et qu'on a 100, on paie ce 100 »).
- Quand le budget est épuisé, les salaires suivants sont **« Non financés »**
  (paiement = 0).

### Listing complet

L'ordre de paiement liste **TOUS** les salaires concernés, y compris ceux
au-delà du budget (affichés à 0 € / « Non financé »). Le budget détermine
**combien** chacun reçoit, pas **combien** de salaires sont listés.

> Un paiement de **0 € n'est jamais envoyé à l'API** : les lignes non financées
> sont informatives (elles montrent ce qu'il resterait à financer).

## 6. Affichage du résultat (bas de page)

**Récapitulatif par employé concerné** (agrégé si un employé a plusieurs
salaires payés dans l'opération) :

- **Employé concerné** (nom + poste)
- **Salaire total à payer** — somme des montants des salaires concernés
- **Salaire déjà payé** — cumul réglé (import + paiement de cette opération)

## 7. Cohérence des données (notes techniques)

- `user.id` est une **chaîne** (`"2"`) alors que `salaire.fk_user` est un
  **nombre** (`parseInt`). Toute association salaire ↔ employé (nom, poste) doit
  normaliser le type (`String(...)` des deux côtés) sous peine de casser le tri
  par poste et l'affichage des noms.
- Les timestamps `datesp`/`dateep` sont à **minuit UTC** : le filtrage par
  mois doit rester cohérent (UTC) avec le reste de l'application.

## 8. Scénario de recette (résultat attendu = 11 opérations)

```
Reset → Import (4 employés, 8 salaires)
Jours fériés : 14/02/2024 et 22/02/2024
Insertion salaire multiple : heures 38–42, 13/02→20/02/2024, 200 €   (→ Rajenja)
Génération mensuelle : Technicien, Février 2024, 20 €/j, majoration 100 %
Génération paiement : poste prioritaire = Technicien, Février 2024, budget 1600 €
```

**Base février 2024 = 11 salaires non soldés :**

| Poste | Nb | Reste total |
|---|---|---|
| Technicien (Rasoabe, Rajenja) | 10 | 1 550 € |
| Comptable (Rakotobe) | 1 | 300 € |

**Répartition de 1 600 € :** les 10 Technicien sont soldés (1 550 €), les 50 €
restants vont au Comptable en **partiel** → **11 opérations**, total payé 1 600 €.
