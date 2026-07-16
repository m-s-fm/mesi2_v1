import crypto from 'crypto';

/**
 * Récupère la clé de chiffrement hexadécimale à partir des variables d'environnement.
 */
const obtenirCleSecrete = (cleHexaPersonnalisee?: string): string => {
  const hexa = cleHexaPersonnalisee || process.env.SESSION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!hexa) {
    throw new Error("La clé de chiffrement SESSION_ENCRYPTION_KEY est manquante dans le .env.");
  }
  return hexa;
};

/**
 * Chiffre une chaîne de caractères en texte brut en utilisant l'algorithme AES-256-GCM.
 * Retourne une chaîne structurée sous la forme : "iv:texteChiffre:baliseAuth"
 */
export function chiffrer(texteBrut: string, cleSecreteHexa?: string): string {
  const cleHexa = obtenirCleSecrete(cleSecreteHexa);
  const tamponCle = Buffer.from(cleHexa, 'hex');
  if (tamponCle.length !== 32) {
    throw new Error('La clé de chiffrement SESSION_ENCRYPTION_KEY doit faire exactement 32 octets (64 caractères hexadécimaux).');
  }

  const iv = crypto.randomBytes(12); // IV de 96 bits recommandé pour le mode GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', tamponCle, iv);
  
  let texteChiffre = cipher.update(texteBrut, 'utf8', 'hex');
  texteChiffre += cipher.final('hex');
  
  const baliseAuth = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${texteChiffre}:${baliseAuth}`;
}

/**
 * Déchiffre une chaîne formatée "iv:texteChiffre:baliseAuth" en utilisant AES-256-GCM.
 */
export function dechiffrer(texteChiffreComplet: string, cleSecreteHexa?: string): string {
  const cleHexa = obtenirCleSecrete(cleSecreteHexa);
  const tamponCle = Buffer.from(cleHexa, 'hex');
  if (tamponCle.length !== 32) {
    throw new Error('La clé de chiffrement SESSION_ENCRYPTION_KEY doit faire exactement 32 octets (64 caractères hexadécimaux).');
  }

  const parties = texteChiffreComplet.split(':');
  if (parties.length !== 3) {
    throw new Error('Format de chaîne chiffrée invalide. Attendu "iv:texteChiffre:baliseAuth".');
  }

  const iv = Buffer.from(parties[0], 'hex');
  const texteChiffre = Buffer.from(parties[1], 'hex');
  const baliseAuth = Buffer.from(parties[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', tamponCle, iv);
  decipher.setAuthTag(baliseAuth);

  let texteDechiffre = decipher.update(texteChiffre, undefined, 'utf8');
  texteDechiffre += decipher.final('utf8');

  return texteDechiffre;
}
