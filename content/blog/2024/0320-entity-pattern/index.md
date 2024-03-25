---
title: Le pattern Entité et la gestion des méta-données
slug: entity-pattern
date: 2024-03-24
summary: |
    Un des problèmes les plus couramment rencontré est le problèmes de la gestion des entité ou objets dans le code d'une application. Où mettre la barre entre les DOA, les DTO, les POJO, ... avec ou sans identifiant, mutable ou immutable. Voici un possible façon de traiter cette question.
categories: [development]
tags: [java, architecture]
image: featured-entity-pattern.webp
toc: true
comment: /s/s2evgi/le_pattern_entit_et_la_gestion_des_m_ta_donn
---

Il est des problèmes que tous les développeurs avec un peu d'expérience a forcément rencontré dans sa carrière. Parmi eux la question de la différence entre les objets persisté et les usuels de vos services.

> Je vous présente ici un cheminement d’idées qui vaut ce qu’il vaut. Il n’a absolument pas vocation à être le meilleur, ni même meilleur ou pire qu’un autre. Servez-vous en, ou pas, comme d’une base pour vos propres idées. Et n’hésitez pas à me les partager.

## DAO, DTO, POJO
Fut un temps, la "mode" ou du moins la pratique courante était d'embarquer la logique dans les Objets métier. Les <abbr title="Data Access Object">DAO</abbr> contenaient, en plus des données métiers, les méthodes et la logique métier voire, la persistance. Je parle d’un temps que les moins de 20 ans, ...

De nos jours, les applications plus récentes ont une approche orientée Service, des classes instancier en Singleton, ne contenant pas de données mais, contenant toute la logique d'un domaine métier et des <abbr title="Plain Old Java Object">POJO</abbr> qui contiennent la donnée. Cette approche est d'ailleurs particulièrement mise en avant avec les `Record` de Java 14 qui rajoutent l'immutabilité aux POJO pour obtenir des `Value Object`.

## La problématique de l'identifiant
On en vient donc à la problématique que l'on rencontre très souvent pour ne pas dire dans toutes les applications dès que l'on a à faire une <abbr title="Create Read Update Delete">CRUD</abbr> et à un stockage.

**Comment gérer l’identifiant de ces objets ?**

Lorsque que votre application crée une entité et souhaite la persister. Pendant un certain laps de temps le code manipule l’entité qui n’a pas d’identifiant, jusqu’à ce qu’elle soit persisté et qu’elle obtienne alors un ID permettant de la retrouver parmi les autres dans le stockage.

L’identifiant pourrait lui être assigné dès sa création, ce qui réglerait la question et parfois cette solution est la meilleure. Mais bien souvent, **la génération de l’identifiant doit rester un détail d’implémentation dont la couche métier n’a pas à avoir connaissance**. La génération peut être liée à une séquence de la base de données (pas la meilleure solution, mais des fois cela peu aider). La génération peut aussi être une méthode générique, indépendante du métier. Dans ces cas, le métier qui construit l’objet entité ne s’occupe pas de lui fournir un identifiant.

On va alors se retrouver avec **des entités qui ont, ou non, une donnée identifiant**.

Une façon courante d’aborder le problème est d’avoir un champ `id` sur l’entité qui est `Nullable`. Mais on rentre dans l’enfer de devoir tester la nullité à chaque utilisation ce qui est très lourd. 
> Surtout **n’utilisez jamais un `Optional` pour gérer la nullité** d’un identifiant. Plus généralement, il ne faut pas utiliser ’Optional’ pour gérer la nullité des propriétés de vos objets de données. C’est très inadapté, ’Optional’ se sérialise très mal que ce soit en JSON ou en binaire, et vous aller alourdir considérablement vos objets. `Optional` ne doit être utilisé que pour gérer les résultats de méthode et éviter qu’elles retournent `null`. 

De plus cela ne s’accorde pas très bien avec l’immutabilité puisqu’à un moment on va muter l’objet pour lui assigner son identifiant.

L’autre manière fréquente de gérer ce cas est l’utilisation de <abbr title="Data Transfert Object">DTO</abbr> qui portent l’identifiant. L’entité est alors traitée par deux objets jumeaux l’un avec identifiant pour la couche de persistance, un sans pour la couche de service. Mais cette stratégie n’est pas très efficace sur les architectures orientées métier. Elle implique beaucoup de traitements de conversion d’un type à l’autre. Voire elle fait transiter des objets de persistance au travers de la couche métier.

## Composition d’une entité

Une des solutions de j’aime bien est la composition d’entité. C’est assez élégant et très fonctionnel sur des architectures immutables. Par contre, c'est un peu verbeux et possiblement un peu complexe à sérialiser/désérialiser.

On décrit une classe `Entity` générique qui est composée d’un identifiant et de l’objet métier correspondant. 

> Alors non, cela n’est pas une `Pair`. Effectivement pour les "aficionados" de la paire, on n’est pas loin et cela pourrait fonctionner, mais vous perdriez la lisibilité de votre code.
> 
> [Les `Pair`, c’est mal](http://mail.openjdk.java.net/pipermail/core-libs-dev/2010-March/003973.html).

En termes de code, cela pourrait donner quelque chose comme ça :

```java
public final class Entity<T> {
    public final String id;
    public final T self;

    public Entity(String id, T self) {
        this.id = id;
        this.self = self;
    }
}

// Ou la version record

public record Entity<T>(String id, T self) {}
```

L’avantage de cette stratégie est qu’il n’est plus nécessaire de muter ou de mapper les objets, on passe de l’un à l’autre très facilement.

En revanche la sérialisation est moins esthétique. Si on perd le JSON par exemple, on s’attend coté front à récupérer les objets sous cette forme :

```json
{
    "id": "66",
    "name": "Kylo Ren Light Saber",
    "color": "RED",
    "blade": 3
}
```

Or avec l’entité composé, on aura plutôt ça :

```json
{
    "id": "66",
    "self": {
        "name": "Kylo Ren Light Saber",
        "color": "RED",
        "blade": 3
    }
}
```

Cela fonctionne, mais c’est moins sexy et moins sympa à manipulé coté front. 

Pour améliorer la sérialisation, on va faire appel à Jackson (ou une autre lib). 

```java
@JsonPropertyOrder({"id", "self"})
public abstract class EntityJacksonMixin {
    @JsonProperty("_id")
    public String id;

    @JsonUnwrapped
    public Object self;
}
```

L’usage d’un `Mixin` Jackson permet de "flatten" l’entité et de fournir au front un objet plus simple à manipuler tout en conservant la composition côté backend.

Pour la désérialisation, si elle est nécessaire, c’est plus compliqué, [le code est dispo sur github](https://github.com/Marthym/entity/blob/1.0.1/entity-jackson/src/main/java/fr/ght1pc9kc/entity/jackson/serializer/EntityDeserializer.java).

## Gestion des méta données
On remarquera dans le bout de code précédent l’ajout d’un `_` devant le nom du champ `id`. En effet, si on réfléchit à la sémantique de l’objet `Entity`, quel est son objectif ? Porter l’identifiant, mais l’identifiant, une fois que l’on a admis qu’il n’est **pas de la responsabilité du métier**, n’est rien de plus qu’**une méta donnée comme une autre** que le métier a besoin de connaître ou de transmettre à un moment ou à un autre, mais qui ne peut pas être modifié par l’utilisateur. L’`_` peut servir de repère dans les entités sérialisées pour reconnaître les champs qui ne sont pas modifiables.

Sur ce principe, on va pouvoir ajouter d’autres données comme la date de création d’un objet et l’identifiant de l’utilisateur qui l’a créé. Cela peut être très utile si vous avez besoin de tracer les entités.

```java
public record Entity<T>(
    String id, 
    Instant createdAt,
    String createdBy,
    T self
) {}
```

Il suffit de faire évaluer le mixin en fonction et on obtiendra des objets sérialisés comme suit :

```json
{
    "_id": "66",
    "_createdAt": "2024-03-23T17:12:42Z",
    "_createdBy": "US42",
    "name": "Kylo Ren Light Saber",
    "color": "RED",
    "blade": 3
}
```

Cette écriture va bien fonctionner un temps, mais présente plusieurs problématiques. D’abord, tous les objets `Entity` ont les mêmes métas donnés. Renseignées ou nulles mais ils ont tous les mêmes. Ensuite, chaque fois que l’on souhaite ajouter une donnée, c’est tous les objets qui sont impactés. Cela va être très difficile à maintenir. Cependant, si votre application est simple et que vous avez un besoin de métas limité, c’est probablement la meilleure façon de faire.

Pour résoudre les problèmes de cette dernière version, la solution classique est de faire en sorte que les métas ne soient plus des propriétés mais une `Map` de clé/valeur. Nouveau problème, les `Map` sont parmi les structures les plus lourdes du langage. En mettre partout pour gérer des métas qui seront potentiellement vide est clairement contre productif.

Néanmoins, les `EnumMap` sont relativement efficientes et pourraient être une bonne alternative. En plus, cela impose de définir un type `Enum` pour chaque type d’objet et donc de décrire pour chaque objet les métas qu’il peut contenir.

La nouvelle version ressemblerait donc à ça :

```java
public record Entity<E extends Enum<E>, T>(
    String id, 
    EnumMap<E, Object> metas,
    T self
) {}
```

Les métas sont gérés, de manière optimale et la classe `Entity` est suffisamment générique pour être utilisée sur tous les objets d’une application. Mais **elle pourrait être améliorée**. La création d’une telle entité est devenue très verbeuse et franchement pas esthétique. On se retrouve avec 2 éléments de généricité et cela n’aide pas vraiment l’usage. Et, dans le cas des entités qui n’ont pas de métas données, on paye le coup du Map, ou de sa nullité qui nous obligera à tester à chaque utilisation.

## L’entité scellée

Afin de simplifier l’utilisation des entités, nous pouvons ajouter une interface qui va masquer la complexité des objets qui se trouvent derrière.

```java
public sealed interface Entity<T> permits BasicEntity, ExtendedEntity {
    String id();

    <M> Optional<M> meta(Enum<?> property, Class<M> type);

    default Optional<String> meta(Enum<?> property) {
        return meta(property, String.class);
    }

    T self();

    static <T> BasicEntityBuilder<T> identify(@NotNull T entity) {
        return new BasicEntityBuilder<>(Objects.requireNonNull(entity, "Self entity must not be null !"));
    }
}
```

Cette interface est scellée afin de ne pouvoir être implémenté que par la forme basique de l’entité ou la forme étendue. La forme basique ne contient que l’identifiant alors que la forme étendue contient l'identifiant et une `EnumMap` de métas données. De cette façon, pour les entités basiques, qui n’ont pas de métas, on ne paye pas le surcoût de l’EnumMap, ni dans la structure ni dans l’utilisation.

Enfin, deux builders vont permettrent de masquer la complexité de la création de ces objets. La méthode statique `identify` sert d’amorçage à la création. Le choix du builder est fait en fonction de s’il y a ou non des métas à ajouter.

```java
public final class BasicEntityBuilder<T> {
    private final T self;

    public BasicEntityBuilder(T self) {
        this.self = self;
    }

    public <E extends Enum<E>> ExtendedEntityBuilder<T, E> meta(E property, Object value) {
        if (value == null) {
            return new ExtendedEntityBuilder<>(self, property.getDeclaringClass());
        }
        if (property instanceof TypedMeta typed && !typed.type().isAssignableFrom(value.getClass())) {
            throw new IllegalArgumentException("Value type "
                    + value.getClass() + "incompatible with "
                    + typed.type() + " from " + property.getClass());
        }
        return new ExtendedEntityBuilder<>(self, property.getDeclaringClass())
                .meta(property, value);
    }

    public Entity<T> withId(@NotNull String id) {
        Objects.requireNonNull(id, "ID is mandatory for Entity !");
        return new BasicEntity<>(id, this.self);
    }
}
```

L’entité est donc créée de la façon suivante :

```java
Entity.identify("May the force").withId("4TH");

Entity.identify("May the force")
    .meta(MetaEnum.createdBy, "Yoda")
    .meta(MetaEnum.createdAt, "2024-03-23T17:12:42Z")
    .withId("4TH");
```

La version définitive est disponible sous forme d’une [micro librairie sur github](https://github.com/Marthym/entity) et publiée sur [MavenCentral](https://central.sonatype.com/artifact/fr.ght1pc9kc/entity).

La librairie contient aussi de quoi sérialisé et désérialiser les entités grâce à Jackson. Les annotations de mixin ne sont plus vraiment suffisantes et une [feature/bug dans Jackson empêche d’utiliser le polymorphisme et les wrapped entity en même temps](https://github.com/FasterXML/jackson-databind/issues/81).

## Conclusion

Cette stratégie n’est bien sur pas parfaite, par exemple on perd le type de l’enum en utilisant l’interface. Mais elle est fonctionnelle et vraiment pratique à utiliser. De plus ce schéma s’adapte à beaucoup d’usages, je m’en suis servi dans presque tous mes projets, personneles comme professionnels. C’est ce que j’utilise en particulier pour [Baywatch](https://bw.ght1pc9kc.fr/).

N’hésitez pas à tester, avec ou sans la lib et faites-moi vos retours, je suis curieux.
