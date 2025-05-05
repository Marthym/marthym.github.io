---
title: Database access through SSH in Java
slug: java-database-connection-through-ssh
date: 2024-08-15
modified: 2025-05-05
summary: |
    Learn how to connect to a remote database through SSH in Java using Apache MINA SSHD. Secure your JDBC connections with SSH tunneling and key-based authentication. Ideal for Spring Boot integration.
categories: [database, development]
tags: [jdbc, ssh, java]
image: featured-jdbc-through-ssh.webp
# toc: true
# comment: /s/oqfrne/wifi_android_et_freebox_v6
---

As part of a project, I needed to access a remote database not accessible over the Internet. To access it, a <abbr title="Secure SHell">SSH</abbr> connection is required with a bounce through the bastion. And it's not possible to put my application inside the network. The chosen solution is to open a <abbr title="Secure SHell">SSH</abbr> connection and to route <abbr title="Java DataBase Connectivity">JDBC</abbr> connections through this <abbr title="Secure SHell">SSH</abbr> connection.

## How it works

To access a database through an SSH tunnel, you need to open a connection between your machine and the SSH server. You then need to create a port forwarding from your machine to the database port on the server, so that JDBC connections can pass through. Finally, you'll need to configure the JDBC client to connect to the redirected ports on your machine (`localhost`) rather than those on the server.

However, **if performance is your main concern, this mode of operation is not really recommended**. SSH introduces significant latency in the time it takes to establish a connection and encrypt traffic. In return, all database traffic is now encrypted.

{{< figimg src="network-schema.png" alt="Sample network diagram" credit="Draw.io" >}}

## Choice of SSH library

Originally, [JSch](http://www.jcraft.com/jsch/) was the only java library that could handle SSH connections in java. For a long time, this library was the only “pure java” alternative for handling SSH connections. But it has not been maintained since 2016, and many of the new features introduced in the java language have not been exploited, such as `java.nio`.

Although JSch is still widely used in many softwares and libs, there are now alternatives:

* [SSHJ](https://github.com/hierynomus/sshj)
* [Apache MINA](https://mina.apache.org/mina-project/)
* [Maverick Synergy Java SSH API](https://github.com/sshtools/maverick-synergy)
* [SSHAPI](https://github.com/sshtools/sshapi)

The following code will use **[Apache MINA SSHD](https://mina.apache.org/sshd-project/)**. This lib has the necessary features (Port Forward, ProxyJump and Ed25519 key management). For professional use, this is a valid choice, as the Apache foundation behind it ensures a certain sustainability of the library and guarantees Open Source use.

## SSH security

Best practice in SSH connection security strongly encourages **abandoning user/password identification in favor of key identification**. Private/public key pairs are more flexible, harder to steal and impossible to guess.

When generating your key pair, there are several best practices to consider:

* the generation algorithm
* the key password

For the algorithm, recent systems (January 2014) **prefer [Ed25519](https://fr.wikipedia.org/wiki/EdDSA)** keys. Generated from an elliptic curve algorithm. It produces keys that are more secure and shorter than RSA.

And even if it's not mandatory, **protecting the private key with a password is strongly recommended**. Especially since most operating systems have a keychain mechanism that unlocks keys when the user logs on, so you don't have to type in the key's password every time you need to use it.

In short, to generate your key :

```shell
sh-keygen -t ed25519 -C "your_email@example.com"
```

## The Code

We'll start by importing the necessary libraries :

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

The `eddsa` library can handle `Ed25519` keys, which are not supported by default. RSA keys are supported by default and require no additional import.

Next, we start by creating an SSH client.

```java
var sshClient = SshClient.setUpDefaultClient();
```

Enter the key's password if it is protected.

```java
sshClient.setFilePasswordProvider(FilePasswordProvider.of(sshProperties.keysPassword()));
```

Start the SSH client.

```java
sshClient.start();
```

For now, the client is just initializing. No connection has yet been attempted.

We'll now configure the connection to the remote host:

```java
HostConfigEntry sshHostEntry = new HostConfigEntry();
sshHostEntry.setHost(connexionProperties.url().getHost());
sshHostEntry.setHostName(InetAddress.getByName(connexionProperties.url().getHost()).getHostAddress());
sshHostEntry.setPort(connexionProperties.url().getPort());
sshHostEntry.setUsername(connexionProperties.url().getUserInfo());
sshHostEntry.appendPropertyValue("ForwardAgent", "yes");
sshHostEntry.setProxyJump(jump);
```

Since we need to bounce through the bastion before reaching the database server, we need to add the agent transfer and configure the `ProxyJump`. The `jump` variable is [configured as the corresponding SSH variable](https://man.freebsd.org/cgi/man.cgi?ssh_config(5)).

```java
String jump = "<user>@<jumpserver>:<port>";
```

Next, create a session:

```java
ClientSession session = sshClient.connect(sshHostEntry)
        .verify(SSH_TIMEOUT.toMillis())
        .getSession();

session.auth().verify(SSH_TIMEOUT);
```

We now have an open session on which we have successfully authenticated. The `verify` command verifies that the previous step has been successful. They contact the server and check that the connection has been established and that authentication has been successful. The timeout avoids waiting in a vacuum if the server doesn't respond (for example, if a firewall drops packets).

Be careful **not to be too stingy on the timeout**, as verification operations can take some time depending on the state of the network. I've had random errors with timeouts of 3 seconds.

Finally, we redirect the database port. This is equivalent to the `-L 15432:database.server.fr:5432` option in the `ssh` command. It redirects the `15432` port on the local machine to the `5432` port on the `database.server.fr` machine. `database.server.fr` isn't necessarily the machine you're connected to via SSH. On the other hand, it's a domain name that can be accessed from the machine you're connected to via SSH.

```java
var portForward = "15432:database.server.fr:5432".split(":");
SshdSocketAddress remote = new SshdSocketAddress(portForward[1], Integer.parseInt(portForward[2]));
session.startLocalPortForwarding(Integer.parseInt(portForward[0]), remote);
```

The port redirection is effective. From here, **it's possible to open a JDBC connection** to `jdbc:postgresql://localhost:15432/database`. Note the host: we won't be using the database host, but `localhost`, whose port is redirected.

### Closing the connection
Of course, once you've finished connecting to the database, **it's important to release the redirected port and close the connection** with the SSH server.

```java
session.close();
sshClient.stop();
```

## Integration with Spring

It's perfectly possible to **integrate this system into a Spring Boot application**. Even using Spring's default `datasource`. To do this, we include the above code in a `@Bean` that we declare in a `@Configuration` class as follows:

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

This means that Spring will wait until the SSH connection has been established before connecting the DataSource. And if your `SshPortsForwards` bean has a `close` or `shutdown` method that closes SSH connections, it will be executed on Spring's shutdown.

All the code is [available on this gist](https://gist.github.com/Marthym/ee1000de48762535a19ead1a7511cb0b).

## Conclusion

Establish an SSH connection, redirect a port and pass database connections through. This is not very complex with recent libraries and can provide an additional layer of security, since all communications are encrypted. What's more, it can help you avoid the need for a VPN, which is more costly and complex to set up than an SSH server.
