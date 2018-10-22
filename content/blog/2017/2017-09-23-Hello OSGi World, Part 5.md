---
title: Hello OSGi World, Part 5, Fragment Bundles
date: "2017-09-23T12:00:00-00:00"
excerpt: "Qu’est ce qu’un Fragment Bundle et à quoi ça sert ?"
tags: [OSGi, bundle, log4j, java, planetlibre]
image: osgi_back.png
---

Disons que cette partie est un bonus si vous n’avez pas encore saturé ! Depuis le vous devez bien avoir remarqué que l’on utilise log4j 2 et que les logs ne s’affichent pas. À la place on a un message d’erreur qui dit qu’il manque un fichier de configuration. Et malheureusement, l’ajouter dans le répertoire de conf ne suffit pas, ni dans le répertoire courant. Il doit se trouver dans le classpath de `log4j2-core`. 

## Fragment Bundle
Le problème est là, l’isolation des classpaths induite par OSGi interdit donc de rajouter un fichier dans le classpath d’un bundle. À moins de modifier le jar original de log4j, ce qui n’est pas vraiment génial.

C’est là qu’interviennent les Fragments Bundles. En effet, ce sont des genres d’ajout fait à des bundles existant. Les fichiers qu’ils contiennent vont être ajouté au bundle qui les abrite et vont donc partager le même classpath.

### Création du module how-log4j2
Pour créer un Fragment Bundle, il faut ajouter dans le `MANIFEST.MF` la ligne :

```
Fragment-Host: org.apache.logging.log4j.core
```
Pour dire que le fragment est hébergé par log4j2-core.

Dans la configuration du `maven-bundle-plugin` on a précisé 
``` xml
<configuration>
    <instructions combine.children="append">
        <_include>-src/main/osgi/osgi.bnd</_include>
    </instructions>
</configuration>
```

Cette configuration permet, via un fichier `src/main/osgi/osgi.bnd`, d’ajouter des instructions à BND. On ajoute le module `how-log4j2` avec le fichier `osgi.bnd` contenant la ligne nécessaire. Et on ajoute au module le ficher de configuration log4j2.

On build et on re-teste :
<pre>
START LEVEL 1
   ID|State      |Level|Name
   16|Resolved   |    1|how-log4j2 (1.0.0.SNAPSHOT)|1.0.0.SNAPSHOT
</pre>

Dans la liste des bundle on voit le nouveau Fragment. Les Fragments s’activent par l’intermédiaire de leur hôte. C’est pour cela qu’il est noté `Resolved` au lieu de `Active`.

Les logs s’affichent maintenant correctement !

## Conclusion
Si vous êtes arrivé là, merci de votre patience et indulgence. N’hésitez pas à me faire un retour dans les commentaires !

J’utilise OSGi depuis 4 ans sur un projet conséquent en production. Quand on a commencé, on a essuyé les mêmes plâtres que décrit dans ces articles et même plus ! Au final le projet fonctionne bien mais la maintenance en est souvent complexe. Nous n’avons pas abordé la question des tests mais c’est tout aussi compliqué. En outre, les ressources que ce soit documentation ou humaines sont difficiles à trouver. La multitude d’implémentations de chaque partie du framework crée en plus une fragmentation qui amplifie encore le phénomène.
De plus, vous avez du le voir, malgré l’ajout de la dépendance `Xnio` dans le composant `http-server` il arrive que l’erreur XNIO se produise. C’est une question de timing. Pour la résoudre définitivement, en plus de demander à Felix de vider son cache sur chaque démarrage, il faut ajouter un niveau de chargement des bundles. Un répertoire `core` qui serait chargé avant `application` et qui contiendrait tout sauf les jars de notre application. Mais on constate que la gestion de l’ordre de chargement est aussi un élément compliqué d’OSGi qui vient s’ajouter aux autres.

Pour ces raisons, je ne choisirais pas d’utiliser OSGi en production sur les prochains projets. C’est un sujet intéressant à explorer mais le coût en est très élevé comparé au gain qu’on en retire.

[Code source: Part 5, Fragment Bundles](https://github.com/Marthym/hello-osgi-world)

* [Part 1, Introduction]({{% relref "/blog/2017/2017-08-29-Hello OSGi World, Part 1" %}})
* [Part 2, Premiers concepts OSGi]({{% relref "/blog/2017/2017-09-02-Hello OSGi World, Part 2" %}})
* [Part 3, Configuration du runner]({{% relref "/blog/2017/2017-09-09-Hello OSGi World, Part 3" %}})
* [Part 4, Injection de dépendances]({{% relref "/blog/2017/2017-09-16-Hello OSGi World, Part 4" %}})
* [Part 5, Fragment Bundles]()