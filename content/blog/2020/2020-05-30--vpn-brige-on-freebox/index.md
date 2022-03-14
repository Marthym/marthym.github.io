---
title: VPN Bridgé vers une Freebox
date: 2020-05-30
summary: |
  Une connexion VPN routé vers une Freebox est simple à configurer. Par contre, une connexion VPN Bridgé, est plus complexe. 
  L’interface réseau TAP ne se crée pas automatiquement et il est nécessaire de configurer un peu finement le fichier OpenVPN.
tags: [vpn, freebox, network, dns]
image: featured-vpn-freebox-bridge.webp
comment: /s/3khoqy/vpn_bridg_vers_une_freebox
---

Sur une Freebox, il y a deux types de connexions OpenVPN :

* **Routé**: Tout le trafic internet passe par votre Freebox, votre IP de sortie est celle de la Freebox. Par contre, vous n’avez pas accès au réseau local de la Freebox.
* **Bridgé**: Vous êtes sur votre réseau local, mais le trafic internet lui ne passe pas par la Freebox, vous gardez l’IP donnée par votre point de connexion.

C’est de ce dernier que je vous parle aujourd’hui. Pour le mode routé, c’est simple et le fichier de configuration du client fourni par la box fonctionne du premier coup sans modification.

On part du principe que vous savez déjà [comment configurer la box pour obtenir le fichier de configuration client](https://blog.genma.fr/?La-Freebox-v6-dispose-d-un-serveur-et-d-un-client-VPN), et que vous avez les bases de la configuration réseau sous Linux.

## Le problème 

Pour le mode **bridgé**, c’est différent, si vous l’importez dans NetworkManager et tentez de lancer la connexion, vous allez voir les messages suivants dans `/var/log/syslog`

```shell
Could not generate persistent MAC address for tap0: No such file or directory
VPN plugin: failed: bad-ip-config
```

Après quelques recherches sur le net, je trouve beaucoup de gens avec le même problème sans réponse. Puis je tombe sur un message de forum expliquant comment un Freenaute a résolu ce souci : https://forum.ubuntu-fr.org/viewtopic.php?id=2052651

Malheureusement, bien que cela donne des pistes, cela ne permet pas de résoudre les problèmes.

## Explications

Pour le mode routé, on utilise une interface VPN `TUN` alors que le mode bridgé lui utilise une interface `TAP`. Ces interfaces sont créées à la volée lors de l’ouverture de la connexion VPN. Manifestement, la création d’une interface `TUN` ne pose pas de problème au client OpenVPN, mais la création d’une interface `TAP` ne fonctionne pas. J’ai lu des posts disant qu’il s’agissait d’un bug, d’autres expliquant que cela vient de la configuration du serveur VPN de la Freebox. Bref, cela ne fonctionne pas.

Le deuxième problème est que la Freebox ne fournit pas d’IP à cette interface lors de la connexion. Je ne sais dire pourquoi, idem, bug ou mauvaise configuration. Dans tous les cas, la configuration du serveur VPN de la Freebox n’étant pas modifiable, on ne le saura jamais...

## Résolution

### Ajouter l’adresse MAC

Pour ce qui est de la création de l’interface `TAP` le message d’erreur, ainsi que l’article cité ci-dessus, donnent une bonne piste, le système n’arrive pas à obtenir d’adresse MAC. Du coup pour résoudre, il suffit de lui en fournir une via l’option `lladdr` dans le fichier de configuration client fourni par la FB.

Pour en trouver une, j’ai commencé par créer l’interface manuellement avec la commande `tuntap`, puis je copie son adresse et enfin je supprime l’interface :

```shell
$ sudo ip tuntap add mode tap tap0
$ ip addr show tap0
29: tap0: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 01:23:45:67:89:a7 brd ff:ff:ff:ff:ff:ff
$ sudo ip link delete tap0
```

Il suffit ensuite d’ajouter la ligne suivant dans le fichier de configuration client fourni par la box :

```shell
lladdr 2a:11:d0:c5:2f:84
```

### Fournir une IP

Ensuite, il reste le problème de l’adresse IP. En l’état, OpenVPN n’arrive pas obtenir d’adresse IP pour le réseau de local de la FB. On va donc lui en fournir une statique. Par défaut, le DHCP de la FB fournit des IPs en `192.168.0.0/24` entre 1 et 50. Il faut donc une IP à ce format et supérieure à 50.

Toujours dans le même fichier de configuration, on ajoute la ligne suivante :

```shell
ifconfig 192.168.0.51 255.255.255.0
```

### Lancer la connexion

Maintenant que le fichier est corrigé, on peut essayer de lancer une connexion bridgé. Oubliez les configurations avec NetworkManager, ça ne fonctionne pas. Et là, c’est effectivement un bug, quand j’essaye, j’ai des stacktraces d’erreurs en pagaille. On est obligé d’utiliser la commande OpenVPN :

```shell
sudo openvpn /home/user/.openvpn/config_openvpn_bridge_user.ovpn
Enter Auth Username: votreuser
Enter Auth Password: votrepassword
...
Initialization Sequence Completed
```

Vous devriez maintenant avoir accès aux machines de votre réseau local. 

```shell
ping 192.168.0.254
PING 192.168.0.254 (192.168.0.254) 56(84) bytes of data.
64 bytes from 192.168.0.254: icmp_seq=1 ttl=64 time=47.0 ms
64 bytes from 192.168.0.254: icmp_seq=2 ttl=64 time=46.0 ms
...
```

Ce que j’aime dans cette solution, c’est qu’elle ne fait pas appel à des modifications dans la configuration de l’OS, qu’elle n’utilise pas de scripts obscurs tirés de Gist et qu’il n’est pas nécessaire de lancer des commandes de 10 lignes.

Par contre, pour ce qui est de la résolution DNS de vos machines, c’est une autre histoire que je vous raconterais dans le prochain article.