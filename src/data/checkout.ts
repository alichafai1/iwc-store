export type CheckoutShippingOption = {
  badge?: string;
  description: string;
  id: string;
  label: string;
  price: number;
};

export type CheckoutPaymentOption = {
  description?: string;
  id: string;
  label: string;
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
    id: 'flypay',
    label: 'flypay',
  },
];
