// infrastructure/translateSupabaseError.ts
export function translateSupabaseError(message: string): string {
    switch (message) {
      case 'Password should be at least 6 characters.':
        return 'Le mot de passe doit contenir au moins 6 caractères.';
      case 'Invalid login credentials':
        return 'Identifiants incorrects';
      case 'User not found':
        return "Utilisateur introuvable";
      case 'User already registered':
        return "Cet email est déjà utilisé.";
      case 'Network error':
        return "Erreur réseau, veuillez réessayer";
      default:
        return message;  
    }
  }