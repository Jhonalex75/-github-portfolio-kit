# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [0.2.0] - 2026-03-31

### Agregado
- ✨ Sistema de logging centralizado (`logger.ts`)
- ✨ Error Boundary global para capturar errores de React
- ✨ Retry logic con exponential backoff para AI flows
- ✨ Rate limiting por usuario (30 req/min, 1000/hora)
- ✨ Improved Firestore Security Rules con RBAC
- ✨ Configuración de variables de entorno segura
- ✨ Jest configuración para unit testing
- ✨ Playwright configuración para E2E testing
- ✨ Prettier configuración para code formatting
- ✨ Documentación completa (ARCHITECTURE.md, DEPLOYMENT.md, CONTRIBUTING.md)
- ✨ Server Actions mejoradas con validación y logging
- ✨ AI flows con validación Zod y manejo robusto de errores

### Mejorado
- 🔒 Firebase config ahora usa variables de entorno
- 🔒 TypeScript strict mode siempre habilitado
- 🔒 ESLint habilitado en builds
- 📚 README completamente reescrito
- 📚 Estructura de proyecto documentada
- 🚀 Performance optimizado en next.config.ts
- 🔧 Scripts de npm mejorados con nuevos comandos

### Cambiado
- ⚠️ `.env` ahora no debe ser commiteado (usar `.env.local`)
- ⚠️ TypeScript errors ahora causan fallo de build
- ⚠️ ESLint errors ahora causan fallo de build

### Removido
- 🗑️ Configuraciones de ignorar errores de TypeScript
- 🗑️ Configuraciones de ignorar errores de ESLint

### Seguridad
- 🔐 API keys ya no hardcodeados
- 🔐 Firestore Rules mejoradas con validaciones
- 🔐 Headers de seguridad agregados en next.config

### Documentación
- 📖 ARCHITECTURE.md: Guía completa de arquitectura
- 📖 DEPLOYMENT.md: Instrucciones de deployment
- 📖 CONTRIBUTING.md: Guía para contribuyentes
- 📖 .env.example: Plantilla de variables de entorno

---

## [0.1.0] - Initial Release

### Features
- Next.js 15 con App Router
- React 19
- Firebase Auth y Firestore
- Google Genkit para IA (Gemini 1.5 Flash)
- Visualización 3D con Three.js
- UI con Radix UI + Tailwind CSS
- Módulos de Chat, QA/QC, Design Review, Simulation

---

## Guía de Versionado

Seguimos Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Cambios incompatibles (breaking changes)
- **MINOR**: Nuevas features (backwards compatible)
- **PATCH**: Bug fixes

---

## Próximos Features Planeados

- [ ] Integración con Sentry para error tracking
- [ ] Soporte para múltiples idiomas (i18n)
- [ ] Modo offline con sincronización
- [ ] Exportación a PDF de reportes
- [ ] Integración con webhooks
- [ ] API REST pública
- [ ] Mobile app con React Native
- [ ] WebSockets para real-time collaboration
- [ ] Vector database para semantic search
- [ ] Análisis predictivo con ML

---

**Última actualización**: Marzo 31, 2026
