---
layout: post
title: Rien ne sert de courrir
excerpt: "Quand la dette technique à pris une ampleur telle que rien ne semble plus pouvoir la résorber..."
tags: [projet, legacy, java, planetlibre]
comments: false
image:
  feature: back.png
---

{% include _toc.html %}<!--_-->
Au cours de mes veille techno, je suis tombé sur la série d’article [Demi-Cercle] écrit par [Christophe Thibaut] de chez [Octo]. Sous forme d’expérience et par quelques métaphores, Christophe et donne des pistes sur les façons d’aborder une dette technique. Les différents articles de la série sont très intéressants et j’ai pris plaisir à les lires, je m’en suis inspiré dans mon travail aussi.

Mais la dette peut atteindre des seuils plus important que ce que Christophe décrit dans ses articles. C’est ce que je suis en train d’expérimenter et que je souhaite partager au travers de cette série de billets. A l’heure où j’écris, je ne sais pas si l’équipe parviendra au bout du chantier tant le challenge est important. Mais dans tout les cas, que ça fonctionne ou non, j’espère que le récit de l’expérience servira à d’autres.

Je ne sais pas quand, ni même si cette série sera un jour publiée mais, histoire de se faire une idée de la chronologie, j’écris ces premières lignes fin **janvier 2018**

## Etat des lieux
La première chose que nous avons entrepris est de faire l’état des lieux, afin d’avoir un idée précise de la dette. Il ne s’agit pas de pointer des bouts de code du doigt et de dire "C’est pas bien", on doit lister les problèmes mais surtout les causes des problèmes. Quels sont les process, les actions, les sentiments qui ont généré ces problèmes ? Quels sont les raisons qui font que ces problèmes n’ont peu être résorbé avant ? 

Il est important dans cette phase que toute l’équipe prenne de la distance sur la situation. Ca ne fait pas plaisir d’entendre qu’un module que l’on bichonne depuis des mois pause problème, qu’il va devoir être remanié. Il faut être conscient que l’on ne critique pas les gens mais le code ou le processus qui a amené ce code. L’objectif n’est pas d’accuser mais d’améliorer.

### Identification des problèmes
Après une ou deux semaines de discutions et d’archéologie dans les repos git, voici les problèmes qui ont été identifié dans le SI:

#### Monorepo Git
C’est un débat que l’on voit régulièrement sur internet, [monorepo vs multirepo (en)]. Je ne doute pas que dans certaines situation, un monorepo soit plus efficace, mais dans le cas qui nous intéresse, ça génère plus de problème que ça n’en resouds.

* Cela favorise les commits massif transverse sur plusieurs composants qui n’ont pas forcément de lien.
* Ca complique significativement les hooks de commit
* Cela favorise les dépendences croisées entre composant.

#### Dépendance aux sources
Il s’agit là d’un des problèmes majeur. Certains composants intègrent les sources des sources communes via des sous-modules git ou des liens symboliques vers `../commons`. On a donc des sources qui sont modifiés depuis des projets différents, donc dans des contextes différents. Si une dépendance est ajouté (ou enlevés) dans le projet `A` le projet `B` qui utilise les mêmes sources communes devra forcément l’avoir aussi, mais c’est au développeur de penser que le projet `B` compile aussi ces sources ...

De plus les `pom.xml` utilisé par le projet `A` n’est pas le même que celui du projet `B` les mêmes sources sont compilés selon des paramètres et des dépendances différentes.

L’utilisation de sous-modules git est en plus un calvaire pour l’équipe de développement. Cela provoque de la confusion dans la gestion des branches entre le projet parent et les sous-modules. Bref les sous-modules git c’est à utiliser avec parcimonie.

Toutes ces inter-relations entre composants transforme le projet en plat de spaghetti compliqué à déméler.

Enfin, cette dépendance de source rend compliqué la maitrise des dépendances.

#### Compilation par environnement
L’entrelacs de composants induit par les problèmes précédent à comme conséquence que packager les différents composants séparément est difficle, voire infaisable en l’état. Et sans packaging, les déploiements deviennent plus complexes. Il devient nécessaire de compiler les différents source sur chaqu’un des environnements. Et là on touche un autre problème grave, le code binaire qui est testé en pre-production n’est pas le même que celui qui est exécuté en production.

De plus ça vient favoriser une pratique incidieuse qui est de mettre en place des profils de compilation par environnement qui vont initialisé des variables spécifiques à chaque environnement. On rentre alors dans un cercle vicieux où les variables d’environnement induisent la compilation par environnement qui autorise les variables spécifiques.

#### Pas d’automatisation
Un commit ne provoque pas de réaction. C’est à dire, que le code poussé n’est pas recompilé sur le serveur de développement, les tests ne sont pas joués et rien n’est déployé sur un serveur de staging.

Par le fait, les tests ne sont pas obligatoire puisqu’il ne bloquent aucun processus. Et le temps entre le moment où un développeur commit et où il voit le résultat de ses modification peut être long, plusieurs jours parfois.

Chaque deploiement, que ce soit en pré-production ou en production, c’est une suite de commandes qui doivent être exécutés à la main pour compiler et installé les nouvelles versions avec tous les risques d’oubli et de raté que cela implique. Sans compter le stress que cela génère 3x par semaine.

#### Vétusté des technologies
C’est un classique de la dette technique, certaines techno utilisées dans l’application date de plusieurs années et en plus de ne plus être adaptées au marché, n’existe simplement plus. Plus de doc, plus de ressources, ... Donc personne ne tiens à metre les mains dans les sections de code concerné. 

Dans la même veine que la non maitrise des dépendances, l’application utilise de très vielles librairies qui ne sont plus disponibles dans les repo maven et ne sont disponiblent à l’application que parce qu’elles ont été commité dans le repo au coté des sources.

En plus ces vielles techno n’ont pas été développé dans l’esprit TDD, toutes cette section de code n’est pas testé et pas testable. Enfin ya des tests sélénium mais rien d’unitaire.

#### Précédentes tentatives avortées
Et c’est là que se trouve la difficulté majeur et le plus gros challenge. La criticité de la situation est évidente et il y a déjà eu des tentatives pour y remédier. Mais pour une raison ou pour une autre, la tentative n’a pas été au bout et il en résult une couche supplémentaire de dette à résorber.

>C’est un peu comme d’avoir mal au dent ! Vous allez au dentiste pour vous soigner, mais le soin est très douloureux, voire insuportable. Le dentiste est un bon médecin mais vous avez trop attendu et la carrie est profonde. Si vous ne laissez pas le dentiste aller au bout du soin et terminer, si vous ne lui faite pas confiance, vous allez vous retrouver avec le nerf à vif et la situation sera encore pire qu’avant le dentiste. Et par un effet pervers vous aurez encore moins confiance dans les dentistes pour soigner la dent malade.

Tout ça pour dire qu’une application en mauvais état, que l’on a tenté de réparer plusieurs fois, demande un étude approfondi du passé, applicatif mais aussi humain afin de comprendre pourquoi les tentatives précédentes ont échoués. Si le problème est un problème de confiance, la première chose à faire sera de rétablir cette confiance un maximum.

Dans le cas présent, les tentatives précédentes ont générés des strates applicatives, composées de technologies différentes. L’application est servie par :
* Un tomcat pour le code légacy
* Un apache pour le code statique
* Un Tomcat/Spring pour le code le plus récent

Tout ça est sorti d’un monorepo dont certains composant possèdent du code servi sur des serveurs différent. Un composant front par exemple génère des fichiers statique et des fichiers html template utilisant la technology légacy. La moitié des fichiers générés sont donc répartis sur deux serveurs.

## Conclusion
Voilà donc l’état de la dette technique. 

Cette dette, qui selon mon expérience, est conséquente, n’est pas arrivé du jour au lendemain, c’est une succession d’évènements, de situations qu’il est important de comprendre avant de commencer sans quoi la tentative viendra s’ajouter au précédentes

Enfin la dernière difficulté, l’application est en production et chaque minute de downtime équivaut à des pertes (ou plutôt des non-gain) d’argent. Et chaque pertes fait baissé la confiance de la hiérarchie en l’équipe de développement. Il est donc primordial de trouver un juste milieu entre la sécurisation des modifications que l’on va entreprendre et le temps que l’on peut investir dans cette transiton sans que cela ne gèle complètement l’activité de la société;

[Demi-Cercle]: https://blog.octo.com/le-demi-cercle-episode-1/
[Christophe Thibaut]: https://blog.octo.com/author/christophe-thibaut-cth/
[Octo]: https://blog.octo.com/
[monorepo vs multirepo (en)]: http://www.gigamonkeys.com/mono-vs-multi/