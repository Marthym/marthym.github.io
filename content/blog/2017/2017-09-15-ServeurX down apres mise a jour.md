---
title: Serveur X qui ne démarre plus après mise à jour
date: "2017-09-15T12:00:00-00:00"
excerpt: "Hier, le 14 septembre, après un apt fullupgrade plus de Serveur X et pas d’erreur dans le log xorg"
tags: [debian, xorg, xserver, pulseaudio, linux]
image: debian.png
---

Un post éclair pour ceux qui auront pas de bol comme moi hier soir !

Je fais tranquille mon `apt fullupgrade` puis je redémarre et au lieu de l’écran de login, je me trouve avec l’écran qui clignote et puis plus rien, juste le log de démarrage.

Je suis sur Debian Testing et ça arrive de temps à autre, c’est jamais bien grave. Je regarde dans le log `xorg.0.log` en général c’est le driver qui probe pas on trouve des messages dans le log, on répare et ça repart. Mais là, pas d’erreur particulière. Du coup on regarde le `syslog` :

```
Sep 15 20:03:48 MonPC org.gnome.Shell.desktop[1499]: /usr/bin/gnome-shell: error while loading shared libraries: libpulsecommon-10.0.so: cannot open shared object file: No such file or directory
```

Et je retrouve ça plusieurs fois dans mon log à plusieurs endroits. C’est un peu moche quand même de galérer pour ça :)
À partir de là c’est plus trop compliqué :

<pre class="console">
ln -s /usr/lib/x86_64-linux-gnu/pulseaudio/libpulsecommon-11.0.so /usr/lib/x86_64-linux-gnu/pulseaudio/libpulsecommon-10.0.so
</pre>

Et voilà c’est reparti.