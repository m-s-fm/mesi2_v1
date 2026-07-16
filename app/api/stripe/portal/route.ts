import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creerClient } from '@/lib/supabase/server';
import { supabase as adminSupabase } from '@/lib/supabase';

const clientStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-01-27.acacia' as any,
});

/**
 * Génère une session d'accès au portail Stripe Billing pour gérer l'abonnement en cours.
 */
export async function POST(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    if (!utilisateur) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer le stripe_customer_id de l'utilisateur via le client admin
    const { data: donneesAbonnement, error: erreurDb } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', utilisateur.id)
      .maybeSingle();

    if (erreurDb || !donneesAbonnement?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe actif trouvé' }, { status: 400 });
    }

    const { origin } = new URL(requete.url);

    // Initialiser le portail client de facturation
    const sessionStripe = await clientStripe.billingPortal.sessions.create({
      customer: donneesAbonnement.stripe_customer_id,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: sessionStripe.url });
  } catch (erreur: any) {
    console.error('Erreur de création de session du portail Stripe :', erreur);
    return NextResponse.json({ error: erreur.message || 'Erreur interne du portail Stripe' }, { status: 500 });
  }
}
