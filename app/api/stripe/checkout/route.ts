import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creerClient } from '@/lib/supabase/server';

const clientStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-01-27.acacia' as any,
});

/**
 * Crée une session de paiement Stripe Checkout sous forme d'abonnement pour l'utilisateur connecté.
 */
export async function POST(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    if (!utilisateur) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { origin } = new URL(requete.url);

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error("La variable d'environnement NEXT_PUBLIC_STRIPE_PRICE_ID est manquante.");
    }

    // Création de la session Checkout liée à l'id de l'utilisateur
    const sessionStripe = await clientStripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: utilisateur.id,
      success_url: `${origin}/`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId: utilisateur.id,
      },
    });

    return NextResponse.json({ url: sessionStripe.url });
  } catch (erreur: any) {
    console.error('Erreur Stripe Checkout :', erreur);
    return NextResponse.json({ error: erreur.message || 'Erreur interne lors de la création de la session Stripe' }, { status: 500 });
  }
}
