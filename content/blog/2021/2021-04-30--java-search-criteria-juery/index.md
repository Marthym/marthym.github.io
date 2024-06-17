---
title: Les Critères de recherche avec Juery
date: 2021-05-01
modified: 2024-06-17
summary: |
    Juery est une librairie java permettant de gérer simplement des critères de filtre et de recherche ainsi que de la pagination
    dans vos api REST sans JPA. A l'aide de diverses implementation de Visiteur, il est très facile de décliner les Critères Juery en Query jOOQ ou Mongo.
categories: [development]
tags: [java, jpa, librairy]
image: featured-juery-java-lib-for-criteria-query.webp
toc: true
comment: /s/s6d5d1/les_crit_res_de_recherche_avec_juery
---

Chaque fois que j’entreprends un nouveau projet, que ce soit professionnel ou perso, il y a des bouts de code que l’on ré-écrit chaque fois. L’api de critère de recherche et de filtre en fait partie. Bien sur il existe des librairies notamment dans Spring qui sont prêtent à l’emploi, mais **toutes ou presque se basent sur JPA**. Ce qui, quand on n'utilise pas <abbr title="Java Persistence API">JPA</abbr>, impose une quantité de dépendances inutiles à embarquer dans votre build.

De ce constat est née **[Juery](https://github.com/Marthym/juery)**.

> **Edit: 17 juin 2024**:
>
> Sortie de la version 1.4.0
>
>  * Utilisation des records
>  * Ajout d'un module MongoDB

## Description

`Juery` est une librairie java. L’idée est de rester le plus simple possible et aussi le plus extensible possible. L’api se compose d’un ensemble de classes permettant de créer des jeux de critères pour la recherche ou le filtrage de vos entités. `juery-api` s’utilise de manière “fluent".

```java
import fr.ght1pc9kc.juery.api.Criteria;

Criteria.property("jedi").eq("Obiwan")
    .and(Criteria.property("age").gt(40)
    .or(Criteria.property("age").lt(20)));
```

`juery-api` dispose aussi d’une classe permettant de manipuler de la pagination.

```java
import fr.ght1pc9kc.juery.api.PageRequest;
import fr.ght1pc9kc.juery.api.pagination.Direction;
import fr.ght1pc9kc.juery.api.pagination.Order;
import fr.ght1pc9kc.juery.api.pagination.Sort;

PageRequest.builder()
    .page(2).size(100)
    .filter(Criteria.property("profile").eq("jedi").and(Criteria.property("job").eq("master")))
    .sort(Sort.of(new Order(Direction.ASC, "name"), new Order(Direction.DESC, "email")))
    .build();
```

L’interface `Criteria` dispose d’un `Visitor` qui va permettre de transformer vos critères en n’importe quoi. Par exemple en **QueryString** ou en **Predicate** ou encore en **`Condition` [jOOQ](https://www.jooq.org/)** que vous pourrez utiliser dans vos requêtes.

Le package `juery-basic` fournit des implémentations de base de ce `Visitor` pour extraire les critères sous forme de liste ou pour transformer un objet `Criteria` en query string ou en chaîne de caractères.

Le package `juery-jooq` fournit des implémentations relatives à la librairie [jOOQ](https://www.jooq.org/) comme un `Visitor` qui transforme un objet `Criteria` en `Condition`. Ce package est dépendant de la librairie jOOQ.

## Installation

L’api fait *30 kb* et ne dépend de rien, donc très léger si vous surveillez le poids de votre application. La version **1.4.0** pour tous les packages est disponible sur Maven Central.

```xml
<dependency>
    <groupId>fr.ght1pc9kc</groupId>
    <artifactId>juery-api</artifactId>
    <version>1.4.0</version>
</dependency>
<dependency>
    <groupId>fr.ght1pc9kc</groupId>
    <artifactId>juery-basic</artifactId>
    <version>1.4.0</version>
</dependency>
<dependency>
    <groupId>fr.ght1pc9kc</groupId>
    <artifactId>juery-jooq</artifactId>
    <version>1.4.0</version>
</dependency>
<dependency>
    <groupId>fr.ght1pc9kc</groupId>
    <artifactId>juery-mongo</artifactId>
    <version>1.4.0</version>
</dependency>
```

ou pour gradle

```gradle
compile "fr.ght1pc9kc:juery-api:1.4.0"
compile "fr.ght1pc9kc:juery-basic:1.4.0"
compile "fr.ght1pc9kc:juery-jooq:1.4.0"
compile "fr.ght1pc9kc:juery-mongo:1.4.0"
```

## Utilisation

Prenons comme exemple une application Spring dans le contrôleur qui gère un CRUD d’entités :

```java
import fr.ght1pc9kc.juery.basic.PageRequestFormatter;

@GetMapping
public Flux<Feed> list(@RequestParam Map<String, String> queryStringParams) {
    return feedService.list(PageRequestFormatter.parse(queryStringParams))
            .onErrorMap(BadCriteriaFilter.class, e -> new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getLocalizedMessage()));
}
```

`PageRequestFormatter` va donc transformer la query string en `PageRequest` qui contient un `Criteria`. Selon votre architecture, l’objet va traverser les couches jusqu’à la persistance. Il pourra être enrichi au passage grâce aux méthodes `with` qui créent un nouvel objet enrichi. **Toute l’api est strictement immutable**.

### Filtrage

Dans la couche de persistance on va pouvoir utiliser les `Visitor` comme suit.

```java
import fr.ght1pc9kc.juery.jooq.filter.JooqConditionVisitor;

private static final JooqConditionVisitor JOOQ_CONDITION_VISITOR =
        new JooqConditionVisitor(PropertiesMappers.FEEDS_PROPERTIES_MAPPING::get);

```

L’implémentation `JooqConditionVisitor` prend en entrée une `Function<String, Field<?>>` qui va permettre de transformer les propriétés de vos critères, c’est-à-dire les noms des champs, en `Field` jOOQ correspondant aux colonnes de vos tables. 

Dans l’exemple au-dessus, `PropertiesMappers.FEEDS_PROPERTIES_MAPPING` est une `Map<String, Field<?>` rempli avec les `Field` issues de la génération du <abbr title="Domain Specific Language">DSL</abbr>. Ensuite dans ma fonction de liste.

```java
import fr.ght1pc9kc.juery.api.Criteria;
import fr.ght1pc9kc.juery.api.PageRequest;

// transformation du Criteria présent dans pageRequest en Condition
Condition conditions = pageRequest.filter.visit(JOOQ_CONDITION_VISITOR);

// Exécution de la requête avec les conditions générées par le visiteur
Cursor<Record> cursor = dsl
    .select(FEEDS.fields()).select(FEEDS_USERS.FEUS_TAGS)
        .from(FEEDS)
        .leftJoin(FEEDS_USERS).on(FEEDS_USERS.FEUS_FEED_ID.eq(FEEDS.FEED_ID))
        .where(conditions).fetchLazy();

```

### Pagination

L’objet `PageRequest` contient les informations nécessaires à la pagination. Vous pouvez l’implémenter vous-même, mais pour les utilisateurs de jOOQ, l’objet `JooqPagination` vient vous faciliter la tâche.

```java
import fr.ght1pc9kc.juery.api.Criteria;
import fr.ght1pc9kc.juery.api.PageRequest;

// transformation du Criteria présent dans pageRequest en Condition
Condition conditions = pageRequest.filter.visit(NEWS_CONDITION_VISITOR);

// Application des paramètres de pagination à la requête
final Select<Record> query = JooqPagination.apply(pageRequest, PropertiesMappers.FEEDS_PROPERTIES_MAPPING, dsl
    .select(FEEDS.fields()).select(FEEDS_USERS.FEUS_TAGS)
        .from(FEEDS)
        .leftJoin(FEEDS_USERS).on(FEEDS_USERS.FEUS_FEED_ID.eq(FEEDS.FEED_ID))
        .where(conditions)
);

Cursor<Record> cursor = query.fetchLazy();
```

On retrouve le `PropertiesMappers.FEEDS_PROPERTIES_MAPPING`, optionnel qui permet de faire le lien entre les critères de tri et les champs de tables.

### Le visiteur (du futur)

Comme évoqué plus haut, `juery` est développé autour d’une api proposant un modèle de représentation de critères. Ce **modèle afin d’être réutilisable dans une majorité de cas**, propose un `Visitor` simple à étendre. Dans le package `juery-basic` quelques implémentations simples et indépendantes sont proposés, mais **l’objectif de `juery` est de s’adapter** à tous que l’on peut rencontrer. Il est donc fortement conseillé d’utiliser le `Visitor` pour adapter `juery` à votre besoin.

```java
interface Visitor<R> {
    R visitNoCriteria(NoCriterion none);

    R visitAnd(AndOperation operation);

    R visitNot(NotOperation operation);

    R visitOr(OrOperation operation);

    <T> R visitEqual(EqualOperation<T> operation);

    <T> R visitGreaterThan(GreaterThanOperation<T> operation);

    <T> R visitLowerThan(LowerThanOperation<T> operation);

    default <T> R visitIn(InOperation<T> operation) {
        throw new IllegalStateException("IN operation not implemented in visitor");
    }

    default <T> R visitValue(CriterionValue<T> value) {
        throw new IllegalStateException("Value not implemented in visitor");
    }
}
```

En implémentant ce `Visitor` il est possible de transformer un ensemble de `Criteria` en n’importe quoi. Par exemple en `Predicate<Entity>` qui va pouvoir filtrer une liste d’`Entity`. 

```java
public class PredicateSearchVisitor<E> implements Criteria.Visitor<Predicate<E>> {
    // L’utilisation de jackson ets pratique ici pour simplifier l’exemple 
    // Mais on peut surement faire mieux.
    private final ObjectMapper mapper = new ObjectMapper()
            .findAndRegisterModules();
}
```

Si pas de critère on retourne toujours vrai

```java
@Override
public Predicate<E> visitNoCriteria(NoCriterion none) {
    return n -> true;
}
```

Pour un opérateur && on visite les deux opérandes et on vérifie que les deux soient vrais.

```java
@Override
public Predicate<E> visitAnd(AndOperation operation) {
    return n -> operation.andCriteria.stream()
            .map(a -> a.visit(this))
            .allMatch(a -> a.test(n));
}
```

Pour une négation on visite l’opérande et on l’inverse

```java
@Override
public Predicate<E> visitNot(NotOperation operation) {
    return n -> !operation.negative.visit(this).test(n);
}
```

Pour un opérateur && on visite les deux opérandes et on vérifie que l’une des deux est vraie.

```java
@Override
public Predicate<E> visitOr(OrOperation operation) {
    return n -> operation.orCriteria.stream()
            .map(a -> a.visit(this))
            .anyMatch(a -> a.test(n));
}
```

Pour un opérateur in, on visite chacune des valeurs et on vérifie qu’au moins une soit vrai, c’est un or.

```java
@Override
public <T> Predicate<E> visitIn(InOperation<T> operation) {
    return n -> {
        Map<String, Object> json = mapper.convertValue(n, new TypeReference<>() {
        });
        Object o = json.get(operation.field.property);
        if (o == null) return true;
        else return operation.value.value.stream().anyMatch(o::equals);
    };
}
```

Pour une égalité on vérifie qu’elle soit vraie. C’est là qu’il faut mapper le nom du critère avec un champ de la classe. On utilise jackson on pourrait faire de la reflection.

```java
@Override
public <T> Predicate<E> visitEqual(EqualOperation<T> operation) {
    return n -> {
        Map<String, Object> json = mapper.convertValue(n, new TypeReference<>() {
        });
        Object o = json.get(operation.field.property);
        if (o == null) return true;
        else return o.equals(operation.value.value);
    };
}
```

Idem pour plus grand que...

```java
@Override
public <T> Predicate<E> visitGreaterThan(GreaterThanOperation<T> operation) {
    return n -> {
        Map<String, Comparable<T>> json = mapper.convertValue(n, new TypeReference<>() {
        });
        Comparable<T> o = json.get(operation.field.property);
        if (o == null) return true;
        else return o.compareTo(operation.value.value) > 0;
    };
}
```

...et pour plus petit que.

```java
@Override
public <T> Predicate<E> visitLowerThan(LowerThanOperation<T> operation) {
    return n -> {
        try {
            Field field = n.getClass().getDeclaredField(operation.field.property);
            Object o = field.get(n);
            if (o == null || !o.getClass().isAssignableFrom(Comparable.class)) return true;
            else return ((Comparable<T>) o).compareTo(operation.value.value) < 0;
        } catch (NoSuchFieldException | IllegalAccessException e) {
            log.trace("Field '{}' not found in {}", operation.field.property, n);
            return true;
        }
    };
}
```

On note que dans cette implémentation, la visite d’une valeur n’est pas implémentée, elle n’est pas nécessaire.

## Contributions

C’est tout Open Source bien-sur, sous licence MIT et les sources du projet sont disponible sur [github](https://github.com/Marthym/juery).

Toute contribution et critique (constructive) sont les biens venus.

N’hésitez pas à l’essayer et à me faire part de vos avis.
