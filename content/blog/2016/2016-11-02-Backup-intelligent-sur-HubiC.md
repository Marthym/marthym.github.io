---
title: Sauvegarde intelligente sur HubiC
date: "2016-11-02T12:00:00-00:00"
excerpt: "Sauvegarder ses données sur un cloud HubiC avec mise à jour des modifications"
tags: [backup,shell,admin,planetlibre,hubic]
image: backup.png
---

## Introduction
Il y a pas loin d'une année je publiais un script bash permettant de faire des [backups distants sur HubiC]({{% relref "/blog/2015/2015-09-18-Backup-distant-sur-HubiC" %}}) (complets & incrémentaux) de toutes vos données. Un an et un changement de connexion ADSL plus tard, ce script n'est pas vraiment viable. En effet, je suis passé d'une fibre optique à une connexion ADSL avec une forte atténuation. Pour transférer mes données complète ça prend pas loin d'une journée ...

J'ai donc changé le script pour pallier ce problème. L'idée est toujours de sauvegarder mes données mais au lieu d'un ubert tar découpé que je transfère une fois par semaine, je suis parti sur une sauvegarde par sous-répertoire et un transfert des modifications uniquement.

## Explications
On a un script qui prend en entrée la passphrase et le répertoire à sauvegarder.

* Pour le répertoire, on liste les sous-répertoires et pour chacun on génère un sha1 qui va permettre de savoir si le répertoire a été modifié ou non depuis la dernière analyse. 
* Pour chaque répertoire, on crée un tar.gz que l'on crypte en GPG et que l'on envoie sur hubic. Cette partie la ne diffère pas de la version précédente du script.
* Enfin, on stocke le nom du répertoire et le sha1 dans un fichier `.bkp_sha1sum.lst` dans le répertoire principal.

De cette façon le script est capable de détecter les répertoires qui ont changé et ne transfère que les répertoires modifiés. Alors certes si le répertoire à sauvegardé est un gros répertoire fourre tout ce script aide pas. La version précédent est plus adaptée. Mais dans le cas par exemple d'un répertoire `Photos` trié par année ou par évènement, où l'année passée ne bougera plus jamais, ce script est nettement plus efficace.

## Le script
``` shell
#!/usr/local/bin/bash

BACKUP_DIR=$2
hubicpy=./hubic.py
sha1sumFile="${BACKUP_DIR}/.bkp_sha1sum.lst"
passphrase=$1

touch "${sha1sumFile}"
ls "$BACKUP_DIR" | while read line; do

  if [[ ! -d "$BACKUP_DIR/$line" ]]; then
    continue
  fi

  filename=$(echo $line | cut -d'/' -f 1,2 | sed "s/[ \/,.'!?()]//g")
  safeLine=$(echo $line | sed -e 's/[][()\.^$?*+]/\\&/g')
  sha1=$(find "$BACKUP_DIR/$line" -type f -print0 | sort -z | xargs -0 shasum | shasum | cut -d' ' -f 1)
  bkpsha1=$(grep -x -E "[0-9a-f]{40} ${safeLine}" "${sha1sumFile}"  | head -n 1 | cut -d' ' -f 1)
  
  if [[ -n "$bkpsha1" && ("$sha1" == "$bkpsha1") ]]; then
    echo "${sha1} ${line}"
    continue
  fi
  # Remove the line with old sha1
  if [[ -n "$bkpsha1" ]]; then
    echo "/${bkpsha1}/d -> ${sha1sumFile}"
    sed -i '' "/${bkpsha1}/d" "${sha1sumFile}"
  fi
  tar -P -czf - "${BACKUP_DIR}/${line}" | gpg --batch --yes --passphrase ${passphrase} -ac -o "/tmp/${filename}.tar.gz.gpg"
  $hubicpy --swift -- upload --use-slo --segment-size 15000000 --object-name "backup/$(basename $BACKUP_DIR)/${filename}.tar.gz.gpg" default /tmp/${filename}.tar.gz.gpg
  if [ $? -eq 0 ]; then
    echo "${sha1} ${line}"
    echo "${sha1} ${line}" >> "${sha1sumFile}"
  else
    $hubicpy --swift -- list default_segments | grep "backup/$(basename $BACKUP_DIR)/${filename}.tar.gz.gpg" | xargs -I {} sh -c "${hubicpy} --swift delete {}"
    exit 1
  fi
  rm -f /tmp/${filename}.tar.gz.gpg
done
# Clean the sha1 file
while IFS='' read -r line || [[ -n "$line" ]]; do
  filename=$(echo $line | cut -d' ' -f 2-)
  if [[ ! -d "$BACKUP_DIR/$filename" ]]; then
    sha1=$(echo $line | cut -d' ' -f 1)
    sed -i '/'$sha1'/d' "${sha1sumFile}"
  fi
done < "${sha1sumFile}"
```
