---
title: Améliorations et bonnes pratiques pour le référencement
date: 2022-01-05
# modified: 2021-11-04
summary: |
    Le SEO ou Search Engine Optimization est un ensemble de bonnes pratique pour que son site remonte plus haut dans les résultats des moteurs de recherche tel que Google ou autre. Chaque moteur de recherche a ses propres algorithmes et les garde secret.
tags: [seo, referencement, css, blog]
image: featured-seo-improvement.webp
# toc: true
# comment: /s/knmp7w/import_sql_avec_barre_de_progression
---

Je ne m’en étais jamais trop préoccupé jusque-là, mais j’ai réalisé le mois dernier que le blog n’est pas très bon en termes de <accr title="Search Engine Optimization">SEO</accr>.

Beaucoup de sites en parlent et ce qu’il en ressort, c'est qu’on n’est sûr de rien. Chaque moteur de recherches à ses propres algorithmes et les conserves dans le plus grand secret. De plus, ces algorithmes sont mis à jour et corrigé régulièrement. 

Cependant, il y a quand des constantes qui vont permettre d’améliorer le référencement. Voilà ce que j’ai changé sur le blog pour améliorer le <accr title="Search Engine Optimization">SEO</accr>.

## Les téléchargements annexes

En regardant ce qu’il se passe dans l’onglet réseaux des outils de développement du navigateur, on peut voir ce qui est téléchargé en plus du HTLM de la page. C’est par exemple tout le CSS, les fonts, le javascript, ...

Tout ça augmente considérablement le <accr title="Time To Interactive">TTI</accr>. Les moteurs de recherches y sont sensibles, car cela dégrade l’expérience utilisateur, surtout sur mobile. Un bon moyen de se faire une idée est d’aller voir sur [Google Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fblog.ght1pc9kc.fr%2F&hl=fr). Il vous donne un score de chargement de vos pages, pour mobile et pour desktop et vous propose des corrections.

Tout n’est pas simple à corriger, surtout si vous n’hébergez pas vous-même. Les règles de cache par exemple, ce n'est pas moi qui choisi puisque le blog est hébergé sur Gitlab Pages.

Dans le cas de ce blog la version mobile n’était pas très bonne. Beaucoup de CSS et des fonts assez lourdes à charger, le score effleurait le 55.

### Améliorations effectuées

Pour palier la quantité et la taille des fichiers a téléchargé, tout le thème du blog a été revu. L’ensemble du CSS est parti à la poubelle et a été refait à base de [Tailwindcss](https://tailwindcss.com/). Le [concept de base](https://tailwindcss.com/docs/utility-first) sur lequel ce framework est construit permet entre autre de radicalement réduire la quantité de CSS nécessaire. Grâce à ça, le site est passé de plus de 12 ko ce CSS compressé à 3,3 Ko. Ça n’a l’air de rien, mais les moteurs de recherches aiment bien.

En parallèle du CSS, les polices ont été remplacées par des fonts présentent par défaut sur les navigateurs. De façon à ne pas avoir à les télécharger. Ce qui vient encore réduire la part de fichier téléchargé en plus de la page HTML.

## Le responsive

À ce jour, être compatible et lisible sur mobile est important. Même si c’est plus important pour un site de e-commerce qu’un blog technique, il reste bon de s’y intéresser. Pour se faire une idée, sur ce blog technique, 30% des visiteurs sont sur mobile.

En dehors de la lisibilité qui est primordiale si vous ne voulez pas voir votre taux de rebond exploser, il y a encore une fois le <accr title="Time To Interactive">TTI</accr>. Mais cette fois le problème est différent. La question ressemble plus à comment limiter le téléchargement des images en 1920x1200 prévu pour les desktop et complètement superflue pour les mobiles.

### Image adaptative avec srcset

Cette fois, c’est le HTML 5 avec sa propriété `srcset` sur la balise `img`. Cette propriété va permettre d’avoir des [images adaptatives](https://developer.mozilla.org/fr/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images). Les navigateurs modernes pourront alors choisir l’image la plus adaptée à la résolution de l’écran utilisateur.
