---
title: Maven Release Plugin
date: "2018-04-06T12:00:00-00:00"
excerpt: "Automatisation de release avec le plugin Maven"
categories: [développement]
tags: [maven, devtools, java]
image: road.png
---

Carrément, deux billets dans la même semaine, c’est rare. Bon rien de foufou, j’ai passé un peu de temps la semaine passé à automatiser le processus de release dans ma boite. J’avais déjà essayé d’utiliser le [Maven Release Plugin] mais je n'ai jamais eu de succès.

Cette fois j’ai quand même été un peu plus loin alors j’écris trois mots sur le sujet, en français, si ça intéresse des gens.

## Introduction
L’idée est de pouvoir versionner un composant sans autre intervention humaine que le choix des numéros de version (release et next snapshot).

## Le POM.xml
### Configuration des plugin
Déjà la première chose est de configurer les différents plugins de release.

``` xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-release-plugin</artifactId>
  <version>2.5.3</version>
</plugin>
<plugin>
  <groupId>org.codehaus.mojo</groupId>
  <artifactId>versions-maven-plugin</artifactId>
  <version>2.5</version>
</plugin>
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-javadoc-plugin</artifactId>
  <version>3.0.0</version>
  <configuration>
    <skip>true</skip>
  </configuration>
</plugin> 
```

#### Maven Release Plugin
Le [Maven Release Plugin] est le plugin qui va faire le gros du travail, Mettre à jour le pom avec les bons numéros de version, faire les commit et poser les tags.

#### Versions Maven Plugin
Le [Versions Maven Plugin] va permettre de mettre à jour les dépendances SNAPSHOT avant la release.

#### Maven Javadoc Plugin
Le [Maven Javadoc Plugin] C’est le plugin chargé de générer la JavaDoc, il est utilisé par le [Maven Release Plugin]. Dans mon cas, la Javadoc est pas super valide. Pour éviter de faire planter la release, on désactive la JavaDoc.

### Source Code Management

J’ai mis un peu de temps à trouver la configuration qui va bien pour que ça fonctionne.

``` xml
<scm>
    <connection>scm:git:git://github.com/Marthym/hello-osgi-world.git</connection>
    <developerConnection>scm:git:git@github.com:Marthym/hello-osgi-world.git</developerConnection>
    <url>https://github.com/Marthym/hello-osgi-world</url>
</scm>
```

## Fichier properties & choix des versions
Pour pouvoir fonctionner en mode silencieux, l’étape de préparation de la release a besoin d’un fichier de configuration, à placer à la racine du projet, contenant les numéros de versions des artefacts du projet, pour la release et pour la prochaine SNAPSHOT.

Le fichier a cette forme :
``` properties
scm.tag=1.5.0
project.rel.fr.ght1pc9kc\:hello-osgi-world=1.5.0
project.dev.fr.ght1pc9kc\:hello-osgi-world=1.6.0-SNAPSHOT
scm.commentPrefix=rel(main):
```

On peut aussi lui préciser le préfixe de commit, par défaut `[maven-release-plugin]`, perso, j’aime bien l’[AngularJS Commit Convention], `rel(main):`.

## Les commandes
### Résolutions de dépendences SNAPSHOT

``` bash
mvn versions:use-releases -DprocessParent=true -DfailIfNotReplaced=true
```

Le principe du plugin consiste en la suppression des chaînes `-SNAPSHOT` dans le fichier mais le plugin vérifie quand même que la version existe bien et ait bien été releasé. Si ce n’est pas le cas, il plante.

Deux paramètres :
* `processParent`: Précise qu’il faut traiter aussi le bloc `parent`
* `failIfNotReplaced`: Demande au plugin de sortir en erreur si une version d’une dépendance n’existe pas

### Release
``` bash
mvn release:prepare -DtagNameFormat="@{version}" release:perform
```
En fait le plugin agit en deux étapes qui peuvent être exécuté en une ligne.

* `prepare`:
  - Rassemble les informations
  - Joue les test
  - Pose les tags
  - Modifie les poms avec les bonnes versions
* `perform`: 
  - Compile le code sous le tag
  - Pousse le jar sur le Nexus

Attention, il est nécessaire de push les modifs
``` bash
git push && git push --tags
```

[Maven Release Plugin]: http://maven.apache.org/maven-release/maven-release-plugin/
[Versions Maven Plugin]: https://www.mojohaus.org/versions-maven-plugin/
[Maven Javadoc Plugin]: https://maven.apache.org/plugins/maven-javadoc-plugin/
[AngularJS Commit Convention]: https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit