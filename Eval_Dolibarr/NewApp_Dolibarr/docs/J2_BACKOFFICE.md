# J2 — BackOffice — fonctions et logique implémentées

> Fonctionnalité J2 · partie BackOffice
> Ce document reprend le modèle du dashboard en détaillant les fonctions et la logique mises en place pour l’import des données, la réinitialisation et la préparation des données côté BackOffice.

---

## 1. Objectif

L’espace BackOffice permet d’importer les données métier nécessaires au fonctionnement du FrontOffice :

- les employés / salariés ;
- les salaires ;
- les images associées aux salariés ;
- les données de réinitialisation et de nettoyage.

---

## 2. Import des employés

### Fichiers concernés

- [src/utils/csvParser.js](../src/utils/csvParser.js)
- [src/services/importService.js](../src/services/importService.js)

### Fonctions implémentées

#### parseCSV(text, delimiter = ',')

Cette fonction lit un fichier CSV, découpe les en-têtes et transforme chaque ligne en objet JavaScript.

Logique :

1. séparation des lignes du fichier ;
2. récupération des en-têtes ;
3. lecture colonne par colonne avec gestion des quotes ;
4. création d’un objet prêt à être exploité.

#### transformEmployees(rawRows)

Cette fonction transforme chaque ligne CSV en objet employé prêt à être envoyé à Dolibarr.

Logique :

- mapping des champs métier : login, lastname, gender, password ;
- ajout du poste via le champ job ;
- stockage des valeurs supplémentaires dans array_options ;
- conservation des données brutes via _raw.

#### importEmployees(csvContent, onProgress = null)

Cette fonction envoie les employés vers Dolibarr un par un.

Logique :

- parsing du CSV ;
- transformation des lignes ;
- appel HTTP POST vers /users ;
- suivi de progression via onProgress ;
- rollback complet si une erreur survient.

---

## 3. Import des salaires

### Fichiers concernés

- [src/utils/csvParser.js](../src/utils/csvParser.js)
- [src/services/importService.js](../src/services/importService.js)

### Fonctions implémentées

#### transformSalaries(rawRows)

Cette fonction transforme les lignes de salaire en objets métier prêts à être enregistrés.

Logique :

- conversion des montants ;
- extraction des dates de début et de fin ;
- préparation des paiements s’il y en a ;
- ajout du libellé métier.

#### createSalary(sal, userId)

Cette fonction crée un salaire dans Dolibarr pour un utilisateur donné.

Logique :

- calcul du montant déjà payé ;
- détermination du statut payé / non payé ;
- construction du libellé avec détail des paiements ;
- appel POST vers /salaries.

#### importSalaries(csvContent, onProgress = null)

Cette fonction importe l’ensemble des salaires après avoir retrouvé l’ID Dolibarr correspondant à chaque employé.

Logique :

- lecture du CSV ;
- résolution des employés via la référence employé ;
- création du salaire pour chaque utilisateur ;
- rollback si un enregistrement échoue.

---

## 4. Import des images

### Fichiers concernés

- [src/services/importService.js](../src/services/importService.js)

### Fonctions implémentées

#### importImages(zipFile, onProgress = null)

Cette fonction permet d’importer une archive ZIP d’images et de les associer à des employés.

Logique :

- lecture du ZIP avec JSZip ;
- filtrage des fichiers image ;
- détermination du salarié à partir du nom de fichier ;
- upload vers Dolibarr ;
- association de l’image comme photo de profil.

---

## 5. Réinitialisation des données

### Fichiers concernés

- [src/services/resetService.js](../src/services/resetService.js)
- [src/services/api/joursFeriesApi.js](../src/services/api/joursFeriesApi.js)

### Fonctions implémentées

#### resetSalaries(onProgress = null)

Supprime les salaires présents dans Dolibarr.

Logique :

- appel GET /salaries ;
- parcours de la liste ;
- suppression via DELETE /salaries/{id} ;
- retour d’un rapport avec le nombre supprimé et les erreurs.

#### resetEmployees(onProgress = null)

Supprime les employés importés, à l’exclusion de l’administrateur.

Logique :

- récupération des utilisateurs via /users ;
- filtrage des employés importés ;
- suppression un à un ;
- gestion du cas 404 quand aucune donnée n’est présente.

#### resetDocuments(onProgress = null)

Supprime les fichiers images associés aux utilisateurs.

Logique :

- récupération des documents liés à chaque utilisateur ;
- construction de la liste des fichiers à supprimer ;
- appel DELETE /documents avec les bons paramètres.

#### resetJoursFeries(onProgress = null)

Supprime les jours fériés stockés dans la base SQLite du backend Spring Boot.

Logique :

- appel de la couche API dédiée ;
- suppression de tous les enregistrements ;
- retour d’un rapport simple de succès ou d’erreur.

#### resetAll(onProgress = null)

Exécute la réinitialisation complète dans un ordre cohérent.

Logique :

- salaires → documents → employés → jours fériés ;
- agrégation des résultats par étape ;
- retour d’un état final global.

---

## 6. Résultat attendu

Le BackOffice permet désormais de :

- charger des employés depuis un CSV ;
- importer des salaires et des paiements ;
- associer des images de profil ;
- réinitialiser proprement les données pour un nouveau passage d’import.

---

## 7. Fichiers principaux

- [src/services/importService.js](../src/services/importService.js)
- [src/services/resetService.js](../src/services/resetService.js)
- [src/utils/csvParser.js](../src/utils/csvParser.js)
- [src/api/dolibarr.js](../src/api/dolibarr.js)
