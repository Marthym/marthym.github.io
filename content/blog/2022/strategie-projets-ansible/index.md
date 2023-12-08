---
title: Stratégie des rôles Ansible
date: 2022-09-10
# modified: 2021-11-04
summary: |
    Ansible est un outils de provisionning puissant et simple a prendre en main. Mais il est aussi facile de produire des projets complexes qui vont devenir impossible à maintenir. Voilà un vision orientée développeur de la structure d’un projet Ansible.
tags: [infra, ansible, serveur, system, devops]
image: featured-strategy-ansible-role.webp
#toc: true
comment: /s/zqfc8y/strat_gie_des_r_les_ansible
---

[Ansible](https://docs.ansible.com/ansible/latest/index.html) est un outil de provisionning puissant et relativement simple à prendre en main. Tellement qu’il est vite facile de se perdre dans ses rôles si le projet n’a pas été structuré correctement dès le départ.

L’objectif de cet article n’est pas d’apprendre Ansible ou l’utilisation des rôles, mais plutôt de proposer une façon de structurer ses projets Ansible pour ne pas se retrouver au milieu d’un amas de rôles tous liés les uns aux autres.

Notez que pour en apprendre plus sur Ansible, [Stéphane Robert](https://blog.stephane-robert.info/a-propos/) a, entre autre, écrit une [documentation très complète sur le sujet](https://blog.stephane-robert.info/docs/infra-as-code/gestion-de-configuration/ansible/introduction/).

{{< figimg src="noisy-ansible-role.webp" alt="Projet Ansible mal structuré" credit="Ender's Game. All images © 2013 Summit Entertainment, LLC. All Rights Reserved" >}}

## Exemple concret

Prenons par exemple le déploiement basique d’un serveur applicatif (Nexus) placé derrière un frontal (Nginx). De quoi a-t-on besoin ?

* Quelques réglages basiques de la machine virtuelle
* Un serveur SSH bien configuré
* Un firewall
* Un fail2ban qui va bien
* Un docker pour porter les applications
* Un frontal
* Un Nexus

Si on structure ça en rôle Ansible voilà ce que ça peut donner :

* `basic`: le setup initial de la machine, création de users, locale, routing, ...
* `ssh`: Configuration et sécurisation du serveur SSH
  *Allez voir cet article sur le [durcissement d'un serveur SSH](https://blog.stephane-robert.info/docs/securiser/durcissement/ssh/)*
* `firewall`: qui définit les règles à mettre en place
* `fail2ban`: Installation et configuration de fail2ban
* `docker`: Installation de docker
* `frontal`: Déploiement d'un serveur Nginx en docker
* `nexus`: Déploiement du serveur Nexus en docker

Enfin, un playbook qui va ressembler à ça 

```yaml
- hosts: serveur_nexus
  roles:
    - {role: basic, become: true, tags: [basic]}
    - {role: helpers, become: true, tags: [helpers]}
    - {role: sshd, become: true, tags: [sshd]}
    - {role: firewall, become: true, tags: [firewall]}
    - {role: fail2ban, become: true, tags: [fail2ban]}
    - {role: docker, become: true, tags: [docker]}
    - {role: frontal, tags: [frontal]}
    - {role: nexus, tags: [nexus]}
```

On ne va pas trop s’étendre sur le découpage des playbook, faut-il en faire un par serveur ou un seul pour tous ? Ou encore un par rôle ? Personnellement, j’en fais **un par famille de machines** (developpement, infrastructure, production, ...) mais c’est un tout autre débat.

Dans notre exemple, chaque des rôles se charge d’installer les configurations de l’application qu’il installe. Le role `frontal` s’occupe donc de déployer le fichier `/etc/nginx/conf.d/nexus.conf`. Idem, `fail2ban` configure la jail Nginx et `firewall` ouvre les ports `80` et `443`.

C’est une approche que j’ai pas mal observée, en particulier sur les projets naissants ayany encore peu de rôles. **Bien que parfaitement fonctionnelle elle n’est pas évolutive du tout**.

## Evolution du projet

{{< figimg src="ansible-project-evolution.webp" alt="Evolution d’un projet Ansible mal structuré" credit="Ender's Game. All images © 2013 Summit Entertainment, LLC. All Rights Reserved" >}}

Imaginons maintenant que l’on ait à déployer un Sonar sur un autre machine. Logiquement, on va réutiliser les rôles précédemment écrits pour Nexus.

```yaml
- hosts: serveur_nexus
  roles:
    - {role: basic, become: true, tags: [basic]}
    - {role: helpers, become: true, tags: [helpers]}
    - {role: sshd, become: true, tags: [sshd]}
    - {role: firewall, become: true, tags: [firewall]}
    - {role: fail2ban, become: true, tags: [fail2ban]}
    - {role: docker, become: true, tags: [docker]}
    - {role: frontal, tags: [frontal]}
    - {role: sonar, tags: [sonar]}
```

Biensûr, on va devoir **modifier les rôles `fail2ban`, `firewall`, `frontal` pour qu’ils soient capables de détecter s’ils doivent installer les configurations** de Sonar, de Nexus ou les deux. Et c’est là que commence un long chemin de pénitence, à grand coup de `when` et de lecture des `facts`. On se retrouve à forger des scripts de plus en plus complexe à relire pour gérer chaque combinaison de cas possible.

Rapidement, il va falloir ajouter les configurations d’autres applications. Et chaque fois, **tous les rôles sont modifiés** et chaque fois, **il faut les retester tous**. Avec le lot de **risques de régressions** que cela entraine.

## L’approche rôle étendu

Une solution que j’ai déjà vu implémentée est de **spécialiser les rôles**. Au lieu d’avoir un role `frontal` on va avoir un rôle `frontal_nexus` qui va installer le serveur Nginx ainsi que la configuration du Nexus.

L’inconvénient de cette structure est que l’on y perd complètement la réutilisabilité des rôles. Et quand une modification arrive sur le serveur Nginx, un changement de version par exemple, il doit être **reporté sur l'ensemble des rôles** déployant un Nginx. Comme l’approche précédente, le risque d’erreur augmente avec la quantité de fichiers à modifier.

L’étape suivante du processus d’évolution de notre projet devrait logiquement être de découper le rôle `frontal` en rôle `frontal` + `nexus_frontal`. Ce dernier se chargera de déployer les configurations Nginx pour Nexus. 
```yaml
- hosts: serveur_nexus
  roles:
    ...
    - {role: frontal, tags: [frontal]}
    - {role: nexus, tags: [nexus]}
    - {role: nexus_frontal, tags: [nexus]}
```
On récupère ainsi la réutilisabilité des rôles. Par contre, **le projet va rapidement devenir lourd** à cause de la **multiplication incontrôler des rôles** et de leurs déclinaisons. La création de nouveau playbook va nécessiter de connaitre la liste des rôles à appliquer et leur bon ordre. Puisque qu’installer une application ne se fait plus avec un seul rôle, mais avec plusieurs. Le risque d’oublier un rôle de configuration augmente avec le nombre de combinaisons possible.

**De manière générale une augmentation excessive du nombre de rôles doit alerter** sur le fait que la structure du projet n’est pas optimale.

## L’approche SOLID

{{< figimg src="ansible-solid-project.webp" alt="Stratégie de projet Ansible SOLID" credit="Ender's Game. All images © 2013 Summit Entertainment, LLC. All Rights Reserved" >}}

Les problématiques décrites au long de cet exemple sont les mêmes que l’on trouve courrament dans le développement logicel. Il est donc intéressant d’adapter les principes qui permettent aux développeurs de résoudre ces problématiques.

Dans notre cas, le problème vient de la dépendance que le rôle **`frontal` va devoir entretenir avec chacun des rôles applicatifs** qu’il va proxifier. Il entretient cette dépendance parce qu’en plus de la responsabilité d’installer Nginx, il porte aussi la responsabilité de configurer le Nexus. **La dépendance d’un rôle vers à autre qui se trouve plus loin dans la playbook est le signe que le projet n’est pas structuré correctement**.

En progammation, deux principes [SOLID](https://fr.wikipedia.org/wiki/SOLID_(informatique)) permettre de résoudre ce problème :

* **S**: Single responsability *(Responsabilité unique)*
* **D**: Dependency Inversion *(Inversion de dépendance)*

Si le rôle `nexus` s’occupe d’installer lui-même sa propre configuration, on inverse la dépendance de `frontal` vers `nexus` qui s’écoule maintenant dans l’ordre d’exécution du playbook. Chaque rôle applicatif se charge de déployer ses configurations. Ce qui est plus logique, car qui mieux que le rôle `nexus` connait la liste des ports qu’il utilise.

### Conditionnement des configurations

Une difficulté va rester. Comment le rôle applicatif sait si le `frontal` est un Apache ou un Nginx ? Comment savoir si `fail2ban` est installé et s’il doit déployer sa configuration pour les jails ?

Une option simple et élégante est d’ajouter une variable booleènne par defaut à `true`. Par exemple dans le rôle `fail2ban/defaults/main.yml`

```yaml
---

_f2b_present: true
```

Et dans le rôle `frontal` :

```yaml
- name: Add fail2ban jails for nginx
  ansible.builtin.include_tasks: 'fail2ban.yml'
  when: _f2b_present | default(false)
```

Les variables Ansible étant déclarées pour tout le playbook, elles seront lisibles par tous les rôles qui suivent leur déclaration. Encore une fois, on respecte le sens d’exécution du playbook.

## Playbook final

Finalement, **chaque rôle est capable d’évoluer indépendament** des autres. Et la modification des rôles applicatifs n’entraine plus de modifications des autres rôles puisque les dépendances ont été cassés. **Aucun rôle ne dépend d’un rôle qui s’exécute après lui**, ce qui garanti la SOLIDité des playbooks et évite le risque de dépendances cycliques.

```yaml
# Exécuté sur tous les serveurs du groupe developpement
- hosts: developpement
  roles:
    - {role: basic, become: true, tags: [basic]}
    - {role: helpers, become: true, tags: [helpers]}
    - {role: sshd, become: true, tags: [sshd]}
    - {role: firewall, become: true, tags: [firewall]}
    - {role: fail2ban, become: true, tags: [fail2ban]}
    - {role: docker, become: true, tags: [docker]}

# Exécuté sur tous les serveurs du groupe developpement_avec_frontal
- hosts: developpement_avec_frontal
  roles:
    - {role: certbot, tags: [certbot],
       _certbot_domain: '*.anonymo.us'}
    - {role: frontal, become: true, tags: [frontal],
       _ssl_domain: 'anonymo.us'}

# Exécuté spécifiquement sur le serveur dev_serveur_outils
- hosts: dev_serveur_outils
  roles:
    - {role: nexus, tags: [nexus],
       _nexus_datadir: '/data/nexus',
       _nexus_domain: 'nexus.anonymo.us',
       _nexus_registry_domain: 'd.anonymo.us'}
    - {role: sonar, tags: [sonar],
       _sonar_datadir: '/data/sonar',
       _sonar_domain: 'sonar.anonymo.us'}
```