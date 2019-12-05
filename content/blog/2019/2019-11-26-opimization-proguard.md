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

```proguard
-injars       coffees/target/coffees-1.3.0-SNAPSHOT-shaded.jar(!META-INF/versions/**)
-outjars      coffees/target/coffees-1.3.0-SNAPSHOT-slim.jar
-libraryjars  <java.home>/jmods/(!**.jar;!module-info.class) # Pour Java 11
-libraryjars  <java.home>/lib/rt.jar # Pour Java 8
```

Ensuite au premier lancement, on a direct des pages et des pages de warnings et notes et proguard s’arrète en erreur. 

```log
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

On peut déjà ajouter à la configuration le fait de ne pas arréter en cas de warning.

```proguard
-dontwarn
```

A ce stade on a toujours aucun résultat, à la place un message qui nous dit qu’il faut garder quelque chose pour que ça fonctionne.

```log
Error: You have to specify '-keep' options if you want to write out kept elements with '-printseeds'.
```

Il faut donner à proguard le point d’entrée du programme, dans notre cas le `main` du programme. La configuration de proguard ressemble à syntaxe java.

```proguard
-keep class fr.irun.coffee.shell.CoffeesMainCommand {
    public static void main(java.lang.String[]);
}
```

attention il est impératif d’utiliser le nom complet des classes.

Et là on a enfin un résultat. Un résultat qui a de grandes chances de ne pas fonctionner, mais un résultat. Il faut maintenant améliorer la configuration pour que tout fonctionne.

## Les annotations

Comme proguard cherche a optimiser le code, il ne va, par défaut, pas garder les annotations. Ce qui fait que si votre code en utilise au runtime, ça ne fonctionnera plus. On va pouvoir lui dire de conserver les annotations avec cette instruction.

```proguard
-keepattributes *Annotation*, Signature, Exception
```

Au final ça conservera un peu plus que les annotations. On va aussi conserver les types génériques des signature de méthodes et les exceptions qu’une méthode peut throw.

Autre problème avec les annotations, `picocli` instancie lui-même les classes de `Command` du coup, comme pour l’injection, proguard n’a pas moyen de savoir que ces classe sont utilisé sauf si on lui demande de les conserver. Pour cela :

```proguard
-keep class picocli.CommandLine { *; }
-keep class picocli.CommandLine$* { *; }

-keepclassmembers class * extends java.util.concurrent.Callable {
    public java.lang.Integer call();
}
```

Avec les deux premières lignes on lui précise de conserver toutes les classes qui sont annotés avec `CommandLine` ou une des sous classe d'annotation. Avec le reste on lui demande de ne pas supprimer les méthode `call()` sur les classes qui hérites de `Callable`.

## L’injection de dépendances

L’injection de dépendances casse la reflection que fais proguard en remontant les classes utilisées. Comme on déclare pas explicitement l’intantiation de la classe il ne peut connaitre l’implémentation.

Pour palier ce problème, on peut ajouter cette configuration

```proguard
# Keep for class injection
-keepclassmembers class * {
    @org.codejargon.feather.Provides *;
    @javax.inject.Inject <init>(...);
    @picocli.CommandLine$Option *;
}
```

Tout ce qui est annoté `Inject` ou `Provides` (j’utilise [Feather](https://github.com/zsoltherpai/feather) pour l’injection de dépendance) est conservé en l’état, pas de changement de nom ni de suppression. Idem pour `CommandLine$Option` qui est utilisé par `picocli` pour injecter des valeurs dans les membres de classes.

### La gestion de plugins

L’injection de dépendance est utilisé pour gérer des plugins. Chaque sous-commande est un plugin qui implémente une interface de module `CoffeeModule`. La recherche des implémentation se fait via un `ServiceLoader` qui se configure avec des fichiers `META-INF/services/...` dans lesquels ont liste les implémentations. 

Si on laisse faire proguard, il va obfusquer les classes, changer les noms et du coup, la configuration de nos services ne fonctionnera pas. Pour éviter cela on ajoute les instructions suivantes :

```proguard
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

Lors de la phase d’optimisation, proguard optimize les enums en contantes d’entier, "quand c’est possible". Manifestement, quand c’est pas possible il le fait quand même. Du coup parfois on perd certaines fonctionnalités. Pour éviter que cette optimisation ne casse vos enum :

```proguard
# Fix enum problems
-keepclassmembers class * extends java.lang.Enum {
    <fields>;
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
```

## Suppression des warning restant

Arrivé à ce stade, le plus gros du travail est fait. Pour aller jusqu’au bout et finir proprement le travail, il reste a vérifier et supprimer un par un les warnings restant. C’est plus rapide que ça en a l’air !

### can't find referenced class

```log
Warning: com.google.common.flogger.LazyArg: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
Warning: com.google.common.flogger.LogContext: can't find referenced class javax.annotation.Nullable
```

Ce genre de warning ne sont pas important et peuvent être ignorés sans crainte. Il s’agit le plus souvent d’annotations utile seulement pour la compilation et dont le code se trouve dans des dépendances `provided`.

```proguard
-dontwarn org.fusesource.**
-dontwarn lombok.**
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.**
```
### accesses a declared method dynamically

C’est le gros des messages qui s’affiche. Proguard nous dit qu’il voit qu’un bout de code accède à une méthode par reflection et qu’il ne sais pas a quelle classe appartient la méthode. Et il nous liste toutes les classes possible qu’il trouve dans le classpath. Et il y en a souvent beaucoup.

```log
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

Ici, pour corriger, il faut se rendre dans le code et regarder qu’elle est la classe a qui appartient la méthode appelé par réflexion. puis le plus simple est de copier le bout de message après le `Maybe` qui correspond à la bonne classe et d’ajouter ` -keep class `.

```proguard
-keep class java.sql.DriverManager { java.sql.Connection getConnection(java.lang.String); }
```

Dans le cas des `java.time`, c’est picocli qui les utilise pour plusieurs type de classe différente. Pour les faire toutes d’un coup j'ai utiliser cette configuration

```proguard
-keep class java.time.** {
   public java.time.** parse(java.lang.CharSequence);
   public java.time.** of(java.lang.String);
}
```

Il ne renommera ni `parse` ni `of` dans les classes du package `java.time` car picocli s’en sert en reflection.

### Pour les notes restantes

Pour les quelques notes restantes qui n’impacte pas le code :

```proguard
-dontnote com.google.common.flogger.**
-dontnote com.typesafe.config.**
```

## Configuration finale

A la fin mon fichier de configuration ressemble à ça

```proguard
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