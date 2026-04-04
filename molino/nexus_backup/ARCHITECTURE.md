# CyberEngineer Nexus - Guía de Arquitectura

## 🏗️ Visión General

CyberEngineer Nexus es una plataforma de ingeniería de última generación construida sobre:
- **Frontend**: Next.js 15 (App Router) con React 19
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **IA**: Google Genkit con Gemini 1.5 Flash
- **Visualización 3D**: Three.js con modelos GLTF
- **Estilos**: Tailwind CSS + Radix UI

---

## 📁 Estructura del Proyecto

```
nexus_backup/
├── src/
│   ├── app/              # Páginas Next.js (App Router)
│   │   ├── page.tsx      # Página principal
│   │   ├── layout.tsx    # Layout raíz con providers
│   │   ├── simulation/   # Módulo 3D Simulator
│   │   ├── chat/         # Chat en tiempo real
│   │   ├── design-review/ # Revisión de diseños
│   │   ├── qa-qc/        # Control de calidad
│   │   └── ...           # Otras rutas
│   │
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/          # Componentes Radix UI
│   │   ├── ErrorBoundary.tsx
│   │   ├── Navigation.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ThreeScene.tsx
│   │   └── ...
│   │
│   ├── firebase/        # Integración Firebase
│   │   ├── config.ts    # Configuración (env vars)
│   │   ├── provider.tsx # Context provider
│   │   ├── client-provider.tsx
│   │   └── firestore/   # Helpers de Firestore
│   │
│   ├── ai/              # Flujos de IA (Genkit)
│   │   ├── genkit.ts    # Inicialización
│   │   └── flows/
│   │       ├── generador-titulos.ts
│   │       ├── design-review-dfm-analysis.ts
│   │       └── ...
│   │
│   ├── actions/         # Server Actions
│   │   ├── titulos-actions.ts
│   │   └── ...
│   │
│   ├── hooks/           # React Hooks personalizados
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   └── lib/             # Utilidades y helpers
│       ├── logger.ts    # Sistema de logging
│       ├── ai-utils.ts  # Retry + Rate limit
│       ├── utils.ts
│       └── ...
│
├── public/              # Assets estáticos
│   ├── index.html
│   ├── MOLINO.html
│   └── ...
│
├── docs/               # Documentación
├── .env.example        # Variables de entorno (plantilla)
├── next.config.ts      # Configuración Next.js
├── tsconfig.json       # TypeScript config
├── tailwind.config.ts  # Tailwind CSS
├── firestore.rules     # Firestore Security Rules
├── package.json        # Dependencias
└── README.md          # Este archivo
```

---

## 🔐 Seguridad

### Variables de Entorno
- Todas las credenciales deben estar en `.env.local` (no commiteadas)
- Usar `.env.example` como referencia
- Firebase config se carga desde variables de ambiente

### Firestore Rules
- Validación de permisos en nivel de base de datos
- Role-based access control (RBAC)
- Colecciones con sub-collections organizadas
- Logs de actividad auditables

### Error Boundaries
- Capturan errores de React para evitar crashes
- Logging automático a servicios externos
- UI amigable para el usuario en caso de error

---

## 🤖 Sistema de IA

### Flujos disponibles:
1. **generador-titulos**: Genera títulos para reportes
2. **design-review-dfm-analysis**: Análisis de diseños
3. **chat-content-moderation**: Moderación de contenido
4. **research-doc-qa**: Q&A sobre documentos
5. **synthesize-technical-report**: Síntesis de reportes

### Características de confiabilidad:
- ✅ Retry logic con backoff exponencial
- ✅ Rate limiting por usuario
- ✅ Validación de entrada/salida con Zod
- ✅ Logging centralizado

### Uso:
```typescript
import { withRetryAndRateLimit } from '@/lib/ai-utils';

const result = await withRetryAndRateLimit(
  () => generadorTitulos({ tema }),
  userId,
  'generadorTitulos'
);
```

---

## 🔄 Firebase Integration

### Autenticación
- Firebase Auth para login
- Google OAuth ready
- Manejo de estado de usuario en Context

### Firestore
- Estructura de colecciones normalizadas
- Sub-collections para datos relacionados
- Índices automáticos (crear según lo necesites)

### Estructura de datos recomendada:
```
users/{uid}
├── profile data
├── preferences/
│   └── settings documents

projects/{projectId}
├── metadata
├── designs/
├── simulations/
├── reports/
└── assets/

conversations/{convId}
└── messages/
    └── individual messages

activity/{userId}/logs/
└── activity records
```

---

## 📊 Logging y Monitoreo

### Logger Centralizado
```typescript
import { logger, LogLevel } from '@/lib/logger';

logger.log('Mensaje informativo');
logger.debug('Debug (solo dev)');
logger.warn('Advertencia');
logger.error('Error con excepción', error);
logger.critical('Error crítico', error);
```

### Características:
- Niveles de log: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Console output formateado en desarrollo
- Integración con Sentry (ready to setup)
- Metadatos opcionales

---

## ⚡ Performance

### Optimizaciones implementadas:
- ✅ Lazy loading de componentes 3D
- ✅ Image optimization con next/image
- ✅ Server Actions para operaciones pesadas
- ✅ Caching de configuración Firebase

### Recomendaciones:
- Usar React.memo para componentes costosos
- Implementar SWR o React Query para datos
- Precarga de assets 3D cuando sea posible
- Índices de Firestore para queries frecuentes

---

## 🧪 Testing

### Configuración (TODO):
- Jest para unit tests
- React Testing Library para componentes
- Playwright para E2E tests

### Hacer tests para:
- Server Actions críticas
- Hooks personalizados
- Componentes que manejan errores
- Flujos de usuarios principales

---

## 🚀 Deployment

### Requisitos:
1. Set environment variables en hosting (Firebase Hosting, Vercel, etc.)
2. Build sin errores: `npm run build`
3. Deploy automático desde Git (si está configurado)

### Checklist pre-deployment:
- ✅ Todos los tests pasan
- ✅ No hay errores TypeScript
- ✅ Firestore Rules están publicadas
- ✅ Variables de entorno configuradas
- ✅ Error logging (Sentry) está activado

---

## 📚 Recursos Importantes

- [Next.js Docs](https://nextjs.org)
- [Firebase Docs](https://firebase.google.com/docs)
- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev                 # Dev server en puerto 9002
npm run genkit:dev         # Genkit flows playground

# Producción
npm run build              # Build optimizado
npm run start              # Inicia servidor production
npm run lint               # ESLint
npm run typecheck          # TypeScript check

# Watch
npm run genkit:watch       # Genkit con watch mode
```

---

**Última actualización**: Marzo 2026
