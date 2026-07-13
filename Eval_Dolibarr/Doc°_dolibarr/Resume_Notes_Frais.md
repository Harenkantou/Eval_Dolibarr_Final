# Guide Complet : Module Notes de frais dans Dolibarr 23

## Contexte (Évaluation P17 - Juin 2026)
Ce guide couvre la configuration et la gestion des **Notes de frais** dans le cadre du module GRH (Ressources humaines) de Dolibarr.

---

## 1. Prérequis avant de gérer les notes de frais

| Étape | Action | Pourquoi ? |
|-------|--------|------------|
| **1** | Activer le module **Ressources humaines** | Le menu RH doit être visible. |
| **2** | Activer le module **Notes de frais** | Les fonctionnalités de notes de frais doivent être disponibles. |
| **3** | Avoir un **salarié** (ou utiliser le compte admin) | Une note de frais doit être associée à un salarié. |
| **4** | Configurer les **catégories** de notes de frais | Types de dépenses (Restauration, Transport, etc.). |

---

## 2. Configuration des catégories de notes de frais

**Chemin :** `Configuration` → `Dictionnaires` → `Type de notes de frais`

### Catégories par défaut

| Catégorie | Explication |
|-----------|-------------|
| **Restauration** | Repas, déjeuners d'affaires, etc. |
| **Hébergement** | Hôtels, nuitées, etc. |
| **Transport** | Billets de train, avion, taxi, etc. |
| **Essence** | Carburant pour véhicule. |
| **Péage** | Autoroutes, tunnels, etc. |
| **Téléphone** | Appels professionnels, forfaits. |
| **Fournitures de bureau** | Petit matériel, papeterie, etc. |

---

## 3. Création d'une note de frais

**Chemin :** `RH` → `Notes de frais` → `Nouveau`

### 3.1 En-tête de la note de frais

La note de frais est composée de deux parties :
1. **Un en-tête** (informations générales)
2. **Des lignes de frais** (détail des dépenses)

### Formulaire d'en-tête

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Utilisateur** | `SuperAdmin` | Salarié qui demande le remboursement. |
| **Date début** | `24/06/2026` | Date de début de la période des frais. |
| **Date fin** | `24/06/2026` | Date de fin de la période des frais. |
| **Sera approuvé par** | `SuperAdmin` | Manager qui validera la note. |
| **Note (publique)** | `Déjeuner d'affaires` | Description visible par le validateur. |
| **Note (privée)** | `Client Dupont` | Commentaire interne (non visible par le validateur). |

### Actions

| Bouton | Action |
|--------|--------|
| **CRÉER NOTE DE FRAIS** | Crée la note en statut "Brouillon". |
| **ANNULER** | Annule la création. |

---

## 4. Ajout de lignes de frais

**Chemin :** Depuis la fiche de la note de frais → Tableau des lignes

### 4.1 Champs d'une ligne de frais

| Colonne | Exemple | Explication |
|---------|---------|-------------|
| **Date** | `24/06/2026` | Date de la dépense. |
| **Type** | `Restauration` | Catégorie de la dépense (menu déroulant). |
| **Description** | `Déjeuner d'affaires avec client` | Détail de la dépense. |
| **TVA** | `20` | Taux de TVA applicable (en %). |
| **P.U. HT** *(Prix Unitaire Hors Taxe)* | `45.50` | Montant hors taxes. |
| **P.U. TTC** *(Prix Unitaire Toutes Taxes Comprises)* | `54.60` | Montant TTC (calculé automatiquement ou saisi). |
| **Qté** *(Quantité)* | `1` | Nombre d'unités. |

### 4.2 Validation d'une ligne

1. Remplir tous les champs.
2. Cliquer sur le bouton **"Ajouter"** ou **"Valider"** (icône **+** ou **V**).
3. La ligne apparaît dans le tableau.
4. Répéter pour ajouter plusieurs lignes.

---

## 5. Exemple de note de frais complète

### En-tête

| Champ | Valeur |
|-------|--------|
| Utilisateur | SuperAdmin |
| Date début | 24/06/2026 |
| Date fin | 24/06/2026 |
| Approbateur | SuperAdmin |
| Note publique | Déjeuner d'affaires et frais de transport |

### Lignes de frais

| Date | Type | Description | TVA | HT | TTC | Qté |
|------|------|-------------|-----|----|-----|-----|
| 24/06/2026 | Restauration | Déjeuner d'affaires | 20% | 45.50 | 54.60 | 1 |
| 24/06/2026 | Transport | Essence - Trajet client | 20% | 65.00 | 78.00 | 1 |
| **TOTAL** | | | | **110.50** | **132.60** | 2 |

---

## 6. Workflow de validation d'une note de frais

### 6.1 Statuts possibles

| Statut | Signification |
|--------|---------------|
| **Brouillon** | Note en cours de rédaction (non soumise). |
| **Validé** (ou En attente) | Note soumise, en attente du manager. |
| **Approuvé** | Note validée par le manager. |
| **Payé** | Note remboursée au salarié. |
| **Refusé** | Note rejetée. |
| **Annulé** | Note annulée par le salarié. |

### 6.2 Procédure de validation

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Créer la note de frais | Statut : **Brouillon** |
| 2 | Ajouter les lignes de frais | Détail des dépenses |
| 3 | Cliquer sur **"VALIDER"** | Statut : **Validé** (En attente) |
| 4 | Cliquer sur **"Approuver"** | Statut : **Approuvé** ✅ |

---

## 7. Consultation des notes de frais

### 7.1 Liste des notes de frais

**Chemin :** `RH` → `Notes de frais` → `Liste`

| Colonne | Explication |
|---------|-------------|
| **Réf.** | Numéro de la note (ex: `EX-2026-001`) |
| **Salarié** | Nom du demandeur |
| **Libellé** | Description de la note |
| **Date** | Date de la note |
| **Montant HT** | Total hors taxes |
| **Montant TTC** | Total toutes taxes comprises |
| **Statut** | Brouillon / Validé / Approuvé / Payé / Refusé |
| **Approbateur** | Manager qui a validé |

### 7.2 Filtres par statut

Dans le menu `Notes de frais`, vous pouvez filtrer par statut :
- Brouillon
- Validé
- Approuvé
- Payé
- Annulé
- Refusé

---

## 8. Statistiques des notes de frais

**Chemin :** `RH` → `Notes de frais` → `Statistiques`

### Indicateurs disponibles

| Indicateur | Explication |
|------------|-------------|
| **Total des notes** | Nombre total de notes soumises. |
| **Total des montants** | Montant total des dépenses (HT et TTC). |
| **Par catégorie** | Répartition par type (Restauration, Transport, etc.). |
| **Par mois** | Évolution des dépenses dans le temps. |
| **Par statut** | Répartition par statut (Approuvées, Refusées, etc.). |

---

## 9. Traçabilité et historique

**Chemin :** Depuis la fiche de la note → Onglet `Événements/Agenda`

### Événements enregistrés

| Événement | Explication |
|-----------|-------------|
| **Création** | Note créée avec date, heure et utilisateur. |
| **Validation** | Note soumise (date, heure, utilisateur). |
| **Approbation** | Note approuvée (date, heure, approbateur). |
| **Paiement** | Note payée (date, heure). |
| **Refus** | Note refusée (date, heure, motif). |

---

## 10. Bonnes pratiques pour l'évaluation

| Action | Pourquoi ? |
|--------|------------|
| Prendre des **captures d'écran** de chaque étape | Preuve du travail réalisé. |
| Ajouter **au moins 2 lignes de frais** | Tester les fonctionnalités de détail. |
| Tester le **workflow complet** (Brouillon → Validé → Approuvé) | Vérifier le cycle de vie d'une note. |
| Consulter les **statistiques** | Vérifier les indicateurs disponibles. |
| Consulter l'**historique** des événements | Confirmer la traçabilité des actions. |
| **Téléverser un justificatif** | Tester la fonction de pièce jointe (si disponible). |

---

## 11. Résumé des actions réalisées

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Activer le module Notes de frais | Module disponible dans le menu RH. |
| 2 | Créer une note de frais (en-tête) | Note en statut "Brouillon". |
| 3 | Ajouter des lignes de frais (au moins 2) | Détail des dépenses. |
| 4 | Soumettre la note (bouton VALIDER) | Note en statut "Validé". |
| 5 | Approuver la note (bouton Approuver) | Note en statut "Approuvé". |
| 6 | Consulter la liste des notes | Toutes les notes sont affichées. |
| 7 | Consulter les statistiques | Indicateurs disponibles. |
| 8 | Consulter l'historique | Événements tracés. |

---

## 12. Conclusion sur le module Notes de frais

> Le module Notes de frais de Dolibarr permet une **gestion complète des dépenses professionnelles** : création, détail des lignes, soumission, validation, consultation des statistiques et traçabilité via l'historique.
>
> **Points positifs :**
> - Structure claire (en-tête + lignes de frais).
> - Workflow de validation intuitif (Brouillon → Validé → Approuvé).
> - Possibilité d'ajouter plusieurs catégories de dépenses.
> - Traçabilité complète des actions (création, validation, approbation).
> - Statistiques disponibles pour analyse.
>
> **Limites constatées :**
> - La gestion des justificatifs (pièces jointes) nécessite une configuration supplémentaire.
> - Les catégories de notes de frais sont paramétrables via les dictionnaires.
>
> **Statut du test :** ✅ Workflow opérationnel, lignes de frais ajoutées, validation et approbation réussies, statistiques consultables.

Titre   : Déplacement client Lyon - Juin 2026
Du      : 16/06/2026
Au      : 18/06/2026

Train Paris-Lyon AR            : 120.00 € TTC (Déplacement)
Hôtel Mercure 2 nuits          : 180.00 € TTC (Hébergement)
Déjeuner client                : 35.50 € TTC  (Repas)
Déjeuner de travail            : 28.00 € TTC  (Repas)
Taxi gare vers client          : 22.00 € TTC  (Transport)
Fournitures présentation       : 45.00 € TTC  (Fournitures)
─────────────────────────────────────────────
TOTAL                          : 430.50 € TTC

---

*Document rédigé dans le cadre de l'évaluation J0 - 24 juin 2026 - P17*