---
title: Vue.js / Spring Boot Maven Project
date: 2021-05-17
excerpt: |
    Quelques astuces pratiques pour développer et builder un projet front / back à base de Vue.js et de Spring Boot. Le tout avec une configuration Maven simple.
tags: [java, maven, vue, planetlibre]
image: top.jpg
toc: true
# comment: /s/s6d5d1/les_crit_res_de_recherche_avec_juery
---

Combien de projet se fondent sur un backend à base de Spring Boot et sur une UI à base d’Angular, de React ou de Vue.js ? Il existe des dizaines de façons d’intégrer et de releaser ce type de projet. Chaque équipe a son pipeline pour faire ça avec plus ou moins de réussite. Mais force est de constater que les outils backend sont souvent plus aboutis et plus faciles à gérer.

Voilà une façon de packager et de releaser une application mixte front/back tout en Maven.

**Attention, ce type de déploiement est valable pour des petits projets** ou des <abbr title="Prouf Of Concept">POC</abbr>, si vous avez des projets plus conséquents ou à fort trafic, il faudra étudier une solution plus appropriée, à base de nginx par exemple.

## Description du projet

On prend pour exemple un projet avec une interface en Vue.js et un backend en Spring Boot. Le front appelle la route `/api` pour tout ce qui est des appels REST. On part du principe que les outils de développement sont déjà installés: Java, Maven, Node et NPM.

Il s’agit d’un projet [Maven](https://maven.apache.org/) contenant pour l’instant deux sous-modules. Le premier pour le frontend, le deuxième pour le backend.

L’arborescence ressemble à ça :

```shell
projet
├── pom.xml
├── backend
│   ├── pom.xml
│   ├── src
│   └── target
└── frontend
    ├── dist
    ├── node_modules
    ├── package.json
    ├── package-lock.json
    ├── pom.xml
    ├── src
    ├── target
    └── vue.config.js
```

## Le développement

### Sur le backend

On prendra soin de se fixer une racine commune à toutes les API, pour le front et le back. 

Spring propose une propriété `spring.webflux.base-path` qui permet de changer le chemin de base. Mais cela impacte aussi les fichiers statiques ce qui enlève tout l’intérêt de la chose dans le cas qui nous intéresse. À la place, on peut ajouter un paramètre `myApp.base-path` et s’en servir dans les `@RequestMapping("${myApp.base-path}/`.

Ceci va permettre de configurer votre environnement de test `Vue.js`. De manière à avoir votre front qui redirige vers Spring, sans avoir à configurer le serveur back dans une variable d’environnement et sans avoir les classiques problèmes de CORS.

Autre détail, Spring sait servir des fichiers statiques, mais ce n’est sa fonction principale comme un nginx et il ne possède donc que les fonctionnalités basiques. Par exemple, il ne sait pas comprendre seul que si vous demandez `/` il faut qui vous serve `/index.html`. Pour palier ce comportement, il suffira de rajouter un filtre.

```java
@Component
public class HomePageWebFilter implements WebFilter {
    @Override
    public @NotNull Mono<Void> filter(ServerWebExchange exchange, @NotNull WebFilterChain chain) {
        if (exchange.getRequest().getURI().getPath().equals("/")) {
            return chain.filter(exchange.mutate().request(exchange.getRequest().mutate().path("/index.html").build()).build());
        }

        return chain.filter(exchange);
    }
}
```

### Sur le frontend

Dans le fichier `vue.config.js` :

```js
module.exports = {
    devServer: {
        headers: {
            "Access-Control-Allow-Origin": "*",
            https: true
        },
        proxy: {
            '^/api': {
                target: 'http://localhost:8081',
                toProxy: true,
            },
        },
    }
}
```

Attention de penser à changer le port du serveur node ou de spring, les deux sont sur `8080` par défaut.

Maintenant quand vous lancez les deux serveurs, le serveur node de test vous reverse-proxifie vers le Spring. Pour votre navigateur, plus de problème de CORS puisque tout est sur le même domaine. Vous trouverez beaucoup d’autres paramètres intéressants pour ce reverse proxy dans la documentation de [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware#http-proxy-options).

## Le packaging

Prochaine étape, il faut packager, releaser et déployer le projet. Le but n’est pas d’expliquer le fonctionnement de Maven ou de Webpack. **Mais plutôt de proposer un format simple de packaging**.

On l’a vu, **Spring est capable de servir des pages statiques**, par défaut il prend ce qui se trouve dans les répertoires suivant : `/static, /public, /resources, /META-INF/resources`.

À partir de là, **il est possible de builder la partie front du projet dans un [WebJars](https://www.webjars.org/)** pour que Spring retrouve les fichiers et les serve.

On se servira du plugin `exec-maven-plugin` pour lancer le build du front. Et du plugin `maven-resources-plugin` pour copier le résultat dans un jar. Enfin le plugin `maven-assembly-plugin` permettra de construire un `tar.gz` contenant tout le projet.

### Construction du WebJar

Dans le sous-module frontend, modifier le `pom.xml` pour lui faire exécuter le build webpack et packager dans un jar.

```xml
            <plugin>
                <groupId>org.codehaus.mojo</groupId>
                <artifactId>exec-maven-plugin</artifactId>
                <executions>
                    <execution>
                        <id>NPM Install</id>
                        <phase>generate-resources</phase>
                        <configuration>
                            <executable>npm</executable>
                            <arguments>
                                <argument>ci</argument>
                            </arguments>
                        </configuration>
                        <goals>
                            <goal>exec</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>Webpack build</id>
                        <phase>generate-resources</phase>
                        <configuration>
                            <executable>npm</executable>
                            <arguments>
                                <argument>run</argument>
                                <argument>build</argument>
                            </arguments>
                        </configuration>
                        <goals>
                            <goal>exec</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            <plugin>
                <artifactId>maven-resources-plugin</artifactId>
                <executions>
                    <execution>
                        <id>copy-resources</id>
                        <phase>process-resources</phase>
                        <goals>
                            <goal>copy-resources</goal>
                        </goals>
                        <configuration>
                            <outputDirectory>${basedir}/target/classes/META-INF/resources</outputDirectory>
                            <resources>
                                <resource>
                                    <directory>dist</directory>
                                </resource>
                            </resources>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
```

À noter qu’il peut être intéressant de modifier la configuration du clean pour supprimer aussi `node_modules` et `dist`.

```xml
            <plugin>
                <artifactId>maven-clean-plugin</artifactId>
                <configuration>
                    <filesets>
                        <fileset>
                            <directory>node_modules</directory>
                        </fileset>
                        <fileset>
                            <directory>dist</directory>
                        </fileset>
                    </filesets>
                </configuration>
            </plugin>
```

Un `mvn clean package` donnera alors un jar contenant les fichiers packagés sur frontend dans `META-INF/resources`. Cet artefact est déployable sur Maven Central, versionnable, comme n’importe quel autre jar.

## Assemblage du projet

Dans l’absolue, la partie backend n’a pas besoin de ce jar pour fonctionner, ça serait dommage de la faire en dépendre. C’est pourquoi on va ajouter au projet un sous-module `assembly` qui portera les dépendances de runtime dont entre autres l’UI que l’on vient de packager.

```shell
projet
├── assembly
│   ├── pom.xml
│   └── src                                             
│       └── main                                        
│           └── resources                               
│               └── assemblies                          
│                   └── my-project.xml  
├── pom.xml
├── backend
│   └── pom.xml
└── frontend
    ├── package.json
    └── pom.xml
```

Dans le pom de l’`assembly`, on commence par déclarer les dépendances aux projets `backend` et `frontend`, puis on déclare le plugin `maven-assembly-plugin`.

```xml
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-assembly-plugin</artifactId>
                <dependencies>
                    <dependency>
                        <groupId>${project.groupId}</groupId>
                        <artifactId>${project.artifactId}</artifactId>
                        <version>${project.version}</version>
                    </dependency>
                </dependencies>
                <executions>
                    <execution>
                        <id>make-assembly</id>
                        <phase>package</phase>
                        <goals>
                            <goal>single</goal>
                        </goals>
                        <configuration>
                            <finalName>${project.name}-${project.version}</finalName>
                            <appendAssemblyId>false</appendAssemblyId>
                            <descriptorRefs>
                                <descriptorRef>my-project</descriptorRef>
                            </descriptorRefs>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
```

Enfin, on décrit l’assemblage dans le fichier de bundle `src/main/resources/assemblies/my-project.xml`.

```xml
<assembly xmlns="http://maven.apache.org/ASSEMBLY/2.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/ASSEMBLY/2.0.0 http://maven.apache.org/xsd/assembly-2.0.0.xsd">
    <id>project-assembly</id>
    <formats>
        <format>tar.gz</format>
    </formats>
    <includeBaseDirectory>false</includeBaseDirectory>

    <dependencySets>
        <dependencySet>
            <outputDirectory>libs</outputDirectory>
            <useProjectArtifact>false</useProjectArtifact>
            <unpack>false</unpack>
            <scope>runtime</scope>
            <excludes>
                <exclude>my.project:backend</exclude>
                <exclude>my.project:frontend</exclude>
            </excludes>
        </dependencySet>
        <dependencySet>
            <useProjectArtifact>false</useProjectArtifact>
            <unpack>false</unpack>
            <scope>runtime</scope>
            <includes>
                <include>my.project:backend</include>
                <include>my.project:frontend</include>
            </includes>
        </dependencySet>
    </dependencySets>

    <fileSets>
        <fileSet>
            <fileMode>0755</fileMode>
            <directory>src/shell</directory>
            <outputDirectory/>
        </fileSet>
        <fileSet>
            <fileMode>0644</fileMode>
            <directory>src/main/resources</directory>
            <outputDirectory/>
        </fileSet>
    </fileSets>
</assembly>
```

La déclaration des exclusions dans les `dependencySet` va permettre de séparer les jars de notre projet du reste des dépendances. Mais ce n’est pas essentiel, le bundle pourrait être simplifié.

L’exécution de `mvn clean package` va permettre d’obtenir un fichier `tar.gz` avec le format suivant :

```shell
assembly-1.0.0-SNAPSHOT
├── assemblies
├── libs
├── backend-1.0.0-SNAPSHOT.jar
└── frontend-1.0.0-SNAPSHOT.jar
```

`libs` contient tout le reste des dépendances du backend. De cette manière le front est inclus dans le projet, il est interchangeable. Il est possible d’en mettre plusieurs versions différentes ou de faire varier l’assemblage pour déployer le même backend avec un frontend différent.

Pour finir, il ne reste plus qu’à lancer la commande suivante depuis le répertoire du projet décompressé et ça fonctionne. Spring sert le front et les api sans problème.

```shell
/opt/jdk-jdk-11.0.9.1+1/bin/java -server -cp "*:.:libs/*" my.projet.BackendApplication
```
