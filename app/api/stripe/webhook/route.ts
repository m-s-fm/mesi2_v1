import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const clientStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-01-27.acacia' as any,
});

/**
 * Endpoint API Webhook pour recevoir et synchroniser les modifications d'abonnements depuis Stripe.
 */
export async function POST(requete: NextRequest) {
  const corpsTexte = await requete.text();
  const signatureStripe = requete.headers.get('stripe-signature');

  if (!signatureStripe) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  let evenementStripe: Stripe.Event;

  try {
    evenementStripe = clientStripe.webhooks.constructEvent(
      corpsTexte,
      signatureStripe,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (erreur: any) {
    console.error('La vérification de signature Stripe a échoué :', erreur.message);
    return NextResponse.json({ error: `Erreur Webhook : ${erreur.message}` }, { status: 400 });
  }

  try {
    switch (evenementStripe.type) {
      case 'checkout.session.completed': {
        const sessionCheckout = evenementStripe.data.object as Stripe.Checkout.Session;
        const idUtilisateur = sessionCheckout.client_reference_id;
        const idAbonnement = sessionCheckout.subscription as string;
        const idClient = sessionCheckout.customer as string;

        if (!idUtilisateur || !idAbonnement) {
          console.warn('idUtilisateur ou idAbonnement manquant dans checkout.session.completed');
          break;
        }

        const detailsAbonnement = await clientStripe.subscriptions.retrieve(idAbonnement) as any;
        
        const { error: erreurDb } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: idUtilisateur,
            stripe_customer_id: idClient,
            stripe_subscription_id: idAbonnement,
            status: detailsAbonnement.status,
            current_period_end: new Date(detailsAbonnement.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (erreurDb) {
          console.error("Erreur lors de l'enregistrement de l'abonnement :", erreurDb);
          return NextResponse.json({ error: erreurDb.message }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const detailsAbonnement = evenementStripe.data.object as any;
        const idAbonnement = detailsAbonnement.id;

        const { error: erreurDb } = await supabase
          .from('subscriptions')
          .update({
            status: detailsAbonnement.status,
            current_period_end: new Date(detailsAbonnement.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', idAbonnement);

        if (erreurDb) {
          console.error("Erreur lors de la mise à jour de l'abonnement :", erreurDb);
          return NextResponse.json({ error: erreurDb.message }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const detailsAbonnement = evenementStripe.data.object as any;
        const idAbonnement = detailsAbonnement.id;

        const { error: erreurDb } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            current_period_end: new Date(detailsAbonnement.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', idAbonnement);

        if (erreurDb) {
          console.error("Erreur lors de la résiliation de l'abonnement :", erreurDb);
          return NextResponse.json({ error: erreurDb.message }, { status: 500 });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (erreur: any) {
    console.error('Erreur traitement webhook Stripe :', erreur);
    return NextResponse.json({ error: erreur.message }, { status: 500 });
  }
}
