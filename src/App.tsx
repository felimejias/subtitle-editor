import { useState, useEffect, useCallback } from 'react';
import type { SubtitleProject, UserSettings } from './types';
import { loadSelectedProjectId, loadProjects, loadSettings } from './storage';
import { LibraryView } from './components/LibraryView';
import { EditorView } from './components/EditorView';
import './styles.css';

function App() {
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [projects, setProjects] = useState<SubtitleProject[]>(() => loadProjects());
  const [selectedProject, setSelectedProject] = useState<SubtitleProject | null>(null);
  const settings = useState<UserSettings>(() => loadSettings())[0];

  // Load selected project on mount
  useEffect(() => {
    const savedId = loadSelectedProjectId();
    if (savedId) {
      const project = projects.find((p) => p.id === savedId);
      if (project) {
        setSelectedProject(project);
        setView('editor');
      }
    }
  }, [projects]);

  const handleOpenEditor = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setView('editor');
    }
  }, [projects]);

  const handleExitEditor = useCallback(() => {
    setSelectedProject(null);
    setView('library');
  }, []);

  const handleProjectUpdate = useCallback((updatedProject: SubtitleProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }
  }, [selectedProject]);

  if (view === 'editor' && selectedProject) {
    return (
      <EditorView
        project={selectedProject}
        onExit={handleExitEditor}
        onProjectUpdate={handleProjectUpdate}
      />
    );
  }

  return (
    <LibraryView
      onOpenEditor={handleOpenEditor}
      currentSettings={settings}
    />
  );
}

export default App;