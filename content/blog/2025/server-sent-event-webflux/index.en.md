---
title: The Server Sent Event protocol with Spring Webflux
date: 2025-03-25
# lastmod: 2025-03-25
summary: |
    WebSockets are often mentioned for server events, but they are not the only option. Spring Boot WebFlux can send Server Sent Events out of the box. To change from the usual chat application examples, here’s how to implement server notifications in Java with Spring Webflux.
categories: [development]
tags: [java, spring, webflux, network, baywatch]
image: featured-spring-sse-reactor.webp
toc: true
comment: /s/rnlrbh/server_sent_event_vs_websocket_avec
alias:
  - /2021/server-sent-event-vs-websocket-avec-spring-webflux/
---

When an application needs to notify its users of an event occurring on the server, several strategies exist: Long polling, WebSockets, or **Server Sent Events (SSE)**.

## Comparing Different Strategies
{{< figimg src="longpolling-websocket-sse.webp" alt="sequence diagram of long polling, websocket, and server-sent event" >}}

### Long Polling

Long polling involves the front-end making an HTTP call to the backend in anticipation of future information that the backend might need to send. The backend keeps the connection open, and when it needs to send a notification or other information to the front-end, it responds. The front-end then retrieves the information and sends another request to the backend In prevision of the next data to be sent by the server.

Compared to short polling, this approach is more efficient as it reduces the number of requests. Additionally, it allows for two-way communication. The main downside is the need to maintain an open connection constantly.

It is recommended to limit the wait duration on the server side and return an empty response rather than keeping the connection open indefinitely.

### WebSockets

WebSockets is a widely used protocol based on TCP for exchanging text or binary data between a client and a server in real time. It was standardized in 2011 by the <abbr title="Internet Engineering Task Force">[IETF](https://www.ietf.org/)</abbr> through [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455). A persistent TCP connection is initialized via HTTP(s), allowing as many messages as needed to be exchanged in either direction.

### Server Sent Events (SSE)

Server Sent Events is a standard that has been around for a while. **Opera implemented it experimentally in 2006**, and the **W3C validated it in 2013**. Due to its age, it is fully supported by most browsers and is part of the HTML5 specification.

{{< figimg src="server-send-message.svg" float="right" alt="server send event message" >}}

Unlike WebSockets, <abbr title="Server Sent Event">SSE</abbr> operates over the **HTTP protocol** and communication is **unidirectional**—it can only send events to connected clients. Another disadvantage compared to WebSockets is that SSE **only transmits text, not binary data**, though JSON can still be used.

Among the advantages of <abbr title="Server Sent Event">SSE</abbr>, automatic reconnection and stream resumption stand out. If the client reconnects, it remembers previously read events.

Finally, my favorite advantage: <abbr title="Server Sent Event">SSE</abbr> is very easy to implement in `Spring Boot`. When combined with `Reactor` and `WebFlux` for reactive programming, Server Sent Events offer interesting possibilities.

> ### One Drawback
> When HTTP/2 is not used, server events are limited by the maximum number of open connections, especially when multiple tabs are open. This limit is set by the browser and is 6 per origin (see [Chrome](https://bugs.chromium.org/p/chromium/issues/detail?id=275955) and [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=906896) bugs). You can have 6 connections for server events across all open tabs on www.example1.com and another 6 for www.example2.com. With HTTP/2, the number of simultaneous HTTP streams is negotiated between the server and client and defaults to 100.
>
> -- [*Alex Recarey*](https://stackoverflow.com/questions/5195452/websockets-vs-server-sent-events-eventsource/5326159#5326159)

## Spring Boot Implementation

A simple controller and a **function producing `TEXT_EVENT_STREAM_VALUE`** are enough:

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

This example is functional but not particularly useful. It simply sends a string with a counter every second, which isn’t very interesting once the stream is subscribed to.

{{< figimg src="01-sse-result-counter.webp" alt="SSE subscription result with interval code" >}}

### Using Sinks

We can use **a `Sink` from `Reactor`** to feed our <abbr title="Server Sent Event">SSE</abbr>. This allows us to control the events sent into the subscribed stream and makes our controller more useful.

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

Now, we control what is transmitted over the <abbr title="Server Sent Event">SSE</abbr> connection with a code that's quite frugal.

By moving `notificationSink` into a service, it can be used throughout the code to trigger a notification event via `tryEmitNext()`.

The parameters used when creating the `Sink` are important:

* `.many()`: There will be multiple events.
* `.multicast()`: This stream will be subscribed to multiple times.
* `.directBestEffort()`: No buffering. The message is sent only to subscribers that are present and ready to receive it. If they miss it, it won’t be resent.

{{< figimg src="02-sse-result-sink.webp" alt="SSE subscription result using Reactor sink" >}}

### Automatic subscription cancellation

Before we look at how we can contextualize the stream to target specific users, we can enhance our controller a little to better exploit the <abbr title="Server Sent Event">SSE</abbr> features.

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

Spring provides a `ServerSentEvent` class that allows producing events with an ID and a type. The ID enables the client to resume where it left off in case of reconnection, and the type allows observing specific events. We used a <abbr title="Universally Unique Lexicographically sortable IDentifier">[ULID](https://github.com/ulid/spec)</abbr> to generate the event ID, but a simple counter could have been used as well.

In the example above, as soon as the connection is established, an `open` event is transmitted. Without this event, **the client will only acknowledge the connection's success after receiving the first message**, which can cause issues, particularly for subscription cancellations.

One of the nice features of <abbr title="Server Sent Event">SSE</abbr> communication is the **automatic cancellation of the subscription** by the client. If the user leaves the page or tab that opened the <abbr title="Server Sent Event">SSE</abbr> connection, the browser cancels the subscription, and it is possible to intercept this event. This allows for easier management of the processes that follow this cancellation. In the example above, we used `Flux.create(sink -> {})`. This creates an independent, subscription-specific flux and gives us access to the `sink` of the flux, through which we can intercept the cancellation. Using this, we subscribe to the notification flux and cancel this subscription if the specific flux of the <abbr title="Server Sent Event">SSE</abbr> is canceled. **The cancellation is only triggered by the client if it has received at least one event**. Hence the importance of the `open` event sent immediatly after subscription.

{{< figimg src="03-sse-result-open.webp" alt="Result of SSE subscription with open event" >}}

### Contextualizing the notification flux

The final step towards a credible notification service would be to be able to target a specific user instead of broadcasting. To achieve this, we'll modify the code as follows:

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

The security of controllers provided by Spring Boot works perfectly with <abbr title="Server Sent Event">SSE</abbr> routes. If you have set it up, you can:
* protect access to the <abbr title="Server Sent Event">SSE</abbr> route
* retrieve the logged-in user from the <abbr title="Server Sent Event">SSE</abbr> route

This is what the function does with `ReactiveSecurityContextHolder`. The part `ctx.getAuthentication().getPrincipal()).self().login()` depends on how you have configured your authentication. Here, we simplify and only retrieve the user's login, which will serve as the key for my `Map`.

The `Map` allows finding the sink corresponding to the user we want to target. Thus, in the sending function, we add a `user` parameter that, if present, will allow finding the correct sink.

In the `onCancel`, we make sure to properly cancel the subscriptions, and if there are no more subscriptions on the user-specific flux, we remove it from the `Map`. Indeed, if a user opens multiple tabs, they will subscribe multiple times to their personal flux. We do not want to remove the flux from the `Map` if subscriptions are still open.

{{< figimg src="04-sse-result-targeting.webp" alt="Result of a user-targeted SSE subscription" >}}

*Messages targeting a specific user are preceded by the name of the targeted user in square brackets.*

## Conclusion

{{< figimg src="final-code-on-github.svg" float="right" alt="find the final code on github.com" >}}

Our notification service is complete, it just needs to be put to use. This notification principle is used in [Baywatch]({{< relref "baywatch-2-1-0" >}}), so if you want to see the full implementation using <abbr title="Server Sent Event">SSE</abbr>, check out the app’s GitHub repository: [GitHub](https://github.com/Marthym/baywatch):

* [Service](https://github.com/Marthym/baywatch/blob/develop/sandside/src/main/java/fr/ght1pc9kc/baywatch/notify/domain/NotifyServiceImpl.java)
* [Controller](https://github.com/Marthym/baywatch/blob/develop/sandside/src/main/java/fr/ght1pc9kc/baywatch/notify/infra/NotificationController.java)
* [Client](https://github.com/Marthym/baywatch/blob/develop/seaside/src/layout/services/ServerEventService.ts)
