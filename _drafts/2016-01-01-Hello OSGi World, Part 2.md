---
layout: post
title: Hello OSGi World, Part 2, Premiers concepts OSGi
excerpt: "Création de la structure initiale du projet et notions de Bundle"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

## Introduction
L’objectif est donc de créer un serveur REST avec une route `/hello` qui produit le résultat `Hello World`. Le tout
exécuté dans un environnement OSGi.

Pour exécuter une application au sein d’un conteneur OGSi, cette dernière doit être packagé sous la forme d’un bundle.
Un bundle est un jar contenant des informations de dépendance dans son META-INF.

## Création du projet
Commençons par créer le projet et le POM associé. On ne va pas utiliser d’artefact Maven, ça serait trop facile.

Le projet va avoir l’arborescence suivante:

* hello-osgi-world
   * how-assembly *Module faisant l’assemblage du projet*
   * how-rest *Code du projet*

Cette structure permet de limiter les dépendances du jar principal du projet qui ne dépendra que des API, les implémentations seront définies dans l’assembly et seront facilement interchangeable si besoin.

### Le POM
La structure des POMs est discutable, je les ai écrits comme j’en ai l’habitude. On va faire en sorte de ne pas dépendre de POMs externes afin d’éviter la magie que cela induit dans les projets. Pour cela toutes les déclarations seront faites dans le POM parent du projet ou dans les POMs des modules.

La première chose c’est que nous voulons faire du java 8. Donc on ajoute la configuration du `maven-compiler-plugin` :

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
Packager un bundle maven à la main est particulièrement fastidieux. Heureusement, il y a des outils qui analysent le code et en déduisent les dépendances à mettre dans le META-INF pour transformer le jar en bundle. Il s’agit de [BNDTools](http://bndtools.org/). Ce dernier possède un plugin maven qui permet d’intégrer la bundelization aux cycles de vie maven.

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

Le `_include` explique au plugin d’utiliser le fichier `osgi.bnd` comme configuration s’il en trouve un. Ces fichiers sont généré par bndtools. Cela permet de garder la compatibilité si le projet est partagé avec des développeurs utilisant bndtools directement.

## L’activator
Dans le contexte d’OSGi, il n’y a pas de méthode Main qui sert de point d’entrée à l’application, c’est un Activator qui fait ça.

### Principe des bundle
Les applications OSGi sont divisées en `bundle`, c’est une unité d’isolation dans l’application OSGi. Il s’agit le plus souvent des packages. Chaque bundle contient ses classes métier. Un bundle consomme et fournit des services (des interfaces), il a des dépendances vers d’autres bundles. 
Lors du démarage, le runner charge chaque bundle dans son propre classpath de façon à maintenir une forte isolation entre les différents bundle. Chaque bundle peut posséder un Activateur qui contiendra du code à jouer une fois son activation terminé.

C’est dans cet Activateur que l’on mettra le démarrage de notre serveur http.

### L’implémentation

```java
public final class HowActivator implements BundleActivator {
    private static final Logger LOGGER = LoggerFactory.getLogger(HowActivator.class);

    @Override
    public void start(BundleContext bundleContext) throws Exception {
        LOGGER.info("HOW is now Activated !");
    }

    @Override
    public void stop(BundleContext bundleContext) throws Exception {

    }
}
```

L’activateur doit implémenter l’interface `BundleActivator`, ce qui permet de mettre le code d’activation et aussi de désactivation.

On va pour l’instant en rester là pour le code, un simple message pour s’assurer que l’on arrive bien à activer notre bundle. Dans le prochain billet on verra comment packager et lancer l’application.

## Next

Comme je le disais plus haut, les applications OSGi ne se lance pas avec une simple `java -jar` il est nécessaire de configurer un runner qui va s’occuper de résoudre les dépendances entre les bundles et de les charger.

Du coup on verra ça dans le prochain billet car je ne veux pas faire des chose trop longue ou fastidieuse à lire (même si je doute qu’il y ai du monde).
