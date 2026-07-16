# MesiComunication - SaaS de Messagerie Unifiée (MVP)

Une interface moderne, sombre et épurée (style Linear/Superhuman) pour centraliser vos conversations sur plusieurs plateformes. 
Ce MVP implémente et active uniquement la plateforme **Twitter/X**, sécurisée par **Supabase Auth** et restreinte par un mur d'abonnement **Stripe Checkout**.

Les anciennes tables de développement Telegram ont été supprimées et le code nettoyé.

---

## 🛠️ Stack Technique

- **Framework** : Next.js 16+ (App Router, Strict TypeScript, Tailwind CSS v4)
- **Authentification** : Supabase Auth via `@supabase/ssr` (Sessions gérées par cookies serveur)
- **Abonnements** : Stripe Billing (Redirection Stripe Checkout + synchronisation Webhook)
- **Librairie X** : `twitter-api-v2` (OAuth 2.0 avec PKCE)
- **Chiffrement** : `AES-256-GCM` (stockage sécurisé des sessions)
- **Base de données** : Supabase (service_role pour la synchronisation, RLS pour les utilisateurs)
- **Icônes** : `lucide-react`

---


### . Installation des dépendances
À la racine du projet, installez les modules requis :
```bash
npm install

puis npm run bot pour lancer le bot discord 

puis npm run dev pour run le projet
```

### . Configuration des variables d'environnement
Créez ou modifiez votre fichier `.env.local` et renseignez les variables requises :
```

---

## 💳 Mode Test Stripe (Webhook & Redirection)

Pour tester le flux complet d'abonnement en local, vous devez écouter les webhooks de Stripe :

1. **Lancez le service Stripe CLI** dans un terminal séparé pour rediriger les événements Stripe vers votre endpoint local :
   ```bash
   stripe listen --forward-to 127.0.0.1:3000/api/stripe/webhook
   ```
2. Copiez la clé secrète générée dans le terminal par la commande (de type `whsec_...`) et collez-la dans la variable `STRIPE_WEBHOOK_SECRET` de votre fichier `.env.local`.
3. Pour effectuer un paiement de test sur Stripe Checkout, utilisez le numéro de carte de crédit générique de test :
   * **Numéro de carte** : `4242 4242 4242 4242`
   * **Date d'expiration** : N'importe quelle date future (ex: `12/32`)
   * **CVC** : N'importe quel code à 3 chiffres (ex: `123`)

---

## 💸 Contrôle du Budget de l'API X (Twitter)

1. **Pas de requêtes automatiques** : L'application ne charge aucune donnée au montage de la page ni via polling.
2. **Rafraîchissement manuel** : La synchronisation s'effectue par clic sur le bouton **"Rafraîchir les messages X"**.
3. **Cooldown de 60 secondes** : Compte à rebours de sécurité bloquant les appels successifs.
4. **Validation d'envoi** : Modale de confirmation avant d'écrire un message (facturation d'écriture).
5. **Compteur d'appels** : Compteur dynamique affichant les appels API de la session courante limités à 150.

---

## 🚀 Lancement de l'application

Lancez le serveur de développement :
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000) et http://127.0.0.1:3000/. Vous serez automatiquement redirigé vers `/login` pour vous connecter ou créer un compte.
