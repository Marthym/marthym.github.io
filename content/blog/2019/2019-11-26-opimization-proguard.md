---
title: Optimisation de jar avec Proguard
date: "2019-11-26T22:00:00+02:00"
excerpt: "Comment optimiser la taille d’un jar avec proguard"
tags: [java, proguard, picocli, command, devops, planetlibre]
image: back.png
# comment: /s/1ix513/javadoc_agr_g_e_avec_diagrammes
---

Il y a quelque temps, j’ai vu cette [vidéo de Nicolas Peters](https://www.youtube.com/watch?v=8ENbMwkaFyk) à Devoxx qui parlait [picocli](https://picocli.info/) et des application en ligne de commande java. Chez i-run on a de gros besoin en outillage DevOps pour nos nouveaux projets et du coup ça m’a donné envie de tester picocli pour développer quelques outils.

Ce qui fonctionne plutôt âs mal. Mais au fil du temps et des dépendances, le binaire a pris du poid, même en limitant les dépendances au stricte minimum. Au final le jar fais 1,2 Mo aujourd’hui (c’est que le début). J’ai cherché un moyen de le limiter pour qu’il reste facile a déployer sur les machines qui en ont besoin et que l’emprunte mémoire soit la plus réduite possible, comme le temps de chargement de la JVM. Et je suis tombé sur [Proguard](https://www.guardsquare.com/en/products/proguard).

## Proguard

Proguard est bien connu dans le cadre d’Android pour sa capacité à réduire et surtout obfusquer le code. Mais on y pense moins dans le cadre de projets java standard. Pourtant il répond parfaitement au besoin qu’on a chez I-Run.

Le problème c’est que Proguard n’est pas un outils intuitif et qu’il est assez facile de cassé son build avec. D’autant que la plus part des explications ou des examples portent sur des projets Android.

Je vous propose de voir la configuration que l’on a mis en place chez I-Run pour notre outils.

## Les principes

Proguard va optimizer un jar en passant par plusieurs phases de traitement qu’il est important de comprendre. 

**shrink**: Qui va élaguer tout ce qui n’est pas utilisé dans cotre code.\\
**optimize**: Qui va aller un peu plus loin en supprimant le code mort et les paramètres de méthodes par exemple.\\
**obfuscate**: Qui va renommer les noms de classes, de méthodes, de membres, ... et réduire leurs noms au minimum (une lattre ou deux).

Et là on comprend la puissance de l’outil mais aussi les problèmes que l’on va rencontrer !


## Description du projet

Le projet sur lequel on applique proguard est un projet en ligne de commande. On y limite les dépendances au maximum pour limiter la taille du jar final. L’application est packagé sous forme d’un Uber jar via le plugin maven shade.

## Première tentative

Déjà la configuration minimum pour que ça fonctionne, il faut configurer les librairies `-libraryjars` et l’entrée sortie `-injars -outjars`. 

```
-injars       coffees/target/coffees-1.3.0-SNAPSHOT-shaded.jar(!META-INF/versions/**)
-outjars      coffees/target/coffees-1.3.0-SNAPSHOT-slim.jar
-libraryjars  <java.home>/jmods/(!**.jar;!module-info.class) # Pour Java 11
-libraryjars  <java.home>/lib/rt.jar # Pour Java 8
```

Ensuite au premier lancement, on a direct des pages et des pages de warnings et notes et proguard s’arrète en erreur. 

```
 [proguard] ProGuard, version 6.2.0
 [proguard] Reading program jar [/home/marthym/workspace/i-run/coffee-shell/coffees/target/coffees-1.4.0-SNAPSHOT-shaded.jar] (filtered)
 [proguard] Reading library directory [/opt/jdk-jdk-11.0.5+10/jmods] (filtered)
 [proguard] Warning: com.google.common.flogger.AbstractLogger: can't find referenced class com.google.errorprone.annotations.CheckReturnValue
 [proguard] Warning: com.google.common.flogger.FluentLogger: can't find referenced class com.google.errorprone.annotations.CheckReturnValue
 [proguard] Warning: com.google.common.flogger.LazyArg: can't find referenced class javax.annotation.Nullable
 [proguard] Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
 [proguard] Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
 [proguard] Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
 [proguard] Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
....
 [proguard]       Maybe this is library field 'java.lang.ProcessBuilder$Redirect$Type { java.lang.ProcessBuilder$Redirect$Type INHERIT; }'
 [proguard] Note: there were 9 classes trying to access annotations using reflection.
 [proguard]       You should consider keeping the annotation attributes
 [proguard]       (using '-keepattributes *Annotation*').
 [proguard]       (http://proguard.sourceforge.net/manual/troubleshooting.html#attributes)
 [proguard] Note: there were 11 classes trying to access generic signatures using reflection.
 [proguard]       You should consider keeping the signature attributes
 [proguard]       (using '-keepattributes Signature').
 [proguard]       (http://proguard.sourceforge.net/manual/troubleshooting.html#attributes)
 [proguard] Note: there were 4 unresolved dynamic references to classes or interfaces.
 [proguard]       You should check if you need to specify additional program jars.
 [proguard]       (http://proguard.sourceforge.net/manual/troubleshooting.html#dynamicalclass)
 [proguard] Note: there were 38 accesses to class members by means of reflection.
 [proguard]       You should consider explicitly keeping the mentioned class members
 [proguard]       (using '-keep' or '-keepclassmembers').
 [proguard]       (http://proguard.sourceforge.net/manual/troubleshooting.html#dynamicalclassmember)
 [proguard] Warning: there were 873 unresolved references to classes or interfaces.
 [proguard]          You may need to add missing library jars or update their versions.
 [proguard]          If your code works fine without the missing classes, you can suppress
 [proguard]          the warnings with '-dontwarn' options.
 [proguard]          (http://proguard.sourceforge.net/manual/troubleshooting.html#unresolvedclass)
 [proguard] Error: Please correct the above warnings first.

```

On peut déjà ajouter à la configuration le fait de ne pas arréter en cas de warning.

```
-dontwarn
```

A ce stade on a toujours aucun résultat, à la place un message qui nous dit qu’il faut garder quelque chose pour que ça fonctionne.

```
Error: You have to specify '-keep' options if you want to write out kept elements with '-printseeds'.
```

Il faut donner à proguard le point d’entrée du programme, dans notre cas le `main` du programme. La configuration de proguard ressemble à syntaxe java.

```
-keep class fr.irun.coffee.shell.CoffeesMainCommand {
    public static void main(java.lang.String[]);
}
```

attention il est impératif d’utiliser le nom complet des classes.

Et là on a enfin un résultat. Un résultat qui a de grandes chances de ne pas fonctionner, mais un résultat. Il faut maintenant améliorer la configuration pour que tout fonctionne.

## Les annotations

Comme proguard cherche a optimiser le code, il ne va, par défaut, pas garder les annotations. Ce qui fait que si votre code en utilise au runtime, ça ne fonctionnera plus. On va pouvoir lui dire de conserver les annotations avec cette instruction.

```
-keepattributes *Annotation*, Signature, Exception
```

Au final ça conservera un peu plus que les annotations. On va aussi conserver les types génériques des signature de méthodes et les exceptions qu’une méthode peut throw.

## L’injection de dépendances

## La gestion de plugins

## Le problème des enums

## Suppression des warning restant
