import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';

export type PhoneCountryOption = {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
};

const PHONE_COUNTRIES = new Set<string>(getCountries());

export function isPhoneCountry(value: string): value is CountryCode {
  return PHONE_COUNTRIES.has(value);
}

export function countryFlag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function phoneCallingCode(code: string): string {
  return isPhoneCountry(code) ? getCountryCallingCode(code) : '';
}

/** Valid numbers only; a leading "+" or "00" overrides the selected country. */
export function parseCheckoutPhone(phone: string, country: string): PhoneNumber | undefined {
  const text = phone.trim();
  const parsed = parsePhoneNumberFromString(text, isPhoneCountry(country) ? country : undefined);
  if (parsed?.isValid()) {
    return parsed;
  }
  // "00" is the international dialling prefix in most countries, even when the selected one uses another (e.g. US "011").
  if (text.startsWith('00')) {
    const international = parsePhoneNumberFromString(`+${text.slice(2)}`);
    return international?.isValid() ? international : undefined;
  }
  return undefined;
}

/** E.164 (e.g. +14155552671), or '' when the number is not valid. */
export function normalizeCheckoutPhone(phone: string, country: string): string {
  return parseCheckoutPhone(phone, country)?.number ?? '';
}

/** Live formatting while typing; `country` is set when the text starts with "+" and the prefix identifies one. */
export function formatPhoneAsYouType(phone: string, country: string): { text: string; country?: CountryCode } {
  const formatter = new AsYouType(isPhoneCountry(country) ? country : undefined);
  const text = formatter.input(phone);
  return { text, country: phone.trim().startsWith('+') ? formatter.getCountry() : undefined };
}

/** Drops a typed "+<calling code>" that doesn't belong to `country`, keeping the remaining digits. */
export function phoneForCountry(phone: string, country: string): string {
  if (!phone.trim().startsWith('+')) {
    return phone;
  }
  const formatter = new AsYouType();
  formatter.input(phone);
  const callingCode = formatter.getCallingCode();
  return callingCode && callingCode !== phoneCallingCode(country) ? formatter.getNationalNumber() : phone;
}

export function formatPhoneForDisplay(phone: string): string {
  return parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;
}

export function phoneCountryOptions(locale = 'en'): PhoneCountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return getCountries()
    .map((code) => ({
      code,
      name: names.of(code) ?? code,
      callingCode: getCountryCallingCode(code),
      flag: countryFlag(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
