import React, { useState } from 'react';
import { useSync } from '../hooks/useSync';
import { TaskConflict } from '../lib/sync';

interface ConflictResolverProps {
  onResolve?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ConflictResolver({ 
  onResolve, 
  onDismiss, 
  className = '' 
}: ConflictResolverProps) {
  const { 
    syncState, 
    resolveConflict, 
    getConflictDescription,
    clearConflicts 
  } = useSync();

  const [selectedConflict, setSelectedConflict] = useState<TaskConflict | null>(
    syncState.unresolvedConflicts[0] || null
  );

  const handleResolve = (conflictId: string, resolution: 'keep_local' | 'keep_cloud' | 'merge') => {
    resolveConflict(conflictId, resolution);
    
    // Move to next conflict or complete
    const currentIndex = syncState.unresolvedConflicts.findIndex(
      conflict => conflict.localTask.id === conflictId || conflict.cloudTask.id === conflictId
    );
    
    if (currentIndex < syncState.unresolvedConflicts.length - 1) {
      setSelectedConflict(syncState.unresolvedConflicts[currentIndex + 1]);
    } else {
      setSelectedConflict(null);
      onResolve?.();
    }
  };

  const handleResolveAll = (resolution: 'keep_local' | 'keep_cloud' | 'merge') => {
    syncState.unresolvedConflicts.forEach(conflict => {
      const conflictId = conflict.localTask.id;
      resolveConflict(conflictId, resolution);
    });
    onResolve?.();
  };

  const handleDismiss = () => {
    clearConflicts();
    onDismiss?.();
  };

  if (!selectedConflict && syncState.unresolvedConflicts.length === 0) {
    return null;
  }

  const currentConflict = selectedConflict || syncState.unresolvedConflicts[0];
  const conflictIndex = syncState.unresolvedConflicts.findIndex(
    conflict => conflict === currentConflict
  ) + 1;
  const totalConflicts = syncState.unresolvedConflicts.length;

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-yellow-200 ${className}`}>
      {/* Header */}
      <div className="bg-yellow-50 px-4 py-3 rounded-t-lg border-b border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <h3 className="text-lg font-semibold text-gray-900">
              Resolve Conflicts
            </h3>
          </div>
          <div className="text-sm text-gray-600">
            {conflictIndex} of {totalConflicts}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {getConflictDescription(currentConflict)}
        </p>
      </div>

      {/* Conflict Details */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Local Task */}
          <div className="border border-border-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-text-100">Local Version</h4>
              <span className="text-xs bg-bg-700 text-text-200 px-2 py-1 rounded">
                Local
              </span>
            </div>
            <TaskDisplay task={currentConflict.localTask} />
          </div>

          {/* Cloud Task */}
          <div className="border border-border-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-text-100">Cloud Version</h4>
              <span className="text-xs bg-brand-500 text-bg-900 px-2 py-1 rounded">
                Cloud
              </span>
            </div>
            <TaskDisplay task={currentConflict.cloudTask} />
          </div>
        </div>

        {/* Resolution Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-text-100">Choose Resolution:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleResolve(currentConflict.localTask.id, 'keep_local')}
              className="p-3 border border-border-600 rounded-lg hover:bg-bg-700 active:bg-bg-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-left"
            >
              <div className="font-medium text-text-100">Keep Local</div>
              <div className="text-sm text-text-200">
                Use the local version and discard cloud changes
              </div>
            </button>

            <button
              onClick={() => handleResolve(currentConflict.cloudTask.id, 'keep_cloud')}
              className="p-3 border border-border-600 rounded-lg hover:bg-bg-700 active:bg-bg-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-left"
            >
              <div className="font-medium text-text-100">Keep Cloud</div>
              <div className="text-sm text-text-200">
                Use the cloud version and discard local changes
              </div>
            </button>

            <button
              onClick={() => handleResolve(currentConflict.localTask.id, 'merge')}
              className="p-3 border border-border-600 rounded-lg hover:bg-bg-700 active:bg-bg-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-left"
            >
              <div className="font-medium text-text-100">Merge</div>
              <div className="text-sm text-text-200">
                Combine both versions intelligently
              </div>
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {totalConflicts > 1 && (
          <div className="mt-6 pt-4 border-t border-border-600">
            <h4 className="font-medium text-text-100 mb-3">Resolve All Conflicts:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleResolveAll('keep_local')}
                className="px-3 py-2 text-sm bg-state-success text-bg-900 rounded-md hover:brightness-90 active:brightness-80 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Keep All Local
              </button>
              <button
                onClick={() => handleResolveAll('keep_cloud')}
                className="px-3 py-2 text-sm bg-state-info text-bg-900 rounded-md hover:brightness-90 active:brightness-80 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Keep All Cloud
              </button>
              <button
                onClick={() => handleResolveAll('merge')}
                className="px-3 py-2 text-sm bg-brand-500 text-bg-900 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Merge All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-bg-800 px-4 py-3 rounded-b-lg border-t border-border-600">
        <div className="flex justify-between items-center">
          <button
            onClick={handleDismiss}
            className="text-sm text-text-200 hover:bg-bg-800 active:bg-bg-700 px-2 py-1 rounded-md transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            Dismiss All
          </button>
          <div className="text-xs text-gray-500">
            {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''} remaining
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component to display task details
function TaskDisplay({ task }: { task: any }) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-sm font-medium text-gray-700">Title:</span>
        <div className="text-sm text-gray-900 mt-1">{task.title}</div>
      </div>
      
      <div>
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="mt-1">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            task.completed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {task.completed ? 'Completed' : 'Pending'}
          </span>
        </div>
      </div>
      
      <div>
        <span className="text-sm font-medium text-gray-700">Created:</span>
        <div className="text-sm text-gray-600 mt-1">
          {new Date(task.createdAt).toLocaleString()}
        </div>
      </div>
      
      {task.updatedAt && task.updatedAt !== task.createdAt && (
        <div>
          <span className="text-sm font-medium text-gray-700">Updated:</span>
          <div className="text-sm text-gray-600 mt-1">
            {new Date(task.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function ConflictResolverCompact({ onResolve }: { onResolve?: () => void }) {
  const { syncState, resolveConflict, clearConflicts } = useSync();

  if (syncState.unresolvedConflicts.length === 0) {
    return null;
  }

  const handleResolveAll = (resolution: 'keep_local' | 'keep_cloud' | 'merge') => {
    syncState.unresolvedConflicts.forEach(conflict => {
      const conflictId = conflict.localTask.id;
      resolveConflict(conflictId, resolution);
    });
    onResolve?.();
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <span className="text-sm font-medium text-gray-900">
            {syncState.unresolvedConflicts.length} conflict{syncState.unresolvedConflicts.length !== 1 ? 's' : ''} detected
          </span>
        </div>
        <button
          onClick={() => clearConflicts()}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Dismiss
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleResolveAll('keep_local')}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        >
          Keep Local
        </button>
        <button
          onClick={() => handleResolveAll('keep_cloud')}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Keep Cloud
        </button>
        <button
          onClick={() => handleResolveAll('merge')}
          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Merge All
        </button>
      </div>
    </div>
  );
} 