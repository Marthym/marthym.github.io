---
title: Ma configuration Tmux
date: "2019-07-23T13:09:00+02:00"
excerpt: "Tmux est l’un des outils que j’utilise le plus dans mes journées, voici donc la configuration que j’utilise"
tags: [tmux, tools, console, programmation, planetlibre]
image: back.webp
comment: /s/44gpgk/ma_configuration_tmux
---

Je ne partage pas mes dotfile files sur github comme le font pas mal de dev. C’est long et pas forcément optimal. En plus c’est un risque si j’ai dans mes fichiers de données sensibles comme des mots de passes. Pour mes fichiers de configuration, j’utilise un gros playbook ansible qui va installer et configurer mon environnement. Alors je pourrais le mettre lui, mais idem, je ne suis pas sûr qu’il n’y ai aucun mot de passe ou données sensible dans je préfère le garder pour l’instant. 

Néanmoins, j’ai récement modifié ma configuration [tmux](https://github.com/tmux/tmux/wiki) et du coup je me dis pourquoi pas en faire part à la foule de développeurs passionnés qui lisent tous les journées mes articles (si si j’en suis sûr).

<!-- more -->

## Les détails principaux
### Ajout d’un raccourci plus simple

Par défaut le préfix de `tmux` est `Ctrl+B`, mais sur un clavier français, c'est pas super efficace, `Ctrl+X` est plus efficace

```plain
# prefix is CTRL-B and CTRL-X
set -g prefix C-b
set -g prefix2 C-x

# enable CTRL-B and CTRL-X under other programs (like vim) - you'll have to press twice le combination to have the old one
bind C-b send-prefix
bind C-x send-prefix
```

Et on fait en sort que dans un éditeur text on puisse quand même accéder au préfixe en le doublant

### Passage en 256 couleurs

Par défaut on a que 16 couleur

```plain
# Set 256-colour terminal (default is 16)
set -g default-terminal "screen-256color"
```

### Augmentation de l’historique

```plain
# Number of lines held in window history
set -g history-limit 100000
```

### Index de fenêtre

On règle l’index des fenêtres pour le faire commencer à 1, c’est plus simple sur le clavier quand les fenêtres sont dans le bon ordre et que la première n'est pas à l’autre bout.

```plain
# number windows starting from 1 - handy for direct access
set -g base-index 1
```

### Raccourcis de changement de fenêtre

On réajuste les raccourcis pour changer de fenêtre facilement. C’est plus ou moins personnel, mais je trouve ça plus intuitif.

```plain
# tab like window switching
bind -n S-down new-window -c '#{pane_current_path}'
bind -n S-left prev
bind -n S-right next
bind -n C-S-left swap-window -t -1
bind -n C-S-right swap-window -t +1
```

### Commande de split panel

C’est l’une des plus importantes modifications. On change les raccourcis pour découper les panneux, `_` et `|`, c'est carrément plus intuitif non ?

```plain
bind | split-window -h -c '#{pane_current_path}' # Split panes horizontal
bind _ split-window -v -c '#{pane_current_path}' # Split panes vertical
```

### Presse papier

Par défaut la copie de texte dans tmux reste dans tmux. C'est-à-dire que ça tmux utilise son propre tampon et que ce qui est copié dans tmux ne peut être collé dans une autre application. Voilà comment configurer `tmux` pour qu’il écrive dans le tampon système.

```plain
# Configure tmux buffer to clipbard
setw -g mode-keys vi
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-pipe 'xclip -in -selection clipboard'
```

Ça utilise `xclip` donc pour que ça fonctionne, ce dernier doit être installé, sinon ça ne fonctionnera pas.

### Le thème

The last but not the least ! C’est bète mais c’est très important, par défaut le thème de `tmux` pique un peu les yeux. En cherchant j’ai trouvé le thème 
[Nord](https://www.nordtheme.com/ports/tmux) qui est plutôt sympa et propre.

Je l’ai un peu customizé par contre parce que j’avais un souci avec les flèches gauche de powerline.

```plain
run-shell "~/.tmux/themes/nord/nord.tmux"
```

## Le fichier complet

```plain
# prefix is CTRL-B and CTRL-X
set -g prefix C-b
set -g prefix2 C-x
set-window-option -g xterm-keys on

# enable CTRL-B and CTRL-X under other programs (like vim) - you'll have to press twice le combination to have the old one
bind C-b send-prefix
bind C-x send-prefix

# Set 256-colour terminal (default is 16)
set -g default-terminal "screen-256color"

# Number of lines held in window history
set -g history-limit 100000

# Set status bar
#set -g status-right "#(hostname) #[bold]%d-%m-%Y#[nobold] %H:%M "
#set -g status-fg white
#set -g status-bg colour238
#setw -g window-status-current-style bg=blue

# number windows starting from 1 - handy for direct access
set -g base-index 1

# Set window notifications
setw -g monitor-activity on

# Automatically set window title
setw -g automatic-rename on

# tab like window switching
bind -n S-down new-window -c '#{pane_current_path}'
bind -n S-left prev
bind -n S-right next
bind -n C-S-left swap-window -t -1
bind -n C-S-right swap-window -t +1

# Enhanced next/previous window: ability to press multiple times n/p
bind -r n next-window
bind -r p previous-window

# Synchronize all the panes
bind a setw synchronize-panes

bind | split-window -h -c '#{pane_current_path}' # Split panes horizontal
bind _ split-window -v -c '#{pane_current_path}' # Split panes vertical

# Configure tmux buffer to clipbard
setw -g mode-keys vi
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-pipe 'xclip -in -selection clipboard'

run-shell "~/.tmux/themes/nord/nord.tmux"
```