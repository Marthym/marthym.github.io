---
layout: post
title: Rien ne sert de courrir - Le retour du Jeudi
excerpt: "Packagisation et isolation des composants"
tags: [projet, legacy, dette, java, maven, planetlibre]
comments: false
image:
  feature: back.png
---

## Angle d’attaque

C’est bien d’avoir des solution mais dans un tel entrelas de problèmes, par quel bout est ce que l’on attaque ? Trois stratégies sont possible :

### RAZ
On efface tout et on recommence. C’est une stratégie que j’ai vu appliquée dans mon précédent emploi. L’avantage c’est qu’on ne se souci d’aucun des problèmes actuel, le seul souci c’est de faire propre. Le gros inconvénient est que jusqu’à ce que la nouvelle version soit opérationnelle, rien ou presque ne sort sur la version légacy. Et si vous avez les moyens de maintenir deux équipes pour les deux versions, vous faites le double de travail et vous ralentissez la nouvelle version. Et il y a un risque non négligeable que le projet de nouvelle version ne voit jamais le jour, je l’ai malheureusement vu plusieurs fois.

### Du code vers le déploiement
C’est une stratégie qui consiste a coder les nouveauté et les bugs dans de nouveaux modules propres. L’avantage de cette solution est que la prod continue de vivre. De plus les développeurs sont en principe content de pouvoir coder sur de nouvelles base. L’inconvénient est que le processus de release et de déploiement devient de plus en plus compliqué et risqué avec le nombre de module et de type de déploiement qui augmente. Tant que tout le légacy n’est pas éliminé, on ne est obligé de garder des processus lourds et on perd beaucoup de temps.

### Du déploiement vers le code
Et c’est cette dernière solution que nous avons choisi d’appliquer. Plutôt de que se pencher immédiatement sur le code, on se concentre sur la fin du processus, le déploiement. En simplifiant se dernier et en le rendant sur et robuste, on s’assure la pérénité de la production. L’inconvénient de cette stratégie c’est que pour simplifier le processus de déploiement on va considérablement compliqué le processus de release. Mais dans un second temps on s’attaquera au processus de release puis au code lui même.

## Automatisation des déploiements

Comme on l’a rapidement expliqué lors du premier volet de la série, les MEP[^Mises En Production], au fil des corrections et des mises à jour se sont fortement compliquées et sont devenues des sources d’erreurs et de stress.

L’idée est d’homogénéiser et d’automatiser le déploiement de tous les composants. Pour cela la première chose à faire est de mavenizer tous les composants.

### Mise en place du Nexus
C’est la toutes première action. Mettre en place un serveur de binaires. Sans serveur de binaires, on ne peut se baser que sur les sources et donc on recompile à chaque fois. Et c’est justement ce que l’on ne veut plus.

On a choisi [Nexus] 2. Après avoir testé [Nexus] 3 qui s’est avérer posé des problèmes de performance important. C€st dommage car [Nexus] 3 propose des fonctionnalitées bien plus avancées et plus sympa. Mais il nous fallait quelque chose d’efficace avant tout.

### Commencer par les librairies

Bien sûr les premiers composants qu’il faudra packager sont les librairies. pour notre projet il y en a deux, l’une est un ensemble de sources intégré à des projets maven via des liens symboliques, assez simple à extraire étant donné que la compilation se fait déjà avec du Maven. L’autre, plus compliqué, est un ensemble de sources, de classes et de libs, incorporés à une webapp tomcat via des sous-modules git.

On va donc supprimer les sous-modules git de tous les projets. Ensuite on va créer un projet maven à partir du sous-module git `src`. A partir des librairies présentent dans le sous-module `lib` on détermine les dépendances de notre nouveau projet. Chose compliqué car il faut faire la part entre les dépendances nécessaire pour les classes de notre projet et les dépendances des composants qui utilisaient les sous-modules ...

Bref à la fin, on fera attention qu’un `mvn clean package` sur nos composant génère bien le même répertoire `WEB-INF/lib` qu’avant.

Finalement on récupère les fichiers `properties` encore présents dans le sous-module `classes` et de les placer dans les `resources` de notre nouveau projet.

Chaque librairie a été sorti du repo principal afin de les isoler en terme de code et d’alléger le repo principal.

### Les composants

L’objectif pour tous les composants est d’avoir pour chacun un `tar.gz`, ou un `jar`

Pour la pluspart des composants il n’y a pas vraiment de problème. On mavenize les projets, on ajoute les dépendances vers les librairies et on package. C’est fastidieux mais c’est plutôt simple. La seule réelle complication se trouve dans les dépendances externes, jusqu’à lors, il s’agissait d’u ngros répertoire rempli de jars qui était posé sur la prod. Maintenant on vaut maitriser ces dépendances et avoir la certitudes que les versions que l’on utilise en prod sont bien les mêmes que celles que l’on utilise pour compiler.

Pour gérer ça, on compile notre projet mavenizé sans aucune dépendances et, au fur et à mesure des erreurs de compilation, on ajoute les dépendances avec les numéros de versions issues du jar présent dans le répertoire de lib. C’est pas un job marrant mais ça fonctionne. 

Mais comme ça serait trop facile, certaines librairie ont été patché pour le projet et ne possède pas de numéro de version. Dans ce cas, pour être certain d’avoir les bonnes versions et ne pas risqué de casser la prod, le plus simple a été de déployer directement ces librairies sur notre Nexus comme s’il s’agissait de librairies internes.


### Les OVNIs

Reste à gérer les OVNIs, ces composants qui ne sont pas mavenisable, qui nécessaire des compolations non conventionnelles. Eh oui, il y en a toujours dans ce genre de projet :).

Dans notre cas, deux cas problématiques:

* un composant angular compilé via des commandes npm
* un composant foundation, contenu dans un autres composant, compilé à base de npm et bower

Pour le premier la solution fut d’en faire un composant npm et de le déployer séparément, plutôt dans un autre composant comme c’était le cas.

Pour le deuxième c’est plus compliqué, il ne s’ægit pas d’un composant npm, seulement des css et js minifié. Mais sans cette minification rien ne marche. Ce projet est longtemps resté un soucis puis finalement, c’est via maven que l’on a réglé ce problème. Avec le plugin exec, on a fait en sorte que le composant qui contenait ce fichiers s’occupe de la minification pendant le `mvn clean package`.

## Conclusion

Une fois les composants correctement découpés et packagés, le projet gagne en clarté. Il devient plus facile de mettre en place un système de déploiement fiable, de versionner les composants et de mettre en place de l’automatisation puisque tout a été standardisé.

La suite consiste à mettre en place un système de déploiement fiable et de poussé tout ces composants vers la prod. Il s’agira d’une mise en prod sans aucune fonctionnalité pour l’utilisateur, mais pour le service informatique c’est une MEP très importante. Au dire que ce jour là, toute l’équipe à croisé les doigts. Finalement la MEP s’est très bien passée. 

Suite à ça, nous allons pouvoir commencé à assainir chacun des composants et préparer le futur de notre SI.

[Nexus]: https://www.sonatype.com/nexus-repository-oss