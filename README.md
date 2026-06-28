# Constructor de Objetivos SMART

Herramienta interactiva para la construcción y validación de objetivos SMART, diseñada para estudiantes de posgrado en salud pública.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## Descripcion

El **Constructor de Objetivos SMART** guia paso a paso al estudiante a traves de las 5 dimensiones de un objetivo bien formulado:

| Letra | Significado | Pregunta clave |
|-------|-------------|----------------|
| **S** | Especifico | Que se quiere lograr exactamente? |
| **M** | Medible | Como se medira el progreso? |
| **A** | Alcanzable | Es realista con los recursos disponibles? |
| **R** | Relevante | Contribuye a la solucion del problema? |
| **T** | Temporal | En que plazo se debe cumplir? |

## Funcionalidades

- **Formulario guiado de 9 pasos** con transiciones animadas
- **Selector de verbos** basados en la taxonomia de Bloom
- **Autogeneracion del objetivo** a partir de las respuestas del usuario
- **Validacion automatica** con 10 criterios de calidad
- **Puntuacion 0-100** con desglose por categoria SMART
- **Retroalimentacion y recomendaciones** personalizadas
- **Exportacion a Word (.docx)** con formato profesional
- **Selector de regiones y municipios** de Cundinamarca (15 regiones de salud)

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    # Pagina principal (wizard SMART)
│   ├── layout.tsx                  # Layout con metadata
│   └── api/
│       └── export-docx/
│           └── route.ts            # API de exportacion a Word
├── lib/
│   ├── smart-validator.ts          # Motor de validacion SMART
│   ├── data/
│   │   ├── regions.ts              # Regiones y municipios de Cundinamarca
│   │   └── verbs.ts                # Verbos de Bloom + conectores
│   └── utils.ts                    # Utilidades generales
└── components/ui/                  # Componentes shadcn/ui
```

## Tecnologias

- **Next.js 16** (App Router)
- **TypeScript 5**
- **Tailwind CSS 4** + shadcn/ui
- **Framer Motion** (animaciones)
- **docx** (generacion de documentos Word)
- **Lucide React** (iconografia)

## Instalacion Local

```bash
# Clonar el repositorio
git clone https://github.com/edilbertico/constructor-smart-goals.git
cd constructor-smart-goals

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Despliegue en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/edilbertico/constructor-smart-goals)

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Conectar el repositorio de GitHub
3. Vercel detecta automaticamente la configuracion de Next.js
4. El despliegue se completa en ~2 minutos

## Licencia

MIT