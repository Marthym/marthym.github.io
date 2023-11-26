---
title: Hello OSGi World, Part 2, Premiers concepts OSGi
date: "2017-09-02T12:00:00-00:00"
excerpt: "Création de la structure initiale du projet et notions de Bundle"
#modified: 2015-09-21
categories: [développement]
tags: [OSGi, java]
image: osgi_back.png
---

## Introduction
L’objectif est donc de créer un serveur REST avec une route `/hello` qui produit le résultat `Hello World`. Le tout exécuté dans un environnement OSGi.

Pour exécuter une application au sein d’un conteneur OGSi, cette dernière doit être packagé sous la forme d’un bundle. Un bundle est un jar contenant des informations de dépendance dans son META-INF.

## Création du projet
Commençons par créer le projet et le POM associé. On ne va pas utiliser d’artefact Maven, ça serait trop facile.

Le projet va avoir l’arborescence suivante:

* **hello-osgi-world**
   * **how-assembly** *Module faisant l’assemblage du projet*
   * **how-rest** *Code du projet*

Cette structure permet de limiter les dépendances du jar principal du projet qui ne dépendra que des API, les implémentations seront définies dans l’assembly et seront facilement interchangeable si besoin.

### Le POM
La structure des POMs est discutable, je les ai écrits comme j’en ai l’habitude. On va faire en sorte de ne pas dépendre de POMs externes afin d’éviter la magie que cela induit dans les projets. Pour cela toutes les déclarations seront faites dans le POM parent du projet ou dans les POMs des modules.

La première chose c’est que nous voulons faire du java 8. Donc on ajoute la configuration du `maven-compiler-plugin` :

``` xml
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

``` xml
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

### Principe du bundle
Les applications OSGi sont divisées en `bundle`, c’est une unité d’isolation dans l’application OSGi. Il s’agit le plus souvent des packages. Chaque bundle contient ses classes métier. Un bundle consomme et fournit des services (des interfaces), il a des dépendances vers d’autres bundles. 
Lors du démarage, le runner charge chaque bundle dans son propre classpath de façon à maintenir une forte isolation entre les différents bundle. Chaque bundle peut posséder un Activateur qui contiendra du code à jouer une fois son activation terminé.

C’est dans cet Activateur que l’on mettra le démarrage de notre serveur http.

### L’implémentation

``` java
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

### Bundleization

Si on fait maintenant un `mvn clean package` on aura un how-rest.jar très bien pour la plupart des utilisations mais ça ne sera pas un bundle. En effet comme expliqué plus haut, un bundle, pour en être un, doit exprimer ses caractéristiques dans son fichier `MANIFEST.MF`. C’est-à-dire les packages qu’il exporte, ceux qu’il importe, leur version, ... Si on regarde le `MANIFEST.MF` du jar à cette étape, on y trouve :

```
Manifest-Version: 1.0
Archiver-Version: Plexus Archiver
Built-By: marthym
Created-By: Apache Maven 3.3.9
Build-Jdk: 1.8.0_144
```

Pas d’informations sur le bundle. Du coup OSGi ne saura pas comment le charger. C’est là une des plus grosses complications d’OSGi, tous les jar utilisé dans l’application doivent impérativement être des bundles ! Ce qui n’est pas le cas de tous les jars libres et open-source, loin de là. Si vous souhaitez dépendre d’un jar qui n’est pas un bundle, vous devrez le bundelizer vous-même avant de pouvoir vous en servir. 

Bref, pour transformer votre jar en bundle, il suffit d’ajouter le tag suivant dans le `pom.xml`:

``` xml
<packaging>bundle</packaging>
...
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.felix</groupId>
            <artifactId>maven-bundle-plugin</artifactId>
            <extensions>true</extensions>
            <configuration>
                <instructions combine.children="append">
                    <Bundle-Activator>fr.ght1pc9kc.how.HowActivator</Bundle-Activator>
                </instructions>
            </configuration>
        </plugin>
    </plugins>
</build>
```

Puis de relancer le `mvn clean package`. C’est le `maven-bundle-plugin` qui s’occupe de rajouter dans le `MANIFEST.MF` les informations nécessaires. Notez que `maven-bundle-plugin` détecte tout seul ce qui doit ou non être exporté. Par défaut, tous les packages contenant **.internal.** ne seront pas exportés.

Si on regarde à nouveau le `MANIFEST.MF`:

```
Manifest-Version: 1.0
Bnd-LastModified: 1503662621679
Build-Jdk: 1.8.0_144
Built-By: marthym
Bundle-Activator: fr.ght1pc9kc.how.HowActivator
Bundle-ManifestVersion: 2
Bundle-Name: how-rest
Bundle-SymbolicName: fr.ght1pc9kc.how-rest
Bundle-Version: 1.0.0.SNAPSHOT
Created-By: Apache Maven Bundle Plugin
Export-Package: fr.ght1pc9kc.how;uses:="org.osgi.framework";version="1
 .0.0"
Import-Package: org.osgi.framework;version="[1.8,2)",org.slf4j;version
 ="[1.7,2)"
Require-Capability: osgi.ee;filter:="(&(osgi.ee=JavaSE)(version=1.8))"
Tool: Bnd-3.3.0.201609221906

```

## Next

Comme je le disais plus haut, les applications OSGi ne se lance pas avec une simple `java -jar` il est nécessaire de configurer un runner qui va s’occuper de résoudre les dépendances entre les bundles et de les charger.

Du coup on verra ça dans le prochain billet car je ne veux pas faire des chose trop longue ou fastidieuse à lire (même si je doute qu’il y ai du monde).

[Code source: Part 2, Premiers concepts OSGi](https://github.com/Marthym/hello-osgi-world/tree/2.0)

* [Part 1, Introduction]({{% relref "/blog/2017/2017-08-29-Hello OSGi World, Part 1" %}})
* [Part 2, Premiers concepts OSGi]()
* [Part 3, Configuration du runner]({{% relref "/blog/2017/2017-09-09-Hello OSGi World, Part 3" %}})
* [Part 4, Injection de dépendances]({{% relref "/blog/2017/2017-09-16-Hello OSGi World, Part 4" %}})
* [Part 5, Fragment Bundles]({{% relref "/blog/2017/2017-09-23-Hello OSGi World, Part 5" %}})