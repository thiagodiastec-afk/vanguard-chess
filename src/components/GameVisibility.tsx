import { useId } from 'react';
export default function GameVisibility({ value, onChange, disabled = false }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <fieldset disabled={disabled} className="my-4 rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 text-left">
    <legend className="px-1 text-sm font-bold text-white">Quem pode assistir?</legend>
    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-200"><input type="radio" name={id} checked={!value} onChange={() => onChange(false)} className="mt-1 accent-emerald-500" /><span><strong>Privada</strong><span className="block text-xs text-zinc-400">Somente os participantes podem ver a partida.</span></span></label>
    <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-zinc-200"><input type="radio" name={id} checked={value} onChange={() => onChange(true)} className="mt-1 accent-emerald-500" /><span><strong>Pública</strong><span className="block text-xs text-zinc-400">Todos podem assistir pela TV Xadrez. Contra outra pessoa, ambos precisam permitir.</span></span></label>
  </fieldset>;
}
