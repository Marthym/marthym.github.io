---
layout: post
title: Hello OSGi World, Part 1
excerpt: "Débuter un application REST avec OSGi & Declarative Service"
#modified: 2015-09-21
tags: [java, planetlibre, OSGi, REST]
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
du postulat que vous connaissez OSGi et que vous cherchez juste à faire quelque chose de particulier.
Il est par conséquent difficile de rentrer dans le sujet en partant de rien.

C'est pourquoi je me propose d'aborder le sujet en partant de la connaissance **0**, celle que j'avais en commençant.

## Le choix de l'implémentation
Comme dit plus haut, OSGi est une spécification, pas une librairie. Pas conséquent, il existe plusieurs implémentation
dont les plus répendu sont :

* [Equinox](https://www.eclipse.org/equinox/) d'Eclipse
* [Felix](https://felix.apache.org/) d'Apache
* [Knopflerfish](http://www.knopflerfish.org/)
* [Concierge](http://concierge.sourceforge.net/)
* ...

Personnellement, j'ai pris l'habitude de travailler avec Felix donc c'est sur cette implémentation de le tuto se basera
mais il reste bon de connaitre les autres.

## Choix du modèle de composants
iPojo, SCR, Blueprint
