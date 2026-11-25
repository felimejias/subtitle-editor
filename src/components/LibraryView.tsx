import { useState, useCallback, useEffect } from 'react';
import type { SubtitleProject, UserSettings } from '../types';
import { loadProjects, saveProjects, createProject, saveSelectedProjectId, revokeObjectUrls } from '../storage';

interface LibraryViewProps {
  onOpenEditor: (projectId: string) => void;
  currentSettings: UserSettings;
}

export function LibraryView({ onOpenEditor, currentSettings }: LibraryViewProps) {
  const [projects, setProjects] = useState<SubtitleProject[]>(() => loadProjects());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dragging, setDragging] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCreateProject = useCallback(() => {
    const title = newProjectTitle.trim() || 'Proyecto sin título';
    const project = createProject(title);
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    saveSelectedProjectId(project.id);
    onOpenEditor(project.id);
    setShowCreateModal(false);
    setNewProjectTitle('');
    showToast('Proyecto creado', 'success');
  }, [newProjectTitle, projects, onOpenEditor, showToast]);

  const handleDeleteProject = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      revokeObjectUrls(project);
    }
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
    setDeleteConfirmId(null);
    showToast('Proyecto eliminado', 'success');
  }, [projects, showToast]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleOpenEditor = useCallback((id: string) => {
    saveSelectedProjectId(id);
    onOpenEditor(id);
  }, [onOpenEditor]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const mediaFiles = files.filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
    const subtitleFiles = files.filter(f => f.name.endsWith('.srt') || f.name.endsWith('.vtt'));

    if (mediaFiles.length > 0) {
      const file = mediaFiles[0];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const project = createProject(file.name.replace(/\.[^/.]+$/, ''));
      if (isVideo) {
        project.videoUrl = url;
      } else {
        project.audioUrl = url;
      }
      const updated = [project, ...projects];
      setProjects(updated);
      saveProjects(updated);
      saveSelectedProjectId(project.id);
      onOpenEditor(project.id);
      showToast(`${isVideo ? 'Video' : 'Audio'} cargado: ${file.name}`, 'success');
    }

    if (subtitleFiles.length > 0) {
      showToast('Arrastra subtítulos al editor para importarlos', 'info');
    }
  }, [projects, onOpenEditor, showToast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const mediaFiles = files.filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
    
    if (mediaFiles.length > 0) {
      const file = mediaFiles[0];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const project = createProject(file.name.replace(/\.[^/.]+$/, ''));
      if (isVideo) {
        project.videoUrl = url;
      } else {
        project.audioUrl = url;
      }
      const updated = [project, ...projects];
      setProjects(updated);
      saveProjects(updated);
      saveSelectedProjectId(project.id);
      onOpenEditor(project.id);
      showToast(`${isVideo ? 'Video' : 'Audio'} cargado: ${file.name}`, 'success');
    }
    e.target.value = '';
  }, [projects, onOpenEditor, showToast]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentSettings.theme);
  }, [currentSettings.theme]);

  return (
    <div className="library-view" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="header">
        <h1 className="header-title">Editor de Subtítulos</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Nuevo Proyecto
          </button>
          <input
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="media-input"
          />
          <label htmlFor="media-input" className="btn">
            📁 Cargar Video/Audio
          </label>
        </div>
      </header>

      {dragging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(77, 166, 255, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, pointerEvents: 'none', border: '2px dashed var(--accent)'
        }}>
          <div style={{ background: 'var(--card)', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Suelta video, audio o subtítulos aquí</div>
            <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14 }}>Soporta: MP4, WebM, MP3, WAV, SRT, VTT</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside className="sidebar" style={{ width: 320 }}>
          <div className="sidebar-header">
            <span className="sidebar-title">Proyectos</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{projects.length}</span>
          </div>
          <div className="project-list">
            {projects.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>📝</div>
                <div>No hay proyectos aún</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Crea uno nuevo o arrastra un video/audio</div>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="project-item"
                  onClick={() => handleOpenEditor(project.id)}
                >
                  <div className="project-item-title" title={project.title}>{project.title}</div>
                  <div className="project-item-meta">
                    <span>{project.entries.length} subtítulos</span>
                    {project.videoUrl && <span>🎬</span>}
                    {project.audioUrl && !project.videoUrl && <span>🎵</span>}
                  </div>
                  <div className="project-item-actions">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main content - Welcome */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 500 }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎬</div>
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 16 }}>Editor de Subtítulos Local</h2>
            <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
              Crea, edita y sincroniza subtítulos para tus videos. Funciona completamente offline,
              sin servidores, sin cuentas, sin telemetría.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: 16 }} onClick={() => setShowCreateModal(true)}>
                Crear Primer Proyecto
              </button>
              <label htmlFor="media-input" className="btn" style={{ padding: '16px 32px', fontSize: 16, width: '100%', maxWidth: 300, textAlign: 'center' }}>
                📁 Cargar Video o Audio
              </label>
            </div>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Atajos Principales (en Editor)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>
                <div><kbd>Espacio</kbd> Reproducir/Pausar</div>
                <div><kbd>Enter</kbd> Nueva entrada</div>
                <div><kbd>← →</kbd> ±1 segundo</div>
                <div><kbd>↑ ↓</kbd> ±5 segundos</div>
                <div><kbd>Shift+Enter</kbd> Dividir</div>
                <div><kbd>Supr</kbd> Eliminar</div>
                <div><kbd>Ctrl+Z</kbd> Deshacer</div>
                <div><kbd>Ctrl+Shift+S</kbd> Exportar SRT</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Proyecto</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Título del proyecto (opcional)"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') setShowCreateModal(false);
              }}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateProject}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">¿Eliminar Proyecto?</h2>
            <p style={{ marginBottom: 16, color: '#ccc' }}>Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="btn" onClick={handleCancelDelete}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleConfirmDelete(deleteConfirmId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}