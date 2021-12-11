---
title: Server Sent Event vs Websocket avec Spring Webflux
date: 2021-12-11
excerpt: |
    Les Websockets sont souvent évoqués pour les évènements serveur, mais ils ne sont pas la seule possibilité. Spring Boot Webflux est capable d’envoyer des Event Server out of the box. Pour changer des examples de code tirés d’application de chat, voici comment il est possible d’implémenter des notifications serveur en java.
tags: [java, spring, webflux]
image: spring-sse-reactor-header.webp
toc: true
comment: /s/rnlrbh/server_sent_event_vs_websocket_avec
---

La fonctionnalité est de prévenir les clients d’une application qu’un évènement s’est produit dans cette application. La première approche consiste souvent à implémenter les WebSockets. Régulièrement cités dès que l’on veut faire de la communication serveur vers clients. Mais il existe une autre approche, les **Server Sent Event**. Avec des inconvénients, mais aussi des avantages face aux WebSockets.

## Server Sent Event

Server Sent Event est une norme et elle n’est pas toute jeune puisque **Opera l’a implémenté de façon expérimentale en 2006**, le **W3C l’a validé en 2013**. Du fait de son âge, elle est pleinement supportée par la plupart des navigateurs.

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

Comme `Reactor` exécute des fonctions de manière asynchrone et non bloquante, entre le début et la fin d’un flux de traitement, **il ne peut garantir que toutes les fonctions seront exécutées sur le même thread**. Si par exemple, une fonction effectue de l’IO ou contacte une base de données, ``Reactor`` va libérer le thread le temps que les données soient retournés, il ne le gardera pas en attente des résultats. Une fois que les résultats seront retournés, il va les traiter avec le premier thread disponible, pas forcément le même que celui de départ. Contrairement à un programme synchrone qui lui, va garder le thread en attente des résultats et l’utiliser pour traiter les résultats en retournés.

Dans ces conditions, **l’utilisation d’un `ThreadLocal` n’est pas possible**. Pour palier ça, `Reactor` maintient un contexte dans lequel il peut stocker les variables relatives au flux en cours d’exécution. C’est notamment ce contexte que `Spring` utilise pour garder l’authentification en mémoire. Car, **les contrôleurs produisants des messages <abbr title="Server Sent Event">SSE</abbr> bénéficient de `Spring Security`** comme tous les autres contrôleurs, et c’est là que c’est intéressant. Avec un seul point d’entrée <abbr title="Server Sent Event">SSE</abbr> **il est possible de fournir des réponses personnalisées à chaque utilisateur**. À condition que les fonctions du flux aient été exécuté avec le contexte de l’utilisateur. D’où l’usage d’un Mono à la place d’une valeur simple.

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

Dans ce deuxième cas par contre, la souscription est laissée au `notifyService` qui la transmet au contrôleur. Ce qui fait que **les souscripteurs sont les clients connectés à la route <abbr title="Server Sent Event">SSE</abbr>**. Comme le `Sink` précédement crée est un `multicast()` il peut y avoir plusieurs souscripteurs et donc le code des fonctions de `statService` est **souscrit et exécuté une fois par chaque souscripteur avec le contexte de ce dernier**. C'est-à-dire pour chaque client avec sa propre authentification. **Attention tout de même à la performance** dans ces conditions si on ne maitrise pas le nombre de connexions à la route <abbr title="Server Sent Event">SSE</abbr>, on ne maitrise pas le nombre d’appels aux fonctions de `statService`.
