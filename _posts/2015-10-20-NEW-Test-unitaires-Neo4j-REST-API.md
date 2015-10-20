---
layout: post
title: Tests unitaires sur base Neo4j, The new Way
excerpt: "Pour reprendre le billet précédent sur les tests unitaires avec Neo4j mais cette fois sans les dépendences
          dépréciés"
modified: 2015-10-20
tags: [neo4j, java, database, planetlibre]
comments: true
image:
  feature: database.png
---

Vous vous souvenez d'un précédent billet sur [comment faire des tests unitaires avec une base Neo4j]({% post_url 2015-10-03-Test-unitaires-Neo4j-REST-API %}).
La problémtique était que le code utilisé, en plus d'être compliqué était en partie déprécié. Mais récemment, nous avons
eu à développé une extension Neo4j pour les besoin d'un projet et la procédure de test précognisé par Neo4j inclut l'utilisation
d'une classe `TestServerBuilders` du package `org.neo4j.harness`.

A partir de cette classe, il est possible de modifier notre précédente Rule comme suit :

{% highlight java %}
ServerControls serverControls = TestServerBuilders.newInProcessBuilder().newServer();
{% endhighlight %}

Le `serverControls` permet ensuite de récupérer les URI d'appel à la base Neo4j et de stopper la base.

Le builder éssaye de démarrer un serveur sur 7474 et teste tous les ports un par un jusqu'à en trouver un de libre pour
y démarrer le serveur.

Le tout n'est pas déprécié et ne demande en dépendance que
{% highlight xml %}
<dependency>
    <groupId>org.neo4j.test</groupId>
    <artifactId>neo4j-harness</artifactId>
    <version>2.2.5</version>
    <scope>test</scope>
</dependency>
{% endhighlight %}
