---
title: Import SQL avec barre de progression
date: 2021-12-18
# modified: 2021-11-04
summary: |
    Vous êtes rivés sur votre écran où rien ne se passe. Vous importez un dump MySQL de 15Go et n’avez pas la moindre idée de où il en est. Est ce qu’il ne serait pas génial d’avoir une barre de progreesion qui avance et vous donne l’état d’avencement de l’import ?
categories: [database]
tags: [mysql, shell, shell, devtools]
image: featured-bash-linux.webp
# toc: true
comment: /s/knmp7w/import_sql_avec_barre_de_progression
---

Vous avez un dump sql de 15 Go à remonter sur votre base de données, vous le lancez et pendant de longues minutes vous contemplez quelque chose comme ceci :

```shell
$ zcat data-export.gz | mysql -u measuser -p -h db_host -P 3306 mydatabase
Enter password: 

```

Est-ce que cela fonctionne ? Combien de temps avant la fin ? Est-ce que le terminal à freeze ?

## Pipe View

`pv` est un outil qui permet d’avoir en temps réel l’état d’avancement d’une tache ou d’un flux de données ( https://man7.org/linux/man-pages/man1/pv.1.html ).

Pour l’installer :

```shell
sudo apt install pv
```

## Utilisation

La commande devient alors :

```plain
$ zcat data-export.gz | pv --progress --size $(zcat data-export.gz | wc -c) --name '  Importing.. ' \
    | mysql -u measuser -p -h db_host -P 3306 mydatabase
Enter password: 
  Importing.. [=========>                                                             ] 15%
```

Et voilà ! Une barre de progression qui permet de savoir où en est l’import. 

**Attention :** La commande `$(zcat data-export.gz | wc -c)` qui permet d’avoir le taille en byte du fichier décompressé est longue. Elle lit tout le fichier. Cela peut être intéressant de la sortir pour ne l’exécuter qu’une seule fois.

Le truc est tiré de [stackoverflow](https://unix.stackexchange.com/a/41199).

## Edit 2021-12-20

Dans un [commentaire](https://www.journalduhacker.net/s/knmp7w/import_sql_avec_barre_de_progression#c_2buqhh) **hg** propose cette syntaxe qui laisse `pv` gérer la taille du dump. À tester :

```shell
pv -pret --name ' Importing.. ' data-export.gz | zcat \
    | mysql -u measuser -p -h db_host -P 3306 mydatabase
```
