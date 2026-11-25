export interface SubtitleEntry {
  id: string;
  index: number;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
}

export interface SubtitleProject {
  id: string;
  title: string;
  entries: SubtitleEntry[];
  videoUrl?: string; // object URL for local video
  audioUrl?: string; // object URL for local audio
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  playbackRate: number;
  autoPause: boolean;
  showWaveform: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  fontSize: 14,
  playbackRate: 1,
  autoPause: true,
  showWaveform: true,
};

export const SAMPLE_PROJECT: SubtitleProject = {
  id: 'sample-1',
  title: 'Ejemplo de Subtítulos',
  entries: [
    { id: '1', index: 1, startTime: 0, endTime: 3.5, text: 'Bienvenido al editor de subtítulos.' },
    { id: '2', index: 2, startTime: 4, endTime: 7.2, text: 'Aquí puedes crear, editar y sincronizar subtítulos.' },
    { id: '3', index: 3, startTime: 8, endTime: 11.5, text: 'Usa las teclas de acceso rápido para ser más eficiente.' },
    { id: '4', index: 4, startTime: 12, endTime: 15, text: 'Espacio: Reproducir/Pausar | Enter: Nueva línea | Supr: Eliminar' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};