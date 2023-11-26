---
title: Timezoner son MySQL server
date: "2015-09-22T12:00:00-00:00"
excerpt: "Régler les problèmes de Timezone entre Java et MySQL"
#modified: 2015-09-16
categories: [database]
tags: [mysql, database]
image: featured-timezone.webp
---
Dans le cas d'un MySQL sous docker, le server MySQL n'est pas Timezoné correctement. Par exemple, quand on lance la requête suivante :

``` sql
mysql> SELECT @@global.time_zone, @@session.time_zone;
+--------------------+---------------------+
| @@global.time_zone | @@session.time_zone |
+--------------------+---------------------+
| SYSTEM             | SYSTEM              |
+--------------------+---------------------+
1 row in set (0.00 sec)
```

Ce qui signifie que c'est la Timezone du système qui est utilisé. Un

``` sh
date +%Z
CEST
```

nous confirme que nous sommes bien sur `Europe/Paris`.

Pourtant, quand on insère des dates en base via un champ Timestamp, on se retrouve avec un décalage de 2 heures soit une timezone UTC ?

L'explication dans le cas qui nous intéresse, c'est que la table de Timezone de MySQL est vide. De ce fait, elle ne comprend pas la timezone que le système
lui fourni et passe par défaut en UTC. La solution pour être certain de sa Timezone est ce la setter correctement :

* Dans un terminal :

``` sh
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql
```
qui va mettre à jour la table de zonage de MySQL

* Dans MySQL :

``` sql
SET GLOBAL time_zone = 'Europe/Paris';
SET time_zone = 'Europe/Paris';
```
