export type CheckoutAddress = {
  address: string;
  apartment: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  state: string;
};

export type CheckoutFormValues = CheckoutAddress & {
  billing: CheckoutAddress;
  billingSameAsShipping: boolean;
  email: string;
  emailOffers: boolean;
  paymentOptionId: string;
  phone: string;
  shippingOptionId: string;
};

export type CheckoutErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_PATTERN = /^[+()\d][\d\s\-().]{6,}$/;

function requireAddress(address: CheckoutAddress, prefix: string, errors: CheckoutErrors) {
  if (!address.firstName.trim()) {
    errors[`${prefix}firstName`] = 'Enter a first name.';
  }
  if (!address.lastName.trim()) {
    errors[`${prefix}lastName`] = 'Enter a last name.';
  }
  if (!address.address.trim()) {
    errors[`${prefix}address`] = 'Enter an address.';
  }
  if (!address.city.trim()) {
    errors[`${prefix}city`] = 'Enter a city.';
  }
  if (!address.postalCode.trim()) {
    errors[`${prefix}postalCode`] = 'Enter a postal code.';
  }
  if (!address.country.trim()) {
    errors[`${prefix}country`] = 'Select a country.';
  }
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Enter an email address.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  requireAddress(values, '', errors);

  if (!values.phone.trim()) {
    errors.phone = 'Enter a phone number for delivery updates.';
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (!values.billingSameAsShipping) {
    requireAddress(values.billing, 'billing.', errors);
  }

  return errors;
}

export function createEmptyAddress(country: string): CheckoutAddress {
  return {
    address: '',
    apartment: '',
    city: '',
    country,
    firstName: '',
    lastName: '',
    postalCode: '',
    state: '',
  };
}
