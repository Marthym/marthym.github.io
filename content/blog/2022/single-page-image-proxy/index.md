---
title: Image proxy et performance d’une SPA
date: 2022-11-19
# modified: 2021-11-04
summary: |
    Imaginons que l’on travaille sur une application Web SAP (single page application) qui traite avec des galleries d’images et que cette
    application soit progressive avec des formats mobiles et desktop différents. Comment gérer mes images pour les afficher au mieux sur tous les supports. Une solution possible est de mettre en place un proxy d’images.
categories: [SEO]
tags: [seo, performance, spring, baywatch]
image: featured-single-page-image-proxy.webp
toc: true
comment: /s/rah3k2/image_proxy_et_performance_d_une_spa
---

## L’histoire

Mon projet perso du moment est un agrégateur de news pour faciliter la veille techno. On ne va pas s’étendre sur l’utilité ou l’intérêt de développer une application de ce genre alors qu’il en existe plein d’autres, cela fera l’objet d’un prochain article. D’autant que ce projet me sert surtout de "bac à sable" pour expérimenter des technos avant de les faire implémenter au boulot.

{{< figimg src="responsive_application.svg" float="left" alt="Application de veille responsive" >}}
Cette application affiche donc des listes de news avec l’image [OpenGraph](https://ogp.me/ "Open Graph metas headers (en)") correspondante si elle est renseignée dans les métas. L’application est responsive et je l’utilise sur mobile avec parfois des débits très faibles.

Les images affichées par l’application sont directement les liens extraits des balises `og:image` (plus ou moins nettoyés quand même) ce qui est pratique puisque cela évite d’avoir à gérer le stockage des images. Par contre, quand j’analyse les performances de l’application, l'outil d’analyse m’explique que **ce n’est pas optimal de télécharger une image de 5 Mo pour l’affiche en 400x400 sur mobile**. Car oui, certains sites (beaucoup même), diffusent des `og:image` pointant vers des fichiers volumineux.

C’est le début de la réflexion pour améliorer la performance de cette application.

## Gérer les images externes

Plusieurs options pour régler ce problème très connu :

* Développer un système au sein de l’application qui va retailler les images au format optimal pour l’affichage.
* Passer par un <abbr title="Content Delivery Network">CDN</abbr> *(genre Akamai)* qui possède ce genre de fonctionnalités.
* Utiliser un proxy d’image qui fait le travail.

### Développer un système de redimensionnement d’image

{{< figimg src="developer_activity.svg" float="right" alt="La mauvaise idée" >}}
Clairement la plus mauvaise des trois options !\
**C’est un travail plus complexe qu’il n’y parait**, et ce n’est pas la valeur ajouter de l’application, même si cette dernière sert de bac à sable pour l’expérimentation. 

Étonnamment, c’est une solution souvent mise en œuvre. Plébiscitée par les développeurs qui apprécieront ce genre de développement un peu sympa à faire. Mais dès qu’il faudra le maintenir c’est une autre histoire. Autre effet trompeur, cette solution paraît gratuite aux yeux de la direction en comparaison avec un <abbr title="Content Delivery Network">CDN</abbr> beaucoup plus onéreux.

Donc ne vous laissez pas tenter par ce genre de solution, sauf bien-sûr si c’est votre cœur de métier !

### Passer par un <abbr title="Content Delivery Network">CDN</abbr>

En effet, la pluspart des <abbr title="Content Delivery Network">CDN</abbr> du marché fournissent ce genre de services. Cependant, il y a plusieurs incovénients :

* C’est **couteûx**, je ne saurais pas donner un ordre de prix, mais l’option n’est pas gratuite en général.
* Si c’est vous qui produisez vos images, il faudra quand même qu’elles soient téléchargées par le <abbr title="Content Delivery Network">CDN</abbr> avant d’être redimensionnées puis servies. Cela coûte en bande passante.

C’est cependant une solution à prendre en compte selon votre usage et vos moyens. Dans le cas de notre application de veille techno, c’est trop cher (comme tout ce qui n’est pas gratuit).

## Utiliser un proxy d’image

Dans le cas de l’application qui nous intéresse, c’est le meilleur ratio qualité / prix. Je suis tombé par hasard sur [imgproxy](https://imgproxy.net/ "imgproxy Optimize images for web on the fly (en)"). Les fonctionnalités proposées par la version Open Source remplissent tous les besoins de l’application.

* **Traitement des images à la volée**, c’était la base
* Support des formats web [AVIF](https://fr.wikipedia.org/wiki/AVIF) et [WebP](https://fr.wikipedia.org/wiki/WebP), avec [autodétection du support navigateur](https://docs.imgproxy.net/configuration?id=avifwebp-support-detection "imgproxy AVIF/WebP support detection (en)")
* Support des formats animés
* **[Signature des URL](https://docs.imgproxy.net/signing_the_url "Signing the URL for imgproxy (en)")** pour éviter que des utilisateurs mal intentionnés ne chargent les serveurs (c’est là que vous réalisez que faire le code vous-même était ambitieux)
* Utilisation de [presets](https://docs.imgproxy.net/presets "Preset feature description (en)")
* Détection des objets pour recadrer les images
* S’installe avec un simple docker

Il y en a encore beaucoup d’autres, et encore plus sur la version entreprise.

## Mise en place d’imgProxy

{{< figimg src="optimize_image.svg" float="left" alt="imgproxy" >}}
La mise en place est vraiment simple. Le plus compliqué est de signer les URLs et il y a toute une [liste d’exemples de code](https://github.com/imgproxy/imgproxy/tree/master/examples "Examples for signing URL for imgproxy (en)") pour un peu tous les langages, montrant la marche à suivre.<br/>
<br/>

Une approche est de laisser le front générer l’URL de l’image optimisée en fonction de ses besoins. Mais **cette approche ne permet pas de signer les URL de manière fiable** vu que la signature se fait à partir d’une clé privée. Et ça laisserait trop de libertés sur la manipulation des liens. En termes de sécurité, c’est déconseillé.

C’est donc **le backend qui va construire le lien proxyfié** pour le front, à la demande.

### Dans le code

L’application est basée sur Spring Boot (dernière version), s’appuie sur une [architecture hexagonale](https://fr.wikipedia.org/wiki/Architecture_hexagonale) et utilise [GraphQL](https://graphql.org/ "GraphQL framework (en)") le transport des données entre le front et le backend. La liste des articles à afficher se fait via une requête dont voilà le schéma simplifié :

```gql
type News {
    id: ID!
    title: String
    image: String
    description: String
    publication: String
    link: String
}

extend type Query {
    newsSearch(): [News]
}
```

Coté Spring, un controller sert de resolver pour cette query :

```java
@Controller
@RequiredArgsConstructor
public class GraphQLNewsController {
    private final NewsService newsService;

    @QueryMapping
    @PreAuthorize("permitAll()")
    public Flux<News> newsSearch(@Arguments SearchNewsRequest request) {
        PageRequest pageRequest = qsParser.parse(request.toPageRequest());
        return newsService.list(pageRequest);
    }
}
```

### Contraintes à respecter

Afin de conserver l’application la plus optimale possible on se fixe les contraintes suivantes :

* Si le front ne demande pas d’image optimisée, **on n’exécute pas de code supplémentaire**
* L’application **doit pouvoir continuer à fonctionner sans imgProxy**. En effet, pour le développement, il n’est pas pratique d’être systématiquement obligé de lancer un docker supplémentaire sur sa machine. Et on souhaite laisser aux utilisateurs qui le veulent la possibilité de rester branchés sur les images originales.
* On ne stocke pas les liens des images proxifiées, justement pour se laisser la possibilité de désactiver le proxy
* Si imgProxy est désactivé, **aucun code supplémentaire ne doit être exécuté au runtime**. Une feature désactivée ne doit pas impacter les performances de l'application.

### Implémenation

On va commencer par ajouter un resolver pour gérer les liens d’images proxyfiés.

On met à jour le schéma comme suit :

```gql
type News {
    id: ID!
    title: String
    image: String
    imgm: String    # Lien proxyfié mobile
    imgd: String    # Lien proxyfié desktop
    description: String
    publication: String
    link: String
}

extend type Query {
    newsSearch(): [News]
}
```

Et on ajoute le resolver comme un controller Spring distinct :

```java
@Controller
@RequiredArgsConstructor
public class ImageProxyGqlMapper {
    private final ImageProxyService imageProxyService;

    @BatchMapping
    public Mono<Map<News, Optional<URI>>> imgm(List<News> news) {
        return Mono.fromCallable(() -> news.stream()
                .collect(Collectors.toUnmodifiableMap(Function.identity(),
                        n -> Optional.ofNullable(imageProxyService.proxify(n.getImage(), ImagePresets.MOBILE)))));
    }

    @BatchMapping
    public Mono<Map<News, Optional<URI>>> imgd(List<News> news) {
        return Mono.fromCallable(() -> news.stream()
                .collect(Collectors.toUnmodifiableMap(Function.identity(),
                        n -> Optional.ofNullable(imageProxyService.proxify(n.getImage(), ImagePresets.DESKTOP)))));
    }
}
```

Le code de `ImageProxyService` n’a pas grand intérêt, il s’appuie en grande partie sur l’example java fournie pas imgProxy. Le service utilise les [presets](https://docs.imgproxy.net/presets "Configure presets for imgproxy (en)") pour configurer les traitements d’images, ce qui permet de ne pas changer le code pour changer le traitement, il suffit de reconfigurer le preset dans imgProxy.
{{< figimg src="separate_approach.svg" float="right" alt="controlleur dédié" >}}

L’intérêt de cette approche par controller dédié, plutôt que d’ajouter le traitement du lien dans le résolver exitant, est que si le front ne demande pas les champs `imgm` ou `imgd` **aucun code n’est exécuté**. De plus tous les objets de l’application sont immutables (ce sont de [records](https://docs.oracle.com/en/java/javase/16/language/records.html "Records Java key words (en)")), si nous avions enrichi l’objet `News`, il aurait fallu réinstancier chaque objet de la liste. En passant par cette approche, on respecte le découpage de fonctionnalités, **la proxification des liens n’altère en rien le traitement standard d’un objet `News`**, aucun test n’est à modifier.

### Gestion de la configuration

À ce stade, on répond à la moitié des besoins. Reste le besoin de pouvoir désactiver la proxification sans impacter les traitements en cas de désactivation.

Pour cela Spring propose l’annotation `@ConditionalOnProperty`. On va modifier le fichier de configuration de Spring :

```yaml
app:
  imgproxy:
    enable: ${APP_IMGPROXY_ENABLE:false}
    signingKey: ${APP_IMGPROXY_SIGNKEY}
    signingSalt: ${APP_IMGPROXY_SALT}
    pathBase: ${APP_IMGPROXY_BASEPATH:/img}
```

L’application est déployée via docker, tous les paramètres de spring sont surchargeables via des variables d’environnement.

On ajoute ensuite un bean de properties pour lire la configuration depuis la classe de service :

```java
@ConstructorBinding
@ConfigurationProperties(prefix = "app.imgproxy")
@ConditionalOnProperty(prefix = "app.imgproxy", name = "enable", havingValue = "true")
public record ImageProxyConfig(
        String signingKey,
        String signingSalt,
        String pathBase,
        String extension
) {
}
```

`@ConstructorBinding` permet d’obtenir un objet de propriétés immutable construit à partir du constructeur plutôt que des setters. `@ConfigurationProperties` relie les propriétés de l’objet aux propriétés de la conf ayant le même nom. Enfin, `@ConditionalOnProperty` demande à Spring de ne chercher à **créer l’objet que si la valeur de la propriété `app.imgproxy.enable` est à `true`**.

Il suffit ensuite de placer la même annotation `@ConditionalOnProperty` sur le resolver que nous avons précédament ajouter pour qu’il ne soit pas instancié quand imgProxy est désactivé. Si `app.imgproxy.enable` est à `true` les beans ne seront pas instanciés et GraphQL se contentera de ne pas résoudre les valeurs `imgm` et `imgd`. Bien-sûr le front devra gérer ce cas de figure, mais la contrainte est respectée, **la désactivation d’imgProxy n’impacte pas le runtime**.

## Utilisation coté front

Coté front on se retrouve maintenant avec 3 urls d’images, l’originale, une optimisée pour le mobile et l’autre pour le desktop. Les **fonctionnalités d’[images adaptatives](https://developer.mozilla.org/fr/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images "Images adaptatives pour le web responsive")** vont nous aider à gérer l’affichage de ses trois images selon la taille des viewports des utilisateurs.

Dans le composant front qui gère les éléments de la liste de news de notre application, on va calculer les propriétés `sizes` et `srcset` en fonction de la présence des urls dans nos éléments de liste.

```TypeScript
    sizes: n.imgm ? '(max-width: 1024px) 268px, 240px' : '',
    srcset: n.imgm ? `${n.imgm} 268w, ${n.imgd} 240w` : '',
```

Le composant ressemble alors à ça :

```vue
    <img v-if="card.image"
        :src="card.image"
        :srcset="card.srcset"
        :sizes="card.sizes"
        loading="lazy"
        :alt="card.title"/>
```

Ainsi le navigateur charge l’image optimisée spécialement pour la taille du viewport. Notez le `loading="lazy"` qui indique au navigateur de ne charger l’image que si elle est visible dans à l’écran.

## Gestion du cache

On a beau être optimiste, il est difficile de croire que les images vont se charger plus vite grâce à la proxyfication. Le téléchargement plus le redimensionnement d’une image de 5 Mo par imgProxy ne paraîtra jamais plus rapide à un utilisateur mobile que le simple téléchargement de l’image originale. 

Dans les faits après mise en place, on peut constater que **la plupart des images se chargent en un peu moins d’une seconde**, ce qui est bien plus long que pour les images non proxyfiées.

Heureusement, notre application préférée se trouve déployée derrière un serveur [NginX](https://www.nginx.com/ "NGINX: Advanced Load Balancer, Web Server, & Reverse Proxy (en)"). Ce dernier est capable de [gérer du cache statique](https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/ "NGINX Content Caching (en)") de manière basique. Avec quelques configurations, il est très simple de pallier le problème de temps de traitement avec du cache.

```nginx
proxy_cache_path /var/cache/nginx/imgcache keys_zone=imgcache:500m;

server {
    listen  443 ssl http2;
    listen  [::]:443 ssl http2;

    server_name myapp.ght1pc9kc.fr;

    set $imgproxystream http://imgproxy:8080;

    location /img {
        proxy_cache imgcache;
        proxy_cache_valid any 24h;
        proxy_cache_valid 404 1m;

        proxy_pass $imgproxystream;
    }
}
```

Avec cette configuration on déclare une zone de cache pour les images proxyfiées de 500 Mo et on cache toutes les requêtes faites sur `/img` dans cette zone de cache. `/img` étant le préfixe des URL d’images proxifiées à mettre dans les configurations de notre application et de imgProxy.

Certes ça ne fera pas charger les premiers appels plus rapidement, mais les suivants seront instantanés. Une autre avantage est que l’on cache les images après traitement donc on ne cache que des petites images qui ne vont pas consommer beaucoup de place. Dans la configuration, les images sont mises en cache 2 heures, mais on pourrait augmenter largement la durée du cache sans trop impacter l’espace de stockage.

## Conséquences SEO et performances

{{< figimg src="growth_chart.svg" float="left" alt="accroissement perf et seo" >}}
En conclusion, si on retente un audit de l’application avec le même outil d’analyse qui nous avait reproché le chargement des images au tout début, on passe de 64/100 à 96/100 pour la performance. **L’affichage des pages est beaucoup plus véloce** et ne dépend plus de la taille des images que les bloggueurs publient dans leurs articles.

**La bande passante nécessaire pour utiliser l’application chute** radicalement grâce au redimensionnement des images et à l’utilisation des formats <abbr title="AV1 Image File Format">AVIF</abbr> et WebP.

Mais la performance n’est pas le seul aspect qui a augmenté lors de l’audit de l’application, le SEO aussi est monté grâce à la gestion des images adaptatives.

**L’ensemble du développement a pris 5 heures**, le temps de tester et de découvrir l’outil plus 3 heures pour scripter le déploiement et configurer le frontal. Bien en dessous de ce qu’aurait coûté le développement d’une telle fonctionnalité.

> Si l’exemple de l’application aggrégateur de news ne vous a pas convaincu, imaginez que vous développiez un site de e-Commerce qui vend, au hasard, des chaussures et que vous hébergiez les versions "Raw" des photos des chaussures que vous vendez. Vous allez forcément rencontrer ce problème. Entre les formats de photos portées, les formats horizontaux, les formats mobiles, les miniatures, les zooms.
>
> Avec les modifications que l’on a abordées dans cet article et avec imgProxy, il devient possible de gérer de manière optimale tous les affichages.
>
> ImgProxy est capable de servir les photos depuis le disque, voire depuis un stockage distribué type S3 ou [MinIO](https://min.io/) puisque l’API est compatible. En utilisant les presets, vous pouvez définir tous les formats d’images dont vous avez besoin. La signature des URLs évite que les utilisateurs ou que les concurrents chargent le serveur en jouant avec les formats. Il est possible d’ajouter un watermark. En plus imgProxy est compatible [Prometheus](https://prometheus.io/). Un petit cache Varnish bien configuré entre l’utilisateur et imgProxy et le tour est joué.
> 
> Enfin cerise sur le gateau, le coût de mise en place et le risque sont parfaitement controlés !
