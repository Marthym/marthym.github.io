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

## Automatisation des déploiement

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

[Nexus]: https://www.sonatype.com/nexus-repository-oss