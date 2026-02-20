import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware.js';
import { createPurchase, getPurchase, fulfillPurchase, getUserState, saveUserState } from '../db.js';

const router = Router();

// IAP product definitions — price amounts in cents
const PRODUCTS = {
  quill_100:         { name: 'Feather Pouch',          amount: 99,   currency: 'usd' },
  quill_500:         { name: 'Quill Bundle',            amount: 399,  currency: 'usd' },
  quill_2000:        { name: 'Grand Compendium',        amount: 1299, currency: 'usd' },
  ink_boost:         { name: 'Ink Surge',               amount: 99,   currency: 'usd' },
  letter_pack:       { name: 'Letter Loot',             amount: 199,  currency: 'usd' },
  premium_cosmetics: { name: 'Illuminated Manuscript',  amount: 299,  currency: 'usd' },
};

const SPECIAL_TILE_TYPES = ['DL', 'TL', 'DW', 'TW', '★', '◈'];

function applyProductToState(state, productId) {
  const s = { ...state };
  switch (productId) {
    case 'quill_100':
      s.quills = (s.quills || 0) + 100;
      break;
    case 'quill_500':
      s.quills = (s.quills || 0) + 500;
      break;
    case 'quill_2000':
      s.quills = (s.quills || 0) + 2000;
      break;
    case 'ink_boost':
      s.inkBoostPending = 1;
      break;
    case 'letter_pack': {
      const tiles = Array.from({ length: 10 }, (_, i) => ({
        id: `loot_${Date.now()}_${i}`,
        type: SPECIAL_TILE_TYPES[Math.floor(Math.random() * SPECIAL_TILE_TYPES.length)],
      }));
      s.letterPackPending = [...(s.letterPackPending || []), ...tiles];
      break;
    }
    case 'premium_cosmetics':
      if (!s.ownedCovers.includes('obsidian')) s.ownedCovers = [...s.ownedCovers, 'obsidian'];
      if (!s.ownedPages.includes('gilded_folio')) s.ownedPages = [...s.ownedPages, 'gilded_folio'];
      break;
  }
  return s;
}

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  const { productId } = req.body;
  const product = PRODUCTS[productId];
  if (!product) return res.status(400).json({ error: 'Unknown product' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: product.amount,
        },
        quantity: 1,
      }],
      success_url: `${clientUrl}/?iap_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/`,
      metadata: { userId: String(req.userId), productId },
    });

    createPurchase(req.userId, session.id, productId);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Create session error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/payments/fulfill-session
router.post('/fulfill-session', requireAuth, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Check idempotency — already fulfilled?
    const existing = getPurchase(sessionId);
    if (existing?.fulfilled) {
      return res.json({ ok: true, alreadyFulfilled: true, state: getUserState(req.userId) });
    }

    // Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    // Verify this session belongs to this user
    if (String(session.metadata.userId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Session does not belong to this account' });
    }

    const productId = session.metadata.productId;
    const currentState = getUserState(req.userId);
    const updatedState = applyProductToState(currentState, productId);
    saveUserState(req.userId, updatedState);
    fulfillPurchase(sessionId);

    res.json({ ok: true, state: updatedState });
  } catch (err) {
    console.error('Fulfill session error:', err.message);
    res.status(500).json({ error: 'Failed to fulfill session' });
  }
});

// POST /api/payments/webhook  (Stripe CLI or dashboard webhook)
router.post('/webhook', async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const existing = getPurchase(session.id);
      if (existing && !existing.fulfilled) {
        const userId = Number(session.metadata.userId);
        const currentState = getUserState(userId);
        if (currentState) {
          const updatedState = applyProductToState(currentState, session.metadata.productId);
          saveUserState(userId, updatedState);
          fulfillPurchase(session.id);
        }
      }
    }
  }

  res.json({ received: true });
});

export default router;
