# J2 — FrontOffice — fonctions et logique implémentées

> Fonctionnalité J2 · partie FrontOffice
> Ce document détaille les fonctions et la logique utilisées pour l’espace FrontOffice : consultation des salariés, génération de salaires, suivi des paiements et navigation entre les vues.

---

## 1. Objectif

Le FrontOffice permet à un utilisateur de :

- consulter la liste des salariés ;
- voir les salaires associés à chaque employé ;
- générer un nouveau salaire ;
- enregistrer des paiements partiels ou complets ;
- afficher un détail enrichi des informations de paie.

---

## 2. Accueil et navigation FrontOffice

### Fichiers concernés

- [src/views/frontoffice/HomeView.vue](../src/views/frontoffice/HomeView.vue)
- [src/router/index.js](../src/router/index.js)

### Fonctions et logique

#### goChangeSpace()

Permet de revenir à la page de sélection d’espace.

#### goToBackoffice()

Ouvre le BackOffice depuis le FrontOffice.

#### goToSalaries()

Redirige vers la liste des salariés.

La logique de navigation repose sur le router Vue avec des routes dédiées comme :

- /frontoffice
- /frontoffice/salaries
- /frontoffice/salaries/:id/pay
- /frontoffice/salaries/:id/detail

---

## 3. Liste des salariés

### Fichiers concernés

- [src/views/frontoffice/SalarieList.vue](../src/views/frontoffice/SalarieList.vue)
- [src/api/dolibarr.js](../src/api/dolibarr.js)

### Fonctions implémentées

#### getEmployees()

Récupère les utilisateurs Dolibarr et les normalise pour l’affichage.

Logique :

- appel GET /users ;
- filtrage des employés ayant une référence employé ;
- transformation de chaque utilisateur via normalizeEmployee.

#### getSalaries()

Récupère tous les salaires et les prépare pour l’affichage.

Logique :

- appel GET /salaries ;
- normalisation des salaires avec normalizeSalary ;
- gestion du cas 404 comme tableau vide.

#### getEmployeeSalaries(userId)

Filtre les salaires d’un employé précis.

Logique :

- chargement de tous les salaires ;
- sélection des salaires correspondant à l’utilisateur demandé.

#### loadData()

Charge les données de la page de liste en parallèle.

Logique :

- exécution simultanée de getEmployees() et getSalaries() ;
- stockage des résultats dans les variables de vue ;
- gestion d’un état d’erreur si un appel échoue.

#### goToPay(userId)

Ouvre la page de gestion d’un salarié sélectionné.

---

## 4. Génération d’un nouveau salaire

### Fichiers concernés

- [src/views/frontoffice/SalarieGenerate.vue](../src/views/frontoffice/SalarieGenerate.vue)
- [src/api/dolibarr.js](../src/api/dolibarr.js)

### Fonctions implémentées

#### createSalary({ fk_user, amount, dateStart, dateEnd })

Crée un nouveau salaire pour un employé.

Logique :

- calcul du montant arrondi ;
- construction du libellé de base ;
- appel POST /salaries avec les dates et le montant ;
- retour de la réponse Dolibarr.

Cette fonction est ensuite utilisée par la vue de génération pour créer un salaire à partir d’un formulaire simple.

---

## 5. Gestion des paiements

### Fichiers concernés

- [src/views/frontoffice/SalariePay.vue](../src/views/frontoffice/SalariePay.vue)
- [src/api/dolibarr.js](../src/api/dolibarr.js)

### Fonctions implémentées

#### addPayment(salaryId, payment)

Ajoute un paiement à un salaire déjà existant.

Logique :

- lecture du salaire courant depuis l’API ;
- extraction des paiements déjà enregistrés dans le label ;
- ajout du nouveau paiement avec sa date et son montant ;
- reconstruction du label avec buildLabel ;
- mise à jour du statut payé via PUT /salaries/{id}.

#### parsePaymentsFromLabel(label)

Lit la partie paiement du label du salaire.

#### baseOfLabel(label)

Récupère la partie descriptive avant le détail des paiements.

#### buildLabel(baseLabel, amount, payments)

Reconstruit le libellé du salaire avec le détail des réglements.

---

## 6. Détail d’un salarié

### Fichiers concernés

- [src/views/frontoffice/SalarieDetail.vue](../src/views/frontoffice/SalarieDetail.vue)

### Logique

La vue détail affiche les informations enrichies d’un salarié avec :

- nom / référence ;
- poste ;
- heures travaillées ;
- historique des salaires ;
- accès rapide vers la page de paiement.

---

## 7. Résultat attendu

Le FrontOffice permet désormais de :

- naviguer facilement entre les écrans de salariés ;
- générer des salaires depuis une interface simple ;
- suivre les paiements en plusieurs fois ;
- afficher un état clair du paiement d’un salaire.

---

## 8. Fichiers principaux

- [src/api/dolibarr.js](../src/api/dolibarr.js)
- [src/views/frontoffice/HomeView.vue](../src/views/frontoffice/HomeView.vue)
- [src/views/frontoffice/SalarieList.vue](../src/views/frontoffice/SalarieList.vue)
- [src/views/frontoffice/SalarieGenerate.vue](../src/views/frontoffice/SalarieGenerate.vue)
- [src/views/frontoffice/SalariePay.vue](../src/views/frontoffice/SalariePay.vue)
- [src/views/frontoffice/SalarieDetail.vue](../src/views/frontoffice/SalarieDetail.vue)
