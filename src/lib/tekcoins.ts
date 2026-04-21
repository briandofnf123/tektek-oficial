/**
 * TekCoins economy
 * - 1 like recebida = +10 TekCoins
 * - Conversão fiat depende do país (idioma do usuário define o default)
 * - 1000 TekCoins = 1 unidade da moeda local (taxa fixa simples)
 */
import type { Lang } from "@/i18n/translations";

export type CountryRate = {
  code: string;
  country: string;
  currency: string;
  symbol: string;
  /** quantos TekCoins valem 1 unidade da moeda */
  coinsPerUnit: number;
};

export const COUNTRY_RATES: Record<string, CountryRate> = {
  pt: { code: "BR", country: "Brasil", currency: "BRL", symbol: "R$", coinsPerUnit: 1000 },
  en: { code: "US", country: "United States", currency: "USD", symbol: "$", coinsPerUnit: 5000 },
  es: { code: "ES", country: "España", currency: "EUR", symbol: "€", coinsPerUnit: 5500 },
  fr: { code: "FR", country: "France", currency: "EUR", symbol: "€", coinsPerUnit: 5500 },
  de: { code: "DE", country: "Deutschland", currency: "EUR", symbol: "€", coinsPerUnit: 5500 },
  it: { code: "IT", country: "Italia", currency: "EUR", symbol: "€", coinsPerUnit: 5500 },
  ja: { code: "JP", country: "日本", currency: "JPY", symbol: "¥", coinsPerUnit: 35 },
  ko: { code: "KR", country: "한국", currency: "KRW", symbol: "₩", coinsPerUnit: 4 },
  zh: { code: "CN", country: "中国", currency: "CNY", symbol: "¥", coinsPerUnit: 700 },
  ar: { code: "SA", country: "السعودية", currency: "SAR", symbol: "﷼", coinsPerUnit: 1300 },
};

export const rateForLang = (lang: Lang): CountryRate =>
  COUNTRY_RATES[lang] ?? COUNTRY_RATES.pt;

export const coinsToFiat = (coins: number, rate: CountryRate): number => {
  if (rate.coinsPerUnit <= 0) return 0;
  return Math.floor((coins / rate.coinsPerUnit) * 100) / 100;
};

export const formatFiat = (amount: number, rate: CountryRate): string =>
  `${rate.symbol} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const MIN_WITHDRAW_COINS = 5000;
