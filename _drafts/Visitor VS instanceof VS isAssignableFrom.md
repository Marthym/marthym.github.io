---
layout: post
title: Visitor vs. instanceof vs. isAssignableFrom
excerpt: "Eviter les tests de classe et les cast dans un structure d'héritage"
#modified: 2015-09-21
tags: [java, planetlibre]
comments: true
image:
  feature: back.png
---

La question revient régulièrement sur [Stackoverflow](https://stackoverflow.com), "Est ce que je peux remplacer mes
`if instanceof else if` par quelque chose de plus performant ?". En effet in `instanceof` est une opération assé
couteuse à effectuer. Et la réponse qui vient spontanéement c'est "Utilise l'héritage, c'est fait pour ça !".

Illustrons par un exemple :

```java

```
