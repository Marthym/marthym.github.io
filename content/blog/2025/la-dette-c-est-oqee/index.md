---
title: La dette technique c'est Oqee
date: 2025-04-08
# lastmod: 2025-03-25
summary: |
    Un billet d’humeur qui parle de dette technique et de ce que Free à fait avec l’écran de veille Oqee sur la Freebox Evolution. Tout n’est que fiction biensur mais vous y retrouverez surement le manager que vous avez aimer détester ou le collaborateur diva ingérable.
categories: [management]
tags: [free, humeur, Oqee, dette, freebox]
image: featured-la-dette-technique-c-est-oqee.webp
toc: true
# comment: /s/epbbby/le_protocole_server_sent_event_avec
# alias:
#   - /2021/server-sent-event-vs-websocket-avec-spring-webflux/
---

Pour une fois, un article d’humeur, c’est gratuit, c’est Free, c’est Oqee.


L’autre jour, je me pose sur le canap avec ma conjointe et on discute de nos journées respectives. La Freebox est allumé et soudain, alors qu’elle me parle de la dette technique qui s’accumule sur son produit, voilà que l’écran de veille Oqee de la Freebox se déclenche. En le voyant on se fait la réflexion que ça ne fait pas loin d’un mois que les 4 mêmes pubs y tournent et que ce n'est pas très bien foutu comparé à celui de Netflix.

Alors on s’est mis à imaginer ce qu’il s’est passé...

## Le commité de direction Oqee

{{< chat >}}
- Putain les gars, ils me gavent chez Netflix, ils tournent sur notre plateforme et ils nous taxent l’écran de veille. Merde on leur fait de la pub gratos. On va bien trouver un moyen de leur gratter la pub !
- Bah on a qu’à faire un écran de veille qui passe au-dessus de toutes les applis y compris du leur.
- Ouais carrément, mais il faut me faire ça rapidos, j’en peux plus de voir ces pubs alors qu’on pourrait se faire carrément des milliards de dollars en remplaçant leur écran de veille par le nôtre.
- On va motiver les équipes, ça va aller vite. De toutes façons pour coller 3 images en premier plan ça va pas prendre 10 jours
{{< /chat >}}

## La réunion d’équipe

{{< chat >}}
- Bon alors les gars, on a discuté avec la direction et on va niquer Netflix en mettant un écran de veille par-dessus le leur. Combien de temps ça va prendre ?
- Euh, il faudrait analyser le truc, voir les impacts sur les autres applications. Et puis il va falloir faire le backoffice pour mettre à jour les pubs que l’on veut y afficher. Et puis ya les quatre autres features ultra-urgentes que tu as demandé la semaine dernière, on en fait quoi ?
- Non mais à la louche pour se faire une idée
- A la louche, mais vraiment sans certitudes, il faudrait faire une analyse pour être sûr, mais à la louche grosse mailles, environ 3 mois
- Ah, non mais pour faire juste l’écran de veille, pas le backoffice, au pire on change à la main dans la base. Et pas besoin d’analyse, s’il y a un problème on corrigera plus tard. L’important là, c'est de niquer l’écran Netflix. Moi je veux juste 3 images qui s’affichent au tout premier plan. Faut quoi pour faire ça ... 5 jours, aller, une semaine grand max non ?
- Euh non, en fait même sans back office, ça prendra bien 1 mois. Et puis sans backoffice, ça veut dire que chaque fois que tu vas vouloir mettre à jour, va falloir que je m’interrompe et que j’aille trafiquer la base de production au risque de casser des trucs, c’est pas confort.
- Bon ce qu’on va faire c’est qu’on fait au mieux pour le mettre dans la Mise en prod du mois prochain. Au pire si t’as besoin dis-moi, on embauchera des Freelance pour aller plus vite. Aller, faut que j’y aille, j’ai une réunion avec le marketing pour voir quoi mettre sur ces nouveaux écrans de veille.
- *(... ok c’est mort...)*
{{< /chat >}}

## Le mois suivant

{{< chat >}}
- Bon alors les gars, on en est où de l’écran de veille Oqee ? La MEP c’est dans 3 jours.
- On a bien avancé mais bon, ya pas de back office donc tout est plus ou moins en dur dans la base ou dans le code. Et ya pas mal de bugs qui trainent. Par exemple, il arrive que l’écran de veille se déclenche sans raison et recouvre la TV ou un film Netflix.
- Bah pas grave ça on dira que c’est une feature, de toutes façons c’est pas les clients qui vont se plaindre, ils n'ont aucune chance d’arriver jusqu’à un humain au support donc on s’en fout.
- Ouais, mais quand même c’est pas super pro, ça donne pas une bonne image.
- Je verrais avec le Marketing pour avoir une bonne image, en attendant on MEP comme prévu, merci les gars super boulot 👍
{{< /chat >}}

## 6 mois après la MEP

Pendant que je discute sur le canap avec ma conjointe...

{{< chat >}}
- Bordel Francis, ça fait déjà 2 mois que je t’ai demandé de changer ces putains d’images sur l’écran de veille, c’est pas sorcier. J’ai la direction et le market qui me les brises avec ça tous les jours.
- Je sais mais faut que j’upload les images et que je fasse la requête en prod c’est chaud, en plus on a toujours ce problème de déclenchement intempestif, plus 15 autres bugs qu’on n'avait pas détectés. Je t’avais dit qu’il fallait un back office, là c'est mort, on corrige et on verra après pour le market.
- Non non, tu te démerdes comme tu veux, mais tu me vires changes ces putains d’images, aujourd’hui, sinon c’est toi qui vas voir le market pour leur expliquer.
{{< /chat >}}

## 1 mois dans le futur

{{< chat >}}
- Bon patron, la bonne nouvelle, c’est que j’ai fait la modif des images de l’écran de veille dans la BDD.
- Ah enfin, ça aura pris que 7 mois, quand j’étais dev, je l’aurais fait en 5 mn, mais bon tout est compliqué aujourd’hui !
- Par contre, tu te souviens le bug de déclenchement intempestif ?
- Oui, mais c’est bon, on s’en fout, je viens de recevoir un mail du market, faut rechanger les images, ils ont des nouveaux visuels
- Oui non mais là le bug c’est que l’écran de veille s’affiche tout le temps, il ne s’enlève plus. Alors tu préfères que je mette à jour les images ou que j’essaye de corriger le bug ?
{{< /chat >}}

## Conclusion

Bien sûr, tout ceci n’est que fiction et toute ressemblance avec des faits réels serait fortuite. Je n’ai jamais travaillé chez Free et je suis CTO dans ma boite, j’espère que mes équipes ne pensent pas ça de moi !

Si toutefois quelqu’un de chez Free lit ça, je suis chaud d’un retour. Et si un dev qui a participé au développement de l’appli Netflix sur Freebox me lit, pareil, je suis chaud de comprendre pourquoi cette appli Netflix est la seule à mettre 10 mn à démarrer ? Ou qui a fait le choix de précharger le dernier profil au risque de faire perdre 2 mn à l’utilisateur.
