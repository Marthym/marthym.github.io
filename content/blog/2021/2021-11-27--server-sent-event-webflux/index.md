---
title: Server Sent Event vs Websocket avec Spring Webflux
date: 2021-12-11
lastmod: 2022-10-15
summary: |
    Les Websockets sont souvent évoqués pour les évènements serveur, mais ils ne sont pas la seule possibilité. Spring Boot Webflux est capable d’envoyer des Event Server out of the box. Pour changer des examples de code tirés d’application de chat, voici comment il est possible d’implémenter des notifications serveur en java.
categories: [développement]
tags: [java, spring, webflux, network, baywatch]
image: featured-spring-sse-reactor.webp
toc: true
comment: /s/rnlrbh/server_sent_event_vs_websocket_avec
---

La fonctionnalité est de prévenir les clients d’une application qu’un évènement s’est produit dans cette application. La première approche consiste souvent à implémenter les WebSockets. Régulièrement cités dès que l’on veut faire de la communication serveur vers clients. Mais il existe une autre approche, les **Server Sent Event**. Avec des inconvénients, mais aussi des avantages face aux WebSockets.

> ### Edit : 15/10/2022 - Ciblage des events
> 
> Une nouvelle mise à jour de la version initiale qui ne permettait que de broadcast les messages à tous les souscripteurs. Il est facilement possible de faire en sorte de cibler les évènements à un seul souscripteur.


> ### Edit : 21/02/2021 - Nettoyage des souscriptions
>
> La version initiale avait un inconvénient majeur : les souscriptions au flux <abbr title="Server Sent Event">SSE</abbr> se cumulent et ne se libèrent jamais. Il semble que [Netty ne détecte pas bien les fermetures](https://github.com/spring-projects/spring-framework/issues/18523) ce qui à pour conséquence d’ouvrir une nouvelle souscription chaque fois que l’on rafraichit la page qui ouvre la liaison <abbr title="Server Sent Event">SSE</abbr>, tout en gardant les précédentes. Un `EventSource#close` n’a aucun effet coté serveur.
> 
> Le contrôleur a donc été revu pour inclure une mécanique de nettoyage des souscriptions. La difficulté étant de libérer le Flux quand on n'a pas accès au `Disposable`.
> 
> cf. [Libération des souscriptions](#lib%C3%A9ration-des-souscriptions)

## Server Sent Event

Server Sent Event est une norme et elle n’est pas toute jeune puisque **Opera l’a implémenté de façon expérimentale en 2006**, le **W3C l’a validé en 2013**. Du fait de son âge, elle est pleinement supportée par la plupart des navigateurs.

{{< figimg src="server-send-message.svg" float="right" alt="server send event message" >}}
Contrairement aux WebSocket, le <abbr title="Server Sent Event">SSE</abbr> fonctionne sur le **protocole HTTP** et la **communication est unilatérale**, on ne peut qu’envoyer des évènements aux clients connectés. Dernier inconvénient face aux WebSocket, les <abbr title="Server Sent Event">SSE</abbr>s ne peuvent faire transiter **que du texte, pas de binaire**, ce qui laisse quand même la possibilité d’utiliser du JSON.

Je ne rentrerais pas plus dans les détails du fonctionnement ou de la norme elle-même, il est facile de trouver des informations sur le sujet. Un des avantages de la norme, est qu’il est très simple de l’implémenter dans `Spring Boot`. Utilisé avec la programmation reactive de `Reactor` et `Webflux`, les Serveurs Send Event offrent des possibilités intéressantes. 

En voilà quelques exemples.

## Implémentation Spring Boot

Il va suffire de créer un contrôleur et une **fonction qui produit `TEXT_EVENT_STREAM_VALUE`**:

```java
@RestController
@RequestMapping("/sse")
public class NotificationController {

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sse() {
        return Flux.interval(Duration.ofSeconds(1)).take(50)
            .map(aLong -> String.format("event%d", aLong));
    }
}
```

L’exemple est fonctionnel, mais il ne sert pas à grand-chose. Il envoie une chaine avec un compteur toutes les secondes, mais on ne maitrise pas ce qui est envoyé une fois que le flux est souscrit.

### Utilisation des Sinks

Maintenant, si on utilise **un `Sink` de `Reactor`** pour alimenter notre <abbr title="Server Sent Event">SSE</abbr>. Cela nous permettrait de contrôler les évènements qui sont envoyés via <abbr title="Server Sent Event">SSE</abbr>.

```java
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

@RestController
@RequestMapping("/sse")
public class NotificationController {

    public static final reactor.core.publisher.Sinks.Many<String> sink = Sinks.many().multicast().directBestEffort();

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sse() {
        return sink.asFlux();
    }
}
```

*Attention, ce code n’est là que pour la démonstration, on verra plus loin comment on re-factorise ça pour avoir du code plus propre.*

Donc là, si de n’importe où dans le code vous accédez à `NotificationController.sink` et vous faites un `sink.tryEmitNext()`, un événement sera envoyé aux clients connectés.

Les paramètres de la création du `Sink` sont importants :

* `.many()`: Il va y avoir plusieurs évènements
* `.multicast()`: Ce flux va être souscrit plusieurs fois
* `.directBestEffort()`: On ne bufferize rien. On envoie le message aux souscripteurs présents et qui sont prêts à recevoir. Tant pis pour ceux qui ne l’ont pas reçu, on n’essaye pas de leur renvoyer.

### Implémentation d’un service de notification

Comme je le disais, le code plus haut est plus que sale. Un accès statique à une variable d’un contrôleur `Spring`. Cela viole presque tous les principes <abbr title="Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion">SOLID</abbr>. Une façon de corriger ça serait de créer un Service de Notification :

```java
public interface NotifyService {
    Flux<Tuple2<EventType, Mono<Object>>> getFlux();

    <T> void send(EventType type, Mono<T> data);

    void close();
}

public final class NotifyServiceImpl implements NotifyService {
    private final Sinks.Many<Tuple2<EventType, Mono<Object>>> sink;

    public NotifyServiceImpl() {
        this.sink = Sinks.many().multicast().directBestEffort();
    }

    @Override
    public Flux<Tuple2<EventType, Mono<Object>>> getFlux() {
        return this.sink.asFlux();
    }

    @Override
    public <T> void send(EventType type, Mono<T> data) {
        Tuple2<EventType, Mono<Object>> t = Tuples.of(type, data.map(Function.identity()));
        EmitResult result = this.sink.tryEmitNext(t);
        if (result.isFailure()) {
            if (result == EmitResult.FAIL_ZERO_SUBSCRIBER) {
                log.debug("No subscriber listening the SSE entry point.");
            } else {
                log.warn("{} on emit notification", result);
            }
        }
    }

    @Override
    public void close() {
        this.sink.tryEmitComplete();
    }
}
```

Le contrôleur ressemblerait alors à ça :

```java
import org.springframework.http.codec.ServerSentEvent;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RequestMapping("/sse")
public class NotificationController {
    private final NotifyService notifyService;

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> sse() {
        return notifyService.getFlux()
                .flatMap(e -> e.getT2().map(s -> ServerSentEvent.builder()
                        .id(UlidCreator.getMonotonicUlid().toString())
                        .event(e.getT1().getName()).data(s)
                        .build())
                ).map(e -> {
                    log.debug("Event: {}", e);
                    return e;
                });
    }
}
```

Maintenant, il n’y a plus qu’à injecter le `NotifyService` dans les services qui ont besoin de pouvoir émettre des notifications et d’utiliser `void send(EventType type, Mono<T> data)`.

```java
notifyService.send(EventType.NEWS, Mono.just(42));
```

L’`EventType` est un `enum` afin de mieux représenter les types possibles d’évènements (cf. spec <abbr title="Server Sent Event">SSE</abbr>) mais une chaine de caractères fonctionne très bien. On peut y mettre ce que l’on veut. Concernant le deuxième argument, **pourquoi un `Mono` plutôt qu’une valeur directement ?** Parce qu’il reste une dernière subtilité liée au contexte `Reactor`.

### Conservation du contexte Reactor

Comme `Reactor` exécute des fonctions de manière asynchrone et non bloquante, entre le début et la fin d’un flux de traitement, **il ne peut garantir que toutes les fonctions seront exécutées sur le même thread**. Si par exemple, une fonction effectue de l’IO ou contacte une base de données, ``Reactor`` va libérer le thread le temps que les données soient retournés, il ne le gardera pas en attente des résultats. Une fois que les résultats seront retournées, il va les traiter avec le premier thread disponible, pas forcément le même que celui de départ. Contrairement à un programme synchrone qui lui, va garder le thread en attente des résultats et l’utiliser pour traiter les résultats en retournés.

{{< figimg src="keep-reactor-context.svg" float="left" alt="keep spring reactor context" >}}
Dans ces conditions, **l’utilisation d’un `ThreadLocal` n’est pas possible**. Pour palier ça, `Reactor` maintient un contexte dans lequel il peut stocker les variables relatives au flux en cours d’exécution. C’est notamment ce contexte que `Spring` utilise pour garder l’authentification en mémoire. Car, **les contrôleurs produisant des messages <abbr title="Server Sent Event">SSE</abbr> bénéficient de `Spring Security`** comme tous les autres contrôleurs, et c’est là que c’est intéressant. Avec un seul point d’entrée <abbr title="Server Sent Event">SSE</abbr> **il est possible de fournir des réponses personnalisées à chaque utilisateur**. À condition que les fonctions du flux aient été exécutés avec le contexte de l’utilisateur. D’où l’usage d’un Mono à la place d’une valeur simple.

L’exemple qui suit vient d’une application de News Reader. Le service `statService` utilise l’authentification `Spring` pour retourner le nombre de fils de news, le nombre total de news et le nombre de news non lues pour l’utilisateur connecté. Une route <abbr title="Server Sent Event">SSE</abbr> permet à l’utilisateur connecté d’avoir en direct les informations de mise à jour si par exemple une nouvelle news est publié dans un de ses fils.

```java
Mono<Statistics> stats = Mono.zip(
            statService.getFeedsCount(),
            statService.getNewsCount(),
            statService.getUnreadCount())
    .map(t -> Statistics.builder()
            .feeds(t.getT1())
            .news(t.getT2())
            .unread(t.getT3())
            .build())
    .map(st -> {
        notifyService.send(EventType.NEWS, st);
        return st;
    }).subscribe();
```

Dans ce premier cas, les fonctions de `statService` sont exécutées une fois avec le contexte fourni par le souscripteur. Vu que l’on utilise un subscribe, le contexte est vide. Donc les fonctions ne trouverons pas d’utilisateur et vont retourner 0.

```java
Mono<Statistics> stats = Mono.zip(
            statService.getFeedsCount(),
            statService.getNewsCount(),
            statService.getUnreadCount())
    .map(t -> Statistics.builder()
            .feeds(t.getT1())
            .news(t.getT2())
            .unread(t.getT3())
            .build());
notifyService.send(EventType.NEWS, stats);
```

Dans ce deuxième cas par contre, la souscription est laissée au `notifyService` qui la transmet au contrôleur. Ce qui fait que **les souscripteurs sont les clients connectés à la route <abbr title="Server Sent Event">SSE</abbr>**. Comme le `Sink` précédement crée est un `multicast()` il peut y avoir plusieurs souscripteurs et donc le code des fonctions de `statService` est **souscrit et exécuté une fois par chaque souscripteur avec le contexte de ce dernier**. C'est-à-dire pour chaque client avec sa propre authentification. **Attention tout de même à la performance** dans ces conditions si on ne maitrise pas le nombre de connexions à la route <abbr title="Server Sent Event">SSE</abbr>, on ne maitrise pas le nombre d’appels aux fonctions de `statService` (cf. [paragraphe suivant](#lib%C3%A9ration-des-souscriptions)).

## Libération des souscriptions

{{< figimg src="free-subscriptions.svg" float="right" alt="free the subscriptions" >}}
Avec le contrôleur tel qu’il est implémenté au-dessus, le code va présenter un problème de fuite mémoire : **Les ressources utilisées pour la souscription au Flux** (le contexte, ...) **ne sont jamais libérées**. Pire, si un utilisateur appelle la route <abbr title="Server Sent Event">SSE</abbr> 25x d’affilée, avec ou sans `EventSource#close` le serveur va se retrouver avec 25 contextes pour 25 souscriptions. Chaque élément envoyé dans le flux via le `Sink` effectuera 25 traitements avec possiblement des accés disque ou BBD. Ce comportement semble lié à un [problème sur Netty](ttps://github.com/spring-projects/spring-framework/issues/18523) ou juste à la façon dont les <abbr title="Server Sent Event">SSE</abbr> fonctionnent.

Voilà par exemple les logs retournés par un seul message. Il n’y a pourtant qu'un seul souscripteur.

```shell
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
DEBUG f.g.b.i.notify.NotificationController    : Event: ServerSentEvent [id = '01FV2PK3RSPKHKVE4FKZ5NJZ28', event='news', retry=null, comment='null', data=Statistics(news=1841, unread=1763, feeds=23, users=0)]
```

La solution à ce problème est envisageable selon plusieurs axes :

On va d’abord ajouter un cache de `Flux` qui va permettre de toujours donner la même souscription au même utilisateur. Ainsi, si un utilisateur rafraîchit sa page en boucle, il n’aura qu’une seule souscription.

```java
private final Map<String, Flux<ServerSentEvent<Object>>> subscriptions = new ConcurrentHashMap<>();
/* ... */
return authenticationFacade.getConnectedUser()
        .flatMapMany(u -> subscriptions.computeIfAbsent(u.id, id ->  // ⟵ Cache du pauvre
                notifyService.getFlux()
                        .flatMap(e -> e.getT2().map(s -> ServerSentEvent.builder()
                                .id(UlidCreator.getMonotonicUlid().toString())
                                .event(e.getT1().getName()).data(s)
                                .build())
                        ).map(e -> {
                            log.debug("Event: {}", e);
                            return e;
                        }).cache(0)   // ⟵ Important sinon cache inefficace
        ));
```

**On notera le `.cache(0)`**, sans ça, le fait de mettre le flux dans un cache n’aura aucune incidence. Le cache rendra effectivement le même flux mais une nouvelle souscription sera créée. **Le `0` en paramètre indique de ne pas garder l’historique** du flux. Sans cette valeur, chaque nouvel appel au flux récupère l’ensemble des éléments déjà publiés dans cette instance du Flux.

Le deuxième axe d’amélioration est de faire en sorte de résilier la souscription quand elle n’est plus nécessiare.

```java
@GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<Object>> sse() {
    return authenticationFacade.getConnectedUser()
            .flatMapMany(u -> subscriptions.computeIfAbsent(u.id, id ->
                    notifyService.getFlux()
                            /* ⤋⤋⤋ - Résiliation de la souscription - ⤋⤋⤋ */
                            .takeWhile(e -> subscriptions.containsKey(id))
                            .flatMap(e -> e.getT2().map(s -> ServerSentEvent.builder()
                                    .id(UlidCreator.getMonotonicUlid().toString())
                                    .event(e.getT1().getName()).data(s)
                                    .build())
                            ).map(e -> {
                                log.debug("Event: {}", e);
                                return e;
                            }).cache(0)
            ));
}

@DeleteMapping
public Mono<ResponseEntity<Object>> disposeSse() {
    return authenticationFacade.getConnectedUser()
            .filter(u -> subscriptions.containsKey(u.id))
            .map(u -> {
                log.debug("Dispose SSE Subscription for {}", u.id);
                return subscriptions.remove(u.id);
            })
            .map(_x -> ResponseEntity.noContent().build())
            .switchIfEmpty(Mono.just(ResponseEntity.notFound().build()));

}

```

En effet, nous n’avons pas la main sur la souscription du flux, il n’est donc pas possible de faire un `dispose`. **Le `takeWhile`, comme le `takeUntil` vont permettre de fermer le flux automatiquement** quand la condition est validée. Dans notre cas, le `takeWhile` permet de résilier la souscription quand le Flux ne se trouve plus dans le cache.

Enfin une route permet de supprimer l’entrée de cache pour un utilisateur. Du fait que rien ne permet au serveur d’être informé de la fermeture d’une connexion <abbr title="Server Sent Event">SSE</abbr>, le seul moyen est de demander à l’utilisateur de le prévenir. Il est important de noter que **le Flux n’est pas résilié immédiatement mais lors du passage du prochain élément** dans ce dernier.

## Ciblage d’un souscripteur particulier

{{< figimg src="target-specific-user.svg" float="left" alt="target specific users" >}}
À ce stade, notre service de notification n’est capable que de broadcaster des évènements à l’ensemble des souscripteurs. C’est utile pour notifier l’ensemble des utilisateurs connectés à un service qu’il faut se mettre à jour par exemple. Mais ça reste limité si on souhaite **envoyer une information à un seul des utilisateurs en particulier**.

Pour faire cela, l’idée va être de ne plus avoir un seul `Sink`, mais deux. Un pour les évènements broacastés, l’autre pour les évènements relatif à l’utilisateur courant. **Il suffit ensuite de merge les deux `Sink`**. Dans notre cache, on garde alors plusieurs choses :

* Le `Sink` broadcast sou forme de `Flux `
* Le `Sink` spécifique à l’utilisateur

Voilà ce que devient la méthode de souscription :

```java
    @Override
    public Flux<ServerEvent<Object>> subscribe() {
        if (multicast.isScanAvailable() && Boolean.TRUE.equals(multicast.scan(Scannable.Attr.TERMINATED))) {
            return Flux.error(() -> new IllegalStateException("Publisher was closed !"));
        }
        return authFacade.getConnectedUser().flatMapMany(u ->
                Objects.requireNonNull(cache.get(u.id, id -> {
                    /* ⤋⤋ On crée le Sink spécifique à l’utilisateur courant ⤋⤋ */
                    Sinks.Many<ServerEvent<Object>> sink = Sinks.many().multicast().directBestEffort();
                    AtomicReference<Subscription> subscription = new AtomicReference<>();
                    Flux<ServerEvent<Object>> multicastFlux = this.multicast.asFlux().doOnSubscribe(subscription::set);
                    /* ⤋⤋ On merge de les deux flux ⤋⤋ */
                    Flux<ServerEvent<Object>> eventPublisher = Flux.merge(sink.asFlux(), multicastFlux)
                            .takeWhile(e -> cache.asMap().containsKey(id))
                            .map(e -> {
                                log.debug("Event: {}", e);
                                return e;
                            }).cache(0);
                    return new ByUserEventPublisherCacheEntry(subscription, sink, eventPublisher);
                })).flux());
    }
```

On notera que dans ce code, on garde aussi la souscription au `Flux` broadcast pour pouvoir l’annuler lors de l’éviction de l’entrée du cache. On pourra code cette éviction de la manière suivante.

```java
this.cache = Caffeine.newBuilder()
        .expireAfterAccess(Duration.ofMinutes(30))
        .maximumSize(1000)
        .<String, ByUserEventPublisherCacheEntry>evictionListener((key, value, cause) -> {
            if (value != null) {
                value.sink().tryEmitComplete();
                Subscription subscription = value.subscription().getAndSet(null);
                if (subscription != null) {
                    subscription.cancel();
                }
            }
        })
        .build();
```

L’interface du service va changer comme suit :

```java
    <T> BasicEvent<T> broadcast(EventType type, T data);

    <T> BasicEvent<T> send(String userId, EventType type, T data);
```

On aura deux méthodes l’une qui va pousser un évènement dans le `Sink` broadcast, l’autre qui poussera dans le `Sink` de l’utilisateur. La clé de cache choisie étant par exemple l’identifiant de session (ou l’ID utilisateur), il est facile de le retrouver dans le contexte de la requête.


## Le code final

{{< figimg src="final-code-on-github.svg" float="right" alt="find the final code on github.com" >}}
Le code au-dessus est volontairement simplifié mais si le code complet vous intéresse, vous pouvez le trouver sur [github](https://gist.github.com/Marthym) :

* le [service](https://gist.github.com/Marthym/a90e5dffae9779ffb09c290a14f4d314)
* le [contrôleur](https://gist.github.com/Marthym/b75a7d43c2490744319265630b5eb084)

Le code a été remanié pour déporter la gestion du cache dans le service. Ce dernier possède deux interfaces, une pour envoyer la notification, à l’usage de tous les services qui ont besoin de faire ça. L’autre à destination du contrôleur qui va renvoyer le Flux à l’utilisateur et récupérer les demandes de résiliations.

Le cache utilisé est un vrai cache avec invalidation des entrées au bout de 30mn. Ce qui permet de ne pas garder indéfiniment les souscriptions des utilisateurs ayant brutalement fermé leur navigateur. Effet collatéral sympa, si un utilisateur garde son navigateur ouvert plus de 30mn sans rien faire, celui-ci redemande tout seul la connexion <abbr title="Server Sent Event">SSE</abbr> s’il la perd.

Le contrôleur possède une fonction de test qui envoi une notification quand on l’appelle.

Les illustrations utilisées proviennent de [Cocomaterial © 2020-present](https://cocomaterial.com/).