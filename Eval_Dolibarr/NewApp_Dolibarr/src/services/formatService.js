// src/services/formatService.js
// ─────────────────────────────────────────────────────────────
// Helpers de formatage/affichage partagés par les vues.
// Module « pur » : aucune dépendance à Vue ni au réseau.
// Les vues n'ont qu'à importer ces fonctions au lieu de les redéfinir.
// ─────────────────────────────────────────────────────────────

/** Nombre → "1 234,56 €" (format FR). */
export const money = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)

/** Nombre → chaîne à 2 chiffres ("3" → "03"). */
export const pad = (n) => String(n).padStart(2, '0')

/** Arrondi monétaire à 2 décimales. */
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Timestamp Unix (s, minuit UTC) → "JJ/MM/AAAA". */
export const tsToFr = (ts) => {
  if (!ts) return '-'
  const d = new Date(Number(ts) * 1000)
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

/** Genre Dolibarr → libellé lisible. */
export const genderLabel = (g) =>
  g === 'man' ? '👨 Homme' : g === 'woman' ? '👩 Femme' : '—'

/** Initiales (2 lettres) d'un nom, pour les avatars. */
export const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase()
