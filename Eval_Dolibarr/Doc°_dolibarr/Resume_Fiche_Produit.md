# Guide Complet : Fiche Produit dans Dolibarr 23

## Contexte (Évaluation P17 - Juin 2026)
Ce guide couvre la configuration et la gestion des **Produits** et des **Stocks** dans le cadre du module GRH (Ressources Humaines) de Dolibarr.

---

## 1. Prérequis avant de créer un produit

Avant de créer un produit, Dolibarr impose deux étapes préliminaires :

| Étape | Action | Pourquoi ? |
|-------|--------|------------|
| **1** | Configurer la **Société/Organisation** (Nom, adresse, pays, TVA, devise) | Le produit a besoin d'un contexte fiscal (TVA, devise) pour calculer les prix. |
| **2** | Activer les **Modules** (Produits/Services, Entrepôts, RH, Congés, Notes de frais) | Les menus n'apparaissent que si les modules sont activés. |
| **3** | (Re)démarrer la session | Les nouveaux droits et menus sont appliqués après reconnexion. |

---

## 2. Création d’un nouveau produit

**Chemin :** Menu `Stock` → `Nouveau produit`

### Champs obligatoires à remplir

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Libellé** | `Ordinateur Portable Pro` | Nom commercial du produit (apparaît sur les devis/factures). |
| **Référence** | `PC-001` | Code interne unique pour identifier le produit en stock et en compta. |
| **Statut** | `Actif` | Permet d'activer/désactiver le produit sans le supprimer. |
| **Prix de vente min.** | `499.00` | Prix de vente unitaire HT (hors taxes). |
| **Taux TVA** | `20` (ou `20%`) | Taux de taxe applicable (paramétré par la configuration société). |

### Champs optionnels (utiles pour la gestion avancée)

| Champ | Exemple | Utilité |
|-------|---------|---------|
| **Entrepôt par défaut** | `Entrepôt Principal` | Lieu où le produit est stocké par défaut. |
| **Limite stock pour alerte** | `5` | Seuil minimal. En dessous, Dolibarr envoie une alerte. |
| **Stock désiré optimal** | `20` | Quantité idéale à avoir en stock. |
| **Poids / Dimensions** | `2.5 kg` / `40x30x5 cm` | Utile pour la logistique et le transport. |
| **Pays d’origine** | `France` | Mention obligatoire sur certains documents douaniers. |
| **Codes compatibles** | `707000` (vente) | Codes comptables pour le plan comptable général. |

### Résultat après création
- Le produit apparaît dans `Stock` → `Liste des produits`.
- Une fiche produit est générée avec un identifiant unique.
- Un événement est tracé : *"Produit PC-001 créé par SuperAdmin"*.

---

## 3. Structure de la Fiche Produit (vue détaillée)

La fiche produit est organisée en **onglets horizontaux** :

### 3.1 Onglet "Produit" (vue par défaut)
C'est le tableau de bord du produit.

| Section | Contenu | Logique Métier |
|---------|---------|----------------|
| **En-tête** | Libellé + Référence | Identification unique du produit. |
| **Prix de vente** | Prix HT / TTC et TVA | Prix appliqué au client final. |
| **Stock** | Quantité par entrepôt | Suivi en temps réel des disponibilités. |
| **Objets référents** | Liste des devis/factures/commandes liés | Permet de tracer où le produit est utilisé. |
| **Statistiques** | Graphiques et indicateurs (ex: jauge à 51%) | Analyse des ventes et des tendances. |
| **Notes** | Zone de texte libre | Pour des remarques internes (non visibles par les clients). |
| **Fichiers joints** | Images, PDF, fiches techniques | Centralisation des documents liés au produit. |
| **Événements/Agenda** | Journal des actions (création, modification) | **Traçabilité** et audit des opérations. |

### 3.2 Onglet "Stock" (gestion des quantités)
C'est le cœur de la gestion d'entrepôt.

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Entrepôt par défaut** | `Entrepôt Principal` | Affectation du produit à un lieu physique. |
| **Prix de revient** | `400.00` HT | Prix d'achat unitaire. |
| **Prix moyen pondéré (PMP)** | Calcul automatique | Moyenne des prix d'achat sur les dernières entrées (comptabilité). |
| **Stock physique** | `10` | Quantité réelle en stock (issue des mouvements). |
| **Limite stock pour alerte** | `5` | Seuil de réapprovisionnement. |
| **Stock désiré optimal** | `20` | Objectif de stock idéal. |
| **Dernier mouvement** | `24/06/2026 - Achat initial` | Historique de la dernière entrée/sortie. |
| **Corriger le stock** | Bouton d'action | Permet d'ajuster manuellement le stock (inventaire). |

### 3.3 Onglet "Statistiques"
- Permet de visualiser les **ventes** et **achats** par période (année, mois).
- Possibilité de filtrer par **client** ou **fournisseur**.
- Utile pour analyser la rotation du produit et sa rentabilité.

### 3.4 Onglet "Fichiers joints"
- Upload de documents (ex: image produit, fiche technique, certificat).
- Organisation centralisée des ressources.

### 3.5 Onglet "Événements/Agenda"
- Journal complet de toutes les actions :
  - Création du produit
  - Modifications des prix
  - Mouvements de stock
  - Validation des commandes

---

## 4. Gestion des mouvements de stock (Entrées / Sorties)

### Principe de base
| Type de mouvement | Saisie dans "Nombre de pièces" | Effet sur le stock |
|-------------------|--------------------------------|---------------------|
| **Entrée** (réception) | Nombre **POSITIF** (ex: `10`) | Le stock **augmente**. |
| **Sortie** (vente, utilisation) | Nombre **NÉGATIF** (ex: `-2`) | Le stock **diminue**. |

### Procédure pour une entrée de stock

1. Depuis la fiche produit, aller dans l'onglet **"Stock"**
2. Cliquer sur le bouton **"Corriger le stock"** (ou `Nouveau mouvement`)
3. Remplir les champs :

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Entrepôt** | `Entrepôt Principal` | Sélectionner l'entrepôt de destination. |
| **Prix d'achat unitaire** | `400.00` | Coût d'achat unitaire HT (pour la valorisation). |
| **Libellé du mouvement** | `Achat initial - Stock de départ` | Description pour traçabilité. |
| **Nombre de pièces** | `10` | Quantité à ajouter. |
| **Code mouvement** | (auto-généré) | Identifiant interne. |

4. Cliquer sur **"ENREGISTRER"**
5. **Vérification post-mouvement :**
   - Le `Stock physique` passe de `0` à `10`.
   - La section `Dernier mouvement` affiche le libellé et la date.
   - La valorisation du stock (PMP) est recalculée automatiquement.

---

## 5. Bonnes pratiques pour l'évaluation

| Action | Pourquoi ? |
|--------|------------|
| Prendre des **captures d'écran** de chaque étape | Preuve du travail réalisé. |
| Noter les **champs obligatoires** vs optionnels | Identifier la configuration minimale requise. |
| Tester un **mouvement de sortie** (ex: -1) | Vérifier que le stock diminue bien. |
| Vérifier l'**onglet Événements** | Confirmer que l'audit/log fonctionne. |
| Lier le produit à un **entrepôt** | Simuler une gestion multi-sites (si pertinent). |

---

## 6. Résumé des actions réalisées dans cette partie

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Configurer la société (nom, TVA, devise) | Base légale et fiscale définie. |
| 2 | Activer les modules (Stock, RH, Congés, Notes de frais) | Menus disponibles dans l'interface. |
| 3 | Créer un produit avec libellé, référence, prix HT et TVA | Fiche produit générée avec un ID unique. |
| 4 | Créer un entrepôt (nom, adresse) | Espace de stockage défini. |
| 5 | Lier le produit à l'entrepôt par défaut | Affectation physique du produit. |
| 6 | Ajouter du stock via une correction (entrée positive) | Stock initialisé à 10 unités. |
| 7 | Vérifier la mise à jour du stock physique et des logs | Traçabilité et cohérence des données. |

---

## 7. Conclusion sur le module Produits

> Le module Produits de Dolibarr permet une **gestion complète du catalogue** et des **stocks**. Il est intégré aux modules de vente (devis, factures) et d'achat (commandes fournisseurs). La **traçabilité** (via l'agenda) et la **valorisation** (via le PMP) sont des atouts majeurs pour une gestion d'entreprise rigoureuse.

> **Statut du test :** ✅ Produit créé et stock initialisé avec succès.

---

*Document rédigé dans le cadre de l'évaluation J0 - 24 juin 2026 - P17*