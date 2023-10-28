---
title: Grafana Stack 📈 4. Déploiement d’un Grafana
date: 2023-07-24
# modified: 2021-11-04
summary: |
    La dernière étape pour enfin profiter des métriques que l’on a mis en place tout au long de ces articles sur OpenTelemetry et la stack Grafana. Comment déployer le serveur grafana et les dashboard permettant d’exploiter les métriques d'OpenTelemetry.
tags: [otel, ansible, metrics, logs, devops]
image: feature-grafana-stack-deploy-grafana.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Dans l’[article précédent]({{< relref "grafana-stack-3-collect-logs-otel" >}}), nous avons collecté les journaux de l’application Spring. Reste maintenant à restituer les métriques et les journaux de cette application. Pour cela, [Grafana](https://grafana.com/) est l’application tout indiquée. Ce n'est pas pour rien que l’on a utilisé tous les outils de la stack.

**Les autres articles de la série :**

1. [Observabilité avec Spring Boot 3]({{< relref "grafana-stack-1-spring-observability" >}})
2. [Collecte des métriques avec OpenTelemetry]({{< relref "grafana-stack-2-collect-metrics-otel" >}})
3. [Collecte des logs avec OpenTelemetry]({{< relref "grafana-stack-3-collect-logs-otel" >}})
4. Déploiement d’un Grafana

## Prérequis au déploiement
{{< figimg src="deploy-grafana.webp" alt="Déployer un Grafana" credit="Dan Kaufman - Nerdist graffiti" >}}

### Docker Compose

Tout comme dans les articles précédents, il faut compléter le fichier `docker-compose.yml` avec un nouveau service : **[Grafana](https://grafana.com/)**.

### Service Grafana
Grafana est l’interface de restitution des métriques et des logs que l’on a collectés jusque-là. On peut aussi afficher les traces, mais c’est pour de futurs articles. Commençons par déployer le serveur Grafana sur le même modèle de docker compose que les autres services.

Voilà la déclaration du service Grafana dans le compose.

```yaml
services:
  grafana:
    image: grafana/grafana:10.0.3
    user: '472'
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: password
      GF_USERS_ALLOW_SIGN_UP: false
    logging:
      driver: local
      options:
        max-size: 10m
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/bw/grafana/provisioning/:/etc/grafana/provisioning/
    networks:
      metrics: {}
      grafana: {}

networks:
  metrics: {}
```

Il n’y a pas de configuration particulière si ce n’est le compte administrateur de départ à configurer comme variable d’environnement. Le volume va permettre de conserver les réglages de dashboard et les comptes additionnels.

Le répertoire `provisionning` va permettre de précharger des dashboards et de la configuration. C’est pratique, car cela va éviter les actions manuelles pour l'ajout de dashboard par exemple. Mais les dashboard ajoutés via le provisionning ne sont pas modifiable. Très vite cela devient compliqué à gérer et à tenir à jour, car dès que les métriques évoluent, il faut mettre à jour le dashboard dans le provisionning. Au final importer le dashboard normalement par l’interface s’est avéré dans mon cas plus simple à gérer.

`472` est l'ID de l’utilisateur avec lequel grafana est lancée dans le container.

Dans les fichiers du [gist](https://gist.github.com/Marthym/d5714034ebccf7715f8b5389e3669ed0) associé, vous trouverez aussi une configuration nginx pour placer un proxy devant le serveur grafana. C’est plus propre de ne pas brancher grafana directement sur le port 443 de la machine hôte. Et cela permettra de simplifier les changements de configuration puisque c’est docker qui s’occupera de mapper les ports correctement.

## Configuration des Dashboards

Pour afficher toutes les données que l’on a collectées avec Open Telemetry, on va déployer trois dashboard Grafana. Un premier pour Spring, le second pour l’application, le dernier pour les métriques de l’hôte collecté par le plugin `host` de Open Telemetry.

Le dashboard Spring est facile à trouvé sur internet. Par contre, je n’ai pas trouvé de dashboard pour le plugin `host` de otel donc j’en ai fait un depuis zéro.

Le dashboard pour l’application est strictement custom puisque les métriques le sont aussi. Mais il donne une bonne idée de comment intégrer dans le même écran, des métriques et des logs.

{{< figimg src="myapp-grafana-dashboard.webp" alt="Dashboard Grafana MyApp" caption="[Dashboard Grafana pour MyApp](https://gist.github.com/Marthym/d5714034ebccf7715f8b5389e3669ed0#file-grafana-baywatch-dashboard-json)" >}}

<br/>

{{< figimg src="host-grafana-dashboard.webp" alt="Dashboard Grafana host metrics" caption="[Dashboard Grafana pour les métriques de l’hôte](https://gist.github.com/Marthym/d5714034ebccf7715f8b5389e3669ed0#file-grafana-otel-host-dashboard-json)" >}}


**L’ensemble des fichiers de configuration modifiés sont disponibles sur [github](https://gist.github.com/Marthym/d5714034ebccf7715f8b5389e3669ed0).**

## Conclusion

La plus grande partie de la stack est déployée. Il est maintenant possible de suivre l’activité de l’application et du serveur en temps réel. Il restera à déployer [Tempo](https://grafana.com/oss/tempo/) pour les traces de l’application. Mais pour l’instant, je n’ai pas creusé et je trouve la mise en place un peu compliquée et très intrusive. Surement, pour un prochain article, quand j’aurais trouvé une façon de le faire plus simple.

La mise en place [d’alerte](https://grafana.com/docs/grafana/latest/alerting/) sera aussi une chose à faire rapidement si vous ne voulez pas avoir a resté collé à l’écran H24.