import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as dotenv from 'dotenv';

// ---------------------------------------------------------------------------
// Chargement des variables d'environnement
// ---------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[Bot] Variables chargées depuis :', envPath);
} else {
  dotenv.config();
}

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.DISCORD_TOKEN || '';
const BOT_PORT = parseInt(process.env.BOT_PORT || '3001', 10);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!TOKEN) {
  console.error('[Bot] DISCORD_TOKEN manquant dans .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Client Supabase (Service Role pour écrire sans restriction)
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Client Discord
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ---------------------------------------------------------------------------
// Capture des messages Discord → Supabase
// ---------------------------------------------------------------------------
client.on('messageCreate', async (msg) => {
  if (msg.author.bot && msg.webhookId) return; // ignorer les webhooks Mesi Omni

  const nomServeur = msg.guild?.name;
  const nomCanal = (msg.channel as any).name || msg.channelId;
  const nomFil = nomServeur
    ? `${nomServeur} > #${nomCanal}`
    : 'DM';

  const { error } = await supabase.from('messages').upsert({
    platform: 'discord',
    external_id: msg.id,
    thread_id: msg.channelId,
    thread_name: nomFil,
    sender_name: msg.author.username,
    sender_avatar_url: msg.author.displayAvatarURL(),
    content: msg.content || '[media]',
    sent_at: msg.createdAt.toISOString(),
    is_outgoing: false,
  }, { onConflict: 'external_id' });

  if (error) {
    console.error('[Bot] Erreur upsert message :', error.message);
  } else {
    console.log(`[Bot] Message enregistré : [#${msg.channelId}] @${msg.author.username}`);
  }
});

// ---------------------------------------------------------------------------
// Serveur HTTP interne pour les envois sortants (/send)
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { channelId, text, userId, username, avatarUrl } = JSON.parse(body);

        if (!channelId || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'channelId et text requis.' }));
          return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel || !('send' in channel)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Canal ${channelId} introuvable.` }));
          return;
        }

        let sent: any;
        const nomExpediteur = username || client.user?.username || 'Bot';
        const avatarExpediteur = avatarUrl || client.user?.displayAvatarURL() || undefined;

        // Envoi via Webhook (affiche le nom/avatar de l'utilisateur connecté)
        try {
          const textChannel = channel as any;
          if (textChannel.fetchWebhooks) {
            const webhooks = await textChannel.fetchWebhooks();
            let webhook = webhooks.find(
              (w: any) => w.owner?.id === client.user?.id && w.name === 'Mesi Omni'
            );

            if (!webhook) {
              webhook = await textChannel.createWebhook({
                name: 'Mesi Omni',
                avatar: client.user?.displayAvatarURL(),
              });
              console.log(`[Bot] Webhook créé dans #${textChannel.name}`);
            }

            sent = await webhook.send({
              content: text,
              username: nomExpediteur,
              avatarURL: avatarExpediteur,
            });
          } else {
            sent = await textChannel.send(text);
          }
        } catch (webhookErr) {
          console.warn('[Bot] Webhook échoué, fallback bot direct :', webhookErr);
          sent = await (channel as any).send(text);
        }

        // Enregistrement en base (message sortant)
        const nomFil = (channel as any).guild
          ? `${(channel as any).guild.name} > #${(channel as any).name || channelId}`
          : 'DM';

        await supabase.from('messages').insert({
          platform: 'discord',
          external_id: sent.id,
          thread_id: channelId,
          thread_name: nomFil,
          sender_name: nomExpediteur,
          sender_avatar_url: avatarExpediteur || null,
          content: text,
          sent_at: (sent.createdAt || new Date()).toISOString(),
          is_outgoing: true,
          user_id: userId || null,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: {
            id: sent.id,
            sent_at: (sent.createdAt || new Date()).toISOString(),
          },
        }));
      } catch (err: any) {
        console.error('[Bot] Erreur envoi :', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Erreur interne.' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(BOT_PORT, () => {
  console.log(`[Bot] Serveur HTTP en écoute sur http://localhost:${BOT_PORT}`);
});

// ---------------------------------------------------------------------------
// Connexion et arrêt propre
// ---------------------------------------------------------------------------
client.login(TOKEN).catch((err) => {
  console.error('[Bot] Connexion impossible :', err);
  process.exit(1);
});

const arreter = async () => {
  console.log('\n[Bot] Arrêt...');
  server.close();
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);
