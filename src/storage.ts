import type { SubtitleProject, UserSettings } from './types';
import { DEFAULT_SETTINGS, SAMPLE_PROJECT } from './types';

const PROJECTS_KEY = 'subtitle_editor_projects';
const SETTINGS_KEY = 'subtitle_editor_settings';
const SELECTED_PROJECT_KEY = 'subtitle_editor_selected_project';

export function loadProjects(): SubtitleProject[] {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load projects:', e);
  }
  return [SAMPLE_PROJECT];
}

export function saveProjects(projects: SubtitleProject[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

export function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadSelectedProjectId(): string | null {
  try {
    return localStorage.getItem(SELECTED_PROJECT_KEY);
  } catch (e) {
    console.error('Failed to load selected project:', e);
  }
  return null;
}

export function saveSelectedProjectId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(SELECTED_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
    }
  } catch (e) {
    console.error('Failed to save selected project:', e);
  }
}

export function createProject(title: string): SubtitleProject {
  return {
    id: crypto.randomUUID(),
    title,
    entries: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function revokeObjectUrls(project: SubtitleProject): void {
  if (project.videoUrl) URL.revokeObjectURL(project.videoUrl);
  if (project.audioUrl) URL.revokeObjectURL(project.audioUrl);
}