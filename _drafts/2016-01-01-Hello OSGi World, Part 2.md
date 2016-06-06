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

Pour exécuter une application au sein d'un conteneur OGSi, cette dernière doit être packagé sous la forme d'un bundle.
Un bundle est un jar contenant des informations de dépendance dans son META-INF.

## Création du projet
Commençons par créer le projet et le POM associé. On ne va pas utiliser d'artefact Maven, ça serait trop facile.

Le projet va avoir l'arborescence suivante:

* hello-osgi-world
   * hello-word-assembly *Module faisant l'assemblage du projet*
   * hello-word-rest *Code du projet*

### Le POM
Le structure des POMs est discutable, je les ai fait comme j'ai pris l'habitude de les faire. On va faire en sorte
de ne pas dépendre de POMs extènes afin d'éviter la magie que cela induit dans les projets. Pour cela toutes les
déclarations seront faites dans le POM parent du projet ou dans les POMs des modules.

La première chose c'est que nous voulons faire du java 8. Donc on ajoute la configuration du `maven-compiler-plugin` :

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <source>1.8</source>
        <target>1.8</target>
    </configuration>
</plugin>
```

#### maven-bundle-plugin
Packager un bundle maven à la main est particulièrement fastidieux. Heureusement, des outils qui analysent le code et en déduisent les dépendences à mettre dans le META-INF pour transformer le jar en bundle. Il s'agit de [BNDTools](http://bndtools.org/). Ce dernier possède un plugin maven qui permet d'intégrer la bundelization aux cycle de vie maven.

```xml
<plugin>
    <groupId>org.apache.felix</groupId>
    <artifactId>maven-bundle-plugin</artifactId>
    <version>3.0.0</version>
    <extensions>true</extensions>
    <configuration>
        <instructions combine.children="append">
            <_include>-src/main/osgi/osgi.bnd</_include>
        </instructions>
    </configuration>
</plugin>
```

Le `_include` explique au plugin d'utiliser le fichier `osgi.bnd` comme configuration s'il en trouve un. Ces fichiers
sont généré par bndtools. Cela permet de garder la compatibilité si le projet est partagé avec des développeurs
utilisant bndtools directement.
