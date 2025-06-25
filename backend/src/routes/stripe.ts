import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { db } from '../db';
import { users, subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createCustomer, createCheckoutSession, createPortalSession, constructWebhookEvent } from '../services/stripe';

const router = Router();

router.post('/create-checkout-session', requireAuth(), async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !priceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    let customerId: string;
    const existingSubscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user[0].id))
      .limit(1);

    if (existingSubscription.length && existingSubscription[0].stripeCustomerId) {
      customerId = existingSubscription[0].stripeCustomerId;
    } else {
      const customer = await createCustomer(
        user[0].email,
        `${user[0].firstName} ${user[0].lastName}`.trim()
      );
      customerId = customer.id;
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
      `${process.env.FRONTEND_URL}/success`,
      `${process.env.FRONTEND_URL}/pricing`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/create-portal-session', requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user[0].id))
      .limit(1);

    if (!subscription.length || !subscription[0].stripeCustomerId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const session = await createPortalSession(
      subscription[0].stripeCustomerId,
      `${process.env.FRONTEND_URL}/dashboard`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    const event = constructWebhookEvent(req.body, signature);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as any;
        
        const customer = await db.select()
          .from(users)
          .where(eq(users.email, subscription.customer_email))
          .limit(1);

        if (customer.length) {
          await db.insert(subscriptions).values({
            userId: customer[0].id,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          }).onConflictDoUpdate({
            target: [subscriptions.stripeSubscriptionId],
            set: {
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              updatedAt: new Date(),
            },
          });
        }
        break;

      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object as any;
        await db.update(subscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, canceledSubscription.id));
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook error');
  }
});

export default router;