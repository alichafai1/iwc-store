export const CONTACT_PATH = '/contact/';

export const contactDetails = {
  email: 'contact@iwc-replica.to',
  phoneDisplay: '+1 573 274 1076',
  phoneTel: '+15732741076',
  whatsappUrl: 'https://wa.me/15732741076',
  domain: 'iwc-replica.to',
} as const;

export const contactTopics = [
  { value: 'model', label: 'Choosing a model or size' },
  { value: 'order', label: 'An order I already placed' },
  { value: 'qc', label: 'QC photos or video' },
  { value: 'shipping', label: 'Shipping and tracking' },
  { value: 'returns', label: 'Return or refund' },
  { value: 'warranty', label: 'Movement warranty' },
  { value: 'other', label: 'Something else' },
] as const;

export function whatsappHref(text?: string): string {
  if (!text) {
    return contactDetails.whatsappUrl;
  }

  return `${contactDetails.whatsappUrl}?text=${encodeURIComponent(text)}`;
}
