---
title: "Squid: StoreID rewrite"
date: "2015-09-26T12:00:00-00:00"
excerpt: "Configurer la réécriture du StoreId avec Squid"
#modified: 2015-09-16
categories: [infrastructure]
tags: [squid, linux, network, proxy]
comments: true
image: network.webp
---

L'équipe dans laquelle je travaille utilise un environnement de développement commun créé et mis jour via des scripts
[Ansible](http://www.ansible.com/). Tout le monde a le même, on n'est pas perdu quand on binôme chacun y rajoute sa
touche, ... Bref, on aime ou on n'aime pas ça dépend des développeurs.

Par contre, une chose est sure c'est que quand la version de Java ou de votre EDI préféré change, tout le monde se
trouve à faire le download de la nouvelle version, tout le monde tire sur la connexion internet pour télécharger X fois
la même chose, c'est dommage et ça prend du temps pour rien.

## Mise en place d'un proxy
La solution a ça est bien sûr de mettre en place un proxy. [Squid](http://www.squid-cache.org/) est un très bon de en
l'occurence. A condition de le configurer correctement pour qu'il mette en cache les gros fichiers.

``` conf
cache_dir ufs /var/spool/squid3 5000 16 256
maximum_object_size 400 MB
```

Ca fonctionne très bien sauf dans certains cas. En y regardant bien, les fichiers comme le JRE de Oracle par exemple
ne sont jamais mis en cache, ou plutôt ne sont jamais retrouvé dans le cache. Si on regarde le lien :

``` sh
http://download.oracle.com/otn-pub/java/jdk/7u75-b13/jre-7u75-linux-x64.tar.gz`
```

devient

``` sh
http://download.oracle.com/otn-pub/java/jdk/7u75-b13/jre-7u75-linux-x64.tar.gz?AuthParam=jkhefuihzefglkjhazfligezkfg`
```

Et bien sûr le **AuthParam** change à chaque fois. Squid considère alors le fichier comme un nouveau fichier et le
remet en cache à chaque fois. C'est ce que l'on appelle la duplication. Pas gênant pour les petits fichiers, beaucoup plus
pour les gros.

## Le rewrite de StoreId

Pour palier ce problème dans Squid 3.4 (pas avant) il est possible de re-écrire le
[StoreId](http://wiki.squid-cache.org/Features/StoreID). Pour cela, il faut commencer par récupérer le programme
perl [store-id.pl](http://pastebin.ca/2422099) que je rajoute ici au cas où :

``` bash
#!/usr/bin/perl
use strict;
use warnings;
$|=1;

my %url;

# read config file
open CONF, $ARGV[0] or die "Error opening $ARGV[0]: $!";
while (<CONF>) {
  chomp;
  next if /^\s*#?$/;
  my @l = split("\t");
  $url{qr/$l[0]/} = $l[$#l];
}
close CONF;

# read urls from squid and do the replacement
URL: while (<STDIN>) {
  chomp;
  last if /^(exit|quit|x|q)$/;

  foreach my $re (keys %url) {
    if (my @match = /$re/) {
      $_ = $url{$re};

      for (my $i=1; $i<=scalar(@match); $i++) {
        s/\$$i/$match[$i-1]/g;
      }
      print "OK store-id=$_\n";
      next URL;
    }
  }
  print "ERR\n";
}
```

{: .notice}
Attention, ce fichier **doit être exécutable** !

Ensuite dans le fichier `squid.conf` on active la mise en cache des query-string en remplaçant :

``` sh
refresh_pattern -i (/cgi-bin/|\?) 0       0%      0`
```

par

``` sh
refresh_pattern -i cgi-bin        0       0%      0`
```

Puis on ajoute les lignes suivantes :

``` sh
store_id_program /usr/local/squid/store-id.pl /usr/local/squid/store_id_db
store_id_children 5 startup=1
```

 * `store_id_program` est le chemin vers le programme perl avec en argument le fichier de mapping des urls
 * `store_id_children` permet de paramétrer les sous-process, 5 max, 1 au départ.

Reste enfin le fichier de mapping d'URL a ajouter. Il est sous la forme :

 * Regex de l'url
 * tabulation
 * URL re-ecrite

Exemple :

```
^http:\/\/download\.oracle\.com\/otn\-pub\/java\/([a-zA-Z0-9\/\.\-\_]+\.(tar\.gz))	http://download.oracle.com/otn-pub/java/$1
```

Attention que la tabulation ne soit pas remplacer par défaut par votre éditeur de texte. Pour être sûr, on peut utiliser
cette commande :

``` sh
cat dbfile | sed -r -e 's/\s+/\t/g' |sed '/^\#/d' >cleaned_db_file
```

Cela va nettoyer le fichier de base pour être certain qu'il soit bon. Tout un listing d'url est donné en exemple dans la
doc Squid : http://wiki.squid-cache.org/Features/StoreID/DB

## Cache-Control "must-revalidate"
Une dernière subtilité, il arrive de rencontrer des fichiers avec l'entête HTTP `Cache-Control "must-revalidate"`.
Squid interprète cet entête comme un ordre de toujours récupérer le fichier depuis sa source internet. Pour régler ça,
il est possible de demander à Squid d'ignorer certaines entêtes. Ce n'est pas conseillé dans le cadre d'un proxy standard
mais dans le cadre d'un proxy de téléchargement, ce n'est pas problématique.

Pour se faire il faut modifier les refresh pattern du fichier squid.conf comme suit :

```
refresh_pattern ^ftp:             1440    20%     10080
refresh_pattern ^gopher:          1440    0%      1440
refresh_pattern Packages\.bz2$    0       20%     4320 refresh-ims
refresh_pattern Sources\.bz2$     0       20%     4320 refresh-ims
refresh_pattern Release\.gpg$     0       20%     4320 refresh-ims
refresh_pattern Release$          0       20%     4320 refresh-ims
refresh_pattern -i cgi-bin        0       0%      0
refresh_pattern .                 1440    20%     10080 override-expire override-lastmod ignore-no-store ignore-must-revalidate ignore-private ignore-auth
```

Dans ce cas pour toutes les URLs Squid ignore les directives de cache.

### Liens

* http://www.squid-cache.org/Doc/config/refresh_pattern/
