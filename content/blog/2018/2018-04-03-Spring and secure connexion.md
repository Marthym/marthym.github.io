---
title: Spring et connexion sécurisé via proxy
date: "2018-04-03T12:00:00-00:00"
excerpt: "requiresSecure() dérrière un proxy NginX"
tags: [spring, nginx, https, java, planetlibre]
image: back.png
---

Dans le cadre d’un projet, j’ai une configuration Spring Secure tel que :

``` java
...
http.requiresChannel()
    .antMatchers("/client/").requiresSecure()
    .antMatchers("/fr/client/").requiresSecure()
    .antMatchers("/es/client/").requiresSecure()
    .antMatchers("/en/client/").requiresSecure()
...
```

Ce qui provoque un redirect vers https si l’on tente d’accéder à l’une de ces URL en http.

Le problème est lorsque que je mets un reverse proxy NginX devant, c’est lui qui s’occupe du https, il redirige vers mes routes Spring en http. Spring ne permet de configurer qu’un seul port de serveur qui peut faire http/https. Mais tous mes certif ne sont pas configurés et j’ai pas forcément envie de faire du https entre NginX et Spring. 

Du coup, pour que Spring détecte la connexion comme sécurisé et ne fasse pas une redirection infinie entre lui et le reverse proxy, il faut que la configuration NginX ressemble à ça :

``` nginx
server {
    listen       443 ssl;
    server_name   monsite.fr

    ssl on;
    ssl_certificate     /etc/ssl/monsite.fr.crt;
    ssl_certificate_key /etc/ssl/monsite.fr.key;
    ssl_protocols       TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Is-Secure true;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass http://localhost:9003/;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

L’important étant les headers `X-Forwarded`.