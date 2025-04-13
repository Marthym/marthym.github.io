---
title: Mesurer l’audience d’un blog avec OpenTelemetry
slug: web-analytics-avec-opentelemetry
date: 2023-12-18
# modified: 2021-11-04
summary: |
    Remplacez Google Analytics et Matomo par une solution maison avec OpenTelemetry, Prometheus et Grafana. Découvrez Otela, un script JS open source pour suivre les visites de votre site statique de façon respectueuse et auto-hébergée.
categories: [seo, blog]
tags: [javascript, otel, grafana, baywatch]
image: featured-otela-opentelemetry-analytics.webp
toc: true
comment: /s/hhqeel/mesurer_l_audience_d_un_blog_avec
---

J’aime bien savoir quels sont les articles qui sont le plus lu et combien de visiteurs passent par le blog chaque jour. Ce blog est passé par plusieurs étapes pour mesurer ces éléments. Au début, c'était du Google Analytics. Mais je ne suis pas vraiment à l’aise avec le fait de données à Google toutes ces informations. Alors je suis passé par [Matomo, hébergé chez le CHATON: Libréon]({{< relref "stats-from-matomo">}}).

> **TL;DR** \
> Envie de suivre le trafic de votre blog statique **sans Matomo ni Google Analytics** ? \
> Voici comment utiliser **OpenTelemetry, Prometheus et Grafana** avec un petit script JS maison (**Otela**) pour suivre les visites avec classe, efficacité… et respect de vos données.


## La problématique

Le souci avec Matomo, c’est qu’il est fiché comme tracker pour la plupart des Ad-Blockers, peu importe que l’on fasse de la mesure d’audience ou du tracking pur et dur. Et dans le cadre d’un blog technique, la quasi-totalité des visiteurs possède un Ad-Blocker. Ce qui rend la mesure passablement fausse. De plus je trouve que Matomo rame un peu et les données ne sont pas de première fraicheur, il faut attendre le lendemain pour avoir les données.

J’ai pas mal travaillé sur la [stack Grafana]({{< relref "grafana-stack-4-grafana" >}}) et [OpenTelemetry]({{< relref "grafana-stack-2-collect-metrics-otel" >}}) pour le projet [Baywatch]({{< relref "baywatch-ou-la-veille-informatique" >}}). Et j’avais envie de réutiliser cette stack pour remplacer Matomo. Vu que j’avais déjà un serveur avec tout ce qu’il faut d’installé.

L’autre problème est que sur un site statique, hébergé sur Github Pages ou sur un autre "Pages", on n'a pas accès aux logs du serveur web pour les collecter. Il est donc nécessaire de passer par un client JS.

## Otela, le client JS

{{< figimg src="otela-logo.webp" height="100" alt="Otela" float="right" >}}

La première étape est d’avoir un client javascript qui va **ping le collecteur Open Telemetry** avec les infos de la page visitée. OpenTelemetry possède un **SDK qui permet de transmettre des métriques et des traces**. Malheureusement, pour les logs, c’est encore en cours de développement.

L’envoi de ping sous forme de métrique n’est pas possible, cela n’est pas adapté au fonctionnement de OpenTelemetry et de Prometheus dans la mesure où cela ne pousse que des `1`, le compteur revient à zéro sur chaque visite.

Par contre, l’envoi de span fonctionne bien. Pour chaque visite, **Otela** transmet un span au collecteur OpenTelemetry avec les attributs de la page visitée (Le titre, l’url, ...).

Le projet **Otela** est disponible sur github : https://github.com/Marthym/otela

Il est issu d’un des projets d’exemple du SDK OpenTelemetry. Il est Open Source. Un **build WebPack** permet d’optimiser la taille du fichier `otela.js` à inclure dans les pages.

### C’est quoi un span au juste ?

Un span, dans l’univers d’OpenTelemetry, représente une opération unique ou un événement dans une trace. C’est l’unité de base de l’observation. Chaque fois qu’un utilisateur visite une page de votre site avec Otela, un span est créé pour enregistrer cette "action" : l'URL visitée, le titre de la page, le navigateur utilisé, la provenance (referrer), etc. Ce span est ensuite envoyé au collecteur OpenTelemetry. Il contient des attributs personnalisables que vous pouvez extraire et transformer pour générer des métriques exploitables dans Prometheus. En somme, le span joue le rôle d’un log enrichi et structuré, parfait pour suivre les interactions utilisateurs sur un site statique.

### Installation

Pour installer **Otela**, il suffit d’ajouter ce code javascript à la fin des pages HTML :

```javascript
<!-- Otela -->
<script>
    var _ota=window._ota=window._ota||{};_ota.t="your.opentelemetry.server";
    (function(){
        var t=document,e=t.createElement("script"),a=t.getElementsByTagName("script")[0];
        e.async=!0;e.src="https://github.com/Marthym/otela/releases/download/1.0.0/otela.js";a.parentNode.insertBefore(e,a)
    })();
</script>
<!-- End Otela Code -->
```

Il est nécessaire de configurer le collecteur OpenTelemetry destinataire des spans et la source du js. Ici la source est directement l’artefact github, il est plus efficace d’embarquer le fichier `otela.js` dans les sources de votre site.

## Configuration OpenTelemetry

Pour collecter les span envoyés par Otela, il est nécessaire configurer un peu le collecteur OpenTelemetry pour qu’il collecte les spans, les transforme en métrique et les stocke dans Prometheus.

### Le receiver

```yaml
receivers:
  otlp/otela:
    protocols:
      http:
        endpoint: ':4318'
        cors:
          allowed_origins:
            - http://*
            - https://*
          max_age: 7200
```

Sur le receiver, l’important est de **bien configurer les CORS**, selon le besoin, restreignez les au maximum. Ici, les CORS sont très ouverts, mais si vous n’avez qu’un site à suivre, resserrez la configuration.

### Les processors

```yaml
processors:
  batch:
  filter/otela:
    spans:
      include:
        match_type: strict
        services:
          - "blog.ght1pc9kc.fr"
          - "swr.ght1pc9kc.fr"

  attributes/otela:
    actions:
      - key: referrer
        pattern: ^https?:\/\/(?P<dummy>[^@\n]+@)?(?P<referrer>[^:\/\n?]+)
        action: extract
      - key: dummy
        action: delete
      - key: referrer
        value: direct
        action: insert
```

Pour les processors, on commence par filtrer les entrées, afin de ne conserver que les spans qui viennent des sites que l’on surveille. Ensuite on traite les attributs du span selon ce que l’on souhaite garder. Dans notre cas, on ne garde pas tout le referrer, juste le domaine.

### Le connecteur

Il ne reste plus qu’à transformer les span en métriques. C'est-à-dire, compter les spans pour compter les visites. **OpenTelemetry propose des connecteurs**. C’est une configuration qui va brancher le pipeline de span en prise direct avec celui des métriques.

```yaml
connectors:
  spanmetrics/otela:
    namespace: otela
    histogram:
      explicit:
        buckets: [6ms, 10ms, 100ms, 250ms, 500ms]
    dimensions:
      - name: navigator
      - name: os
      - name: platform
      - name: referrer
      - name: title

service:
  pipelines:
    traces:
      receivers: [otlp/otela]
      processors: [filter/otela, attributes/otela]
      exporters: [spanmetrics/otela]
    metrics:
      receivers: [spanmetrics/otela]
      processors: [batch]
      exporters: [prometheus]

```

**On branche donc le connecteur sur la sortie des traces ET sur l’entrée des métriques**. Le connecteur "span vers métriques" permet, en plus de compter les spans, de faire des percentiles.

## Récupérer les IPs

Afin de distinguer les visiteurs, il est nécessaire de récupérer l’adresse IP du visiteur. Mais cela n’est pas possible depuis le javascript, pas sans faire des requêtes supplémentaires ni sans dévoiler des données à un site extérieur.

C’est là qu’intervient **le frontal NginX** que vous avez forcément placé devant le collecteur OpenTelemetry. Lui connait l’IP du visiteur qui transmet les spans. Et il peut **transférer l’info à OpenTelemetry via les headers de la requête**.

```nginx
    location / {
        try_files $uri $uri/ @proxy;
    }

    location @proxy {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-GeoIP-Latitude  $geoip_latitude;
        proxy_set_header X-GeoIP-Longitude $geoip_longitude;
        proxy_pass $upstream;
    }
```

Et avec **le module GeoIP d’NginX**, il est possible de **récupérer les coordonnées géographiques des visiteurs** ce qui permettra de les placer sur une carte dans Grafana.

Coté OpenTelemetry, la configuration devient la suivante :

```yaml  {hl_lines=[6,20,"26-27","39-47"]}
receivers:
  otlp/otela:
    protocols:
      http:
        endpoint: ':4318'
        include_metadata: true
        cors:
          allowed_origins:
            - http://*
            - https://*
          max_age: 7200

connectors:
  spanmetrics/otela:
    namespace: otela
    histogram:
      explicit:
        buckets: [6ms, 10ms, 100ms, 250ms, 500ms]
    dimensions:
      - name: ip
      - name: navigator
      - name: os
      - name: platform
      - name: referrer
      - name: title
      - name: latitude
      - name: longitude

  attributes/otela:
    actions:
      - key: referrer
        pattern: ^https?:\/\/(?P<dummy>[^@\n]+@)?(?P<referrer>[^:\/\n?]+)
        action: extract
      - key: dummy
        action: delete
      - key: referrer
        value: direct
        action: insert
      - key: ip
        from_context: X-Real-IP
        action: upsert
      - key: latitude
        from_context: X-GeoIP-Latitude
        action: upsert
      - key: longitude
        from_context: X-GeoIP-Longitude
        action: upsert
```

Le paramètre important, c’est `include_metadata: true` qui permet de **récupérer les headers NginX depuis les processeurs** d’OpenTelemetry. Ensuite il ne reste qu’à récupérer les valeurs et les ajouter dans les attributs du span avant de l’envoyer à Prometheus.

> 🔥**Attention**🔥 tout de même, les IPs et la localisation **augmente de manière considérable la cardinalité** des attributs et donc l’espace de stockage nécessaire pour Prometheus. Donc cette configuration est à faire avec parcimonie et il est primordial de mettre des limites au stockage de votre Prometheus :
>
>```shell
>    --storage.tsdb.retention.time=90d
>    --storage.tsdb.retention.size=4GB
>```
>
>Ici on limite la rétention à 90 jours et la taille maximale du stockage à 4 Gig.

## Le résultat dans Grafana

Finalement, après quelques configurations dans Grafana, on obtient un dashboard qui ressemble à ça :

{{< figimg src="grafana-otela-board.webp" height="100" alt="Dashboard Grafana pour Otela" >}}

Oui, on voit tout de suite que ce blog n’est fréquenté que par de rares connaisseurs :p. Mais il s’agit là de la fréquentation d’un we. Il y a plus de monde la semaine quand même.

**Le json du board est accessible dans** [ce gist](https://gist.github.com/Marthym/8f83e310b4f4085afd7c9e7c98d8e9c1#file-otela-dashboard-json). 

Grâce au compteur de span et aux attributs que nous lui avons configurés, le dashboard affiche :
* Le nombre de visiteurs total
* Le nombre de visiteurs unique
* Les referrer
* Quelles pages sont visitées et combien de fois
* Et la localisation permet de placer les points sur une carte

## Conclusion

Tous les fichiers de configuration son disponible dans [ce gist](https://gist.github.com/Marthym/8f83e310b4f4085afd7c9e7c98d8e9c1).

Finalement, **cette configuration** colle tout juste à mon besoin et **remplace avantageusement Matomo**. En plus grâce à **Otela** les données sont intégralement stockées et maitrisées en France. Rien ne sort de mes serveurs.

Cependant, la solution n’est pas optimale. **Prometheus n’est pas adapté au stockage de ce type de données**. Des logs Loki seraient bien plus adapté. Pour l’instant, Otela est un POC, je n’ai pas trouvé la bonne façon de faire passer les données dans Loki mais je suis certain que c’est possible tout en gardant les spans qui vont, à termes, permettent de suivre les visites page par page ...

En attendant n’hésitez pas à me faire des retours sur la solution.