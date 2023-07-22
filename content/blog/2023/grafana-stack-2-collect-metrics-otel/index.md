---
title: Grafana Stack 📈 2. Collecte des métriques avec OpenTelemetry
date: 2023-06-18
# modified: 2021-11-04
summary: |
    Maintenant que l’application Spring Boot présente des métriques, il est nécessaire de les collecter. Les métriques seront stockés dans Prometheus mais pour les collecter, nous allons utiliser OpenTelemetry.
tags: [otel, ansible, prometheus, metriques, devops]
image: feature-grafana-stack-open-telemetry.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Dans l’[article précédent]({{< relref "grafana-stack-1-spring-observability" >}}), nous avons activé l’observabilité de Spring Boot 3 et vu comment ajouter des métriques personnalisées à une application.

Maintenant, il est nécessaire de collecter ces métriques et de les stocker avant de pouvoir les afficher dans Grafana.

**Les autres articles de la série :**

1. [Observabilité avec Spring Boot 3]({{< relref "grafana-stack-1-spring-observability" >}})
2. Collecte des métriques avec OpenTelemetry
3. [Collecte des logs avec OpenTelemetry]({{< relref "grafana-stack-3-collect-logs-otel" >}})

## OpenTelemetry

{{< figimg src="open-telemetry.webp" float="right" alt="Liste des cibles de prometheus" >}}
[OpenTelemetry](https://opentelemetry.io/) est un collecteur de ... télémétrie. Cela inclut les métriques, les logs et les traces. Mais OpenTelemetry, c’est aussi une communauté qui essaye de décrire une [spécification](https://opentelemetry.io/docs/specs/otel/overview/) pour définir la métrologie. Par exemple, la spécification propose des [conventions](https://github.com/open-telemetry/semantic-conventions) pour les noms de métriques.

## Prérequis au déploiement

### Docker Compose

L’application que l’on a prise comme exemple dans l’[article précédent]({{< relref "grafana-stack-1-spring-observability" >}}) est déployée via [docker-compose](https://docs.docker.com/compose/). Un script Ansible automatise le déploiement de la configuration du service sur le serveur et il suffit de faire un `dc up -d` pour démarrer l’application et tous les services dépendants en production.

On va rester sur la même techno pour déployer la collecte des télémétries.

### Service prometheus

Comme expliqué dans l’article précédent, les métriques seront stockées par un serveur [Prometheus](https://prometheus.io/). Il faut donc commencer par en déployer un. Rien de compliqué pour ce composant, voilà la déclaration du service dans le compose.

```yaml {hl_lines=["8"]}
services:
  prometheus:
    image: prom/prometheus:v2.44.0
    restart: unless-stopped
    command:
    - --config.file=/etc/prometheus/prometheus.yml
    - --storage.tsdb.path=/prometheus
    # - --storage.tsdb.retention.time=90d
    - --web.console.libraries=/usr/share/prometheus/console_libraries
    - --web.console.templates=/usr/share/prometheus/consoles
    volumes:
    - /opt/bw/prometheus/:/etc/prometheus/
    - prometheus_data:/prometheus
    networks:
      metrics: {}

volumes:
  prometheus_data: {}

networks:
  metrics: {}

```

Par défaut Prometheus garde les données pendant 15 jours. Il peut être intéressant d’étendre la durée de rétention à 90 jours ou plus. Pour cela ajouter l’options `storage.tsdb.retention.time=` à la ligne de commande.

Prometheus se configure au travers d’un unique fichier `prometheus.yml` passé en paramètre de la ligne de commande dans le dockerfile ci-dessus. Les paramètres de configuration sont détaillés dans la [documentation](https://prometheus.io/docs/prometheus/latest/configuration/configuration/), voilà le fichier utilisé pour notre application.

```yaml {hl_lines=["20"]}
---

global:
  scrape_interval:     15s # By default, scrape targets every 15 seconds.
  evaluation_interval: 15s # By default, scrape targets every 15 seconds.
  # scrape_timeout is set to the global default (10s).

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:

  # Le job pour se collecter lui même (optionel)
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Le job de collecte OpenTelemetry
  - job_name: 'otel-exporter'
    scrape_interval: 15s
    file_sd_configs:
      - files:
        - 'targets/otel_targets.yml'
```


enfin, `targets/otel_targets.yml`.
{{< figimg src="otel-observability-satellite.webp" float="right" alt="test" >}}

```yaml
---

- targets:
  - 'opentelemetry:9091'
```

L’intérêt de passer par `file_sd_configs` est que Prometheus va pouvoir faire du **hot reload** quand le fichier de cibles sera mis à jour. **Il ne sera pas nécessaire de redémarrer le serveur pour ajouter une cible**.

Détail important, le service `prometheus` est placé dans un réseau `metrics`, ce qui l’isolera du réseau sur lequel l’application est placée. C’est le service `opentelemetry` qui fera le lien entre les deux sous-réseaux de docker.

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
