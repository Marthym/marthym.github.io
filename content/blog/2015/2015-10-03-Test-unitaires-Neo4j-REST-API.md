---
title: Tests unitaires sur base Neo4j via APIs REST
date: "2015-10-03T12:00:00-00:00"
excerpt: "Faire des tests unitaires sur une base Neo4j 'in-memory' accédé via les APIs REST de Neo4j"
modified: "2015-10-20T12:00:00-00:00"
tags: [neo4j, java, database, planetlibre]
image: database.webp
---
L'usage de base Neo4j est gratuit. Par contre l'utilisation du client java ne l'est que pour les usages non-commerciaux.
En d'autres termes, vous avez le droit d'utiliser un serveur Neo4j mais pas d'inclure des jars de Neo4j dans vos projets
commerciaux. L'accès à la base Neo4j se fait alors au travers des APIs REST fourni par le serveur. Ce qui amène le
problème des tests unitaires.

Lors de l'utilisation d'une base de données SQL, on pourra utiliser une base de données in-memory type
[H2](http://www.h2database.com/) ou [HSQLDB](http://hsqldb.org/) pour isoler les tests dans un environnement contrôlé
et ne pas dépendre d'un serveur externe. Mais quand vos appels à la base de données sont des appels REST c'est moins
évident.

## ImpermanentDatabase

Heureusement Neo4j fournit la possibilité de créer une base de données in-memory, non permanente.

``` java
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
```

C'est bien et très pratique mais la base qui est créée n'est pas accessible via les APIs REST.

## WrappingNeoServerBootstrapper

C'est là qu'intervient le `WrappingNeoServerBootstrapper`, une classe qui vient englober la base impermanente et qui
lui ajoute les APIs REST. Son utilisation n'est pas intuitive :

``` java
db = new TestGraphDatabaseFactory().newImpermanentDatabase();

boolean available = db.isAvailable(5000);
assert available;

int start = -1;
Random random = new Random();
while (start != 0) {
    port = RANDOM_PORTS_LOWER_BOUND + random.nextInt(RANDOM_PORTS_COUNT);
    try {
        GraphDatabaseAPI api = (GraphDatabaseAPI) db;
        ServerConfigurator config = new ServerConfigurator(api);
        config.configuration().addProperty(Configurator.WEBSERVER_ADDRESS_PROPERTY_KEY, NEO4J_EMBEDDED_HOST);
        config.configuration().addProperty(Configurator.WEBSERVER_PORT_PROPERTY_KEY, port);
        config.configuration().addProperty("dbms.security.auth_enabled", false);
        neoServerBootstrapper = new WrappingNeoServerBootstrapper(api, config);
        start = neoServerBootstrapper.start();
    } catch (Exception e) {
        fail("Unable to start neo4j test server !", e);
    }
}

this.graphFile = graphFile;
this.client = new Neo4jRestClient(NEO4J_EMBEDDED_HOST, port, NEO4J_EMBEDDED_PROTOCOL);
```

La cerise sur le gateau, on choisi un port non utilisé en random afin de ne pas avoir de problème de collision, chaque
test case utilise sa propre instance de la base.

Le seul point d'ombre de cette technique est l'utilisation de la classe `WrappingNeoServerBootstrapper` qui est
deprecated depuis un moment. A ce jour, il n'y a pas de solution de remplacement.

## Les dépendences nécécessaire
Pour que cela fonctionne vous aurez besoin des dépendences suivante pou run projet Maven :

``` xml
<dependency>
    <groupId>org.neo4j</groupId>
    <artifactId>neo4j</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.neo4j.app</groupId>
    <artifactId>neo4j-server</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.neo4j</groupId>
    <artifactId>neo4j-kernel</artifactId>
    <type>test-jar</type>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.neo4j</groupId>
    <artifactId>neo4j-io</artifactId>
    <type>test-jar</type>
    <scope>test</scope>
</dependency>
```


**Edit 2015-10-20** : Ajout des dépendences nécessaire.
