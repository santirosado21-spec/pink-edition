import { createContext, useContext } from "react";
import config from "../full-demo-config.json";

// Azul de base; el color cambia con el tema de la frase (salud, estrés).
export type Theme = { accent: string; light: string; dark: string };
const themes = config.themes as Record<string, Theme>;

export const themeOf = (name: string): Theme => themes[name] ?? themes.base;
export const ThemeContext = createContext<Theme>(themes.base);
export const useTheme = () => useContext(ThemeContext);
