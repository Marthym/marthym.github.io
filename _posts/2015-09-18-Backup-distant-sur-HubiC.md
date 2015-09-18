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
des snapshots remontables a postériori. Ça m'a déjà servi plusieurs fois pour récupérer des données après des fausses manips. Bref c'est pratique ce n'est pas
compliqué et ça sécurise bien les données <br/>
Tout est synchronisé via [Owncloud](https:/owncloud.org/) sur mon PC portable. Ma moitié elle est sous Windows, le client Owncloud ne supporte pas bien ses
200 Go elle passe donc par Cygwin/rsync pour une synchro unilatérale.  Toutes nos données sont donc dupliquées et on est serrain, face aux mauvaises manips aux
disques qui claquent et autres joyeusetés du genre. Par contre, les données restent regroupées au même endroit. S'il arrive un problème à cet endroit c'est la
perte de tout sans espoir de retrouver. C'est pour ça que j'ai commencé à regarder une solution de backup externe.

## Cahier des charges
Plusieurs impératifs :

* Etre sur un site distant
* Avoir une capacité de stockage de 1 To minimum, 2 To serait un plus
* Pouvoir y envoyer des fichiers en ligne de commande
* Pas cher
* Tout le processus doit pouvoir se faire d'une jail du NAS (csh).

Par contre :

* Pas besoin de pouvoir garder un historique des versions, c'est le NAS qui s'en charge.

J'ai en premier pensé faire un backup chez mes parents mais ce n'est pas gérable, personne pour maintenir un PC en fonctionnement là-bas, connexion internet
restreinte, ... Bref mauvaise idée.

## Le choix de l'hébergement
J'ai donc pas mal recherché un service de stockage qui réponde au cahier des charges. J'ai un peu fait le tour des services existant :

* Mega.co.nz: Propriété douteuse apparemment c'est de chinois derrière
* Onedrive: Américain, trop cher (84€ / an pour 1 To)
* Google Drive: Américain, trop intrusif, pas de client ligne de commande, cher (106€ / an pour 1 To)
* Droopbox: Américain, trop cher (119€ / an pour 1 To)

Rien qui m'emballe dans tout ça, je ne trouve tout un peu cher pour ce que j'ai à en faire et je ne suis pas fan de laisser mes données sur un serveur américain. J'ai
même regardé si louer un serveur d'hébergement n'était pas rentable ... ça l'est pas.

Puis j'ai trouvé [HubiC](https://hubic.com/en/), un service de stockage d'[OVH](https://www.ovh.com/fr/). Rapidement ce que HubiC propose :

* 25Go gratuit
* 100Go pour 10€ / an
* 10To pour 50€ /an
* Client de synchro
* Taille de fichier illimité
* Datacenter en France
* API

Bref ce n'est pas mal, c'est français et ce n'est carrément pas cher. Maintenant la difficulté c'est d'arriver à uploader via la ligne de commande en utilisant les
APIs fournies par HubiC.

### Le client swift
HubiC utilise la techno [OpenStack](https://www.ovh.com/fr/g611.openstack_quickstart) d'OVH. Il est donc possible de passer par un client Swift pour y accéder.
Ca vous fait une belle jambe me direz-vous ! Et pour cause, il n'existe rien d'officiel qui exploite ces APIs en ligne de commande. On trouve des clients
graphiques et pas mal d'outils de synchro mais rien qui soit utilisable pour mettre en place des batchs.
En fouillant sur le net j'ai trouvé des tas de solutions, non officielles, plus ou moins simple pour accéder aux containers openStack en ligne de commande.
J'ai trouvé des trucs qui passaient par des proxys, des trucs pour monter un répertoire, des trucs à base de [duplicity](http://duplicity.nongnu.org/) mais
finalement rien de simple qui me permette d'envoyer un fichier sur mon compte HubiC.<br/>
J'ai aussi essayé le client non officiel fourni par OVH mais se dernier n'est qu'un portable de la version Windows via Mono. J'ai pas forcément ça et en plus
ma cible est de le faire tourner sur FreeNAS en FreeBSD via un CShell. Le Mono ça lui plaît pas des masses.

Finalement, je suis tombé sur [hubic-wrapper-to-swift](https://github.com/puzzle1536/hubic-wrapper-to-swift) qui en plus d'être pas trop mal documenté, a le
mérite de fonctionner facilement et sans Mono. C'est à base python, facile à installer sur DSB, la configuration du client est assez simple. Et en quelques
essais j'ai peu envoyer des fichiers sur Hubic.

Il suffit de télécharger le fichier `hubic.py` de le rendre exécutable, de suivre la doc pour paramétrer le compte et c'est partie :
```sh
./hubic.py --swift list
```

## Réalisation du script

### Les variables
* `NAME`: C'est le premier argument de la commande. S'il y a plusieurs utilisateurs à backuper séparément l'utilisation permet d'aller chercher un dossier
source différent pour chaque utilisateur et d'uploader dans des containers différents.
* `BACKUP_SOURCE`: Le répertoire source du backup dans lequel il est possible d'utiliser `$NAME`
* `BACKUP_SNAR_DIR`: Le répertoire qui contiendra les fichiers snar pour faire de l'incrémental.
* `BACKUP_TEMP_DEST`: Le répertoire qui contiendra les fichiers de backups avant qu'ils soient envoyé sur HubiC
* `BACKUP_MAX_FILE_SIZE`: La taille max des fichiers à envoyer sur le serveur. La taille pour les comptes payants HubiC n'est pas limité mais c'est toujours
bon de limiter.

### La création du backup

~~~csh
gtar -g $BACKUP_SNAR_DIR/$SNAR_ID.snar -czf - $BACKUP_SOURCE | gpg --batch --yes --passphrase <passphrase> -ac -o- | split -b $BACKUP_MAX_FILE_SIZE - $BACKUP_TEMP_DEST/$BACKUP_ID.tar.gz.gpg.
~~~

J'ai beaucoup de données (entre moi et mon amie, on a plus de 400 Go) et je suis un peu parano, je veux pas laisser mes données en clair, même sur un serveur
français. Donc je voulais avoir des fichiers `tar.gz` incrémentaux pour pas y passer des plombes tous les jours et les crypter à la volée avant de les envoyer
sur HubiC.

**TAR**

* `-g $BACKUP_SNAR_DIR/$SNAR_ID.snar`: Permets de faire de l'incrémental. Si le fichier snar n'est pas présent on fait un backup complet, sinon on fait un
incrémental depuis l'état des fichiers contenus dans le snar.

**GPG**

J'ai utilisé GPG parce que, apparemment l'encryptage est meilleur mais ça marche aussi avec OpenSSL.

* `--batch`: Pour d'ire qu'on est en mode non-interractif.
* `--yes`: On dit oui à toutes les questions
* `-c`: Pour un cryptage symmétrique (par mot de passe et pas par clé publique/privé)
* `-a`: Pour avoir du ASCII Armored en sortie au lieu de binaire
* `-o-`: Pour lire sur l'entrée standard et écrire sur la sortie standard

**SPLIT**

* `-b $BACKUP_MAX_FILE_SIZE`: Pour donner la taille max
* ` - `: Pour lire l'entrée standard

Le tout en stream pour ne pas avoir de fichiers intermédiaires qui prendraient trop de place sur le disque.

{: .notice}
A noter que la commande pour défaire tout ça est la suivante :<br/>
cat <nom_du_fichier>.tar.gz.gpg* | gpg -d --yes --batch --passphrase <passphrase> | gtar xzf - --directory ./test_extract

### L'envoi sur les serveur HubiC

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
La commande hubic est englobée dans un `csh -c` pour que le `-I {}` du xargs fonctionne.

Il arrive que l'upload échoue, la commande est alors rejouée jusqu'à ce qu'elle réussisse (ou qu'elle échoue à 3 x). Le client swift est assez intelligent pour
ne pas renvoyer les segments de fichiers déjà envoyés une première fois.

### La purge

~~~ csh
./hubic.py --swift list HubiC-DeskBackup_$NAME | sed '/^HUBIC/d' | sed "/$NAME-$WEEK/q" | sed "/$NAME-$WEEK/d" | xargs -I {} csh -c "echo '\tDelete file {}' && ./hubic.py --swift delete HubiC-DeskBackup_$NAME {}"
~~~

Je ne garde qu'une semaine à la fois, comme j'ai déjà des snapshots ZFS, du mirroring et tout, il ne m'est pas nécessaire de conserver 3 mois de données. Je
purge les données de la semaine précédente chaque début de semaine.

* `./hubic.py --swift list HubiC-DeskBackup_$NAME`: Liste les fichiers dans le container
* `| sed '/^HUBIC/d'`: supprime le bruit généré par une reconnexion s'il y en a eu.
* `| sed "/$NAME-$WEEK/q"`: supprime les noms de fichiers alphabétiquement après le nom du premier fichier créé aujourd'hui
* `| sed "/$NAME-$WEEK/d"`: supprime de la liste le premier fichier d'aujourd'hui (qui n'était pas inclus précédemment)
* `echo '\tDelete file {}'`: affiche le nom du fichier en cours de suppression
* `./hubic.py --swift delete HubiC-DeskBackup_$NAME {}`: supprime les fichiers restant dans la liste

## Le script

{% gist Marthym/7f61550fd538a128ad02 %}

{: .notice}
Je n'ai pas trouvé le moyen de couper les lignes comme en bash avec `\ ` du coup tout est sur la même ligne.