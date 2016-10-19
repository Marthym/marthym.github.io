---
layout: post
title: Auto-hébergement et sauvegarde de données perso
excerpt: "Présentation d'une installation d'auto-hébergement et du système de sauvegarde qui va avec"
#modified: 2015-09-21
tags: [backup, NAS, hubic, sauvegarde, webdav, freenas, hébergement, planetlibre]
comments: true
image:
  feature: backup.png
---

## Introduction
J'ai récement déménagé et au passage changé de box, de configuration réseau et du coup tant qu'à faire ça, j'en ai profité pour revoir l'organisation de mes sauvegardes perso. Et comme je n'ai pas écris grand chose depuis un moment, pourquoi pas en faire profiter ce qui se sont perdu jusqu'ici.

## Les besoins
Dans l'ordre d'importance :

 * Duplication des données importante (photos surtout que je n'aimerais pas perdre)
 * Sauvegarde distante en cas d'appart qui brule ou de cambriolage.
 * Historique d'un à trois mois des données en cas de fausse manipulation
 * Accès distant et sécurisé aux données

## Le matériel
Pour ce qui est du matériel, j'avais un PC fixe qui a dans les 7/8 ans maintenant que j'ai remplacé par un portable plus pratique et que j'ai reconverti en NAS.

Déjà, suppression du matériel inutile, lecteur DVD et carte graphique, ça gagne en consommation et en décibel. Ensuite, ajout de disque conséquant et adapté, j'ai choisi 2x [Western Digital Red 2 To](http://www.ldlc.com/fiche/PB00133400.html). C'est des disques fait pour rester allumé en permanence, tailler pour les NAS et j'en suis vraiment très content. Les deux seront monté en RAID 10.

J'ai aussi ajouté une ventillateur plus silentieux que l'original car le PC est dans le salon et le ventillo original souflait un peu. J'ai pris conseil sur [cette page](http://www.choixpc.com/silence.htm) (elle est moche mais bien pratique et pleine de bonnes infos), et j'ai choisi un [Arctic Freezer 13](http://www.ldlc.com/fiche/PB00112450.html#aff106) pour sont rapport taille efficacité.

Enfin, un Raspberry Pi s'ajoute à la configuration pour servir de gateway, ça tombe jamais en panne c'est facile à remplacer et c'est pas cher.

En terme de coût, vu que j'avais déjà le PC ça donne ça :

* 2x WD Red 2To &rarr; 200€ (ça pique un peu)
* 1x Rapsberry Pi &rarr; 50€
* 1x Arctic Freezer 13 &rarr; 35€

Soit **285€**

## Le système
Pour la partie logicielle, j'ai opté pour [FreeNAS](http://www.freenas.org/). Certes il y en a d'autre et il y a des bonnes raisons pour tous, les avis divergent et je vais pas rentrer dans un justification. FreeNAS répond à mon besoin, de ce que j'en ai vu ça ét là il est ultra robuste et éprouvé. Les fonctionnalités que j'apprécie tout particulièrement sont :

* Le système de snapshot ZFS qui m'a sauvé la vie plusieurs fois
* Les jails, même si c'est un peu plus contrainiant que des docker
* L'interface hostère mais efficace
* L'installation sur clé pour ne pas squater d'espace disque pour rien

Coté Raspberry, j'ai une RaspBian, c'est facile à mettre en place et a mettre à jour.

## Le fonctionnement
Comment j'utilise tout ça maintenant pour répondre aux besoins.

### Duplication et accès distant aux données
J'ai longtemps utilisé [ownCloud](https://owncloud.org/) pour répondre à ces deux besoins. Installé dans un jail de FreeNAS, ownCloud fourni une interface de visialisation des données, un accès WebDAV et des clients de synchronisation pour un peu tout les systèmes. Cependant j'ai jamais été pleinement satisfait par owncloud. 

Son client Windows est une horreur, si la quantité de fichiers à synchronisé est trop grande, il met plus de temps à chercher les différences que la plage d'intervale de synchronisation. Ce qui a pour conséquence une suppression pure et simple des fichiers en retard lors de la synchro suivante. Sous Linux c'est un peu différent car le client utilise inotify et la synchro est en temps réel.

Dernièrement sous Linux le client se déconfigure et à chaque redémarrage il faut re-saisir l'URL du serveur et les login/password.

Enfin, des dissensions au sein du projet on engendré un fork [NextCloud](https://nextcloud.com/). Ce genre de chose est rarement de bonne augure pour un projet, les utilisateurs en sont divisé et la pérénité des projets est douteuse. Pour des projets garant de vos données personnelles ce n'est pas engageant.

C'est pourquoi après quelques recherche d'alternative, je me suis rabatu sur autre chose d'un peu différent, en séparant la partie duplication de la partie accès distant.

#### Duplication des données
C'est la base de la sauvegarde, les données doivent à minima se trouver sur deux supports différent pour s'assurer qu'il n'y aura pas de perte si un disque ou un PC lache.

Donc les données sont biensur sur mon portable de tout les jours, c'est de là que je les utilises, et elles sont aussi dupliqué sur le NAS. Sur les deux disques en RAID 10 (stripper + mirroré).<br>
Je voulais une synchro bi-directionnelle car quand je ne suis pas chez moi il m'arrive de mettre à jour les données directement sur le NAS. Du coup `rsync` n'est pas adpaté et les clients sont rares souvant peu fiable (cf. ownCloud). Mais il y a [Syncthing](https://syncthing.net/), un clone libre de BittorentSync. Ca fonctionne à partir du protocole ... Torrent donc, c'est décentralisé et particulièrement efficace. Je rentre pas plus dans le détail, c'est très bien expliqué sur le site.

J'ai donc `Syncthing` qui tourne sur mon portable et dans une jail du NAS (il existe une version pour FreeBSD) et les deux se synchronique. Malgrés la quantité de données il n'y a pas eu de caffouillage, ça va vite et c'est léger. L'installation ne présente pas de difficultée particulière mais la configuration entre les machines synchronisé est un peu moins intuitive, je m'y suis pris à deux fois. 

J'ai choisi spliter la synchro en plusieurs répertoires, ça permet de paralléliser la synchro, c'est un peu plus long a configurer mais bon...

Le site du projet est clair sur le fait que c'est plus un outil de partage que de backup notement parce qu'il n'historise pas (en fait si mais bon) mais pour l'utilisation que j'ai fais c'est le jour et la nuit avec ownCloud. Par contre j'ai pas encore eu l'occasion de tester la synchro hors de mon réseau local.

#### Accès à distance au données
Reste maintenant à pouvoir accéder aux données à distance. Techniquement c'est possible avec `Syncthing` mais ça implique une duplication complète des répertoires que l'on veut accéder.
J'ai besoin de pouvoir mettre à jour rapidement quelques fichiers et de pouvoir en récupérer quelques autres, je ne tiens pas a dupliquer toutes mes données partout ! C'est là qu'intervient le WebDAV. C'est le protocole qui semble le plus adéquat pour ça, plus simple (et rapide ?) que le SFTP. FreeNAS possède cette fonctionnalité de base mais j'ai préféré installer un serveur Nginx à l'interieur d'une Jail, plus sur en terme d'accès.

Et avec ça j'ai remplacé l'utilisation que je faisais d'ownCloud et c'est beaucoup plus efficace.

NFS TV
Backup Hubic (sortir la passphrase du script)