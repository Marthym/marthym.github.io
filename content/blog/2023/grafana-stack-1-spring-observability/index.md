---
title: Grafana Stack 📈 1. Observabilité avec Spring Boot 3
date: 2023-06-10
# modified: 2021-11-04
summary: |
    Spring Boot 3 vient avec quelques nouvelles fonctionnalités dont l’observabilité. Grace à Reactor et à Micrometer, il est très simple de mettre en place des métriques afin de suivre le comportement d’une application Spring Boot. Et grâce à la stack Grafana, il sera facile de la visualiser.
categories: [observabilité]
tags: [spring, grafana, java, infra]
image: feature-grafana-stack-spring-boot-3-observability.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

À mes heures perdues, je travaille sur une application de veille techno qui me permet de faire la mienne <em>(veille)</em> comme j’ai envie. Récemment, j’ai entendu parler d’<strong>[Opentelemetry](https://opentelemetry.io/) un collecteur de télémétrie</strong>. Et j’ai eu envie de le tester pour voir si je pouvais rendre mon application observable.

{{< figimg src="leasure_techwatch.svg" float="right" alt="Veille techno en temps libre" >}}
Il existe une multitude de stack de télémétrie, mais Grafana est open source et permet d’avoir assez facilement toutes les métriques sur la même application de rendu. De plus, je voulais essayer [Loki](https://grafana.com/oss/loki/) en comparaisons de <abbr title="Elastic Logstash Kibana">ELK</abbr> que j’utilise déjà au travail.

Voilà donc une série d’articles détaillants comment <strong>mettre en place l’observabilité sur une application Spring Boot 3</strong>.

**Les autres articles de la série :**

1. Observabilité avec Spring Boot 3
2. [Collecte des métriques avec OpenTelemetry]({{< relref "grafana-stack-2-collect-metrics-otel" >}})
3. [Collecte des logs avec OpenTelemetry]({{< relref "grafana-stack-3-collect-logs-otel" >}})
4. [Déploiement d’un Grafana]({{< relref "grafana-stack-4-grafana" >}})

## La Stack Grafana

Avant de commencer, parlons un peu de la stack grafana. Elle est composée de plusieurs éléments. Dans mon boulot précédent et dans mon poste actuel, j’ai beaucoup travaillé avec la stack <abbr title="Elastic Logstash Kibana">ELK</abbr>. Elle est très efficace, mais j’ai toujours trouvé qu’elle était compliquée à mettre en place et à configurer. C’est l’occasion de tester la stack Grafana plus simple à mettre en œuvre.

### Prometheus
{{< figimg src="prometheus_god_fire.svg" float="left" alt="Prometheus à volé le feu aux dieux" >}}
<strong>[Prometheus](https://prometheus.io/) est le moteur de stockage de métriques</strong>. Il s’agit d’un moteur de métriques dimensionnel. Chaque métrique est représentée par un nom et par des attributs, un ensemble de clé/valeur qui spécialise la donnée. Cela permet de faire des requêtes puissantes, mais il faut faire attention à <strong>ne pas avoir d’attributs dont l’ensemble de valeurs possible est trop important</strong> sans quoi les performances et l’espace de stockage vont exploser.

<p class="clear-both"></p>

### Loki
<strong>[Loki](https://grafana.com/oss/loki/) est le moteur de stockage de logs</strong>. Mais, contrairement à Elastic qui va indexer tout le contenu des logs, Loki ne va indexer que certains attributs. Loki stocke les logs comme prometheus les métriques. Chaque log possède un ensemble d’attributs clé/valeur qui sont indexés, le reste du message ne l’est pas. Comme pour les métriques on ne doit pas utiliser d’attribut avec un ensemble de valeurs trop grand sous peine de problèmes de performance et d’explosion du stockage. L’intérêt de cette approche est que l’empreinte sur le disque est bien plus faible que pour un Elastic. L’inconvénient est qu’<strong>il n’est pas possible de faire de recherche sur les champs non indexés</strong> et donc sur le contenu du message de log.

### Tempo
[Tempo](https://grafana.com/oss/tempo/) quant à lui, va stocker les traces. C’est-à-dire le moyen de rapprocher les logs et les métriques dans un environnement micro-service. Cela fera l’objet d’un autre article.

### Grafana
Enfin [Grafana](https://grafana.com/grafana/) propose une interface unifiée pour visualiser toute cette télémétrie.


## Spring Boot et l’observabilité

{{< figimg src="spring_boot_observability.svg" float="right" alt="Spring observability" >}}

L’observabilité regroupe les 3 éléments suivants :

* Les métriques
* Les logs
* Les traces

Sur les dernières versions du framework, l’équipe de Spring a ajouté la [fonctionnalité d’observabilité](https://spring.io/blog/2022/10/12/observability-with-spring-boot-3) qui est particulièrement bien intégré au modèle Spring Webflux et à la programmation réactive grâce à Micrometer et Reactor.

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
* `micrometer-registry-prometheus` représente le format de restitution des métriques. En effet, il existe plusieurs approches quant à la collecte de métriques. L’approche choisie détermine le format de restitution. Dans notre cas, on va utiliser un Stack Grafana pour stocker et visualiser nos métriques, c’est donc le format prometheus (le moteur de stockage de métriques de grafana) qui correspond à notre choix.
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
    tags:
      application: ${spring.application.name}
```

Le nom de l’application va permettre d’avoir un contexte dans tous les logs et toutes les métriques. Ainsi, si vous avez plusieurs applications spring qui génère des métriques cela vous permettra de les différentier. De la même façon si vous avez un cluster de plusieurs nœuds, il sera intéressant d’ajouter ici l’identifiant du nœuds.

Pour le reste, la ligne importante est `endpoints.web.exposure.include: prometheus` qui va activer l’api de collecte pour prometheus. Le reste des paramètres permet d'avoir un peu plus de détails dans les métriques collectées.

À partir de là, l’application est déjà capable de fournir une grosse quantité de métriques sur le fonctionnement de Spring et de la JVM. Démarrer l’application et, avec un [postman](https://www.postman.com/) par exemple, faire une requête `GET /actuator/prometheus` qui est la route par défaut pour Prometheus.

```shell
# HELP jvm_threads_peak_threads The peak live thread count since the Java virtual machine started or peak was reset
# TYPE jvm_threads_peak_threads gauge
jvm_threads_peak_threads{context="MyApplication",} 45.0
# HELP jvm_gc_overhead_percent An approximation of the percent of CPU time used by GC activities over the last lookback period or since monitoring began, whichever is shorter, in the range [0..1]
# TYPE jvm_gc_overhead_percent gauge
jvm_gc_overhead_percent{context="MyApplication",} 0.00497286035688716
# HELP system_cpu_usage The "recent cpu usage" of the system the application is running in
# TYPE system_cpu_usage gauge
system_cpu_usage{context="MyApplication",} 0.0
# HELP process_files_max_files The maximum file descriptor count
# TYPE process_files_max_files gauge
process_files_max_files{context="MyApplication",} 1048576.0
# HELP bw_news_count Total number of News
# TYPE bw_news_count gauge
bw_news_count{context="MyApplication",} 0.0
# HELP jvm_gc_live_data_size_bytes Size of long-lived heap memory pool after reclamation
# TYPE jvm_gc_live_data_size_bytes gauge
jvm_gc_live_data_size_bytes{context="MyApplication",} 1.33460992E8
# HELP hikaricp_connections_max Max connections
# TYPE hikaricp_connections_max gauge
hikaricp_connections_max{context="MyApplication",pool="HikariPool-1",} 10.0
# HELP spring_security_authorizations_seconds  
# TYPE spring_security_authorizations_seconds summary
spring_security_authorizations_seconds_count{context="MyApplication",error="none",spring_security_authentication_type="UsernamePasswordAuthenticationToken",spring_security_authorization_decision="true",spring_security_object="exchange",} 1.0
spring_security_authorizations_seconds_sum{context="MyApplication",error="none",spring_security_authentication_type="UsernamePasswordAuthenticationToken",spring_security_authorization_decision="true",spring_security_object="exchange",} 0.005212113
```

Ce n’est qu’un exemple des métriques fournis de base par Spring, mais il y en a sur beaucoup d’aspects : La mémoire, la consommation CPU, les routes appelées, le temps de démarrage, ...

### Ajout de la première métrique

Dans le cadre de l’application de veille techno, j’ai un process de scraping des feed de news qui se déclenche toutes les heures et ça m’intéresserait bien de l’observer.

Le code de ce processus est un flux Reactor qui exécute toutes les étapes, lancé à intervales réguliers par un Scheduler :

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
bw_scraping_process_seconds_count{context="MyApplication",error="none",reactor_status="completed",reactor_type="Mono",} 1.0
bw_scraping_process_seconds_sum{context="MyApplication",error="none",reactor_status="completed",reactor_type="Mono",} 17.026397336
# HELP bw_scraping_process_seconds_max  
# TYPE bw_scraping_process_seconds_max gauge
bw_scraping_process_seconds_max{context="MyApplication",error="none",reactor_status="completed",reactor_type="Mono",} 17.026397336
# HELP bw_scraping_process_active_seconds_max  
# TYPE bw_scraping_process_active_seconds_max gauge
bw_scraping_process_active_seconds_max{context="MyApplication",reactor_type="Mono",} 0.0
# HELP bw_scraping_process_active_seconds  
# TYPE bw_scraping_process_active_seconds summary
bw_scraping_process_active_seconds_active_count{context="MyApplication",reactor_type="Mono",} 0.0
bw_scraping_process_active_seconds_duration_sum{context="MyApplication",reactor_type="Mono",} 0.0
```

L’observabilité de reactor produit en tout 2 groupes de 3 métriques :

* Les métriques d’exécution
  * le nombre total d’appels
  * la durée maximale
  * la somme des durées
* Les métriques d’exécution longue (active) qui donne les mêmes compteurs pour des opérations de plus longues durées qui ne seraient pas terminées.

### Utilisation d’une Gauge

Ces métriques sont pratiques, mais pas simple à interpréter. Finalement, si vous souhaitez voir l’évolution de la durée du scraping au fil du temps, cela n’est pas possible. Au mieux, vous avez la durée moyenne. C’est pour cela qu’il peut être intéressant de déclarer une Gauge qui va permettre cette observation.

```java
private final AtomicLong lastScrapingDuration = new AtomicLong(0);

public ScraperTaskScheduler(MeterRegistry registry) {
    TimeGauge.builder("bw_scraping_process", lastScrapingDuration::get, TimeUnit.MILLISECONDS)
            .description("Last scraping duration")
            .register(registry);
}

@Override
public void run() {
    log.info("Start scraping ...");
    long startTime = System.currentTimeMillis();
    scraperService.scrap(properties.conservation())
            .doFinally(s -> lastScrapingDuration.set(System.currentTimeMillis() - startTime))
            .subscribe();
}
```

Les `TimeGauge` permettent d’ajouter au compteur une unité de temps.

Maintenant si on relance l’application pour voir les compteurs, voilà ce que l’on a.

```shell
# HELP bw_scraping_process_seconds Last scraping duration
# TYPE bw_scraping_process_seconds gauge
bw_scraping_process_seconds{context="MyApplication",} 14.201
```

Ce n’est pas flagrant comme changement mais, dans le cas d’une gauge, chaque nouvelle valeur vient remplacer la précédente. Contrairement à un timer ou un compteur qui additionne chaque nouvelle valeur avec la précédente.

### Ajout du contexte

Il est possible d’ajouter du contexte dans les métriques programmatiquement en utilisant le `MeterRegistryCustomizer`. Il sera cependant plus simple d’utiliser les paramètres de configuration vu au début de cet article.

```java
@Configuration
public class SpringConfiguration {
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(@Value("${spring.application.name}") String application) {
        return registry -> registry.config()
                .commonTags("context", application.toLowerCase());
    }
}
```

### Sécurisation

Dernier point important, la sécurisation du point d’accès aux métriques. <strong>Pensez à sécuriser ce point d'accès</strong>, même si y accéder ne suffira pas à pirater l’application, les métriques laissent passer bon nombre d’informations exploitables qui permettrait à une personne mal intentionnée de dénicher d’éventuelles failles de sécurités.

## Amélioration des logs

{{< figimg src="improve_logs.svg" float="left" alt="Logs de spring boot en JSON" >}}
Les logs par défaut de Spring sont vraiment appréciables et bien formatés. Mais des logs au format texte restent un enfer à parser. Tous ceux qui ont travaillé un peu avec Logstash ont leurs collections de grok bien au chaud pour ce genre de chose.

Le plus simple est de faire en sorte que Spring sorte les logs en JSON, déjà parsé, elles seront directement lisibles par le collecteur. L’idéal serait que l’on puisse régler ça grâce à une variable d’environnement, ce qui permettrait de garder les logs <em>"humain"</em> pendant le développement et d’utiliser le json pour la production.

Logback possède un plugin qui permet d’obtenir ce résultat.

### Ajouter les dépendances

```xml
<dependency>
    <groupId>ch.qos.logback.contrib</groupId>
    <artifactId>logback-json-classic</artifactId>
    <version>0.1.5</version>
</dependency>
<dependency>
    <groupId>ch.qos.logback.contrib</groupId>
    <artifactId>logback-jackson</artifactId>
    <version>0.1.5</version>
</dependency>
```

### Configuration logback

Ensuite on configure logback comme suit dans un fichier `logback-spring.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <springProperty scope="context" name="appName" source="spring.application.name"/>
    <springProperty scope="context" name="rootLevel" source="logging.level.root"/>

    <springProfile name="json-logging">
        <contextName>${appName}</contextName>
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <layout class="ch.qos.logback.contrib.json.classic.JsonLayout">
                <jsonFormatter class="ch.qos.logback.contrib.jackson.JacksonJsonFormatter"/>
                <timestampFormat>${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd'T'HH:mm:ss.SSS'Z'}</timestampFormat>
                <appendLineSeparator>true</appendLineSeparator>
                <prettyPrint>false</prettyPrint>
            </layout>
        </appender>
        <statusListener class="ch.qos.logback.core.status.NopStatusListener" />
    </springProfile>

    <springProfile name="!json-logging">
        <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
    </springProfile>

    <root level="${rootLevel}">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

L’intérêt de cette <strong>configuration</strong>, c'est qu’elle est <strong>attachée au profil</strong>. Il est donc facile de passer de cette configuration à la configuration par défaut des logs via la variable d'environnement `SPRING_PROFILES_ACTIVE=json-logging`.

À noter l’utilisation de `spring.application.name` que l’on a mis à jour dans les propriétés de l’application et qui va se retrouver dans le contexte. Ce qui permettra de distinguer les logs de notre application d’autres logs dans loki et qui mettra ainsi le même contexte sur nos métriques et sur les logs.

### Relancer l’application

Si on relance l’application avec la configuration que l’on vient de mettre en place, voilà ce que cela va donner :

```shell
{"timestamp":"2023-05-30T23:07:12.880Z","level":"INFO","thread":"main","logger":"fr.ght1pc9kc.myapp.MyApplication","message":"Starting MyApplication using Java 17.0.6 with PID 31428 ( started by marthym in )","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:12.893Z","level":"DEBUG","thread":"main","logger":"fr.ght1pc9kc.myapp.MyApplication","message":"Running with Spring Boot v3.1.0, Spring v6.0.9","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:12.894Z","level":"INFO","thread":"main","logger":"fr.ght1pc9kc.myapp.MyApplication","message":"The following 1 profile is active: \"json-logging\"","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:13.973Z","level":"INFO","thread":"main","logger":"org.flywaydb.core.internal.license.VersionPrinter","message":"Flyway Community Edition 9.16.3 by Redgate","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:13.973Z","level":"INFO","thread":"main","logger":"org.flywaydb.core.internal.license.VersionPrinter","message":"See release notes here: https://rd.gt/416ObMi","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:13.973Z","level":"INFO","thread":"main","logger":"org.flywaydb.core.internal.license.VersionPrinter","message":"","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:13.980Z","level":"INFO","thread":"main","logger":"com.zaxxer.hikari.HikariDataSource","message":"HikariPool-1 - Starting...","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:14.067Z","level":"INFO","thread":"main","logger":"com.zaxxer.hikari.pool.HikariPool","message":"HikariPool-1 - Added connection org.sqlite.jdbc4.JDBC4Connection@6f8667bb","context":"MyApplication"}
{"timestamp":"2023-05-30T23:07:14.068Z","level":"INFO","thread":"main","logger":"com.zaxxer.hikari.HikariDataSource","message":"HikariPool-1 - Start completed.","context":"MyApplication"}
```

Beaucoup plus difficile à lire pour un humain, mais bien plus simple à parser.

## Conclusion

Voilà les quelques améliorations à mettre en place dans une application Spring pour simplifier la collecte des métriques. Dans le prochain article, nous verrons comment mettre en place un collecteur OpenTelemetry et récupérer les métriques que l’on vient de configurer.
