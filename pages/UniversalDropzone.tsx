import React, { useState, useRef } from 'react';
import { UploadCloud, Check, Copy, Terminal, ChevronRight, HardDrive } from 'lucide-react';
import { useToast } from '../components/Toast';
import '../styles/dropzone.css';

export const UniversalDropzone: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [artifact, setArtifact] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      dispatchArtifact(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      dispatchArtifact(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const copyCommand = () => {
    if (!artifact) return;
    const command = `tedge pull ${artifact.infoHash}`;
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success('Copied!', 'Command copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const dispatchArtifact = (rawFile: File) => {
    setUploadState('uploading');
    setProgress(0);
    setArtifact({ name: rawFile.name });
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', rawFile);

    const token = localStorage.getItem('te_token');

    // Using XMLHttpRequest to mimic axios onUploadProgress without adding new dependencies
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        setProgress(percentCompleted);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          setArtifact(response);
          setUploadState('success');
          toast.success('Artifact is Live', 'Genesis Seeder established successfully');
        } catch (err) {
          setErrorMsg('Invalid server response');
          setUploadState('error');
        }
      } else {
        try {
          const errResponse = JSON.parse(xhr.responseText);
          setErrorMsg(errResponse.error || errResponse.message || 'Upload failed');
        } catch (err) {
          setErrorMsg('Upload failed with status ' + xhr.status);
        }
        setUploadState('error');
      }
    };

    xhr.onerror = () => {
      setErrorMsg('Network error occurred during upload');
      setUploadState('error');
    };

    xhr.open('POST', '/api/torrent/create-from-file', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  };

  const resetState = () => {
    setUploadState('idle');
    setArtifact(null);
    setProgress(0);
    setErrorMsg('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      
      {uploadState === 'idle' && (
        <div 
          className={`dropzone-container ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon">
            <UploadCloud size={36} />
          </div>
          <h2 className="dropzone-title">Distribute to the Swarm</h2>
          <p className="dropzone-subtitle">
            Drop any artifact here to instantly seed it across the routing network.<br/>
            Max 2GB per file. Secure, decentralized, and lightning fast.
          </p>
          
          <input 
            ref={inputRef} 
            type="file" 
            className="file-input hidden" 
            onChange={handleChange} 
          />
          
          <button className="btn-primary" onClick={onButtonClick}>
            Select Artifact
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {uploadState === 'uploading' && artifact && (
        <div className="dropzone-container upload-state text-left w-full max-w-2xl mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-medium truncate max-w-[80%] text-text-primary">{artifact.name}</h2>
            </div>
            <div className="text-2xl font-semibold text-accent">{progress}%</div>
          </div>
          
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4 relative">
            <div 
              className="h-full bg-gradient-to-r from-accent to-green-300 transition-all duration-300 relative overflow-hidden" 
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-[shimmer_1.5s_infinite]" style={{ transform: 'translateX(-100%)' }}></div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <div className="w-2 h-2 rounded-full bg-accent animate-[pulse_2s_infinite]"></div>
            {progress < 100 ? 'Streaming to Control Plane...' : 'Hashing pieces and establishing Genesis Seeder...'}
          </div>
        </div>
      )}

      {uploadState === 'success' && artifact && (
        <div className="dropzone-container success-state">
          <div className="success-icon w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center bg-accent/20 text-accent border border-accent animate-[scaleIn_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <Check size={40} />
          </div>
          <h2 className="dropzone-title">Artifact is Live</h2>
          <p className="dropzone-subtitle mb-8 text-text-secondary">
            The Genesis Seeder has been established. This artifact is now available across the Swarm.
          </p>
          
          <div className="flex items-center justify-between bg-black/40 border border-border-subtle rounded-xl p-6 my-8 hover:border-white/20 transition-colors">
            <div className="font-mono text-lg text-white tracking-tight flex items-center gap-3">
              <span className="text-accent select-none">$</span>
              tedge pull {artifact.infoHash}
            </div>
            <button 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${copied ? 'bg-accent/20 text-accent border border-accent' : 'bg-transparent text-text-tertiary border border-border-subtle hover:bg-white/10 hover:text-white'}`} 
              onClick={copyCommand}
              title="Copy to clipboard"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          
          <button className="text-text-tertiary hover:text-white transition-colors" onClick={resetState}>
            Distribute another artifact
          </button>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="dropzone-container">
          <div className="dropzone-icon w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500">
            <Terminal size={36} />
          </div>
          <h2 className="dropzone-title">Dispatch Failed</h2>
          <p className="dropzone-subtitle text-red-400 mb-8">
            {errorMsg}
          </p>
          <button className="btn-primary" onClick={resetState}>
            Try Again
          </button>
        </div>
      )}
      
    </div>
  );
};
