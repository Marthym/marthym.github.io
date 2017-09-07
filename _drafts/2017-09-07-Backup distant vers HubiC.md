---
layout: post
title: Sauvegarde intelligente sur HubiC (Mise à jour)
excerpt: "Sauvegarder ses données sur un cloud HubiC avec mise à jour des modifications"
tags: [backup,shell,admin,hubic]
comments: true
image:
  feature: backup.png
---

Suite à un changement dans l’agencement de mon stockage de Photos, j’ai mis à jour le script de sauvegarde vers HubiC et comme je sais que mes innombrables lecteurs ne dorment plus en pensant à ce script, je me sens le devoir de vous en faire profiter !

Les modifications donc : 
  * Un découpage en fonction qui rende le script beaucoup plus lisible
  * `gpg --no-secmem-warning` qui retire le warning sur la mémoire
  * La gestion des sous-répertoires par année

Alors bien sur, c’est adapté à ma gestion des Photos, c’est-à-dire :

* yyyy
  - MMdd-Nom de l’album

ou 

* [yyyy-Lieu] Nom de l’album

Bref, c’est plus pour l’inspiration !

## Le script
``` shell
#!/bin/bash

function _sha1sumFile() {
  local bckpDirectory=$1
  echo "${bckpDirectory}/.bkp_sha1sum.lst"
}

function _filename() {
  local toArchiveDirectory=$1;
  #(>&2 echo "echo $toArchiveDirectory | cut -d'/' -f 1,2 | sed \"s/[ \/,.'!?()]//g\"")
  echo "$toArchiveDirectory" | cut -d'/' -f 1,2 | sed "s/[ \/,.'!?()]//g"
}

function _checkDirectorySha1() {
  local bckpDirectory=$1;
  local sha1sumFile=$(_sha1sumFile "$bckpDirectory")
  local toArchiveDirectory=$2;

  #(>&2 echo "echo $toArchiveDirectory | sed -e 's/[][()\.^$?*+]/\\&/g'")
  local safeLine=$(echo "$toArchiveDirectory" | sed -e 's/[][()\.^$?*+]/\\&/g')
  local sha1=$(find "$BACKUP_DIR/$toArchiveDirectory" -type f -print0 | sort -z | xargs -0 shasum | shasum | cut -d' ' -f 1)
  local bkpsha1=$(grep -x -E "[0-9a-f]{40} ${safeLine}" "${sha1sumFile}"  | head -n 1 | cut -d' ' -f 1)
  #(>&2 echo "$sha1 == $bkpsha1")
  echo $sha1
  if [[ -n "$bkpsha1" && ("$sha1" == "$bkpsha1") ]]; then
    # (>&2 echo "${sha1} ${line}")
    return 0
  fi
  # Remove the line with old sha1
  if [[ -n "$bkpsha1" ]]; then
    #(>&2 echo "sed -i \"/${bkpsha1}/d\" \"${sha1sumFile}\"")
    sed -i '' "/${bkpsha1}/d" "${sha1sumFile}"
  fi
  return 1
}
function _createArchive() {
  local bckpDirectory=$1;
  local toArchiveDirectory=$2;
  local passphrase=$3;
  local filename=$(_filename "$toArchiveDirectory")
 # (>&2 echo "tar -P -cjf - ${bckpDirectory}/${toArchiveDirectory} | gpg --batch --yes --passphrase ${passphrase} -ac -o /tmp/${filename}.tar.bz2.gpg")
  tar -C "${bckpDirectory}" -cjpf - "${toArchiveDirectory}" | gpg --no-secmem-warning --batch --yes --passphrase ${passphrase} -ac -o "/tmp/${filename}.tar.bz2.gpg"
  echo "${filename}.tar.bz2.gpg"
  return 0
}
function _uploadArchive() {
  #return 0;
  local hubicpy=./hubic.py
  local toUploadFile=$1;
  $hubicpy --swift -- upload --use-slo --segment-size 15000000 --object-name "Fred/$(basename $BACKUP_DIR)/${toUploadFile}" default /tmp/${toUploadFile};
  if [ $? -eq 0 ]; then
    rm -f /tmp/${toUploadFile};
    return 0
  else
    rm -f /tmp/${toUploadFile};
    $hubicpy --swift -- list default_segments | grep "Fred/$(basename $BACKUP_DIR)/${toUploadFile}" | xargs -I {} sh -c "${hubicpy} --swift delete {}";
    return 1
  fi
}
function _backupDirectory() {
  local bckpDirectory=$1
  local sha1sumFile=$(_sha1sumFile $bckpDirectory)
  local toArchiveDirectory=$2
  local passphrase=$3
  local sha1; sha1=$(_checkDirectorySha1 "$bckpDirectory" "$toArchiveDirectory")
  if [[ $? -ne 0 ]]; then
    archiveName=$(_createArchive "$bckpDirectory" "$toArchiveDirectory" "$passphrase")
    _uploadArchive "$archiveName"
    local isUploaded=$?
    if [[ $isUploaded ]]; then
      echo "${sha1} ${toArchiveDirectory}" >> "${sha1sumFile}"
      echo "CHANGED <- $toArchiveDirectory"
    else
      echo "ERROR   <- $toArchiveDirectory"
    fi
    return $isUploaded
  else
    echo "OK      <- $toArchiveDirectory"
    return 1
  fi
}
function _cleanSha1File() {
  local bckpDirectory=$1
  local sha1sumFile=$(_sha1sumFile $bckpDirectory)
  while IFS='' read -r line || [[ -n "$line" ]]; do
    local filename=$(echo "$line" | cut -d' ' -f 2-)
    if [[ ! -d "$bckpDirectory/$filename" ]]; then
      local sha1=$(echo "$line" | cut -d' ' -f 1)
      sed -i '' '/'$sha1'/d' "${sha1sumFile}"
    fi
  done < "${sha1sumFile}"
}
#------------------------------------------------------------------
# Unzip with "gpg --passphrase secret -d <file> | tar -jxv"
BACKUP_DIR=$2
sha1sumFile=$(_sha1sumFile $BACKUP_DIR)
passphrase=$1
touch ${sha1sumFile}
ls "$BACKUP_DIR" | while read line; do
  if [[ ! -d "$BACKUP_DIR/$line" ]]; then
    continue
  fi
  if [[ ${line:0:1} == "[" ]] ; then
    _backupDirectory "$BACKUP_DIR" "$line" "$passphrase"
  else
    ls "$BACKUP_DIR/$line" | while read event; do
      _backupDirectory "$BACKUP_DIR" "$line/$event" "$passphrase"
    done
  fi
done
_cleanSha1File "$BACKUP_DIR"
```

## Liens
* [Le Gist](https://gist.github.com/Marthym/bbdd8688eaa6e1776a304aabb99099b3)