---
layout: post
title: Nettoyer sa Debian
excerpt: "Après quelques années d'utilisation, même un système Linux peut s'encrasser. Voyons comment on peut le nettoyer et ainsi regagner de l'espace disque."
modified: 2016-11-02
tags: [planetlibre,debian,admin,disque,apt]
comments: true
image:
  feature: debian.png
---

Même si ce n'est pas dans les proportion de Windows, un Linux a tendance à accumuler des reliquats de vieux paquets et du cache pas vraiment utile qui à la longue pèsent lourd sur l'espace disque (ça ne ralenti pas le système pour autant). Voyons quelques pistes pour récupérer cet espace et rafraichir un peu le disque.

## Localepurge
C'est la première chose à faire, ''localepurge'' est un outil qui à chaque install de paquet ou de mise à jour, va faire le ménage dans les langues installés.
Sa première utilisation va potentiellement faire gagner pas mal de place.

``` sh
apt install localepurge
localepurge
```

Cette opération ne se fait qu'une fois, par la suite `localepurge` se lance automatiquement avec `apt`.

## Le nettoyage régulier

### Les symptomes

Si on lance la commande suivante
``` sh
du -hs /var/cache/apt/archives
728M /var/cache/apt/archives
```

On constate que le cache des paquets prend une place significative au sein du système pour une utilité très réduite.

### La solution
Cette suite de commande va permettre d'effectuer un nettoyage rapide des caches d'apt sans risque d'endommager le système :
``` sh
apt-get autoclean
apt-get clean
apt-get autoremove
```

La première commande supprimera tous les paquets .deb présent dans le cache dont une version plus récente est installé, la deuxième supprime tous les paquets
du cache, et non pas seulement ceux obsolètes comme la commande précédente, enfin la troisième commande supprime les dépendances qui ne sont plus nécessaires.

Si vous faite un `du` par la suite vous verrez le gain de place.

## Gagner encore de la place
Si cela n'a pas suffit, voici encore quelques façons de gratter un peu de place.

  * **Nettoyer /var/tmp** ce dernier contient des fichier ... temporaires non effacé
  * **Nettoyer /var/log** qui contient les log du système

### Nettoyer les kernels
Lors des mise à jour de kernel, les anciens kernel sont conservé afin de pouvoir y revenir en cas de problème.
Il est possible de dés-installer les anciens kernel ainsi que tout ce qui leur est associé (header, src, ...) via apt-get.

La commande suivante vous permet de connaître le kernel actuellement utilisé

``` sh
uname -r
4.7.0-1-amd64
```

Celle pour les kernels installé :

``` sh
dpkg --list 'linux-image*'
```
```
Souhait=inconnU/Installé/suppRimé/Purgé/H=à garder
| État=Non/Installé/fichier-Config/dépaqUeté/échec-conFig/H=semi-installé/W=attend-traitement-déclenchements
|/ Err?=(aucune)/besoin Réinstallation (État,Err: majuscule=mauvais)
||/ Nom                                  Version                Architecture    Description
+++-====================================-======================-===============-=====================================
rc  linux-image-3.16.0-4-amd64           3.16.7-ckt11-1+deb8u3  amd64           Linux 3.16 for 64-bit PCs
rc  linux-image-4.0.0-2-amd64            4.0.8-2                amd64           Linux 4.0 for 64-bit PCs
rc  linux-image-4.1.0-1-amd64            4.1.3-1                amd64           Linux 4.1 for 64-bit PCs
rc  linux-image-4.2.0-1-amd64            4.2.6-3                amd64           Linux 4.2 for 64-bit PCs
rc  linux-image-4.3.0-1-amd64            4.3.5-1                amd64           Linux 4.3 for 64-bit PCs
rc  linux-image-4.4.0-1-amd64            4.4.6-1                amd64           Linux 4.4 for 64-bit PCs
rc  linux-image-4.5.0-1-amd64            4.5.1-1                amd64           Linux 4.5 for 64-bit PCs
rc  linux-image-4.5.0-2-amd64            4.5.5-1                amd64           Linux 4.5 for 64-bit PCs
ii  linux-image-4.6.0-1-amd64            4.6.4-1                amd64           Linux 4.6 for 64-bit PCs
ii  linux-image-4.7.0-1-amd64            4.7.8-1                amd64           Linux 4.7 for 64-bit PCs (signed)
un  linux-image-4.7.0-1-amd64-unsigned   <aucune>               <aucune>        (aucune description n\'est disponible)
ii  linux-image-amd64                    4.7+75                 amd64           Linux for 64-bit PCs (meta-package)
```

Les "**ii**" sont les packages installé, pour supprimer ceux qui ne sont plus utilisé, dans l'exemple suivant c'est le **4.6.0-1-amd64** :

``` sh
apt purge linux-image-4.6.0-1-amd64 linux-headers-4.6.0-1*
```

**ATTENTION Cette commande est a utiliser avec beaucoup de parcimonie, c'est irréversible et ça casse la VM ou le PC définitivement !**

### Trouver les gros fichiers
[[include:../shell/Trouver les gros fichiers]]

## Liens
  * [[http://forum.ovh.com/showthread.php?t=27814]]

<!-- --- tags: linux -->
