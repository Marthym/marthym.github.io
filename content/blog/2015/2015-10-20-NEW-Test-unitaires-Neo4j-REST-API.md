---
title: Tests unitaires sur base Neo4j, The new Way
date: "2015-10-20T12:00:00-00:00"
excerpt: "Pour reprendre le billet précédent sur les tests unitaires avec Neo4j mais cette fois sans les dépendences
          dépréciés"
tags: [neo4j, java, database, planetlibre]
image: database.png
---

Vous vous souvenez d'un précédent billet sur [comment faire des tests unitaires avec une base Neo4j]({{% relref "/blog/2015/2015-10-03-Test-unitaires-Neo4j-REST-API" %}}).
La problémtique était que le code utilisé, en plus d'être compliqué était en partie déprécié. Mais récemment, nous avons
eu à développé une extension Neo4j pour les besoin d'un projet et la procédure de test précognisé par Neo4j inclut l'utilisation
d'une classe `TestServerBuilders` du package `org.neo4j.harness`.

A partir de cette classe, il est possible de modifier notre précédente Rule comme suit :

``` java
ServerControls serverControls = TestServerBuilders.newInProcessBuilder().newServer();
```

Le `serverControls` permet ensuite de récupérer les URI d'appel à la base Neo4j et de stopper la base.

Le builder éssaye de démarrer un serveur sur 7474 et teste tous les ports un par un jusqu'à en trouver un de libre pour
y démarrer le serveur.

Le tout n'est pas déprécié et ne demande en dépendance que
``` xml
<dependency>
    <groupId>org.neo4j.test</groupId>
    <artifactId>neo4j-harness</artifactId>
    <version>2.2.5</version>
    <scope>test</scope>
</dependency>
```

