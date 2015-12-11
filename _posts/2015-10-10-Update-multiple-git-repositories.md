---
layout: post
title: Mettre à jour plusieurs dépôts git
excerpt: "Travailler avec plusieurs dépôts git interconnecté peut s'avérer fastidieux voilà une possibilité pour gérer ça."
modified: 2015-12-11
tags: [git, bash, planetlibre]
comments: true
image:
  feature: git.png
---
Pour tous ceux qui travaillent avec plusieurs dépôts git, voire une multitude, il est parfois très fastidieux de les tenir à jour. Le plus simple est la boucle
`bash` qui fait tous les updates à la suite :

```bash
find . -type d -depth 1 -exec git --git-dir={}/.git --work-tree=$PWD/{} pull origin master \;
```

C'est déjà bien pratique mais ce n'est pas très clair. C'est très verbeux, on distingue mal les problèmes des mises à jour. Il faut retrouver les dépôts non
mis à jour à cause de fichiers en cours de modification ou à cause d'autres problèmes ... Bref ce n'est pas la solution ultime.

Une recherche sur internet nous propose des quantités des solutions mais rien de simple, clair, facile à mettre en place. Voici donc un script qui fait un
`pull` de tous les dépôts git présent dans le répertoire home de l'utilisateur courant.

{% gist Marthym/573c9aff4acdfb583316 %}

Ce script donne en sortie une ligne pour chaque dépôt trouvé. Sur chaque ligne on aura l'url du dépôt, la branche courrante et le résultat du pull :

* **UP TO DATE**: pour les dépôts déjà à jour
* **UPDATED**: pour les dépôts mis à jour
* **DIRTY**: pour les dépôts nécessitant un commit
* **ERROR**: pour les dépôts en error. Dans ce cas, l'erreur est affiché en suivant.

A la fin de la procédure un récapitulatif des dépôts en erreur est affiché.

Voilà, j'espère que ça servira à d'autres, je suis ouvert à toutes amélioration.

**EDIT 2015-12-11: Mise à jour du script**<br/>
Le scrip est modifié pour être multi-thread, c'est beaucoup plus rapide sur un grande quantité de repos.
