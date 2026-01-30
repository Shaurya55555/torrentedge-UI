import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, ArrowDown, ArrowUp } from 'lucide-react';
import { settingsService } from '../services/api';
import { EngineSettings } from '../types';
import { useToast } from '../components/Toast';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  
  // Form state
  const [downloadPath, setDownloadPath] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [maxActiveTorrents, setMaxActiveTorrents] = useState(5);
  const [downloadLimit, setDownloadLimit] = useState(0);
  const [uploadLimit, setUploadLimit] = useState(0);
  const [downloadLimitUnit, setDownloadLimitUnit] = useState<'KB' | 'MB'>('MB');
  const [uploadLimitUnit, setUploadLimitUnit] = useState<'KB' | 'MB'>('MB');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.get();
      setSettings(data);
      
      setDownloadPath(data.downloadPath);
      setMaxConcurrent(data.maxConcurrent);
      setMaxActiveTorrents(data.maxActiveTorrents);
      
      // Convert bytes to MB for display
      if (data.speedLimits.download > 0) {
        const dlMB = data.speedLimits.download / (1024 * 1024);
        if (dlMB >= 1) {
          setDownloadLimit(Math.round(dlMB * 10) / 10);
          setDownloadLimitUnit('MB');
        } else {
          setDownloadLimit(Math.round(data.speedLimits.download / 1024));
          setDownloadLimitUnit('KB');
        }
      }
      
      if (data.speedLimits.upload > 0) {
        const ulMB = data.speedLimits.upload / (1024 * 1024);
        if (ulMB >= 1) {
          setUploadLimit(Math.round(ulMB * 10) / 10);
          setUploadLimitUnit('MB');
        } else {
          setUploadLimit(Math.round(data.speedLimits.upload / 1024));
          setUploadLimitUnit('KB');
        }
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dlBytes = downloadLimit * (downloadLimitUnit === 'MB' ? 1024 * 1024 : 1024);
      const ulBytes = uploadLimit * (uploadLimitUnit === 'MB' ? 1024 * 1024 : 1024);
      
      await settingsService.update({
        downloadPath,
        maxConcurrent,
        maxActiveTorrents,
        speedLimits: {
          download: dlBytes,
          upload: ulBytes,
        }
      });
      
      toast.success('Saved', 'Settings updated');
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-text-tertiary" size={20} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
        >
          {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
          Save
        </button>
      </div>

      <div className="space-y-6">
        {/* Storage */}
        <Section title="Storage">
          <Field label="Download directory">
            <input
              type="text"
              value={downloadPath}
              onChange={(e) => setDownloadPath(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent transition-colors"
              placeholder="/path/to/downloads"
            />
          </Field>
        </Section>

        {/* Speed Limits */}
        <Section title="Speed Limits">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Download" icon={<ArrowDown size={14} className="text-accent" />}>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={downloadLimit}
                  onChange={(e) => setDownloadLimit(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="0"
                />
                <select
                  value={downloadLimitUnit}
                  onChange={(e) => setDownloadLimitUnit(e.target.value as 'KB' | 'MB')}
                  className="bg-bg-tertiary border border-border-subtle rounded px-2 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="KB">KB/s</option>
                  <option value="MB">MB/s</option>
                </select>
              </div>
            </Field>
            
            <Field label="Upload" icon={<ArrowUp size={14} className="text-green-500" />}>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={uploadLimit}
                  onChange={(e) => setUploadLimit(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="0"
                />
                <select
                  value={uploadLimitUnit}
                  onChange={(e) => setUploadLimitUnit(e.target.value as 'KB' | 'MB')}
                  className="bg-bg-tertiary border border-border-subtle rounded px-2 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="KB">KB/s</option>
                  <option value="MB">MB/s</option>
                </select>
              </div>
            </Field>
          </div>
          <p className="text-xs text-text-tertiary mt-2">Set to 0 for unlimited</p>
        </Section>

        {/* Queue */}
        <Section title="Queue">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max concurrent downloads">
              <input
                type="number"
                min="1"
                max="10"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </Field>
            
            <Field label="Max active torrents">
              <input
                type="number"
                min="1"
                max="20"
                value={maxActiveTorrents}
                onChange={(e) => setMaxActiveTorrents(parseInt(e.target.value) || 1)}
                className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </Field>
          </div>
        </Section>

        {/* Info */}
        {settings?.dht && (
          <Section title="Network">
            <div className="text-sm text-text-secondary">
              DHT: {settings.dht.running ? (
                <span className="text-green-500">Active ({settings.dht.nodes} nodes)</span>
              ) : (
                <span className="text-text-tertiary">Inactive</span>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

// Helper components
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-border-subtle rounded-md">
    <div className="px-4 py-2 border-b border-border-subtle bg-bg-secondary">
      <h2 className="text-sm font-medium text-text-secondary">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1.5">
      {icon}
      {label}
    </label>
    {children}
  </div>
);
