'use client';
import { useId } from 'react';
const COLORS = [ ['Coral', '#f36b52'], ['Rojo', '#d93645'], ['Naranja', '#ec862d'], ['Amarillo', '#edc64a'], ['Verde', '#318566'], ['Azul', '#386ed4'], ['Violeta', '#8657bf'], ['Rosa', '#d95b97'], ['Negro', '#20211f'], ['Blanco', '#ffffff'] ];
export function ColorPicker({ value, onChange, colors = [] }: { value: string; onChange: (value: string) => void; colors?: string[] }) {
  const id = useId();
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return <fieldset className="brand-color-picker">
    <legend>Color para tu video</legend>
    <div className="brand-color-fields">
      <label htmlFor={`${id}-palette`}>Elegir color<select id={`${id}-palette`} className="field" value={COLORS.some(([, hex]) => hex === value.toLowerCase()) ? value.toLowerCase() : ''} onChange={event => { if (event.target.value) onChange(event.target.value); }}>
        <option value="">Personalizado</option>{COLORS.map(([name, hex]) => <option key={hex} value={hex}>{name}</option>)}
      </select></label>
      <label htmlFor={`${id}-custom`}>Abrir paleta<input id={`${id}-custom`} type="color" value={valid ? value : '#f36b52'} onChange={event => onChange(event.target.value)} /></label>
      <label htmlFor={`${id}-hex`}>Código hexadecimal<input id={`${id}-hex`} className="field" type="text" value={value} pattern="#[0-9a-fA-F]{6}" maxLength={7} onChange={event => onChange(event.target.value)} /></label>
    </div>
    {colors.length > 0 && <div className="brand-swatches" aria-label="Colores detectados en tu logo"><span>Colores de tu logo</span>{colors.map(color => <button key={color} type="button" className="button" aria-pressed={value.toLowerCase() === color} onClick={() => onChange(color)}><i style={{ backgroundColor: color }} aria-hidden="true" />{color}</button>)}</div>}
    <p className="muted">Se aplica a tu video. Puedes elegirlo en el menú, abrir la paleta o escribir su código.</p>
  </fieldset>;
}
