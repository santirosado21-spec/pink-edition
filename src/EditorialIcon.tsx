import type {EditorialIconKind} from './oneShotEdit';

// Original deterministic pictograms. They illustrate concepts, never measurements.
export function EditorialIcon({kind, color, size = 100}: {kind: EditorialIconKind; color: string; size?: number}) {
  return <svg data-editorial-icon={kind} aria-hidden width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'people' && <><circle cx="36" cy="30" r="12"/><path d="M13 79V68c0-14 10-22 23-22s23 8 23 22v11M65 20a12 12 0 0 1 0 24M69 50c12 1 18 9 18 21v8"/></>}
    {kind === 'heart' && <path d="M50 83 17 51C-6 25 29 1 50 29 71 1 106 25 83 51Z"/>}
    {kind === 'brain' && <><path d="M48 19c-9-11-25-3-25 9-15 2-18 23-7 32-7 16 9 30 23 23 3 9 15 7 15-3V25c0-7-3-10-6-6ZM55 23c8-13 25-5 25 8 14 6 14 24 4 31 6 17-12 29-24 20"/><path d="M28 37c14 0 16 8 12 16M20 61c13-6 21 0 22 12M66 39c-9 6-8 17 3 21"/></>}
    {kind === 'home' && <><path d="M12 45 50 13 88 45M23 39v46h54V39M42 85V60h16v25"/></>}
    {kind === 'book' && <><path d="M50 26C37 16 23 16 11 20v60c16-4 28-1 39 6 11-7 23-10 39-6V20c-12-4-26-4-39 6ZM50 26v60M24 36l13 3M24 49l13 3M63 39l13-3M63 52l13-3"/></>}
    {kind === 'growth' && <><path d="M50 87V46M50 62C25 62 14 47 16 27c22-2 35 10 34 35ZM51 46C50 24 63 11 86 13c2 21-10 34-35 33Z"/></>}
    {kind === 'question' && <><circle cx="50" cy="50" r="37"/><path d="M37 37c0-18 31-18 28 1-2 10-15 10-15 22"/><circle cx="50" cy="72" r="2" fill={color}/></>}
  </svg>;
}
