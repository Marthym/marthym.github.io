---
title: Configurer Azure AD comme IdP sur Keycloak
date: 2023-03-17
# modified: 2021-11-04
summary: |
    Comment configurer un Keycloak pour utiliser Azure AD comme Identity Provider. Qeuls sont les pièges à éviter et les astuces de configuration. Le tout dans un projet Spring Boot Webflux.
categories: [infrastructure, sécurité]
tags: [spring, azure, cloud, security]
image: featured-azure-vs-keycloak.webp
toc: true
# comment: /s/3cwxdp/am_liorations_et_bonnes_pratiques_pour_le
---

Pour un nouveau projet, j’ai eu besoin d’utiliser un Keycloak comme Authentifcation Provider dans une application Spring Boot Webflux. Et comme la société dans laquelle je travaille possède un Azure AD, l’idéal est de connecter l’Azure AD comme Identity Provider sur le Keycloak avec OpenIC Connect.

Malgré la quantité d’articles sur le sujet, cela m’a pris un peu de temps pour trouver la bonne configuration et pour trouver certaines astuces qui permettent de finaliser cette configuration. Voici dans le détail les différentes étapes.

## Configuration Azure

On va commencer par se connecter à Azure.

Et la première astuce est de **passer votre interface en anglais** si ce n’est pas déjà le cas. Les traductions de certains mots du domaine de l’authentification ne sont pas explicites. En effet, un `tenant` devient un `locataire` en français et les `claims` deviennent des `revendications`. Dans l’interface, ça complique la compréhension de ce que l’on fait.

{{< figimg src="azure-config-01.webp" height="100" alt="Azure Configuration" caption="Ajouter une application dans l’interface Azure" >}}

1. Cliquez sur Active Directory
2. App Registration
3. New Registration

Donnez-lui un nom, `keycloak` par exemple, choisissez **Single tenant** puis Register. Nous remplirons l’URI plus tard.

## Configuration Keycloak

Si cela n’est pas déjà fait, créez votre Realm, pour moi `ght1pc9kc`.

{{< figimg src="keycloak-config-01.webp" height="100" alt="Keycloak Configuration" caption="Ajouter un Realm et ajouter un Id Provider" >}}

Puis rendez-vous dans le menu **Identity Providers**.

Attention, il y a un choix **Microsoft**, mais il ne faut pas choisir celui-là. Bien que fonctionnel, il ne permet pas certains réglages que l’on va faire par la suite.

1. Renseignez l’alias : `azure`
2. Le **display name** qui sera affiché sur la mire de connexion : `Azure AD`
3. L’ordre d’affichage si vous voulez le changer

### Discovery Endpoint

Il faut retourner sur Azure. Au niveau de l’application que l’on a enregistré juste avant, cliquez sur **Endpoints** pour afficher la liste des URLs de terminaison de l’application.

{{< figimg src="azure-config-02.webp" height="100" alt="Azure Application Endpoints" caption="Ouvrir la liste des endpoints de l’application Azrue" >}}

Celle qui nous intéresse est **OpenID Connect metadata document**. Copiez-là et collez là dans le champ **Discovery Endpoints** de la configuration Keycloak. Cela va automatiquement remplir toutes les URLs présentent dans les **metadata**.

{{< figimg src="keycloak-config-02.webp" height="100" alt="Keycloak Discovery Endpoints" caption="Remplissage automatique des URLs" >}}

4. **Client authentication** : `Client send secret as post`
5. **Client ID**: C'est le **Application (client) ID** visible dans l’overview de l’application Azure (cf. capture).

### Secret ID

Dans Azure, toujours au niveau de l’application que nous avons créée, aller dans le menu **Certificats & Secrets**.

{{< figimg src="azure-config-03.webp" height="100" alt="Azure create secret" caption="Création du secret dans Azure" >}}

Donnez-lui un descriptif et une durée de validité. Puis copié le secret visible au niveau de **Value**. Attention, il n’est visible qu’une fois, la prochaine fois que vous ouvrirez cet écran, il ne sera plus lisible donc il faut le copier maintenant.

Et collez-le dans **Client Secret** au niveau de Id Provider Keycloak.

Enfin cliquez sur **Add** pour ajouter l’Identity Provider.

### Finalisation du paramétrage

Retournez dans l’Id Provider que l’on vient de créer. Dans **Advanced Settings** ouvrez l’accordéon **advanced** :

* **Scopes**: `openid profile email`
* **Trust email** : `On`, pour dire que les emails qui viennent d’Azure son vérifié
* **Sync mode** : `Force`, pour demander à Keycloak de mettre à jour les données de l’utilisateur à chaque connexion et pas seulement à la première.

Pour le reste, les valeurs par défaut suffisent. Pensez à enregistrer.

### Redirect URI

Enfin, toujours dans l’Id Provider, copier le contenu de **Redirect URI** tout en haut de la page. Puis allez dans Azure, dans le menu **Authentication** cette fois.

{{< figimg src="azure-config-04.webp" height="100" alt="Azure ajouter URI" caption="Ajouter une plateforme web et coller l’URI" >}}

1. Cliquez sur **Add Platform**
2. Choisissez **Web**
3. Coller l’URI copié depuis la configuration Keycloak

## Premier test

{{< figimg src="keycloak-login-01.webp" float="right" alt="Login Keycloak" caption="IdP Azure apparaît sur la mire" >}}

À ce stade, l’intégration est fonctionnelle et si vous allez dans le menu **Clients** de votre keyclaok, vous pouvez ouvrir l’URL de **account** et vous connecter.

Ne saisissez pas vos identifiants dans la fenêtre, mais cliquez sur **Azure AD**. Vous êtes renvoyé vers Azure où vous pouvez vous connecter. À la fin, Azure vous demande votre accord pour transmettre vos données à Keycloak.

Une fois connecté, vous pouvez voir dans l’interface de compte Keycloak les informations de votre compte que ce dernier a récupéré d’Azure.

Si vous retournez dans l’interface d’administration, vous pourrez voir qu’un utilisateur a été ajouté.

## Récupération des groups

L’identification fonctionne, mais nous n’avons pas récupéré les informations d’autorité de l’utilisateur. En effet, il serait intéressant de pouvoir mapper les groupes auxquels l’utilisateur appartient avec des rôles Keycloak. De manière à n’avoir à régler les autorisations que sur le serveur Azure.

### Ajouter les groupes azure dans les claims

Par défaut, Azure ne transmet pas les groupes dans les claims du token. Il faut donc modifier le token coté Azure, choisissez le menu **Token Configuration**

{{< figimg src="azure-config-05.webp" height="100" alt="Azure Token Configuration" caption="Ajouter le claim groups" >}}

Cliquer sur **Add groups claims**. Ensuite il vous demande de choisir sur quelle forme les groupes seront transmis dans le token, par ID, par nom, ...

Je vous conseille de rester sur ID sauf si vous avez des besoins particuliers qui justifient un autre choix.

> Plusieurs articles conseillent de changer `groupMembershipClaims` dans le manifest et de remplacer `null` par `All` ou `SecurityGroup`, mais pour moi ça n’a pas fonctionné.

### Mapping des roles dans Keyclaok

Vous pouvez maintenant retourner dans Keycloak et créer les rôles qui correspondent à vos groupes Azure.

Puis dans l’Identity Provider Azure, aller dans l’onglet **Mappers** et ajoutez en un.

{{< figimg src="keycloak-config-03.webp" height="100" alt="Keycloak Identity Provider Mapper" caption="Ajouter un rôle mapper dans Keyclaok" >}}

* **Sync Mode** : `Inherit`, il forcera la mise à jour comme celle des informations de IdP.
* **Mapper Type** : `Claim to Role`
* **Claim** : `groups`
* **Claim Value** : l’id du groupe azure
* **Role** : le ou les rôles associés à ce groupe Azure

## Test final

Si vous retournez sur l’interface **account** et que vous recommencez la procédure de connexion, vous pouvez constater que l’utilisateur créé possède maintenant les rôles qui correspondent à ses groupes Azure.

## Conclusion

Finalement rien de compliqué, mais quelques détails qui ne sont pas forcément intuitif et qui peuvent faire perdre pas mal de temps.

Dans un prochain article, on parlera de l’intégration entre Spring Boot et Keycloak. Très simple aussi, mais toujours avec quelques détails qui peuvent faire perdre du temps.
