import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

// ==================== Basic Confirm ====================
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDelete: (name: string) => Promise<{ confirmed: boolean; deleteFiles: boolean }>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const useDeleteConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useDeleteConfirm must be used within a ConfirmProvider');
  }
  return context.confirmDelete;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<{
    type: 'confirm';
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | {
    type: 'delete';
    name: string;
    resolve: (value: { confirmed: boolean; deleteFiles: boolean }) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ type: 'confirm', options, resolve });
    });
  }, []);

  const confirmDelete = useCallback((name: string): Promise<{ confirmed: boolean; deleteFiles: boolean }> => {
    return new Promise((resolve) => {
      setDialog({ type: 'delete', name, resolve });
    });
  }, []);

  const handleClose = () => setDialog(null);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      {dialog?.type === 'confirm' && (
        <BasicConfirmDialog
          {...dialog.options}
          onConfirm={() => { dialog.resolve(true); handleClose(); }}
          onCancel={() => { dialog.resolve(false); handleClose(); }}
        />
      )}
      {dialog?.type === 'delete' && (
        <DeleteConfirmDialog
          name={dialog.name}
          onConfirm={(deleteFiles) => { dialog.resolve({ confirmed: true, deleteFiles }); handleClose(); }}
          onCancel={() => { dialog.resolve({ confirmed: false, deleteFiles: false }); handleClose(); }}
        />
      )}
    </ConfirmContext.Provider>
  );
};

// ==================== Basic Confirm Dialog ====================
const BasicConfirmDialog: React.FC<ConfirmOptions & { onConfirm: () => void; onCancel: () => void }> = ({
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={onCancel}>
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          {danger && (
            <div className="p-2 bg-red-500/10 rounded">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-3 py-1.5 text-sm rounded transition-colors ${danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-accent hover:bg-accent-hover text-white'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Delete Confirm Dialog ====================
const DeleteConfirmDialog: React.FC<{
  name: string;
  onConfirm: (deleteFiles: boolean) => void;
  onCancel: () => void;
}> = ({ name, onConfirm, onCancel }) => {
  const [deleteFiles, setDeleteFiles] = useState(false);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={onCancel}>
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">Delete torrent</h3>
            <p className="text-sm text-text-secondary truncate" title={name}>
              {name.length > 50 ? name.substring(0, 50) + '...' : name}
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="w-4 h-4 rounded border-border-subtle bg-bg-tertiary text-red-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-sm text-text-secondary">Also delete downloaded files</span>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(deleteFiles)} className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700 text-white transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
