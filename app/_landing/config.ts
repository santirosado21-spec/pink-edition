import style from "../../style/pink-demo-v1.json";
import { AUTH_EMAIL_READY, DEMO_ENABLED, CLOUD, CLOUD_MAX_MB } from "../_lib/supabase/config";

export type Plan = {
  name: string;
  description: string;
  price: string | null;
  credits: string | null;
  admittedDuration: string | null;
  includedCorrections: string | null;
};

type LandingConfig = {
  flowConnected: boolean;
  accessHref: string;
  accessEmail: string;
  features: { title: string; text: string }[];
  plans: Plan[];
  faqConditions: {
    uploadFormats: string | null;
    maxFileSize: string | null;
    admittedDuration: string | null;
    corrections: string | null;
    creditConsumption: string | null;
    downloadAvailability: string | null;
  };
};

// Configuración pública: no incluir secretos ni rutas de material privado.
export const landingConfig: LandingConfig = {
  flowConnected: AUTH_EMAIL_READY,
  accessHref: "#acceso",
  accessEmail: "",
  features: [
    { title: "Subtítulos y cortes de color", text: "Tus palabras en pantalla, y tu frase clave a pantalla completa." },
    { title: "Gráficos detrás de ti", text: "Las tarjetas se colocan detrás de tu silueta, nunca encima." },
    { title: "Fondos con sentido", text: "El fondo cambia con lo que estás diciendo." },
  ],
  plans: [
    {
      name: "Por video",
      description: "Para esa idea que merece salir. Publica a tu ritmo.",
      price: null,
      credits: null,
      admittedDuration: null,
      includedCorrections: null,
    },
    {
      name: "Creador",
      description: "Un paquete de créditos para publicar con frecuencia.",
      price: null,
      credits: null,
      admittedDuration: null,
      includedCorrections: null,
    },
    {
      name: "Pro",
      description: "Mayor volumen para creadores y marcas personales.",
      price: null,
      credits: null,
      admittedDuration: null,
      includedCorrections: null,
    },
  ],
  faqConditions: {
    uploadFormats: null,
    // Límites técnicos reales: los del motor (style/pink-demo-v1.json) y, en línea, el del almacenamiento.
    maxFileSize: `${CLOUD ? CLOUD_MAX_MB : style.limits.max_upload_mb} MB`,
    admittedDuration: `${style.limits.max_seconds} segundos`,
    corrections: null,
    creditConsumption: null,
    downloadAvailability: null,
  },
};

export const definedOrPending = (value: string | null) =>
  value ?? "Por definir";
export function getPrimaryAction(
  config: Pick<LandingConfig, "flowConnected" | "accessHref">,
) {
  if (DEMO_ENABLED) return { label: "Entrar a la demo", href: "/demo" };
  return config.flowConnected
    ? { label: "Crear mi cuenta", href: "/login" }
    : { label: "Solicitar acceso", href: config.accessHref };
}
