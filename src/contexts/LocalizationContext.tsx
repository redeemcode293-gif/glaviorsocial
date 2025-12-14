import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LocalizationContextType {
  language: string;
  currency: string;
  currencySymbol: string;
  setLanguage: (lang: string) => void;
  setCurrency: (curr: string) => void;
  t: (text: string) => string;
  formatPrice: (priceUSD: number) => string;
  isTranslating: boolean;
}

const currencyData: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.79 },
  INR: { symbol: "₹", rate: 83.5 },
  AED: { symbol: "د.إ", rate: 3.67 },
  SAR: { symbol: "ر.س", rate: 3.75 },
  CAD: { symbol: "C$", rate: 1.36 },
  AUD: { symbol: "A$", rate: 1.53 },
  JPY: { symbol: "¥", rate: 149.5 },
  CNY: { symbol: "¥", rate: 7.24 },
  KRW: { symbol: "₩", rate: 1320 },
  BRL: { symbol: "R$", rate: 4.97 },
  MXN: { symbol: "$", rate: 17.15 },
  RUB: { symbol: "₽", rate: 92.5 },
  TRY: { symbol: "₺", rate: 29.5 },
  IDR: { symbol: "Rp", rate: 15650 },
  MYR: { symbol: "RM", rate: 4.72 },
  THB: { symbol: "฿", rate: 35.8 },
  VND: { symbol: "₫", rate: 24500 },
  PHP: { symbol: "₱", rate: 56.2 },
  PKR: { symbol: "₨", rate: 285 },
  BDT: { symbol: "৳", rate: 110 },
  NGN: { symbol: "₦", rate: 815 },
  EGP: { symbol: "E£", rate: 30.9 },
  ZAR: { symbol: "R", rate: 18.9 },
  PLN: { symbol: "zł", rate: 4.02 },
  UAH: { symbol: "₴", rate: 37.5 },
  CZK: { symbol: "Kč", rate: 22.8 },
  SEK: { symbol: "kr", rate: 10.5 },
  NOK: { symbol: "kr", rate: 10.8 },
  DKK: { symbol: "kr", rate: 6.92 },
  CHF: { symbol: "CHF", rate: 0.88 },
  SGD: { symbol: "S$", rate: 1.34 },
  HKD: { symbol: "HK$", rate: 7.82 },
  NZD: { symbol: "NZ$", rate: 1.64 },
  ILS: { symbol: "₪", rate: 3.68 },
  CLP: { symbol: "$", rate: 895 },
  COP: { symbol: "$", rate: 4050 },
  ARS: { symbol: "$", rate: 365 },
  PEN: { symbol: "S/", rate: 3.75 },
  TWD: { symbol: "NT$", rate: 31.5 },
  QAR: { symbol: "ر.ق", rate: 3.64 },
  KWD: { symbol: "د.ك", rate: 0.31 },
  BHD: { symbol: "د.ب", rate: 0.38 },
  OMR: { symbol: "ر.ع", rate: 0.39 },
  JOD: { symbol: "د.أ", rate: 0.71 },
  LKR: { symbol: "Rs", rate: 325 },
  NPR: { symbol: "रू", rate: 133 },
  KES: { symbol: "KSh", rate: 155 },
  GHS: { symbol: "₵", rate: 12.5 },
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState("en");
  const [currency, setCurrencyState] = useState("USD");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [pendingTexts, setPendingTexts] = useState<Set<string>>(new Set());

  // Load saved preferences
  useEffect(() => {
    const savedLang = localStorage.getItem("preferredLanguage");
    const savedCurrency = localStorage.getItem("preferredCurrency");
    if (savedLang) setLanguageState(savedLang);
    if (savedCurrency) setCurrencyState(savedCurrency);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("preferredLanguage", lang);
    // Clear translations when language changes
    if (lang !== language) {
      setTranslations({});
    }
  }, [language]);

  const setCurrency = useCallback((curr: string) => {
    setCurrencyState(curr);
    localStorage.setItem("preferredCurrency", curr);
  }, []);

  // Batch translate texts
  const translateTexts = useCallback(async (texts: string[]) => {
    if (language === "en" || texts.length === 0) return;
    
    // Filter out already translated texts
    const newTexts = texts.filter(t => !translations[t] && t.trim().length > 0);
    if (newTexts.length === 0) return;

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { texts: newTexts, targetLanguage: language }
      });

      if (error) {
        console.error("Translation error:", error);
        return;
      }

      if (data?.translations) {
        setTranslations(prev => ({ ...prev, ...data.translations }));
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  }, [language, translations]);

  // Collect texts and batch translate
  useEffect(() => {
    if (pendingTexts.size > 0 && language !== "en") {
      const timer = setTimeout(() => {
        translateTexts(Array.from(pendingTexts));
        setPendingTexts(new Set());
      }, 100); // Debounce to batch requests
      return () => clearTimeout(timer);
    }
  }, [pendingTexts, language, translateTexts]);

  const t = useCallback((text: string): string => {
    if (language === "en" || !text) return text;
    
    // Return translated text if available
    if (translations[text]) return translations[text];
    
    // Queue for translation
    setPendingTexts(prev => new Set(prev).add(text));
    
    return text; // Return original while translating
  }, [language, translations]);

  const formatPrice = useCallback((priceUSD: number): string => {
    const currencyInfo = currencyData[currency] || currencyData.USD;
    const convertedPrice = priceUSD * currencyInfo.rate;
    
    // Format based on currency
    if (currency === "JPY" || currency === "KRW" || currency === "VND" || currency === "IDR") {
      return `${currencyInfo.symbol}${Math.round(convertedPrice).toLocaleString()}`;
    }
    
    return `${currencyInfo.symbol}${convertedPrice.toFixed(2)}`;
  }, [currency]);

  const currencySymbol = currencyData[currency]?.symbol || "$";

  return (
    <LocalizationContext.Provider value={{
      language,
      currency,
      currencySymbol,
      setLanguage,
      setCurrency,
      t,
      formatPrice,
      isTranslating
    }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
};
