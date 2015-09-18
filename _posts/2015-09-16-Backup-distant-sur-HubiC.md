---
layout: post
title: Backups distant sur HubiC
excerpt: "Protéger ses données perso d'un cataclisme en les envoyant dans le cloud"
#modified: 2015-09-16
tags: [backup,shell,admin]
comments: true
image:
  feature: backup.png
---
{% include _toc.html %}<!--_-->

## Le contexte
J'ai chez moi un vieux PC reconverti en NAS grâce à [FreeNAS](http://www.freenas.org/). J'en suis très content, surtout du ZFS et de la possibilité de faire
des snapshot remontable à postériori. Ca m'a déjà servi plusieurs fois pour récupérer des données après des fausses manip. Bref c'est pratique c'est pas
compliqué et ça sécurise bien les données.<br/>
Tout est synchronisé via [Owncloud](https://owncloud.org/) sur mon PC portable. Ma moitié elle est sous Windows, le client Owncloud ne supporte pas bien ses
200 Go elle passe donc par cygwin/rsync pour un synchro unilatérale

Toutes nos données sont donc dupliqué et on est serrain, face aux mauvaises manip aux disque qui claque et autres joyeusetés du genre. Par contre, les données
restent regroupées au même endroit. S'il arrive un problème à cet endroit c'est la perte de tout sans espoir de retrouver. C'est pour ça que j'ai commencé à
regarder une solution de backup externe.

## Cahier des charges
Plusieurs impératifs :

* Etre sur un site distant
* Avoir un capacité de stockage de 1To minimum, 2To serai un plus
* Pouvoir y envoyer des fichiers en ligne de commande
* Pas cher
* Tout le process doit pouvoir se faire d'une jail du NAS (csh).

Par contre :

* Pas besoin de pouvoir garder un historique des versions, c'est le NAS qui s'en charge.

J'ai en premier pensé faire un backup chez mes parents mais c'est pas gérable, personne pour maintenir un PC en fonctionnement là-bas, connection internet
restreinte, ... Bref mauvaise idée.

## Le choix de l'hébergement
J'ai donc pas mal recherché un service de stockage qui réponde au cahier des charges. J'ai un peu fais le tour des services existant :

* Mega.co.nz: Propriété douteuse apparemmet c'est de chinois derrière
* Onedrive: Américain, trop cher (84€ / an pour 1To)
* Google Drive: Américain, Trop intrusif, pas de client ligne de commande, cher (106€ / an pour 1To)
* Droopbox: Américain, trop cher (119€ / an pour 1To)

Rien qui m'emballe dans tout ça, je trouve tout un peu cher pour ce que j'ai a en faire et je suis pas fan de laisser mes données sur un serveur américain. J'ai
même regardé si louer un serveur d'hébergement était pas rentable ... ça l'ai pas.

Puis j'ai trouvé [HubiC](https://hubic.com/en/), un service de stockage d'[OVH](https://www.ovh.com/fr/). Rapidement ce que HubiC propose :

* 25Go gratuit
* 100Go pour 10€ / an
* 10To pour 50€ /an
* Client de synchro
* Taille de fichier illimité
* Datacenter en France
* API

Bref c'est pas mal, c'est français et c'est carrément pas cher. Maintenant la difficulté c'est d'arriver à uploader via la ligne de commande en utilisant les
APIs fournies par HubiC.

## Réalisation

### Le client swift
HubiC utilise la techno [OpenStack](https://www.ovh.com/fr/g611.openstack_quickstart) d'OVH. Il est donc possible de passer par un client Swift pour y accéder.
Ca vous fait une belle jambe me direz vous ! Et pour cause, il n'existe rien d'officiel qui exploite ces APIs en ligne de commande. On trouve des clients
graphiques et pas mal d'outils de synchro mais rien qui soit utilisable pour mettre en place des batch.
En fouillant sur le net j'ai trouvé des tas de solutions, non officielles, plus ou moins simple pour accéder aux containers openStack en ligne de commande.
J'ai trouvé des trucs qui passaient par des proxys, des trucs pour monter un répertoire, des trucs à base de [duplicity](http://duplicity.nongnu.org/) mais
finalement rien de simple qui me permette d'envoyer un fichier sur mon compte HubiC.<br/>
J'ai aussi essayé le client non-officiel fourni par OVH mais se dernier n'est qu'un protable de la version Windows via Mono. J'ai pas forcément ça et en plus
ma cible est de le faire tourner sur FreeNAS en FreeBSD via un CShell. Le Mono ça lui plait pas des masses.

Finalement, je suis tombé sur [hubic-wrapper-to-swift](https://github.com/puzzle1536/hubic-wrapper-to-swift) qui en plus d'être pas trop mal documenté à le
mérite de fonctionner facilement et sans Mono. C'est a base python, facile à installer sur DSB, la configuration du client est assez simple. Et en quelques
essais j'ai peu envoyer des fichiers sur Hubic.

Il suffit de télécharger le fichier `hubic.py` de le rendre exécutable, de suivre la doc pour paramétrer le compte et c'est partie :
```sh
./hubic.py --swift list
```

### Le script
J'ai beaucoup de données (entre moi et mon amie, on a plus de 400Go) et je suis un peu parano, je veux pas laisser mes données en clair, même sur un serveur
français. Donc je voulais avoir des fichier `tar.gz` incrémentaux pour pas y passer des plombes tous les jours et les crypter à la volée avant de les envoyer
sur HubiC. Voilà ce que donne le script :

{% highlight ruby %}
#!/bin/csh -f

set NAME=$1

if ( "$1" == "" ) then
    echo "Usage: backup <username>"
    exit 1
endif

set NOW="`date +"%Y%m%d"`"
set WEEK="`date +"%W"`"
set BACKUP_SOURCE="/media/storage/$NAME/Divers"
set BACKUP_SNAR_DIR="/usr/backup/snar/"
set BACKUP_TEMP_DEST="/usr/backup/"
set BACKUP_MAX_FILE_SIZE="2048m"
set M20="20000000"

set BACKUP_ID=$NAME-$WEEK-$NOW
set SNAR_ID=$NAME-$WEEK

mkdir -p /usr/backup/snar

# Clean Incrementary SNAR File
find $BACKUP_SNAR_DIR -type f -not -name marthym-$SNAR_ID.snar | xargs rm
if ( $? > 0 ) exit $?

# Perform backup
echo "Start $NAME backup at "`date`
gtar -g $BACKUP_SNAR_DIR/$SNAR_ID.snar -czf - $BACKUP_SOURCE | gpg --batch --yes --passphrase secret -ac -o- | split -b $BACKUP_MAX_FILE_SIZE - $BACKUP_TEMP_DEST/$BACKUP_ID.tar.gz.gpg.
if ( $? > 0 ) exit $?

# Upload backup
set RETRY_TIMES=0
set COMMAND_STATUS=1
while ( $COMMAND_STATUS != 0 && $RETRY_TIMES < 4 )
  echo "Start $NAME upload at "`date`
  ls $BACKUP_TEMP_DEST | grep "$BACKUP_ID.tar.gz.gpg" | xargs -I {} csh -c "./hubic.py --swift -- upload --segment-size $M20 --object-name {} HubiC-DeskBackup_$NAME $BACKUP_TEMP_DEST{}"

  set COMMAND_STATUS=$?
  set RETRY_TIMES=RETRY_TIMES+1
end
if ($COMMAND_STATUS > 0) exit $?

# Purge old backup
echo "Start purge at "`date`
./hubic.py --swift list HubiC-DeskBackup_$NAME | sed '/^HUBIC/d' | sed "/$NAME-$WEEK/q" | sed "/$NAME-$WEEK/d" | xargs -I {} csh -c "echo '\tDelete file {}' && ./hubic.py --swift delete HubiC-DeskBackup_$NAME {}"

find $BACKUP_TEMP_DEST -name "$BACKUP_ID.tar.gz.gpg*" | xargs rm -rf

echo "End of backup $NAME process at "`date`

{% endhighlight %}

{: .notice}
J'ai pas trouvé le moyen de couper les lignes comme en bash avec `\ ` du coup tout est sur la même ligne.

### Explications de la création du backup

~~~csh
gtar -g $BACKUP_SNAR_DIR/$SNAR_ID.snar -czf - $BACKUP_SOURCE | gpg --batch --yes --passphrase <passphrase> -ac -o- | split -b $BACKUP_MAX_FILE_SIZE - $BACKUP_TEMP_DEST/$BACKUP_ID.tar.gz.gpg.
~~~

**TAR**

* `-g $BACKUP_SNAR_DIR/$SNAR_ID.snar`: Permet de faire de l'incrémental. Si le fichier snar n'est pas présent on fait un backup complet, sinon on fait un
incrémental depuis l'état des fichier contenu dans le snar.

**GPG**

J'ai utilisé GPG parce qu'apparemment l'encryptage est meilleur mais ça marche aussi avec OpenSSL.

* `--batch`: Pour d'ire qu'on est en mode non-interractif.
* `--yes`: On dit oui à toutes les questions
* `-c`: Pour un cryptage symmétrique (par mot de passe et pas par clé publique/privé)
* `-a`: Pour avoir du ASCII Armored en sortie au lieu de binaire
* `-o-`: Pour lire sur l'entrée standard et écrire sur la sortie standard

**SPLIT**

* `-b $BACKUP_MAX_FILE_SIZE`: Pour donner la taille max
* ` - `: Pour lire l'entrée standard

Le tout en stream pour ne pas avoir de fichiers intermédiaires qui pendraient trop de place sur le disque.

{: .notice}
A noter que la commande pour défaire tout ça est la suivante :<br/>
cat <nom_du_fichier>.tar.gz.gpg* | gpg -d --yes --batch --passphrase <passphrase> | gtar xzf - --directory ./test_extract

### Explication de l'upload

~~~csh
ls $BACKUP_TEMP_DEST | grep "$BACKUP_ID.tar.gz.gpg" | xargs -I {} csh -c "./hubic.py --swift -- upload --segment-size $M20 --object-name {} HubiC-DeskBackup_$NAME $BACKUP_TEMP_DEST{}"
~~~

On commence par lister les fichiers que l'on vient de créer puis via `xargs` on les envoie à la commande `hubic.py`.

* `--swift`: On utilise le `python-swiftclient`
* `-- `: On va avoir besoin de passer des options à la commande swift
* `upload`: On fait un upload
* `--segment-size $M20`: On divise l'upload en segments de 20Mo. Ca permet de fortement accélérer l'upload.
* `--object-name {}`: On nomme l'object comme le fichier issu du `ls`. Sans ça il utilise le nom complet avec le chemin.
* `HubiC-DeskBackup_$NAME $BACKUP_TEMP_DEST{}`: C'est le conteneur dans lequel on met le fichier. Dans l'UI d'HubiC dans la section "Sauvegardes" est listé
tout les conteneur qui commencent par "HubiC-DeskBackup_".

{: .notice}
Le tout est englobé dans un `csh -c` pour que le `-I {}` du xargs fonctionne.
