# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## ✨ Características

- ✅ Crear responsables (con nombre y correo)
- ✅ Crear tareas
- ✅ Listar tareas en tablero Kanban (5 columnas: Creado, En progreso, Bloqueada, Finalizado, Cancelada)
- ✅ Cambiar estado de tareas con botones
- ✅ **Arrastrar y soltar (Drag & Drop)** para mover tareas entre columnas
- ✅ Asignar responsable a una tarea
- ✅ Editar título de una tarea directamente desde la tarjeta
- ✅ Eliminar tareas
- ✅ Buscar tareas por título
- ✅ Filtrar tareas por responsable
- ✅ Persistencia de datos en archivo `backend/data/db.json`
- ✅ API REST lista (Express) para integraciones externas
- 🔄 Integración opcional con **n8n** vía `N8N_WEBHOOK_URL`
