import style from "../../style/pink-demo-v1.json";

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
  demo: {
    original: string | null;
    edited: string | null;
    captions: string | null;
  };
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
  flowConnected: false,
  accessHref: "#acceso",
  accessEmail: "",
  // Añadir únicamente rutas locales de una demo autorizada para publicación.
  demo: { original: null, edited: null, captions: null },
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
    // Límites técnicos reales del motor (style/pink-demo-v1.json).
    maxFileSize: `${style.limits.max_upload_mb} MB`,
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
  return config.flowConnected
    ? { label: "Editar mi primer video", href: "/app" }
    : { label: "Solicitar acceso", href: config.accessHref };
}
