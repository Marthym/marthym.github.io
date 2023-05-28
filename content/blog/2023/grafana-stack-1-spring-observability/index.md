---
title: Grafana Stack 📈 1. Observabilité avec Spring Boot 3
date: 2023-03-17
# modified: 2021-11-04
summary: |
    Spring Boot 3 vient avec quelques nouvelles fonctionnalités dont l’observabilité. Grace à Reactor et à Micrometer, il est très symple de mettre en place des métriques afin de suivre le comportement d’une application Spring Boot. Et grâce à la stack Grafana, il sera facile de la visualiser.
tags: [spring, grafana, metriques, devops]
# image: featured-azure-vs-keycloak.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

À mes heures perdues, je travaille sur une application de veille techno qui me permet de faire la mienne comme j’ai envie. Récemment, j’ai entendu parler d’[Opentelemetry](https://opentelemetry.io/) un collecteur de télémétrie. Et j’ai eu envie de le tester pour voir si je pouvais rendre mon application de veille observable.

Il existe une multitude de stack de télémétrie, mais Grafana est open source et permet d’avoir assez facilement tout sur la même application de rendue. De plus je voulais essayer [Loki](https://grafana.com/oss/loki/) en comparaisons de ELK que j’utilise déjà au travail. 

Voilà donc une série d’articles détaillants comment j’ai mis en place l’observabilité sur l’application de veille techno.

## La Stack Grafana

Avant de commencer, parlons un peu de la stack grafana. Elle est composée de plusieurs éléments. Dans mon poste précédent et dans mons poste actuel, j’ai beaucoup travaillé avec la stack <abbr title="Elastic Logstash Kibana">ELK</abbr>. Elle est très efficace, mais j’ai toujours trouvé qu’elle était compliquée à mettre en place et à configurer. C’est l’occasion de tester la stack Grafana qui semble plus simple.

### Prometheus
[Prometheus](https://prometheus.io/) est le moteur de stockage de métriques. Il s’agit d’un moteur de métriques dimensionnel. Chaque métrique est représentée par un nom et par des attributs, un ensemble de clé/valeur qui spécialise la donnée. Cela permet de faire des requêtes puissantes, mais il faut faire attention à ne pas avoir d'attributs dont l’ensemble de valeurs possible est trop important sans quoi les performances et l'espace de stockage vont explosés.

### Loki
[Loki](https://grafana.com/oss/loki/) est le moteur de stockage de logs. Mais, contrairement à Elastic qui va indexer tout le contenu des logs, Loki ne va indexer que certains attributs. Loki stocke les logs comme prometheus les métriques. Chaque log possède un ensemble d’attributs clé/valeurs qui sont indexés, le reste du message ne l’est pas. Comme pour les métriques on ne doit pas utiliser d’attribut avec un enseble de valeurs trop grand sous peine de problèmes de performance et d’explosion du stockage. L’intéret de cette approche est que l’empreinte sur le disque est bien plus faible que pour un Elastic. L’inconvénient est qu’il n’est pas possible de faire de recherche sur les champs non indexés et donc sur le contenu du message de log.

### Tempo
[Tempo](https://grafana.com/oss/tempo/) quant à lui va stocker les traces. C’est-à-dire le moyen de rapprocher les logs et les métriques dans un environnement micro-service. Cela fera l’objet d’un autre article.

### Grafana
Enfin [Grafana](https://grafana.com/grafana/) propose une interface unifiée pour visualiser toute cette télémétrie.


## Spring Boot et l’observabilité

L’observabilité regroupe les 3 éléments suivants :

* Les métriques
* Les logs
* les traces

Sur les dernières versions du framework, l’équipe de Spring à ajouté cette [fonctionnalité](https://spring.io/blog/2022/10/12/observability-with-spring-boot-3) qui est particulièrement bien intégré au modèle Spring Webflux et à la programmation réactive grâce à Micrometer et Reactor.

Avec très peu de code additionnel il est maintenant possible d’obtenir des métriques détaillées pour chaque exécution de stream que l’on souhaite observer.

## Déploiement des métriques

### Ajout des dépendences

Tout d’abord dans le `pom.xml` :

```xml
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-core-micrometer</artifactId>
</dependency>

<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

* `reactor-core-micrometer` est le plugin d’observabilité de micrometer qui lui permet de s’intégrer à reactor.
* `micrometer-registry-prometheus` représent le format de restitution des métriques. En effet, il existe plusieurs approches quant à la collecte de métriques. L’approche choisie détermine le format de restitution. Dans notre cas, on va utiliser un Stack Grafana pour stocker et visualiser nos métriques, c’est donc le format prometheus (le moteur de stockage de métriques de grafana) qui correspond à notre choix.
* `spring-boot-starter-actuator` l’actuator va nous permettre de mettre à disposition un API pour collecter les métriques

### Configuration Spring Boot

Maintenant, il reste à ajouter la configuration de l’actuator dans le fichier `application.yaml` :

```yaml
spring:
  application.name: MyApplication


management:
  endpoints.web.exposure.include: prometheus,health
  metrics:
    distribution.percentiles-histogram:
      http.server.requests: true
```

Pour ce qui est du nom de l’application, nous en auront besoin plus tard. Pour le reste, la ligne importante est `endpoints.web.exposure.include: prometheus` qui va activer l’api de collecte pour prometheus. Le reste des paramêtres permet d'avoir un peu plus de détails dans les métriques collectées.

À partir de là, l’application est déjà capable de fournir une grosse quantité de métriques sur le fonctionnement de Spring et de la JVM. Démarrer l’application et, avec un [postman](https://www.postman.com/) par exemple, faire une requête `GET /actuator/prometheus` qui est la route par défaut pour Prometheus.

```shell
# HELP jvm_threads_peak_threads The peak live thread count since the Java virtual machine started or peak was reset
# TYPE jvm_threads_peak_threads gauge
jvm_threads_peak_threads{application="MyApplication",} 45.0
# HELP jvm_gc_overhead_percent An approximation of the percent of CPU time used by GC activities over the last lookback period or since monitoring began, whichever is shorter, in the range [0..1]
# TYPE jvm_gc_overhead_percent gauge
jvm_gc_overhead_percent{application="MyApplication",} 0.00497286035688716
# HELP system_cpu_usage The "recent cpu usage" of the system the application is running in
# TYPE system_cpu_usage gauge
system_cpu_usage{application="MyApplication",} 0.0
# HELP process_files_max_files The maximum file descriptor count
# TYPE process_files_max_files gauge
process_files_max_files{application="MyApplication",} 1048576.0
# HELP bw_news_count Total number of News
# TYPE bw_news_count gauge
bw_news_count{application="MyApplication",} 0.0
# HELP jvm_gc_live_data_size_bytes Size of long-lived heap memory pool after reclamation
# TYPE jvm_gc_live_data_size_bytes gauge
jvm_gc_live_data_size_bytes{application="MyApplication",} 1.33460992E8
# HELP hikaricp_connections_max Max connections
# TYPE hikaricp_connections_max gauge
hikaricp_connections_max{application="MyApplication",pool="HikariPool-1",} 10.0
# HELP spring_security_authorizations_seconds  
# TYPE spring_security_authorizations_seconds summary
spring_security_authorizations_seconds_count{application="MyApplication",error="none",spring_security_authentication_type="UsernamePasswordAuthenticationToken",spring_security_authorization_decision="true",spring_security_object="exchange",} 1.0
spring_security_authorizations_seconds_sum{application="MyApplication",error="none",spring_security_authentication_type="UsernamePasswordAuthenticationToken",spring_security_authorization_decision="true",spring_security_object="exchange",} 0.005212113
```

Ce n’est qu’un exemple des métriques fournis de base par Spring mais il y en a sur beaucoup d’aspect : La mémoire, la consommation CPU, les routes appelées, le temps de démarrage, ...

### Ajout de la première métrique

Dans le cadre de l’application de veille techno, j’ai un process de scraping des feed de news qui se déclenche toutes les heures et ça m’intéresserait bien de l’observer.

Le code de se processus est un flux Reactor qui exécute toutes les étapes, lancé à intervale régulier par un Scheduler :

```java
@Override
public void run() {
    log.info("Start scraping ...");
    scraperService.scrap(properties.conservation())
            .subscribe();
}
```

J’ai simplifié le code réel, mais l’idée est là.

```java
// Injection de l’ObservationRegistry via le constructeur
private final ObservationRegistry observationRegistry;

@Override
public void run() {
    log.info("Start scraping ...");
    scraperService.scrap(properties.conservation())
            .name("bw_scraping_process")
            .tap(Micrometer.observation(observationRegistry))
            .subscribe();
}
```

Si on relance l’application maintenant et que l’on attend que le process de scraping se termine. Puis, que l’on interroge à nouveau la route `GET /actuator/prometheus`. On obtient les données supplémentaires suivantes.

```shell
# HELP bw_scraping_process_seconds  
# TYPE bw_scraping_process_seconds summary
bw_scraping_process_seconds_count{application="baywatch",error="none",reactor_status="completed",reactor_type="Mono",} 1.0
bw_scraping_process_seconds_sum{application="baywatch",error="none",reactor_status="completed",reactor_type="Mono",} 17.026397336
# HELP bw_scraping_process_seconds_max  
# TYPE bw_scraping_process_seconds_max gauge
bw_scraping_process_seconds_max{application="baywatch",error="none",reactor_status="completed",reactor_type="Mono",} 17.026397336
# HELP bw_scraping_process_active_seconds_max  
# TYPE bw_scraping_process_active_seconds_max gauge
bw_scraping_process_active_seconds_max{application="baywatch",reactor_type="Mono",} 0.0
# HELP bw_scraping_process_active_seconds  
# TYPE bw_scraping_process_active_seconds summary
bw_scraping_process_active_seconds_active_count{application="baywatch",reactor_type="Mono",} 0.0
bw_scraping_process_active_seconds_duration_sum{application="baywatch",reactor_type="Mono",} 0.0
```

L’observabilité de reactor produit en tout 2 groupes de 3 métriques :

* Les métriques d’exécution
  * le nombre total d'appel
  * la durée maximale
  * la somme des durées
* Les métriques d’exécution longue (active) qui donne les mêmes compteurs pour des opérations de plus longues durées qui ne seraient pas terminées.

### Utilisation d’une Gauge

Ces métriques sont pratiques, mais pas simple à interpréter. Finalement, si vous souhaitez voir l’évolution de la durée du scraping au fil du temps, cela n’est pas possible. Au mieux vous avez la durée moyenne. C’est pour cela qu’il peut être intéressant de déclarer une Gauge qui va permettre cette observation.

