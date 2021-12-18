---
title: Exceptions avec Logback
date: "2018-11-01T08:00:00-00:00"
excerpt: "Comment optimiser à moindre cout l’affichage des exceptions avec logback"
tags: [java, log, slf4j, logback, planetlibre]
image: back.webp
---

Un post rapide, j’ai trouvé ça hier, je ne connaissais pas et pourtant je trouve ça vraiment pratique. L’optimisation de l’affiche des exceptions Java grâce à la configuration Logback.

<!-- more -->

Dans mes dev, j’utilise pas mal [Reactor] avec [Spring webflux]. Le truc un peu lourd avec [Reactor] c’est les stacktraces. Elles ont tendance à faire plusieurs kilomètres de long à cause de l’imbrication des Flux/Mono. J’en avais qui dépassaient les 120 lignes. Du coup ça a tendance à bien pourrir les logs et si on ajoute celles de debug, c’est un peu compliqué de s’y retrouver, d’autant que la partie intéressant se retrouve en général en plein milieu du flow.

C’est là qu’intervient un configuration magique de logback que je ne connaissais pas : `%rEx{depth}`.

Dans la doc 

> Outputs the stack trace of the exception associated with the logging event, if any. The root cause will be output first instead of the standard "root cause last".
>
> -- https://logback.qos.ch/manual/layouts.html

Trois choses sympa dans cette option :

* Les root causes sont remontés au début
* Il est possible de filtrer des éléments de la stack
* Il est possible de limiter la taille de la stack affichée

En ajoutant juste `%wEx{full, reactor.core.publisher}` à la fin de mon pattern la stacktrace passe de 200 lignes à 25 lignes. Et plus besoin de chercher l’exception racine, elle est en haut.

## Et dans Spring

Et petit bonus, pour modifier le pattern dans une application Spring, il suffit d’ajouter la config suivante pour avoir le même effet :

```conf
logging.exception-conversion-word=%wEx{full, reactor.core.publisher}
```

[Reactor]: https://projectreactor.io/
[Spring webflux]: https://docs.spring.io/spring/docs/current/spring-framework-reference/web-reactive.html