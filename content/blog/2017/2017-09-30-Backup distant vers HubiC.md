---
title: Sauvegarde intelligente sur HubiC (Mise à jour)
date: "2017-09-30T12:00:00-00:00"
excerpt: "Sauvegarder ses données sur un cloud HubiC avec mise à jour des modifications"
categories: [security]
tags: [backup, shell]
image: backup.png
---

Suite à un changement dans l’agencement de mon stockage de Photos, j’ai mis à jour le script de sauvegarde vers HubiC et comme je sais que mes innombrables lecteurs ne dorment plus en pensant à ce script, je me sens le devoir de vous en faire profiter !

Les modifications donc : 
  * Un découpage en fonctions qui rendent le script beaucoup plus lisible
  * `gpg --no-secmem-warning` qui retire le warning sur la mémoire
  * La gestion des sous-répertoires par année
  * Le sha1 des répertoires devient relatif au répertoire de backup
  * L’ajout de logs via un micro framework
  * Le script est maintenant full compatible Debian/FreeBSD

Alors bien sûr, c’est adapté à ma gestion des Photos, c’est-à-dire :

* yyyy
  - MMdd-Nom de l’album

ou 

* [yyyy-Lieu] Nom de l’album

Bref, c’est plus pour l’inspiration !

J’en profite aussi pour parler de cet article vraiment bien, [Shell Script Matter]. C’est en anglais, mais il contient beaucoup de trucs & astuces sympa si vous écrivez des scripts bash.

## Le script
``` shell
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

#/ Usage: ./backup-dir.sh "gpg-passphrase" "backup-directory" 
#/ Description: Compress, crypt and upload each directory to HubiC
#/ Examples: ./backup-dir.sh "xxxxx" "~/photos" 
#/ Options:
#/   --help: Display this help message
usage() { grep '^#/' "$0" | cut -c4- ; exit 0 ; }
expr "$*" : ".*--help" > /dev/null && usage

readonly LOG_FILE="${TMPDIR:-/tmp}/$(basename "$0").log"
info()    { echo -e "[INFO]    $*" | tee -a "$LOG_FILE" >&2 ; }
warning() { echo -e "[WARNING] $*" | tee -a "$LOG_FILE" >&2 ; }
error()   { echo -e "[ERROR]   $*" | tee -a "$LOG_FILE" >&2 ; }
fatal()   { echo -e "[FATAL]   $*" | tee -a "$LOG_FILE" >&2 ; exit 1 ; }

function _sha1sumFile() {
  local bckpDirectory=$1
  echo "${bckpDirectory}/.bkp_sha1sum.lst"
}

function _filename() {
  local toArchiveDirectory=$1;
  echo "$toArchiveDirectory" | cut -d'/' -f 1,2 | sed "s/[ \/,.'!?()]//g"
}

function _checkDirectorySha1() {
  local bckpDirectory=$1;
  local sha1sumFile
  sha1sumFile=$(_sha1sumFile "$bckpDirectory")
  local toArchiveDirectory=$2;

  local safeLine
  safeLine=$(echo "$toArchiveDirectory" | sed -e 's/[][()\.^$?*+]/\\&/g')

  local sha1
  sha1=$(find "$bckpDirectory/$toArchiveDirectory" -type f -print0 | sort -z | xargs -0 shasum | sed -e "s#"${bckpDirectory}/"# #g" | shasum | cut -d' ' -f 1)
  local bkpsha1
  bkpsha1=$(grep -x -E "[0-9a-f]{40} ${safeLine}" "${sha1sumFile}"  | head -n 1 | cut -d' ' -f 1)

  echo "$sha1"
  if [[ -n "$bkpsha1" && ("$sha1" == "$bkpsha1") ]]; then
    echo "OK"
    return 0
  fi

  # Remove the line with old sha1
  if [[ -n "$bkpsha1" ]]; then
    sed -i.bak "/${bkpsha1}/d" "${sha1sumFile}"
    rm -rf "${sha1sumFile}.bak"
  fi

  echo "CHANGED"
  return 0
}

function _createArchive() {
  local bckpDirectory=$1;
  local toArchiveDirectory=$2;
  local passphrase=$3;

  local filename
  filename=$(_filename "$toArchiveDirectory")

  tar -C "${bckpDirectory}" -cjpf - "${toArchiveDirectory}" | gpg --no-secmem-warning --batch --yes --passphrase "${passphrase}" -ac -o "/tmp/${filename}.tar.bz2.gpg"

  echo "${filename}.tar.bz2.gpg"
  return 0
}

function _uploadArchive() {
  #return 0;
  local hubicpy=./hubic.py
  local toUploadFile=$1;

  $hubicpy --swift -- upload --use-slo --segment-size 15000000 --object-name "Fred/$(basename $BACKUP_DIR)/${toUploadFile}" default /tmp/${toUploadFile};
  if [ $? -eq 0 ]; then
    rm -f "/tmp/${toUploadFile}";
    return 0
  else
    rm -f "/tmp/${toUploadFile}";
    $hubicpy --swift -- list default_segments | grep "Fred/$(basename $BACKUP_DIR)/${toUploadFile}" | xargs -I {} sh -c "${hubicpy} --swift delete {}";
    return 1
  fi
}

function _backupDirectory() {
  local bckpDirectory=$1
  local sha1sumFile
  sha1sumFile=$(_sha1sumFile $bckpDirectory)
  local toArchiveDirectory=$2
  local passphrase=$3

  local sha1output; sha1output=$(_checkDirectorySha1 "$bckpDirectory" "$toArchiveDirectory")
  local sha1lines; sha1lines=($sha1output)
  local sha1; sha1=${sha1lines[0]}
  local sha1state; sha1state=${sha1lines[1]}

  if [[ $sha1state == "CHANGED" ]]; then
    info "Create archive for ${toArchiveDirectory}..."
    archiveName=$(_createArchive "$bckpDirectory" "$toArchiveDirectory" "$passphrase")
    info "Upload archive ${archiveName}..."
    _uploadArchive "$archiveName"
    local isUploaded=$?

    if [[ $isUploaded ]]; then
      echo "${sha1} ${toArchiveDirectory}" >> "${sha1sumFile}"
      warning "\u2713 $toArchiveDirectory"
    else
      error "\u274c $toArchiveDirectory"
    fi

    return $isUploaded
  else
    info "\u2713 $toArchiveDirectory"
    return 0
  fi
}

function _cleanSha1File() {
  local bckpDirectory=$1
  local sha1sumFile
  sha1sumFile=$(_sha1sumFile "$bckpDirectory")

  while IFS='' read -r line || [[ -n "$line" ]]; do
    local filename
    filename=$(echo "$line" | cut -d' ' -f 2-)

    if [[ ! -d "$bckpDirectory/$filename" ]]; then
      local sha1
      sha1=$(echo "$line" | cut -d' ' -f 1)
      sed -i.bak '/'"$sha1"'/d' "${sha1sumFile}"
      rm -rf "${sha1sumFile}.bak"
    fi
  done < "${sha1sumFile}"

  rm -rf "/tmp/*.gpg"
}

if [[ "${BASH_SOURCE[0]}" = "$0" ]]; then

    passphrase=$1
    BACKUP_DIR=$2

    trap "_cleanSha1File '$BACKUP_DIR'" EXIT
    sha1sumFile=$(_sha1sumFile "$BACKUP_DIR")

    touch "${sha1sumFile}"
    ls "$BACKUP_DIR" | while read line; do

      if [[ ! -d "$BACKUP_DIR/$line" ]]; then
        continue
      fi

      if [[ $line =~ ^[\\[_].* ]] ; then

        _backupDirectory "$BACKUP_DIR" "$line" "$passphrase"

      else
        ls "$BACKUP_DIR/$line" | while read event; do
          _backupDirectory "$BACKUP_DIR" "$line/$event" "$passphrase"
        done
      fi

    done
fi
```

## Liens
* [Shell Script Matter][] (en)
* [Le Gist][]

[Shell Script Matter]: https://dev.to/thiht/shell-scripts-matter
[Le Gist]: https://gist.github.com/Marthym/bbdd8688eaa6e1776a304aabb99099b3
