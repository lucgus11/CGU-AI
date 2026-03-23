# CGU Analyzer 🔍

PWA Next.js pour analyser des CGU via l'API Groq (Llama-3.3-70B).

---

## Stack

| Couche | Tech |
|--------|------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Style | Tailwind CSS + Lucide React |
| IA | Vercel AI SDK + Groq (llama-3.3-70b-versatile) |
| BDD | Prisma + Supabase (PostgreSQL) |
| PWA | next-pwa |
| Déploiement | Vercel |

---

## 1. Pré-requis

- Node.js ≥ 18
- Compte [Groq](https://console.groq.com) (gratuit)
- Compte [Supabase](https://supabase.com) (gratuit)
- Compte [Vercel](https://vercel.com) (gratuit)

---

## 2. Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/VOTRE-USERNAME/cgu-analyzer.git
cd cgu-analyzer

# 2. Installer les dépendances
npm install

# 3. Copier le fichier d'environnement
cp .env.example .env.local
# → Remplir les variables (voir section 3)

# 4. Générer le client Prisma et pousser le schéma
npm run db:push

# 5. Lancer en dev
npm run dev
# → http://localhost:3000
```

---

## 3. Variables d'environnement

### 3a. Clé Groq
1. Allez sur https://console.groq.com/keys
2. Cliquez **Create API Key**
3. Copiez la clé → `GROQ_API_KEY=gsk_...`

> **Modèle utilisé :** `llama-3.3-70b-versatile`  
> Contexte : 128k tokens → parfait pour les longues CGU  
> Limite gratuite : ~14 400 req/jour

### 3b. Supabase (base de données)
1. https://supabase.com → **New project** (choisissez une région EU)
2. Attendez la création (~2 min)
3. Allez dans **Settings → Database**
4. Section **Connection string** :
   - Choisissez `Transaction pooler` (port 6543) → c'est votre `DATABASE_URL`
   - Choisissez `Direct connection` (port 5432) → c'est votre `DIRECT_URL`
5. Remplacez `[YOUR-PASSWORD]` par votre mot de passe Supabase

```
DATABASE_URL=postgresql://postgres.[REF]:PASSWORD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[REF]:PASSWORD@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
```

### 3c. Pousser le schéma Prisma
```bash
npm run db:push
# Crée la table "Analysis" dans Supabase automatiquement
```

Pour visualiser vos données :
```bash
npm run db:studio
# → Interface web sur http://localhost:5555
```

---

## 4. Générer les icônes PWA

Créez un fichier `icon.png` (512×512, fond `#6366f1`, lettre "C") et placez-le dans `public/icons/`.

Ou utilisez ce service gratuit : https://realfavicongenerator.net

Fichiers attendus :
```
public/
  icons/
    icon-192x192.png
    icon-512x512.png
  manifest.json   ← déjà créé
```

---

## 5. Déploiement sur Vercel

### 5a. Pousser sur GitHub
```bash
git init
git add .
git commit -m "feat: initial CGU analyzer"
git remote add origin https://github.com/VOTRE-USERNAME/cgu-analyzer.git
git push -u origin main
```

### 5b. Importer sur Vercel
1. https://vercel.com/new
2. **Import Git Repository** → sélectionnez `cgu-analyzer`
3. Framework preset : **Next.js** (détecté auto)
4. Cliquez sur **Environment Variables** et ajoutez :

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `gsk_...` |
| `DATABASE_URL` | `postgresql://postgres.[REF]:PWD@...6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `postgresql://postgres.[REF]:PWD@...5432/postgres` |

5. Cliquez **Deploy** 🚀

> ⚠️ **Important** : Vercel utilise des Edge Functions avec un timeout de 10s sur le plan gratuit.  
> Pour les longues CGU, assurez-vous que votre route `/api/analyze` est dans `app/api/` (Node.js runtime).  
> Ajoutez en haut du fichier `route.ts` si besoin :
> ```ts
> export const maxDuration = 60; // Pro plan uniquement
> ```

### 5c. Vérifier le déploiement PWA
Après déploiement :
1. Ouvrez votre URL Vercel sur mobile
2. Chrome/Safari → "Ajouter à l'écran d'accueil"
3. L'app s'installe comme une app native ✓

---

## 6. Structure des fichiers

```
cgu-analyzer/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    ← Route IA principale
│   │   └── history/route.ts    ← Historique des analyses
│   ├── globals.css
│   ├── layout.tsx              ← Métadonnées PWA
│   └── page.tsx                ← Interface principale
├── prisma/
│   └── schema.prisma           ← Modèle BDD
├── public/
│   ├── manifest.json           ← Config PWA
│   └── icons/                  ← Icônes à créer
├── .env.example                ← Template variables
├── next.config.js              ← Config PWA (next-pwa)
├── package.json
└── tailwind.config.ts
```

---

## 7. Logique du score de confiance

Le score (0–100) est décomposé en 4 critères de 25 points chacun :

| Critère | Description |
|---------|-------------|
| **Clarté** | Termes précis, sans jargon opaque |
| **Droits utilisateur** | Droit à l'oubli, portabilité, rectification explicites |
| **Transparence données** | Liste exhaustive des données et finalités |
| **Absence d'ambiguïté** | Pas de "à notre discrétion", "sans préavis", "peut modifier" |

---

## 8. Déduplication / Cache

Chaque texte analysé est hashé (SHA-256). Si le même contenu est soumis à nouveau, la réponse est retournée depuis la base de données sans appel Groq (indiqué par ⚡ Cache).

---

## Licence

MIT
