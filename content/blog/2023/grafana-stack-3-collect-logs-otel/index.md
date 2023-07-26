---
title: Grafana Stack 📈 3. Collecte des logs avec OpenTelemetry
date: 2023-07-24
# modified: 2021-11-04
summary: |
    Les métriques sont bien au chaud dans prometheus. On va pouvoir collecter les logs applicatifs avec OpenTelemetry. Grace au plugin logback que nous avons configuré dans Spring Boot, les logs sortent en JSON et il n’est pas nécessaire de les parser avant de les pousser dans Loki.
tags: [otel, ansible, loki, logs, devops]
image: feature-grafana-stack-open-telemetry.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Dans l’[article précédent]({{< relref "grafana-stack-2-collect-metrics-otel" >}}), nous avons collecté les métriques de l’application Spring. Reste maintenant à collecter les logs de cette application. Grâce à la configuration de Logback que l’on a mis en place dans le [premier article]({{< relref "grafana-stack-1-spring-observability" >}}), les logs de Spring sortent au formta JSON, ce qui va grandement simplifier les pipeline de collecte.

**Les autres articles de la série :**

1. [Observabilité avec Spring Boot 3]({{< relref "grafana-stack-1-spring-observability" >}})
2. [Collecte des métriques avec OpenTelemetry]({{< relref "grafana-stack-2-collect-metrics-otel" >}})
3. Collecte des logs avec OpenTelemetry

## Prérequis au déploiement
{{< figimg src="loki-as-logs-storage.webp" alt="Loki comme stockage des logs" credit="Loki (Tom Hiddleston) dans la série de Disney+, créée par Michael Waldron et réalisée par Kate Herron. MARVEL STUDIOS" >}}

### Docker Compose

Tout comme dans l’article précédent, il faut compléter le fichier `docker-compose.yml` avec un nouveau service : **[Loki](https://grafana.com/oss/loki/)**.

### Service prometheus
Loki (toujours de Grafana Labs), est un moteur de stockage de logs. Sur le même principe que Prometheus il va permettre de conserver les logs applicatifs pour les restituer via des requêtes LogQL. L’approche de Loki est différente de celle d’Elastic par exemple, **car il ne va indexer que les meta-données des logs et non tout leur contenu**.

{{< figimg src="loki-tabs-with-console.svg" alt="Stockage optimisé Loki" >}}

Voilà la déclaration du service Loki dans le compose.

```yaml
services:
  loki:
    image: grafana/loki:2.8.1
    restart: unless-stopped
    environment:
      - LOKI_RETENTION_PERIOD: 90d
    command:
      - -config.file=/etc/loki/local-config.yaml
      - -config.expand-env=true
    volumes:
      - ./.compose/loki/local-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      metrics: {}

volumes:
  loki_data: {}

networks:
  metrics: {}

```

Loki se configure via le fichier `local-config.yaml` passé en paramètre de la ligne de commande dans le dockerfile ci-dessus.
Les paramètres de configuration sont détaillés dans la [documentation](https://grafana.com/docs/loki/latest/configuration/?plcmt=learn-nav), voilà le fichier utilisé pour notre application.

On notera dans les commandes du compose le paramètre `-config.expand-env=true` qui autorise à mettre des variables d’environnement dans le fichier de configuration suivant.

```yaml {hl_lines=["18-22"]}
---
auth_enabled: false

server:
  http_listen_port: ${LOKI_LISTEN_PORT:-3100}

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

compactor:
  retention_enabled: true

limits_config:
  retention_period: ${LOKI_RETENTION_PERIOD:-30d}

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093
```

Il s’agit du fichier de configuration par défaut avec quelques améliorations tout de même :

* On active une rétention de 30 jours par défaut. Sans ça, Loki garde les logs Ad-Vitam.
* On utilise la résolution de variables d’env pour permettre de modifier les valeurs du port et la durée de rétention.

Le stockage `filesystem` est largement suffisant pour le cas de notre application, mais il présente l’inconvénient de ne pas être scalable, contrairement à d’autres systèmes proposés.

## Service OpenTelemetry

Nous avons déjà déployé un collecteur lors de l’[article précédent]({{< relref "grafana-stack-2-collect-metrics-otel" >}}), on va modifier sa configuration pour y ajouter la collecte des logs.

### Alternatives

Il existe plusieurs alternatives pour collecter les logs d’une application Spring vers un serveur Loki. 

* Utiliser [Loki4j](https://loki4j.github.io/loki-logback-appender/), un plugin logback pour transmettre les logs directement à Loki. Il se présente sous la forme d’un appender.
* Utiliser [opentelemetry-logback-appender-1.0](https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/logback/logback-appender-1.0/library), un autre plugin logback pour transmettre les logs à OpenTelemetry cette fois.
* Spring propose aussi des [solutions pour envoyer les logs vers Open Telemetry](https://www.baeldung.com/spring-boot-opentelemetry-setup#bd-configure-spring-boot-with-opentelemetry), là on envoie aussi les traces avec et les métriques.
* Configurer un receiver Open Telemetry

Finalement, de toutes ces possibilités, j’ai opté pour la dernière. Le fait de lire les logs produits sur le disque plutôt que de se les faire envoyer est moins intrusif pour l’application. Moins de risque de ralentir l’application et c’est mieux décorrélé.

### Configuration du receiver

On a déjà vu la configuration d’Open Telemetry, il suffit de rajouter un receiver pour scruter les logs. Dans le cas de notre application packagée en docker, il faut aller chercher les fichiers de log du conteneur, pour ça, il y a le plugin `filelog`.
OTEL se configure en 4 étapes :


```yaml
receivers:
  filelog/containers:
    include: ["/var/lib/docker/containers/*/*.log"]
    start_at: end
    include_file_path: false
    include_file_name: false
    operators: []
```

Il faudra changer le répertoire docker si vous n’utilisez pas la configuration par défaut.

À cette configuration, il faut ajouter des opérateurs qui vont transformer les logs afin de les rendre plus exploitables dans Loki.

```yaml
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
```

On parse les logs json qui sortent de docker.

```yaml
    operators:
      - type: filter
        expr: '(attributes?.attrs?.tag ?? "empty") == "empty"'
      - type: key_value_parser
        parse_from: attributes["attrs"]["tag"]
        parse_to: resource.container
        on_error: drop
      - type: move
        from: resource.container.id
        to: resource.container_id
      - type: move
        from: resource.container.name
        to: resource.container_name
      - type: move
        from: resource.container.image
        to: resource.container_image
```

On extrait les informations du conteneur, son nom et celui de son image. Si le conteneur n’est pas correctement tagger, on ne tient pas compte du log. Pour que cela fonctionne, il faudra tagger correctement les conteneurs que vous souhaitez observer.

```yaml
    operators:
      - type: move
        from: attributes.log
        to: body
      - type: move
        from: attributes["attrs"]["application"]
        to: resource.application
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
        severity:
          parse_from: attributes.level
          mapping:
            warn: WARN
            error: ERROR
            info: INFO
            debug: DEBUG
      - type: move
        from: attributes.message
        to: body
```

On déplace ensuite le champ `attributes.log` qui a été parsé du json docker vers `body` qui est le contenu du message. Puis on refait un parsing json, cette fois pour parser le json qui sort de Spring. On précise que le timestamp de l’évènement sera celui de Spring et on mappe les niveaux de log en majuscule pour uniformiser.

Enfin, on déplace le message issu du log de Spring dans le champ `body` pour en faire le nouveau contenu du log.

```yaml
    operators:
      - type: remove
        field: attributes.time
      - type: remove
        field: attributes.stream
      - type: remove
        field: attributes["timestamp"]
      - type: remove
        field: attributes["level"]
      - type: remove
        field: attributes["attrs"]
```

Pour finir, on fait le ménage dans les champs que l’on ne souhaite pas conserver.

### Configuration de l’exporter

Une fois les logs reçus et traité, il faut les renvoyer à Loki. Cela se fait via un exporter [loki](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/lokiexporter/README.md).

```yaml
exporters:
  loki:
    endpoint: 'http://loki:3100/loki/api/v1/push'
```

### Configuration du pipeline

Enfin, on met toutes ces configurations bout à bout dans le pipeline de `logs` Open Telemetry

```yaml
service:
  pipelines:
    logs:
      receivers: [filelog/containers]
      processors: [attributes, batch]
      exporters: [logging, loki]
```

## Service compose application

Coté Open Telemetry la configuration du service ne change pas. Néanmoins, pour la configuration du service de notre application, il va être nécessaire de tagger correctement le conteneur.

```yaml {linenos=table,hl_lines=["5-6","11-15"]}
services:

  myapp:
    image: 'marthym/myapp:2.0.0-SNAPSHOT'
    labels:
      application: myapp
    read_only: true
    environment:
      SPRING_MAIN_BANNER-MODE: off
      SPRING_PROFILES_ACTIVE: json-logging
    logging:
      driver: json-file
      options:
        labels: 'application'
        tag: 'id={{.ID}} name={{.Name}} image={{.ImageName}}'
        max-size: 12m                               
        max-file: '5'
    ports:
      - '8081:8081'
    networks:
      - myappnet
    volumes:
      - /home/marthym:/var/lib/myapp
      - /tmp/myapp:/tmp

networks:
  myappnet: {}
```

Le tag dans les options de logging du service docker compose va permettre de récupérer les informations du conteneur lors du parsing fait pas Open Telemetry. On ajoute aussi un label pour indiquer le nom de notre application, cela permettra de distinguer plusieurs instances si le cas se présente.

Comme pour les configurations des articles précédents, le mode `verbose` d’Open Telemetry peut s’avérer très utile pour comprendre ce qu’il se passe dans le pipeline de transformation.

Cela se fait grâce au [Logging Exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/loggingexporter/README.md).

```yaml
exporters:
  logging:
    verbosity: detailed
```



**L’ensemble des fichiers de configuration modifiés sont disponibles sur [github](https://gist.github.com/Marthym/08cc94813c4e80c270fa9b7122a75b8c).**

## Conclusion

À ce stade, les métriques et les logs de l’application Spring sont récoltés, traités et stockés dans les serveurs Prometheus et Loki. Il ne reste plus qu’à mettre en place un Grafana pour visualiser tout ça. C’est ce que nous verrons dans le prochain article.
