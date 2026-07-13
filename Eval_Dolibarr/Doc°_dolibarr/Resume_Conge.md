# Guide Complet : Module Congés dans Dolibarr 23

## Contexte (Évaluation P17 - Juin 2026)
Ce guide couvre la configuration et la gestion des **Congés** dans le cadre du module GRH (Ressources Humaines) de Dolibarr.

---

## 1. Prérequis avant de gérer les congés

| Étape | Action | Pourquoi ? |
|-------|--------|------------|
| **1** | Activer le module **Ressources humaines** | Le menu RH doit être visible. |
| **2** | Activer le module **Congés** | Les fonctionnalités de congés doivent être disponibles. |
| **3** | Créer un **salarié** (ou utiliser le compte admin) | Une demande de congé doit être associée à un salarié. |
| **4** | Configurer la **société** (TVA, devise, pays) | Les paramètres fiscaux influencent les congés. |

---

## 2. Configuration du module Congés

**Chemin :** `Configuration` → `Modules/Applications` → `Ressources humaines` → ⚙️ (roue crantée)

### 2.1 Paramètres généraux

| Paramètre | Valeur recommandée | Explication |
|-----------|-------------------|-------------|
| **Modèle de numérotation** | `Immaculée` ou `Madonna` | Format des numéros de demande. |
| **Exclure Samedi** | ✅ COCHÉ | Les samedis ne sont pas comptés comme jours ouvrés. |
| **Exclure Dimanche** | ✅ COCHÉ | Les dimanches ne sont pas comptés comme jours ouvrés. |
| **Exclure Lundi** | ❌ Non coché | (Optionnel) Si l'entreprise ferme le lundi. |
| **Exclure Vendredi** | ❌ Non coché | (Optionnel) Si l'entreprise ferme le vendredi. |
| **Décompter les congés à la fin du mois** | ❌ Non coché | Par défaut, déduction immédiate après approbation. |

### 2.2 Acquisition des congés (paramètre avancé)

| Paramètre | Valeur | Explication |
|-----------|--------|-------------|
| **Acquisition mensuelle** | `2.08` jours/mois | 25 jours / 12 mois. |
| **Période d'acquisition** | `Année civile` | Du 1er janvier au 31 décembre. |
| **Première acquisition** | `Date d'embauche` | Date de début des droits. |

> **⚠️ Limitation :** Dans Dolibarr 23 (version community), l'acquisition automatique nécessite une tâche planifiée (cron). En environnement local, cette fonction peut ne pas être accessible. Une solution de contournement consiste à initialiser manuellement le solde dans la fiche du salarié (onglet "RH et banque" → champ "Solde initial").

---

## 3. Création d'un salarié

**Chemin :** `RH` → `Salariés` → `Nouveau salarié`

### Champs à remplir

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Nom** | `Dupont` | Nom du salarié. |
| **Prénom** | `Jean` | Prénom du salarié. |
| **Email** | `jean.dupont@entreprise.fr` | Email professionnel. |
| **Statut** | `Employé` | Statut dans l'entreprise. |
| **Date d'embauche** | `01/01/2025` | Date de début de contrat. |
| **Utilisateur** | `SuperAdmin` (ou login) | Lier le salarié à un compte utilisateur. |

> **💡 Astuce :** Pour les tests, vous pouvez lier votre compte admin à un salarié.

---

## 4. Création d'une demande de congé

**Chemin :** `RH` → `Congés` → `Nouveau` (ou `Nouvelle demande de congé`)

### Formulaire de demande

| Champ | Exemple | Explication |
|-------|---------|-------------|
| **Salarié** | `Jean Dupont` (ou votre compte) | Qui demande le congé ? |
| **Type de congé** | `Congés payés` | Sélectionner parmi les types disponibles. |
| **Date de début** | `01/07/2026` | Premier jour de congé. |
| **Date de fin** | `05/07/2026` | Dernier jour de congé. |
| **Nombre de jours** | `5` (calculé automatiquement) | Total de jours demandés. |
| **Description** | `Vacances d'été` | Motif (facultatif). |

### Statut initial
- La demande est créée en statut **"Brouillon"**.

---

## 5. Workflow de validation d'une demande

### 5.1 Soumettre la demande (Brouillon → En approbation)

1. Ouvrir la fiche de la demande.
2. Cliquer sur le bouton **"VALIDER"** (ou "Soumettre").
3. Le statut passe à **"En approbation"**.

### 5.2 Approuver la demande (En approbation → Approuvée)

1. Ouvrir la fiche de la demande.
2. Cliquer sur le bouton **"Approuver"** (ou "Valider").
3. Le statut passe à **"Approuvée"** ✅.

### 5.3 Refuser une demande (En approbation → Refusée)

1. Ouvrir la fiche de la demande.
2. Cliquer sur le bouton **"Refuser"**.
3. Le statut passe à **"Refusée"** ❌.

### 5.4 Annuler une demande

- Une demande peut être annulée par le salarié tant qu'elle n'est pas approuvée.
- Le statut passe à **"Annulée"**.

---

## 6. Statuts possibles d'une demande de congé

| Statut | Signification |
|--------|---------------|
| **Brouillon** | Demande en cours de rédaction (non soumise). |
| **En approbation** | Demande soumise, en attente du manager. |
| **Approuvée** | Demande validée par le manager. |
| **Refusée** | Demande rejetée. |
| **Annulée** | Demande annulée par le salarié. |

---

## 7. Consultation du solde des congés

**Chemin :** `RH` → `Congés` → `Solde des congés`

### Informations affichées

| Information | Exemple | Explication |
|-------------|---------|-------------|
| **Total acquis** | `25.00` | Nombre total de jours acquis depuis la période. |
| **Total pris** | `5.00` | Nombre de jours déjà pris. |
| **Solde restant** | `20.00` | Jours disponibles (acquis - pris). |
| **Solde à venir** | `2.08` | Jours qui seront acquis le mois prochain (si cron actif). |

---

## 8. Gestion manuelle du solde (solution de contournement)

En l'absence de tâche planifiée (cron), le solde peut être initialisé manuellement :

### Procédure
1. Aller dans `RH` → `Salariés` → `Liste`.
2. Cliquer sur le salarié concerné.
3. Aller dans l'onglet **"RH et banque"**.
4. Modifier le champ **"Solde initial"** (ou "Congés payés - Solde initial").
5. Saisir une valeur (ex: `25.00`).
6. Cliquer sur **"Enregistrer"**.

### Résultat
- Le solde est mis à jour immédiatement.
- Les demandes approuvées sont automatiquement déduites.

---

## 9. Historique et traçabilité

**Chemin :** `RH` → `Congés` → `Voir historique modif.`

### Informations enregistrées

| Élément | Exemple |
|---------|---------|
| **Date de création** | `24/06/2026 19:56` |
| **Date de soumission** | `24/06/2026 20:00` |
| **Date d'approbation** | `24/06/2026 20:05` |
| **Approbateur** | `SuperAdmin` |
| **Salarié** | `SuperAdmin` (Hkanto) |
| **Statut** | `Approuvée` |

---

## 10. Bonnes pratiques pour l'évaluation

| Action | Pourquoi ? |
|--------|------------|
| Prendre des **captures d'écran** de chaque étape | Preuve du travail réalisé. |
| Tester le **workflow complet** (Brouillon → En approbation → Approuvée) | Vérifier le cycle de vie d'une demande. |
| Consulter le **solde des congés** avant/après | Vérifier la mise à jour automatique. |
| Consulter l'**historique** des événements | Confirmer la traçabilité des actions. |
| Documenter les **limites techniques** (cron, acquisition) | Montrer une analyse critique du système. |

---

## 11. Résumé des actions réalisées

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Activer le module Congés | Module disponible dans le menu RH. |
| 2 | Créer un salarié (ou lier compte admin) | Un salarié existe dans la base. |
| 3 | Configurer les jours exclus (Samedi/Dimanche) | Les week-ends ne comptent pas. |
| 4 | Créer une demande de congé | Demande en statut "Brouillon". |
| 5 | Soumettre la demande (bouton VALIDER) | Demande en statut "En approbation". |
| 6 | Approuver la demande (bouton Approuver) | Demande en statut "Approuvée". |
| 7 | Consulter le solde des congés | Solde affiché et mis à jour. |
| 8 | Consulter l'historique | Toutes les actions sont tracées. |

---

## 12. Conclusion sur le module Congés

> Le module Congés de Dolibarr permet une **gestion complète des demandes de congés** : création, soumission, validation, consultation du solde et traçabilité via l'historique.
> 
> **Points positifs :**
> - Interface intuitive.
> - Workflow clair (Brouillon → En approbation → Approuvée).
> - Traçabilité complète des actions.
> - Possibilité de gérer manuellement le solde.
>
> **Limites constatées :**
> - L'acquisition automatique (2,08 jours/mois) nécessite une tâche planifiée (cron) non accessible via l'interface standard.
> - Le paramètre d'acquisition mensuelle n'est pas visible dans l'interface de configuration standard.
>
> **Solution de contournement :**
> - Initialisation manuelle du solde via la fiche du salarié (onglet "RH et banque" → champ "Solde initial").
>
> **Statut du test :** ✅ Workflow opérationnel, traçabilité confirmée, solde consultable.

---

*Document rédigé dans le cadre de l'évaluation J0 - 24 juin 2026 - P17*