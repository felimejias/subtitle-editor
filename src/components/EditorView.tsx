import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { SubtitleProject, SubtitleEntry, UserSettings } from '../types';
import { loadSettings, saveSettings } from '../storage';
import { useAudioWaveform } from '../hooks/useAudioWaveform';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useHistoryState } from '../hooks/useHistory';
import { formatTime, formatTimeShort, parseTime, exportSRT, exportVTT, downloadFile, parseSRT, parseVTT } from '../utils';

interface EditorViewProps {
  project: SubtitleProject;
  onExit: () => void;
  onProjectUpdate: (project: SubtitleProject) => void;
}

export function EditorView({ project, onExit, onProjectUpdate }: EditorViewProps) {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [entries, setEntries, undo, redo, canUndo, canRedo] = useHistoryState(project.entries);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'srt' | 'vtt'>('srt');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const { canvasRef: waveformCanvasRef, drawProgress, isReady: waveformReady } = useAudioWaveform({
    audioUrl: project.audioUrl ?? null,
    enabled: settings.showWaveform && !!project.audioUrl,
  });

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sync entries with project
  useEffect(() => {
    onProjectUpdate({ ...project, entries, updatedAt: Date.now() });
  }, [entries, project, onProjectUpdate]);

  // Video/Audio sync
  const mediaRef = useMemo(() => videoRef.current || audioRef.current, [project.videoUrl, project.audioUrl]);

  useEffect(() => {
    const media = mediaRef;
    if (!media) return;

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(media.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('ended', handleEnded);
    };
  }, [mediaRef]);

  // Update waveform progress
  useEffect(() => {
    if (waveformReady && duration > 0 && drawProgress) {
      drawProgress(currentTime / duration);
    }
  }, [currentTime, duration, waveformReady, drawProgress]);

  // Find current entry based on time
  const currentEntry = useMemo(() => {
    return entries.find(e => currentTime >= e.startTime && currentTime <= e.endTime) || null;
  }, [entries, currentTime]);

  // Auto-select current entry
  useEffect(() => {
    if (currentEntry && settings.autoPause) {
      setSelectedEntryId(currentEntry.id);
    }
  }, [currentEntry, settings.autoPause]);

  // Keyboard shortcuts
  const handlePlayPause = useCallback(() => {
    if (!mediaRef) return;
    if (isPlaying) {
      mediaRef.pause();
      setIsPlaying(false);
    } else {
      mediaRef.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((seconds: number) => {
    if (!mediaRef) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    mediaRef.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  const handleNewEntry = useCallback(() => {
    const newEntry: SubtitleEntry = {
      id: crypto.randomUUID(),
      index: entries.length + 1,
      startTime: currentTime,
      endTime: currentTime + 3,
      text: '',
    };
    setEntries([...entries, newEntry].sort((a, b) => a.startTime - b.startTime).map((e, i) => ({ ...e, index: i + 1 })));
    setEditingEntryId(newEntry.id);
    setEditingText('');
  }, [entries, currentTime, setEntries]);

  const handleDeleteEntry = useCallback(() => {
    if (!selectedEntryId) return;
    setEntries(entries.filter(e => e.id !== selectedEntryId).map((e, i) => ({ ...e, index: i + 1 })));
    setSelectedEntryId(null);
  }, [selectedEntryId, entries, setEntries]);

  const handleSplitEntry = useCallback(() => {
    if (!selectedEntryId) return;
    const entry = entries.find(e => e.id === selectedEntryId);
    if (!entry) return;

    const midTime = (entry.startTime + entry.endTime) / 2;
    const newEntry: SubtitleEntry = {
      id: crypto.randomUUID(),
      index: entry.index + 1,
      startTime: midTime,
      endTime: entry.endTime,
      text: '',
    };
    const updated = entries.map(e => {
      if (e.id === selectedEntryId) return { ...e, endTime: midTime };
      return e;
    });
    setEntries([...updated, newEntry].sort((a, b) => a.startTime - b.startTime).map((e, i) => ({ ...e, index: i + 1 })));
    setEditingEntryId(newEntry.id);
  }, [selectedEntryId, entries, setEntries]);

  const handleMergeEntries = useCallback(() => {
    if (!selectedEntryId) return;
    const entryIndex = entries.findIndex(e => e.id === selectedEntryId);
    if (entryIndex === -1 || entryIndex === entries.length - 1) return;

    const nextEntry = entries[entryIndex + 1];
    const updated = entries.map((e) => {
      if (e.id === selectedEntryId) return { ...e, endTime: nextEntry.endTime, text: e.text + ' ' + nextEntry.text };
      if (e.id === nextEntry.id) return null;
      return e;
    }).filter((e): e is SubtitleEntry => e !== null);
    setEntries(updated.map((e, _i) => ({ ...e, index: _i + 1 })));
  }, [selectedEntryId, entries, setEntries]);

  const handleSave = useCallback(() => {
    showToast('Proyecto guardado automáticamente', 'info');
  }, []);

  const handleExportSRT = useCallback(() => {
    const srt = exportSRT(entries);
    downloadFile(`${project.title}.srt`, srt, 'text/srt');
    showToast('Exportado como SRT', 'success');
    setShowExportModal(false);
  }, [entries, project.title]);

  const handleExportVTT = useCallback(() => {
    const vtt = exportVTT(entries);
    downloadFile(`${project.title}.vtt`, vtt, 'text/vtt');
    showToast('Exportado como VTT', 'success');
    setShowExportModal(false);
  }, [entries, project.title]);

  useKeyboardShortcuts({
    enabled: true,
    onPlayPause: handlePlayPause,
    onSeek: handleSeek,
    onNewEntry: handleNewEntry,
    onDeleteEntry: handleDeleteEntry,
    onSplitEntry: handleSplitEntry,
    onMergeEntries: handleMergeEntries,
    onUndo: undo,
    onRedo: redo,
    onSave: handleSave,
    onExportSRT: handleExportSRT,
    onExportVTT: handleExportVTT,
    targetRef: playerRef as React.RefObject<HTMLElement>,
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleTimeChange = (entryId: string, field: 'startTime' | 'endTime', value: string) => {
    const time = parseTime(value);
    if (isNaN(time)) return;
    
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        const updated = { ...e, [field]: time };
        // Ensure start < end
        if (field === 'startTime' && time >= e.endTime) {
          updated.endTime = time + 1;
        }
        if (field === 'endTime' && time <= e.startTime) {
          updated.startTime = Math.max(0, time - 1);
        }
        return updated;
      }
      return e;
    }).sort((a, b) => a.startTime - b.startTime).map((e, i) => ({ ...e, index: i + 1 })));
  };

  const handleTextChange = (entryId: string, text: string) => {
    setEntries(entries.map(e => e.id === entryId ? { ...e, text } : e));
  };

  const handleTextEditStart = (entry: SubtitleEntry) => {
    setEditingEntryId(entry.id);
    setEditingText(entry.text);
  };

  const handleTextEditSave = (entryId: string) => {
    handleTextChange(entryId, editingText);
    setEditingEntryId(null);
  };

  const handleTextEditCancel = () => {
    setEditingEntryId(null);
  };

  const handleMediaLoad = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const target = e.currentTarget;
    setDuration(target.duration);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mediaRef || !waveformCanvasRef.current) return;
    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    mediaRef.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mediaRef) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    mediaRef.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!mediaRef) return;
    mediaRef.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleImportSubtitles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      let parsed: Array<{ index: number; startTime: number; endTime: number; text: string }> = [];
      
      if (file.name.endsWith('.srt')) {
        parsed = parseSRT(content);
      } else if (file.name.endsWith('.vtt')) {
        parsed = parseVTT(content);
      }
      
      if (parsed.length > 0) {
        const newEntries = parsed.map((p, i) => ({
          id: crypto.randomUUID(),
          index: i + 1,
          startTime: p.startTime,
          endTime: p.endTime,
          text: p.text,
        }));
        setEntries(newEntries);
        showToast(`Importados ${newEntries.length} subtítulos`, 'success');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatTimeDisplay = (t: number) => formatTime(t, true);

  return (
    <div className="editor" ref={playerRef}>
      <header className="header">
        <h1 className="header-title">{project.title}</h1>
        <div className="header-actions">
          <select
            className="btn"
            value={settings.theme}
            onChange={(e) => setSettings(s => ({ ...s, theme: e.target.value as 'dark' | 'light' | 'auto' }))}
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            <option value="dark">🌙 Oscuro</option>
            <option value="light">☀️ Claro</option>
            <option value="auto">💻 Sistema</option>
          </select>
          <button className="btn btn-sm" onClick={() => setShowExportModal(true)}>
            Exportar
          </button>
          <button className="btn btn-sm btn-danger" onClick={onExit}>
            Cerrar
          </button>
        </div>
      </header>

      <div className="main">
        <div className="editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Video/Audio Player */}
          <div className="player-section" style={{ background: '#000' }}>
            {project.videoUrl && (
              <video
                ref={videoRef}
                src={project.videoUrl}
                onLoadedMetadata={handleMediaLoad}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
              />
            )}
            {!project.videoUrl && project.audioUrl && (
              <audio
                ref={audioRef}
                src={project.audioUrl}
                onLoadedMetadata={handleMediaLoad}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}
            {!project.videoUrl && !project.audioUrl && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Arrastra un video o audio aquí
              </div>
            )}

            <div className="player-controls">
              <button className="btn" onClick={handlePlayPause} style={{ padding: '8px 16px' }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span className="player-time">{formatTimeShort(currentTime)} / {formatTimeShort(duration)}</span>
              <input
                type="range"
                className="player-slider"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (mediaRef) mediaRef.currentTime = time;
                  setCurrentTime(time);
                }}
              />
              <select
                className="player-speed"
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
              <button className="btn btn-sm" onClick={handleNewEntry} title="Enter: Nueva entrada">
                ➕ Nueva
              </button>
              <button className="btn btn-sm" onClick={handleDeleteEntry} disabled={!selectedEntryId} title="Supr: Eliminar">
                🗑
              </button>
              <button className="btn btn-sm" onClick={handleSplitEntry} disabled={!selectedEntryId} title="Shift+Enter: Dividir">
                ✂ Dividir
              </button>
              <button className="btn btn-sm" onClick={handleMergeEntries} disabled={!selectedEntryId} title="Shift+M: Fusionar">
                🔗 Fusionar
              </button>
            </div>
          </div>

          {/* Waveform */}
          {settings.showWaveform && project.audioUrl && (
            <div className="waveform-container">
              <canvas
                ref={waveformCanvasRef}
                className="waveform-canvas"
                onClick={handleWaveformClick}
                style={{ cursor: 'pointer' }}
              />
              <div className="waveform-playhead" style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              <div className="waveform-markers">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`waveform-marker ${currentEntry?.id === entry.id ? 'current' : ''}`}
                    style={{ left: `${duration > 0 ? (entry.startTime / duration) * 100 : 0}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Subtitle List */}
          <div className="subtitle-list-section">
            <div className="subtitle-list-header">
              <h2 className="subtitle-list-title">Subtítulos ({entries.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={handleImportSubtitles}
                  style={{ display: 'none' }}
                  id="import-subs"
                />
                <label htmlFor="import-subs" className="btn btn-sm">
                  📥 Importar SRT/VTT
                </label>
                <button className="btn btn-sm" onClick={undo} disabled={!canUndo} title="Ctrl+Z">
                  ↶
                </button>
                <button className="btn btn-sm" onClick={redo} disabled={!canRedo} title="Ctrl+Y">
                  ↷
                </button>
              </div>
            </div>

            <div className="subtitle-list">
              {entries.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  No hay subtítulos aún. Presiona <kbd style={{ margin: '0 4px' }}>Enter</kbd> para crear el primero.
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`subtitle-entry ${currentEntry?.id === entry.id ? 'current' : ''} ${selectedEntryId === entry.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEntryId(entry.id)}
                  >
                    <div className="subtitle-entry-header">
                      <span className="subtitle-index">{entry.index}</span>
                      <span className="subtitle-time">
                        {formatTimeShort(entry.startTime)} → {formatTimeShort(entry.endTime)}
                      </span>
                      <div style={{ flex: 1 }} />
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedEntryId(entry.id); if (mediaRef) mediaRef.currentTime = entry.startTime; }}
                        title="Saltar a esta entrada"
                      >
                        ⏭
                      </button>
                    </div>
                    <div className="subtitle-entry-text">
                      {editingEntryId === entry.id ? (
                        <textarea
                          className="subtitle-textarea"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => handleTextEditSave(entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleTextEditSave(entry.id);
                            } else if (e.key === 'Escape') {
                              handleTextEditCancel();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          onDoubleClick={() => handleTextEditStart(entry)}
                          style={{ minHeight: 48, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {entry.text || <span style={{ color: 'var(--muted)' }}>(vacío - doble clic para editar)</span>}
                        </div>
                      )}
                    </div>
                    <div className="subtitle-entry-actions">
                      <input
                        type="text"
                        className="modal-input"
                        style={{ width: 100, fontSize: 12, fontFamily: 'monospace', padding: '4px 8px' }}
                        value={formatTimeDisplay(entry.startTime)}
                        onChange={(e) => handleTimeChange(entry.id, 'startTime', e.target.value)}
                        title="Tiempo de inicio"
                      />
                      <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>→</span>
                      <input
                        type="text"
                        className="modal-input"
                        style={{ width: 100, fontSize: 12, fontFamily: 'monospace', padding: '4px 8px' }}
                        value={formatTimeDisplay(entry.endTime)}
                        onChange={(e) => handleTimeChange(entry.id, 'endTime', e.target.value)}
                        title="Tiempo de fin"
                      />
                      <span style={{ flex: 1 }} />
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); if (mediaRef) mediaRef.currentTime = entry.startTime; }}
                        title="Reproducir desde aquí"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="timeline" onClick={handleTimelineClick}>
            <div className="timeline-ruler">
              {Array.from({ length: Math.max(1, Math.floor(duration / 10)) }, (_, i) => (
                <div key={i} className={`timeline-tick ${i % 5 === 0 ? 'major' : ''}`}>
                  {i % 5 === 0 && formatTimeShort(i * 10)}
                </div>
              ))}
            </div>
            <div className="timeline-track">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`timeline-block ${currentEntry?.id === entry.id ? 'current' : ''}`}
                  style={{
                    left: `${duration > 0 ? (entry.startTime / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? ((entry.endTime - entry.startTime) / duration) * 100 : 0}%`,
                    minWidth: '20px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntryId(entry.id);
                    if (mediaRef) mediaRef.currentTime = entry.startTime;
                  }}
                >
                  #{entry.index}
                </div>
              ))}
              <div
                className="timeline-playhead"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Exportar Subtítulos</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <label style={{ flex: 1 }}>
                <input
                  type="radio"
                  name="export-format"
                  value="srt"
                  checked={exportFormat === 'srt'}
                  onChange={() => setExportFormat('srt')}
                  style={{ marginRight: 8 }}
                />
                SRT (SubRip) - Más compatible
              </label>
              <label style={{ flex: 1 }}>
                <input
                  type="radio"
                  name="export-format"
                  value="vtt"
                  checked={exportFormat === 'vtt'}
                  onChange={() => setExportFormat('vtt')}
                  style={{ marginRight: 8 }}
                />
                VTT (WebVTT) - Para web
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowExportModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={exportFormat === 'srt' ? handleExportSRT : handleExportVTT}>
                Exportar .{exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Shortcuts Help */}
      <details className="shortcuts-help">
        <summary>Atajos de Teclado</summary>
        <div className="shortcuts-list">
          <kbd>Espacio</kbd><span>Reproducir / Pausar</span>
          <kbd>← / →</kbd><span>Retroceder / Avanzar 1s</span>
          <kbd>↑ / ↓</kbd><span>Retroceder / Avanzar 5s</span>
          <kbd>Shift+← / →</kbd><span>Retroceder / Avanzar 10s</span>
          <kbd>Enter</kbd><span>Nueva entrada</span>
          <kbd>Shift+Enter</kbd><span>Dividir entrada</span>
          <kbd>Supr</kbd><span>Eliminar entrada</span>
          <kbd>Shift+M</kbd><span>Fusionar con siguiente</span>
          <kbd>Ctrl+Z</kbd><span>Deshacer</span>
          <kbd>Ctrl+Y</kbd><span>Rehacer</span>
          <kbd>Ctrl+S</kbd><span>Guardar</span>
          <kbd>Ctrl+Shift+S</kbd><span>Exportar SRT</span>
          <kbd>Ctrl+Shift+V</kbd><span>Exportar VTT</span>
          <kbd>, / .</kbd><span>Velocidad - / +</span>
        </div>
      </details>
    </div>
  );
}