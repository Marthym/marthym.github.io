---
layout: post
title: Hello OSGi World, Part 4, Injection de dépendances
excerpt: "L’injection de dépendances pour OSGi avec Declarative Service & SCR"
#modified: 2015-09-21
tags: [OSGi, scr, declarative service, ds, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

Quelles sont donc les raisons d'utiliser OSGi ? On en a vu plusieurs jusqu'ici :
 * Isolation des classpath par bundle
 * Chargement et mise à jour des bundle à chaud

Mais OSGi c'est aussi et surtout un framework d'injection de dépendances. Comme pour tout dans l'univers OSGi, l'injection est une spécification et il existe plusieurs implémentations comme iPOJO ou Declarative Service. On ne verra pas iPOJO parce que je suis pas fan et j'ai plus l'habitude d'utiliser DS.

## Declarative Service
DS permet de déclarer des composant et des service qui j'injectent les uns les autres. Initialement tout doit être déclaré dans des XML et dans le `MANIFEST.MF`, encore un truc bien fastidieu ! Heureusmeent, SCR vient à notre secour et permet de faire tout ça via des annotations ce qui rend la chose plus sympa et plus "actuelle".

Ajoutons donc les dépendances nécessaire au projets:
{% highlight xml %}
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
{% endhighlight %}

* **osgi.cmpn** pour les annotations. C'est une dépendances de compilation uniquement, on ne la veut pas dans le package final. Si vous la laissé, au lancement vous aurez une erreur assez parlante. A déclarer dans `how-rest`.
* **org.apache.felix.scr** c'est l'implémentation runtime uniquement qui gère les composants au runtime. A déclarer dans `how-assembly`

## Création de composants
Voici à quoi ressemble un composant

{% highlight java %}
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
{% endhighlight %}

C'est l'annotation `@Component` qui définit un composant. `name` détermine le nom du composant, l'information n'est pas obligatoire, si absente le composant aura le nom de la classe. `immediate` permet de dire que le composant doit être instancié dés que le bundle est activé, sans ça le composant ne sera instancié que quand il sera nécessaire. Comme aucun autre composant ne dépend du notre, si on ne le met pas immediate, on ne verra rien.

L'annotation `@Activate` détermine la méthode qui sera exécutée lors de l'activation du composant. Ici on se limite à un log pour vérifier que cela fonctionne.

Et un coup de `mvn clean package` puis on lance l'application et ...

<pre>
____________________________
Welcome to Apache Felix Gogo

g! 21:43:51.533 [fileinstall-application] INFO fr.ght1pc9kc.how.HowActivator - HOW is now Activated !
21:43:51.554 [fileinstall-application] INFO fr.ght1pc9kc.how.HttpServerComponent - HTTP Server started on port 8888
</pre>

On voit bien les deux messages. Et à ce moment vous vous dites "merde mais l'activateur ça sert du coup ?". Ben en fait non, SCR instancie les composant et execute les méthode `@Activate` du coup c'est plus très utile. Après c'est quand même pas la même chose, l'activateur agit au niveau bundle alors que `@Activate` agit au niveau composant.

Bref on peut supprimer l'activateur et la toutes section `<build>` du pom de `how-rest` qui devient elle aussi inutile. Dans le jar maintenant, au même niveau que `META-INT` on trouve `OSGI-INF` qui contient les déclarations xml des composants que le `maven-bundle-plugin` a généré pour nous.

### Gogo gadgeto composant
Jetons un oeil coté gogo shell, un coup de `help` montre une nouvelle série de commandes, les `scr:`. Essayez `scr:list` :
<pre>
g! scr:list
 BundleId Component Name Default State
    Component Id State      PIDs (Factory PID)
 [   9]   http-server  enabled
    [   0] [active      ] 
g! 
</pre> 

Pour chaque bundle, cette commande liste les composants et leur état. C'est très utile si un composant ne s'active pas, pour savoir ce qu'il lui manque, quelles dépendances ne sont pas satisfaite par exemple.
