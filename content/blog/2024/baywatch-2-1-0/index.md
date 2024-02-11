---
title: Baywatch, l’outil de veille techno sorts en 2.1.1
slug: baywatch-veille-techno-2-1-0
date: 2024-02-10
modified: 2024-02-11
summary: |
    Baywatch sort en version 2.1.1 avec la possibilité pour tous les utilisateurs de se créer un compte gratuitement.
categories: [development]
tags: [baywatch, java, spring]
image: featured-baywatch-pour-veille-techno.webp
toc: true
comment: /s/beoan4/comment_r_aliser_une_bonne_veille
---

Il y a quelque mois, je vous parlais de [Baywatch]({{< relref "baywatch-ou-la-veille-informatique" >}}), l’outil avec lequel je fais ma veille technologique.

## Nouvelle fonctionnalité

{{< figimg src="create-user.webp" float="left" alt="Création Utilisateur Baywatch" >}}

Aujourd’hui, il sort en version **2.1.1**. La grosse nouveauté (et la seule visible) est la possibilité pour n’importe qui de se **créer un compte**.

Une fois le compte utilisateur créé, il ne reste plus qu’à attendre (pas longtemps) que je vous valide le compte et vous pourrez découvrir cet outil merveilleux.

Commencez par l’onglet **Configuration** pour ajouter des fils de news qui seront scrapés lors de la prochaine tache de mises à jour (toutes les heures). Vous pouvez aussi passer par la **recherche pour découvrir les fils d’actualités** qui sont déjà présents et pour lesquels il ne reste plus qu’à vous inscrire.

N’hésitez pas à me faire des [retours sur Github](https://github.com/Marthym/baywatch/issues/new/choose), si vous aimez ou s’il y a des choses à améliorer.

Rendez-vous https://bw.ght1pc9kc.fr/ pour vous créer un compte, c’est gratuit.

Baywatch est aussi téléchargeable sur github, en [tar.bz](https://github.com/Marthym/baywatch/releases/download/2.1.1/baywatch-2.1.1.tar.bz2) pour une installation manuelle directement sur vos serveurs. Ou via [Docker et docker-compose](https://github.com/Marthym/baywatch/pkgs/container/baywatch) si vous préférez.

```shell
docker pull ghcr.io/marthym/baywatch:2.1.1

```

Vous trouverez un [exemple de compose](https://github.com/Marthym/baywatch/blob/4051279ca04db044f98527eb48fa7005356263b4/docker-compose.yml#L14) dans le projet.

## Améliorations techniques

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
