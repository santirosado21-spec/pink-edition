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
  // Video real de la demo: rutas dentro de public/. Sólo material autorizado para publicar.
  hero: { video: string; poster: string };
  demo: { original: string; edited: string; posterOriginal: string; posterEdited: string };
  clips: { title: string; text: string; src: string }[];
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
  hero: { video: "/landing/edited-full.mp4", poster: "/landing/poster-edited.jpg" },
  demo: {
    original: "/landing/original-20s.mp4",
    edited: "/landing/edited-10s.mp4",
    posterOriginal: "/landing/poster-original.jpg",
    posterEdited: "/landing/poster-edited.jpg",
  },
  clips: [
    { title: "Subtítulos y cortes de color", text: "Tus palabras en pantalla, y tu frase clave a pantalla completa.", src: "/landing/clip-color.mp4" },
    { title: "Gráficos detrás de ti", text: "Las tarjetas se colocan detrás de tu silueta, nunca encima.", src: "/landing/clip-card.mp4" },
    { title: "Fondos con sentido", text: "El fondo cambia con lo que estás diciendo.", src: "/landing/clip-background.mp4" },
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
