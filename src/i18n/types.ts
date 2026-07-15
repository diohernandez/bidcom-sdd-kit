export type Locale = "es" | "en";

export interface MessageCatalog {
  [key: string]: string;
}

export interface Messages {
  es: MessageCatalog;
  en: MessageCatalog;
}
