---
title: Server Sent Event vs Websocket avec Spring Webflux
date: 2021-12-11
lastmod: 2022-10-15
summary: |
    Les Websockets sont souvent évoqués pour les évènements serveur, mais ils ne sont pas la seule possibilité. Spring Boot Webflux est capable d’envoyer des Event Server out of the box. Pour changer des examples de code tirés d’application de chat, voici comment il est possible d’implémenter des notifications serveur en java.
categories: [development]
tags: [java, spring, webflux, network, baywatch]
image: featured-spring-sse-reactor.webp
toc: true
comment: /s/rnlrbh/server_sent_event_vs_websocket_avec
alias:
  - /2021/server-sent-event-vs-websocket-avec-spring-webflux/
---

Lorsqu’une application doit prévenir ses utilisateurs d’un évènement survenu sur le serveur, il existe plusieurs stratégies : Le long polling, les WebSocket ou, les **Server Sent Event (SSE)**.


> ### Edit : 16/03/2025 - Mise à jour et corrections
> 
> J’ai initialement écrit cet article en 2021. Depuis, entre les évolutions de Spring et les optimisations que j’ai apportées, cela valait la peine de faire une petite mise à jour de l’article.

## Comparaison des différentes stratégies
{{< figimg src="longpolling-websocket-sse.webp" alt="graphique de séquence long polling websocket server send event" >}}

### L’interrogation longue (long polling)

Le long polling consiste à ce que le front fasse un appel HTTP vers le backend en prévision d’une future information que le backend pourrait avoir à transmettre au front. Le backend garde la connexion et quand il a besoin de transmettre une notification ou autre information au front, il répond. Le front récupère alors l’information et renvoi une requête au backend pour la prochaine donnée.

L’intérêt par rapport à du short polling est l’efficience, on limite le nombre de requêtes. Cette stratégie permet en outre des communications à double sens. L’inconvénient majeur est de devoir maintenir une connexion en attente constamment.

Il est conseillé de limiter la durée de l’attente côté serveur, on préfèrera renvoyer une réponse vide plutôt que conserver la même connexion ouverte indéfiniment.

### Le WebSocket

Il s’agit d’un protocole largement répandu, basé sur TCP pour échanger des données, teste ou binaire, entre un client et un serveur en temps réel. Le protocole est standardisé depuis 2011 par l’<abbr title="Internet Engineering Task Force">[IETF](https://www.ietf.org/)</abbr> au travers de la norme [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455). Une connexion TCP persistante est initialisée via HTTP(s) et permet d’échanger autant de message que nécessaire dans n’importe quel sens.

### Server Sent Event

Server Sent Event est une norme et elle n’est pas toute jeune puisque **Opera l’a implémenté de façon expérimentale en 2006**, le **W3C l’a validé en 2013**. Du fait de son âge, elle est pleinement supportée par la plupart des navigateurs et fait partie de la spécification HTML 5.

{{< figimg src="server-send-message.svg" float="right" alt="server send event message" >}}
Contrairement aux WebSocket, le <abbr title="Server Sent Event">SSE</abbr> fonctionne sur le **protocole HTTP** et la **communication est unilatérale**, on ne peut qu’envoyer des évènements aux clients connectés. Dernier inconvénient face aux WebSocket, les <abbr title="Server Sent Event">SSE</abbr>s ne peuvent faire transiter **que du texte, pas de binaire**, ce qui laisse quand même la possibilité d’utiliser du JSON.

Parmi les avantages du <abbr title="Server Sent Event">SSE</abbr>, on profitera de la reconnexion automatique et la reprise automatique du flux, en cas de reconnexion, le client se souvient des évènements déjà lu.

Enfin, l’avantage que je préfère, les <abbr title="Server Sent Event">SSE</abbr> sont très simple à implémenter dans `Spring Boot`. Utilisé avec la programmation reactive de `Reactor` et `Webflux`, les Serveurs Send Event offrent des possibilités intéressantes. 


## Implémentation Spring Boot

Il va suffire de créer un contrôleur et une **fonction qui produit `TEXT_EVENT_STREAM_VALUE`**:

```java {linenos=table}
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

L’exemple est fonctionnel, mais il ne sert pas à grand-chose. Il envoie une chaine avec un compteur toutes les secondes, mais n’est pas d’un grand intérêt une fois le flux souscrit.

### Utilisation des Sinks

Maintenant, si on utilise **un `Sink` de `Reactor`** pour alimenter notre <abbr title="Server Sent Event">SSE</abbr>. Cela va permettre de contrôler les évènements qui sont envoyés dans le flux souscrit et de donner un peu d’intérêt à notre contrôleur.

```java {linenos=table}
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sse")
public class SseController {
    private final Sinks.Many<String> notificationSink = 
        Sinks.many().multicast().directBestEffort();

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sse() {
        return notificationSink.asFlux();
    }

    @GetMapping("/send")
    public Mono<Void> send(@RequestParam("msg") String msg) {
        notificationSink.tryEmitNext(msg);
        return Mono.empty();
    }
}
```

On voit que maintenant on maitrise ce qui est transmis au travers de la connexion SSE avec une quantité de code très limité.

En déplaçant le `notificationSink` dans un service, il est possible de s’en servir partout dans le code pour déclencher un évènement de notification via le `tryEmitNext()`.

Les paramètres de la création du `Sink` sont importants :

* `.many()`: Il va y avoir plusieurs évènements
* `.multicast()`: Ce flux va être souscrit plusieurs fois
* `.directBestEffort()`: On ne bufferize rien. On envoie le message aux souscripteurs présents et qui sont prêts à recevoir. Tant pis pour ceux qui ne l’ont pas reçu, on n’essaye pas de leur renvoyer.

### Annulation automatique des souscriptions

Avant de voir comment il est possible de contextualiser le flux pour viser des utilisateurs spécifiques, on peut améliorer un peu notre contrôleur afin de mieux exploiter les fonctionnalités du SSE.

```java {linenos=table}
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import com.github.f4b6a3.ulid.UlidFactory;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sse")
public class SseController {
    private final UlidFactory ulid = UlidFactory.newMonotonicInstance();
    private final Sinks.Many<ServerSentEvent<String>> notificationSink = 
        Sinks.many().multicast().directBestEffort();

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> sse() {
        return Flux.create(sink -> {
            sink.next(ServerSentEvent.<String>builder()
                    .id(ulid.create().toString())
                    .event("open")
                    .build());
            Disposable disposable = notificationSink.asFlux().subscribe(sink::next);
            sink.onCancel(disposable);
        });
    }

    @GetMapping("/send")
    public Mono<Void> send(@RequestParam("msg") String msg) {
        notificationSink.tryEmitNext(ServerSentEvent.<String>builder()
                .id(ulid.create().toString())
                .event("notification")
                .data(msg)
                .build());
        return Mono.empty();
    }
}
```

Spring fourni une classe `ServerSentEvent` qui permet de produire des évènements avec un ID et un type. L’ID permet au client de reprendre là où il s’est arrêté en cas de reconnexion, le type permet d’observer certains évènements en particulier. On a utilisé un <abbr title="Universally Unique Lexicographically sortable IDentifier">[ULID](https://github.com/ulid/spec)</abbr> pour générer l’id de l’évènement, mais on aurait très bien peu avoir un simple compteur. 

Dans l’exemple ci-dessus, dès la connexion effectuée, on transmet l’évènement `open`. Sans cet évènement, le client n’actera la réussite de la connexion qu’à partir du premier message ce qui peut poser des problèmes, en particulier pour l’annulation des souscriptions.

L’une des fonctionnalités sympa de la communication SSE est l’**annulation automatique de la souscription** par le client. Si l’utilisateur quitte la page qui a ouvert la connexion SSE ou s’il rafraîchit la page le navigateur annule la souscription et il est possible d’intercepter l’évènement. On pourra ainsi gérer plus facilement les traitements qui découlent de cette annulation. Dans l’exemple au-dessus, on a utilisé `Flux.create(sink -> {})`. Cela crée un flux indépendant, spécifique à la souscription et nous donne accès au `sink` du flux grâce auquel on peut intercepter l’annulation. Via ce dernier, on souscrit au flux de notifications et on pense à annuler cette souscription si le flux spécifique du SSE est annulé. **L’annulation n’est déclenchée par le client que s’il a reçu au moins un évènement**. D’où l’intérêt de l’événement `open` envoyé lors de la souscription.

Dans cet exemple on a utilisé un <abbr title="Universally Unique Lexicographically sortable IDentifier">[ULID](https://github.com/ulid/spec)</abbr> pour générer l’id de l’évènement, mais on aurait très bien peu avoir un simple compteur.

### Contextualisation du flux de notifications

Comme je le disais, le code plus haut est plus que sale. Un accès statique à une variable d’un contrôleur `Spring`. Cela viole presque tous les principes <abbr title="Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion">SOLID</abbr>. Une façon de corriger ça serait de créer un Service de Notification :

```java {linenos=table}
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
Avec le contrôleur tel qu’il est implémenté au-dessus, le code va présenter un problème de fuite mémoire : **Les ressources utilisées pour la souscription au Flux** (le contexte, ...) **ne sont jamais libérées**. Pire, si un utilisateur appelle la route <abbr title="Server Sent Event">SSE</abbr> 25x d’affilée, avec ou sans `EventSource#close` le serveur va se retrouver avec 25 contextes pour 25 souscriptions. Chaque élément envoyé dans le flux via le `Sink` effectuera 25 traitements avec possiblement des accés disque ou BBD. Ce comportement semble lié à un [problème sur Netty](https://github.com/spring-projects/spring-framework/issues/18523) ou juste à la façon dont les <abbr title="Server Sent Event">SSE</abbr> fonctionnent.

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