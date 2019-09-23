---
title: Javadoc aggrégée avec diagrammes
date: "2019-09-22T10:55:00+02:00"
excerpt: "Générer une Javadoc multi-module avec diagrammes"
tags: [java, documentation, javadoc, programmation, planetlibre]
image: back.png
draft: true
---

Quand on fait du micro-service il est important de s’inquiéter assez tôt de la documentation. Au début c’est plus une lourdeur qu’autre chose, le code change souvent et on passe plus de temps à tenir la documentation à jour que le code. Mais rapidement, quand l’équipe va grossir, on va se rendre compte que les nouveaux arrivants payent un cout d’entrée important face à la quantité de code non documenté. Pire, sur les parties de code un peu complexe, on va se retrouver avec de la prorpiété.

La difficulté quand on fait du micro-service c’est d’aggréger cette documentation pour que la javadoc de l’ensemble de modules se rassemble à un seul endroit. De plus, une bonne documentation s’aggrément de diagrammes et schémas explicatifs, autre difficulté. 

## Javadoc aggrégée

Le principe est simple, on génère un jar de source pour tous les projets et, dans le projet d’aggrégatin, on demande de générer la javadoc des dépendences aussi. Voilà ce que ça donne en terme de configuration Maven.

### Dans les modules sources

```xml
<plugin>
    <artifactId>maven-source-plugin</artifactId>
    <version>${maven-source-plugin.version}</version>
    <executions>
        <execution>
            <id>bundle-sources</id>
            <phase>package</phase>
            <goals>
                <goal>jar-no-fork</goal>
            </goals>
        </execution>
    </executions>
</plugin>

```

On indique au `maven-source-plugin` de packager les sources pour qu’elles soient accessible au projet d'aggrégation.

### Dans le projet d’aggrégation

C’est le projet qui va dépendre de tous les autres projets. Dans notre cas c’est un sous-module `javadoc` dans un projet de déploiement. Il ne contient aucun source mais dépend de tous les autres modules. Notre sous-module `javadoc` n’a qu’un pom.xml :

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-javadoc-plugin</artifactId>
    <executions>
        <execution>
            <id>javadoc-jar</id>
            <phase>package</phase>
            <goals>
                <goal>javadoc</goal>
            </goals>
            <configuration>
                <groups>
                    <group>
                        <title>Module 1</title>
                        <packages>fr.irun.review.*</packages>
                    </group>
                    <group>
                        <title>Module 2</title>
                        <packages>fr.irun.cronos.*</packages>
                    </group>
                </groups>
                <doclint>none</doclint>
                <includeDependencySources>true</includeDependencySources>
                <dependencySourceIncludes>
                    <!-- include ONLY dependencies I control -->
                    <dependencySourceInclude>fr.irun:*</dependencySourceInclude>
                </dependencySourceIncludes>
            </configuration>
        </execution>
    </executions>
</plugin>
```

Les points important là dedans c’est `includeDependencySources` à **true** qui demande au `maven-javadoc-plugin` de générer la javadoc pour les dependences en plus des sources du projet. Et `dependencySourceIncludes` qui permet de limiter les dépendences qui vont être générées aux sources de nos projets. Dans le répertoire `target/site` ce trouve la javadoc complète de tous nos projets.

## Ajouter les diagrammes

Pour ajouter des diagrammes c’est un peu la même chose. Nous voulions que les diagrammes soient simple à maintenir, dans l’idéal, les mettre à coté de la doc dans laquelle il apparaissent semble être une bonne idée. [PlantUML](http://plantuml.com/fr/) répond bien a notre besoin, on déclare le diagramme avec un code dans ce genre :

```java
/*
@startuml doc-files/bob-and-alice.png
Bob -> Alice : hello
@enduml
*/
/**
 * <h3>Un jolie titre pour ma doc</h3>    <!-- -->
 *
 * <img src="doc-files/bob-and-alice.png" alt="bob-and-alice.png">
 */
```

Code que l’on commitera et versionnera dans nos dépôts. Il ne reste plus qu’à l’inclure dans la javadoc.

Plusieurs choses à noter sur le code précédent :

* Le code des diagrammes se met avant la javadoc pour évité que checkstyle ne se plaigne de dangling javadoc.
* On place les fichiers dans `doc-files` c'est un standard javadoc. On utilise un chemain relatif.

### Dans les modules sources

Les diagrammes doivent être généré dans le modules source. Le `maven-javadoc-plugin` est capable de générer des jars de type `javadoc-resources` qui contiennent les images de diagramme générés.

On modifit le pom comme suit :

```xml
 <plugin>
    <groupId>com.github.jeluard</groupId>
    <artifactId>plantuml-maven-plugin</artifactId>
    <version>${plantuml-maven-plugin.version}</version>
    <configuration>
        <sourceFiles>
            <directory>${basedir}/src/main/java</directory>
            <includes>
                <include>**/*.java</include>
            </includes>
        </sourceFiles>
    </configuration>
    <executions>
        <execution>
            <id>plantuml-javadoc</id>
            <goals>
                <goal>generate</goal>
            </goals>
            <phase>generate-sources</phase>
            <configuration>
                <outputDirectory>${project.build.directory}/plantuml</outputDirectory>
            </configuration>
        </execution>
    </executions>
    <dependencies>
        <dependency>
            <groupId>net.sourceforge.plantuml</groupId>
            <artifactId>plantuml</artifactId>
            <version>${plantuml.version}</version>
        </dependency>
    </dependencies>
</plugin>
```

Le `plantuml-maven-plugin` va générer les images de diagrammes à partir du code  `plantuml` trouvé dans les fichiers `**/*.java` et déposera les images dans `target/plantuml`. 

A noter qu’il est possible mais pas obligatoire de spécifier la version de plantUML à utiliser. La version par défaut est plutôt ancienne donc je conseillerais de préciser une version plus récente.

**Attention**, le `plantuml-maven-plugin` dépend de [GraphViz](https://www.graphviz.org/) qui doit être installer sur la machine où dans le docker qui fait la génération des images.

Ensuite on ajoute dans les modules source le `maven-javadoc-plugin` pour packager les images :

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-javadoc-plugin</artifactId>
    <version>${maven-javadoc-plugin.version}</version>
    <configuration>
        <javadocDirectory>${project.build.directory}/plantuml</javadocDirectory>
    </configuration>
    <executions>
        <execution>
            <id>javadoc-generate</id>
            <goals>
                <goal>resource-bundle</goal>
            </goals>
            <phase>package</phase>
        </execution>
    </executions>
</plugin>
```

On préciser au plugin de prendre les ressources dans `target/plantuml`. A la suite de ces modifications, `mvn clean package` produit un jar supplémentaire `javadoc-resources`.

### Dans le projet d’aggrégation

Pas grand chose, il faut juste dire au `maven-javadoc-plugin` d’aller chercher les resources dans le sous-dossier `doc-files` dans les dépendences.

```xml
<!-- Include images from dependencies doc-files -->
<docfilessubdirs>true</docfilessubdirs>
```
Le plugin récupère tout seul les jars `javadoc-resources` et inclus les diagrammes dans la javadoc. 
