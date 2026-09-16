// src/infrastructure/storage/translateSupabaseError.ts
// Conservé pour compatibilité — traduit les erreurs API en messages lisibles
export function translateSupabaseError(message: string): string {
  if (message.includes('Invalid login')) return 'Email ou mot de passe incorrect';
  if (message.includes('Email not confirmed')) return 'Email non confirmé';
  if (message.includes('Non connecté')) return 'Vous devez être connecté';
  if (message.includes('Non autorisé')) return 'Action non autorisée';
  if (message.includes('Email ou mot de passe incorrect')) return 'Email ou mot de passe incorrect';
  return message || 'Une erreur est survenue';
}
