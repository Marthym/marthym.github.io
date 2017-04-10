---
layout: post
title: GitLab-CI + Docker Hub
excerpt: "Automatisation de build rapide et facile avec GitLab-CI + Docker"
#modified: 2015-09-21
tags: [tools, docker, gitlab, framasoft, git, latex, planetlibre]
comments: true
image:
  feature: travis-github.png
---
Il y a pas loin d’un an, j’ai décrit sur l’une des nombreuses manière d’automatiser une release grace à Github et Travis CI.

Depuis, les nouvelles version de Gitlag intègre des fonctionnalité d’intégration continue. Couplé avec des services comme [Framagit](https://git.framasoft.org/) qui permettent d’avoir des repos git privé, ça permet d’avoir gratuitement accès à une infrastruture d’intégration continue gratuite pour toutes sortes de projets personnels.

Je prends pour exemple une projet perso en latex [SW-Redemption](https://git.framasoft.org/sw-redemption/jdrp-sw-redemption) pour vous montrer ce qu’il est possible de faire avec gitlab-ci.

## Configuration de gitlab-ci
Un peu comme pour travis qui lit un fichier `.travis.yml`, gitlab-ci utilise un fichier `.gitlab-ci.yml` (super original). Il est vraiment pas très compliqué à configurer. Perso j’ai trouvé ça beaucoup plus simple que pour travis. Toute le config est détaillée [ici](https://docs.gitlab.com/ce/ci/yaml/) (en anglais).

Voilà ce que j’ai dans mon fichier
```yaml
before_script:
  - apt-get update -qq && apt-get install -y -qq texlive-base texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-extra-utils texlive-fonts-recommended texlive-font-utils texlive-lang-french texlive-math-extra texlive-pictures latex-xcolor texlive-bibtex-extra pgf lmodern biber latexmk ghostscript

dos-au-muur:
  stage: build
  script:
    - latexmk dos-au-muur/dos-au-muur.tex || true
    - mv "dos-au-muur/dos-au-muur.pdf" "dos-au-muur/SWR-Dos au Muur.pdf"
  artifacts:
    paths:
    - "dos-au-muur/SWR-Dos au Muur.pdf"
  allow_failure: true

```

* `before_script` C’est tout ce dont j’ai besoin pour construire mes pdf à partir de latex.
* 