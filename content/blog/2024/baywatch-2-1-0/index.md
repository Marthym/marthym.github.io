---
title: Baywatch, l’outil de veille techno sorts en 2.2.0
slug: baywatch-feed-aggregator-free
date: 2024-02-10
modified: 2024-12-16
summary: |
    La version 2.2.0 de Baywatch est en ligne avec des améliorartions pour l’affichage des fils de news et une traduction français et anglais.
categories: [development]
tags: [baywatch, java, spring]
image: featured-baywatch-pour-veille-techno.webp
toc: true
comment: /s/beoan4/comment_r_aliser_une_bonne_veille
aliases:
    - /2024/baywatch-veille-techno-2-1-0/
---

Il y a quelque mois, je vous parlais de [Baywatch]({{< relref "baywatch-ou-la-veille-informatique" >}}), l’outil avec lequel je fais ma veille technologique. Un agrégateur de fils Atom et RSS gratuit et open source capable de faire de la déduplication des articles qui y sont référencés.

Rendez-vous https://bw.ght1pc9kc.fr/ pour vous créer un compte, c’est gratuit.

## Baywatch 2.2.0

### Traduction français / anglais

Il s'agit d'une des améliorations la plus conséquente, la traduction de l'application en anglais et en français. Jusqu'à cette version, Baywatch était en franglais, un peu de français par ci, beaucoup d'Anglais par là. Pas génial pour l'adoption. Donc dans la 2.2.0, tout est correctement traduit, l'interface comme les messages d'erreurs. Il se peut que j'en ai oublié, dans ce cas [n'hésitez pas à me faire un feedback](https://github.com/Marthym/baywatch/issues/new/choose).

C’est [vue i18n](https://vue-i18n.intlify.dev/) qui se charge de faire cette traduction. Autrement dis, tout est géré par l’UI. La langue préférée du navigateur sert de langage par défaut puis il est possible de changer de langue dans les paramètres de l'application. Techniquement, les fichiers de traduction sont séparés par module et par langue et sont chargés à la volée par le routeur juste avant l'affichage du composant. Ce qui évite d'éventuels effets de clignotement.

Pour l'instant seuls l'anglais et le français sont disponibles, mais si des volontaires se présentent pour d'autres langues, ce sera avec plaisir. Les fichiers de traduction sont consultables sur github : https://github.com/Marthym/baywatch/tree/develop/seaside/src/locales

### Affichage de la liste des news

Une autre évolution importante est la possibilité d'afficher les news soit en liste magazine comme cela était le cas jusqu’à maintenant soit en grille plus dense :
{{< figimg src="feed-news-list-card-grid.webp" alt="Capture d'écran de la liste des news au format grille" >}}

Comme pour les traductions, le mode d'affichage en magazine est configurable dans les paramètres de l'utilisateur, mais un raccourci permet aussi de la changer dans la barre de navigation.

### Nouvel écran de paramètres utilisateur

Cela commençait à manquer, un écran permettant à l'utilisateur de modifier certains paramètres de l'application comme :
  * La langue de l'interface
  * Le mode d'affichage de la liste des news
  * Désactiver le marquage "lu" automatique sur la liste des news

Ces paramètres sont disponibles dans "Configuration > Paramètres" ou "Configuration > Settings"

### Indication de l'état des flux dans la configuration

Il est maintenant possible de voir directement sur la liste des flux s'ils sont valident ou non et s'ils ne le sont pas, depuis combien de temps ils sont défectueux.

### Prise en compte des normes RDF / DCMI

En regardant les logs de l'application, j'ai vu que certains fils d'actus produisaient du XML contenant des balises aux [normes RDF / DCMI](https://www.dublincore.org/schemas/rdfs/) qui n'étaient pas pris en charge correctement. Voilà qui est corrigé, les normes sont maintenant intégrées dans le scraper.

### Corrections de bugs

Avec les nouvelles fonctionnalités viennent aussi les corrections de bugs : 
  * Pas mal de chose sur l'ajout et la mise à jour des flux de nouvelles qui ne fonctionnaient pas bien.
  * L'ajout d'un flux de nouvelle passe maintenant par un système de validation qui retournera une erreur si le flux n'est pas valide
  * L'ajout d'utilisateurs depuis l'admin ne fonctionnait pas correctement
  * Les flux Reddit ne se mettaient pas à jour correctement

## Baywatch 2.1.3

### Changement d’hébergeur

Jusqu’alors, Baywatch était hébergé sur un VPS OVH que j’avais loué il y a deux ans pour la modique somme de **193 €** pour 24 mois avec une offre promotionnelle de 34 € ce qui me donnait le VPS (2 vCPU, 4 Gb RAM, 80 Gb Disque) à **158 € HT**. Deux ans et une guerre en Ukraine plus tard, le coût du renouvellement du VPS est passé à **242 € HT** pour, non plus 24, mais 12 mois. **Soit 206 % d’augmentation en deux ans !**

Bref tout ça pour dire que je ne suis pas resté chez OVH, plus vraiment dans mon budget. En cherchant un peu, j’ai découvert [Hostinger](https://www.hostinger.fr/), un hébergeur Lituanien donc on reste en Europe. Il propose cependant des serveurs localisés en France et dans plusieurs autres pays d’Europe. Coté VPS, je suis passé à 2 vCPU, 8 Gb RAM et 100 Gb de Disque, un petit upgrade bienvenue donc. Et le tout pour **163 € HT pour 24 mois**. Certes, c’est l’offre de bienvenue avec la remise qui va bien. Mais à titre d’information, le renouvellement est annoncé à **252 € les 24 mois**.

Pour une machine plus puissante, je paie 4x moins que chez OVH.

Bref, si vous envisagez de prendre un VPS chez [Hostinger, voilà mon lien de parrainage, il vous donnera **-20% sur l’hébergement**](https://hostinger.fr?REFERRALCODE=1FRDRIC50).

### Amélioration des performances

En plus du changement d’hébergeur, la version 2.1.3 a eu droit à quelques optimisations. Merci au passage à **@dasga** qui a permis de détecter ces problèmes en utilisant Baywatch.

L’affichage des news dans la liste de la page d’accueil va maintenant beaucoup plus vite pour les utilisateurs qui ont une grande quantité de souscriptions.

De plus le scraping sur les fils Atom et RSS utilise maintenant les headers `ETag` et les dates de publication le cas échéant, pour savoir s’il est nécessaire de se mettre à jour. Les fils de news ne sont parsés que si cela est nécessaire.

## Baywatch 2.1.1
### Nouvelle fonctionnalité

{{< figimg src="create-user.webp" float="left" alt="Création Utilisateur Baywatch" >}}

Aujourd’hui, il sort en version **2.1.1**. La grosse nouveauté (et la seule visible) est la possibilité pour n’importe qui de se **créer un compte**.

Une fois le compte utilisateur créé, il ne reste plus qu’à attendre (pas longtemps) que je vous valide le compte et vous pourrez découvrir cet outil merveilleux.

Commencez par l’onglet **Configuration** pour ajouter des fils de news qui seront scrapés lors de la prochaine tache de mises à jour (toutes les heures). Vous pouvez aussi passer par la **recherche pour découvrir les fils d’actualités** qui sont déjà présents et pour lesquels il ne reste plus qu’à vous inscrire.

N’hésitez pas à me faire des [retours sur Github](https://github.com/Marthym/baywatch/issues/new/choose), si vous aimez ou s’il y a des choses à améliorer.

Baywatch est aussi téléchargeable sur github, en [tar.bz](https://github.com/Marthym/baywatch/releases/download/2.1.1/baywatch-2.1.1.tar.bz2) pour une installation manuelle directement sur vos serveurs. Ou via [Docker et docker-compose](https://github.com/Marthym/baywatch/pkgs/container/baywatch) si vous préférez.

```shell
docker pull ghcr.io/marthym/baywatch:2.1.1

```

Vous trouverez un [exemple de compose](https://github.com/Marthym/baywatch/blob/4051279ca04db044f98527eb48fa7005356263b4/docker-compose.yml#L14) dans le projet.

### Améliorations techniques

En dehors de la fonctionnalité de création d’utilisateur, la version 2.1.1, c’est aussi quelques mises à jour techniques qui ne se voient pas trop.

* Un nouveau générateur de mot de passe capable de proposer des mots de passes complexes.
* Une amélioration du système de notification qui peut maintenant stocker les notifs quand le destinataire n’est pas connecté et les restituer à l’utilisateur quand celui-ci connecte.
* La création d’une nouvelle baseline pour la base de donnée afin d’optimiser le déploiement de l’application et qui permet de supprimer les migrations Java de flyway.
* Le passage de Spring 3.2.0 à Spring 3.2.2
* L’extraction de la gestion des Entités dans une librairie à part entière.
* Ajout de la métadonnée *_createdBy* sur les entités `User`.
* Ajout de tests unitaires sur le backend

Les sources sont sur Github : https://github.com/Marthym/baywatch/tree/2.1.1

> *Edit 2024-02-11 :* **Baywatch 2.1.1**
> 
> Oui, il y a bien eu une 2.1.0 mais, j’ai MEP un peu vite et laissé passer un bug sur la mise à jour des droits utilisateurs dans l'administration. La 2.1.1 corrige ce problème et vient remplacer la version précédente.
