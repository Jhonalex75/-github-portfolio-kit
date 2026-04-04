# Guía de Contribución - CyberEngineer Nexus

¡Gracias por considerar contribuir a CyberEngineer Nexus! Esta guía te ayudará a entender nuestros estándares de código y procesos.

## 🎯 Antes de Empezar

1. Revisa [ARCHITECTURE.md](./ARCHITECTURE.md) para entender la estructura
2. Lee la [DEPLOYMENT.md](./DEPLOYMENT.md) para el flujo de release
3. Asegúrate de tener Node.js 18+ y npm 9+

## 🔧 Setup Local

```bash
# Clonar repo
git clone <repo-url>
cd nexus_backup

# Instalar dependencias
npm install

# Crear .env.local con variables
cp .env.example .env.local
# Editar con tus credenciales de Firebase

# Iniciar dev server
npm run dev
```

## 📝 Estándares de Código

### TypeScript
- ✅ Strict mode siempre habilitado
- ✅ No usar `any` sin justificación
- ✅ Tipos explícitos en funciones
- ✅ Interfaces preferidas sobre types

```typescript
// ✅ Bien
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

function getUserProfile(uid: string): Promise<UserProfile> {
  // ...
}

// ❌ Evitar
const getUserProfile = async (uid) => {
  // ...
}
```

### Componentes React
- ✅ Use `'use client'` solo cuando sea necesario
- ✅ Componentes funcionales con hooks
- ✅ Prop drilling mínimo (usar Context si necesario)
- ✅ Componentes separados por responsabilidad

```typescript
// ✅ Bien
interface UserCardProps {
  user: User;
  onSelect: (user: User) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect(user)}>
      {user.displayName}
    </div>
  );
}

// ❌ Evitar
export function UserCard(props) {
  return <div onClick={() => props.onSelect(props.user)}>{props.user.name}</div>;
}
```

### Server Actions
- ✅ Agregar `'use server'` al inicio
- ✅ Validar entrada siempre
- ✅ Manejar errores con try-catch
- ✅ Usar logger para debugging

```typescript
'use server';

import { logger } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function updateUserEmail(email: string) {
  try {
    const validated = schema.parse({ email });
    // ... operación
    logger.log('Email updated', 'updateUserEmail');
    return { success: true };
  } catch (error) {
    logger.error('Failed to update email', error, 'updateUserEmail');
    throw error;
  }
}
```

### Manejo de Errores
- ✅ Usar ErrorBoundary para componentes
- ✅ Capturar errores en Server Actions
- ✅ Loguear contexto útil
- ✅ Mostrar mensajes claros al usuario

```typescript
// ✅ Bien
try {
  const result = await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, 'componentName', {
    userId: currentUser?.id,
    actionType: 'update'
  });
  throw new Error('Unable to complete operation. Please try again.');
}
```

## 🧪 Pruebas

### Antes de commit:
```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run build        # Build test
```

### Tests a escribir:
- [ ] Server Actions críticas
- [ ] Hooks personalizados
- [ ] Funciones de utilidad
- [ ] Flujos de AI important

## 🌳 git Workflow

### 1. Crear feature branch
```bash
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/bug-description
```

### 2. Commit messages
```bash
# Formato: <tipo>: <descripción corta>

git commit -m "feat: agregar validación de email en signup"
git commit -m "fix: corregir error de rate limiting en AI flows"
git commit -m "docs: actualizar guía de arquitectura"
git commit -m "refactor: simplificar lógica de autenticación"
```

**Tipos válidos**: feat, fix, docs, style, refactor, perf, test, chore

### 3. Push y Pull Request
```bash
git push origin feature/nombre-descriptivo
# Luego abre un PR en GitHub con descripción clara
```

### PR Checklist:
- [ ] Descripción clara del cambio
- [ ] Tests incluidos/actualizados
- [ ] Lint y type check pasan
- [ ] Documentación actualizada (si es necesario)
- [ ] Screenshots (si afecta UI)

## 🎨 Naming Conventions

### Archivos
```
# Componentes React
UserCard.tsx
UserProfile.tsx

# Hooks
use-mobile.tsx
use-auth.ts

# Utilities
logger.ts
ai-utils.ts

# Server actions
user-actions.ts
project-actions.ts
```

### Variables y Functions
```typescript
// camelCase para variables y funciones
const userEmail = "...";
function getUserById(id: string) {}

// PascalCase para componentes y clases
function UserProfile() {}
class Logger {}
```

### Constants
```typescript
// UPPER_SNAKE_CASE para constantes
const MAX_REQUESTS_PER_MINUTE = 30;
const DEFAULT_TIMEOUT = 5000;
```

## 📚 Documentación

### Comentarios en code
```typescript
// Comenta el "por qué", no el "qué"

// ✅ Bien
// Exponential backoff para evitar rate limiting de API
await withRetry(() => callAI(), { maxAttempts: 3 });

// ❌ Evitar
// Llamar con retry
await withRetry(() => callAI(), { maxAttempts: 3 });
```

### JSDoc para funciones públicas
```typescript
/**
 * Generates a title for a technical report
 * @param tema - The topic of the report
 * @param userId - User ID for rate limiting
 * @returns The generated title and subtitle
 * @throws Error if API call fails after retries
 */
export async function generarTituloAction(
  tema: string,
  userId: string
): Promise<{ titulo: string; subtitulo: string }> {
  // ...
}
```

## 🐛 Reporte de Bugs

Usa GitHub Issues con este template:

```markdown
## Descripción
[Descripción clara del bug]

## Pasos para reproducir
1. 
2. 
3. 

## Comportamiento esperado
[Qué debería pasar]

## Comportamiento actual
[Qué pasa en realidad]

## Screenshots
[Si aplica]

## Environment
- OS: [Windows/Mac/Linux]
- Node version: [ej: 18.0.0]
- Browser: [ej: Chrome 120]

## Logs
[Pegar console.log relevante]
```

## 💬 Feature Requests

```markdown
## Descripción
[Descripción de la feature]

## Caso de uso
[Por qué es necesario]

## Solución propuesta
[Cómo implementarlo]

## Alternativas consideradas
[Otras opciones]
```

## 🚀 Release Process

1. Update version en package.json
2. Update CHANGELOG.md
3. Create release PR
4. Merge to main
5. Tag release: `git tag v1.2.3`
6. Deploy automatically

## ❓ Preguntas?

- 📖 Revisa la documentación en `/docs`
- 💬 Abre una GitHub Discussion
- 📧 Contacta al equipo principal

---

**¡Gracias por contribuir! 🎉**
