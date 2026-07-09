# Antigravity Omni - SaaS de Messagerie Unifiée (MVP)

Une interface moderne, sombre et épurée (style Linear/Superhuman) pour centraliser vos conversations sur plusieurs plateformes. 
Ce MVP implémente et active uniquement la plateforme **Twitter/X**, les autres onglets (**Instagram**, **Messenger**, **Threads**) étant désactivés pour l'instant avec une modale "Bientôt disponible".

---

## 🛠️ Stack Technique

- **Framework** : Next.js 14+ (App Router, Strict TypeScript, Tailwind CSS v4)
- **Librairie X** : `twitter-api-v2` (OAuth 2.0 avec PKCE)
- **Chiffrement** : `AES-256-GCM` (stockage sécurisé des sessions)
- **Base de données** : Supabase (service_role)
- **Icônes** : `lucide-react`

---

## ⚙️ Configuration & Installation

### 1. Installation des dépendances

À la racine du projet, installez les modules requis :
```bash
npm install
```

### 2. Configuration des variables d'environnement

Copiez le fichier d'exemple pour créer votre fichier local :
```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et renseignez vos clés :
```env
# Clés Supabase
NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="votre_service_role_key"

# Clé de chiffrement (Chaîne hexadécimale de 64 caractères / 32 octets)
# Générez une clé via : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_ENCRYPTION_KEY="votre_cle_de_chiffrement_hex"

# Clés OAuth 2.0 de X (Twitter)
X_CLIENT_ID="VOTRE_CLIENT_ID_OAUTH2"
X_CLIENT_SECRET="VOTRE_CLIENT_SECRET_OAUTH2"
```

> [!IMPORTANT]
> **Configuration du portail développeur X (developer.x.com) pour OAuth 2.0 :**
> 1. Allez dans votre application sur le portail développeur X.
> 2. Sous **User authentication settings**, cliquez sur **Set up** (ou **Edit**).
> 3. Activez **OAuth 2.0**.
> 4. Définissez le type d'application sur **Web App, Automated App or Bot**.
> 5. Dans **App Info**, configurez le **Callback URI / Redirect URL** sur :
>    `http://127.0.0.1:3000/api/x/callback` (ou votre URL de production en HTTPS).
>    Configurez le **Website URL** (ex. `http://127.0.0.1:3000`).
> 6. Enregistrez. X va vous afficher votre **Client ID** et votre **Client Secret**. Copiez-les dans votre fichier `.env.local`.
> 7. Vérifiez également que les permissions d'authentification incluent **"Read and write and Direct message"** pour que l'écriture de DMs fonctionne.

---

## 💸 Contrôle du Budget de l'API X (Twitter)

Pour éviter des facturations excessives ou inattendues, les mécanismes de sécurité suivants sont mis en place :
1. **Pas de requêtes automatiques** : L'application ne charge aucune donnée au montage de la page ni via polling.
2. **Rafraîchissement manuel** : La synchronisation des conversations s'effectue exclusivement par le clic sur le bouton **"Rafraîchir les messages X"**.
3. **Cooldown de 60 secondes** : Le bouton de rafraîchissement se désactive pendant 60 secondes après chaque clic, affichant un compte à rebours visuel.
4. **Validation d'envoi** : Toute réponse écrite déclenche une modale de confirmation d'envoi pour éviter les clics accidentels facturés.
5. **Compteur d'appels** : Un compteur affiche en permanence le nombre d'appels API effectués pendant la session de navigation.

---

## 🚀 Lancement de l'application

Lancez le serveur de développement en local :
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).
