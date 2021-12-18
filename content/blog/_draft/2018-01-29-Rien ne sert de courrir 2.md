---
title: Rien ne sert de courrir - L’équipe contre-attaque
excerpt: "... après un état des lieux exhaustif, par quel bout peut-on prendre les problèmes ..."
tags: [projet, legacy, dette, java, planetlibre]
image: back.webp
toc: true
draft: true
---

Les premier billet nous a permis de pauser les bases de notre histoire et de définir les contours de nos problèmes. Maintenant l’équipe doit établir un plan d’action qui va l’amené vers la sortie du tunnel mais sans le faire s’effondrer ni le fissurer.

## La dépendance aux sources
Le plus gros de soucis identifié et le plus évident aussi est la dépendance aux sources.

Pour régler ce problème la première étape est de **mettre en place un Nexus**, sans ça le déploiement de librairie reste trop lourd et compliqué. C’est une étape simple et une fois le serveur en place, cela ouvre la voie aux première créations de librairies.

### Intégration continue
Une fois le Nexus en place, l’autre installation qui nous fait cruellement défaut est le serveur d’intégration continue. Ce que nous voulons c’est être capable d’automatiqer chaque commit, de compilé, de jouer les tests et de déployé chaque fois que le code est modifié.

Une serveur Gitlab est déjà en place, plutôt de d’ajouter un Jenkins, le choix est fais d’utiliser les **Pipelines Gitlab**. On se contente de configurer les Runner pour qu’ils utilisent des conteneurs Docker. Ce qui a l’avantage d’isoler les compilations dans des environnements vièrges. Les pré-requis de compilations (maven, npm, ...) sont installés dans des images Dockers, la configuration et l’utilisation en est simplifié.

Du coup tant qu’à y être, on ajoute un **Registry Docker** qui pourra héberger nos images et les servir aux runners Gitlab.

### Mavenisation et premières librairies
Comme dans la plus part des sociétés, nous avons notre `commons`, ensemble de classes utilitaires, relatives à notre activité et que la plus part voire tous les composants utilisent. Comme expliqué dans le billet précédent, les commons ne sont pas une librairie mais un ensemble de source qui sont intégré aux source de chaque composant et compilé parmis elles. Ca semble un bon candidat pour une première librairie. 

On commence donc à sortir le répertoire du monorepo principal. Puis on lui ajoute un fichier `pom.xml`. Le difficulté ici est de compilé les sources sans l’aide des composants qui faisaient le job à l’origine. En effet, on ne connait pas les dépendances des sources de commons. Donc erreur de compil après erreur de compil on ajoute les dépendances. On prend garde à bien utiliser les versions présentent dans les composants originaux pour limiter les risques de problème.

Là où ça devient inattendu c’est que certaines dépendances sont dans des versions qui n’existe plus. Jusqu’ici compilés sur des serveurs qui possédent ces versoin installé, une fois dans un contexte vièrge, la gestion des dépendance ne se fait plus. Dans ce genre de cas, l’équipe à choisit de récupérer la dépendance utilisé sur le serveur de compilation légacy et de la pousser sur le Nexus pour resté au plus proche de ce qui se trouve sur la prod. N’oublions pas que le prérequis le plus important reste de ne surtout pas dégrader la production.

Une fois que l’on est capable de générer un jar de commons et de le déployer sur le Nexus, on va pouvoir reprendre le projets qui dépendaient des sources de `commons`, supprimer cette dépendance (dans notre cas, un lien symbolique) et la remplacer par une dépendance vers la librairie `commons` que l’on vient de déployer sur le Nexus. Il ne reste plus qu’à recompiler nos projets et à vérifier qu’ils se lancent toujours aussi bien qu’avant.

### Le bon vieux légacy
Les commons représentaient la partie facile. Le gros morceau c’est les dépendances de source sur le légacy. De sous-modules git dans le WEB-INF de webapps Tomcat. Les répertoires `WEB-INF/lib`, `WEB-INF/src`, `WEB-INF/classes` sont partagé entres plusieurs webapps comme des sous-modules.

La tactique choisie est de prendre le sous-module `WEB-INF/src` et d’en faire une librairie mavenizée `legacy-tools`. Comme pour les commons, on ajoute un `pom.xml` on détermine les dépendances gràce à `WEB-INF/lib` et on tache de générer un jar puis de le pousser sur le Nexus. On va ensuite dans les webapps qui dépendaient des sources et on commence par supprimer les sous-modules. Ces composants sont déployé telquel sur le serveur de prod, le répertoire est clone en l’état sur la prod et dans un premier temps ça va rester comme ça. Donc on veut que les sources du `WEB-INF` que l’on vient d’enlevé soient remplacées par la librairie `legacy-tools`. On ajoute un `pom.xml` aux webapps qui deviennent des projets maven packagé en WAR. C’est donc maven qui va s’occuper de récupérer les dépendances et les ramener dans le `WEB-INF/lib` qui ne sera alors plus committé dans le repo;

## Conclusion
C’est la fin de notre première étape. C’est une étape simple mais qui peut s’avérer longue si comme dans notre cas, il y a beaucoup de composants à traiter. Une remarque importante et que nous n’avons pas touché au code pour l’instant, nous nous sommes contenté de mavenizer les différents composants.

Cette mavenization nous permet en prime de bien isoler les composants qui seront plus facile à sortir du monorepo par la suite.