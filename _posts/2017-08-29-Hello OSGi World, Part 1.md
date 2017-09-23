---
layout: post
title: Hello OSGi World, Part 1, Introduction
excerpt: "Débuter une application REST avec OSGi & Declarative Service"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre]
comments: false
image:
  feature: osgi_back.png
---

Vaste sujet que j’ai entamé il y a plus d’un an mais que j’ai jamais eu le temps de terminer correctement jusqu’ici.

## Introduction
On en entend parler, mais on ne sait pas bien ce que c’est ni ce que cela fait ? [OSGi](http://www.osgi.org/) c’est une
spécification de framework basé sur Java. Cette spécification définit le cycle de vie d’une application. Wikipedia
définira mieux que moi ce qu’est OSGi sur le papier. Les fonctionnalités clés apportées par OSGi (selon moi) sont les
suivantes :

* Mise à jour des jar à chaud
* Injection de dépendance
* Gestion des versions au niveau package

Mais tous ces avantages ne sont pas gratuits, OSGi c’est compliqué. Les experts diront que non et qu’une fois qu’on a compris c’est simple mais voilà, faut comprendre. Et la plupart des tutos et des exemples sur le net partent souvent du postulat que vous connaissez OSGi et que vous cherchez juste à faire quelque chose de particulier avec. Il est par conséquent difficile de rentrer dans le sujet en partant de rien.

C’est pourquoi je me propose d’aborder le sujet dans un série de billets, en partant de la connaissance **0**, celle
que j’avais en commençant.

## L’implémentation OSGi
Comme dit plus haut, OSGi est une spécification, pas une librairie. Par conséquent, il existe plusieurs implémentations
dont les plus répandus sont :

* [Equinox](https://www.eclipse.org/equinox/) d’Eclipse
* [Felix](https://felix.apache.org/) d’Apache
* [Knopflerfish](http://www.knopflerfish.org/)
* [Concierge](http://concierge.sourceforge.net/)
* ...

Personnellement, j’ai pris l’habitude de travailler avec Felix donc c’est sur cette implémentation que le tuto se basera
mais il reste bon de connaître les autres.

## Modèle de composants
Autre choix qui se pose, le choix du modèle de composant. C’est la façon dont les différents composant vont être géré
au sein de l’environnement OSGi.

Il en existe plusieurs avec leurs avantages et inconvénients :

 * [Apache Felix SCR](https://felix.apache.org/documentation/subprojects/apache-felix-service-component-runtime.html)
 qui implemente [Declarative Services](http://wiki.osgi.org/wiki/Declarative_Services) d’OSGi
 * Apache [Apache Felix iPOJO](https://felix.apache.org/documentation/subprojects/apache-felix-ipojo.html)
 * [Blueprint](http://wiki.osgi.org/wiki/Blueprint)

Il est possible de mixer les divers modèles de composant dans une même application. Dans ce tuto on verra l’utilisation
de Declarative Service, plus simple et plus courante, DS est plus maintenu que les autres implémentations.
Ce [comparatif](https://felix.apache.org/documentation/subprojects/apache-felix-ipojo/apache-felix-ipojo-userguide/ipojo-faq.html#how-does-ipojo-compare-to-declarative-services-or-blueprint)
liste quelques fonctionnalités des différents modèles.

## Serveur HTTP
Le Framework REST n’est pas le sujet donc on va faire sans dans ce tuto et simplement utiliser un serveur HTTP pour servir notre application.

* [Wisdom](http://wisdom-framework.org/). Très bien mais masque complètement OSGi du coup pas vraiment adéquat dans ce tuto. Il a sa propre gestion des
annotations pour déclarer les ressources REST.
* [fluent-http](https://github.com/CodeStory/fluent-http). Sympa mais non-OSGifié et tire avec lui beaucoup de dépencdences qui le rendent compliqué à intégrer dans un environnement OSGi.
* [Netty](https://netty.io/). Un bon choix, OSGi compliant
* [Undertow](http://undertow.io/). Fiable et rapide, OSGi compliant, c’est le serveur que l’on utilisera.

## Sujet du tutoriel
Maintenant que les différents choix ont été faits, entrons dans le vif du sujet. Pour expliquer et détailler un peu OSGi ce tuto se propose de faire dans l’originalité en créant un service `Hello OSGi World`. Une API REST appelable en GET qui retourne `Hello OSGi world`. Comme le sujet est plutôt vaste, on fera ça en plusieurs parties :

* [Part 1, Introduction]()
* [Part 2, Premiers concepts OSGi]({% post_url 2017-09-02-Hello OSGi World, Part 2 %})
* [Part 3, Configuration du runner]({% post_url 2017-09-09-Hello OSGi World, Part 3 %})
* [Part 4, Injection de dépendances]({% post_url 2017-09-16-Hello OSGi World, Part 4 %})
* [Part 5, Fragment Bundles]({% post_url 2017-09-23-Hello OSGi World, Part 5 %})

Toutes les sources sont ou seront présentes sur [mon repo github](https://github.com/Marthym/hello-osgi-world). Il y a un tag pour chaque étape du tuto qui correspond à chaque billet :
* Part 1 -> Pas de source
* Part 2 -> 2.0
* Part 3 -> 3.0
* ...