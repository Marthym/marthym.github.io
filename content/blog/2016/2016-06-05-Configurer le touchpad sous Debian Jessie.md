---
title: Reconfigurer le TouchPad sur Debian
date: "2016-06-05T12:00:00-00:00"
excerpt: "Sur Debian testing, certain touchpad ne fonctionnent plus correctement, voyons comment retrouver un touchpad fonctionnel."
modified: "2016-07-26T12:00:00-00:00"
tags: [debian, linux, touchpad, xorg, mouse, libinput, synaptics, planetlibre]
image: debian.png
---

## Edit 2016-007-26

Il semble que le problème ai été corrigé sur la debian testing.

---

Dernièrement, une mise à jour de ma Debian a eu pour conséquence de dérégler le pavé tactile de mon portable. Plus de tap-to-click, plus de `natural scroll`
, plus de click droit, ... bref pas génial. Du coup je vais dans les paramètres de Gnome-shell pour remettre tout ça en ordre. Mais dans les paramètres on
ne trouve que deux pauvres options pour la souris mais rien pour le touchpad.

![paramètres Gnome-Shell](/img/2016/20160604-gnome-settings-001.png)

Donc pour ceux qui ont ce problème voici comment je l'ai résolu.

## Les drivers
Historiquement, la plupart des distributions Linux utilisent les driver `synaptics`. Mais avec l'arrivée de Wayland, de nouveaux drivers apparaissent, 
plus performants, plus souple et compatible xorg/wayland. C'est le cas de `libinput` qui remplace petit à petit tous les drivers d'entrée sur la Debian.

On peut utiliser la commande suivante pour connaitre les drivers utilisés par type d'entrée :

```bash
grep -e "Using input driver " ~/.local/share/xorg/Xorg.0.log
[    18.678] (II) Using input driver 'libinput' for 'Power Button'
[    18.690] (II) Using input driver 'libinput' for 'Video Bus'
[    18.691] (II) Using input driver 'libinput' for 'Video Bus'
[    18.692] (II) Using input driver 'libinput' for 'Power Button'
[    18.748] (II) Using input driver 'libinput' for 'Logitech USB Receiver'
[    18.749] (II) Using input driver 'libinput' for 'Logitech USB Receiver'
[    18.750] (II) Using input driver 'libinput' for 'USB 2.0 Webcam Device'
[    18.752] (II) Using input driver 'libinput' for 'AT Translated Set 2 keyboard'
[    18.753] (II) Using input driver 'synaptics' for 'ETPS/2 Elantech Touchpad'
[    18.755] (II) Using input driver 'libinput' for 'MSI WMI hotkeys'
[    18.774] (II) Using input driver 'libinput' for 'Logitech USB Receiver
```

Voilà ce que l'on obtient avant de suivre ce tuto, le touchpad utilise synaptics. Et c'est là qu'est le problème, dans les derniers updates, Gnome-Shell est
passé sur `libinput`. Mais côté Debian c'est pas encore le cas, on est sur `synaptics` et du coup le touchpad est mal géré. Bienvenue sur la testing...

## Changement de driver
C'est pas très compliqué mais il faut savoir où se trouvent les fichiers Xorg à modifier. Pour cela, voici une commande qui aide :

```bash
locate xorg.conf
/usr/share/X11/xorg.conf.d
/usr/share/X11/xorg.conf.d/10-amdgpu.conf
/usr/share/X11/xorg.conf.d/10-evdev.conf
/usr/share/X11/xorg.conf.d/10-quirks.conf
/usr/share/X11/xorg.conf.d/50-vmmouse.conf
/usr/share/X11/xorg.conf.d/50-wacom.conf
/usr/share/X11/xorg.conf.d/60-libinput.conf
/usr/share/X11/xorg.conf.d/70-synaptics.conf
```

Selon les configurations il y a d'autres lignes mais c'est celles-là qui nous intéresse. Xorg prend les fichiers dans l'ordre, donc c'est `synaptics` qui,
lut en dernier surcharge la configuretion. Le but est donc de rajouter un fichier `90-libinput-custom.conf` par exemple qui viendra surcharger celui de 
`synaptics`.
Copier / coller la partie du fichier de `libinput` qui correspond au pavé tactile et la mettre dans le nouveau fichier :

```bash
cat /usr/share/X11/xorg.conf.d/90-libinput-custom.conf
# Match on all types of devices but tablet devices and joysticks

Section "InputClass"
        Identifier "libinput touchpad catchall"
        MatchIsTouchpad "on"
        MatchDevicePath "/dev/input/event*"
        Driver "libinput"
        Option "NaturalScrolling" "on"
        Option "Tapping" "on"
        Option "TappingDrag" "on"
        Option "DisableWhileTyping" "on"
EndSection
```

On en profite pour ajouter les **Option** qui nous conviennent, la liste est accessible dans [la doc de `libinput`][manlibinput].

On redémarre ensuite le server X et ... la souris fonctionne à nouveau correctement. 

Si on relance la commande des drivers :

```bash
grep -e "Using input driver " ~/.local/share/xorg/Xorg.0.log
...
[    18.753] (II) Using input driver 'libinput' for 'ETPS/2 Elantech Touchpad'
...
```

Et si on va dans les paramêtres de Gnome-Shell,
![paramêtres Gnome-Shell](/img/2016/20160604-gnome-settings-002.png)

## Liens 

* [https://wiki.archlinux.org/index.php/Libinput#Touchpad_configuration][libinputarch]
* [https://manpages.debian.org/cgi-bin/man.cgi?query=libinput&apropos=0&sektion=0&manpath=Debian+unstable+sid&format=html&locale=en][manlibinput]

[libinputarch]: https://wiki.archlinux.org/index.php/Libinput#Touchpad_configuration
[manlibinput]: https://manpages.debian.org/cgi-bin/man.cgi?query=libinput&apropos=0&sektion=0&manpath=Debian+unstable+sid&format=html&locale=en {:hreflang="en"}

## Edit

 * *2016-06-12*: Quelques corrections d'orthographe