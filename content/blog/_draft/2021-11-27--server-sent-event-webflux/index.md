---
title: Server Sent Event vs Websocket avec Spring Webflux
date: 2021-11-27
excerpt: |
    Les Websockets sont souvent évoqué pour les évènements serveur, mais ils ne sont pas la seule possibilité. Spring Webflux est capable d’envoyer des envoyer des Event Server out of the box. Pour changer des examples de code chat et interval, voici comment il est possible d’implémenter des notifications.
tags: [java, spring, webflux]
image: top.jpg
toc: true
# comment: /s/s6d5d1/les_crit_res_de_recherche_avec_juery
---

L’idée est de prévenir les clients d’une application qu’un évènement s’est produit dans l’application. La première approche nous amène vers les WebSockets, souvent cités dès que l’on veut faire de la communication serveur vers client. Mais il existe une autre approche, les <strong>Server Sent Event</strong>. Avec des inconvénients, mais aussi des avantages face aux WebSockets.

## Server Sent Event

Cette norme ne date pas d’hier puisque Opera l’a implémenté de façon expérimentale en 2006, le W3C l’a validé en 2013. Du fait de son âge, elle est pleinement supportée par la plupart des navigateurs.

Contrairement aux WebSocket, le SSE fonctionne sur le protocole HTTP et la communication est unilatérale, on ne peut qu’envoyer des évènements aux clients connectés. Dernier inconvénient face aux WebSocket, les SSEs ne peuvent faire transiter que du texte, pas de binaire, ce qui laisse quand même la possibilité d’utiliser du JSON.

Je ne rentrerais pas plus dans les détails du fonctionnement ou de la norme elle-même, il est facile de trouver des informations sur le sujet. Un des avantages de la norme, est qu’il est très simple de l’implémenter dans `Spring Boot`. Utilisé avec la programmation asynchrone de `Reactor` et `Webflux`, les Serveurs Send Event offrent des possibilités intéressantes. 

En voilà quelques exemples.

## Implémentation Spring Boot

Il va suffire de créer un contrôleur et une fonction qui produit `TEXT_EVENT_STREAM_VALUE`:

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

L’exemple est fonctionnel, mais il ne sert pas à grand-chose. Il envoie une chaine avec un compteur toutes les secondes, mais on ne maitrise pas ce qui est envoyé.

### Utilisation des Sinks

Maintenant, si on utilise un `Sink` de `Reactor` pour alimenter notre SSE. Cela nous permettrait de contrôler les évènements qui sont envoyés via SSE.

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

Attention, ce code n’est là que pour la démonstration, on verra plus loin comment on re-factorise ça pour avoir du code plus propre.
Donc là, si de n’importe où dans le code vous accédez à `NotificationController.sink` et vous faites un `sink.tryEmitNext()`, un événement sera envoyé aux clients connectés.

Les paramètres de la création du `Sink` sont importants :

* `.many()`: Il va y avoir plusieurs évènements
* `.multicast()`: Ce flux va être souscrit plusieurs fois
* `.directBestEffort()`: On ne bufferize rien. On envoie le message aux souscripteurs présents et qui sont prêts à recevoir. Tant pis pour ceux qui ne l’ont pas reçu, on n’essaye pas de leur renvoyer.

### Implémentation d’un service de notification

Comme je le disais, le code plus haut est plus que sale. Un accès statique à une variable d’un contrôleur `Spring`. Ça viole presque tous les principes SOLID. Une façon de corriger ça serait de créer un Service de Notification :

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

L’`EventType` est un `enum` afin de mieux représenter les types possibles d’évènements (cf. spec SSE) mais il chaine fonctionne très bien. On peut y mettre ce que l’on veut. Le deuxième argument, pourquoi un `Mono` plutôt qu’une valeur directement ? Parce qu’il reste une dernière subtilité liée au contexte `Reactor`.

### Conservation du contexte Reactor

Comme `Reactor` exécute des fonctions de manière asynchrone et non bloquante, entre le début et la fin du flux, il ne peut garantir que toutes les fonctions seront exécutées sur le même thread. Si par exemple, il effectue de l’IO ou qu’il contacte une BDD, il va affecter le thread à d’autres taches, il ne le gardera pas en attente des résultats. Une fois que les résultats seront retournés, il va les traiter avec le premier thread disponible, pas forcément le même que celui de départ. Contrairement à un programme synchrone qui lui, va garder le thread en attente des résultats et c’est ce même thread qui sera utiliser pour traiter les résultats en retour.

Dans ces conditions, l’utilisation d’un `ThreadLocal` n’est pas possible. Pour palier ça, `Reactor` maintient un contexte dans lequel il peut stocker les variables relatives au flux en cours d’exécution. C’est notamment de contexte que `Spring` utilise pour garder l’authentification en mémoire. Car, controleur produisants des messages SSE bénéficient de `Spring Security` comme tous les autres contrôleurs, et c’est là que c’est intéressant. Avec un seul point d’entrée SSE il est possible de fournir des réponses personnalisées à chaque utilisateur. A condition que les fonctions du flux aien été exécuté avec le contexte de l’utilisateur. D’où l’usage d’un Mono à la place d’une valeur simple.

Avec un example derait être plus parlant.