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

Tout ça augmente considérablement le <accr title="Time To Interactive">TTI</accr>. Les moteurs de recherches y sont sensibles car cela dégrade l’expérience utilisateur, surtout sur mobile. Un bon moyen de se faire une idée est d’aller voir sur [Google Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fblog.ght1pc9kc.fr%2F&hl=fr).

