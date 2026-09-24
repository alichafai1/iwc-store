export type CheckoutShippingOption = {
  badge?: string;
  description: string;
  id: string;
  label: string;
  price: number;
};

export type CheckoutPaymentBadge = {
  label: string;
  tone: 'blue' | 'navy' | 'green' | 'mint' | 'black' | 'wise' | 'usdt' | 'btc';
};

export type CheckoutPaymentOption = {
  badges?: CheckoutPaymentBadge[];
  description?: string;
  details?: string[];
  discountPercent?: number;
  id: string;
  intro?: string;
  label: string;
  showCardMarks?: boolean;
};

export const checkoutShippingOptions: CheckoutShippingOption[] = [
  {
    id: 'free',
    label: 'Free Shipping',
    description: 'Tracked delivery. Delivery times vary by destination.',
    badge: 'Free',
    price: 0,
  },
];

export const checkoutPaymentOptions: CheckoutPaymentOption[] = [
  {
    id: 'bank-transfer',
    label: 'Bank Transfer (10% off)',
    discountPercent: 10,
    badges: [
      { label: 'SEPA', tone: 'blue' },
      { label: 'SWIFT', tone: 'navy' },
      { label: '10% OFF', tone: 'mint' },
    ],
    intro: 'We will send an email with all payment details — please check your inbox and spam folder.',
    details: [
      'Instant bank transfer in your local currency.',
      'Supports SEPA, ACH, SWIFT transfers.',
      'Fast and secure. 10% discount applied automatically.',
    ],
  },
  {
    id: 'revolut-wise',
    label: 'Revolut / Wise (10% off)',
    discountPercent: 10,
    badges: [
      { label: 'Revolut', tone: 'black' },
      { label: 'Wise', tone: 'wise' },
      { label: '10% OFF', tone: 'mint' },
    ],
    intro: 'Our team will contact you with payment instructions to complete your order securely. Please check your inbox and spam folder.',
    details: [
      'Fast, secure, app-based transfers.',
      'Recommended for quick international payments.',
      '10% discount applied automatically.',
    ],
  },
  {
    id: 'crypto',
    label: 'Crypto Payment (15% off)',
    discountPercent: 15,
    badges: [
      { label: 'USDT', tone: 'usdt' },
      { label: 'BTC', tone: 'btc' },
      { label: '15% OFF', tone: 'mint' },
    ],
    intro: 'We recommend paying with cryptocurrency — fast, private, no manual approval needed.',
    details: [
      'Supports USDT, BTC, ETH, LTC and 200+ coins.',
      'Fully automated — order processed instantly after payment.',
      '15% discount — our best offer.',
    ],
  },
  {
    id: 'flypay',
    label: 'Pay direct by card',
    showCardMarks: true,
  },
];
