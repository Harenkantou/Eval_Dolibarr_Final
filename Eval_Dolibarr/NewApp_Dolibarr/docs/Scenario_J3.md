# Scénarios de test — SalarieGenerateNew (weekends + jours fériés)

## Contexte initial (à faire une seule fois)

Reset
Import feuille_1.csv (employés) + feuille_2.csv (salaires)
Insert Jours fériés (BackOffice → Jours Fériés) :
- 14/03/2026 (non récurrent, libellé "Test férié Mars")
- 11/02/2024 (non récurrent, libellé "Test férié Février")

---

## Scénario 1 — Baseline : aucune case cochée (contrôle)

Filtre salarié : Poste Technicien, Heure min 35 Heure max 35

Mois : Mars 2026
Salaire/j : 100
Majoration jour férié : 50 %
Cases : Samedi ☐ Dimanche ☐
(Champ Majoration weekend : non renseigné / ignoré)

Résultat attendu :
Rasoabe — Mars 2026 : 4 lignes
- 09→13 : 500
- 16→20 : 500
- 23→27 : 500
- 30→31 : 200
Total : 1700

---

## Scénario 2 — Samedi coché seul

Même filtre et contexte que Scénario 1.
Cases : Samedi ☑ Dimanche ☐

Résultat attendu :
Rasoabe — Mars 2026 : 4 lignes
- 09→14 : 800 (dont samedi 14 à 300)
- 16→21 : 800
- 23→28 : 800
- 30→31 : 200
Total : 2600

---

## Scénario 3 — Dimanche coché seul

Même filtre et contexte.
Cases : Samedi ☐ Dimanche ☑

Résultat attendu :
Rasoabe — Mars 2026 : 4 lignes
- 09→13 : 500
- 15→20 : 800 (dont dimanche 15 à 300)
- 22→27 : 800
- 29→31 : 500
Total : 2600

---

## Scénario 4 — Les deux cochés (1 seul intervalle)

Même filtre et contexte.
Cases : Samedi ☑ Dimanche ☑

Résultat attendu :
Rasoabe — Mars 2026 : 1 ligne
- 09→31 : 3500 (17 normaux + 3 samedis + 3 dimanches)
Total : 3500

---

## Scénario 5 — CAS CRITIQUE : Samedi + jour férié cumulés

Le 14/03/2026 est samedi ET jour férié (déjà inséré).

Filtre salarié : Poste Technicien, Heure min 35 Heure max 35

Mois : Mars 2026
Salaire/j : 100
Majoration jour férié : 50 %
Majoration weekend : 200 %
Cases : Samedi ☑ Dimanche ☐

Règle : max(50 %, 200 %) = 200 % → le 14/03 vaut 300.

Résultat attendu :
Rasoabe — Mars 2026 : 4 lignes
- 09→14 : 800 (le 14 à 300, PAS 150)
- 16→21 : 800
- 23→28 : 800
- 30→31 : 200
Total : 2600

À vérifier : le jour 14 doit apparaître à 300, jamais 150.

---

## Scénario 6 — Cas critique inversé : maj férié > maj weekend

Filtre salarié : Poste Technicien, Heure min 35 Heure max 35

Mois : Mars 2026
Salaire/j : 100
Majoration jour férié : 300 %
Majoration weekend : 100 %
Cases : Samedi ☑ Dimanche ☐

Règle : max(300 %, 100 %) = 300 % → le 14/03 vaut 400.

Résultat attendu :
Rasoabe — Mars 2026 : 4 lignes
- 09→14 : 900 (le 14 à 400)
- 16→21 : 700 (samedi 21 à 200)
- 23→28 : 700 (samedi 28 à 200)
- 30→31 : 200
Total : 2500

À vérifier : le 14 à 400, les samedis normaux à 200.

---

## Scénario 7 — Salarié sans salaire de référence

> ⚠️ **Obsolète depuis J4.** L'énoncé J4 remplace la règle « pas de salaire de
> référence → rien à générer » par « aucun salaire ce mois-ci → le mois entier
> est libre ». Voir `src/views/frontoffice/scenario_J4.txt` (Mars 2024,
> Comptable, 20 €/j → Rakotobe 620 €).

Filtre salarié : Poste Vente

Mois : Mars 2026
Salaire/j : 100
Cases : Samedi ☑ Dimanche ☑ (peu importe)

Résultat attendu (J4) :
Rajao — Mars 2026 : 1 ligne 01→31
Total : 3100

---

## Scénario 8 — Mois totalement couvert

Filtre salarié : Poste Comptable

Mois : Février 2024
Salaire/j : 100
Cases : Samedi ☑ Dimanche ☑

Résultat attendu :
Rakotobe — Février 2024 : 0 ligne
Total : 0

À vérifier : aucun intervalle possible car chaque jour est occupé.

---

## Scénario 9 — Fragmentation par occupation + weekends

Filtre salarié : Poste Technicien, Heure min 35 Heure max 35

Mois : Février 2024
Salaire/j : 100
Majoration jour férié : 50 %
Majoration weekend : 200 %
Cases : Samedi ☐ Dimanche ☐

Rasoabe Février 2024 — jours libres : 1, 16→19, 22→26
Weekends du mois : samedis 3, 10, 17, 24 ; dimanches 4, 11, 18, 25
Weekends coupent les intervalles.

Résultat attendu :
Rasoabe — Février 2024 : 5 lignes
- 01→01 : 100
- 16→16 : 100 (le 17 samedi coupe)
- 19→19 : 100 (les 17-18 excluent, le 19 lundi seul)
- 22→23 : 200 (le 24 samedi coupe)
- 26→26 : 100 (le 25 dimanche exclut)
Total : 500

---

## Scénario 10 — Weekend + férié en Février 2024

Le 11/02/2024 est dimanche ET jour férié (déjà inséré).

Filtre salarié : Poste Technicien, Heure min 40 Heure max 40

Mois : Février 2024
Salaire/j : 100
Majoration jour férié : 100 %
Majoration weekend : 50 %
Cases : Samedi ☐ Dimanche ☑

Rajenja Février 2024 — libre : 1→9, 21→29
Dimanches inclus : 4, 11, 18, 25 (mais 18 et 25 hors intervalles libres si samedis 17, 24 non cochés)
Samedis non cochés : 3, 10, 17, 24 coupent.

Le 11/02 : dimanche + férié → max(100, 50) = 100 % → 200.

Résultat attendu :
Rajenja — Février 2024 : plusieurs lignes
- 01→02 : 200
- 04→04 : 150 (dimanche seul, maj 50 %)
- 05→09 : 500
- 21→23 : 300
- 25→29 : 700 (dimanche 25 à 150 + 4 normaux à 400... vérifier calcul)

À vérifier : le 11 est-il exclu (car samedi 10 coupe entre 1→9 et 11→...) ou seul dans son intervalle 11→11 à 200 ?
Réponse : le 10 samedi non coché coupe. Le 11 dimanche coché, seul entre 10 (exclu samedi) et 12 lundi.
Donc : 11→11 : 200 apparaît en ligne isolée.

À valider en exécutant.

---

## Vérification côté Dolibarr après chaque génération

1. Ouvrir Dolibarr → module Salaires → Liste
2. Le nombre de nouvelles lignes doit correspondre au nombre de lignes de l'aperçu.
3. Cliquer sur une ligne : date_debut, date_fin, montant conformes à l'aperçu.
4. Les mêmes salaires doivent apparaître dans la fiche détail NewApp du salarié.

---

## Ordre de test recommandé

1, 4, 7, 8 → cas simples, valident le socle
5, 6 → cas critiques (max de majoration), à ne pas rater
2, 3, 9, 10 → cas de fragmentation, valident la robustesse