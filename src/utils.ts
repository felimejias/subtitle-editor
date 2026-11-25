export function formatTime(seconds: number, showHours = false): string {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  const ms = Math.floor((abs % 1) * 1000);
  
  if (showHours || h > 0) {
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
  return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function formatTimeShort(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  
  if (h > 0) {
    return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${sign}${m}:${s.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): number {
  // SRT format: 00:00:00,000 or 00:00:00.000
  const match = timeStr.match(/(\d+):(\d+):(\d+)[.,](\d+)/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    const ms = parseInt(match[4].padEnd(3, '0'), 10);
    return h * 3600 + m * 60 + s + ms / 1000;
  }
  // Short format: mm:ss or m:ss
  const shortMatch = timeStr.match(/(\d+):(\d+)/);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const s = parseInt(shortMatch[2], 10);
    return m * 60 + s;
  }
  return 0;
}

export function generateWaveformData(audioBuffer: AudioBuffer, width: number): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const samplesPerPixel = Math.ceil(channelData.length / width);
  const data = new Float32Array(width);
  
  for (let i = 0; i < width; i++) {
    const start = i * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, channelData.length);
    let sum = 0;
    let max = 0;
    
    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      sum += val;
      if (val > max) max = val;
    }
    
    // Use a combination of average and peak for better visualization
    data[i] = (sum / samplesPerPixel) * 0.3 + max * 0.7;
  }
  
  return data;
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  color: string,
  progress?: number,
  progressColor?: string
): void {
  ctx.clearRect(0, 0, width, height);
  const centerY = height / 2;
  const scale = height * 0.4;
  
  // Draw background waveform
  ctx.fillStyle = color + '40'; // 25% opacity
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  
  for (let i = 0; i < width; i++) {
    const y = centerY - data[i] * scale;
    ctx.lineTo(i, y);
  }
  
  for (let i = width - 1; i >= 0; i--) {
    const y = centerY + data[i] * scale;
    ctx.lineTo(i, y);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Draw progress waveform if provided
  if (progress !== undefined && progress > 0 && progressColor) {
    const progressWidth = Math.min(width, Math.max(0, width * progress));
    ctx.fillStyle = progressColor + '80'; // 50% opacity
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let i = 0; i < progressWidth; i++) {
      const y = centerY - data[i] * scale;
      ctx.lineTo(i, y);
    }
    
    for (let i = progressWidth - 1; i >= 0; i--) {
      const y = centerY + data[i] * scale;
      ctx.lineTo(i, y);
    }
    
    ctx.closePath();
    ctx.fill();
  }
}

export function exportSRT(entries: Array<{ index: number; startTime: number; endTime: number; text: string }>): string {
  return entries
    .map((entry) => {
      return `${entry.index}\n${formatTime(entry.startTime, true)} --> ${formatTime(entry.endTime, true)}\n${entry.text}\n`;
    })
    .join('\n');
}

export function exportVTT(entries: Array<{ index: number; startTime: number; endTime: number; text: string }>): string {
  const lines = ['WEBVTT', ''];
  
  entries.forEach((entry) => {
    lines.push(`${formatTime(entry.startTime, true).replace(',', '.')} --> ${formatTime(entry.endTime, true).replace(',', '.')}`);
    lines.push(entry.text);
    lines.push('');
  });
  
  return lines.join('\n');
}

export function parseSRT(content: string): Array<{ index: number; startTime: number; endTime: number; text: string }> {
  const entries: Array<{ index: number; startTime: number; endTime: number; text: string }> = [];
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    
    const index = parseInt(lines[0], 10);
    const timeMatch = lines[1].match(/(\d+:\d+:\d+[.,]\d+)\s*-->\s*(\d+:\d+:\d+[.,]\d+)/);
    
    if (!timeMatch) continue;
    
    const startTime = parseTime(timeMatch[1]);
    const endTime = parseTime(timeMatch[2]);
    const text = lines.slice(2).join('\n');
    
    if (!isNaN(index)) {
      entries.push({ index, startTime, endTime, text });
    }
  }
  
  return entries;
}

export function parseVTT(content: string): Array<{ index: number; startTime: number; endTime: number; text: string }> {
  const entries: Array<{ index: number; startTime: number; endTime: number; text: string }> = [];
  const lines = content.split('\n');
  let index = 0;
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines
    if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
      i++;
      continue;
    }
    
    // Check for timestamp line
    const timeMatch = line.match(/(\d+:\d+:\d+[.,]\d+)\s*-->\s*(\d+:\d+:\d+[.,]\d+)/);
    if (timeMatch) {
      const startTime = parseTime(timeMatch[1]);
      const endTime = parseTime(timeMatch[2]);
      i++;
      
      // Collect text lines until empty line
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }
      
      if (textLines.length > 0) {
        index++;
        entries.push({ index, startTime, endTime, text: textLines.join('\n') });
      }
    }
    i++;
  }
  
  return entries;
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}