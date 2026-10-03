# EduAdmin Pro

Application web de gestion scolaire couvrant l'ensemble du cycle de vie d'un établissement : élèves, enseignants, parents, séances, évaluations, bulletins, messagerie et espaces collaboratifs, avec un module d'accompagnement par IA.

---

## Sommaire

1. [Présentation](#présentation)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Rôles utilisateurs](#rôles-utilisateurs)
4. [Architecture](#architecture)
5. [Technologies utilisées](#technologies-utilisées)
6. [Structure du projet](#structure-du-projet)
7. [Prérequis](#prérequis)
8. [Installation](#installation)
9. [Configuration du fichier `.env`](#configuration-du-fichier-env)
10. [Lancement du backend](#lancement-du-backend)
11. [Lancement du frontend](#lancement-du-frontend)
12. [Tests](#tests)
13. [Sécurité](#sécurité)
14. [Licence](#licence)

---

## Présentation

**EduAdmin Pro** est une plateforme de gestion scolaire full-stack, composée d'une API Laravel et d'une application React monopage, communiquant via une API REST JSON sous le préfixe `/api`.

L'application est conçue pour être déployée dans un établissement réel : elle gère les comptes utilisateurs par rôle, l'authentification par jeton, la vie scolaire (absences, notes, bulletins, devoirs), l'organisation pédagogique (cours, emplois du temps, classes, groupes), la communication (messagerie, annonces, notifications) ainsi que des extensions dédiées (sauvegardes, import/export, centre de sécurité, réunions virtuelles Jitsi, assistants IA).

---

## Fonctionnalités principales

Les fonctionnalités ci-dessous sont celles effectivement présentes dans le code (routes API Laravel et pages du frontend).

### Tableau de bord et pilotage
- Tableau de bord personnalisé par rôle
- Statistiques, analytics et rapports de cours
- Journal d'activité et historique des connexions

### Élèves, enseignants et parents
- Annuaire et gestion des élèves, enseignants et parents
- Inscription, désinscription, promotion
- Attribution automatique des parents à un élève

### Vie scolaire
- **Appel / présences** : pointage, consultations par élève, parents et groupes
- **Notes et bulletins** : saisie des notes, bulletins, calcul et publication en lot
- **Devoirs** : dépôt, partage aux élèves, soumission et correction
- **Groupes** : création de groupes, membres, conversations de groupe

### Organisation pédagogique
- **Cours** et **sections de classe** avec affectation des enseignants
- **Emplois du temps** : création, détection de conflits, demandes de reprogrammation, notes
- **Événements** et calendrier scolaire

### Communication
- Messagerie privée et conversations de groupe, avec pièces jointes
- Annonces avec gestion de l'audience
- Notifications intelligentes

### Administration
- Gestion des rôles, paramètres système
- **Sauvegardes système** : création, restauration, suivi des jobs
- **Import / export** de données
- **Centre de sécurité** : double authentification (2FA), historique de sessions, révocation, tentatives échouées
- Gestion des fichiers et des médias

### Fonctionnalités IA
- Assistant d'étude (`/ai-study`)
- Préparation d'examens (`/exam-prep`)
- Génération de quizzes par cours avec suivi des tentatives (`/ai-quiz`)
- Plateforme de discussion associée

### Fonctionnalités supplémentaires
- Réunions virtuelles via **Jitsi** (`JITSI_DOMAIN`), avec participants, ressources, chat et contrôle de main
- Interface trilingue **anglais / français / arabe**

---

## Rôles utilisateurs

Cinq rôles sont implémentés dans `app/Models/User.php` et contrôlés par `App\Http\Middleware\RoleMiddleware` :

| Rôle | Identifiant | Accès principal |
|---|---|---|
| Super administrateur | `super_admin` | Accès complet, y compris administration, sécurité, sauvegardes, import/export |
| Administrateur | `admin` | Administration, élèves, enseignants, parents, paramètres, import/export |
| Enseignant | `teacher` | Cours, devoirs, notes, absences, groupes, annonces, quiz |
| Élève | `student` | Cours, devoirs, notes, bulletins, assistant IA, préparation d'examens |
| Parent | `parent` | Consultation des données de ses enfants (données cloisonnées) |

Les autorisations sont définies côté backend via le middleware `role:`. L'accès aux différents écrans est également filtré côté frontend dans `frontend/src/config/navigation.js`.

Un middleware dédié `ParentMiddleware` restreint l'accès aux données des enfants du parent connecté.

---

## Architecture

### Schéma général

```
┌──────────────────────────┐        /api (JSON)        ┌──────────────────────────┐
│  frontend/               │  ───────────────────────► │  EduAdmin-Pro/           │
│  React 18 + Vite (SPA)   │  ◄─────────────────────── │  Laravel 10 (API REST)   │
│  port 5173               │      réponses JSON        │  port 8888               │
└──────────────────────────┘                           └──────────────────────────┘
                │                                                  │
                │  proxy /api en développement (Vite)              │  Eloquent ORM
                └──────────────────────────────►                   ▼
                                                          MySQL / MariaDB
```

### Backend — `EduAdmin-Pro/`
- **Laravel 10** avec architecture REST, routes définies dans `routes/api.php` (préfixe `/api`)
- **Authentification** Laravel Sanctum (jetons SPA) via le groupe de routes `auth`
- **Base de données** via Eloquent ORM, **20 migrations**
- **Middleware métier** :
  - `RoleMiddleware` — contrôle du rôle
  - `ParentMiddleware` — cloisonnement des données parent/enfant
  - `ActivityLogMiddleware` — journalisation des activités
  - `SetApiLocale` — localisation des réponses API
- **Services tiers configurables** : OpenAI-compatible (`config/services.php`) et Jitsi
- **Commandes Artisan** personnalisées (voir [Tests](#tests) et [Installation](#installation))

### Frontend — `frontend/`
- **React 18** en application monopage
- **Vite 5** comme serveur de développement et outil de build
- Communication avec l'API via **Axios**, endpoint de base `/api` (proxy Vite en développement)
- **i18next** pour la traduction, fichiers dans `frontend/public/locales/{en,fr,ar}/`
- **Zustand** pour la gestion d'état
- Navigation protégée par rôle, animations **Framer Motion**, notifications **react-hot-toast**

### Communication réseau

| Élément | Valeur | Source |
|---|---|---|
| Port du serveur Laravel | `8888` | `APP_URL` dans `.env.example` |
| Port du serveur Vite | `5173` (`strictPort: true`) | `frontend/vite.config.js` |
| Proxy de développement | `VITE_DEV_API_PROXY` → `http://127.0.0.1:8888` | `frontend/vite.config.js` |
| Base API côté frontend | `/api` | `VITE_API_URL` |
| Origines CORS autorisées | `http://localhost:5173`, `http://127.0.0.1:5173` | `config/cors.php` |
| Origines stateful Sanctum | `localhost:5173`, `127.0.0.1:5173` | `SANCTUM_STATEFUL_DOMAINS` |

---

## Technologies utilisées

### Backend

| Technologie | Version | Rôle |
|---|---|---|
| PHP | `^8.2` | Langage |
| Laravel Framework | `^10.48` | Framework applicatif |
| Laravel Sanctum | `^3.3` | Authentification par jetons |
| PHPUnit | `^10.5` | Tests automatisés |
| fakerphp/faker | `^1.23` | Données de test |
| Laravel Pint | `^1.13` | Formatage du code |
| MySQL / MariaDB | — | Base de données |

### Frontend

| Technologie | Version | Rôle |
|---|---|---|
| React | `^18.2.0` | Bibliothèque d'interface |
| React DOM | `^18.2.0` | Rendu DOM |
| React Router DOM | `^6.21.0` | Routage côté client |
| Vite | `^5.0.0` | Serveur de dev et build |
| Axios | `^1.6.0` | Client HTTP |
| Zustand | `^4.4.0` | Gestion d'état |
| Chart.js / react-chartjs-2 | `^4.4.0` / `^5.2.0` | Graphiques et statistiques |
| Framer Motion | `^11.18.2` | Animations d'interface |
| i18next / react-i18next | `^26.2.0` / `^17.0.8` | Internationalisation |
| FontAwesome | `^6.5.0` | Icônes |
| react-hot-toast | `^2.4.0` | Notifications |
| date-fns | `^3.2.0` | Manipulation des dates |
| @dnd-kit | `^6.3.1` | Glisser-déposer |

### Services externes (optionnels)

| Service | Configuration | Par défaut |
|---|---|---|
| API OpenAI-compatible | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT`, `OPENAI_BASE_URL`, `OPENAI_ORGANIZATION` | `gpt-4o-mini`, `https://api.openai.com/v1`, `120` s |
| Jitsi Meet | `JITSI_DOMAIN` | `meet.jit.si` |

Ces services ne sont pas obligatoires pour faire fonctionner l'application de base.

---

## Structure du projet

```
.
├── EduAdmin-Pro/              # Backend Laravel
│   ├── app/
│   │   ├── Console/Commands/  # Commandes Artisan personnalisées
│   │   ├── Http/
│   │   │   ├── Controllers/   # Contrôleurs (API)
│   │   │   └── Middleware/    # RoleMiddleware, ParentMiddleware, etc.
│   │   └── Models/            # 40 modèles Eloquent
│   ├── config/                # Configuration (services, cors, database, ...)
│   ├── database/
│   │   ├── migrations/        # 20 migrations
│   │   └── seeders/           # Données de démonstration
│   ├── docs/
│   │   └── FRESH_DEPLOYMENT.md
│   ├── public/                # Point d'entrée HTTP
│   ├── resources/             # Vues Blade, traductions
│   ├── routes/
│   │   ├── api.php            # Routes API (préfixe /api)
│   │   ├── console.php
│   │   └── web.php
│   ├── storage/               # Logs, cache, sessions
│   ├── tests/                 # Tests PHPUnit
│   ├── .env.example           # Modèle de configuration
│   ├── artisan
│   └── composer.json
│
├── frontend/                  # Frontend React + Vite
│   ├── public/
│   │   └── locales/           # Traductions en/fr/ar
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   ├── config/            # Navigation, configuration
│   │   ├── hooks/             # Hooks React personnalisés
│   │   ├── i18n/              # Configuration i18next
│   │   ├── motion/            # Animations
│   │   ├── pages/             # Pages de l'application
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── landing/
│   │   │   └── ...            # 23 modules fonctionnels
│   │   ├── services/          # Clients API (api.js, aiQuizApi.js)
│   │   ├── store/             # État global (Zustand)
│   │   ├── styles/
│   │   └── utils/
│   ├── .env.example           # Modèle de configuration
│   ├── vite.config.js
│   └── package.json
│
├── docs/                      # Documentation et rapports
├── .gitignore
└── README.md
```

---

## Prérequis

| Élément | Version requise | Vérification |
|---|---|---|
| PHP | `^8.2` ou supérieur | `php -v` |
| Composer | 2.x | `composer --version` |
| MySQL | 8.x (ou MariaDB compatible) | `mysql --version` |
| Node.js | `^18.0.0` ou `>=20.0.0` | `node -v` |
| npm | fourni avec Node.js | `npm -v` |

Aucune dépendance à un serveur web externe n'est nécessaire en développement : le serveur intégré de Laravel (`php artisan serve`) et celui de Vite (`npm run dev`) suffisent.

---

## Installation

### 1. Récupérer le projet

```bash
git clone <url-du-depot>
cd "projet-pfe/EduAdmin PRO"
```

### 2. Installer les dépendances du backend

```bash
cd EduAdmin-Pro
composer install
```

### 3. Installer les dépendances du frontend

```bash
cd frontend
npm install
```

> Les deux répertoires (`EduAdmin-Pro/` et `frontend/`) sont indépendants : il faut lancer `composer install` et `npm install` séparément.

### 4. Créer la base de données

```sql
CREATE DATABASE eduadmin_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Configurer l'environnement et initialiser la base

Suivez la section [Configuration du fichier `.env`](#configuration-du-fichier-env), puis exécutez :

```bash
cd EduAdmin-Pro
php artisan key:generate
php artisan migrate
php artisan db:seed
```

### 6. Option — jeu de données de démonstration

Deux commandes Artisan personnalisées sont fournies :

```bash
# Installer un jeu de données de démonstration réaliste
php artisan eduadmin:seed-moroccan-demo

# Nettoyer toutes les données de démonstration et ne conserver
# que le compte Super Admin et les paramètres système
php artisan eduadmin:prepare-fresh-deployment
```

La procédure complète de déploiement sur une base vide, les conventions d'adresses e-mail et la création manuelle d'utilisateurs sont documentées dans **`EduAdmin-Pro/docs/FRESH_DEPLOYMENT.md`**.

---

## Configuration du fichier `.env`

### Backend — `EduAdmin-Pro/.env`

Un modèle de configuration est fourni : **`EduAdmin-Pro/.env.example`**.

Sous Windows (PowerShell) :

```powershell
Copy-Item EduAdmin-Pro/.env.example EduAdmin-Pro/.env
```

Sous Linux / macOS :

```bash
cp EduAdmin-Pro/.env.example EduAdmin-Pro/.env
```

> Le script Composer `post-root-package-install` effectue déjà cette copie automatiquement lors d'un `composer install` sur un projet sans `.env`.

Générez ensuite la clé d'application :

```bash
cd EduAdmin-Pro
php artisan key:generate
```

#### Variables à renseigner

| Variable | Rôle | Valeur |
|---|---|---|
| `APP_KEY` | Clé de chiffrement Laravel | Générée par `php artisan key:generate` |
| `APP_URL` | URL publique du backend | `http://127.0.0.1:8888` |
| `DB_CONNECTION` | Connexion base de données | `mysql` |
| `DB_HOST` | Hôte MySQL | `127.0.0.1` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_DATABASE` | Nom de la base | `eduadmin_pro` |
| `DB_USERNAME` | Utilisateur MySQL | à adapter |
| `DB_PASSWORD` | Mot de passe MySQL | à renseigner |
| `FRONTEND_URL` | URL du serveur Vite, utilisée pour rediriger vers `/login` | `http://127.0.0.1:5173` |
| `SANCTUM_STATEFUL_DOMAINS` | Domaines autorisés pour l'authentification SPA | `localhost:5173,127.0.0.1:5173` |
| `OPENAI_API_KEY` | Clé API pour les fonctions IA | vide si l'IA n'est pas utilisée |
| `OPENAI_MODEL` | Modèle IA utilisé | `gpt-4o-mini` |
| `OPENAI_TIMEOUT` | Délai maximal des appels IA (secondes) | `120` |
| `OPENAI_BASE_URL` | Point d'entrée de l'API IA (compatible OpenAI) | `https://api.openai.com/v1` |
| `OPENAI_ORGANIZATION` | Organisation (requis par certains fournisseurs) | vide par défaut |
| `JITSI_DOMAIN` | Domaine des réunions virtuelles | `meet.jit.si` |

Les variables optionnelles commentingées dans `.env.example` (`OPENAI_BASE_URL`, `OPENAI_ORGANIZATION`, bloc AWS S3) ne sont nécessaires que si vous activez le service correspondant.

Le stockage des fichiers utilise `FILESYSTEM_DISK=local` par défaut. Pour un stockage objet, renseignez le bloc `AWS_*`.

### Frontend — `frontend/.env`

Un modèle est également fourni : **`frontend/.env.example`**.

Sous Windows (PowerShell) :

```powershell
Copy-Item frontend/.env.example frontend/.env
```

Sous Linux / macOS :

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Rôle | Valeur |
|---|---|---|
| `VITE_API_URL` | Chemin de base de l'API côté frontend | `/api` |
| `VITE_DEV_API_PROXY` | URL backend vers laquelle Vite relaie `/api` en développement | `http://127.0.0.1:8888` |

`VITE_DEV_API_PROXY` doit correspondre à votre `APP_URL` backend, et `VITE_API_URL` doit correspondre au préfixe des routes API.

> Les URL CORS autorisées côté backend sont définies dans `EduAdmin-Pro/config/cors.php` (`localhost:5173` et `127.0.0.1:5173`). Si vous modifiez le port du frontend, mettez à jour `config/cors.php` **et** `SANCTUM_STATEFUL_DOMAINS`.

---

## Lancement du backend

Depuis le répertoire `EduAdmin-Pro/` :

```bash
# Démarrer le serveur de développement
php artisan serve --port=8888
```

L'API est alors disponible sur `http://127.0.0.1:8888/api`.

Commandes utiles :

```bash
php artisan migrate            # Appliquer les migrations
php artisan migrate:fresh      # Réinitialiser la base (attention : perte de données)
php artisan db:seed            # Charger les données de démonstration
php artisan route:list         # Lister toutes les routes
php artisan config:clear       # Vider le cache de configuration
```

> `php artisan serve` accepte `--host` et `--port`. Le port `8888` est celui utilisé par défaut dans `.env.example`.

---

## Lancement du frontend

Depuis le répertoire `frontend/` :

```bash
# Serveur de développement avec rechargement à chaud
npm run dev
```

L'interface est alors accessible sur `http://localhost:5173`.

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Générer le build de production dans `dist/` |
| `npm run preview` | Prévisualiser le build de production localement |

Pour la production, compilez le frontend puis faites pointer le serveur web sur le dossier `dist/` généré, avec le backend comme API.

---

## Tests

### Backend — PHPUnit

Le projet dispose d'une suite de tests automatisés dans `EduAdmin-Pro/tests/` (**35 classes de test**, dont 33 tests métier et 2 tests d'exemple par défaut Laravel), couvrant notamment :

- Authentification, rôles et autorisations (`AuthRoleLoginTest`, `RoleAuthorizationTest`, `AuthRememberMeTest`)
- Élèves, parents et attribution automatique (`ParentManagementTest`, `StudentAutoParentTest`, `StudentIdValidationTest`)
- Notes, bulletins et emplois du temps (`StudentBulletinTest`, `TimetableTest`, `TimetableRescheduleTest`)
- Groupes, cours et périmètres d'accès (`GroupSystemTest`, `CourseAuthorizationTest`, `CourseTeacherScopeTest`)
- Fonctionnalités IA (`AiStudyAssistantTest`, `AiExamPrepTest`, `CourseAiQuizTest`)
- Sauvegardes, import/export, centre de sécurité (`BackupRestoreTest`, `ImportExportTest`, `SecurityCenterTest`)
- Réunions virtuelles, événements, notifications, journal d'activité

Exécution :

```bash
cd EduAdmin-Pro
php artisan test
```

Ou pour une suite précise :

```bash
php artisan test --filter=RoleAuthorizationTest
```

La configuration de PHPUnit se trouve dans `EduAdmin-Pro/phpunit.xml`. Les tests de type `Feature` requièrent une base de données configurée dans `.env`.

### Frontend

Aucun test automatisé n'est présent dans le frontend : `package.json` ne définit aucune commande `test` et aucun runner de tests (Vitest, Jest) n'est installé.

---

## Sécurité

### ⚠️ Ne jamais publier le fichier `.env`

Le fichier `EduAdmin-Pro/.env` contient des données **strictement confidentielles** : clé d'application Laravel, identifiants de base de données, et éventuellement clé API IA. **Il ne doit jamais être versionné ni transmis.**

Le fichier `.gitignore` du dépôt est configuré pour protéger automatiquement :

| Motif ignoré | Description |
|---|---|
| `.env` | Fichier de configuration local |
| `.env.*` | Toutes les variantes (`.env.production`, `.env.local`, `.env.backup`, ...) |
| `!.env.example` | **Exception** : le modèle de configuration est bien versionné |

Avant tout commit :

```bash
git status
```

Vérifiez qu'aucun fichier `.env` ne figure parmi les fichiers à envoyer.

Si une clé a été committée par inadvertance, elle doit être considérée comme compromise : **faites tourner `php artisan key:generate`** et révocez la clé concernée auprès de son fournisseur.

### Autres bonnes pratiques

- **Générez votre propre `APP_KEY`** : ne réutilisez jamais celle d'un autre poste ou d'un dépôt public.
- **Ne placez aucun secret en clair dans le code frontend** : les variables préfixées par `VITE_` sont incluses dans le bundle servi au navigateur et sont donc publiques.
- **Utilisez des comptes de démonstration à usage unique** et changez leurs mots de passe dès le premier déploiement (voir `EduAdmin-Pro/docs/FRESH_DEPLOYMENT.md`).
- **Configurez `APP_DEBUG=false`** et `APP_ENV=production` en production, et activez le HTTPS.
- **Mettez à jour vos dépendances** régulièrement (`composer update`, `npm update`) pour corriger les vulnérabilités connues.
- **Sauvegardez la base de données** à intervalles réguliers via le module de sauvegardes système.

---

## Licence

Ce projet est distribué sous la **licence MIT**, déclarée dans `EduAdmin-Pro/composer.json` :

```json
"license": "MIT"
```

> Le fichier `LICENSE` n'est pas encore présent à la racine du dépôt. Ajoutez-le avant toute diffusion publique du projet.