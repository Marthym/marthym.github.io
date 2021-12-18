---
title: LaTeX, L'éditeur qui va bien
date: "2016-12-08T12:00:00-00:00"
excerpt: "L'éditeur LaTeX avec aperçu instantané, pas trop lourd et qui fonctionne bien"
#modified: 2015-09-21
tags: [latex, latexmk, gv, pdf, planetlibre]
image: back.webp
---

## L'histoire

Dans un [précédent billet]({{% relref "/blog/2016/2016-05-11-Github release avec Travis" %}}), j'expliquais comment j'avais publié mon CV LaTeX sur GitHub. C'était ma première expérience LaTeX et quand on connaît pas et qu'on apprend, on a besoin de voir ce que l'on fait en temps réel. Je modifie une ligne, ça change le PDF généré, ... Je m'étais alors tourné vers [Gummy](https://github.com/alexandervdm/gummi). Léger, pratique, pour les deux pages de mon CV c'est très bien. Mais déjà il y avait quelques points gênant comme un affichage pas toujours fidèle à mon PDF de sortie.

Et puis dernièrement j'ai commencé un projet demandant la rédaction d'un PDF assez conséquent. D'expérience, World/OpenOffice n'ont pas la qualité de rendu que j'espère et la gestion du volume et de la présentation avec ces deux solutions est bien trop couteuse. Je suis donc naturellement reparti sur LaTeX en me disant en plus que ça sera l'occasion d'en apprendre un peu plus.

Partant pour un document important avec beaucoup de chapitres et de section, j'ai dès le début structuré le projet en répertoires sous répertoires pour ne pas me retrouver avec des fichiers texte de 10 Mo. Et c'est là que les ennuis commencent, Gummi a beaucoup de mal à gérer les structures de répertoire hiérarchiques et les compilations successives.

## Trouver un éditeur LaTeX qui va bien

J'ai donc cherché un éditeur LaTeX qui correspond mieux à mon besoin. Déjà, y a pas foule... En dehors Gummi et [TexMaker](http://www.xm1math.net/texmaker/index_fr.html) ça ne se bouscule pas. Je suis sous Debian Gnome, je n'ai pas envie d'installer toutes les lib de KDE ou qt pour que ça fonctionne. Et je veux quelque chose de léger, parce que j'ai déjà mis les 1.5 Go que demande LaTeX et j'ai envie de beaucoup plus.

J'allais lâcher l'affaire et me débrouiller à la ligne de commande quand je tombe sur l'option `-pvc` de [latexmk](http://personal.psu.edu/jcc8//software/latexmk-jcc/latexmk-304.txt).

## Latexmk

Bon le but n'est pas de faire la promotion de `latexmk` surtout que j'imagine que d'autre personnes préfèreront d'autres outils. Je vais juste présenter ce qui est pour moi le meilleur éditeur LaTeX, les problèmes que j'ai eus et les solutions trouvées.

### Structure du projet

Prenons un projet structuré comme suit :

* monprojet
  * build
  * chapitres
    * 01
    * 02
    * ...
  * images
  * fonts
  * monprojet.tex
  * latexmkrc

### Configuration du build

Voici mon fichier `latexmkrc` :

```conf
$pdf_mode = "1";
$out_dir="build";
$pdflatex = "xelatex %O %S";
```

* **$pdf_mode** indique que l'on veut un pdf en sortie
* **$out_dir** demande à ce que les fichiers généré soient placé dans build, C'est plus pratique pour le `.gitignore`
* **$pdflatex** redéfinit la commande car j'utilise `xelatex` pour tout les avantages qu'il apporte

Le fichier `monprojet.tex` lui inclue les chapitres :

```tex
\include{chapitres/01/section01.tex}
\include{chapitres/02/section01.tex}
```

A ce stade on a déjà une compilation qui fonctionne à condition que l'arborescence des chapitres existe bien dans build. C'est un problème que j'ai rencontré et qui est assez contraignant, quand on supprime le répertoire build, la compilation échoue car elle ne trouve pas les fichiers intermédiaires. C'est dû au fait que latexmk ou xelatex ne crée pas les répertoires dans le out_dir.

Heureusement ce problème n'est pas trop compliqué à régler en ajoutant la création de ces répertoires dans le `latexmkrc`:

```conf
$pdf_mode = "1";
$out_dir="build";
$pdflatex = "find chapitres -type d ! -path './.git*' -exec mkdir -p $out_dir/{} \\; && xelatex %O %S";
```

C'est un peu barbare mais ça fonctionne. Et cette fois, on a une compilation sans échec.

## Visualisation instantanée

Jusque-là c'est un peu facile m'enfin on n'a pas un éditeur ni rien qui y ressemble ! La fonctionnalité surtout recherchée (dans mon cas) étant l'aperçu instantané de ce que j'écris. Et c'est là qu'intervient l'option `-pvc`. Cette option permet de scruter le répertoire et de relancer la compilation chaque fois qu'une modification est repérée dans les fichiers. Et `latexmk` est suffisemment malin pour ne pas tout recompiler mais seulement ce qui a changé.

Néanmoins, cette option n'a d'intérêt que si elle est associée à un visualiseur de PDF capable de rafraichir l'affichage quand le PDF change. J'ai testé avec Evince mais c'est plutôt décevant, ça rame et Evince à tendance à frizzer lors des changements de page dès que le PDF prend une dizaine de pages. Mais `gv` lui répond très bien ! L'interface est spartiate et rebutante mais pour un aperçu c'est largement suffisant.

Enfin, pour lier tout ça, on va modifier le `latexmkrc` comme suit :

```conf
$pdf_mode = "1";
$out_dir="build";
$pdflatex = "find chapitres -type d ! -path './.git*' -exec mkdir -p $out_dir/{} \\; && xelatex %O %S";
$pdf_previewer  = 'gv --watch';
```

ce qui a pour effet de compiler le document puis de lancer automatiquement `gv` avec les bons paramètres.

Pour finir il ne vous reste plus qu'à choisir l'éditeur de texte qui vous plaît, je fais avec [Sublime Text 3](https://www.sublimetext.com/3), mais il y en a d'autres plus "Libre" je suppose.

## Problème d'erreur

Un problème que j'ai eu avec cette configuration c'est que si je fais une erreur dans mon fichier tex, la compilation continue s'arrête et il faut la relancer une fois l'erreur corrigée. Pour pallier ce problème, on peut rajouter l'option `-interaction=nonstopmode` dans le fichier `latexmkrc`

```conf
$pdf_mode = "1";
$out_dir="build";
$pdflatex = "find chapitres -type d ! -path './.git*' -exec mkdir -p $out_dir/{} \\; && xelatex %O -interaction=nonstopmode %S";
$pdf_previewer  = 'gv --watch';
```

