# Guide Complet : Module Entrepôt dans Dolibarr 23

## Contexte (Évaluation P17 - Juin 2026)
Ce guide couvre la configuration et la gestion des **Entrepôts** et des **Mouvements de stock** dans le cadre du module GRH (Ressources Humaines) de Dolibarr.

---

## 1. Prérequis avant de gérer un entrepôt

| Étape | Action | Pourquoi ? |
|-------|--------|------------|
| **1** | Avoir un **produit** créé (ex: `PC-001`) | L'entrepôt sert à stocker des produits. |
| **2** | Avoir **initialisé le stock** avec une entrée | Pour avoir des quantités à gérer. |
| **3** | Activer le module **Entrepôts** | Le menu "Entrepôts" doit être visible. |

---

## 2. Création d’un entrepôt

**Chemin :** Menu `Stock` → `Entrepôts` → `Nouvel entrepôt`

### Champs à remplir

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Libellé** | `Entrepôt Principal - Paris` | Nom de l'entrepôt (obligatoire). |
| **Adresse** | `1 Rue de l'Évaluation` | Adresse postale complète. |
| **Code postal** | `75001` | Code postal. |
| **Ville** | `Paris` | Ville. |
| **Pays** | `France` | Pays (sélectionner dans la liste). |
| **Statut** | `Actif` | L'entrepôt est utilisable. |

### Champs optionnels

| Champ | Exemple | Utilité |
|-------|---------|---------|
| **Téléphone** | `01 23 45 67 89` | Contact de l'entrepôt. |
| **Email** | `stock@entreprise.fr` | Contact email. |
| **Description** | `Entrepôt principal pour les produits informatiques` | Infos complémentaires. |

### Validation
1. Cliquer sur **"Créer"** ou **"Enregistrer"**
2. L'entrepôt apparaît dans la liste des entrepôts.

---

## 3. Association d'un produit à un entrepôt

**Chemin :** Fiche produit → Onglet `Stock`

1. Dans le champ **"Entrepôt par défaut"**, sélectionner l'entrepôt créé.
2. Cliquer sur **"Enregistrer"**.

➡️ Le produit est maintenant associé à un lieu de stockage physique.

---

## 4. Visualisation du stock dans l'entrepôt

**Chemin :** Menu `Stock` → `Entrepôts` → `Liste` → Cliquer sur l'entrepôt

La page affiche :

| Section | Contenu | Explication |
|---------|---------|-------------|
| **Informations générales** | Nom, adresse, contact | Données de l'entrepôt. |
| **Produits dans l'entrepôt** | Liste des produits avec leurs quantités | Vue synthétique du stock. |
| **Mouvements récents** | Historique des entrées/sorties | Traçabilité des opérations. |

---

## 5. Gestion des mouvements de stock

### 5.1 Principe général

Tous les mouvements de stock se font via la fonction **"Corriger le stock"** dans la fiche produit.

| Type de mouvement | Saisie dans "Nombre de pièces" | Effet sur le stock |
|-------------------|--------------------------------|---------------------|
| **Entrée** (réception) | Nombre **POSITIF** (ex: `5`) | Le stock **augmente**. |
| **Sortie** (vente, utilisation) | Nombre **NÉGATIF** (ex: `-3`) | Le stock **diminue**. |

### 5.2 Procédure pour une entrée de stock

1. Fiche produit → Onglet `Stock` → `Corriger le stock`

| Champ | Exemple |
|-------|---------|
| **Entrepôt** | `Entrepôt Principal - Paris` |
| **Prix d'achat unitaire** | `400.00` |
| **Libellé du mouvement** | `Achat initial - Stock de départ` |
| **Nombre de pièces** | `10` (POSITIF) |

➡️ Stock : `0` → `10`

### 5.3 Procédure pour une sortie de stock

1. Fiche produit → Onglet `Stock` → `Corriger le stock`

| Champ | Exemple |
|-------|---------|
| **Entrepôt** | `Entrepôt Principal - Paris` |
| **Prix d'achat unitaire** | `400.00` |
| **Libellé du mouvement** | `Vente client - Facture #F2026-001` |
| **Nombre de pièces** | `-3` (NÉGATIF) |

➡️ Stock : `10` → `7`

---

## 6. Transfert de stock entre entrepôts

**Chemin :** Menu `Stock` → `Transfert de stock en masse`

### 6.1 Créer un second entrepôt

1. Créer un deuxième entrepôt :
   - **Libellé** : `Entrepôt Secondaire - Lyon`
   - **Adresse** : `5 Rue de la Logistique, 69001 Lyon`

### 6.2 Effectuer un transfert

| Champ | Exemple |
|-------|---------|
| **Produit** | `PC-001` |
| **Entrepôt source** | `Entrepôt Principal - Paris` |
| **Entrepôt destination** | `Entrepôt Secondaire - Lyon` |
| **Quantité** | `2` |

➡️ Résultat :
- Paris : `5` unités (7 - 2)
- Lyon : `2` unités

---

## 7. Indicateurs clés dans l'onglet Stock

| Champ | Explication | Exemple |
|-------|-------------|---------|
| **Stock physique** | Quantité réelle en stock. | `7` |
| **Stock virtuel** | Stock prévisionnel (commandes en cours). | `0` |
| **Dernier mouvement** | Dernière opération effectuée. | `Vente client - Facture #F2026-001` |
| **Prix moyen pondéré (PMP)** | Coût moyen des entrées en stock. | `400.00` |
| **Valorisation achat (PMP)** | Valeur totale du stock au prix d'achat. | `2 800.00 €` (7 × 400) |
| **Limite stock pour alerte** | Seuil de réapprovisionnement. | `5` |
| **Stock désiré optimal** | Objectif de stock idéal. | `20` |

---

## 8. Journal des mouvements (traçabilité)

Tous les mouvements sont enregistrés automatiquement :

| Information | Exemple |
|-------------|---------|
| **Date** | `24/06/2026 18:30` |
| **Type** | `Entrée` / `Sortie` |
| **Quantité** | `+10` / `-3` |
| **Libellé** | `Achat initial` |
| **Utilisateur** | `SuperAdmin` |

➡️ **Utilité :** Audit, contrôle des stocks, traçabilité complète.

---

## 9. Bonnes pratiques pour l'évaluation

| Action | Pourquoi ? |
|--------|------------|
| Prendre des **captures d'écran** de chaque étape | Preuve du travail réalisé. |
| Tester une **entrée** et une **sortie** | Vérifier que le stock évolue correctement. |
| Tester un **transfert entre entrepôts** | Vérifier la gestion multi-sites. |
| Vérifier le **journal des mouvements** | Confirmer la traçabilité des opérations. |
| Noter les **champs obligatoires** vs optionnels | Identifier la configuration minimale requise. |

---

## 10. Résumé des actions réalisées

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Créer un entrepôt `Entrepôt Principal - Paris` | Entrepôt créé et visible. |
| 2 | Associer le produit `PC-001` à l'entrepôt | Produit lié à un lieu physique. |
| 3 | Ajouter 10 unités (entrée) | Stock = 10. |
| 4 | Retirer 3 unités (sortie) | Stock = 7. |
| 5 | (Optionnel) Créer un second entrepôt | Gestion multi-sites. |
| 6 | Transférer 2 unités vers le second entrepôt | Stock réparti entre 2 sites. |
| 7 | Vérifier le journal des mouvements | Traçabilité confirmée. |

---

## 11. Conclusion sur le module Entrepôt

> Le module Entrepôt de Dolibarr permet une **gestion complète des lieux de stockage** et des **mouvements de stock** (entrées, sorties, transferts). Il offre une **traçabilité totale** des opérations via un journal des mouvements. Associé au module Produits, il constitue une solution complète pour la gestion des stocks d'une entreprise.

> **Statut du test :** ✅ Entrepôt créé, produit associé, mouvements testés avec succès.

---

*Document rédigé dans le cadre de l'évaluation J0 - 24 juin 2026 - P17*