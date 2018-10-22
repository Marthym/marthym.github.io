---
title: Mettre à jour plusieurs dépôts git
date: "2015-10-10T12:00:00-00:00"
excerpt: "Travailler avec plusieurs dépôts git interconnecté peut s'avérer fastidieux voilà une possibilité pour gérer ça."
modified: "2016-03-21T12:00:00-00:00"
tags: [git, bash, planetlibre]
comments: true
image: git.png
---
Pour tous ceux qui travaillent avec plusieurs dépôts git, voire une multitude, il est parfois très fastidieux de les tenir à jour. Le plus simple est la boucle
`bash` qui fait tous les updates à la suite :

``` bash
find . -type d -depth 1 -exec git --git-dir={}/.git --work-tree=$PWD/{} pull origin master \;
```

C'est déjà bien pratique mais ce n'est pas très clair. C'est très verbeux, on distingue mal les problèmes des mises à jour. Il faut retrouver les dépôts non
mis à jour à cause de fichiers en cours de modification ou à cause d'autres problèmes ... Bref ce n'est pas la solution ultime.

Une recherche sur internet nous propose des quantités des solutions mais rien de simple, clair, facile à mettre en place. Voici donc un script qui fait un
`pull` de tous les dépôts git présent dans le répertoire home de l'utilisateur courant.

``` bash
#!/bin/bash -m

MAX_PROC=10
export SCREEN_COLS=$(tput cols)
export BRANCH_WIDTH=$(expr ${SCREEN_COLS} - 70 - 13)

export NORMAL="\\033[0;39m"
export ROUGE="\\033[1;31m"
export VERT="\\033[1;32m"
export JAUNE="\\033[1;33m"
export PF_NORMAL="\e[0;39m%s\e[m"
export PF_ROUGE="\e[1;31m%s\e[m"
export PF_VERT="\e[1;32m%s\e[m"
export PF_JAUNE="\e[1;33m%s\e[m"

START_TIME=$(date +%s%N | cut -b1-13)

export fifo=$(mktemp -u)
mkfifo $fifo
trap "rm -f $fifo; exit" INT TERM EXIT
echo "\n" >$fifo &

log() {
  ( flock -n 200

    color=$1
    shift
    branchformat="%-${BRANCH_WIDTH}s"
    #"\e[96m"
    if [ "$2" != "master" -a "$2" != "develop" ]; then branchformat="\e[96m%-${BRANCH_WIDTH}s\e[m"; fi
    printf "%-70s $branchformat $color\n" $@

  ) 200>/var/lock/.$(basename "$0").lock
}
log_dirty(){ log $PF_JAUNE $@ "DIRTY"; }
log_updated(){ log $PF_VERT $@ "UPDATED"; }
log_uptodate(){ log $PF_VERT $@ "UP-TO-DATE"; }
log_error(){
  ( flock -n 200
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' =
    printf "%-70s %-${BRANCH_WIDTH}s $PF_ROUGE %s\n" $1 $2 $3;
    echo -e "\n ${4} \n";
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' =
  ) 200>/var/lock/.$(basename "$0").lock
}

update_git_repo() {
  gitdir=$1
  GIT="git --git-dir=$gitdir --work-tree=$(dirname $gitdir)"
  CURRENT_REPO=$($GIT config --get remote.origin.url)
  CURRENT_BRANCH=$($GIT symbolic-ref -q --short HEAD || $GIT describe --tags --exact-match)

  if [[ ! -z $($GIT status --porcelain) ]]; then
    log_dirty $CURRENT_REPO $CURRENT_BRANCH
    return
  fi

  OUTPUT=$($GIT pull 2>&1)
  if [ $? -eq 0 ]; then
    if [[ $OUTPUT != *"Already"* ]]; then
      log_updated $CURRENT_REPO $CURRENT_BRANCH
    fi
  else
    log_error $CURRENT_REPO $CURRENT_BRANCH "ERROR" "--> ${OUTPUT}"
    echo "\t * ${CURRENT_REPO}" >$fifo &
  fi
}

export -f update_git_repo
export -f log
export -f log_dirty
export -f log_error
export -f log_updated
export -f log_uptodate
find -L ~ -maxdepth 5 -path "*.git" -not -path "*zprezto*" -type d 2> /dev/null | xargs --max-proc=$MAX_PROC -n 1 -I {} bash -c "update_git_repo {}"

END_TIME=$(date +%s%N | cut -b1-13)
TIME_MS=$(expr $END_TIME - $START_TIME)
TIME=$(echo print $TIME_MS / 1000. | python)

echo -e "\n"
echo "Updates terminated in $(expr $TIME)s"
echo -e "\n"
ERRORS=$(cat <$fifo)
if [ ! -z "$ERRORS" ]; then
  echo -e "Repository not updated beacause of ${ROUGE}ERRORS${NORMAL} :"
  echo -e "${ROUGE}${ERRORS}${NORMAL}"
fi
```

Ce script donne en sortie une ligne pour chaque dépôt trouvé. Sur chaque ligne on aura l'url du dépôt, la branche courrante et le résultat du pull :

* **UP TO DATE**: pour les dépôts déjà à jour
* **UPDATED**: pour les dépôts mis à jour
* **DIRTY**: pour les dépôts nécessitant un commit
* **ERROR**: pour les dépôts en error. Dans ce cas, l'erreur est affiché en suivant.

A la fin de la procédure un récapitulatif des dépôts en erreur est affiché.

Voilà, j'espère que ça servira à d'autres, je suis ouvert à toutes amélioration.

**EDIT 2016-03-21: Mise à jour du script**<br/>
Limitation du nombre de thread via xargs. Sous les versions récentes de docker le nombre de process fils est limité et le script générait des erreurs de fork.
En limitant le nombre de thread à 5 on évite ce problème sans que la durée totale de la mise à jour n'en soit trop impactée.

``` bash
find -L ~ -maxdepth 5 -path "*.git" -not -path "*zprezto*" -type d 2> /dev/null | \
  xargs --max-proc=$MAX_PROC -n 1 -I {} bash -c "update_git_repo {}"
```
De plus le wait n'est plus nécessiare, c'est `xargs` qui s'en occupe. Par contre il est nécessaire d'exporter toutes les variables et les fonctions.

**EDIT 2016-03-17: Mise à jour du script**<br/>
Amélioration du threading :

* La fonction de log est synchrone pour éviter que plusieurs résultats s'affiche sur la même ligne.
* L'affichage des erreurs est amélioré.
* La synthèse des erreurs en fin de script marche à nouveau.
* Utilisation de `wait` à la place de la boucle pour attendre les fils.

**EDIT 2015-12-11: Mise à jour du script**<br/>
Le scrip est modifié pour être multi-thread, c'est beaucoup plus rapide sur un grande quantité de repos.
