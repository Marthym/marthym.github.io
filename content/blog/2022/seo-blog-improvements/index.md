---
title: Améliorations et bonnes pratiques pour le référencement
date: 2022-01-05
# modified: 2021-11-04
summary: |
    Le SEO ou Search Engine Optimization est un ensemble de bonnes pratique pour que son site remonte plus haut dans les résultats des moteurs de recherche tel que Google ou autre. Chaque moteur de recherche a ses propres algorithmes et les garde secret.
tags: [seo, referencement, tailwindcss, blog]
image: featured-seo-improvement.webp
toc: true
# comment: /s/knmp7w/import_sql_avec_barre_de_progression
---

Je ne m’en étais jamais trop préoccupé jusque-là, mais j’ai réalisé le mois dernier que le blog n’était pas très bon en termes de <accr title="Search Engine Optimization">SEO</accr>.

Beaucoup de sites en parlent et ce qu’il en ressort, c'est qu’on n’est sûr de rien. Chaque moteur de recherches à ses propres algorithmes et les conserves dans le plus grand secret. De plus, ces algorithmes sont mis à jour et modifiés régulièrement. 

Cependant, il y a quand même des constantes qui vont permettre d’améliorer le référencement. Voilà ce que j’ai modifié sur ce blog pour améliorer le <accr title="Search Engine Optimization">SEO</accr>.

## Les téléchargements annexes

En regardant ce qu’il se passe dans l’onglet réseaux des outils de développement du navigateur, on peut voir ce qui est téléchargé en plus du HTLM de la page. C’est par exemple tout le CSS, les fonts, le javascript, ...

Tout ça augmente considérablement le <accr title="Time To Interactive">TTI</accr>. Les moteurs de recherches y sont sensibles, car cela dégrade l’expérience utilisateur, surtout sur mobile. Un bon moyen de se faire une idée est d’aller voir sur [Google Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fblog.ght1pc9kc.fr%2F&hl=fr). Il vous donne un score de chargement de vos pages, pour mobile et pour desktop et vous propose des corrections.

Tout n’est pas simple à corriger, surtout si vous n’hébergez pas vous-même. Les règles de cache par exemple, ce n’est pas moi qui choisi puisque le blog est hébergé sur Gitlab Pages.

Dans le cas de ce blog la version mobile n’était pas très bonne. Beaucoup de CSS et des fonts assez lourdes à charger, le score effleurait le 55.

### Améliorations effectuées

Pour palier la quantité et la taille des fichiers à télécharger, tout le thème du blog a été revu. L’ensemble du CSS est parti à la poubelle et a été refait à base de [Tailwindcss](https://tailwindcss.com/). Le [concept de base](https://tailwindcss.com/docs/utility-first) sur lequel ce framework est construit permet entre autre de radicalement réduire la quantité de CSS nécessaire. Grâce à ça, le site est passé de plus de 12 ko de CSS compressé à 3,3 Ko. Ça n’a l’air de rien, mais les algorithmes de référencement adorent.

En parallèle du CSS, les polices ont été remplacées par des fonts présentent par défaut sur les navigateurs. De façon à ne pas avoir à les télécharger. Ce qui vient encore réduire la part de fichiers téléchargés en plus de la page HTML.

## La responsivité

À ce jour, être compatible et lisible sur mobile est important. Certes un blog technique n’a pas les mêmes enjeux qu’un site de e-commerce, mais il reste bon de s’y intéresser. Pour se faire une idée, sur ce blog technique, 30% des visiteurs sont sur mobile.

En dehors de la lisibilité qui est primordiale si vous ne voulez pas voir votre taux de rebond exploser, il y a encore une fois le <accr title="Time To Interactive">TTI</accr>. Mais cette fois le problème est différent. La question ressemble plus à : *Comment limiter le téléchargement des images en 1920x1200 prévu pour les desktop et complètement superflue pour les mobiles ?*

### Image adaptative avec `srcset`

Cette fois, c’est le HTML 5 avec sa propriété `srcset` sur la balise `img` qui nous donne une solution. Cette propriété va permettre d’avoir des [images adaptatives](https://developer.mozilla.org/fr/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images). Les navigateurs modernes pourront alors choisir l’image la plus adaptée à la résolution de l’écran utilisateur.

Ce blog est construit par [hugo](https://gohugo.io/) et dans ses dernières versions, il permet de [manipuler les images](https://gohugo.io/content-management/image-processing/), de les retailler ou de les découper. Grâce à cette fonctionnalité, on peut stocker dans les sources l’image de plus grosse résolution, et la décliner pour les différentes résolutions que l’on veut supporter.

Voilà le code [hugo](https://gohugo.io/) utilisé pour l’image d’entête du blog :

``` go
{{ $topImage := "/img/back.webp" }}
{{ $topAlt := .Page.Name }}
{{ $topSrcSet := "" }}

{{ if .Page.Params.image }}
    {{ with .Resources.GetMatch .Page.Params.image }}
        {{ $image := . }}

        <!-- variables used for img tag -->
        {{ $imgSrc := "" }}
        {{ $imgSrcSet := slice }}

        <!-- uses settings from config.toml depending on orientation -->
        {{ $widths := slice 800 480 320 }}

        <!--
        Add URL for each width to $imgSrcSet variable
        format: "/path/img_1000.jpg 1000w,/path/img_500.jpg 500w"
        Note: the first URL is used as "fallback" src in $imgSrc.
        -->
        {{ range $widths }}
            {{ $srcUrl := (printf "%dx75 q90 Lanczos Center" . | $image.Fill).RelPermalink }}
            {{ $imgSrcSet = $imgSrcSet | append (printf "%s %dw" $srcUrl .) }}
        {{ end }}
        {{ $topSrcSet = (delimit $imgSrcSet ",") }}
        {{ $topImage = $image.RelPermalink }}
    {{ else }}
        {{ if .Page.Params.image }}
            {{ $topImage = .Page.Params.image }}
            {{ if not (findRE "^(/|http(s?)://)" $topImage) }}
                {{ with .Page.Resources.GetMatch $topImage }}
                    {{ $topImage = .RelPermalink }}
                {{ else }}
                    {{ $topImage = print "/img/" $topImage }}
                {{ end }}
            {{ end }}
        {{ end }}
    {{ end }}
{{end}}
<figure class="img-ticke">
    <img src="{{ $topImage }}" 
        {{ if (not (eq $topSrcSet "" )) }}srcset="{{ $topSrcSet }}"{{end}} 
        alt="{{ $topAlt }}" height="80" class="w-full h-20 object-cover" />
</figure>
```

## Le maillage interne

Il s’agit de l’organisation des liens entre vos différentes pages. Comment ces liens permettent de naviguer d’une page à une autre sur votre site, tout en restant dans le même domaine sémantique.

Un bon maillage permet au moins deux choses :

* **Diminuer le taux de rebond**. C’est le pourcentage de visiteurs qui arrivent sur votre site par une page et en repartent pas cette même page. Ils ont rebondi sur votre site. Le maillage va proposer des liens vers d’autres pages de votre site et inciter le visiteur à rester sur le site.
* **Améliorer le référencement**. Les moteurs de recherches tiennent compte des liens externes qui amènent à votre page, mais aussi des liens interne. 

### Ajout des articles connexes

Pour améliorer le maillage interne du blog, qui jusqu’alors était inexistant, une liste de 5 articles portant sur les mêmes sujets a été ajouté sur la droite. Juste en dessous de la vue d’ensemble.

Une fois de plus, Hugo aide bien puisqu’il permet de liste les articles aillant les mêmes tags, par date de sortie. Voilà le code pour ceux que ça intéresse.

```go
{{ $currPermalink := .Page.RelPermalink }}
{{ $tagged := slice }}
{{ range (.GetTerms "tags") }}
    {{ $currTag := .LinkTitle }}
    {{ $taggedPages := (index .Site.Taxonomies.tags (lower $currTag)).Pages }}
    {{ range first 5 $taggedPages }}
        {{ if not (eq .RelPermalink $currPermalink) }}
            {{ $tagged = $tagged | append . }}
        {{ end }}
    {{ end }}
{{ end }}
{{ if gt (len $tagged) 0 }}
<header class="font-bold text-lg">Sur le même sujet</header>
<nav class="toc-nav">
    <ul class="toc-list">
    {{ range first 5 ($tagged | uniq) }}
        <li class="toc-element"><a class="toc-menulink" href="{{ .Permalink }}">{{ .LinkTitle }}</a></li>
    {{ end }}
    </ul>
</nav>
{{ end }}
```

### Plan du site

Une des bonnes pratiques est aussi de générer une page avec un plan du site. Chose qui n’est pas encore présente sur ce blog, mais qui viendra rapidement. Cela permet à la fois d’élargir le maillage interne, mais aussi de donner une vue d’ensemble aux visiteurs.

## Mot de la fin

Il ne s’agit là que de quelques règles parmi un océan. Je n’est pas abordé les règles relatives au contenu des pages, au wording ou autre. Je suis resté sur des règles générales qui affectent tout le site. Cependant, ces quelques astuces devraient faire grimper votre blog de quelques lignes dans les résultats de recherches.

Cet article était aussi l’occasion de parler de [Tailwindcss](https://tailwindcss.com/) et de montrer quelques bouts de code [hugo](https://gohugo.io/) que j’ai mis du temps à faire fonctionner.

N’hésitez pas à tester et à me faire part de vos remarques.