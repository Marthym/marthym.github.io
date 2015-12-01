---
layout: post
title: Hello OSGi World, Part 2, Declarative Services
excerpt: "Utilisation de Declarative Services dans un application OSGi"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

## Introduction
L'objectif est donc de créer un server REST avec une route `/hello` qui produit le résultat `Hello World`. Le tout
exécuté dans un environnement OSGi.

## Création du projet
Commençons par créer le projet et le POM associé. On ne va pas utiliser d'artefact Maven, ça serait trop facile.

Le projet va avoir l'arborescence suivante:

* hello-word-osgi
   * hello-word-assembly *Module faisant l'assemblage du projet*
   * hello-word-rest *Code du projet*

### Le POM
