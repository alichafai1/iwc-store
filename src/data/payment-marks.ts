import amex from '../assets/payments/amex.png';
import applePay from '../assets/payments/apple-pay.svg';
import googlePay from '../assets/payments/google-pay.png';
import mastercard from '../assets/payments/mastercard.png';
import paypal from '../assets/payments/paypal.png';
import visa from '../assets/payments/visa.png';
import type { ImageMetadata } from 'astro';

export interface PaymentMark {
  id: 'visa' | 'mastercard' | 'amex' | 'paypal' | 'apple-pay' | 'google-pay';
  label: string;
  image: ImageMetadata;
  width: number;
  height: number;
}

export const paymentMarks: PaymentMark[] = [
  { id: 'visa', label: 'Visa', image: visa, width: 96, height: 69 },
  { id: 'mastercard', label: 'Mastercard', image: mastercard, width: 100, height: 64 },
  { id: 'amex', label: 'American Express', image: amex, width: 92, height: 64 },
  { id: 'paypal', label: 'PayPal', image: paypal, width: 200, height: 48 },
  { id: 'apple-pay', label: 'Apple Pay', image: applePay, width: 140, height: 58 },
  { id: 'google-pay', label: 'Google Pay', image: googlePay, width: 140, height: 56 },
];
