
# 🏭 CyberEngineer Nexus | Next-Gen Engineering Hub

[![GitHub](https://img.shields.io/badge/GitHub-nexus_backup-blue)](/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-11-ffca28)](https://firebase.google.com)
[![AI](https://img.shields.io/badge/AI-Genkit-orange)](https://firebase.google.com/docs/genkit)

Plataforma de ingeniería de última generación con IA integrada para diseño, simulación 3D y análisis técnico en tiempo real.

## 🎯 Características Principales

- ✅ **IA Generativa** - Google Gemini 1.5 para análisis técnico y generación de reportes
- ✅ **Visualización 3D** - Three.js con modelos GLTF dinámicos y simulaciones
- ✅ **Chat en Tiempo Real** - Comunicación técnica con soporte multimedia
- ✅ **Control de Calidad** - Módulo QA/QC con inspecciones documentadas
- ✅ **Seguridad Empresarial** - Firestore Rules, autenticación Firebase, RBAC
- ✅ **Escalable** - Arquitectura serverless en Google Cloud Infrastructure

## 🚀 Quick Start

### Requisitos
- Node.js 18+ y npm 9+
- Cuenta Firebase configurada
- Variables de entorno (ver `.env.example`)

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd nexus_backup

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:9002`

### Genkit AI Flows

```bash
# Desarrollar con Genkit playground
npm run genkit:dev

# Watch mode (desarrolla con hot reload)
npm run genkit:watch
```

## 📁 Estructura del Proyecto

```
src/
├── app/              # Páginas Next.js (App Router)
├── components/       # Componentes React reutilizables
├── firebase/         # Integración Firebase + Firestore
├── ai/               # Flujos de Genkit + Google Gemini
├── actions/          # Server Actions (operaciones seguras)
├── hooks/            # React Hooks personalizados
└── lib/              # Utilidades y helpers
```

Más detalles en [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Dev server en puerto 9002
npm run genkit:dev      # Playground de Genkit flows

# Testing
npm test                # Jest tests
npm run test:coverage   # Reporte de cobertura
npm run e2e             # Playwright E2E tests

# Linting y Type Checking
npm run lint            # ESLint + auto-fix
npm run typecheck       # TypeScript validation
npm run format          # Prettier formatting

# Build y Deploy
npm run build           # Build optimizado para producción
npm run start           # Inicia servidor producción
npm run analyze         # Análisis de size de bundles

# Mantenimiento
npm run precommit       # Validación completa (lint + typecheck)
```

## 🔐 Seguridad

### Configuración Local
```bash
cp .env.example .env.local
# Editar con valores reales (nunca commitear)
```

**Variables requeridas:**
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firestore Rules
La aplicación incluye reglas de seguridad avanzadas:
- ✅ Role-based access control (RBAC)
- ✅ Validación a nivel de documento
- ✅ Auditoría de cambios
- ✅ Protección de datos sensibles

Ver `firestore.rules` para detalles.

## 🤖 Flujos de IA Disponibles

1. **Generador de Títulos** - Crea títulos profesionales para reportes
2. **Design Review** - Análisis DFM automático de diseños
3. **Moderación de Contenido** - QA de mensajes en chat
4. **Q&A de Documentos** - Responde preguntas sobre documentos técnicos
5. **Síntesis de Reportes** - Genera reportes técnicos completos

```typescript
import { generarTituloAction } from '@/actions/titulos-actions';

const result = await generarTituloAction('Análisis SAG Molino', userId);
```

## 📊 Rendimiento y Monitoreo

### Logging Centralizado
```typescript
import { logger } from '@/lib/logger';

logger.log('Mensaje informativo');
logger.error('Error critical', error);
logger.debug('Debug info');
```

### Error Handling
- ErrorBoundary global para React errors
- Logging automático a Sentry (cuando esté configurado)
- UI amigable en caso de error

## 🧪 Testing

### Unit Tests
```bash
npm test
npm run test:coverage
```

### E2E Tests
```bash
npm run e2e
npm run e2e:ui  # Interfaz visual de Playwright
```

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para escribir tests.

## 📈 Escalabilidad

**Limites actuales:**
- Firebase Auth: Ilimitados usuarios
- Firestore: 100K ops/minuto (tier gratuito)
- Storage: 1GB gratis
- Funciones Cloud: Serverless ilimitadas

**Para escalar:**
1. Implementar caché con Redis
2. Usar Firestore indexes para queries complejas
3. CDN global para assets
4. Rate limiting por usuario

## 🚀 Deployment

### Opciones

**1. Firebase Hosting** (Recomendado)
```bash
npm run build
firebase deploy
```

**2. Vercel**
```bash
vercel deploy
```

**3. Netlify, AWS, GCP, etc.**

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas.

## 🤝 Contribuir

¡Contribuciones son bienvenidas!

1. Fork el repo
2. Crea una feature branch: `git checkout -b feature/name`
3. Commit cambios: `git commit -m "feat: description"`
4. Push: `git push origin feature/name`
5. Abre un Pull Request

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guía completa.

## 📚 Recursos

- [Documentación de Arquitectura](./ARCHITECTURE.md)
- [Guía de Deployment](./DEPLOYMENT.md)
- [Guía de Contribución](./CONTRIBUTING.md)
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)

## 📝 Licencia

Propiedad intelectual - MSC. ING. Jhon Alexander Valencia Marulanda

## 📧 Contacto

Para preguntas o soporte:
- 📧 Email: jhonalexandervm@outlook.com
- 📋 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

**Construido con ❤️ para Ingeniería de Clase Mundial**

Última actualización: Marzo 2026

