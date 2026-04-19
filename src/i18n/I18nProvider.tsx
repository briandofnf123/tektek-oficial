import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { DICTS, LANGUAGES, type Lang } from "./translations";

const STORAGE_KEY = "tektek.lang";

const detectLang = (): Lang => {
  const saved = (typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY)
    : null) as Lang | null;
  if (saved && saved in DICTS) return saved;
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "pt";
  return (nav in DICTS ? nav : "pt") as Lang;
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  languages: typeof LANGUAGES;
};

const I18nCtx = createContext<Ctx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* noop */
    }
  }, []);

  const t = useCallback(
    (key: string) => DICTS[lang]?.[key] ?? DICTS.pt[key] ?? key,
    [lang],
  );

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nCtx.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be inside <I18nProvider>");
  return ctx;
};
