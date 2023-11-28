---
title: GitLab-CI + Docker Hub
date: "2017-04-21T12:00:00-00:00"
excerpt: "Automatisation de build rapide et facile avec GitLab-CI + Docker"
#modified: 2015-09-21
categories: [development]
tags: [devtools, docker, gitlab, git, latex]
image: back.webp
---
Il n'y a pas loin d’un an, j’ai décrit sur l’une des nombreuses manières d’automatiser une release grâce à Github et Travis CI.

Depuis, les nouvelles versions de Gitlag intègre des fonctionnalités d’intégration continue. Couplé avec des services comme [Framagit](https://git.framasoft.org/) qui permettent d’avoir des repos git privé, ça permet d’avoir gratuitement accès à une infrastructure d’intégration continue gratuite pour toutes sortes de projets personnels.

Je prends pour exemple un projet perso en latex [SW-Redemption](https://git.framasoft.org/sw-redemption/jdrp-sw-redemption) pour vous montrer ce qu’il est possible de faire avec gitlab-ci.

## Configuration de gitlab-ci

Un peu comme pour travis qui lit un fichier `.travis.yml`, gitlab-ci utilise un fichier `.gitlab-ci.yml` (super original). Mais contrairement à celui de travis, il est vraiment plus simple, en tout cas à fonctionnalités égales. Toute la config est détaillée [ici](https://docs.gitlab.com/ce/ci/yaml/) (en anglais).

Voilà ce que j’ai dans mon fichier

```yaml
before_script:
  - apt-get update -qq && apt-get install -y -qq texlive-base texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-extra-utils texlive-fonts-recommended texlive-font-utils texlive-lang-french texlive-math-extra texlive-pictures latex-xcolor texlive-bibtex-extra pgf lmodern biber latexmk ghostscript

swr-SNAPSHOT:
  stage: build
  script:
    - latexmk -f -r swr-class/latexmkrc || true
    - mv "build/swr-livre-joueur.pdf" "build/SW-Redemption, Livre du joueur.pdf"

  artifacts:
    expire_in: 1 day
    paths:
    - "build/SW-Redemption, Livre du joueur.pdf"
  allow_failure: true

```

* `before_script` C’est tout ce dont j’ai besoin pour construire mes pdf à partir de latex. Comme le addon.apt dans le fichier travis
* `swr-SNAPSHOT` C’est le nom du build
  - `script` les scripts à lancer pour le build
  - `artefact` Les fichiers du build à publier

Déjà à ce niveau, on voit que l’on crée l’artefact et que l’on a pas à se compliquer la vie avec les clé de connexion au repo. Rien que ça c’est appréciable. Après certes les fonctionnalités de release de Gitlab sont pas les mêmes que celles de Github mais ça fait bien le job.

Bref, la killer feature c’est ça :

```yaml
image: marthym/latex:1.0.0

swr-SNAPSHOT:
  stage: build
  script:
    - latexmk -f -r swr-class/latexmkrc || true
    - mv "build/swr-livre-joueur.pdf" "build/SW-Redemption, Livre du joueur.pdf"

  artifacts:
    expire_in: 1 day
    paths:
    - "build/SW-Redemption, Livre du joueur.pdf"
  allow_failure: true

```

Il est possible d’utiliser des images Docker, présentent sur [DockerHub](https://hub.docker.com/r/marthym/latex/). Et ça permet de ne plus avoir à faire les installations pre-build, particulièrement longue pour LaTeX. En plus ça permet aussi de tester le build depuis votre machine dans le container Docker. Pas besoin de committer dix fois pour trouver ce qui ne s’est pas bien installé sur l’image de Travis. Grace à cette fonctionnalité, on connaît exactement la version du système qui lance le build et si l’on utilise des packages en version récente, pas de soucis.

En bref c’est top.

Vous pouvez comparez le [gitlab-ci](https://git.framasoft.org/sw-redemption/jdrp-sw-redemption/blob/master/.gitlab-ci.yml) et le [travis-ci](https://git.framasoft.org/sw-redemption/jdrp-sw-redemption/blob/master/.travis.yml) du projet en question.

## Création de l’image Docker

Je fais un paragraphe rapide, c’est pas le but du post.

En gros, il faut se créer son Dockerfile et le pousser sur Github, vous trouverez le mien [là](https://github.com/Marthym/docker/tree/master/latex). Ensuite vous créez un compte sur DockerHub. Puis vous allez dans "Create" >> "Create Automated build" et vous choisissez Github. Le reste est assez clair et simple.

Ensuite chaque fois que vous poussez sur Github, ça builde le docker. Une fois builder, il est disponible pour Gitlab-ci.