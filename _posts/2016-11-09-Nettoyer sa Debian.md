---
layout: post
title: Nettoyer sa Debian
excerpt: "Après quelques années d'utilisation, même un système Linux peut s'encrasser. Voyons comment on peut le nettoyer et ainsi regagner de l'espace disque."
modified: 2016-11-02
tags: [planetlibre,debian,admin,apt,linux,docker]
comments: true
image:
  feature: debian.png
---
{% include _toc.html %}<!--_-->
Même si ce n'est pas dans les proportions de Windows, un Linux a tendance à accumuler des reliquats de vieux paquets et du cache pas vraiment utile qui a la longue pèsent lourd sur l'espace disque (ça ne ralenti pas le système pour autant). Voyons quelques pistes pour récupérer cet espace et rafraichir un peu le disque.

Donc histoire de faire le 20ième article sur le sujet (je fais même pas l'effort de lui trouver un nom original), voilà quelques pistes pour retrouver un peu d'espace sur vos disques durs.

## Nettoyer les fichiers de conf obsolète
C'est un article que j'avais publié il n'y a pas longtemps qui est en relation directe : <br/>
[Nettoyer les configuration obsoletes debian]({% post_url 2016-07-01-Nettoyer les configuration obsoletes debian %})

## Localepurge
C'est la première chose à faire, ''localepurge'' est un outil qui a chaque install de paquet ou de mise à jour, va faire le ménage dans les langues installées.
Sa première utilisation va potentiellement faire gagner pas mal de place.

``` shell
apt install localepurge
localepurge
```

Cette opération ne se fait qu'une fois, par la suite `localepurge` se lance automatiquement avec `apt`.

## Le nettoyage régulier

### Les symptomes

Si on lance la commande suivante

``` shell
du -hs /var/cache/apt/archives
728M /var/cache/apt/archives
```

On constate que le cache des paquets prend une place significative au sein du système pour une utilité très réduite.

### La solution
Cette suite de commandes va permettre d'effectuer un nettoyage rapide des caches d'apt sans risque d'endommager le système :

``` sh
apt-get autoclean
apt-get clean
apt-get autoremove
```

La première commande supprimera tous les paquets .deb présents dans le cache dont une version plus récente est installée, la deuxième supprime tous les paquets
du cache, et non pas seulement ceux obsolètes comme la commande précédente, enfin la troisième commande supprime les dépendances qui ne sont plus nécessaires.

Si vous faites un `du` par la suite vous verrez le gain de place.

## Gagner encore de la place

Si cela n'a pas suffi, voici encore quelques façons de gratter un peu de place.

  * **Nettoyer /var/tmp** ce dernier contient des fichiers ... temporaires non effacé
  * **Nettoyer /var/log** qui contient les log du système
  * **Nettoyer ~/.thumbnails** qui contient tout les aperçus des fichiers de Nautilus

### Nettoyer les kernels

Lors des mises à jour de kernel, les anciens kernel sont conservés afin de pouvoir y revenir en cas de problème.
Il est possible de désinstaller les anciens kernel ainsi que tout ce qui leur est associé (header, src, ...) via apt-get.

La commande suivante vous permet de connaître le kernel actuellement utilisé

``` shell
uname -r
4.7.0-1-amd64
```

Celle pour les kernels installés :

``` shell
dpkg --list 'linux-image*'
```

<pre class="console">
Souhait=inconnU/Installé/suppRimé/Purgé/H=à garder
| État=Non/Installé/fichier-Config/dépaqUeté/échec-conFig/H=semi-installé/W=attend-traitement-déclenchements
|/ Err?=(aucune)/besoin Réinstallation (État,Err: majuscule=mauvais)
||/ Nom                                  Version                Architecture    Description
+++-====================================-======================-===============-=====================================
rc  linux-image-3.16.0-4-amd64           3.16.7-ckt11-1+deb8u3  amd64           Linux 3.16 for 64-bit PCs
rc  linux-image-4.0.0-2-amd64            4.0.8-2                amd64           Linux 4.0 for 64-bit PCs
rc  linux-image-4.1.0-1-amd64            4.1.3-1                amd64           Linux 4.1 for 64-bit PCs
rc  linux-image-4.2.0-1-amd64            4.2.6-3                amd64           Linux 4.2 for 64-bit PCs
rc  linux-image-4.3.0-1-amd64            4.3.5-1                amd64           Linux 4.3 for 64-bit PCs
rc  linux-image-4.4.0-1-amd64            4.4.6-1                amd64           Linux 4.4 for 64-bit PCs
rc  linux-image-4.5.0-1-amd64            4.5.1-1                amd64           Linux 4.5 for 64-bit PCs
rc  linux-image-4.5.0-2-amd64            4.5.5-1                amd64           Linux 4.5 for 64-bit PCs
ii  linux-image-4.6.0-1-amd64            4.6.4-1                amd64           Linux 4.6 for 64-bit PCs
ii  linux-image-4.7.0-1-amd64            4.7.8-1                amd64           Linux 4.7 for 64-bit PCs (signed)
un  linux-image-4.7.0-1-amd64-unsigned   aucune                 aucune          (aucune description n'est disponible)
ii  linux-image-amd64                    4.7+75                 amd64           Linux for 64-bit PCs (meta-package)

</pre>

Les "**ii**" sont les packages installés, pour supprimer ceux qui ne sont plus utilisés, dans l'exemple suivant c'est le **4.6.0-1-amd64** :

``` shell
apt purge linux-image-4.6.0-1-amd64 linux-headers-4.6.0-1*
```

**ATTENTION Cette commande est à utiliser avec beaucoup de parcimonie, c'est irréversible et ça casse la VM ou le PC définitivement !**

### Trouver les gros fichiers
Un ligne de commande bien pratique pour ça :

``` bash
du -hms /* | sort -nr | head
```

Ca ne donne que le premier niveau de hiérarchie, il faudra relancer la commande pour affiner le recherche par sous-dossier.

## Docker
Allez, tant que j'y suis, quelques pistes de nettoyage autour de [Docker](https://www.docker.com/).

### Nettoyage du repo local
Les 3 commandes pour supprimer les vieux containeurs et vielles images :

``` bash
docker rm -v $(docker ps -a -q)
docker rmi $(docker images | grep '^<none>' | awk '{print $3}')
docker rmi $(docker images | grep 'months ago' | awk '{print $3}')
```

1. on supprime les containers non démarrés (attention à cette commande du coup). Remarquer le `-v` qui évite de se trouver avec des volumes orphelins.
2. on supprime les images non tagguées
3. on supprime les images vieilles de plusieurs mois

Chez nous ces trois commandes sont placées dans un cron weekly sur toutes les machines qui utilisent Docker.

### Supprimer les layers orphelins dans un registry docker
Enfin, un petit script bien pratique, notez que selon les versions du registry ce script n'est pas forcément nécessaire mais ça fait pas de mal de le connaitre.

``` bash
#!/bin/bash

set -eu
shopt -s nullglob

readonly base_dir=/var/lib/docker/registry
readonly output_dir=$(mktemp -d -t trace-images-XXXX)
readonly jq=/usr/bin/jq

readonly repository_dir=$base_dir/repositories
readonly image_dir=$base_dir/images

readonly all_images=$output_dir/all
readonly used_images=$output_dir/used
readonly unused_images=$output_dir/unused

function info() {
    echo -e "\nArtifacts available in $output_dir"
}
trap info EXIT ERR INT

function image_history() {
    local readonly image_hash=$1
    $jq '.[]' $image_dir/$image_hash/ancestry | tr -d  '"'
}

echo "Collecting orphan images"
for library in $repository_dir/*; do
    echo "Library $(basename $library)" >&2

    for repo in $library/*; do
        echo " Repo $(basename $repo)" >&2

        for tag in $repo/tag_*; do
            echo "  Tag $(basename $tag)" >&2

            tagged_image=$(cat $tag)
            image_history $tagged_image
        done
    done
done | sort | uniq > $used_images

ls $image_dir > $all_images

grep -v -F -f $used_images $all_images > $unused_images

readonly all_image_count=$(wc -l $all_images | awk '{print $1}')
readonly used_image_count=$(wc -l $used_images | awk '{print $1}')
readonly unused_image_count=$(wc -l $unused_images | awk '{print $1}')
readonly unused_image_size=$(cd $image_dir; du -hc $(cat $unused_images) | tail -n1 | cut -f1)

echo "${all_image_count} images, ${used_image_count} used, ${unused_image_count} unused"
echo "Unused images consume ${unused_image_size}"

echo -e "\nTrimming _index_images..."
readonly unused_images_quoted=$output_dir/unused.flatten
cat $unused_images | sed -e 's/\(.*\)/\"\1\" /' > $unused_images_quoted

for library in $repository_dir/*; do
    echo "Library $(basename $library)" >&2

    for repo in $library/*; do
        echo " Repo $(basename $repo)" >&2
        mkdir -p "$output_dir/$(basename $repo)"
        jq '.' "$repo/_index_images" > "$output_dir/$(basename $repo)/_index_images.old"
        jq -s '.[0] - [ .[1:][] | {id: .} ]' "$repo/_index_images" $unused_images_quoted > "$output_dir/$(basename $repo)/_index_images"
        cp "$output_dir/$(basename $repo)/_index_images" "$repo/_index_images"
    done
done

echo -e "\nRemoving images"
cat $unused_images | xargs -I{} rm -rf $image_dir/{}
```
