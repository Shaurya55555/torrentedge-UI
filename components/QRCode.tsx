import React, { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;           // the magnet link (or any string)
  size?: number;           // canvas size in px (default 180)
  className?: string;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 180, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(false);

    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark:  '#e2e8f0',   // light foreground — matches dark UI text
        light: '#1e2433',   // dark background — matches bg-bg-secondary
      },
      errorCorrectionLevel: 'M',
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-text-tertiary bg-bg-tertiary rounded ${className}`}
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded ${className}`}
      style={{ imageRendering: 'pixelated' }}
      title="Scan to open magnet link"
    />
  );
};
