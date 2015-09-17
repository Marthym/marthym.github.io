---
layout: post
title: Backups distant sur HubiC
excerpt: "Protéger ses données perso d'un cataclisme en les envoyant dans le cloud"
#modified: 2015-09-16
tags: [backup,shell,admin]
comments: true
image:
  feature: backup.png
---
## Le contexte
J'ai chez moi un vieux PC reconverti en NAS grâce à [FreeNAS](http://www.freenas.org/). J'en suis très content, surtout du ZFS et de la possibilité de faire
des snapshot remontable à postériori. Ca m'a déjà servi plusieurs fois pour récupérer des données après des fausses manip. Bref c'est pratique c'est pas
compliqué et ça sécurise bien les données.<br/>
Tout est synchronisé via [Owncloud](https://owncloud.org/) sur mon PC portable. Ma moitié elle est sous Windows, le client Owncloud ne supporte pas bien ses
200 Go elle passe donc par cygwin/rsync pour un synchro unilatérale.

Toutes nos données sont donc dupliqué et on est serrain, face aux mauvaises manip aux disque qui claque et autres joyeusetés du genre. Par contre, les données
restent regroupées au même endroit. S'il arrive un problème à cet endroit c'est la perte de tout sans espoir de retrouver. C'est pour ça que j'ai commencé à
regarder une solution de backup externe.

## Cahier des charges
Plusieurs impératifs :

* Etre sur un site distant
* Avoir un capacité de stockage de 1To minimum, 2To serai un plus
* Pouvoir y envoyer des fichiers en ligne de commande
* Pas cher
* Tout le process doit pouvoir se faire d'une jail du NAS (csh).

Par contre :

* Pas besoin de pouvoir garder un historique des versions, c'est le NAS qui s'en charge.

J'ai en premier pensé faire un backup chez mes parents mais c'est pas gérable, personne pour maintenir un PC en fonctionnement là-bas, connection internet
restreinte, ... Bref mauvaise idée.
