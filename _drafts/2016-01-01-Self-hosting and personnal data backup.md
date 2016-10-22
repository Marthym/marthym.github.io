---
layout: post
title: Auto-hébergement et sauvegarde de données personelle
excerpt: "Présentation d'une installation d'auto-hébergement et du système de sauvegarde qui va avec"
#modified: 2015-09-21
tags: [backup, NAS, hubic, sauvegarde, webdav, freenas, hébergement, planetlibre]
comments: true
image:
  feature: backup.png
---

## Introduction
J'ai récement déménagé et au passage changé de box, de configuration réseau et tant qu'a tout refaire, j'en ai profité pour revoir l'organisation de mes sauvegardes perso. Je n'ai pas écris grand chose depuis un moment, alors pourquoi pas en faire profiter pour faire un billet rapide sur les quelques trucs sympa que j'ai changé.

## Les besoins
Voyons déjà ce qui est important en terme de préservation de nos données personnelles. Pour une sécurité minimale, les données doivent être **dupliqué sur au moins deux supports physiques**. On parle là de deux copies faciles d'accès, sur le PC de tout les jours et sur un disque secondaire. Les données doivent être facile a restaurer et à synchroniser.

Pour une sécurité optimale, **une copie distante**, situé physiquement dans un lieu différent est importante. Envoyé sur le cloud par exemple, cette copie n'a pas besoin d'être facile ou rapide d'accès. Par contre selon le lieux du stockage, il faudra sans doute crypter.

Enfin un **accès distant aux données** est un fonctionnalité sympa qui permet d'accéder à ses photos ou vidéo même en voyage.

## Le matériel
Un vieux PC fixe de 7 à 8 ans, avec quelques modifications se reconverti en NAS.

Suppression du matériel inutile, lecteur DVD et carte graphique, ça gagne en consommation et en décibel. Ensuite, ajout de disque conséquant et adapté, j'ai opté pour 2x [Western Digital Red 2 To](http://www.ldlc.com/fiche/PB00133400.html), des disques fait pour rester allumé en permanence, taillé pour les NAS et j'en suis vraiment très content. Les deux seront monté en RAID 10.

J'ai aussi ajouté une ventillateur plus silentieux que l'original car le PC est dans le salon et le ventillo original souflait un peu. J'ai pris conseil sur [cette page](http://www.choixpc.com/silence.htm) (elle est moche mais bien pratique et pleine de bonnes infos), et j'ai choisi un [Arctic Freezer 13](http://www.ldlc.com/fiche/PB00112450.html#aff106) pour sont rapport taille efficacité.

## Le système
Pour la partie système, le NAS tourne sous [FreeNAS](http://www.freenas.org/). Certes il y a d'autre système pour NAS, comme OpenMediaVault par exemple, et de bonnes raisons de les choisir. Les avis divergent et je vais pas rentrer dans une justification. FreeNAS répond au besoin, et de ce que j'en ai vu ça ét là il est ultra robuste et éprouvé. Parmi les fonctionnalités particulièrement appréciable on trouve :

* Le système de snapshot ZFS qui m'a sauvé la vie plusieurs fois
* Les jails, même si c'est un peu plus contrainiant que des docker
* L'interface hostère mais efficace
* L'installation sur clé pour ne pas squater d'espace disque pour rien

## Le fonctionnement

### Duplication et accès distant aux données
J'ai longtemps utilisé [ownCloud](https://owncloud.org/) pour répondre à ces besoins. Installé dans une jail de FreeNAS, ownCloud fourni une interface de visialisation des données, un accès WebDAV et des clients de synchronisation pour un peu tout les OS du marché. Cependant je n'ai jamais été pleinement satisfait par owncloud. 

Son client Windows est une horreur, si la quantité de fichiers à synchroniser est trop grande, il met plus de temps à chercher les différences que la plage d'intervale de synchronisation. Ce qui a pour conséquence une suppression pure et simple des fichiers en retard lors de la plage de synchro suivante. Sous Linux c'est un peu différent car le client utilise inotify et la synchro est en temps réel.

Dernièrement sous Linux le client se déconfigure et à chaque redémarrage il faut re-saisir l'URL du serveur et les login/password.

Enfin, des dissensions au sein du projet on engendré un fork [NextCloud](https://nextcloud.com/). Ce genre de chose est rarement de bonne augure pour un projet, les utilisateurs en sont divisé et la pérénité des projets est douteuse. Pour des projets garant de vos données personnelles ce n'est pas engageant.

C'est pourquoi après quelques recherche d'alternative, je me suis tourné vers une solution un peu différente, en séparant la partie duplication de la partie accès distant.

#### Duplication des données
C'est la base de la sauvegarde, les données doivent à minima se trouver sur deux supports différent pour s'assurer qu'il n'y aura pas de perte si un disque ou un PC lache.

Donc les données sont biensur sur mon portable de tout les jours, c'est de là que je les utilises, et elles sont aussi dupliqué sur le NAS. Sur les deux disques en RAID 10 (stripper + mirroré).<br>
Je voulais une synchro bi-directionnelle car quand je ne suis pas chez moi il m'arrive de mettre à jour les données directement sur le NAS. Du coup `rsync` n'est pas adpaté et les clients sont rares souvant peu fiable (cf. ownCloud). Mais il y a [Syncthing](https://syncthing.net/), un clone libre de BittorentSync. Ca fonctionne à partir du protocole ... Torrent donc, c'est décentralisé et particulièrement efficace. Je rentre pas plus dans le détail, c'est très bien expliqué sur le site.

J'ai donc `Syncthing` qui tourne sur mon portable et dans une jail du NAS (il existe une version pour FreeBSD) et les deux se synchronique. Malgrés la quantité de données il n'y a pas eu de caffouillage, ça va vite et c'est léger. L'installation ne présente pas de difficultée particulière mais la configuration entre les machines synchronisé est un peu moins intuitive, je m'y suis pris à deux fois. 

J'ai choisi spliter la synchro en plusieurs répertoires, ça permet de paralléliser la synchro, c'est un peu plus long a configurer mais bon...

Le site du projet est clair sur le fait que c'est plus un outil de partage que de backup notement parce qu'il n'historise pas (en fait si mais bon) mais pour l'utilisation que j'ai fais c'est le jour et la nuit avec ownCloud. Par contre j'ai pas encore eu l'occasion de tester la synchro hors de mon réseau local.

#### Accès à distance aux données
Reste maintenant à pouvoir accéder aux données à distance. Techniquement c'est possible avec `Syncthing` mais ça implique une duplication complète des répertoires que l'on veut accéder ce qui s'avère plûtôt lourd à l'utilisation.
J'ai besoin de pouvoir mettre à jour rapidement quelques fichiers et d'en récupérer quelques autres, je ne tiens pas a dupliquer toutes mes données partout ! C'est là qu'intervient le WebDAV. C'est le protocole qui semble le plus adéquat pour ça, plus simple (et rapide ?) que le SFTP. FreeNAS possède cette fonctionnalité de base mais j'ai préféré installer un serveur Nginx à l'interieur d'une Jail, plus sûr en terme d'accès.

Et avec ça j'ai remplacé l'utilisation que je faisais d'ownCloud et c'est beaucoup plus efficace.

### Accès depuis l'extérieur
On a donc un serveur WebDAV qui va permettre un accès basique aux données depuis l'extérieur du réseau local, reste maintenant à rendre cet accès possible. Pour cela, j'ai pris un nom de domaine chez OVH, c'est dans les 15€ par an et ça permet de faire du DynDNS si votre box change d'IP tout les jours (comme chez SFR par exemple). De ce que j'ai testé, ça marche sans problème.

C'est là qu'intervient le Raspberry qui va servir de point d'entrée et de reverse proxy pour les jails du NAS. Alors pourquoi utiliser le Raspberry plutôt qu'une jail ? Je trouve ça pratique de pouvoir éteindre le NAS quand je parts en vacance et de quand même garder un accès SSH si besoin. En plus le RPi est plus simple à maintenir à jour et comme il ne consomme rien et ne fais pas de bruit il n'est pas génant de l'avoir allumé en permanence. Après je suppose que la jail est une solution qui fonctionne très bien aussi.

Donc on renvoit les ports `http` et `https` de la box vers le RPi, de là le Nginx joue son rôle de reverse proxy vers les services dans les jails et voilà.