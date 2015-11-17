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

## Introduction
On en entend parler mais on ne sait pas bien ce que c'est ni ce que cela fait ? [OSGi](http://www.osgi.org/) c'est une
spécification de framework basé sur Java. Cette spécification définit le cycle de vie d'une application. Wikipedia
définira mieux que moi ce qu'est OSGi sur le papier. Les fonctionnalitées clé apporté par OSGi (selon moi) sont les
suivantes :

* Mise à jour des jar à chaud
* Injection de dépendence
* Gestion des versions au package

Mais tout ces avantages ne sont pas gratuit, OSGi c'est compliqué. Les experts diront que non et qu'une fois qu'on a
compris c'est simple mais voilà, faut comprendre. Et la plus part des tutos et des exemples sur le net partent souvent
du postulat que vous connaissez OSGi et que vous cherchez juste à faire quelque chose de particulier avec.
Il est par conséquent difficile de rentrer dans le sujet en partant de rien.

C'est pourquoi je me propose d'aborder le sujet dans un série de billets, en partant de la connaissance **0**, celle
que j'avais en commençant.

## L'implémentation OSGi
Comme dit plus haut, OSGi est une spécification, pas une librairie. Par conséquent, il existe plusieurs implémentations
dont les plus répendu sont :

* [Equinox](https://www.eclipse.org/equinox/) d'Eclipse
* [Felix](https://felix.apache.org/) d'Apache
* [Knopflerfish](http://www.knopflerfish.org/)
* [Concierge](http://concierge.sourceforge.net/)
* ...

Personnellement, j'ai pris l'habitude de travailler avec Felix donc c'est sur cette implémentation de le tuto se basera
mais il reste bon de connaître les autres.

## Modèle de composants
Autre choix qui se pose, le choix du modèle de composant. C'est la façon dont les différents composant vont être géré
au sein de l'enrironnement OSGi.

Il en existe plusieurs avec leurs avantages et inconvénients :

 * [Apache Felix SCR](https://felix.apache.org/documentation/subprojects/apache-felix-service-component-runtime.html)
 qui implemente [Declarative Services](http://wiki.osgi.org/wiki/Declarative_Services) d'OSGi
 * Apache [Apache Felix iPOJO](https://felix.apache.org/documentation/subprojects/apache-felix-ipojo.html)
 * [Blueprint](http://wiki.osgi.org/wiki/Blueprint)

 Il est possible de mixer les divers modèles de composant dans une même application. Dans ce tuto on verra l'utilisation
 de DS and de iPOJO. Declarative Service est un peu plus simple à mettre en oeuvre mais iPOJO permet de plus de choses.
 Ce [comparatif](https://felix.apache.org/documentation/subprojects/apache-felix-ipojo/apache-felix-ipojo-userguide/ipojo-faq.html#how-does-ipojo-compare-to-declarative-services-or-blueprint)
 liste quelques fonctionnalités des différents modèles.

## Framework REST
Encore un choix à faire. Quel framework REST choisir pour notre *Hello world OSGi* ?

Le framework REST n'étant pas le sujet de ce tuto, on ne va pas s'attarder sur ce choix, il sera facilement changeable.
On peut néanmoins en lister quelques uns que l'on testera dans le tuto.

* [Wisdom](http://wisdom-framework.org/). Très bien mais masque complètement OSGi du coup pas vraiment adéquat pour ce
tuto.
* [fluent-http](https://github.com/CodeStory/fluent-http). Sympa mais tire avec lui beaucoup de dépencdences qui le
rendent compliqué à intégrer dans un environnement OSGi.
* [Restlet](http://restlet.com/projects/restlet-framework/). Premier framework que l'on testera.
* [Jersey](https://jersey.java.net/). Deuxième framework que l'on testera.

## Sujet du tutoriel
Maintenant que les différents choix ont été fait, entrons dans le vif du sujet. Pour expliquer et détailler un peu
OSGi ce tuto se propose de faire dans l'originalité en créant un service `Hello World`. Une API REST appelable en GET
qui retourne `Hello world`. Comme le sujet est plutôt vaste, on fera ça en plusieurs parties :

* [Part 1, Introduction]()
* [Part 2, Declarative Services](% post_url 2010-07-21-name-of-post %)
* [Part 3, iPOJO](% post_url 2010-07-21-name-of-post %)
* [Part 4, Logging](% post_url 2010-07-21-name-of-post %)
