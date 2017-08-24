---
layout: post
title: Hello OSGi World, Part 3, Configuration du runner
excerpt: "Configuration du runner OSGi et premier lancement de l’application"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

## Le runner
Comme explique donc, les appliactions OSGi nécessitent d'être démarrées par un runner OSGi qui va gérer l'arbre de dépendances, l'isolation et le chargement des bundles. Comme pour tout avec OSGi, il en existe plusieurs mais le plus utilisé est PAX-Runner, c'est donc celui que l'on va utiliser.

