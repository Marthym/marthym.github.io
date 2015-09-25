---
layout: post
title: Tests unitaires sur base Neo4j via APIs REST
excerpt: "Faire des tests unitaires sur une base Neo4j 'in-memory' accédé via les APIs REST de Neo4j"
#modified: 2015-09-21
tags: [neo4j, java, database, planetlibre]
comments: true
image:
  feature: database.png
---
L'usage de base Neo4j est gratuit. Par contre l'utilisation du client java ne l'est que pour les usage non-commerciaux.
En d'autre termes, vous avez le droit d'utiliser un serveur Neo4j mais pas d'inclure des jars de Neo4j dans vos projets
commerciaux. L'accès à la base Neo4j se fait alors au travers des APIs REST fourni par le serveur. Ce qui amène le
problème des tests unitaires.

Lors de l'utilisation d'une base de données SQL, on pourra utiliser une base de données in-memory type
[H2](http://www.h2database.com/) ou [HSQLDB](http://hsqldb.org/) pour isoler les tests dans un environnement controlé
et ne pas dépendre d'un serveur externe. Mais quand vos appels à la base de données sont des appels REST c'est moins
évident.

## ImpermanentDatabase

Heureusement Neo4j fournit la possibilité de créer une base de données in-memory, non permanente.

{% highlight java %}
@Before
public void prepareTestDatabase()
{
    graphDb = new TestGraphDatabaseFactory().newImpermanentDatabase();
}

@After
public void destroyTestDatabase()
{
    graphDb.shutdown();
}
{% endhighlight %}

C'est bien et très pratique mais la base qui est créée n'est pas accessible via les APIs REST.

## WrappingNeoServerBootstrapper

C'est là qu'intervient le `WrappingNeoServerBootstrapper`, une classe qui vient englober la base impermanent et qui
lui ajoute les APIs REST. Son utilisation n'est pas intuitive :

{% gist Marthym/1db21f44b7f296fcaf1f %}

La cerise sur le gateau, on choisi un port non utilisé en random afin de ne pas avoir de problème de collision, chaque
test case utilise sa propre instance de la base.

Le seul point d'ombre de cette technique est l'utilisation de la classe `WrappingNeoServerBootstrapper` qui est
deprecated depuis un moment. A ce jour, il n'y a pas de solution de remplacement.
