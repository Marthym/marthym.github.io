---
title: Wifi Android et Freebox v6
slug: wifi-android-and-freebox-v6
date: 2024-06-06
summary: |
    Avez vous déjà eu des problèmes pour connecter un dispositif Android stock au wifi de votre Freebox v6. Le wifi se connecte mais ne trouve pas de connexion internet et se déconnecte. Et ce cycle se reproduit à l'infinie sans aucune explication. Voilà comme j'ai résolu ce problème.
categories: [leisure, infrastructure]
tags: [free, wifi, android, google, ipv6, dns, freebox]
image: featured-android-freebox-wifi.webp
# toc: true
# comment: /s/s2evgi/le_pattern_entit_et_la_gestion_des_m_ta_donn
---

Quelque temps, j'ai acheté un Pixel 6 à ma conjointe pour son anniversaire. Il fonctionne nickel, mais impossible de le connecter au wifi de l'appartement. On se dit que c'est le téléphone qui à un problème avec sa carte wifi. Ça fonctionne avec tous les autres wifi, ce n'est pas gênant, on reste en 3G à la maison et voilà. Un jour, le téléphone est brisé, on le change pour le même modèle et rebelote, même problème, la connexion wifi saute de connecté à déconnecté en continu.

Vous avez déjà eu ce problème ?

## Symptômes

Vu du téléphone, le wifi semble se connecter correctement, mais au bout de 2s, il repasse en non connecté et tourne en boucle comme ça infiniment. Ce qui est particulièrement étrange, c'est que pendant les 2s où le wifi est connecté, internet fonctionne et si on rafraîchit une page du navigateur, la page apparait. Mais à chaque fois la connexion saute et revient.

Plus étrange encore, cela se produit uniquement avec les téléphone et produit Android. Par exemple, on a aussi eu le problème avec un Chromecast et GoogleTV, mais jamais sur un PC ni sur un téléphone d'autre marque que google qui ont une surcouche android.

Toujours plus étrange, tous ces périphériques fonctionnent parfaitement sur les réseaux wifi autre que ceux de la Freebox.

## Investigations

Manifestement, le problème vient de la Freebox. Mais qu'est-ce qui sur la configuration wifi de la Freebox peut provoquer des problèmes spécifiquement aux périphériques Google ?

On a testé plusieurs modifications dans la configuration :

  * forcer les fréquences, 2Ghz ou 5Ghz, les largeurs de bande, sans succès
  * Rendre le SSID visible, aucune différence
  * Utiliser ou non un wifi invité, nop
  * Redémarrer la Freebox une bonne centaine de fois, toujours rien
  * Désactiver le filtre anti-pub de la Freebox, non plus
  * Changer les canaux wifi, pas de changement
  * Mettre une IP statique au device, avec le DNS 8.8.8.8, marche pas non plus
  * Changer le mot de passe pou run truc plus simple et moins long, toujours rien

Rien de tout cela n'a eu le moindre effet, le wifi continue à sauter toutes les 2s.

## Solution

Finalement, en s'énervant sur le Chromecast qui ne fonctionne pas, on constate qu'en DHCP, il chope des IPv6. On va donc voir dans les configs IPv6 de la Freebox. **Et sur l'onglet DNS de la configuration IPv6, on décoche la case "Forcer l'utilisation de serveurs DNS IPv6 personnalisés"**. Et là **eurêka** la connexion wifi se stabilise.

La compréhension que j'en ai, est que le `ConnectivityManager` d'Android, de suite après la connexion wifi ping un serveur google pour s'assurer d'avoir un accès internet. Cela permet entre autre de savoir s'il est sur un réseau qui demande une authentification (type wifi d'hôtel) et de vous proposer la notification de login. Sauf que dans le cas de la Freebox qui accepte l'IPv6, et force le serveur DNS. Ce serveur DNS ne connait pas le domaine sur lequel android veut ping et celui-ci interprète le domaine inconnu comme une erreur de connexion internet et reboucle la connexion wifi.

Bref ça a pris pas mal de temps pour trouver ça et je n'ai heureusement pas trouvé grand-chose sur internet pour résoudre mon problème. J'espère que si vous avez le problème et que vous tombez sur cette page, cela vous aidera. Si c'est le cas, envoyez-moi un petit mail.