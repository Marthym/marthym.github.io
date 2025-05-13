---
title: DNS resolution for MacOS
date: 2023-01-02
modified: 2025-05-13
summary: |
    Configurez un DNS resolver par domaine sur macOS en utilisant `/etc/resolver/`, pour une résolution fine via VPN, à la manière de Debian. Guide détaillé avec exemple de configuration et vérification via scutil
categories: [linux]
tags: [dns, macos, network]
image: featured-dns-resolution.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

For the past 6 months, I've been discovering the joys of MacOS. Apart from the keyboard layout, which changes a lot, I really missed debian's DNS resolver. The ability to have a specific resolver for internal domains. These are the domains I usually only use through a VPN.

After a bit of searching, I finally found a similar configuration.

## DNS resolver for MacOS

By placing a file with a specific domain name in the `/etc/resolver/` directory, I can ask MacOS to resolve this domain with a specific DNS server.

For example, if I put the following configuration in `/etc/resolver/ght1pc9qc.local` :

```shell
nameserver 10.0.0.53
```

The `ght1pc9kc.local` domain will be resolved with DNS `10.0.0.53`, but everything else will continue to be resolved by the DNS configured on the network card.

To check that the confguration is recognized, simply enter the command `scutil --dns` :

```shell
resolver #8
  domain   : ght1pc9kc.local
  nameserver[0] : 10.0.0.53
  flags    : Request A records, Request AAAA records
  reach    : 0x00000002 (Reachable)
  order    : 1
```

The `man 5 resolver` command gives other possible parameters for the contents of the file. For example, you can specify `domain` if you don't want to name the file after the domain to be resolved.
