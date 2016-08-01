---
layout: post
title: Nettoyer les fichiers de configuration obsolète
excerpt: "Comment nettoyer les fichiers de configuration devenus obsolète au fil des mises à jour de votre Debian"
#modified: 2015-09-16
tags: [debian, linux, apt, conffile, nettoyer, clean, planetlibre]
comments: true
image:
  feature: debian.png
---

Je suis tombé sur un article de [François Marier][francois-marier] expliquant comment trouver et nettoyer certains fichier de configuration obsolètes de sa Debian. J'ai trouvé ça intéressant alors je le traduit ici. Ce n'est pas une traduction fidèle à 100% alors n'hésitez pas a aller voir l'original. Pour les besoins de la traduction, les sorties consoles sont des gros copier/coller des familles. Mais quand j'ai testé sur mon PC, j'avais a peu de chose près les mêmes sorties.

----

Comme l'explique Raphaël Hertzog [dans l'un de ses articles][clean-conffile], supprimer un fichier de configuartion obsolète n'est pas si simple que ça. Il se peut donc qu'au fil des mises à jour, des fichiers soient oublié dans les méandres du système.

## Procédure standard

La commande qui permet de lister les fichiers de configuration osolète est la suivante

```bash
dpkg-query -W -f='${Conffiles}\n' | grep 'obsolete$'
 /etc/apparmor.d/abstractions/evince ae2a1e8cf5a7577239e89435a6ceb469 obsolete
 /etc/apparmor.d/tunables/ntpd 5519e4c01535818cb26f2ef9e527f191 obsolete
 /etc/apparmor.d/usr.bin.evince 08a12a7e468e1a70a86555e0070a7167 obsolete
 /etc/apparmor.d/usr.sbin.ntpd a00aa055d1a5feff414bacc89b8c9f6e obsolete
 /etc/bash_completion.d/initramfs-tools 7eeb7184772f3658e7cf446945c096b1 obsolete
 /etc/bash_completion.d/insserv 32975fe14795d6fce1408d5fd22747fd obsolete
 /etc/dbus-1/system.d/com.redhat.NewPrinterNotification.conf 8df3896101328880517f530c11fff877 obsolete
 /etc/dbus-1/system.d/com.redhat.PrinterDriversInstaller.conf d81013f5bfeece9858706aed938e16bb obsolete
```

Il faut ensuite connaître le package auquel chacun de ces fichiers appartient pour pouvoir le reconfigurer.

```bash
$ dpkg -S /etc/bash_completion.d/initramfs-tools
initramfs-tools: /etc/bash_completion.d/initramfs-tools
```

Puis on suit les [instructions de Paul Wise][reconffile] pour supprimer les fichiers et reconfigurer le package.

## Cas des fichier dbus-1

Pour quelques obscures raisons, cela ne fonctionne pas avec les fichiers issue du répertoire `/etc/dbus-1/system.d/` pour ces derniers, il faudra puger puis ré-installer le package.

```bash
$ dpkg -S /etc/dbus-1/system.d/com.redhat.NewPrinterNotification.conf
system-config-printer-common: /etc/dbus-1/system.d/com.redhat.NewPrinterNotification.conf
$ dpkg -S /etc/dbus-1/system.d/com.redhat.PrinterDriversInstaller.conf
system-config-printer-common: /etc/dbus-1/system.d/com.redhat.PrinterDriversInstaller.conf

$ apt purge system-config-printer-common
$ apt install system-config-printer
```

## Apparmor

Et biensûr apparmor est un cas encore différent. Les fichiers situé dans `/etc/apparmor.d/` ne sont pas nettoyé, même avec un purge.

```bash
$ dpkg -S /etc/apparmor.d/abstractions/evince
evince: /etc/apparmor.d/abstractions/evince
$ apt purge evince
$ dpkg-query -W -f='${Conffiles}\n' | grep 'obsolete$'
 /etc/apparmor.d/abstractions/evince ae2a1e8cf5a7577239e89435a6ceb469 obsolete
 /etc/apparmor.d/usr.bin.evince 08a12a7e468e1a70a86555e0070a7167 obsolete
```

Il faut purger aussi les profils apparmor pour que cela fonctionne :

```bash
$ apt purge apparmor-profiles apparmor-profiles-extra evince ntp
$ apt install apparmor-profiles apparmor-profiles-extra evince ntp
```

Alors pourquoi faut il faire ça, d'après François Marier, il se peut que ces fichiers ai été embarqué dans les packages d'apparmor puis mis à jour plus tard directement par les packages `evince` et `ntp` à la suite de quoi `dpkg` s'emmèle les pinceaux quand il faut nettoyer.


## Liens

  * [francois-marier]
  * [clean-conffile]
  * [reconffile]

[francois-marier]: https://feeding.cloud.geek.nz/posts/cleaning-up-obsolete-config-files-debian-ubuntu/
{:hreflang="en"}
[clean-conffile]: https://raphaelhertzog.fr/2011/06/06/la-bonne-maniere-de-supprimer-un-fichier-de-configuration-obsolete-dans-un-paquet-debian/
{:hreflang="fr"}
[reconffile]: https://lists.debian.org/debian-mentors/2013/05/msg00115.html
{:hreflang="en"}

