# Editor de Subtítulos Local

Un editor de subtítulos completo que funciona en el navegador. Sin backend, sin cuentas, sin telemetría. Todo se guarda localmente en `localStorage`.

## Características

- **Timeline visual** con regla de tiempo y bloques de subtítulos arrastrables
- **Waveform de audio** generado con Web Audio API (muestra progreso de reproducción)
- **Reproductor de video/audio** integrado (arrastra archivos MP4, WebM, MP3, WAV)
- **Edición de subtítulos** inline con tiempos de inicio/fin editables
- **Atajos de teclado** completos para flujo de trabajo rápido
- **Importar/Exportar** SRT y VTT
- **Deshacer/Rehacer** (Ctrl+Z / Ctrl+Y)
- **Dividir/Fusionar** entradas (Shift+Enter / Shift+M)
- **Tema oscuro/claro/auto** + color de acento personalizable
- **Persistencia** en localStorage (proyectos, settings, último proyecto abierto)

## Atajos de Teclado (Editor)

| Tecla | Acción |
|-------|--------|
| `Espacio` | Reproducir / Pausar |
| `← / →` | Retroceder / Avanzar 1s |
| `↑ / ↓` | Retroceder / Avanzar 5s |
| `Shift+← / →` | Retroceder / Avanzar 10s |
| `Enter` | Nueva entrada de subtítulo |
| `Shift+Enter` | Dividir entrada actual |
| `Supr / Backspace` | Eliminar entrada seleccionada |
| `Shift+M` | Fusionar con siguiente |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` | Rehacer |
| `Ctrl+S` | Guardar (auto) |
| `Ctrl+Shift+S` | Exportar SRT |
| `Ctrl+Shift+V` | Exportar VTT |
| `, / .` | Velocidad - / + |

## Instalación y ejecución

```bash
cd subtitle-editor
npm install
npm run dev
```

Abre `http://localhost:5173` (o el puerto que indique Vite).

## Uso

1. **Crear proyecto**: Click "Nuevo Proyecto" o arrastra un video/audio al área de bienvenida
2. **Cargar media**: Arrastra archivo de video/audio o usa "Cargar Video/Audio"
3. **Crear subtítulos**: Presiona `Enter` en el editor para nueva entrada
4. **Sincronizar**: Reproduce video, usa `←/→` para ajustar, `Enter` para nueva línea
5. **Editar tiempos**: Click en los tiempos de inicio/fin para editar directamente
6. **Exportar**: Botón "Exportar" → SRT o VTT

## Estructura de datos

```json
{
  "id": "uuid",
  "title": "Mi Película",
  "entries": [
    { "id": "uuid", "index": 1, "startTime": 0.0, "endTime": 3.5, "text": "Hola mundo" }
  ],
  "videoUrl": "blob:...",  // object URL
  "audioUrl": "blob:...",  // object URL
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

## Tecnologías

- React 18 + TypeScript + Vite
- Web Audio API (waveform)
- localStorage (persistencia)
- CSS custom properties (temas)

## Licencia

MIT