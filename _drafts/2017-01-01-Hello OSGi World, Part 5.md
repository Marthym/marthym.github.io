---
layout: post
title: Hello OSGi World, Part 5, Fragment Bundles
excerpt: "Qu’est ce qu’un Fragment Bundle et à quoi ça sert ?"
#modified: 2015-09-21
tags: [OSGi, bundle, log4j, java, planetlibre]
comments: true
image:
  feature: osgi_back.png
---

Disons que cette partie est un bonus si vous n'avez pas encore saturé ! Depuis le vous devez bien avoir rémarqué que l'on utilise log4j 2 et que les logs ne s'affichent pas. A la place on a un message d'erreur qui dit qu'il manque un fichier de configuration. Et malheureusement, l'ajouter dans le répertoire de conf ne suffit pas, ni dans le répertoire courrant. Il doit se trouver dans le classpath de `log4j2-core`. 

## Fragment Bundle
Le problème est là, l'isolation des classpaths induite par OSGi interdit donc de rajouter un fichier dans le classpath d'un bundle. A moins de modifier le jar original de log4j, ce qui n'est pas vraiment génial.

C'est là qu'interviennent les Fragments Bundles. En effet, ce sont des genres d'ajout fait à des bundles existant. Les fichiers qu'ils contiennent vont être ajouté au bundle qui les abrite et vont donc partager le même classpath.

### Création du module how-log4j2
Pour créer un Fragment Bundle, il faut ajouter dans le `MANIFEST.MF` la ligne :

```
Fragment-Host: org.apache.logging.log4j.core
```
Pour dire que le fragment est hébergé par log4j2-core.

Dans la configuration du `maven-bundle-plugin` on a précisé 
{% highlight xml %}
<configuration>
    <instructions combine.children="append">
        <_include>-src/main/osgi/osgi.bnd</_include>
    </instructions>
</configuration>
{% endhighlight %}

Cette configuration permet, via un fichier `src/main/osgi/osgi.bnd`, d'ajouter des instructions à BND. On le module `how-log4j2` avec le fichier `osgi.bnd` contenant la ligne nécessaire. Et on ajoute au module le ficher de configuration log4j2.

On build et on retest :
<pre>
START LEVEL 1
   ID|State      |Level|Name
   16|Resolved   |    1|how-log4j2 (1.0.0.SNAPSHOT)|1.0.0.SNAPSHOT
</pre>

Dans la liste des bundle on voit le nouveau Fragment. Les Fragment s'activent par l'intermédiaire de leur hôte. C'est pour celà qu'il est noté Resolved au lieu de Active.

Les logs s'affichent maintenant correctement !

## Conclusion
Si vous êtes arrivé là, merci de votre patience et indulgence. N'hésitez pas à me faire un retour dans les commentaires !

J'utilise OSGi depuis 4 ans sur un projet en production. Quand on a commencé, on a essuyé les mêmes platres que décrit dans ces articles et même plus ! Au final le projet fonctionne mais la maintenance en est laborieuse. Nous n'avons pas abordé la question des tests mais c'est tout aussi compliqué. De plus les ressources que ce soit documentation ou humaines sont difficile à trouver. La multitude d'implémentation de chaque partie du framework crée en plus une fragmentation qui amplifit encore le phénomène.
De plus, vous avez du le voir, malgrès l'ajout de la dépendance `Xnio` dans le composant `http-server` il arrive que l'erreur XNIO se produise. C'est une question de timing. Pour la résoudre définitivement, en plus de demander à Felix de vider son cache sur chaque démarrage, il faut ajouter une niveau de chargement des bundles. Un répertoire `core` qui serait chargé avec `application` et qui contiendrait tout sauf les jar de notre application. Mais on constate que la gestion de l'ordre des chargement est aussi un élément compliqué d'OSGi qui vient s'ajouter aux autres.

Pour ces raisons, je déconseille l'utilisation d'OSGi en production. C'est un sujet intéressant à explorer mais le cout en est très cher comparé au gain qu'on en retire.