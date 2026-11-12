# Motion

Règle tes courbes d'animation et vois-les bouger, puis copie le CSS.

*English version: [README.en.md](README.en.md)*

![Motion](screenshots/1.jpg)

## Trois courbes à comparer

Rose, bleue et jaune : clique sur une courbe pour la régler, **◉ / ○** pour la montrer ou la cacher dans l'aperçu. L'aperçu les joue côte à côte sur 4 propriétés : un déplacement, un agrandissement, une rotation et un fondu. **▶ Rejouer**, la **durée** (200 ms à 4 s), **en boucle** ou **une fois**.

## Bézier

Glisse les deux poignées sur le graphique, ou tape leurs valeurs. Une poignée au-dessus de 1 ou sous 0 fait dépasser l'animation (un rebond, un élan). 10 préréglages (ceux du CSS, plus retour, élan, rapide, doux, brusque), et **★ Garder** ajoute ta courbe à la liste.

## Ressort

Masse, raideur, amortissement et vitesse de départ : peu d'amortissement, ça rebondit ; beaucoup, ça glisse sans dépasser. La durée est celle du ressort jusqu'au repos.

## Le CSS

Prêt à copier : une `transition` et une `@keyframes` avec la courbe. Bézier donne `cubic-bezier(…)` ; le ressort donne `linear(…)`, sa courbe échantillonnée en 41 points (Chrome 113+, Firefox 112+, Safari 17.2+).

## Données

Les 3 courbes, la durée et tes préréglages sont gardés dans le dossier du plugin. Autorisation : `storage` seulement.
