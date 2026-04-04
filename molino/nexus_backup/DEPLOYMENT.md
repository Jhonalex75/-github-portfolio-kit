# Guía de Deployment - CyberEngineer Nexus

## 🎯 Opciones de Hosting

### 1. Firebase Hosting (Recomendado)
```bash
# Instalar CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar (si no está hecho)
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy
```

### 2. Vercel (Alternativa)
```bash
# Instalar CLI
npm install -g vercel

# Deploy
vercel

# Con variables de entorno
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# ...etc
```

### 3. Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Configurar variables en settings del repo
```

---

## 🔧 Configuración de Variables de Entorno

### Crear `.env.local` (LOCAL):
```bash
cp .env.example .env.local
# Luego editar con tus valores reales
```

### En Production (Vercel ejemplo):
```bash
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID studio-6587601373-5651d
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY your-api-key
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN your-domain.firebaseapp.com
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID your-app-id
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID your-sender-id
vercel env add NEXT_PUBLIC_SENTRY_DSN https://your-sentry-dsn@sentry.io/project
```

### Firebase Console:
1. Ve a Project Settings
2. Copia los valores de configuración
3. Pon los valores públicos en variables NEXT_PUBLIC_*

---

## 📋 Checklist Pre-Deployment

- [ ] Instalar dependencias: `npm install`
- [ ] Build sin errores: `npm run build`
- [ ] No hay warnings de TypeScript: `npm run typecheck`
- [ ] ESLint pasa: `npm run lint`
- [ ] Variables de entorno configuradas
- [ ] Firestore Rules publicadas
- [ ] Firebase Storage Rules configuradas
- [ ] CORS configurado en APIs externas
- [ ] Cache headers configurados
- [ ] Security headers presentes

---

## 🔒 Seguridad en Production

### 1. Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. CORS Headers
```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      ],
    },
  ];
}
```

### 3. Content Security Policy
```bash
# Agregar en response headers o <meta>
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
```

---

## 🧹 Optimización de Build

### Size Analysis:
```bash
# Ver size de bundles
npm install --save-dev @next/bundle-analyzer

# Luego generar reporte
ANALYZE=true npm run build
```

### Performance Tips:
- Lazy load componentes 3D
- Compress imágenes
- Usar Image Optimization
- Enable caching agresivo

---

## 📊 Monitoreo Post-Deploy

### 1. Sentry Setup
```bash
npm install --save @sentry/nextjs

# npx @sentry/wizard@latest -i nextjs
```

### 2. Google Analytics
```typescript
// En layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout() {
  return (
    <>
      {/* ... */}
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </>
  )
}
```

### 3. Firebase Console Monitoring
- Monitorear latencia de Firestore
- Revisar cuotas de uso
- Chequear errores de autenticación

---

## 🆘 Troubleshooting

### Error: "Can't resolve 'os'"
- Problema: Importing Node.js modules en cliente
- Solución: Usar `'use server'` en el archivo

### Error: "CORS error"
- Problema: Rutas externas bloqueadas
- Solución: Agregar CORS headers o usar proxy

### Error: "Firebase config not found"
- Problema: Variables de entorno no están set
- Solución: Verificar .env.local o variables en hosting

### Lentos el build
- Solución: `npm run build -- --profile` para análisis
- Considerar: Reducir tamaño de dependencias

---

## 📈 Escala y Límites

### Firebase Limits:
- **Firestore**: 100K ops/minuto gratis, luego pay-as-you-go
- **Storage**: 1GB gratis
- **Auth**: Usuario ilimitados

### optimizaciones:
- Usar batch writes
- Indexes para queries complejas
- Purge old logs regularmente
- CDN para assets estáticos

---

## 🔄 CI/CD (GitHub Actions ejemplo)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

**Tips De Oro 🌟:**
- Always test builds localmente primero
- Keep ENV vars secrets en Git (usa .env.local)
- Monitor performance post-deployment
- Regular backups de Firestore
- Usa staging environment antes de prod
