---
layout: post
title: Github release avec Travis CI
excerpt: "Automatiser le processus de release sur Github avec Travis CI"
#modified: 2015-09-21
tags: [tools, travis, github, planetlibre]
comments: true
image:
  feature: travis-github.png
---
## Introduction
Vous développez un projet Open Source que vous hébergez chez Github et vous utilisez Travis CI pour le builder
automatiquement. C'est sympa ça fait le job mais reste une étape un peu fastidieuse, la release de votre projet. Travis
peu faire ça pour vous.

Plusieurs sites en parlent mais beaucoup sont obsolète et la plus part donnent un bout de configuration Travis sans plus
d'information.

## Cas pratique
Dans l'exemple que l'on va voir j'ai traité mon CV comme un programme. Il est écrit en LaTeX et nécessite donc d'être
compilé et buildé. Puis, au lieu d'un *.jar* ou d'un *.tgz*, c'est le PDF resultant qui est releasé. La partie
compilation est particulière mais c'est la partie release qui nous intéresse ici et qui sera la même quelque soit le
type de d'application à produire.

Voilà donc le bout de configuration que j'ai rajouté dans le `.travis.yml` :

## Question de sécurité
La première question est se poser est celle de la sécurité. En effet on va donner à Travis le droit de modifier des
choses dans notre compte github. Sachant que tout est en open source et donc lisible par n'importe qui c'est un peu
flippant.

Pour cela travis offre la possibilité des crypter des informations dans les fichiers `.travis.yml`. Seul ce dernier sera
alors capable de lire ces informations. Le cryptage est fait via un mécanisme de clés privée/publique. Pour crypter
les informations il faudra installer [travis-client](https://github.com/travis-ci/travis.rb#installation), c'est lui
qui a la clé publique et qui permettra d'encoder le accès à github. Mais ce système permet d'encodé tout ce que vous
voulez faire passer à vos scripts de build. Les informations encrypté sont alors accessible en tant que variables
d'environnement dans vos scripts.

Ensuite si Travis se fait voler sa clé privée ou que quelqu'un y a accès, c'est un risque à considérer. Pour limiter
les dégats, il est fortement recommandé de créer un compte github spécialement pour ça. Ce compte aura des accès limités
au minimun nécessaire pour releaser dans le repos en question. Ca évitera qu'un éventuel attaquand est le plein accès
a tout vos repos.

### Pré-requis Installation
Le client travis s'installe facilement (sous Debian) :

```bash
apt-get install ca-certificates
apt-get install ruby ruby-dev build-essential
gem install travis --no-rdoc --no-ri
```

## La version rapide
En effet, une commande va permettre de configurer le process de release rapidement. Pour cela il faut se mettre dans
le répertoire de sont projet, où se trouve le `.travis.yml` et taper :

``` bash
travis setup releases
```
&rArr; [Documentation Travis](https://docs.travis-ci.com/user/deployment/releases/)

## Configurer le projet à la main
Ce que fait le commande c'est ajouter ceci à votre fichier `travis.yml`

```yaml
deploy:
  - provider: releases
    api_key:
      secure: <cle_github>
    file: mon-cv.pdf
    skip_cleanup: true
    on:
      repo: <votre_repo_github>
```

### Création de l'API Key Secure
Le plus compliqué c'est la partie `api_key.secure`. Ce que fait le client travis c'est de créer sur votre compte Github
(celui créé pour l'occasion) un "Personnal access token" avec le scope "public_repo". Puis il prend le token généré
(qui ressemble à ça `442a8535d2071f98c83bb3bef862312d58a72ee8`) et l'encrypte.

``` bash
travis encrypt "442a8535d2071f98c83bb3bef862312d58a72ee8" -r <repo/name>
```

Il est possible d'omettre le repo name si vous être dans le répertoire du repo en question. Le résultat donne la ligne
secure :

```
secure: "KZFkBvpo+K6d0UfYa5Xpgmn4MfrNpFCOzjNbXpX682eRurJrbL+OxfwDmR0dyBFkcEKMgBoUX3YCnXQnzLHIb4fFWUx2K+sfdvvMZwse2rbDnQeM2P8peyYSXer52fuORPzMin0vnCem12t7sNIbi/0oSOUsVOTEUZSsNJoPZYo="
```

## Options intéressantes
Comme expliqué plus haut, j'ai traité mon CV comme un programme développé en LaTeX. Mais LaTeX à installer c'est un peu
l'usine. Si je ne suis pas sur mon PC et que je veux faire une retouche rapide c'est compliqué.

Par chance Travis vient à mon secours, c'est lui qui va compilé le CV et me retourner le PDF sous forme d'une release
draft. Voilà mon `travis.yml` visible sur [mon github](https://github.com/Marthym/curriculum-vitae/blob/master/.travis.yml)

```yaml
deploy:
  - provider: releases
    api_key:
      secure: DgG2D29uPVbTLAfD3cte6hGT35CppoaNv56PENgvrHpfAIFWhxsjLy9x/qvEGXSPYA6bHpOIIrjT4cwBHZN7HxPsrtL+xuXCZYCP1G6XT8RteHAtCterOvvtLtihe2iW6PLxCgCR8etDpxKnE4s0/Jwt+s0eNm73Q7FsolN3aSk=
    file: mon-cv.pdf
    skip_cleanup: true
    draft: true
    on:
      repo: Marthym/curriculum-vitae

  - provider: releases
    api_key:
      secure: DgG2D29uPVbTLAfD3cte6hGT35CppoaNv56PENgvrHpfAIFWhxsjLy9x/qvEGXSPYA6bHpOIIrjT4cwBHZN7HxPsrtL+xuXCZYCP1G6XT8RteHAtCterOvvtLtihe2iW6PLxCgCR8etDpxKnE4s0/Jwt+s0eNm73Q7FsolN3aSk=
    file: mon-cv.pdf
    skip_cleanup: true
    on:
      tags: true
      repo: Marthym/curriculum-vitae
```

La section `on` permet de mettre des condition à la release. Et il est possible de préciser plusieurs configuration de
release avec des conditions différente. L'option `draft` permet de générer des draft de release, c'est un peu moins
et ça ne génère pas de tag sur la branche.

Le premier bloc demande donc une draft release à chaque fois qu'un commit est possé sur la branche. Ca me permet par
exemple de controlé que les modifications que je fais sont bonnes. Puis quand tout est bon, il suffit de tagger la
branche et de pousser. Grâce à la conditions `tags:true` de la deuxième configuration, Travis va me faire une vrai
release au lieu d'un draft.


## Liens
 * [Documentation Travis CI](https://docs.travis-ci.com/user/encryption-keys/)
