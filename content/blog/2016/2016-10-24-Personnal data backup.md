---
title: Sauvegarde de données personelle
date: "2016-10-24T12:00:00-00:00"
excerpt: "Présentation de mon système de sauvegarde"
#modified: 2015-09-21
categories: [security, leisure]
tags: [backup, NAS, hubic, freenas]
image: backup.png
---

## Introduction
J’ai récemment déménagé et au passage changé de box, de configuration réseau et tant qu'à tout refaire, j'en ai profité pour revoir l'organisation de mes sauvegardes perso. Je n'ai pas écrit grand-chose depuis un moment, alors pourquoi pas en faire profiter pour faire un billet rapide sur les quelques trucs sympas que j'ai changé.

## Les besoins
Voyons déjà ce qui est important en matière de préservation de nos données personnelles. Pour une sécurité minimale, les données doivent être **dupliquées sur au moins deux supports physiques**. On parle là de deux copies faciles d'accès, sur le PC de tous les jours et sur un disque secondaire. Les données doivent être facile à restaurer et à synchroniser.

Pour une sécurité optimale, **une copie distante**, situé physiquement dans un lieu différent est importante. Envoyé sur le cloud par exemple, cette copie n'a pas besoin d'être facile ou rapide d'accès. Par contre selon le lieu du stockage, il faudra sans doute crypter.

Enfin un **accès distant aux données** est uns fonctionnalité sympa qui permet d'accéder à ses photos ou vidéo même en voyage.

## Le matériel
Un vieux PC fixe de 7 à 8 ans, avec quelques modifications se reconvertit en NAS.

Suppression du matériel inutile, lecteur DVD et carte graphique, ça gagne en consommation et en décibels. Ensuite, ajout de disque conséquent et adapté, j'ai opté pour 2x [Western Digital Red 2 To](http://www.ldlc.com/fiche/PB00133400.html), des disques fait pour rester allumé en permanence, taillés pour les NAS et j'en suis vraiment très content. Les deux seront monté en RAID 10.

J'ai aussi ajouté une ventilateur plus silencieux que l'original car le PC est dans le salon et le ventilo original soufflait un peu. J'ai pris conseil sur [cette page](http://www.choixpc.com/silence.htm) (elle est moche mais bien pratique et pleine de bonnes infos), et j'ai choisi un [Arctic Freezer 13](http://www.ldlc.com/fiche/PB00112450.html#aff106) pour son rapport taille efficacité.

## Le système
Pour la partie système, le NAS tourne sous [FreeNAS](http://www.freenas.org/). Certes il y a d'autres système pour NAS, comme OpenMediaVault par exemple, et de bonnes raisons de les choisir. Les avis divergents et je vais pas rentrer dans une justification. FreeNAS répond au besoin, et de ce que j'en ai vu ça ét là il est ultra robuste et éprouvé. Parmi les fonctionnalités particulièrement appréciables on trouve :

* Le système de snapshot ZFS qui m'a sauvé la vie plusieurs fois
* Les jails, même si c'est un peu plus contrainiant que des docker
* L'interface austère mais efficace
* L'installation sur clé pour ne pas squatter d'espace disque pour rien

## Le fonctionnement

### Duplication et accès distant aux données
J'ai longtemps utilisé [ownCloud](https://owncloud.org/) pour répondre à ces besoins. Installé dans une jail de FreeNAS, ownCloud fournit une interface de visualisation des données, un accès WebDAV et des clients de synchronisation pour un peu tous les OS du marché. Cependant je n'ai jamais été pleinement satisfait par owncloud. 

Son client Windows est une horreur, si la quantité de fichiers à synchroniser est trop grande, il met plus de temps à chercher les différences que la plage d'intervale de synchronisation. Ce qui a pour conséquence une suppression pure et simple des fichiers en retard lors de la plage de synchro suivante. Sous Linux c'est un peu différent car le client utilise inotify et la synchro est en temps réel.

Dernièrement sous Linux le client se déconfigure et à chaque redémarrage il faut resaisir l'URL du serveur et les login/password.

Enfin, des dissensions au sein du projet ont engendré un fork [NextCloud](https://nextcloud.com/). Ce genre de chose est rarement de bon augure pour un projet, les utilisateurs en sont divisés et la pérénnité des projets est douteuse. Pour des projets garant de vos données personnelles ce n'est pas engageant.

C'est pourquoi après quelques recherches d'alternative, je me suis tourné vers une solution un peu différente, en séparant la partie duplication de la partie accès distant.

#### Duplication des données
C'est la base de la sauvegarde, les données doivent a minima se trouver sur deux supports différents pour s'assurer qu'il n'y aura pas de perte si un disque ou un PC tombe en panne.

Donc les données sont biensur sur mon portable de tous les jours, c'est de là que je les utilise, et elles sont aussi dupliquées sur le NAS. Sur les deux disques en RAID 10 (stripper + mirroré).<br>
Je voulais une synchro bidirectionnelle car quand je ne suis pas chez moi il m'arrive de mettre à jour les données directement sur le NAS. `rsync` n'est pas adapté à la synchronisation bidirectionnelle et les clients de synchro sont rares et souvent peu fiables (cf. ownCloud). Mais il y a [Syncthing](https://syncthing.net/), un clone libre de BittorentSync. Ca fonctionne à partir du protocole ... Torrent donc, c'est décentralisé et particulièrement efficace. Ca fonctionne sur un réseau local comme depuis internet et tous les échanges sont crytpés. A la base c'est plus pour le partage que la synchronisation de backup mais ça fait le taff à merveille.

J'ai donc `Syncthing` qui tourne sur mon portable et dans une jail du NAS (il existe une version pour FreeBSD) et les deux se synchronisent. Malgré la quantité de données il n'y a pas eu de cafouillage, ça va vite et c'est léger. L'installation ne présente pas de difficulté particulière mais la configuration entre les machines synchronisées est un peu moins intuitive, je m'y suis pris à deux fois. 

J'ai choisi de splitter la synchro en plusieurs répertoires, ça permet de paralléliser la synchro, c'est un peu plus long à configurer mais ça fonctionne beaucoup mieux.

Le site du projet est clair sur le fait que c'est plus un outil de partage que de backup notamment parce qu'il n'historise pas (en fait si mais bon) mais pour l'utilisation que j'en fais c'est le jour et la nuit avec ownCloud. Et en bonus, sans la moindre configuration supplémentaire ça fonctionne aussi depuis l'extérieur du réseau.

#### Accès à distance aux données
Reste maintenant à pouvoir accéder aux données à distance. Techniquement c'est possible avec `Syncthing` mais ça implique une duplication complète des répertoires que l'on veut accéder ce qui s'avère plutôt lourd à l'utilisation.
J'ai besoin de pouvoir mettre à jour rapidement quelques fichiers et d'en récupérer quelques autres, je ne tiens pas à dupliquer toutes mes données partout ! C'est là qu'intervient le WebDAV. C'est le protocole qui semble le plus adéquat pour ça, plus simple (et rapide ?) que le SFTP. FreeNAS possède cette fonctionnalité de base mais j'ai préféré installer un serveur Nginx à l'interieur d'une Jail, plus sûr en termes d'accès.

Et avec ça j'ai remplacé l'utilisation que je faisais d'ownCloud et c'est beaucoup plus efficace. Reste finalement qu'à placer un frontal pour accéder au différents services dans les jails et configurer la box pour accéder au frontal

## Sauvegarde distante
Comme expliqué plus haut, il est rassurant d'avoir ses données dupliqué sur plusieurs supports, ça couvre 90% des risques de perte de données. Mais quand les deux supports sont situés physiquement au même endroit, il reste un risque de perte, un incendie, un cambriolage, ... La solution c'est d'exporter les données dans un lieu différent.

Pour ça j'ai prix un compte chez Hubic, rapport espace de stockage / prix imbattable (10To/50€/an). La difficulté c'est que Hubic c'est des serveurs [OpenStack](https://www.openstack.org/) ce qui veut dire que tout passe par des APIs REST, pas d'accès FTP ou autres. J'ai déjà fait un billet sur le sujet des [backups distants sur HubiC]({{% relref "/blog/2015/2015-09-18-Backup-distant-sur-HubiC" %}}), je vous invite à le lire pour plus d'info sur la façon d'envoyer des sauvegardes sur Hubic. 