# Import colonne Poste — Logique et fonctions utilisées

> Fonctionnalité J2 · partie BackOffice
> Ce document décrit la logique, les fonctions et les fichiers utilisés pour
> implémenter l’import de la colonne poste depuis le fichier CSV d’employés.

---

## 1. Objectif de la fonctionnalité

L’objectif est de prendre la colonne poste présente dans le fichier d’import,
la lire correctement, puis l’enregistrer avec les données de chaque employé
lors de l’import BackOffice.

Cette information est ensuite utilisée pour enrichir les salariés affichés dans
l’interface FrontOffice.

---

## 2. Données concernées

Le fichier d’import des employés contient généralement les colonnes suivantes :

- `ref_employe`
- `nom`
- `genre`
- `identifiant`
- `mdp`
- `heure_travail_semaine`
- `poste`

La colonne `poste` est la nouvelle donnée à traiter.

---

## 3. Logique d’implémentation

### Étape 1 — Lire la colonne depuis le CSV

Le fichier CSV est d’abord parsé par la fonction `parseCSV()`.
Cette fonction transforme chaque ligne en objet JavaScript avec les noms de colonnes.

Ainsi, si le fichier contient une colonne `poste`, on peut y accéder via :

```js
row.poste
```

### Étape 2 — Transformer la ligne en objet employé

Dans la fonction `transformEmployees()`, on ajoute la valeur de la colonne `poste`
à l’objet employé transformé.

```js
job: row.poste || row.job || ''
```

### Étape 3 — Ajouter la valeur à la structure envoyée à Dolibarr

Lors de la création de l’utilisateur via l’API Dolibarr, la valeur du poste est
ajoutée dans la requête envoyée à `/users`.

```js
job: emp.job
```

### Étape 4 — Conserver la valeur dans les options supplémentaires

Pour éviter de perdre l’information, on la garde aussi dans les `array_options` :

```js
array_options: {
  options_ref_employe: row.ref_employe,
  options_heure_travail_semaine: parseInt(row.heure_travail_semaine) || 35,
  options_poste: row.poste || row.job || ''
}
```

### Étape 5 — Récupérer la valeur ensuite dans l’interface

Dans la couche API, la fonction de normalisation d’un employé récupère cette
information et la rend disponible à l’affichage :

```js
job: u.job || u.array_options?.options_poste || null
```

---

## 4. Fonctions utilisées

### 4.1 `parseCSV()`

Fonction de parsing du fichier CSV.

```js
export const parseCSV = (text, delimiter = ',') => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(delimiter).map(h => h.trim())

  return lines.slice(1).map((line) => {
    const values = []
    let current = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const obj = {}
    headers.forEach((header, i) => {
      obj[header] = values[i] !== undefined ? values[i] : ''
    })
    return obj
  })
}
```

### 4.2 `transformEmployees()`

Fonction qui transforme chaque ligne du CSV en objet employé prêt à être envoyé.

```js
export const transformEmployees = (rawRows) => {
  return rawRows.map(row => ({
    login: row.identifiant,
    lastname: row.nom,
    password: row.mdp,
    gender: row.genre === 'homme' ? 'man' : 'woman',
    job: row.poste || row.job || '',

    array_options: {
      options_ref_employe: row.ref_employe,
      options_heure_travail_semaine: parseInt(row.heure_travail_semaine) || 35,
      options_poste: row.poste || row.job || ''
    },

    _raw: row
  }))
}
```

### 4.3 `importEmployees()`

Fonction qui envoie les employés créés à Dolibarr.

```js
export const importEmployees = async (csvContent, onProgress = null) => {
  const employees = transformEmployees(parseCSV(csvContent))
  const createdIds = []

  try {
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]

      const res = await http.post('/users', {
        login: emp.login,
        lastname: emp.lastname,
        gender: emp.gender,
        password: emp.password,
        job: emp.job,
        array_options: emp.array_options
      })

      createdIds.push(res.data.id || res.data)
      if (onProgress) onProgress({ current: i + 1, total: employees.length })
    }

    return { success: true, created: createdIds.length, ids: createdIds }
  } catch (err) {
    return { success: false, error: errMsg(err) }
  }
}
```

### 4.4 `importAll()`

Fonction globale d’import qui réutilise la logique précédente pour les employés.

```js
const res = await http.post('/users', {
  login: emp.login,
  lastname: emp.lastname,
  gender: emp.gender,
  password: emp.password,
  job: emp.job,
  array_options: emp.array_options
})
```

### 4.5 `normalizeEmployee()`

Fonction de normalisation pour l’affichage côté FrontOffice.

```js
const normalizeEmployee = (u) => ({
  id: u.id,
  ref: u.array_options?.options_ref_employe ?? null,
  name: u.lastname || u.login || `#${u.id}`,
  login: u.login,
  gender: u.gender,
  hours: u.array_options?.options_heure_travail_semaine ?? null,
  job: u.job || u.array_options?.options_poste || null
})
```

---

## 5. Fichiers modifiés

| Fichier | Rôle |
|--------|------|
| [src/utils/csvParser.js](../src/utils/csvParser.js) | lecture et transformation de la colonne poste |
| [src/services/importService.js](../src/services/importService.js) | envoi du poste lors de l’import |
| [src/api/dolibarr.js](../src/api/dolibarr.js) | récupération et normalisation du poste |

---

## 6. Résultat attendu

Après import, chaque employé doit pouvoir être associé à un poste comme :

- Développeur
- Comptable
- RH
- Manager

Cette information peut ensuite être affichée dans la liste des salariés ou utilisée
pour des filtres et des traitements supplémentaires.

---

## 7. Vérification

La fonctionnalité a été vérifiée par compilation de l’application avec :

```bash
npm run build
```

Le build a été validé avec succès.
