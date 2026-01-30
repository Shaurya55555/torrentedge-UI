import React, { useState, useEffect, useRef } from 'react';
import { useSpeedSocket } from '../hooks/useSocket';
import { ArrowDown, ArrowUp, Activity } from 'lucide-react';

interface SpeedSample {
  download: number;
  upload: number;
  timestamp: number;
}

const MAX_SAMPLES = 60;

const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const SpeedGraph: React.FC = () => {
  const [samples, setSamples] = useState<SpeedSample[]>([]);
  const { latestSpeed, isConnected } = useSpeedSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Add new samples
  useEffect(() => {
    if (latestSpeed) {
      setSamples(prev => {
        const newSample: SpeedSample = {
          download: latestSpeed.downloadSpeed,
          upload: latestSpeed.uploadSpeed,
          timestamp: latestSpeed.timestamp,
        };
        return [...prev, newSample].slice(-MAX_SAMPLES);
      });
    }
  }, [latestSpeed]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear with subtle gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(17, 17, 17, 0.8)');
    bgGradient.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (samples.length < 2) {
      // Empty state
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', width / 2, height / 2 + 4);
      return;
    }

    const maxValue = Math.max(
      ...samples.map(s => Math.max(s.download, s.upload)),
      10 * 1024 // Min 10 KB/s scale
    ) * 1.1; // Add 10% headroom

    const paddedSamples = Array(MAX_SAMPLES - samples.length).fill({ download: 0, upload: 0 }).concat(samples);

    const drawArea = (data: number[], color: string, glowColor: string) => {
      const points: [number, number][] = data.map((value, i) => {
        const x = (i / (MAX_SAMPLES - 1)) * width;
        const y = height - (value / maxValue) * (height - 8) - 4;
        return [x, y];
      });

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Fill gradient
      ctx.beginPath();
      ctx.moveTo(0, height);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(width, height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color.replace('1)', '0.4)'));
      gradient.addColorStop(0.5, color.replace('1)', '0.15)'));
      gradient.addColorStop(1, color.replace('1)', '0)'));
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // End dot (pulsing effect via CSS)
      const lastPoint = points[points.length - 1];
      if (data[data.length - 1] > 0) {
        ctx.beginPath();
        ctx.arc(lastPoint[0], lastPoint[1], 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastPoint[0], lastPoint[1], 6, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace('1)', '0.5)');
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Draw upload first (behind)
    drawArea(
      paddedSamples.map(s => s.upload),
      'rgba(34, 197, 94, 1)',
      'rgba(34, 197, 94, 0.5)'
    );

    // Draw download on top
    drawArea(
      paddedSamples.map(s => s.download),
      'rgba(59, 130, 246, 1)',
      'rgba(59, 130, 246, 0.5)'
    );

  }, [samples]);

  const currentDownload = samples.length > 0 ? samples[samples.length - 1].download : 0;
  const currentUpload = samples.length > 0 ? samples[samples.length - 1].upload : 0;
  const peakDownload = Math.max(...samples.map(s => s.download), 0);
  const peakUpload = Math.max(...samples.map(s => s.upload), 0);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-text-tertiary" />
          <span className="text-xs font-medium text-text-secondary">Network Activity</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-500' : 'text-text-tertiary'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-text-tertiary'}`} />
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Graph */}
      <div className="relative h-28">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Speed stats */}
      <div className="grid grid-cols-2 divide-x divide-border-subtle border-t border-border-subtle">
        {/* Download */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDown size={14} className="text-accent" />
            <span className="text-xs text-text-tertiary">Download</span>
          </div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            {formatSpeed(currentDownload)}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            Peak: {formatSpeed(peakDownload)}
          </div>
        </div>

        {/* Upload */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUp size={14} className="text-green-500" />
            <span className="text-xs text-text-tertiary">Upload</span>
          </div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            {formatSpeed(currentUpload)}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            Peak: {formatSpeed(peakUpload)}
          </div>
        </div>
      </div>
    </div>
  );
};
