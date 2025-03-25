---
title: Le protocole Server Sent Event avec Spring Webflux
date: 2021-12-11
lastmod: 2025-03-25
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


> ### Edit : 25/03/2025 - Mise à jour et corrections
> 
> J’ai initialement écrit cet article en 2021. Spring et Netty ont pas mal évolué et des choses se sont simplifié. L’article méritait une mise à niveau que voilà.

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

> ### Un inconvénient quand même
> Lorsque HTTP/2 n'est pas utilisé, les évènements serveurs sont limités par le nombre maximal de connexions ouvertes, notamment quand on a plusieurs onglets ouverts. La limite est fixée par le navigateur et vaut 6 pour chaque origine (voir les bugs [Chrome](https://bugs.chromium.org/p/chromium/issues/detail?id=275955) et [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=906896)). On pourra avoir 6 connexions pour les évènements serveurs parmi tous les onglets ouverts sur www.example1.com, 6 autres pour tous les onglets sur www.example2.com. Avec HTTP/2, le nombre de flux HTTP simultanés est négocié entre le serveur et le client et vaut 100 par défaut.
> 
> -- [*Alex Recarey*](https://stackoverflow.com/questions/5195452/websockets-vs-server-sent-events-eventsource/5326159#5326159)

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

L’exemple est fonctionnel, mais il ne sert pas à grand-chose. Il envoie une chaine avec un compteur toutes les secondes, ce qui n’est pas d’un grand intérêt une fois le flux souscrit.

{{< figimg src="01-sse-result-counter.webp" alt="Résultat d'une souscription SSE avec le code d'interval" >}}

### Utilisation des Sinks

Utilisons **un `Sink` de `Reactor`** pour alimenter notre <abbr title="Server Sent Event">SSE</abbr>. Cela va permettre de contrôler les évènements qui sont envoyés dans le flux souscrit et de donner un peu d’intérêt à notre contrôleur.

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

On voit que maintenant on maitrise ce qui est transmis au travers de la connexion <abbr title="Server Sent Event">SSE</abbr> avec une quantité de code très limité.

En déplaçant le `notificationSink` dans un service, il est possible de s’en servir partout dans le code pour déclencher un évènement de notification via le `tryEmitNext()`.

Les paramètres de la création du `Sink` sont importants :

* `.many()`: Il va y avoir plusieurs évènements
* `.multicast()`: Ce flux va être souscrit plusieurs fois
* `.directBestEffort()`: On ne bufferize rien. On envoie le message aux souscripteurs présents et qui sont prêts à recevoir. Tant pis pour ceux qui ne l’ont pas reçu, on n’essaye pas de leur renvoyer.

{{< figimg src="02-sse-result-sink.webp" alt="Résultat d'une souscription SSE avec l'utilisation de sink reactor" >}}

### Annulation automatique des souscriptions

Avant de voir comment il est possible de contextualiser le flux pour viser des utilisateurs spécifiques, on peut améliorer un peu notre contrôleur afin de mieux exploiter les fonctionnalités du <abbr title="Server Sent Event">SSE</abbr>.

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

Dans l’exemple ci-dessus, dès la connexion effectuée, on transmet l’évènement `open`. Sans cet évènement, **le client n’actera la réussite de la connexion qu’à partir du premier message** ce qui peut poser des problèmes, en particulier pour l’annulation des souscriptions.

L’une des fonctionnalités sympa de la communication <abbr title="Server Sent Event">SSE</abbr> est l’**annulation automatique de la souscription** par le client. Si l’utilisateur quitte la page ou l’onglet qui a ouvert la connexion <abbr title="Server Sent Event">SSE</abbr>, le navigateur annule la souscription et il est possible d’intercepter l’évènement. On pourra ainsi gérer plus facilement les traitements qui découlent de cette annulation. Dans l’exemple au-dessus, on a utilisé `Flux.create(sink -> {})`. Cela crée un flux indépendant, spécifique à la souscription et nous donne accès au `sink` du flux grâce auquel on peut intercepter l’annulation. Via ce dernier, on souscrit au flux de notifications et on annule cette souscription si le flux spécifique du <abbr title="Server Sent Event">SSE</abbr> est annulé. **L’annulation n’est déclenchée par le client que s’il a reçu au moins un évènement**. D’où l’intérêt de l’événement `open` envoyé lors de la souscription.

{{< figimg src="03-sse-result-open.webp" alt="Résultat d'une souscription SSE avec évènement open" >}}

### Contextualisation du flux de notifications

La dernière étape pour avoir un service de notification un peu crédible serait de pouvoir cibler un utilisateur en particulier. Pour cela on va faire évoluer le code comme suit :

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
    private final Map<String, Sinks.Many<ServerSentEvent<String>>> byUserNotifications = 
        new ConcurrentHashMap<>();

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> sse() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ((Entity<User>) ctx.getAuthentication().getPrincipal()).self().login())

                .flatMapMany(user -> Flux.create(sink -> {
                    sink.next(ServerSentEvent.<String>builder()
                            .id(ulid.create().toString())
                            .event("open")
                            .build());
                    var currentUserSink = byUserNotifications.computeIfAbsent(user, key -> 
                        Sinks.many().multicast().directBestEffort());
                    Disposable disposable = notificationSink.asFlux().subscribe(sink::next);
                    Disposable userDisposable = currentUserSink.asFlux().subscribe(sink::next);

                    sink.onCancel(() -> {
                        disposable.dispose();
                        userDisposable.dispose();
                        var userSink = byUserNotifications.get(user);
                        if (nonNull(userSink) && userSink.currentSubscriberCount() <= 0) {
                            byUserNotifications.remove(user);
                        }
                    });
                }));

    }

    @GetMapping("/send")
    public Mono<Void> send(
            @RequestParam("msg") String msg, 
            @Nullable @RequestParam(value = "user", required = false) String user) {
        if (nonNull(user)) {
            var userSink = byUserNotifications.get(user);
            if (nonNull(userSink)) {
                userSink.tryEmitNext(ServerSentEvent.<String>builder()
                        .id(ulid.create().toString())
                        .event("notification")
                        .data(String.format("[%s] %s", user, msg))
                        .build());
            }
        } else {
            notificationSink.tryEmitNext(ServerSentEvent.<String>builder()
                    .id(ulid.create().toString())
                    .event("notification")
                    .data(msg)
                    .build());
        }
        return Mono.empty();
    }
}
```

La sécurisation des contrôleurs fournie par Spring Boot fonctionne parfaitement avec les routes <abbr title="Server Sent Event">SSE</abbr>. Si vous l’avez mis en place, vous pouvez :
* protéger l’accès à la route <abbr title="Server Sent Event">SSE</abbr>
* récupérer l’utilisateur connecté depuis la route <abbr title="Server Sent Event">SSE</abbr>

C’est ce que fait la fonction avec `ReactiveSecurityContextHolder`. La partie `ctx.getAuthentication().getPrincipal()).self().login()` dépend de la façon dont vous avez configuré votre authentification, ici on simplifie et on ne récupère que le login de l’utilisateur qui servira de clé pour ma `Map`. 

La `Map` va permettre de retrouver le sink correspondant à l’utilisateur que l’on veut cibler. Ainsi dans la fonction d’envoi, on ajoute un paramètre `user` qui, s’il est présent, permettra de retrouver le bon sink.

Dans le `onCancel` on prend soin de bien annuler les souscriptions et s’il ne reste plus d’autre souscription sur le flux spécifique à l’utilisateur on le sort de la `Map`. En effet, si un utilisateur ouvre plusieurs onglets, il va souscrire plusieurs fois à son flux personnel. On ne veut pas supprimer le flux de la `Map` s’il reste des souscriptions.

{{< figimg src="04-sse-result-targeting.webp" alt="Résultat d'une souscription SSE ciblant un utilisateur" >}}

*Les messages ciblant un utilisateur spécifique sont précédé du nom de l’utilisateur ciblé entre crochet.*

## Conclusion

{{< figimg src="final-code-on-github.svg" float="right" alt="find the final code on github.com" >}}
Notre service de notification est terminé, il ne reste plus qu’à tout faire. C’est ce principe de notification qui est utilisé dans [Baywatch]({{< relref "baywatch-2-1-0" >}}) donc si vous voulez voir le code complet qui utilise les <abbr title="Server Sent Event">SSE</abbr>, allez faire un tour sur le github de l’appli: [github](https://github.com/Marthym/baywatch) :

* le [service](https://github.com/Marthym/baywatch/blob/develop/sandside/src/main/java/fr/ght1pc9kc/baywatch/notify/domain/NotifyServiceImpl.java)
* le [contrôleur](https://github.com/Marthym/baywatch/blob/develop/sandside/src/main/java/fr/ght1pc9kc/baywatch/notify/infra/NotificationController.java)
* le [client](https://github.com/Marthym/baywatch/blob/develop/seaside/src/layout/services/ServerEventService.ts)
