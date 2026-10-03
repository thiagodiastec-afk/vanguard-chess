const PROFANITY_TERMS = [
  'puta', 'putas', 'puto', 'putos', 'putaria', 'merda', 'merdas', 'cu', 'cuzao',
  'buceta', 'bucetao', 'caralho', 'caralhos', 'foder', 'foda', 'foda-se', 'fodase',
  'fdp', 'pqp', 'filho da puta', 'porra', 'arrombado', 'arrombada', 'vadia', 'viado',
  'bicha', 'babaca', 'otario', 'otaria', 'imbecil', 'escroto', 'escrota',
  'bitch', 'fuck', 'fucking', 'shit', 'asshole', 'bastard', 'nigger', 'nigga',
  'faggot', 'retard', 'whore', 'slut', 'cunt'
];

function normalizeForModeration(value: string) {
  return ` ${value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/0/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/4|@/g, 'a')
    .replace(/5|\$/g, 's').replace(/7/g, 't').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function validateUsername(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 15) return 'O nome deve ter de 3 a 15 caracteres.';
  if (!/^[\p{L}\p{N}_\- ]+$/u.test(name)) return 'Use letras, números, espaços, traços ou underscore.';
  if (name.includes('@') || /^[0-9+() -]{7,}$/.test(name)) return 'Não use e-mail ou telefone como nome.';
  const normalized = normalizeForModeration(name);
  const compactName = normalized.replace(/\s+/g, ' ').trim().replace(/ /g, '');
  if (PROFANITY_TERMS.some(term => {
    const normalizedTerm = normalizeForModeration(term).trim();
    return normalized.includes(` ${normalizedTerm} `)
      || (normalizedTerm.replace(/ /g, '').length >= 4 && compactName.includes(normalizedTerm.replace(/ /g, '')));
  })) {
    return 'Esse nome não é permitido. Escolha um apelido respeitoso.';
  }
  return null;
}
