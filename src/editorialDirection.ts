/** Versioned user intent. Missing editorial settings always mean legacy behavior. */
export const EDITORIAL_CHOICES = {
  presence: ['presenter', 'balanced', 'visual'],
  readingPace: ['calm', 'balanced', 'brisk'],
  emphasisStyle: ['overlay', 'composed', 'fullscreen'],
  resourceStyle: ['real', 'diagram', 'mixed'],
  framingStyle: ['stable', 'gentle'],
  referenceAspects: ['rhythm', 'typography', 'composition', 'resources'],
  captionIntent: ['literal', 'key-ideas', 'both'],
} as const;
export type ReferenceAspect = (typeof EDITORIAL_CHOICES.referenceAspects)[number];
export type EditorialDirection = {
  version: 1;
  presence: (typeof EDITORIAL_CHOICES.presence)[number];
  readingPace: (typeof EDITORIAL_CHOICES.readingPace)[number];
  emphasisStyle: (typeof EDITORIAL_CHOICES.emphasisStyle)[number];
  resourceStyle: (typeof EDITORIAL_CHOICES.resourceStyle)[number];
  framingStyle: (typeof EDITORIAL_CHOICES.framingStyle)[number];
  referenceAspects: ReferenceAspect[];
  captionIntent: (typeof EDITORIAL_CHOICES.captionIntent)[number];
};
export const newEditorialDirection = (patch: Partial<EditorialDirection> = {}): EditorialDirection => ({
  version: 1, presence: 'balanced', readingPace: 'balanced', emphasisStyle: 'overlay',
  resourceStyle: 'mixed', framingStyle: 'gentle', captionIntent: 'both',
  ...patch, referenceAspects: [...(patch.referenceAspects ?? [])],
});

export function checkEditorialDirection(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['La dirección editorial no es válida.'];
  const direction = value as Record<string, unknown>;
  const errors: string[] = [];
  if (direction.version !== 1) errors.push('Versión de dirección editorial desconocida.');
  const allowed = ['version', ...Object.keys(EDITORIAL_CHOICES)];
  if (Object.keys(direction).some(key => !allowed.includes(key))) errors.push('La dirección editorial contiene opciones desconocidas.');
  for (const [key, choices] of Object.entries(EDITORIAL_CHOICES)) {
    if (key === 'referenceAspects') continue;
    if (!(choices as readonly unknown[]).includes(direction[key])) errors.push(`Opción editorial de ${key} desconocida.`);
  }
  const aspects = direction.referenceAspects;
  if (!Array.isArray(aspects) || aspects.length > 4 || new Set(aspects).size !== aspects.length ||
      Array.from(aspects).some(item => !(EDITORIAL_CHOICES.referenceAspects as readonly unknown[]).includes(item))) {
    errors.push('Los aspectos de referencia no son válidos.');
  }
  return errors;
}
