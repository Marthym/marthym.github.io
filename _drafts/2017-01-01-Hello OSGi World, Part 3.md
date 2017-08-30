---
layout: post
title: Hello OSGi World, Part 3, Configuration du runner
excerpt: "Configuration du runner OSGi et premier lancement de l’application"
#modified: 2015-09-21
tags: [OSGi, REST, java, planetlibre, restlet]
comments: true
image:
  feature: osgi_back.png
---

On a parlé la dernière fois de l'un des points de complexité d'OSGi que sont les bundles et le fait que toutes les dépendences du projet doivent impérativement être des bundles aussi, sans quoi il ne sera pas possible au runner de les charger.

Le run des applications OSGi est un autre de ces points noir.

## Le principe

Pour démarrer une application OSGi, le principe est simple sur le papier. On lance l'implémentation choisie (pour nous felix) pour on lui fait charcher les bundles de notre application. C'est très vite fastidieux et inhumain de le faire à la main.

Donc pour s'épargner ça, on va utiliser le bundle `fileinstall`. Ce dernier va automatiquement charger tous les bundles contenu dans un dossier.

Tel qu'on l'a inclus pour l'instant un import felix nu sans rien d'autre. On va ajouter `gogo.shell` qui va nous permettre d'avoir un peu de visibilité sur ce que l'on fait.

## Mise à jour des poms

### Pom parent du projet
On y ajoute les versions des dépendances felix dont on a parlé précédement :

``` xml
    <properties>
        ...
        <fileinstall.version>3.6.0</fileinstall.version>
        <gogo.version>1.0.0</gogo.version>
    <properties>

    ...

    <dependencyManagement>
        <dependencies>
            ...

            <!--Framework Goodies-->
            <dependency>
                <groupId>org.apache.felix</groupId>
                <artifactId>org.apache.felix.fileinstall</artifactId>
                <version>${fileinstall.version}</version>
            </dependency>
            <dependency>
                <groupId>org.apache.felix</groupId>
                <artifactId>org.apache.felix.gogo.shell</artifactId>
                <version>${gogo.version}</version>
            </dependency>
            <dependency>
                <groupId>org.apache.felix</groupId>
                <artifactId>org.apache.felix.gogo.command</artifactId>
                <version>${gogo.version}</version>
                <exclusions>
                    <exclusion>
                        <groupId>org.easymock</groupId>
                        <artifactId>easymock</artifactId>
                    </exclusion>
                </exclusions>
            </dependency>

            ...
        </dependencies>
    </dependencyManagement>
```

L'exclusion de easymock c'est pour éviter de l'avoir dans les jar de l'application, il ne sert à rien, je pense que c'est juste une erreur de dépendances qui aurait due se trouver en scope test.

### Module Assembly
Maintenant que les versions sont correcte on ajoute les dépendances dans l'assembly puisqu'il n'y a que lui qui en aura besoin, c'est des dépendance runtime.

{% highlight xml %}
    <dependencies>
        ...
        <dependency>
            <groupId>org.apache.felix</groupId>
            <artifactId>org.apache.felix.fileinstall</artifactId>
        </dependency>
        <dependency>
            <groupId>org.apache.felix</groupId>
            <artifactId>org.apache.felix.gogo.shell</artifactId>
        </dependency>
        <dependency>
            <groupId>org.apache.felix</groupId>
            <artifactId>org.apache.felix.gogo.command</artifactId>
        </dependency>

    </dependencies>
    ...
{% endhighlight %}

Ensuite pour démarrer, felix à besoin d'un fichier de configuration. A mettre dans `how-assembly/src/main/resources/conf/config.properties`. Vous pourrez en trouver un examplaire dans les sources et la doc des différentes propriétées est consultable [ici][felix-config]. 

#### Maven assembly plugin

Le plugin assembly de maven va permettre de générer un tar.gz contenant la structure finale du projet. La structure que souhaité est la suivante:

<pre class="console">
/
├── application
│   ├── how-rest-1.0-SNAPSHOT.jar
│   ├── log4j-api-2.8.2.jar
│   ├── log4j-core-2.8.2.jar
│   ├── log4j-slf4j-impl-2.8.2.jar
│   └── slf4j-api-1.7.25.jar
├── archive-tmp
├── bundle
│   ├── org.apache.felix.bundlerepository-1.6.0.jar
│   ├── org.apache.felix.fileinstall-3.6.0.jar
│   ├── org.apache.felix.gogo.command-1.0.0.jar
│   ├── org.apache.felix.gogo.runtime-1.0.0.jar
│   ├── org.apache.felix.gogo.shell-1.0.0.jar
│   ├── org.osgi.compendium-4.3.1.jar
│   └── org.osgi.core-6.0.0.jar
├── conf
│   └── config.properties
└── org.apache.felix.main-5.6.6.jar
</pre>

* **bundle**: *Contenant les goodies felix*
* **application**: *Contenant notre application et ses dépendances*
* **conf**: *Contenant la configuratoin de felix*

Dans `how-assembly/src/main/assembly/bundle.xml` permet de paramétrer l'assemblage. Il va contenir 3 `dependencySet` pour les trois niveau de hiérarchie (./, application et bundle) ainsi qu'un `fileSet` pour la configuration. Le fichier complet est visible dans les sources.

## Premier démarrage
Une fois l'assemblage au point, on peut aller lancer la machine de guerre !

{% highlight shell %}
mvn clean package
cd how-assembly/target
tar jxvf how-1.0-SNAPSHOT.tar.bz2
java -Dfelix.fileinstall.dir=application -jar org.apache.felix.main-5.6.6.jar
{% endhighlight %}

Et si tout se passe bien :
<pre class="console">
____________________________
Welcome to Apache Felix Gogo

g! HOW is now Activated !
</pre>

Le message de notre activateur s'affiche !

### Gogo Shell
C'est le moment de comprendre un peu mien à quoi servent les "Goodies" que l'on a ajouté dans l'assembly. Faite `Entrer` pour obtenir l'invite `g! ` puis tapez la commande `lb` pour List Bundles vous devriez avoir quelque chose comme ça :

<pre class="console">
g! lb
START LEVEL 1
   ID|State      |Level|Name
    0|Active     |    0|System Bundle (5.6.6)|5.6.6
    1|Active     |    1|Apache Felix Bundle Repository (1.6.0)|1.6.0
    2|Active     |    1|Apache Felix File Install (3.6.0)|3.6.0
    3|Active     |    1|Apache Felix Gogo Command (1.0.0)|1.0.0
    4|Active     |    1|Apache Felix Gogo Runtime (1.0.0)|1.0.0
    5|Active     |    1|Apache Felix Gogo Shell (1.0.0)|1.0.0
    6|Active     |    1|osgi.cmpn (4.3.1.201210102024)|4.3.1.201210102024
    7|Active     |    1|osgi.core (6.0.0.201403061837)|6.0.0.201403061837
    8|Active     |    1|how-rest (1.0.0.SNAPSHOT)|1.0.0.SNAPSHOT
    9|Installed  |    1|slf4j-api (1.7.25)|1.7.25
</pre>

Il s'agit de la liste des bundles installé et démarré dans le framework felix. Vous remarquez le bundle 9 `how-rest` marqué comme actif.

### Mise à jour à chaud
C'est là l'un des gros points fort de OSGi, la mise à jour des bundles à chaud. C'est a dire que sans arréter et relancer l'application, il est possible de mettre à jour les jars qui la compose. Par exemple, lancé l'application puis, depuis le répertoire du dossier, essayez la commande suivante :

``` shell
cp how-rest/target/how-rest-1.0-SNAPSHOT.jar how-assembly/target/application/
```

Dans la console de l'application, vous allez voir apparaitre 
<pre class="console">
____________________________
Welcome to Apache Felix Gogo

g! HOW is now Activated !
HOW is now Stopped !
HOW is now Activated !
</pre>

Le log de l'activateur apparait à nouveau. En effet, `fileinstall` a détecté la modification d'un fichier dans application et grâce à la gestion de dépendances à chaud d'OSGi, il a peu désactiver le bundle `how-rest` installer la nouvelle version et ré-activer la nouvelle version. D'où le message qui ré-apparait. Bon après j'avoue faut en avoir l'usage, mais OSGi peut le faire ...

## Next
On a vu comment packager et lancer une application OSGi basique, comment palier certaine loudeur et rapidement comment lister les bundles en cours. La prochaine fois on verra l'injection de dépendances avec **Declarative Service** et **SCR**.



[felix-config]: https://felix.apache.org/documentation/subprojects/apache-felix-framework/apache-felix-framework-configuration-properties.html