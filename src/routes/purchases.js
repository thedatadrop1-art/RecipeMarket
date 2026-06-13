const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const PRICE_CENTS = 299; // $2.99

// ── POST /api/purchases/checkout  — create Stripe payment intent ──
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    // Already premium?
    if (req.user.is_premium) {
      return res.json({ already_premium: true });
    }

    // Create or retrieve Stripe customer
    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { user_id: req.user.id },
      });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id]);
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: 'usd',
      customer: customerId,
      metadata: {
        user_id: req.user.id,
        product: 'RecipeMarket Premium',
      },
      description: 'RecipeMarket Premium — one-time unlock',
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      amount: PRICE_CENTS,
      currency: 'usd',
    });
  } catch (err) { next(err); }
});

// ── POST /api/purchases/webhook  — Stripe webhook (raw body) ──────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const userId = intent.metadata.user_id;

        // Record purchase
        await query(`
          INSERT INTO purchases (user_id, stripe_payment_id, stripe_customer_id, amount_cents, status)
          VALUES ($1, $2, $3, $4, 'completed')
          ON CONFLICT (stripe_payment_id) DO NOTHING
        `, [userId, intent.id, intent.customer, intent.amount]);

        // Unlock premium
        await query(`
          UPDATE users SET is_premium=TRUE, purchase_date=NOW() WHERE id=$1
        `, [userId]);

        // Send welcome notification
        await query(`
          INSERT INTO notifications (user_id, type, message)
          VALUES ($1, 'system', '🎉 Welcome to RecipeMarket Premium! All features unlocked.')
        `, [userId]);

        console.log(`✅ Premium unlocked for user ${userId}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.warn(`❌ Payment failed for user ${intent.metadata.user_id}:`, intent.last_payment_error?.message);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        // Find purchase by payment intent and revoke premium
        const { rows: [purchase] } = await query(
          'SELECT user_id FROM purchases WHERE stripe_payment_id=$1',
          [charge.payment_intent]
        );
        if (purchase) {
          await query('UPDATE users SET is_premium=FALSE WHERE id=$1', [purchase.user_id]);
          console.log(`🔄 Premium revoked for user ${purchase.user_id} (refunded)`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ── GET /api/purchases/status  — check user's purchase status ─────
router.get('/status', authenticate, async (req, res) => {
  const { rows: [purchase] } = await query(
    'SELECT created_at, amount_cents FROM purchases WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [req.user.id]
  );

  res.json({
    is_premium:    req.user.is_premium,
    purchase_date: req.user.purchase_date,
    purchase:      purchase || null,
  });
});

module.exports = router;
