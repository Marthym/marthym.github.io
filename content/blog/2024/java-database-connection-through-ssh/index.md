---
title: Accès base de données au travers de SSH en Java
slug: java-database-connection-through-ssh
date: 2024-08-15
summary: |
    Comment accéder à une base de données avec JDBC au travers d’une connexion SSH. Qua cela soit pour des questions de sécurité ou pour des raisons pratique, il peut être nécessaire d’accéder à une base de données au travers d’une connexion SSH, voilà comment faire en java.
categories: [database, development]
tags: [jdbc, ssh, java]
image: featured-jdbc-through-ssh.webp
# toc: true
# comment: /s/oqfrne/wifi_android_et_freebox_v6
---

Dans le cadre d’un projet, j’ai eu besoin d’accéder à une base de données distante, non accessible sur internet. Pour y accéder, une connexion <abbr title="Secure SHell">SSH</abbr> est nécessaire avec un rebond par le bastion. Et impossible de mettre mon application à l’intérieur du réseau. La solution choisie est d’ouvrir une connexion <abbr title="Secure SHell">SSH</abbr> et de faire transiter les connexions <abbr title="Java DataBase Connectivity">JDBC</abbr> au travers de cette connexion <abbr title="Secure SHell">SSH</abbr>.

## Principe de fonctionnement

Pour se connecter à une base de données via SSH, il est nécessaire d’ouvrir une connexion SSH, pour de faire une redirection de port de votre machine locale vers la machine distante sur laquelle vous êtes connectée. Ensuite, au lieu de configurer JDBC avec le nom et le port de la machine distante, il faut le configurer sur `localhost` et le port local que vous venez de rediriger. Ainsi les communications vers la base de données vont transiter au travers de la connexion SSH.

Attention, **si la performance est votre problématique principale, ce mode de fonctionnement n’est pas vraiment conseillé**. SSH introduit une latence importante le temps d’établir la connexion et pour chiffrer le trafic. En contre-partie, tout le trafic avec la base de données est maintenant chiffré.

{{< figimg src="network-schema.png" alt="Schéma exemple du réseau" credit="Draw.io" >}}

## Choix de la librairie SSH

À l’origine était [JSch](http://www.jcraft.com/jsch/), la seule librairie java permettant de manipuler des connexions SSH en java. Cette librairie est restée pendant longtemps la seule alternative "pure java" qui permettait de manipuler des connexions SSH. Mais elle n’est plus maintenue depuis 2016 et beaucoup de nouveautés introduites dans le langage java ne sont pas exploitées, comme, par exemple, `java.nio`.

Même si encore aujourd’hui JSch est encore grandement utilisée dans beaucoup de soft et de lib, il existe maintenant des alternatives :

* [SSHJ](https://github.com/hierynomus/sshj)
* [Apache MINA](https://mina.apache.org/mina-project/)
* [Maverick Synergy Java SSH API](https://github.com/sshtools/maverick-synergy)
* [SSHAPI](https://github.com/sshtools/sshapi)

Le code qui suit utilisera **[Apache MINA SSHD](https://mina.apache.org/sshd-project/)**. La lib possède les fonctionnalités nécessaires (Port Forward, ProxyJump et gestion des clés Ed25519). Pour un usage professionnel, il s’agit d’un choix valable, la fondation Apache derrière assure une certaine pérennité de la librairie et garanti un usage Open Source.


## Sécurité SSH

Les bonnes pratiques en matière de sécurité des connexions SSH encouragent fortement à **abandonner l’identification via utilisateur / mot de passe au profit de l’identification par clés**. Les couples de clés privées/publiques permettent plus de souplesse et sont plus difficile à dérober et impossible à deviner.

Lors de la génération de votre paire de clés, plusieurs bonnes pratiques sont à prendre en compte :

* l’algorithme de génération
* le mot de passe de la clé

Pour l'algorithme, les systèmes récents (janvier 2014 tout de même) **préfèrent les clés [Ed25519](https://fr.wikipedia.org/wiki/EdDSA)**. Générées à partir d’un algorithme à courbe elliptique. Il produit des clés plus sécurisées et plus courte que RSA.

Et même si cela n’est pas obligatoire, **protéger la clé privée par un mot de passe est fortement recommandé**. D’autant plus que la plupart des systèmes d’exploitation possède un mécanisme de trousseau permettant de déverrouiller les clés lors de la connexion de l’utilisateur qui vous évite d’avoir à taper le mot de passe de la clé chaque fois que vous devez l’utiliser.

Bref pour générer votre clé : 

```shell
sh-keygen -t ed25519 -C "your_email@example.com"
```

## Code

On va commencer par importer les librairies nécessaires :

```xml
  <properties>
    <sshd-core.version>2.13.1</sshd-core.version>
    <eddsa.version>0.3.0</eddsa.version>
  </properties>
  
  <dependencies>
      <dependency>
          <groupId>org.apache.sshd</groupId>
          <artifactId>sshd-core</artifactId>
          <version>${sshd-core.version}</version>
      </dependency>
      <dependency>
          <groupId>net.i2p.crypto</groupId>
          <artifactId>eddsa</artifactId>
          <version>${eddsa.version}</version>
          <scope>runtime</scope>
      </dependency>
  </dependencies>
```

La librairie `eddsa` permet de gérer les clés Ed25519 non prises en charge par défaut. Les clés RSA elles sont prises en charge par défaut et ne nécessitent pas d'import supplémentaire.

Ensuite on commence par créer un client SSH.

```java
var sshClient = SshClient.setUpDefaultClient();
```

On renseigne le mot de passe de la clé si elle est protégée.

```java
sshClient.setFilePasswordProvider(FilePasswordProvider.of(sshProperties.keysPassword()));
```

On démarre le client SSH.
```java
sshClient.start();
```

Pour l’instant, le client ne fait que s’initialiser. Aucune connexion n’a encore été tentée.

On va maintenant configurer la connexion vers l’hôte distant :

```java
HostConfigEntry sshHostEntry = new HostConfigEntry();
sshHostEntry.setHost(connexionProperties.url().getHost());
sshHostEntry.setHostName(InetAddress.getByName(connexionProperties.url().getHost()).getHostAddress());
sshHostEntry.setPort(connexionProperties.url().getPort());
sshHostEntry.setUsername(connexionProperties.url().getUserInfo());
sshHostEntry.appendPropertyValue("ForwardAgent", "yes");
sshHostEntry.setProxyJump(jump);
```

Comme nous avons besoin de faire un rebond par le bastion avant d’arriver au serveur de base de données, il faut ajouter le transfert de l’agent et configurer le `ProxyJump`. La variable `jump` se [configure comme la variable SSH correspondante](https://man.freebsd.org/cgi/man.cgi?ssh_config(5)).

```java
String jump = "<user>@<jumpserver>:<port>";
```

Il faut ensuite créer une session :

```java
ClientSession session = sshClient.connect(sshHostEntry)
        .verify(SSH_TIMEOUT.toMillis())
        .getSession();

session.auth().verify(SSH_TIMEOUT);
```

On a maintenant une session ouverte sur laquelle on s’est authentifié avec succès. Le `verify` permettent de vérifier que l’étape précédente s’est bien passé. Ils vont contacter le serveur et vérifier que la connexion est bien établie et que l’authentification est effective. Le timeout évite d’attendre dans le vide si le serveur ne répond pas (par exemple si un firewall droppe les packets).

Attention de **ne pas être trop radin sur le timeout**, les opérations de vérification peuvent prendre un peu de temps selon l’état du réseau. J’ai eu des erreurs aléatoires avec des timeout de 3 secondes.

Pour finir, on redirige le port de la base de données. C’est l’équivalent de l’option `-L 15432:database.serveur.fr:5432` de la commande `ssh`. On redirige le port `15432` de la machine locale vers le port `5432` de la machine `database.serveur.fr`. `database.serveur.fr` n’est pas nécessairement la machine sur laquelle vous êtes connecté en SSH. Par contre, c’est un nom de domaine qui est accessible depuis la machine sur laquelle vous êtes connecté en SSH.

```java
var portForward = "15432:database.serveur.fr:5432".split(":");
SshdSocketAddress remote = new SshdSocketAddress(portForward[1], Integer.parseInt(portForward[2]));
session.startLocalPortForwarding(Integer.parseInt(portForward[0]), remote);
```

La redirection de port est effective. À partir de là, **il est possible d’ouvrir une connexion JDBC** vers `jdbc:postgresql://localhost:15432/database`. Remarquez l’hôte, on n’utilisera pas l’hôte de la base de données, mais `localhost` dont le port est redirigé.

### Fermeture de la connexion
Bien sur, une fois les connexions avec la base de données terminées, **il est important de libérer le port redirigé et de fermer la connexion** avec le serveur SSH.

```java
session.close();
sshClient.stop();
```

## Intégration avec Spring

Il est tout à fait possible d’**intégrer ce système dans un Spring**. Même en utilisant la `datasource` par défaut de Spring. Pour cela, on inclut le code précédent dans un `@Bean` que l’on déclare dans une classe de `@Configuration` comme suit :

```java
@Configuration
public class DatabaseConfiguration {

    @Bean
    public SshPortsForwards configureSshPortsForwards(SshProperties sshProperties) {
        return new SshPortsForwards(sshProperties);
    }

    @Bean("dataSource")
    @DependsOn("configureSshPortsForwards")
    public DataSource getDatasource(DataSourceProperties properties) {
        return adminDataSourceProperties.initializeDataSourceBuilder().build();
    }
}
```

Ainsi Spring attendra d’avoir établi la connexion SSH avant de connecter la DataSource. Et si votre bean `SshPortsForwards` possède une méthode `close` ou `shutdown` qui ferme les connexions SSH, elle sera exécutée lors du shutdown de Spring.

Tout le code est [disponible sur ce gist](https://gist.github.com/Marthym/ee1000de48762535a19ead1a7511cb0b).

## Conclusion

Établir une connexion SSH, rediriger un port et faire transiter les connexions de base de données au travers. Cela n’est pas très complexe avec les librairies récentes et cela peut apporter une couche de sécurité supplémentaire puisque toutes les communications sont chiffrées. De plus, cela peut permettre de s’éviter un VPN, plus couteux et complexe à mettre en place qu’un serveur SSH.
