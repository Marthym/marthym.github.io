---
layout: post
title: Sauvegarde intelligente sur HubiC
excerpt: "Sauvegarder ses données sur un cloud HubiC avec mise à jour des modifications"
modified: 2016-11-02
tags: [backup,shell,admin,planetlibre,hubic]
comments: true
image:
  feature: backup.png
---

## Introduction
Il y a pas loin d'une année je publiais un script bash permettant de faire des [backups distants sur HubiC]({% post_url 2015-09-18-Backup-distant-sur-HubiC %}) (complets & incrémentaux) de toutes vos données. Un an et un changement de connexion ADSL plus tard, ce script n'est pas vraiment viable. En effet, je suis passé d'une fibre optique à une connexion ADSL avec une forte atténuation. Pour transférer mes données complète ça prend pas loin d'une journée ...

J'ai donc changé le script pour pallier ce problème. L'idée est toujours de sauvegarder mes données mais au lieu d'un ubert tar découpé que je transfère une fois par semaine, je suis parti sur une sauvegarde par sous-répertoire et un transfert des modifications uniquement.

## Explications
On a un script qui prend en entrée la passphrase et le répertoire à sauvegarder.

* Pour le répertoire, on liste les sous-répertoires et pour chacun on génère un sha1 qui va permettre de savoir si le répertoire a été modifié ou non depuis la dernière analyse. 
* Pour chaque répertoire, on crée un tar.gz que l'on crypte en GPG et que l'on envoie sur hubic. Cette partie la ne diffère pas de la version précédente du script.
* Enfin, on stocke le nom du répertoire et le sha1 dans un fichier `.bkp_sha1sum.lst` dans le répertoire principal.

De cette façon le script est capable de détecter les répertoires qui ont changé et ne transfère que les répertoires modifiés. Alors certes si le répertoire à sauvegardé est un gros répertoire fourre tout ce script aide pas. La version précédent est plus adaptée. Mais dans le cas par exemple d'un répertoire `Photos` trié par année ou par évènement, où l'année passée ne bougera plus jamais, ce script est nettement plus efficace.

## Le script
{% gist Marthym/bbdd8688eaa6e1776a304aabb99099b3 %}


