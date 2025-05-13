---
title: Résolution DNS sur MacOS
date: 2023-01-02
# modified: 2021-11-04
summary: |
    Comment ajouter un resolver DNS sur une machine MacOS sans changer la résolution de toute la carte réseau. Après une explication très vaste sur la résolution sous Debian c’est un trick que l’on va voir dans cet article.
categories: [linux]
tags: [dns, macos, network]
image: featured-dns-resolution.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Depuis 6 mois, je découvre les joies de MacOS. En dehors de la disposition du clavier qui change beaucoup, il y a la résolution [DNS de debian]({{< relref "2020-05-30--comprendre-la-resolution-dns" >}}) qui me manquait beaucoup. La possibilité d’avoir un resolver spécifique pour les domaines internes. Ceux que je n’utilise qu’au travers d’un VPN le plus souvent.

En cherchant un peu, j’ai fini par trouver une configuration similaire.

## DNS résolver MacOS

En plaçant dans le répertoire `/etc/resolver/` un fichier du nom du domain spécifique, je peux demander à Mac de résoudre avec un serveur DNS spécifique.

Par exemple si je mets la configuration suivante dans `/etc/resolver/ght1pc9qc.local` :

```shell
nameserver 10.0.0.53
```

Le domaine `ght1pc9kc.local` sera résolu avec le DNS `10.0.0.53`, mais tout le reste continura d’être résolu par le DNS configuré sur la carte réseau.

Pour vérifier que la confguration est bien reconnue, il suffit de saisir la commande `scutil --dns` :

```shell
resolver #8
  domain   : ght1pc9kc.local
  nameserver[0] : 10.0.0.53
  flags    : Request A records, Request AAAA records
  reach    : 0x00000002 (Reachable)
  order    : 1
```

La comande `man 5 resolver` donne d’autres paramètres possible pour le contenu du fichier. Par exemple, il est possible de préciser `domain` si on ne veut pas nommer le fichier comme le domaine à résoudre.