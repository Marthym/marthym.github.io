---
title: Visitor vs. instanceof vs. isAssignableFrom
excerpt: "Eviter les tests de classe et les cast dans un structure d'héritage"
#modified: 2015-09-21
tags: [java, planetlibre]
image: back.png
draft: true
---

La question revient régulièrement sur [Stackoverflow](https://stackoverflow.com), "Est ce que je peux remplacer mes
`if instanceof else if` par quelque chose de plus performant ?". En effet in `instanceof` est une opération assé
couteuse à effectuer. Et la réponse qui vient spontanéement c'est "Utilise l'héritage, c'est fait pour ça !".

Illustrons par un exemple disons qu'on développe un jeu et qu'un guerrier doit se munir d'une arme utilisable pour combattre :

```java
public abstract class Weapon {
    protected final long attack;

    protected Weapon(long attack) {
        this.attack = attack;
    }

    public static Sword sword() {
        return new Sword(150);
    }

    public static Gun gun() {
        return new Gun(250);
    }
}
```

```java
public class Sword extends Weapon {
    private final static long UNUSABLE_THRESHOLD = 100;
    private long wear;

    protected Sword(long attack) {
        super(attack);
        wear = 0;
    }

    public long getWear() {
        return wear;
    }
}
```

```java
public class Gun extends Weapon {
    private long ammunition;

    protected Gun(long attack) {
        super(attack);
        ammunition = 0;
    }

    public long getAmmunition() {
        return ammunition;
    }
}
```

```java
public class Warrior {
    private final String name;
    private long life;
    private long strength;
    private long tiredness;

    private Weapon mainWeapon;

    public Warrior(String name, long life, long strength) {
        this.name = name;
        this.life = life;
        this.strength = strength;
        this.tiredness = 0;
    }

    public void take(Weapon w) {
        mainWeapon = w;
    }

    public String getName() {
        return name;
    }

}
```

On veut savoir si le guerrier est prêt à se battre ?

```java
public class Warrior {
  // ...

  public boolean isReadyToFight() {
      boolean isReadyToFight = false;
      if (mainWeapon instanceof Sword) {
          isReadyToFight = life > 10 && ((Sword) mainWeapon).getWear() <= 100;
      } else if (mainWeapon instanceof Gun) {
          isReadyToFight = life > 10 && ((Gun) mainWeapon).getAmmunition() > 0;
      }
      return isReadyToFight;
  }
  // ....
}
```

Voilà la version (dirty) avec `instanceof` on ne connait pas le type d'arme au moment de l'attaque donc on teste. C'est un exemple, je suppose que personne
n'écrirait ce genre de code mais c'est pour l'exemple. Donc là le code est lourd, si on a une grande quantité de type d'arme ça va vite devenir le bordel
et coté perf, `instanceof` est pas recommandé. Donc on peut amélioré en utilisant le polymorphisme :

```java
public abstract class Weapon {
    protected final long attack;

    protected Weapon(long attack) {
        this.attack = attack;
    }

    public static Sword sword() {
        return new Sword(150);
    }

    public static Gun gun() {
        return new Gun(250);
    }

    public abstract boolean isUsable();
}
```

```java
public class Sword extends Weapon {
    private final static long UNUSABLE_THRESHOLD = 100;
    private long wear;

    protected Sword(long attack) {
        super(attack);
        wear = 0;
    }

    @Override
    public boolean isUsable() {
        return wear <= 100;
    }
}
```

```java
public class Gun extends Weapon {
    private long ammunition;

    protected Gun(long attack) {
        super(attack);
        ammunition = 0;
    }

    @Override
    public boolean isUsable() {
        return ammunition > 0;
    }
}
```

```java
public class Gun extends Weapon {
    private long ammunition;

    protected Gun(long attack) {
        super(attack);
        ammunition = 0;
    }

    @Override
    public boolean isUsable() {
        return ammunition > 0;
    }
}
```

```java
public class Warrior {
  // ...

  public boolean isReadyToFight() {
      return life > 10 && mainWeapon != null && mainWeapon.isUsable();
  }
  // ....
}
```
Là c'est quand même mieux
