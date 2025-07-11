import { useCallback, useRef } from 'react';
import { useTaskActions, useTaskSelectors } from '../store/taskStore';
import { Task } from '../lib/firestore';

export interface DragDropHook {
  // State
  draggedTaskId: string | null;
  dropTargetId: string | null;
  dropPosition: 'above' | 'below' | null;
  isDragActive: boolean;
  
  // Actions
  onDragStart: (e: React.DragEvent<HTMLSpanElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLLIElement>) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>, dropId: string, onReorder: (taskIds: string[]) => Promise<void>) => void;
  
  // Utility
  setTaskRef: (taskId: string, element: HTMLElement | null) => void;
}

export function useDragDrop(): DragDropHook {
  // Selectors
  const { draggedTaskId, dropTargetId, dropPosition, isDragActive } = useTaskSelectors.useDragState();
  const tasks = useTaskSelectors.useTasks();
  
  // Actions
  const actions = useTaskActions();
  
  // Refs for drag and drop
  const taskRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Set task ref for drag functionality
  const setTaskRef = useCallback((taskId: string, element: HTMLElement | null) => {
    if (element) {
      taskRefs.current.set(taskId, element);
    } else {
      taskRefs.current.delete(taskId);
    }
  }, []);

  // Drag start handler
  const onDragStart = useCallback((e: React.DragEvent<HTMLSpanElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    actions.setDraggedTaskId(id);
    actions.setIsDragActive(true);
    
    // Get the entire task card element for the drag image
    const taskElement = taskRefs.current.get(id);
    const dragHandle = e.currentTarget;
    
    if (taskElement && dragHandle) {
      try {
        // Calculate click position relative to the drag handle (GripVertical icon)
        const taskRect = taskElement.getBoundingClientRect();
        const handleRect = dragHandle.getBoundingClientRect();
        
        // Calculate offset from the drag handle to maintain original click position
        const offsetX = handleRect.left - taskRect.left + (handleRect.width / 2);
        const offsetY = handleRect.top - taskRect.top + (handleRect.height / 2);
        
        // Create a clone of the task for the drag image
        const clone = taskElement.cloneNode(true) as HTMLElement;
        clone.style.transform = 'rotate(3deg)';
        clone.style.opacity = '0.9';
        clone.style.width = taskElement.offsetWidth + 'px';
        clone.style.maxWidth = taskElement.offsetWidth + 'px';
        clone.style.border = '2px solid rgba(45, 212, 191, 0.5)';
        clone.style.boxShadow = '0 10px 25px rgba(45, 212, 191, 0.3)';
        
        // Temporarily add clone to the DOM for drag image
        clone.style.position = 'absolute';
        clone.style.top = '-1000px';
        clone.style.left = '-1000px';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);
        
        // Set as drag image with proper offset to prevent jumping
        e.dataTransfer.setDragImage(clone, offsetX, offsetY);
        
        // Clean up clone after drag starts
        setTimeout(() => {
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
        }, 0);
      } catch (error) {
        // Fallback to default drag image if there's an error
        console.warn('Error setting custom drag image:', error);
      }
    }
  }, [actions]);

  // Drag end handler
  const onDragEnd = useCallback(() => {
    actions.resetDragState();
  }, [actions]);

  // Drag over handler
  const onDragOver = useCallback((e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // Drag enter handler
  const onDragEnter = useCallback((e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault();
    if (draggedTaskId && draggedTaskId !== id) {
      // Use requestAnimationFrame for smooth state updates
      requestAnimationFrame(() => {
        actions.setDropTarget(id, null);
        
        // Determine if we're dropping above or below based on mouse position
        const currentTarget = e.currentTarget;
        if (currentTarget) {
          const rect = currentTarget.getBoundingClientRect();
          const middle = rect.top + rect.height / 2;
          const position = e.clientY < middle ? 'above' : 'below';
          actions.setDropTarget(id, position);
        }
      });
    }
  }, [draggedTaskId, actions]);

  // Drag leave handler
  const onDragLeave = useCallback((e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    // Only clear drop target if we're leaving the task item itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      // Use requestAnimationFrame for smooth state updates
      requestAnimationFrame(() => {
        actions.setDropTarget(null, null);
      });
    }
  }, [actions]);

  // Drop handler
  const onDrop = useCallback(async (
    e: React.DragEvent<HTMLLIElement>, 
    dropId: string, 
    onReorder: (taskIds: string[]) => Promise<void>
  ) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    
    if (draggedId === dropId) {
      actions.resetDragState();
      return;
    }

    try {
      const draggedIdx = tasks.findIndex(t => t.id === draggedId);
      const dropIdx = tasks.findIndex(t => t.id === dropId);
      
      if (draggedIdx === -1 || dropIdx === -1) return;

      // Create reordered task list with position-aware insertion
      const newTasks = [...tasks];
      const [draggedTask] = newTasks.splice(draggedIdx, 1);
      
      // Calculate insertion index based on drop position
      let insertIdx = dropIdx;
      if (draggedIdx < dropIdx) {
        // If dragging down, adjust for the removed item
        insertIdx = dropPosition === 'above' ? dropIdx - 1 : dropIdx;
      } else {
        // If dragging up
        insertIdx = dropPosition === 'above' ? dropIdx : dropIdx + 1;
      }
      
      newTasks.splice(insertIdx, 0, draggedTask);
      const reorderedTaskIds = newTasks.map(task => task.id);

      // Update order in appropriate storage
      await onReorder(reorderedTaskIds);
    } catch (error) {
      console.error("Error reordering tasks:", error);
      actions.showToast("Failed to reorder tasks", "error");
    } finally {
      actions.resetDragState();
    }
  }, [tasks, dropPosition, actions]);

  return {
    // State
    draggedTaskId,
    dropTargetId,
    dropPosition,
    isDragActive,
    
    // Actions
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    
    // Utility
    setTaskRef,
  };
}