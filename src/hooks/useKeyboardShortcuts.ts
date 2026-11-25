import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onPlayPause?: () => void;
  onSeek?: (seconds: number) => void;
  onNewEntry?: () => void;
  onDeleteEntry?: () => void;
  onSplitEntry?: () => void;
  onMergeEntries?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExportSRT?: () => void;
  onExportVTT?: () => void;
  targetRef?: React.RefObject<HTMLElement>;
}

export function useKeyboardShortcuts({
  enabled = true,
  onPlayPause,
  onSeek,
  onNewEntry,
  onDeleteEntry,
  onSplitEntry,
  onMergeEntries,
  onUndo,
  onRedo,
  onSave,
  onExportSRT,
  onExportVTT,
  targetRef,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        // Allow some shortcuts even in inputs
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // If targetRef is provided, only handle keys when that element is focused or has focus within
      if (targetRef?.current && !targetRef.current.contains(document.activeElement)) {
        return;
      }

      const isMac = navigator.platform.includes('Mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Playback controls
      if (e.key === ' ' && !modifier) {
        e.preventDefault();
        onPlayPause?.();
        return;
      }

      if (e.key === 'ArrowLeft' && !modifier) {
        e.preventDefault();
        onSeek?.(-1);
        return;
      }

      if (e.key === 'ArrowRight' && !modifier) {
        e.preventDefault();
        onSeek?.(1);
        return;
      }

      if (e.key === 'ArrowUp' && !modifier) {
        e.preventDefault();
        onSeek?.(-5);
        return;
      }

      if (e.key === 'ArrowDown' && !modifier) {
        e.preventDefault();
        onSeek?.(5);
        return;
      }

      // Shift + arrows for larger seeks
      if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        onSeek?.(-10);
        return;
      }

      if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        onSeek?.(10);
        return;
      }

      // Entry editing
      if (e.key === 'Enter' && !modifier && !e.shiftKey) {
        e.preventDefault();
        onNewEntry?.();
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && !modifier) {
        e.preventDefault();
        onDeleteEntry?.();
        return;
      }

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onSplitEntry?.();
        return;
      }

      if (e.key === 'm' && e.shiftKey) {
        e.preventDefault();
        onMergeEntries?.();
        return;
      }

      // File operations
      if (modifier && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      if (modifier && e.shiftKey && e.key === 's') {
        e.preventDefault();
        onExportSRT?.();
        return;
      }

      if (modifier && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        onExportVTT?.();
        return;
      }

      // Undo/Redo
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      if ((modifier && e.key === 'z' && e.shiftKey) || (modifier && e.key === 'y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Playback rate
      if (e.key === '>' || e.key === '.') {
        e.preventDefault();
        // Handled by playback rate control
        return;
      }

      if (e.key === '<' || e.key === ',') {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onPlayPause,
    onSeek,
    onNewEntry,
    onDeleteEntry,
    onSplitEntry,
    onMergeEntries,
    onUndo,
    onRedo,
    onSave,
    onExportSRT,
    onExportVTT,
    targetRef,
  ]);
}