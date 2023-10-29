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

Autre point important, je voulais que Baywatch soit un minimum esthétique et qu’il soit facile de naviguer dans la liste d’articles depuis le clavier. Les touches ’k’ et ’n’ servent à passer à l’article suivant ou précédent. Il s’agit des mêmes touches que Inoreader car je voulais pas avoir à me ré-habituer.

## Les technos

## Contributions