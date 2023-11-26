---
title: Problème de son et de CEC avec Kodi
date: "2016-06-11T12:00:00-00:00"
excerpt: Quand le sigle "MUTE" s'affiche en haut à droite et que la télécommande ne fonctionne plus sur votre OpenELEC, que faire ?
#modified: 2015-09-21
categories: [linux, loisirs]
tags: [Kodi, OpenELEC, CEC]
image: kodi.png
---

Hier, je démarre mon Raspberry OpenELEC pour regarder je ne sais pas quoi et ... rien qui fonctionne. Impossible d'utiliser la télécommande de la TV et l'icône "MUTE" apparait en haut à droite à côté de l'heure. Pourtant deux heures plus tôt tout fonctionnait très bien ?
Autre chose étrange, sur la TV dans la liste des périphériques connecté il y a un "Recorder" ?

A ce stade, je tente plusieurs choses :

 * Redémarrage du Raspberry
 * Changement de cable HDMI
 * Changement de port HDMI sur la TV
 * Changement du Raspberry

Rien n'y fait !

Finalement, je trouve un [post dans un forum][coldreboot] qui conseille un `cold reboot` de la TV. Ca consiste à débrancher le TV pendant au moins 10mn avant de la rebrancher.<br/>
De ce que j'en ai compris il arrive que l'Anynet+ de la TV parte un peu en vrille, le fait de réinitialiser le TV le remet d'aplomb. Bref après cette manip, le CEC fonctionne à nouveau. 

Mais pas de chance, toujours pas de son, le mute est resté activé, et comme on est sur une TV, les touche `+` ou `F10` ne sont pas disponibles. J'ai galéré un moment avant de trouver [un autre post][coldreboot] avec une bonne astuce : Utiliser la télécommande de l'interface web de Kodi. En général cette interface est accessible à l'adresse `http://<kodi>:8080/`. Ca se configure dans les settings de Kodi au pire.<br/>
Une fois sur l'interface, allez dans l'onglet `Remote` et montez le son. Et voilà l'icône a disparu.

[coldreboot]: http://openelec.tv/forum/124-raspberry-pi/60823-cec-no-longer-working 
[mute]: http://openelec.tv/forum/68-audio/57729-frodo-beta-audio-stops-working-red-icon-after-a-few-days 
