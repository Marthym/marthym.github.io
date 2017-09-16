---
layout: post
title: Hello OSGi World, Part 4, Injection de dépendances
excerpt: "L’injection de dépendances pour OSGi avec Declarative Service & SCR"
#modified: 2015-09-21
tags: [OSGi, scr, declarative-service, ds, REST, java, planetlibre]
comments: true
image:
  feature: osgi_back.png
---

Quelles sont donc les raisons d’utiliser OSGi ? On en a vu plusieurs jusqu’ici :
 * Isolation des classpath par bundle
 * Chargement et mise à jour des bundles à chaud

Mais OSGi c’est aussi et surtout un framework d’injection de dépendances. Comme pour tout dans l’univers OSGi, l’injection est une spécification et il existe plusieurs implémentations comme iPOJO ou Declarative Service. On ne verra pas iPOJO parce que je suis pas fan et j’ai plus l’habitude d’utiliser DS.

## Declarative Service
DS permet de déclarer des composants et des services qui s’injectent les uns les autres. Initialement tout doit être déclaré dans des XML et dans le `MANIFEST.MF`, encore un truc bien fastidieux ! Heureusement, SCR vient à notre secours et permet de faire tout ça via des annotations ce qui rend la chose plus sympa et plus “actuelle”.

Ajoutons donc les dépendances nécessaires au projet:
``` xml
  <dependency>
      <groupId>org.apache.felix</groupId>
      <artifactId>org.apache.felix.scr</artifactId>
      <version>${felix-scr.version}</version>
  </dependency>
  <dependency>
      <groupId>org.osgi</groupId>
      <artifactId>osgi.cmpn</artifactId>
      <version>${osgi.core.version}</version>
      <scope>provided</scope>
  </dependency>
```

* **osgi.cmpn** pour les annotations. C’est une dépendance de compilation uniquement, on ne la veut pas dans le package final. Si vous la laissé, au lancement vous aurez une erreur assez parlante. À déclarer dans `how-rest`.
* **org.apache.felix.scr** c’est l’implémentation runtime uniquement qui gère les composants au runtime. À déclarer dans `how-assembly`

## Création de composants
Voici à quoi ressemble un composant

``` java
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(name = "http-server", immediate = true)
public final class HttpServerComponent {
    private static final Logger LOGGER = LoggerFactory.getLogger(HttpServerComponent.class);

    @Activate
    private void startHttpServer() {
        LOGGER.info("HTTP Server started on port {}", 8888);
    }
}
```

C’est l’annotation `@Component` qui définit un composant. `name` détermine le nom du composant, l’information n’est pas obligatoire, si absente le composant aura le nom de la classe. `immediate` permet de dire que le composant doit être instancié dès que le bundle est activé, sans ça le composant ne sera instancié que quand il sera nécessaire. Comme aucun autre composant ne dépend du nôtre, si on ne le met pas immédiate, on ne verra rien.

L’annotation `@Activate` détermine la méthode qui sera exécutée lors de l’activation du composant. Ici on se limite à un log pour vérifier que cela fonctionne.

Et un coup de `mvn clean package` puis on lance l’application et ...

<pre class="console">
____________________________
Welcome to Apache Felix Gogo

g! 21:43:51.533 [fileinstall-application] INFO fr.ght1pc9kc.how.HowActivator - HOW is now Activated !
21:43:51.554 [fileinstall-application] INFO fr.ght1pc9kc.how.HttpServerComponent - HTTP Server started on port 8888
</pre>

On voit bien les deux messages. Et à ce moment vous vous dites “merde mais l’activateur ça sert du coup ?”. Ben en fait non, SCR instancie les composant et exécute les méthodes `@Activate` du coup c’est plus très utile. Après c’est quand même pas la même chose, l’activateur agit au niveau bundle alors que `@Activate` agit au niveau composant.

Bref on peut supprimer l’activateur et la toutes section `<build>` du pom de `how-rest` qui devient elle aussi inutile. Dans le jar maintenant, au même niveau que `META-INT` on trouve `OSGI-INF` qui contient les déclarations XML des composants que le `maven-bundle-plugin` a généré pour nous.

### Gogo gadgeto composant
Jetons un œil coté gogo shell, un coup de `help` montre une nouvelle série de commandes, les `scr:`. Essayez `scr:list` :

<pre class="console">
g! scr:list
 BundleId Component Name Default State
    Component Id State      PIDs (Factory PID)
 [   9]   http-server  enabled
    [   0] [active      ] 
g! 
</pre> 

Pour chaque bundle, cette commande liste les composants et leur état. C’est très utile si un composant ne s’active pas, pour savoir ce qu’il lui manque, quelles dépendances ne sont pas satisfaites par exemple.

## Dis Bonjour !

Ben oui on a fait plein de trucs mais on a toujours pas notre Hello World. Maintenant que la machinerie est en place on peut lancer un serveur HTTP à l’activation de notre composant `http-server` :

``` java
    @Activate
    private void startHttpServer() {
        Undertow server = Undertow.builder()
                .addHttpListener(HTTP_PORT, "localhost")
                .setHandler(exchange -> {
                    exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "text/plain");
                    exchange.getResponseSender().send("Hello OSGi World");
                }).build();
        server.start();
        LOGGER.info("HTTP Server started on port {}", HTTP_PORT);
    }
```

J’ai pris un serveur Undertow parce qu’il est rapide simple, non-bloquant (killer feature dans notre cas !) et en prime il est compatible OSGi.

Je vous laisse voir les poms pour la liste des imports.

Il ne reste plus qu’à relancer l’application pour voir si ça fonctionne.

### Ordre et dépendances

<pre class="console">
ERROR: [http-server(0)] The startHttpServer method has thrown an exception
java.lang.IllegalArgumentException: XNIO001001: No XNIO provider found 
        at org.xnio.Xnio.doGetInstance(Xnio.java:270)
        at org.xnio.Xnio.getInstance(Xnio.java:187)
        at io.undertow.Undertow.start(Undertow.java:114)
        at fr.ght1pc9kc.how.HttpServerComponent.startHttpServer(HttpServerComponent.java:23)
        at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
        at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
        at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
        at java.lang.reflect.Method.invoke(Method.java:498)
        at org.apache.felix.scr.impl.inject.BaseMethod.invokeMethod(BaseMethod.java:229)
        at org.apache.felix.scr.impl.inject.BaseMethod.access$500(BaseMethod.java:39)
        at org.apache.felix.scr.impl.inject.BaseMethod$Resolved.invoke(BaseMethod.java:650)
        at org.apache.felix.scr.impl.inject.BaseMethod.invoke(BaseMethod.java:506)
        at org.apache.felix.scr.impl.inject.ActivateMethod.invoke(ActivateMethod.java:307)
        at org.apache.felix.scr.impl.inject.ActivateMethod.invoke(ActivateMethod.java:299)
</pre>

Voilà un autre inconvénient d’OSGi, l’ordre de chargement des bundles compte. La plupart du temps, les bundles dépendent les uns des autres et le framwork les résous en chargeant les bundles dans l’ordre. Mais là on a un bundle `xnio.nio` qui est une implémentation, personne ne dépend de lui. Mais tant qu’il n’est pas là le serveur Undertow ne peut être lancé. Mais comme personne ne dépend ni de `xnio.nio` ni de `how-rest` les deux bundles sont chargés par ordre alphabétique et l’activation de `how-rest` est déclenché avant que `xnio.nio` ne soit disponible.

**Solution:**

En regardant dans le code d’Undertow ou dans la documentation, on voit que Undertow, pour être lancé, a besoin d’une instance de `Xnio`. Comme c’est souvent le cas dans les modules standard qui “supportent” OSGi, la façon dont Xnio génère son instance et la façon dont Undertow en dépend ne permet pas d’éviter ce souci. Du coup c’est à nous de le gérer. Le plus simple pour ça est d’expliquer à OSGi que le module `http-server` ne peut être activé tant qu’il n’existe pas une instance accessible de Xnio. On ajoute la dépendance comme suit :

``` java
    @Reference
    private void waitForXnio(Xnio xnio) {
        LOGGER.debug("XNIO Implementation found: {}", xnio);
    }
```

C’est l’annotation `@Reference` qui indique à Felix que le composant à besoin d’une instance de `Xnio`.

On rebuild l’application et ça démarre correctement ! Rendez-vous sur la page `http://localhost:8080/` pour y voir s’affiche le message de bienvenue.

### Le felix-cache
Il reste cependant encore un souci, si l’on stoppe (`CTRL^C`) et que l’on relance, on prend à nouveau cette erreur. C’est lié au cache que Felix génère. J’ignore pourquoi mais un chargement depuis le cache provoque la même erreur. Pour palier ce souci, on demande à Felix de recharger son cache à chaque démarrage. Dans le fichier de configuration Felix on ajoute la ligne:

``` conf
org.osgi.framework.storage.clean=onFirstInit
```

## Dépendances Multiples
Pour finir, modifions un peu l’application pour la rendre plus dynamique. L’idée de faire en sorte que le serveur découvre les nouvelles route dynamiquement.

Pour cela, on crée une interface `Route` comme suit :

``` java
public interface Route extends HttpHandler {
    String getRoute();
}
```

Et dans le composant HTTP on ajoute une dépendance MULTIPLE à `Route`
``` java
@Reference(cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
private void addHttpHandler(Route handler) {
    routingHandler.get(handler.getRoute(), handler);
}

private void removeHttpHandler(Route handler) {
    routingHandler.remove(handler.getRoute());
}
```

Ainsi chaque Route qui apparaîtra dans les bundles installé viendra s’ajouter à celle existantes. La présence d’une méthode `removeHttpHandler` est obligatoire pour packager le bundle. BND utilise le nom pour trouver la bonne méthode.

Une route ressemble à ça :
``` java
@Component
public class HelloWorldRoute implements Route {
    @Override
    public void handleRequest(HttpServerExchange exchange) throws Exception {
        exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "text/plain");
        exchange.getResponseSender().send("Hello OSGi World");
    }

    @Override
    public String getRoute() {
        return "/hello";
    }
}
```

Si vous compilez les sources 4.0 il y a 2 routes, /hello et /bonjour.

C’est un exemple simple pour illustré les dépendances multiples, mais il est possible de faire beaucoup mieux, des Controllers avec l’API JAX-RS.

## Next
Donc voilà, on a vu comment OSGi gère les dépendances. La prochaine fois on verra les Fragments Bundles, à quoi ça sert et comment on fait ça.

[Code source: Part 4, Injection de dépendances](https://github.com/Marthym/hello-osgi-world/tree/4.0)

* [Part 1, Introduction]({% post_url 2017-08-29-Hello OSGi World, Part 1 %})
* [Part 2, Premiers concepts OSGi]({% post_url 2017-09-02-Hello OSGi World, Part 2 %})
* [Part 3, Configuration du runner]({% post_url 2017-09-09-Hello OSGi World, Part 3 %})
* [Part 4, Injection de dépendances]()
* [Part 5, Fragment Bundles]()