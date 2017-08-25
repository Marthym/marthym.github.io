---
layout: post
title: Hello OSGi World, Part 4, Injection de dépendances
excerpt: "L’injection de dépendances pour OSGi avec Declarative Service & SCR"
#modified: 2015-09-21
tags: [OSGi, scr, declarative service, ds, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

Quelles sont donc les raisons d'utiliser OSGi ? On en a vu plusieurs jusqu'ici :
 * Isolation des classpath par bundle
 * Chargement et mise à jour des bundle à chaud

Mais OSGi c'est aussi et surtout un framework d'injection de dépendances. Comme pour tout dans l'univers OSGi, l'injection est une spécification et il existe plusieurs implémentations comme iPOJO ou Declarative Service. On ne verra pas iPOJO parce que je suis pas fan et j'ai plus l'habitude d'utiliser DS.

## Declarative Service
DS permet de déclarer des composant et des service qui j'injectent les uns les autres. Initialement tout doit être déclaré dans des XML et dans le `MANIFEST.MF`, encore un truc bien fastidieu ! Heureusmeent, SCR vient à notre secour et permet de faire tout ça via des annotations ce qui rend la chose plus sympa et plus "actuelle".

Ajoutons donc les dépendances nécessaire au projets:

