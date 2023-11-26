---
title: Optimisation de jar avec Proguard
date: 2019-12-05
modified: 2021-02-04
excerpt: "Comment optimiser la taille d’un jar avec proguard"
categories: [développement]
tags: [java, proguard, devtools]
toc: true
image: back.webp
comment: /s/j6xvnq/optimisation_de_jar_avec_proguard
---

Il y a quelque temps, j’ai vu cette [vidéo de Nicolas Peters](https://www.youtube.com/watch?v=8ENbMwkaFyk) à Devoxx qui parlait de [picocli] et des applications en ligne de commande java. Chez [i-Run] on a de gros besoins en outillage DevOps pour nos nouveaux projets et du coup on a eu envie de tester picocli pour développer quelques outils.

Cela fonctionne bien, mais au fil du temps et des dépendances, le binaire a pris du poids et, même en limitant les dépendances au strict minimum, le jar fait 1,2 Mo aujourd’hui (c’est que le début). On a donc cherché un moyen de limiter la taille du binaire pour qu’il reste facile à déployer sur les machines qui en ont besoin et que l’emprunte mémoire soit la plus réduite possible. On est naturellement arrivé à [Proguard].

> Merci à [Jesse](https://community.guardsquare.com/u/Jesse) de [GuardSquare](https://community.guardsquare.com/) pour la [traduction anglaise](https://community.guardsquare.com/t/jar-optimization-with-proguard/488)

## Proguard

Proguard est bien connu dans le cadre d’Android pour sa capacité à réduire et surtout offusquer le code. Mais on y pense moins dans le cadre de projets java standard. Pourtant, il répond parfaitement au besoin qu’on a chez [i-Run].

Le problème, c'est que Proguard n’est pas un outil intuitif et qu’il est assez facile de casser son build avec. D’autant que la plupart des explications ou des exemples, présent sur internet, portent sur des projets Android.

Je vous propose de voir la configuration que l’on a mise en place chez [i-Run] pour notre outil.

### Les principes

Proguard va optimiser un jar en passant par plusieurs phases de traitement qu’il est important de comprendre. 

**shrink**: Qui va élaguer tout ce qui n’est pas utilisé dans cotre code.<br/>
**optimize**: Qui va aller un peu plus loin en supprimant le code mort et les paramètres de méthodes par exemple.<br/>
**obfuscate**: Qui va renommer les noms de classes, de méthodes, de membres, ... et réduire leurs noms au minimum (une lettre ou deux).<br/>

Et là on comprend la puissance de l’outil, mais aussi les problèmes que l’on va rencontrer !

### Le résultat

Finalement, avec l’optimisation et l’offuscation, le binaire est passé de 1.2 Mo à 668 Ko soit plus de **50%** de la taille initiale.

## Description du projet

Le projet sur lequel on va appliquer proguard est un outil en ligne de commande. On y limite les dépendances au maximum pour contrôler la taille du jar final. L’application est packagé sous forme d’un Uber jar via le plugin maven shade.

On utilise donc 

* [picocli] pour parser la ligne de commande
* [flogger] pour les logs
* [feather] pour l’injection de dépendance
* [type-safe/config] pour la gestion des configurations
* [nano-json] pour la lecture et l’écriture de json

## Première tentative

Déjà la configuration minimum pour que ça fonctionne, il faut indiquer où se trouvent les librairies avec `-libraryjars` et l’entrée/sortie `-injars -outjars`. 

```PkgConfig
-injars       coffees/target/coffees-1.3.0-SNAPSHOT-shaded.jar(!META-INF/versions/**)
-outjars      coffees/target/coffees-1.3.0-SNAPSHOT-slim.jar
-libraryjars  <java.home>/jmods/(!**.jar;!module-info.class) # Pour Java 11
-libraryjars  <java.home>/lib/rt.jar # Pour Java 8
```

Le premier lancement affiche des pages et des pages de warnings et de notes pour se terminer en erreur.

```plain
ProGuard, version 6.2.0
Reading program jar [/home/marthym/workspace/i-run/coffee-shell/coffees/target/coffees-1.4.0-SNAPSHOT-shaded.jar] (filtered)
Reading library directory [/opt/jdk-jdk-11.0.5+10/jmods] (filtered)
Warning: com.google.common.flogger.AbstractLogger: can't find referenced class com.google.errorprone.annotations.CheckReturnValue
Warning: com.google.common.flogger.FluentLogger: can't find referenced class com.google.errorprone.annotations.CheckReturnValue
Warning: com.google.common.flogger.LazyArg: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
....
      Maybe this is library field 'java.lang.ProcessBuilder$Redirect$Type { java.lang.ProcessBuilder$Redirect$Type INHERIT; }'
Note: there were 9 classes trying to access annotations using reflection.
      You should consider keeping the annotation attributes
      (using '-keepattributes *Annotation*').
      (http://proguard.sourceforge.net/manual/troubleshooting.html#attributes)
Note: there were 11 classes trying to access generic signatures using reflection.
      You should consider keeping the signature attributes
      (using '-keepattributes Signature').
      (http://proguard.sourceforge.net/manual/troubleshooting.html#attributes)
Note: there were 4 unresolved dynamic references to classes or interfaces.
      You should check if you need to specify additional program jars.
      (http://proguard.sourceforge.net/manual/troubleshooting.html#dynamicalclass)
Note: there were 38 accesses to class members by means of reflection.
      You should consider explicitly keeping the mentioned class members
      (using '-keep' or '-keepclassmembers').
      (http://proguard.sourceforge.net/manual/troubleshooting.html#dynamicalclassmember)
Warning: there were 873 unresolved references to classes or interfaces.
         You may need to add missing library jars or update their versions.
         If your code works fine without the missing classes, you can suppress
         the warnings with '-dontwarn' options.
         (http://proguard.sourceforge.net/manual/troubleshooting.html#unresolvedclass)
Error: Please correct the above warnings first.

```

On peut déjà ajouter à la configuration le fait de ne pas arrêter en cas de warning.

```PkgConfig
-dontwarn
```

À ce stade on n'a toujours aucun résultat, à la place un message qui nous dit qu’il faut garder quelque chose pour que ça fonctionne.

```plain
Error: You have to specify '-keep' options if you want to write out kept elements with '-printseeds'.
```

Il faut donner à proguard le point d’entrée du programme, dans notre cas le `main` du programme. La configuration de proguard ressemble à la syntaxe de java.

```PkgConfig
-keep class fr.irun.coffee.shell.CoffeesMainCommand {
    public static void main(java.lang.String[]);
}
```

Attention, il est impératif d’utiliser le nom complet des classes.

Cette fois on a enfin un résultat. Un résultat qui a de grandes chances de ne pas fonctionner, mais un résultat. Il faut maintenant améliorer la configuration pour que tout fonctionne.

## Les annotations

Comme proguard cherche à optimiser le code, il ne va, par défaut, pas garder les annotations. Ce qui fait que si votre code en utilise au runtime, ça ne fonctionnera plus. On va pouvoir lui dire de conserver les annotations avec cette instruction.

```PkgConfig
-keepattributes *Annotation*, Signature, Exception
```

Finalement proguard conservera un peu plus que les annotations. Il va aussi conserver les types génériques des signatures de méthodes et les exceptions qu’une méthode peut throw.

Autre problème avec les annotations, [picocli] instancie lui-même les classes de `Command` du coup, comme pour l’injection, proguard n’a pas moyen de savoir que ces classes sont utilisées sauf si on lui demande de les conserver. Pour cela :

```PkgConfig
-keep class picocli.CommandLine { *; }
-keep class picocli.CommandLine$* { *; }

-keepclassmembers class * extends java.util.concurrent.Callable {
    public java.lang.Integer call();
}
```

Avec les deux premières lignes on lui précise de conserver toutes les classes qui sont annotés avec `CommandLine` ou une des sous-classes d’annotation. Avec le reste on lui demande de ne pas supprimer les méthodes `call()` sur les classes qui héritent de `Callable`.

## L’injection de dépendances

L’injection de dépendances casse la réflexion que fait proguard en remontant les classes utilisées. Comme on ne déclare pas explicitement l’instanciation de la classe il ne peut connaître l’implémentation.

Pour palier ce problème, on peut ajouter cette configuration

```PkgConfig
# Keep for class injection
-keepclassmembers class * {
    @org.codejargon.feather.Provides *;
    @javax.inject.Inject <init>(...);
    @picocli.CommandLine$Option *;
}
```

Tout ce qui est annoté `Inject` ou `Provides`, pour l’injection de dépendance, est conservé en l’état, pas de changement de nom ni de suppression. Idem pour `CommandLine$Option` qui est utilisé par [picocli] pour injecter des valeurs dans les membres de classes.

### La gestion de plugins

L’injection de dépendance est utilisé pour gérer des plugins. Chaque sous-commande est un plugin qui implémente une interface de module `CoffeeModule`. La recherche des implémentations se fait via un `ServiceLoader` qui se configure avec des fichiers `META-INF/services/...` dans lesquels on liste les implémentations.

Si on laisse faire proguard, il va offusquer les classes, changer les noms et du coup, la configuration de nos services ne fonctionnera pas. Pour éviter cela on ajoute les instructions suivantes :

```PkgConfig
# Keep class used for plugin management
-keepnames class fr.irun.coffee.swizzle.plugin.CoffeeModule
-keepnames class * implements fr.irun.coffee.swizzle.plugin.CoffeeModule
-keep class * implements fr.irun.coffee.swizzle.plugin.CoffeeModule {
    java.util.List getModuleCommands();
}
```

Dans l’ordre :

 * On ne change pas les noms de CoffeeModule
 * On ne change pas les noms des classes qui implémentent CoffeeModule
 * On ne change pas le nom des méthodes d’interface de CoffeeModule

## Le problème des enums

Lors de la phase d’optimisation, proguard optimise les enums en constantes d’entier, “quand c’est possible”. Manifestement, quand ce n'est pas possible il le fait quand même. Du coup parfois on perd certaines fonctionnalités. Pour éviter que cette optimisation ne casse vos enum :

```PkgConfig
# Fix enum problems
-keepclassmembers class * extends java.lang.Enum {
    <fields>;
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
```

## Suppression des warnings restant

Arrivé à ce stade, le plus gros du travail est fait. Pour aller jusqu’au bout et finir proprement le travail, il reste à vérifier et supprimer, un par un, les warnings restant. C’est plus rapide que ça en a l’air !

### can't find referenced class

```plain
Warning: com.google.common.flogger.LazyArg: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
```

Ce genre de warning ne sont pas importants et peuvent être ignorés sans crainte. Il s’agit le plus souvent d’annotations utiles seulement pour la compilation et dont le code se trouve dans des dépendances `provided`.

```PkgConfig
-dontwarn org.fusesource.**
-dontwarn lombok.**
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.**
```
### accesses a declared method dynamically

C’est le gros des messages qui s’affiche. Proguard nous dit qu’il voit qu’un bout de code accède à une méthode par réflexion et qu’il ne sait pas à quelle classe appartient la méthode. Il nous liste alors toutes les classes candidates qu’il trouve dans le classpath. Et il y en a souvent beaucoup.

```plain
Note: picocli.CommandLine$Interpreter accesses a declared method 'parse(java.lang.CharSequence)' dynamically
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$5 { java.util.Date parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$5 { java.lang.Object parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$6 { java.io.File parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$6 { java.lang.Object parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$7 { java.net.URL parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$7 { java.lang.Object parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$8 { java.net.URI parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$8 { java.lang.Object parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$9 { java.lang.Class parse(java.lang.CharSequence); }'
      Maybe this is library method 'com.sun.xml.internal.bind.v2.model.impl.RuntimeBuiltinLeafInfoImpl$9 { java.lang.Object parse(java.lang.CharSequence); 
...
      Maybe this is library method 'java.time.Duration { java.time.Duration parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.Instant { java.time.Instant parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.LocalDate { java.time.LocalDate parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.LocalDateTime { java.time.LocalDateTime parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.LocalTime { java.time.LocalTime parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.MonthDay { java.time.MonthDay parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.OffsetDateTime { java.time.OffsetDateTime parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.OffsetTime { java.time.OffsetTime parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.Period { java.time.Period parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.Year { java.time.Year parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.YearMonth { java.time.YearMonth parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.ZonedDateTime { java.time.ZonedDateTime parse(java.lang.CharSequence); }'
      Maybe this is library method 'java.time.format.DateTimeFormatter { java.time.temporal.TemporalAccessor parse(java.lang.CharSequence); }'
```

Ici, pour corriger, il faut se rendre dans le code et regarder qu’elle est la classe a qui appartient la méthode appelée par réflexion. Puis le plus simple est de copier le bout de message après le `Maybe` qui correspond à la bonne classe et d’ajouter ` -keep class `.

```PkgConfig
-keep class java.sql.DriverManager { java.sql.Connection getConnection(java.lang.String); }
```

Dans le cas des `java.time`, c’est [picocli] qui les utilise pour plusieurs types de classe différente. Pour les faire toutes d’un coup on peut utiliser cette configuration

```PkgConfig
-keep class java.time.** {
   public java.time.** parse(java.lang.CharSequence);
   public java.time.** of(java.lang.String);
}
```

Il ne renommera ni `parse` ni `of` dans les classes du package `java.time`, car [picocli] s’en sert en réflexion.

### Pour les notes restantes

Pour les quelques notes restantes qui n’impacte pas le code :

```PkgConfig
-dontnote com.google.common.flogger.**
-dontnote com.typesafe.config.**
```

## Configuration finale

À la fin le fichier de configuration ressemble à ça

```PkgConfig
-injars       coffees/target/coffees-1.3.0-SNAPSHOT-shaded.jar(!META-INF/versions/**)
-outjars      coffees/target/coffees-1.3.0-SNAPSHOT-slim.jar

# For java 10+
#-libraryjars  <java.home>/jmods/java.base.jmod(!**.jar;!module-info.class)
-libraryjars  <java.home>/lib/rt.jar
#-dontobfuscate
-optimizationpasses 5
-printmapping coffeer.map
-keepattributes *Annotation*, Signature, Exception

# Need to fix bug in proguard prio than 6.2
#-optimizations !code/allocation/variable # Fix bug with VTL

# Keep for class injection
-keepclassmembers class * {
    @org.codejargon.feather.Provides *;
    @javax.inject.Inject <init>(...);
    @picocli.CommandLine$Option *;
}

# Keep classes for picocli command line parsing
-keep class picocli.CommandLine { *; }
-keep class picocli.CommandLine$* { *; }
-keep class fr.irun.coffee.shell.CoffeesMainCommand {
    public static void main(java.lang.String[]);
}
-keepclassmembers class * extends java.util.concurrent.Callable {
    public java.lang.Integer call();
}

# Keep class used for plugin management
-keepnames class fr.irun.coffee.swizzle.plugin.CoffeeModule
-keepnames class * implements fr.irun.coffee.swizzle.plugin.CoffeeModule
-keep class * implements fr.irun.coffee.swizzle.plugin.CoffeeModule {
    java.util.List getModuleCommands();
}

# Fix enum problems
-keepclassmembers class * extends java.lang.Enum {
    <fields>;
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# jline dynamic
-keep class java.lang.ProcessBuilder$Redirect { java.lang.ProcessBuilder$Redirect INHERIT; }
-keep class java.time.** {
    public java.time.** parse(java.lang.CharSequence);
    public java.time.** of(java.lang.String);
}
-keep class java.sql.DriverManager { java.sql.Connection getConnection(java.lang.String); }
-keep class java.sql.DriverManager { java.sql.Driver getDriver(java.lang.String); }
-keep class java.nio.file.Paths { java.nio.file.Path get(java.lang.String,java.lang.String[]); }
-keep class java.io.Console { char[] readPassword(java.lang.String,java.lang.Object[]); }
-keep class java.lang.reflect.Parameter { java.lang.String getName(); }

-dontnote com.google.common.flogger.**
-dontnote com.typesafe.config.**
-dontnote jline.OSvTerminal
-dontnote picocli.CommandLine$Help$Ansi
-dontnote java.time.**
-dontnote java.sql.DriverManager
-dontnote java.nio.file.Paths
-dontnote java.io.Console
-dontnote java.lang.reflect.Parameter
-dontnote java.lang.ProcessBuilder$Redirect
-dontnote fr.irun.coffee.modules.**
-dontnote fr.irun.coffee.shell.helpers.GitlabTokenValidator
-dontnote javax.inject.Provider
-dontnote fr.irun.coffee.swizzle.options.GitlabConfigOptions
-dontnote fr.irun.coffee.swizzle.config.Configuration

-dontwarn org.fusesource.**
-dontwarn lombok.**
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.**

```

[picocli]: https://picocli.info
[flogger]: https://google.github.io/flogger/
[feather]: https://github.com/zsoltherpai/feather
[type-safe/config]: https://github.com/lightbend/config
[nano-json]: https://github.com/mmastrac/nanojson
[Proguard]: https://www.guardsquare.com/en/products/proguard
[i-Run]: https://blog.i-run.si/
