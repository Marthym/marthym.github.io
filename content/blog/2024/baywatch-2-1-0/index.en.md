---
title: Baywatch, techno watch tool is out in 2.2.0
slug: baywatch-feed-aggregator-free
date: 2024-02-10
modified: 2025-03-16
summary: |
    Version 2.2.0 of Baywatch is online, with improvements to the display of news feeds and French and English translations.
categories: [development]
tags: [baywatch, java, spring]
image: featured-baywatch-pour-veille-techno.webp
toc: true
comment: /s/beoan4/comment_r_aliser_une_bonne_veille
aliases:
    - /2024/baywatch-veille-techno-2-1-0/
---

A few months ago, I told you about [Baywatch]({{< relref path="baywatch-ou-la-veille-informatique" lang="fr" >}}), the tool I use for my technology watch. A free, open-source Atom and RSS feed aggregator capable of de-duplicating the articles referenced in it.

Go to https://bw.ght1pc9kc.fr/ to create a free account.

## Baywatch 2.2.0

### Translations french / english

One of the most significant improvements is the translation of the application into English and French. Until this version, Baywatch was in Franglais, a little French here, a lot of English there. Not great deal for adoption. So in 2.2.0, every string is correctly translated, from the interface to the error messages. I may have missed some, in which case [don't hesitate to give me feedback](https://github.com/Marthym/baywatch/issues/new/choose).

This translation is done by [vue i18n](https://vue-i18n.intlify.dev/). In other words, everything is managed by the UI. The browser's preferred language is used as the default language, and it is possible to change the language in the application settings. Technically, translation files are separated by module and by language, and are loaded on the fly by vue-router just before the component is displayed. This avoids any flickering effects.

For now, only English and French are available, but if volunteers come forward for other languages, it will be a pleasure. The translation files can be viewed on github: https://github.com/Marthym/baywatch/tree/develop/seaside/src/locales

### Displaying the News list

Another significant development is the ability to display news either in a magazine list format, as was previously the case, or in a compact grid layout:
{{< figimg src="feed-news-list-card-grid.webp" alt="Screenshot of the news list in grid format" >}}

Similar to translations, the magazine display mode can be configured in the user settings, but a shortcut also allows changing it from the navigation bar

### New User Settings screen

This feature was becoming necessary, a screen allowing users to modify certain application settings such as:
  * The interface language
  * The display mode for the news list
  * Disabling the automatic "read" marking on the news list

These settings are available under "Configuration > Paramètres" or "Configuration > Settings."

### Indication of Feed status in configuration

It is now possible to see directly in the feed list whether they are valid or not, and if they are not, how long they have been defective.

### Support for RDF / DCMI standards

After reviewing the application logs, I noticed that some news feeds were producing XML containing tags following the [RDF / DCMI standards](https://www.dublincore.org/schemas/rdfs/) that were not being properly supported. This issue has now been corrected, and the standards are fully integrated into the scraper.

### Bug Fixes

With new features come bug fixes:
  * Several issues with adding and updating news feeds have been resolved.
  * Adding a news feed now goes through a validation system that will return an error if the feed is not valid.
  * Adding users from the admin panel was not working correctly.
  * Reddit feeds were not updating properly.

## Baywatch 2.1.3

### Change of Hosting Provider

Until now, Baywatch was hosted on an OVH VPS that I had rented two years ago for the modest sum of **193 €** for 24 months with a promotional offer of 34 €, which gave me the VPS (2 vCPU, 4 GB RAM, 80 GB Disk) for **158 €** excluding tax. Two years and a war in Ukraine later, the cost of renewing the VPS has increased to **242 €** excluding tax for, not 24, but 12 months. **That's a 206% increase in two years!**

In short, I did not stay with OVH, as it was no longer within my budget. After some research, I discovered [Hostinger](https://www.hostinger.fr/), a Lithuanian hosting provider, so we remain in Europe. They offer servers located in France and several other European countries. In terms of VPS, I upgraded to 2 vCPU, 8 GB RAM, and 100 GB Disk, a welcome upgrade. And all for **163 €** excluding tax for 24 months. Granted, this is the welcome offer with a nice discount. But for your information, the renewal is announced at **252 € for 24 months**.

For a more powerful machine, I pay 4x less than at OVH.

In short, if you are considering getting a VPS at [Hostinger, here is my referral link, it will give you **-20% on hosting**](https://hostinger.fr?REFERRALCODE=1FRDRIC50).

### Performance Improvements

In addition to changing the hosting provider, version 2.1.3 has undergone some optimizations. Thanks to **@dasga** for helping to detect these issues by using Baywatch.

The display of news in the list on the homepage is now much faster for users with a large number of subscriptions.

Additionally, scraping Atom and RSS feeds now uses `ETag` headers and publication dates, when available, to determine if an update is necessary. News feeds are only parsed if needed.

## Baywatch 2.1.1
### New Feature

{{< figimg src="create-user.webp" float="left" alt="Create User Baywatch" >}}

Today, version **2.1.1** is released. The major new feature (and the only visible one) is the ability for anyone to **create an account**.

Once the user account is created, all you have to do is wait (not long) for me to validate the account, and you can discover this wonderful tool.

Start with the **Configuration** tab to add news feeds that will be scraped during the next update task (every hour). You can also use the **search feature to discover existing news feeds** and subscribe to them.

Feel free to provide [feedback on GitHub](https://github.com/Marthym/baywatch/issues/new/choose) if you like it or if there are things to improve.

Baywatch is also available for download on GitHub, in [tar.bz](https://github.com/Marthym/baywatch/releases/download/2.1.1/baywatch-2.1.1.tar.bz2) format for manual installation directly on your servers. Or via [Docker and docker-compose](https://github.com/Marthym/baywatch/pkgs/container/baywatch) if you prefer.

```shell
docker pull ghcr.io/marthym/baywatch:2.1.1
```

You will find a [compose example](https://github.com/Marthym/baywatch/blob/4051279ca04db044f98527eb48fa7005356263b4/docker-compose.yml#L14) in the project.

### Technical Improvements

Besides the user creation feature, version 2.1.1 also includes some technical updates that are not very visible.

* A new password generator capable of proposing complex passwords.
* An improved notification system that can now store notifications when the recipient is not connected and deliver them to the user when they connect.
* Creation of a new baseline for the database to optimize application deployment and eliminate Java migrations from flyway.
* Upgrade from Spring 3.2.0 to Spring 3.2.2
* Extraction of entity management into a separate library.
* Addition of the *_createdBy* metadata to the `User` entities.
* Addition of unit tests on the backend

The sources are on GitHub: https://github.com/Marthym/baywatch/tree/2.1.1

> *Edit 2024-02-11:* **Baywatch 2.1.1**
>
> Yes, there was indeed a 2.1.0, but I merged a bit too quickly and let a bug slip through regarding the update of user rights in the administration. Version 2.1.1 fixes this issue and replaces the previous version.
