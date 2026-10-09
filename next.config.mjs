// Pink.ai web: el editor vive en `app/` y comparte `src/` con el motor de render.
const config = {
  typescript: { tsconfigPath: "tsconfig.next.json" },
  devIndicators: false,
  // Permite un segundo servidor (por ejemplo en modo nube) sin pisar la carpeta de compilación.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // La carpeta padre tiene otro package-lock.json; la raíz del proyecto es ésta.
  turbopack: { root: import.meta.dirname },
};

export default config;
