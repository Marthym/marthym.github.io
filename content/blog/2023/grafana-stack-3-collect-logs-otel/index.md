---
title: Grafana Stack 📈 3. Collecte des logs avec OpenTelemetry
date: 2023-07-03
# modified: 2021-11-04
summary: |
    Les métriques sont bien au chaud dans prometheus. On va pouvoir collecter les logs applicatives avec OpenTelemetry. Grace au plugin logback que nous avons configurer dans Spring Boot, les logs sortent en JSON et il n’est pas nécessaire de les parser avant de les pousser dans Loki.
tags: [otel, ansible, loki, logs, devops]
image: feature-grafana-stack-open-telemetry.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Dans l’[article précédent]({{< relref "grafana-stack-2-collect-metrics-otel" >}}), nous avons collecté les métriques de l’application Spring. Reste maintenant à collecter les logs de cette application. Grâce à la confguration de Logback que l’on a mis en place dans le [premier article]({{< relref "grafana-stack-1-spring-observability" >}}), les logs de Spring sortent au formta JSON, ce qui va grandement simplifier les pipeline de collecte.

**Les autres articles de la série :**

1. [Observabilité avec Spring Boot 3]({{< relref "grafana-stack-1-spring-observability" >}})
2. [Collecte des métriques avec OpenTelemetry]({{< relref "grafana-stack-2-collect-metrics-otel" >}})
3. Collecte des logs avec OpenTelemetry

## Prérequis au déploiement
{{< figimg src="loki-as-logs-storage.webp" alt="Loki comme stockage des logs" credit="Loki (Tom Hiddleston) dans la série de Disney+, créée par Michael Waldron et réalisée par Kate Herron. MARVEL STUDIOS" >}}

### Docker Compose

Tout comme dans l’article précédent on va incrémenter le fichier `docker-compose.yml` avec un nouveau service : **[Loki](https://grafana.com/oss/loki/)**.

### Service prometheus
Loki (toujours de Grafana Labs), est un moteur de stockage de logs. Sur le même principe que prometheus il va permettre de conserver les logs applicatives pour les restituer via des requêtes LogQL. L’approche de Loki est différentes de celle de Elastic par exemple car il ne va indexer que les meta-données des logs et non tout leur contenu.

{{< figimg src="loki-tabs-with-console.svg" alt="Stockage optimisé Loki" >}}

Voilà la déclaration du service Loki dans le compose.

```yaml
services:
  loki:
    image: grafana/loki:2.8.1
    restart: unless-stopped
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

Le stockage `filesystem` est largement suffisant pour le cas de notre application, mais il présente l’inconvénient de na pas être scalable, contrairement à d’autres systèmes proposés.

## Service OpenTelemetry

Il était possible et sûrement plus simple de configurer le prometheus pour aller scraper directement l’application. Mais c’est aussi beaucoup moins évolutif. En effet, dans le cas d’infrastructure réseau plus complexe, un collecteur OpenTelemetry peu servir de collecteur intermédiaire. De plus OTEL vient avec toute une panoplie de fonctionnalité pour la collecte et le traitement des métriques qui vont grandement simplifier certaines étapes lorsque l’on ajoutera les logs et les traces.

{{< figimg src="schema-docker-compose.svg" alt="Liste des cibles de prometheus" caption="L’infrastructure une fois le prometheus déployé" >}}
<br>

La version "standard" d’OpenTelemetry ne contient que les fonctionnalités de base. Pour mettre en place toute une stack de métrologie, il sera plus intéressant d’utiliser la distribution `contrib` qui vient avec un ensemble de plugins permettant de s’interfacer avec à peu près tout.

https://github.com/open-telemetry/opentelemetry-collector-contrib

### Configuration OpenTelemetry

OTEL se configure en 4 étapes :

* Les receveurs, qui récupèrent la métrologie
* Les processeurs, qui traitent et transforment les événements
* Les exporteurs, qui renvoient les événements vers leurs points de stockage
* Le service, qui relie et ordonne les précédentes configurations

```yaml
receivers:
  prometheus/myapp:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 15s
          metrics_path: '/actuator/prometheus'
        #   Si vous avez sécurisé la route comme précognisé dans l’article précédent
        #   basic_auth:
        #     username: "otel_collector"
        #     password: "otel_password"
          static_configs:
            - targets: [myappservice:8081]
              labels:
                platform: 'prod'
```

On utilise le [Prometheus Receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver) qui va scraper la route de métrique de notre application au format prometheus. La configuration se fait exactement de la même façon que pour un scraper prometheus normal.

À noter que Spring possède un exporteur vers OTEL et serait donc capable d’envoyer directement la télémétrie vers ce dernier. J’aime moins cette approche, car elle rend **l’application consciente de l’existence du collecteur**. Changer de collecteur demanderait de changer la configuration de l’application et crée une sorte de dépendance.

```yaml
processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s
```

Parmi les bonnes pratiques OTEL, il est conseillé de toujours utiliser le [Batch Processor](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md), il va permettre de batcher les envoies de métriques et autres pour ne pas multiplier le nombre de connexions au serveur de destination.

```yaml
exporters:
  prometheus:
    endpoint: '0.0.0.0:9091'
    send_timestamps: true
    enable_open_metrics: true
```

Le [Prometheus Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter) va mettre à disposition d’un scraper les métriques récupérées au format prometheus.

Le endpoint permet de déterminer l’interface réseau utilisé pour déployer la route de collecte et le port. `0.0.0.0` déploie la route de collecte sur toutes les interfaces réseaux.

```yaml
service:
  pipelines:
    metrics:
      receivers: [prometheus/myapp]
      processors: [batch]
      exporters: [prometheus]

```

On déclare le pipeline pour les métriques en assemblant toutes les configurations que l’on vient de faire.

### Service compose

```yaml
services:
  opentelemetry:
    image: otel/opentelemetry-collector-contrib:0.77.0
    user: 0:0
    command:
    - --config=/etc/otel/receivers.yaml
    - --config=/etc/otel/processors.yaml
    - --config=/etc/otel/exporters.yaml
    - --config=/etc/otel/service.yaml
    logging:
      driver: local
      options:
        max-size: 10m
    volumes:
    - /opt/opentelemetry:/etc/otel:ro
    networks:
      myappnet: {}
      metrics: {}

networks:
  metrics: {}
  myappnet: {}
```

On utilise l’image `opentelemetry-collector-contrib` qui contient tous les plugins supplémentaires dont on a besoin.

Dans la `command` on inclut les fichiers de configuration que l’on vient de créer.

On place le service dans le réseau `metrics` pour que le service `prometheus` le voit et dans le réseau `myappnet` pour qu’il puisse se connecter à `myappservice:8081` que l’on a déclaré dans le scraper.

On monte un volume en lecture seule pour accéder aux fichiers de configurations.

{{< figimg src="open-telemetry-configuration.webp" alt="Image contrib pour open telemetry" >}}
**L’ensemble des fichiers de configuration est disponible sur [github](https://gist.github.com/Marthym/320fb102c473c17ee31367a067988800).**

Une fois la configuration en place, un `dc up -d` devrait démarrer tous les services et commencer la collecte des métriques.

## Vérifications et debugging

À ce stade, étant donné qu’il n’y a pas encore d’interface pour visualiser les métriques, il n’est pas facile de voir ce qu’il se passe sous le capot et de comprendre ce qu’il se passe quand un problème survient.

### Interface Prometheus

Prometheus possède une interface capable de visualiser certains éléments comme les valeurs des métriques recueilli ou la liste des cibles de scraping.

{{< figimg src="prometheus-target-list.webp" alt="Liste des cibles de prometheus" caption="Liste des cibles de prometheus" >}}

### Open Telemetry en verbose

Autre astuce qui peut servir, mettre OpenTelemetry en **verbose**. Cela se fait grâce au [Logging Exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/loggingexporter/README.md).

```yaml
exporters:
  logging:
    verbosity: detailed
```

En l’ajoutant au pipeline, Open Telemetry va cracher beaucoup de logs, vraiment beaucoup. Chaque métrique y sera détaillée. C’est très pratique mais, on se noie rapidement dans la masse de logs qui sortent.

## Conclusion

Nous avons mis en place un collecteur et de quoi stocker les métriques de notre application. Grâce à Open Telemetry les métriques de notre application sont bien au chaud dans Prometheus.

Dans l’article suivant, nous ferons la même chose avec **les logs de l’application**.
