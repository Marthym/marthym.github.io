---
title: Stratégie des rôles Ansible
date: 2022-09-10
# modified: 2021-11-04
summary: |
    Ansible est un outils de provisionning puissant et simple a prendre en main. Mais il est aussi facile de produire des projets complexes qui vont devenir impossible à maintenir. Voilà un vision orientée développeur de la structure d’un projet Ansible.
tags: [infra, ansible, serveur, sysadmin]
image: featured-strategy-ansible-role.webp
#toc: true
#comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

[Ansible](https://docs.ansible.com/ansible/latest/index.html) est un outil de provisionning puissant et relativement simple à prendre en main. Tellement qu’il est vite facile de se perdre dans ses rôles si le projet n’a pas été structuré correctement dès le départ.

L’objectif de cet article n’est pas d’apprendre Ansible ou l’utilisation des rôles, mais plutôt de proposer une façon de structurer ses projets Ansible pour ne pas se retrouver dans une forêt d'if.

{{< figimg src="noisy-ansible-role.webp" alt="Projet Ansible mal structuré" credit="image du film \"Ender's Game\"" >}}

