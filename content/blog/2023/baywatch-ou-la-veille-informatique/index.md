---
title: Comment réaliser une bonne veille informatique ?
slug: baywatch-outil-de-veille-techno
date: 2023-11-06
# modified: 2021-11-04
excerpt: |
    Comment et pourquoi la veille technologique ? Baywatch est une application de veille informatique avec laquelle vous suivrez en temps réel les nouvelles du monde informatique.
summary: |
    Baywatch est une application que veille informatique. Développé en Java à l’aide de Spring Boot Webflux et de Vue.js pour l’interface. L’application utilise une base de donnée SQLite pour le stockage. Les fonctionnalitées phares de Baywatch sont la déduplication des articles, la gestion des équipes et une interface hyper intuitive.
categories: [développement, loisirs]
tags: [baywatch, java, spring, vue]
image: featured-baywatch-pour-veille-techno.webp
toc: true
comment: /s/beoan4/comment_r_aliser_une_bonne_veille
---

La veille techno fait partie intégrante de l’ingénierie logicielle. Que l’on soit développeur, lead ou <abbr title="Chef Technical Officer">CTO</abbr>, se maintenir informé des dernières évolutions dans le domaine de l’informatique ou des bonnes pratiques du management est indispensable.

**Baywatch** est l’outil que j’utilise pour ma veille informatique et générale.

<!--more-->

Après 3 années de développement sur cette application, je me décide enfin à la mettre sur Github et à la présenter sur ce blog.


## La veille techno

### Pourquoi faire de la veille techno ?

{{< figimg src="veille-informatique.webp" float="right" alt="Veille Technoligique" credit="Ma première image pas trop moche avec DALL-e" >}}

Dans le secteur de l’ingénierie logicielle où les technologies naissent et meurent chaque jour, la veille technologique est une activité primordiale. En tant que développeur, cela vous permettra de proposer des évolutions pertinentes à votre hiérarchie. Garder en tête les technologies porteuses vous aidera à bien orienter votre carrière et à anticiper les changements. Actualiser vos compétences vous rendra compétitif et vous ouvrira les portes sur des postes toujours plus passionnants.

En tant que manageur ou décideur, la veille informatique vous permettra de mieux comprendre et de mieux apprécier les choix techniques qui vous sont proposés. Cela vous permettra aussi d’anticiper les changements du marché et de prendre des décisions plus éclairées. La veille peut et doit aussi se faire sur les pratiques de management. Évoluer dans sa façon de manager des équipes technique facilitera l’embauche de nouveaux talents. Cela vous évitera de rester coincé en 1950 et de vous demander pourquoi vous ne parvenez pas à conserver une équipe stable.

À tous les niveaux de hiérarchie, la veille est une activité stratégique grâce à laquelle vous vous adapterez plus facilement aux changements et fera de vous une ressource clé sur le marché de l’innovation.

Et en dehors du secteur professionnel, une bonne culture est un atout valorisant et épanouissant personnellement.

### Comment faire de la veille informatique ?

Il y a de multiples façons de réaliser sa veille informatique. **Cela dépend du temps que vous souhaitez y consacrer**.

Un des moyens que je préfère est de **participer à des événements de votre communauté**. Par exemple des meetups ou des conférences comme Devoxx ou les Devfest. Discuter avec les speakers est toujours enrichissant et cela vous permet en plus de vous créer un réseau de connaissances. Cependant, cela prend du temps et selon où vous habitez, cela n’est pas toujours évident. Les grandes villes grouillent d’événements, mais au fin fond de la Creuse, il n’est pas certain que les communautés soient très actives.

Vous pouvez aussi **partager vos connaissances** au travers d’un blog. Écrire un article prend du temps et demande souvent pas mal de recherches pour être complet. Plus les compétences qu’il faut acquérir si vous voulez héberger vous-même. **Partager est un très bon moyen d’apprendre !**
Et c’est très enrichissant, de plus vos lecteurs vous ferons des retours sur les sujets traités ce qui agrandira votre réseau au passage.

Enfin, la lecture ... Lire des bouquins, suivre des blogs et lire un maximum d’articles sur les sujets qui vous passionnent. Souvent, les développeurs me disent ne pas savoir où trouver de bons articles. C’est une réalité, sur Internet on trouve de tout et n’importe quoi.

La qualité d’un article est subjective, ils parleront à certains et seront jugé inutile par d’autres, c’est valable aussi pour les conférences d’ailleurs. Mais de manière générale, les articles intéressants sont souvent les plus partagés. Par exemple, sur le [Journal du Hacker](https://www.journalduhacker.net/) commencez par les articles en haut de la liste, ceux avec le plus de vote. Mais attention, les votes ne sont pas toujours la vérité divine. **Il est important de conserver son esprit critique**. Pour cela, lire le plus d’article possible vous permettra de vous faire une idée d’ensemble et de mieux jugé de la qualité d’un article si une majorité de posts vont dans le même sens.

Alors c’est bien gentil tout ça, mais ça reste assez compliqué et surtout très chronophage s’il faut lire des centaines d’articles pour dénicher la pépite. C’est pour simplifier le processus de veille technologique que j’ai développé **Baywatch** *(Hé oui, tout ça pour ça 😛)*.

## Baywatch

Baywatch est une application de veille informatique et générale. Elle permet d’agréger des fils de fils de news à la façon de feu *Google Reader*. Après 3 années de développement (à temps très partiel), et malgré quelques anomalies qui traînent encore "à droite à gauche", Baywatch est mature et parfaitement fonctionnelle.

🎉 https://bw.ght1pc9kc.fr/

{{< figimg src="baywatch-capture-01.webp" alt="Capture de Baywatch avec mobile" >}}

### Les fonctionnalités

Une des fonctionnalités majeures, est **la déduplication des articles**. Il arrive régulièrement qu’un même article apparaisse dans plusieurs des fils RSS/Atom. Il est alors nécessaire de faire le tri en ce qui est déjà lu ou pas et cela génère un bruit inutile. C’est une fonctionnalité souvent payante sur la plupart des logiciels équivalents, mais sur Baywatch c’est cadeau.

Je parlais de la difficulté qu’ont les développeurs à trouver des fils de news intéressants et des informations avec de la valeur. Baywatch permet de **créer des équipes** et de **partager des news entre membres d’une équipe**. Ainsi les articles à forte valeur sont partagés par les membres de votre communauté ou vos collègues de travail. Vous trouvez plus facilement les contenus intéressants pour vous.

La fonction de **recherche permet de trouver des fils d’actualités par thème** parmi ceux qui ont été ajoutés par l’ensemble des utilisateurs de la plateforme.

L’interface de Baywatch se veut un minimum esthétique afin qu’il soit simple de naviguer dans la liste d’articles depuis le clavier. Les touches ’k’ et ’n’ servent à passer à l’article suivant ou précédent. Après, les goûts et les couleurs, ça ne se discute pas. Mais je reste ouvert à toutes suggestions. Et Baywatch est **complètement responsive**, rien de plus simple que de naviguer dans les news tout en faisant la queue pour rentrer au Devfest.

### Les technologies

Baywatch m’a pas mal servi de bac à sable *(une autre façon de faire sa veille)* pour tester les nouvelles versions de Spring ou les dernières fonctionnalités de Java. Voici la liste des technologies embarquées dans l’application.

Pour le backend, c’est **Spring Boot 3.x.x** avec le modèle **Webflux** et de la programmation reactive avec **Reactor**. Les APIs sont majoritairement servies via **GraphQL** grâce à *Spring for GraphQL* qui permet d’allier Reactor et GraphQL.

Pour la base de données, c’est **SQLite**. J’avais fait un test avec H2 au début, mais la BDD se retrouvait régulièrement corrompue et inutilisable. Problème lié à la façon dont H2 gère ses locks qui n’est pas compatible avec une utilisation embarquée dans du docker. Bref, avec SQLite plus de problèmes.

Le front est en **Vue.js 3** avec l’extension **class component de vue-facing-decorator**. Le CSS en **Tailwind CSS** et les composants front avec **DaisyUI**. J’ai adoré Tailwind dès que j’ai testé et DaisyUI comble très bien le manque de composants. En plus les composants DaisyUI sont assez fun je trouve.

Tout le projet est dans un [mono repo github](https://github.com/Marthym/baywatch) dont le build est fait via Maven, même le build du front pour lequel Maven délègue à yarn. Pour plus d’information vous pouvez lire l’article [Vue.js / Spring Boot Maven Project]({{< relref "2021-05-04--vue-spring-maven-project" >}}) qui parle de ça.

Le Spring tourne sur **Java 21** et sert le front.

Enfin le build génère une image **Docker** avec le plugin **Jib de Maven**.

Pour optimiser l’interface, les images sont retaillées selon le support par un serveur **[imgproxy]({{< relref "single-page-image-proxy" >}})** et mise en cache par un NginX.

L’infrastructure est, quant à elle, déployée via **[Ansible]({{< relref "strategie-projets-ansible" >}})** et observée au travers d’une [Stack Grafana]({{< relref "grafana-stack-1-spring-observability" >}}) qui fournie les métriques et les logs de l’application.

Finalement, Baywatch représente un terrain de jeu pour une belle brochette de technos qui va du développement logiciel à l’infrastructure en passant par le DevOps.

### Contributions

Le projet est en phase de test en production. Pour l’instant, l’auto-inscription n’est pas possible, tant que je ne suis pas certain que l’application tienne la charge, je vais éviter d’ouvrir les vannes. Mais si le cœur vous en dit de tester, n’hésitez pas à me contacter, via mail ou via [Github](https://github.com/Marthym/baywatch) je vous ouvrirais un compte avec plaisir.

Il y a plusieurs de façons de contribuer :

* Tester l’appli et me faire des retours sur [github](https://github.com/Marthym/baywatch/issues)
* Pousser des corrections ou de la doc via une PR

Le projet sur Github n’est pas bien fourni, mais n’hésitez pas à me contacter, il y a plein de choses à faire.

## Conclusion

Baywatch est une application qui aide à faire de la veille informatique. Elle n’a pas la prétention d’être meilleure qu’une autre, bien au contraire, il y a sûrement de bugs que je n’ai pas vu. Mais Baywatch est un projet sympa et qui offre des fonctionnalités souvent payantes ailleurs. J’espère qu’elle servira à d’autres. 

Elle est sous licence GPLv3, n’importe qui pour la modifier, l’utiliser, la déployer ou contribuer librement.
