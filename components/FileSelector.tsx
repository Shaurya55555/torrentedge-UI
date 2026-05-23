import React, { useState, useEffect } from 'react';
import { Check, Square, RefreshCw, File, Download } from 'lucide-react';
import { torrentService } from '../services/api';
import { FileWithSelection } from '../types';

interface FileSelectorProps {
  torrentId: string;
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FileSelector: React.FC<FileSelectorProps> = ({ torrentId }) => {
  const [files, setFiles] = useState<FileWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const baseUrl =
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.REACT_APP_API_URL ||
    (typeof process !== 'undefined' ? (process as any).env?.REACT_APP_API_URL : undefined) ||
    'http://localhost:3029';

  const getDownloadUrl = (fileIndex: number) =>
    `${baseUrl}/api/torrent/${torrentId}/download?fileIndex=${fileIndex}`;

  const handleDownload = async (event: React.MouseEvent, file: FileWithSelection, fileName: string) => {
    event.stopPropagation();
    const token = localStorage.getItem('te_token');
    const downloadUrl = getDownloadUrl(file.index);

    if (!token) {
      return;
    }

    event.preventDefault();

    try {
      const res = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const data = await torrentService.getFiles(torrentId);
        setFiles(data.files);
        setSelection(new Set(data.files.filter(f => f.selected).map(f => f.index)));
      } catch (err) {
        console.error('Failed to load files:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [torrentId]);

  const toggle = (index: number) => {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size > 1) next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setHasChanges(true);
  };

  const apply = async () => {
    try {
      setSaving(true);
      const data = await torrentService.selectFiles(torrentId, Array.from(selection));
      setFiles(data.files);
      setSelection(new Set(data.files.filter(f => f.selected).map(f => f.index)));
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-center">
        <RefreshCw className="animate-spin text-text-tertiary mx-auto" size={16} />
      </div>
    );
  }

  if (files.length === 0) {
    return <div className="text-xs text-text-tertiary">No files</div>;
  }

  const selectedSize = files.filter(f => selection.has(f.index)).reduce((sum, f) => sum + f.length, 0);

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="text-xs text-text-tertiary">
        {selection.size}/{files.length} files • {formatSize(selectedSize)}
      </div>

      {/* File list */}
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {files.map((file) => {
          const isSelected = selection.has(file.index);
          const name = Array.isArray(file.path) ? file.path.join('/') : (file.name || file.path);
          const fileName = typeof name === 'string' ? (name.split('/').pop() || 'download') : 'download';
          const downloadUrl = getDownloadUrl(file.index);
          
          return (
            <div
              key={file.index}
              onClick={() => toggle(file.index)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                isSelected ? 'bg-bg-tertiary text-text-primary' : 'text-text-tertiary hover:bg-bg-hover'
              }`}
            >
              <div className={isSelected ? 'text-accent' : 'text-text-tertiary'}>
                {isSelected ? <Check size={12} /> : <Square size={12} />}
              </div>
              <File size={12} className="flex-shrink-0" />
              <span className="flex-1 truncate" title={name}>{name}</span>
              <span className="text-text-tertiary">{formatSize(file.length)}</span>
              <a
                href={downloadUrl}
                download={fileName}
                onClick={(event) => handleDownload(event, file, fileName)}
                className="ml-1 inline-flex items-center justify-center p-1 rounded text-text-tertiary hover:text-accent hover:bg-bg-hover transition-colors"
                title="Download"
              >
                <Download size={12} />
              </a>
            </div>
          );
        })}
      </div>

      {/* Apply */}
      {hasChanges && (
        <button
          onClick={apply}
          disabled={saving || selection.size === 0}
          className="w-full py-1.5 text-xs bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
        >
          {saving ? 'Saving...' : 'Apply'}
        </button>
      )}
    </div>
  );
};
