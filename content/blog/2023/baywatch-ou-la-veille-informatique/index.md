---
title: Baywatch, l’outil de veille informatique
slug: baywatch-outil-de-veille-techno
date: 2023-10-29
# modified: 2021-11-04
summary: |
    Baywatch est une application que veille informatique. Développé en Java à l’aide de Spring Boot Webflux et de Vue.js pour l’interface. L’application utilise une base de donnée SQLite pour le stockage. Les fonctionnalitées phares de Baywatch sont la déduplication des articles, la gestion des équipes et une interface hyper intuitive.
tags: [baywatch, java, spring, vue]
image: featured-baywatch-pour-veille-techno.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Après 3 années de développement sur cette application, je me décide enfin à la mettre sur Github et à la présenter sur ce blog.

{{< figimg src="baywatch-capture-01.webp" alt="Capture de Baywatch avec mobile" >}}

## Les origines

J’ai toujours fait de la veille techno, à plus ou moins grande échelle, mais globalement, depuis mon deuxième boulot j’en fait. Initialement il y avait [Google Reader](https://fr.wikipedia.org/wiki/Google_Reader) (oui, j’ai la quarantaine passée ...), mais ce dernier à fini dans le [cimetière des projets Google](https://gcemetery.co/google-reader/) en 2013.

Un tas de projets sont alors apparu pour combler le vide, dont [Inoreader](https://www.inoreader.com/fr/) qui faisant bien le taff et que j’ai utilisé de nombreuses années. Je n'ai jamais voulu payer pour ce type de service, Google Reader était gratuit (ne me coutait pas d’argent), j’ai du mal à me dire qu’il me faut payer maintenant.

Au même moment où les pubs d’Inoreader commençaient à me lasser et ou j’en avais marre de voir passer le même article 25x, j’ai commencé un travail de lead. Être lead d’une équipe de développeurs doués, ça oblige à faire beaucoup de veille pour garder une certaine longueur d’avance sur les technos. Et pas seulement de la lecture, il est aussi nécessaire de tester ce que l’on voit passer dans les articles, afin de voir par soi-même si la techno est bien sèche et utilisable ou si c’est une librairie prometteuse mais qui manque encore de fonctionnalités.

C’est comme ça qu’est né **"Baywatch"**. Au début comme un terrain de jeu pour tester tout ce que je trouvais dans ma veille, puis quand il a été suffisamment avancé pour que je puisse l’utiliser, mon outil de veille principal.

Depuis 3 ans maintenant, je le fais évoluer et je le maintiens à jour sur les technos.

## Les fonctionnalités

LA fonctionnalité que je voulais vraiment avoir sur Baywatch, c’est **la déduplication des articles**. Il arrive régulièrement qu’un même article arrive sur plusieurs des fils RSS/Atom où je suis abonné et c’est un peu lourd de faire le tri. En plus, cette fonctionnalité était payante chez Inoreader.

Une autre fonctionnalité que je voulais voir dans Baywatch c’est la possibilité de gérer des équipes. Pouvoir partager un article et faire en sorte que tous les membres de l’équipe en profitent. J’avais testé un moment El Curator (RIP 🪦) qui avait une fonctionnalité similaire mais limité dans sa version gratuite.

Autre point important, je voulais que Baywatch soit un minimum esthétique et qu’il soit facile de naviguer dans la liste d’articles depuis le clavier. Les touches ’k’ et ’n’ servent à passer à l’article suivant ou précédent. Il s’agit des mêmes touches que Inoreader car je voulais pas avoir à me réhabituer.

En plus de tout ça Baywatch est complètement responsive, il était important de pouvoir faire un peu de veille n’importe où facilement.

## Les technos

Coté techno, comme je le disais tout à plus haut, Baywatch m’a pas mal servi de bac à sable pour tester les nouvelles versions de Spring ou les dernières fonctionnalités de Java.

Pour le backend, c’est **Spring Boot 3.x.x** avec le modèle **Webflux** et de la programmation reactive avec **Reactor**. Les APIs c’est majoritairement **GraphQL** grâce à *Spring for GraphQL* qui permet d’allier Reactor et GraphQL.

Pour la base de donnée, c’est **SQLite**. J’avais fait un test avec H2 au début, mais la BDD se retrouvait régulièrement corrompue et inutilisable, c’était lié à la façon dont H2 gère ses locks qui n’est pas compatible avec une utilisation embarquée dans du docker. Bref, avec SQLite plus de problème.

Le front est en **Vue.js 3** avec l’extension **class component** de [vue-facing-decorator](https://facing-dev.github.io/vue-facing-decorator/#/). Le CSS en **Tailwind CSS** et les composants front avec [DaisyUI](https://daisyui.com/). J’ai adoré Tailwind dès que j’ai testé et DaisyUI comble très bien le manque de composants. En plus les composants DaisyUI sont assez fun je trouve.

Tout le projet est dans un [mono repo github](https://github.com/Marthym/baywatch) dont le build est fait via Maven, même le build du front pour lequel maven délègue à yarn. Pour plus d’information vous pouvez lire l’article [Vue.js / Spring Boot Maven Project]({{< relref "2021-05-04--vue-spring-maven-project" >}}) qui parle de ça.

Le Spring tourne sur **Java 21** (depuis peu) et sert le front.

Enfin le build génère une image **Docker** avec le plugin [Jib de Maven](https://github.com/GoogleContainerTools/jib/tree/master/jib-maven-plugin).

Pour optimiser l’interface, les images sont retaillées selon le support par un serveur **[imgproxy]({{< relref "single-page-image-proxy" >}})** et mise en cache par un NginX.

L’infrastructure est, quant à elle, déployée via **[Ansible]({{< relref "strategie-projets-ansible" >}})** et observé au travers d’une [Stack Grafana]({{< relref "grafana-stack-1-spring-observability" >}}) qui fournie les métriques et les logs de l’application.

Finalement, Baywatch représente un terrain de jeu pour une belle brochette de technos.

## Contributions

Le projet est en phase de test en production (plus ou moins). Pour l’instant, l’auto-inscription n’est pas possible, tant que je ne suis pas certain que l’application tient la charge, je vais éviter d’ouvrir les vannes. Mais si le cœur vous en dit de tester, n’hésitez pas à me contacter, via mail ou via [Github](https://github.com/Marthym/baywatch) je vous ouvrirais un compte avec plaisir.

> https://bw.ght1pc9kc.fr/

Si vous êtes un développeur et que vous voulez participer, pareil n’hésitez pas.

Tous les retours, constructifs bien-sur, sont les bienvenus.