---
layout: post
title: Hello OSGi World, Part 1, Introduction
excerpt: "Débuter un application REST avec OSGi & Declarative Service"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre]
comments: true
image:
  feature: back.png
---

Vaste sujet que j'ai entamé il y a plus d’un an mais que j’ai jamais eu le temps de terminer correctement jusqu’ici.

## Introduction
On en entend parler, mais on ne sait pas bien ce que c’est ni ce que cela fait ? [OSGi](http://www.osgi.org/) c’est une
spécification de framework basé sur Java. Cette spécification définit le cycle de vie d’une application. Wikipedia
définira mieux que moi ce qu’est OSGi sur le papier. Les fonctionnalités clés apportées par OSGi (selon moi) sont les
suivantes :

* Mise à jour des jar à chaud
* Injection de dépendence
* Gestion des versions au niveau package

Mais tous ces avantages ne sont pas gratuits, OSGi c’est compliqué. Les experts diront que non et qu’une fois qu’on a
compris c’est simple mais voilà, faut comprendre. Et la plupart des tutos et des exemples sur le net partent souvent
du postulat que vous connaissez OSGi et que vous cherchez juste à faire quelque chose de particulier avec.
Il est par conséquent difficile de rentrer dans le sujet en partant de rien.

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

## Framework REST
Encore un choix à faire. Quel framework REST choisir pour notre *Hello world OSGi* ?

Le framework REST n’étant pas le sujet de ce tuto, on ne va pas s’attarder sur ce choix, il sera facilement changeable. Pour rester dans du standard, un
framework à base [JAX-RS](https://jax-rs-spec.java.net/) est un bon point de départ. Voici quelques frameworks que j’ai peu tester:

* [Wisdom](http://wisdom-framework.org/). Très bien mais masque complètement OSGi du coup pas vraiment adéquat dans ce tuto. Il a sa proper gestion des
annotations pour déclarer les resources REST.
* [fluent-http](https://github.com/CodeStory/fluent-http). Sympa mais tire avec lui beaucoup de dépencdences qui le rendent compliqué à intégrer dans un environnement OSGi.
* [Restlet](http://restlet.com/projects/restlet-framework/). Compliqué à intégrer en environnement OSGi malgré une version dédiée. Se base sur ses propres
annotations. Accepte JAX-RS via extension mais je trouve la mise en place compliqué, beaucoup de code pour pas grand chose.
* [Jersey](https://jersey.java.net/). Le framework que l’on utilisera dans ce tutoriel. Il est connu, documenté et bien intégré à OSGi;

## Sujet du tutoriel
Maintenant que les différents choix ont été faits, entrons dans le vif du sujet. Pour expliquer et détailler un peu
OSGi ce tuto se propose de faire dans l’originalité en créant un service `Hello World`. Une API REST appelable en GET
qui retourne `Hello world`. Comme le sujet est plutôt vaste, on fera ça en plusieurs parties :

* [Part 1, Introduction]()
* [Part 2, Declarative Services](% post_url 2010-07-21-name-of-post %)
* [Part 4, Logging](% post_url 2010-07-21-name-of-post %)
* [Part 4, Tests](% post_url 2010-07-21-name-of-post %)

Toutes les sources sont ou seront présente sur [mon repo github](https://github.com/Marthym/hello-osgi-world). Il y a un tag pour chaque étape du tuto qui correspond à chaque billet :
* Part 1 -> Pas de source
* Part 2 -> v2.0
* Part 3 -> v3.0
* ...