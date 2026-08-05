'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  Paper,
  OutlinedInput,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowLeft as ArrowLeftIcon,
  FloppyDisk as SaveIcon,
  Trash as TrashIcon,
  TextT as TextIcon,
  BoundingBox as RectIcon,
  DownloadSimple as ExportIcon,
  Broom as ClearIcon,
  ArrowUp as BringFrontIcon,
  ArrowDown as SendBackIcon,
  X as CloseIcon,
  MagnifyingGlassPlus as ZoomInIcon,
  MagnifyingGlassMinus as ZoomOutIcon,
  ArrowsOut as ZoomResetIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Eye as EyeIcon,
  EyeSlash as EyeSlashIcon,
  TreeStructure as HierarchyIcon,
  DotsSixVertical as DragHandleIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ArrowsDownUp as RootDropIcon,
  Copy as CopyIcon,
  Clipboard as PasteIcon,
  PencilSimple as EditIcon,
  Check as CheckIcon,
  Cards as CardsIcon,
} from '@phosphor-icons/react';
import * as fabric from 'fabric';
import apiClient from '@/lib/api-client';

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber/Orange
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#1e293b', // Dark Slate
  '#f1f5f9', // Light Gray
];

export interface HierarchyItem {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  visible: boolean;
  locked: boolean;
  fill?: string;
}

export default function StoreMapEditorPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const storeId = params?.id as string;

  const [storeName, setStoreName] = React.useState<string>('');
  const [storeCode, setStoreCode] = React.useState<string>('');
  const [initialMapData, setInitialMapData] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = React.useRef<fabric.Canvas | null>(null);
  const clipboardRef = React.useRef<any>(null);

  const [selectedColor, setSelectedColor] = React.useState<string>('#2563eb');
  const [selectedTextColor, setSelectedTextColor] = React.useState<string>('#ffffff');
  const [selectedObjText, setSelectedObjText] = React.useState<string>('');
  const [hasSelection, setHasSelection] = React.useState<boolean>(false);

  // Zoom & Hierarchy State
  const [zoomLevel, setZoomLevel] = React.useState<number>(1.0);
  const [hierarchyItems, setHierarchyItems] = React.useState<HierarchyItem[]>([]);
  const [selectedObjectId, setSelectedObjectId] = React.useState<string | null>(null);

  // Drag and Drop Hierarchy State
  const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);
  const [isRootDropActive, setIsRootDropActive] = React.useState<boolean>(false);

  // Layer Renaming State
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemName, setEditingItemName] = React.useState<string>('');

  // Track previous object positions for relative parent-child movement
  const prevPositionsRef = React.useRef<{ [id: string]: { left: number; top: number } }>({});

  const handleStartRename = (item: HierarchyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setEditingItemName(item.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingItemName.trim()) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const obj = canvas.getObjects().find((o: any) => o.customId === id) as any;
        if (obj) {
          obj.customName = editingItemName.trim();
          if (obj.type === 'textbox' || obj.type === 'text') {
            obj.set('text', editingItemName.trim());
          } else if (obj.type === 'group' && typeof obj.getObjects === 'function') {
            const subText = obj.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'text');
            if (subText) subText.set('text', editingItemName.trim());
          }
          canvas.renderAll();
          updateHierarchyList();
        }
      }
    }
    setEditingItemId(null);
  };

  // 1. Fetch Store Info
  React.useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchStore = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/Stores/${storeId}`);
        if (isMounted) {
          const store = res.data;
          setStoreName(store.name || `Sucursal #${storeId}`);
          setStoreCode(store.code || `SUC-${storeId}`);
          setInitialMapData(store.mapData || null);
        }
      } catch (err) {
        console.error('Failed to load store data', err);
        if (isMounted) {
          setToast({ open: true, message: 'No se pudo cargar la información de la sucursal', severity: 'error' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStore();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Helper: Sync hierarchy list from canvas objects
  const updateHierarchyList = React.useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects().filter((obj: any) => obj.type !== 'activeSelection');
    const items: HierarchyItem[] = objects.map((obj: any, index: number) => {
      if (!obj.customId) {
        obj.customId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
      if (!obj.customName) {
        const typeName = obj.type === 'textbox' || obj.type === 'text' ? 'Texto' : 'Rectángulo';
        obj.customName = `${typeName} ${index + 1}`;
      }
      return {
        id: obj.customId,
        name: obj.customName,
        type: obj.type || 'object',
        parentId: obj.parentId || null,
        visible: obj.visible !== false,
        locked: !!obj.lockMovementX,
        fill: (obj as any).fill || '#2563eb',
      };
    });

    setHierarchyItems(items);

    const activeObj = canvas.getActiveObject() as any;
    setSelectedObjectId(activeObj ? activeObj.customId || null : null);
  }, []);

  // 2. Initialize Fabric Canvas & Dynamic Resize Observer & Middle Click Panning
  React.useEffect(() => {
    if (loading || !canvasRef.current || !canvasContainerRef.current) return;

    const containerWidth = Math.max(canvasContainerRef.current.clientWidth - 16, 500);

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: 580,
      backgroundColor: '#f8fafc',
      selection: true,
    });

    fabricCanvasRef.current = initCanvas;

    // Selection handlers
    const handleSelectionChange = () => {
      const activeObj = initCanvas.getActiveObject() as any;
      setHasSelection(!!activeObj);
      setSelectedObjectId(activeObj ? activeObj.customId || null : null);

      if (activeObj) {
        let labelText = activeObj.customName || activeObj.text || '';
        if (activeObj.type === 'group' && typeof activeObj.getObjects === 'function') {
          const subText = activeObj.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'text');
          if (subText) labelText = subText.text || activeObj.customName || '';
        }
        setSelectedObjText(labelText);
      } else {
        setSelectedObjText('');
      }
    };

    initCanvas.on('selection:created', handleSelectionChange);
    initCanvas.on('selection:updated', handleSelectionChange);
    initCanvas.on('selection:cleared', handleSelectionChange);

    // Objects change handler
    const handleObjectChange = () => {
      updateHierarchyList();
    };

    initCanvas.on('object:added', handleObjectChange);
    initCanvas.on('object:removed', handleObjectChange);
    initCanvas.on('object:modified', handleObjectChange);

    // Middle Click Canvas Panning Navigation
    let isMiddleClickPanning = false;
    let lastMousePos = { x: 0, y: 0 };

    initCanvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt && (evt.button === 1 || evt.buttons === 4)) {
        isMiddleClickPanning = true;
        initCanvas.defaultCursor = 'grabbing';
        initCanvas.setCursor('grabbing');
        lastMousePos = { x: evt.clientX || 0, y: evt.clientY || 0 };
        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    initCanvas.on('mouse:move', (opt) => {
      if (isMiddleClickPanning) {
        const evt = opt.e as MouseEvent;
        if (evt) {
          const deltaX = (evt.clientX || 0) - lastMousePos.x;
          const deltaY = (evt.clientY || 0) - lastMousePos.y;
          initCanvas.relativePan(new fabric.Point(deltaX, deltaY));
          lastMousePos = { x: evt.clientX || 0, y: evt.clientY || 0 };
          evt.preventDefault();
          evt.stopPropagation();
        }
      }
    });

    initCanvas.on('mouse:up', () => {
      if (isMiddleClickPanning) {
        isMiddleClickPanning = false;
        initCanvas.defaultCursor = 'default';
        initCanvas.setCursor('default');
      }
    });

    // Parent-Child Movement Sync
    initCanvas.on('object:moving', (e) => {
      const target = e.target as any;
      if (!target || !target.customId) return;

      const prevPos = prevPositionsRef.current[target.customId];
      const currentLeft = target.left || 0;
      const currentTop = target.top || 0;

      if (prevPos) {
        const deltaX = currentLeft - prevPos.left;
        const deltaY = currentTop - prevPos.top;

        if (deltaX !== 0 || deltaY !== 0) {
          const moveChildren = (parentId: string, dx: number, dy: number) => {
            const allObjects = initCanvas.getObjects() as any[];
            allObjects.forEach((child) => {
              if (child.parentId === parentId) {
                const childLeft = (child.left || 0) + dx;
                const childTop = (child.top || 0) + dy;
                child.set({ left: childLeft, top: childTop });
                child.setCoords();
                prevPositionsRef.current[child.customId] = { left: childLeft, top: childTop };

                moveChildren(child.customId, dx, dy);
              }
            });
          };

          moveChildren(target.customId, deltaX, deltaY);
        }
      }

      prevPositionsRef.current[target.customId] = { left: currentLeft, top: currentTop };
      initCanvas.renderAll();
    });

    // Mouse Wheel Zoom
    initCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = initCanvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.3), 3.0);
      initCanvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      setZoomLevel(zoom);
    });

    // Load saved map json
    if (initialMapData) {
      try {
        const parsedData = JSON.parse(initialMapData);
        const loadResult = initCanvas.loadFromJSON(parsedData);
        if (loadResult && typeof (loadResult as any).then === 'function') {
          (loadResult as any).then(() => {
            initCanvas.renderAll();
            updateHierarchyList();
          });
        } else {
          initCanvas.renderAll();
          updateHierarchyList();
        }
      } catch (e) {
        console.error('Failed to parse saved map json', e);
      }
    } else {
      updateHierarchyList();
    }

    // Dynamic Container Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        if (width > 50 && fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({ width: width - 8 });
          fabricCanvasRef.current.renderAll();
        }
      }
    });

    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      initCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [loading, initialMapData, updateHierarchyList]);

  // Copy & Paste Functionality (Supports Single and Multi-Select ActiveSelection)
  const handleCopy = React.useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const selectedObjects = canvas.getActiveObjects();
    if (!selectedObjects || selectedObjects.length === 0) return;

    // Extract snapshot of each item with absolute matrix coordinates
    clipboardRef.current = selectedObjects.map((obj: any) => {
      let absLeft = obj.left || 100;
      let absTop = obj.top || 100;

      if (typeof obj.calcTransformMatrix === 'function') {
        const matrix = obj.calcTransformMatrix();
        absLeft = matrix[4];
        absTop = matrix[5];
      }

      let groupRectFill = obj.fill || '#2563eb';
      let groupTextVal = obj.text || obj.customName || 'Zona';
      let groupTextColor = '#ffffff';
      let groupWidth = obj.width || 140;
      let groupHeight = obj.height || 90;

      if (obj.type === 'group' && typeof obj.getObjects === 'function') {
        const subObjs = obj.getObjects();
        const rectSub = subObjs.find((so: any) => so.type === 'rect') || subObjs[0];
        const textSub = subObjs.find((so: any) => so.type === 'textbox' || so.type === 'text') || subObjs[1];
        if (rectSub) {
          groupRectFill = rectSub.fill || groupRectFill;
          if (rectSub.width) groupWidth = rectSub.width;
          if (rectSub.height) groupHeight = rectSub.height;
        }
        if (textSub) {
          groupTextVal = textSub.text || groupTextVal;
          groupTextColor = textSub.fill || groupTextColor;
        }
      }

      return {
        type: obj.type,
        customName: obj.customName,
        text: groupTextVal,
        textColor: groupTextColor,
        left: absLeft,
        top: absTop,
        width: groupWidth,
        height: groupHeight,
        fontSize: obj.fontSize || 18,
        fontWeight: obj.fontWeight || 'bold',
        fill: groupRectFill,
        fontFamily: obj.fontFamily || 'sans-serif',
        textAlign: obj.textAlign || 'center',
        rx: obj.rx || 8,
        ry: obj.ry || 8,
        stroke: obj.stroke || '#1e293b',
        strokeWidth: obj.strokeWidth || 2,
        angle: obj.angle || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
      };
    });

    setToast({ open: true, message: `¡${clipboardRef.current.length} objeto(s) copiado(s)!`, severity: 'success' });
  }, []);

  const handlePaste = React.useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const copiedItems = clipboardRef.current;
    if (!canvas || !copiedItems || !Array.isArray(copiedItems) || copiedItems.length === 0) return;

    canvas.discardActiveObject();
    const baseCount = canvas.getObjects().filter((o: any) => o.type !== 'activeSelection').length;
    const pastedObjects: fabric.Object[] = [];

    for (let i = 0; i < copiedItems.length; i++) {
      const item = copiedItems[i];
      const count = baseCount + i + 1;
      const newCustomId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;
      const newLeft = item.left + 25;
      const newTop = item.top + 25;

      let newObj: fabric.Object | null = null;
      const itemType = (item.type || '').toLowerCase();

      if (itemType === 'group') {
        const rect = new fabric.Rect({
          width: item.width || 140,
          height: item.height || 90,
          fill: item.fill || '#2563eb',
          rx: item.rx || 8,
          ry: item.ry || 8,
          stroke: item.stroke || '#1e293b',
          strokeWidth: item.strokeWidth || 2,
          originX: 'center',
          originY: 'center',
        });

        const text = new fabric.Textbox(item.text || `Zona ${count}`, {
          fontSize: item.fontSize || 18,
          fontWeight: item.fontWeight || 'bold',
          fill: item.textColor || '#ffffff',
          fontFamily: item.fontFamily || 'sans-serif',
          textAlign: item.textAlign || 'center',
          originX: 'center',
          originY: 'center',
          width: (item.width || 140) - 20,
        });

        newObj = new fabric.Group([rect, text], {
          left: newLeft,
          top: newTop,
        });

        (newObj as any).customName = `${item.customName || 'Caja Zona'} (Copia ${count})`;
      } else if (itemType === 'textbox' || itemType === 'text') {
        newObj = new fabric.Textbox(item.text || 'Texto', {
          left: newLeft,
          top: newTop,
          width: item.width || 180,
          fontSize: item.fontSize || 20,
          fontWeight: item.fontWeight || 'bold',
          fill: item.fill || '#1e293b',
          fontFamily: item.fontFamily || 'sans-serif',
          textAlign: item.textAlign || 'center',
          angle: item.angle || 0,
          scaleX: item.scaleX || 1,
          scaleY: item.scaleY || 1,
        });
        (newObj as any).customName = `${item.customName || 'Texto'} (Copia ${count})`;
      } else if (itemType === 'rect') {
        newObj = new fabric.Rect({
          left: newLeft,
          top: newTop,
          width: item.width || 140,
          height: item.height || 90,
          fill: item.fill || '#2563eb',
          rx: item.rx || 6,
          ry: item.ry || 6,
          stroke: item.stroke || '#1e293b',
          strokeWidth: item.strokeWidth || 2,
          angle: item.angle || 0,
          scaleX: item.scaleX || 1,
          scaleY: item.scaleY || 1,
        });
        (newObj as any).customName = `${item.customName || 'Rectángulo'} (Copia ${count})`;
      }

      if (newObj) {
        (newObj as any).customId = newCustomId;
        (newObj as any).parentId = null;
        prevPositionsRef.current[newCustomId] = { left: newLeft, top: newTop };

        canvas.add(newObj);
        pastedObjects.push(newObj);
      }
    }

    if (pastedObjects.length === 1) {
      canvas.setActiveObject(pastedObjects[0]);
    } else if (pastedObjects.length > 1) {
      const selection = new fabric.ActiveSelection(pastedObjects, { canvas });
      canvas.setActiveObject(selection);
    }

    canvas.renderAll();
    updateHierarchyList();
    setToast({ open: true, message: `¡${pastedObjects.length} objeto(s) pegado(s)!`, severity: 'success' });
  }, [updateHierarchyList]);

  // Global Keyboard Shortcuts (Ctrl+C / Ctrl+V)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste]);

  // Zoom Actions
  const handleZoom = (zoomRatio: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const clampedZoom = Math.min(Math.max(zoomRatio, 0.3), 3.0);
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(new fabric.Point(center.x, center.y), clampedZoom);
    setZoomLevel(clampedZoom);
  };

  const handleZoomIn = () => handleZoom(zoomLevel + 0.15);
  const handleZoomOut = () => handleZoom(zoomLevel - 0.15);
  const handleZoomReset = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1.0);
  };

  // Add Rectangle
  const handleAddRectangle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const count = canvas.getObjects().length + 1;
    const customId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const left = 80 + Math.random() * 120;
    const top = 80 + Math.random() * 100;

    const rect = new fabric.Rect({
      left,
      top,
      fill: selectedColor,
      width: 140,
      height: 90,
      rx: 6,
      ry: 6,
      stroke: '#1e293b',
      strokeWidth: 2,
    });

    (rect as any).customId = customId;
    (rect as any).customName = `Rectángulo ${count}`;
    (rect as any).parentId = null;

    prevPositionsRef.current[customId] = { left, top };

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    updateHierarchyList();
  };

  // Add Text Label
  const handleAddText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const count = canvas.getObjects().length + 1;
    const customId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const left = 100 + Math.random() * 120;
    const top = 100 + Math.random() * 100;

    const text = new fabric.Textbox(`Zona ${count}`, {
      left,
      top,
      width: 180,
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#1e293b',
      fontFamily: 'sans-serif',
      textAlign: 'center',
    });

    (text as any).customId = customId;
    (text as any).customName = `Texto Zona ${count}`;
    (text as any).parentId = null;

    prevPositionsRef.current[customId] = { left, top };

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    updateHierarchyList();
  };

  // Add Box with Text (Combined Object)
  const handleAddBoxWithText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const count = canvas.getObjects().filter((o: any) => o.type !== 'activeSelection').length + 1;
    const customId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const left = 100 + Math.random() * 120;
    const top = 100 + Math.random() * 100;

    const rect = new fabric.Rect({
      width: 140,
      height: 90,
      fill: selectedColor || '#2563eb',
      rx: 8,
      ry: 8,
      stroke: '#1e293b',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });

    const text = new fabric.Textbox(`Zona ${count}`, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      width: 120,
    });

    const group = new fabric.Group([rect, text], {
      left,
      top,
    });

    (group as any).customId = customId;
    (group as any).customName = `Caja Zona ${count}`;
    (group as any).parentId = null;

    prevPositionsRef.current[customId] = { left, top };

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    updateHierarchyList();
  };

  // Fill / Background Color Change
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject() as any;
    if (activeObj) {
      if (activeObj.type === 'group' && typeof activeObj.getObjects === 'function') {
        const subObjects = activeObj.getObjects();
        const rectObj = subObjects.find((o: any) => o.type === 'rect') || subObjects[0];
        if (rectObj) rectObj.set('fill', color);
      } else {
        activeObj.set('fill', color);
      }
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  // Text Color Change
  const handleTextColorChange = (color: string) => {
    setSelectedTextColor(color);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject() as any;
    if (activeObj) {
      if (activeObj.type === 'group' && typeof activeObj.getObjects === 'function') {
        const subObjects = activeObj.getObjects();
        const textObj = subObjects.find((o: any) => o.type === 'textbox' || o.type === 'text');
        if (textObj) textObj.set('fill', color);
      } else if (activeObj.type === 'textbox' || activeObj.type === 'text') {
        activeObj.set('fill', color);
      }
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  // Live Text Label Content Change
  const handleTextContentChange = (newText: string) => {
    setSelectedObjText(newText);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject() as any;
    if (activeObj) {
      activeObj.customName = newText;

      if (activeObj.type === 'group' && typeof activeObj.getObjects === 'function') {
        const subObjects = activeObj.getObjects();
        const textObj = subObjects.find((o: any) => o.type === 'textbox' || o.type === 'text');
        if (textObj) textObj.set('text', newText);
      } else if (activeObj.type === 'textbox' || activeObj.type === 'text') {
        activeObj.set('text', newText);
      }
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  // Hierarchy Selection & Layer Controls
  const handleSelectObjectInHierarchy = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o: any) => o.customId === id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
      setSelectedObjectId(id);
      setHasSelection(true);
    }
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o: any) => o.customId === id);
    if (obj) {
      obj.set('visible', !obj.visible);
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o: any) => o.customId === id);
    if (obj) {
      const isLocked = !obj.lockMovementX;
      obj.set({
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockRotation: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
      });
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  // -------------------------------------------------------------
  // Photoshop-Style Drag & Drop Hierarchy Logic
  // -------------------------------------------------------------

  const isDescendant = (checkId: string, potentialParentId: string): boolean => {
    let currentId: string | null = potentialParentId;
    while (currentId) {
      if (currentId === checkId) return true;
      const parentItem = hierarchyItems.find((i) => i.id === currentId);
      currentId = parentItem ? parentItem.parentId : null;
    }
    return false;
  };

  const handleDragStart = (id: string, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverItem = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemId && draggedItemId !== id && !isDescendant(draggedItemId, id)) {
      setDropTargetId(id);
    }
  };

  const handleDragLeaveItem = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
  };

  const handleDropOnItem = (targetParentId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);

    const draggedId = draggedItemId || e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetParentId || isDescendant(draggedId, targetParentId)) {
      setDraggedItemId(null);
      return;
    }

    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const childObj = canvas.getObjects().find((o: any) => o.customId === draggedId) as any;
      if (childObj) {
        childObj.parentId = targetParentId;
        canvas.renderAll();
        updateHierarchyList();
      }
    }
    setDraggedItemId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRootDropActive(false);

    const draggedId = draggedItemId || e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const childObj = canvas.getObjects().find((o: any) => o.customId === draggedId) as any;
      if (childObj) {
        childObj.parentId = null;
        canvas.renderAll();
        updateHierarchyList();
      }
    }
    setDraggedItemId(null);
  };

  // Render Tree Node recursively (Photoshop Layers style)
  const renderTreeNodes = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = hierarchyItems.filter((item) => item.parentId === parentId);
    if (children.length === 0) return null;

    return children.map((item) => {
      const isSelected = selectedObjectId === item.id;
      const isBeingDragged = draggedItemId === item.id;
      const isDropHover = dropTargetId === item.id;
      const hasSubChildren = hierarchyItems.some((i) => i.parentId === item.id);

      return (
        <React.Fragment key={item.id}>
          <ListItem
            draggable
            onDragStart={(e) => handleDragStart(item.id, e)}
            onDragOver={(e) => handleDragOverItem(item.id, e)}
            onDragLeave={handleDragLeaveItem}
            onDrop={(e) => handleDropOnItem(item.id, e)}
            onClick={() => handleSelectObjectInHierarchy(item.id)}
            sx={{
              pl: 1 + depth * 2.2,
              pr: 1.5,
              py: 1,
              mb: 0.8,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: isDropHover ? '#2563eb' : isSelected ? 'primary.main' : 'transparent',
              bgcolor: isDropHover ? '#dbeafe' : isSelected ? '#eff6ff' : isBeingDragged ? '#f1f5f9' : 'background.paper',
              opacity: isBeingDragged ? 0.5 : 1,
              boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.12)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
              userSelect: 'none',
              transition: 'all 0.15s ease-in-out',
              '&:hover': {
                bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ overflow: 'hidden', mr: 1 }}>
              <DragHandleIcon size={16} color="#94a3b8" />

              {hasSubChildren ? (
                <FolderOpenIcon size={18} color="#2563eb" />
              ) : item.type === 'group' ? (
                <CardsIcon size={18} color="#3b82f6" />
              ) : item.type === 'textbox' || item.type === 'text' ? (
                <TextIcon size={18} color="#10b981" />
              ) : (
                <RectIcon size={18} color="#8b5cf6" />
              )}

              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: item.fill || '#2563eb',
                  flexShrink: 0,
                }}
              />

              {editingItemId === item.id ? (
                <OutlinedInput
                  size="small"
                  autoFocus
                  value={editingItemName}
                  onChange={(e) => setEditingItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(item.id);
                    if (e.key === 'Escape') setEditingItemId(null);
                  }}
                  onBlur={() => handleSaveRename(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ height: 26, fontSize: 12, px: 1, py: 0, maxWidth: 110, bgcolor: '#ffffff' }}
                />
              ) : (
                <Tooltip title="Doble clic para renombrar">
                  <Typography
                    variant="body2"
                    fontWeight={isSelected ? 800 : 600}
                    noWrap
                    sx={{ fontSize: 13, cursor: 'pointer' }}
                    onDoubleClick={(e) => handleStartRename(item, e)}
                  >
                    {item.name}
                  </Typography>
                </Tooltip>
              )}
            </Stack>

            <Stack direction="row" spacing={0.3} flexShrink={0}>
              {editingItemId === item.id ? (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveRename(item.id);
                  }}
                >
                  <CheckIcon size={15} />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  onClick={(e) => handleStartRename(item, e)}
                  color="default"
                >
                  <EditIcon size={14} />
                </IconButton>
              )}

              <IconButton
                size="small"
                onClick={(e) => handleToggleVisibility(item.id, e)}
                color={item.visible ? 'default' : 'error'}
              >
                {item.visible ? <EyeIcon size={15} /> : <EyeSlashIcon size={15} />}
              </IconButton>

              <IconButton
                size="small"
                onClick={(e) => handleToggleLock(item.id, e)}
                color={item.locked ? 'warning' : 'default'}
              >
                {item.locked ? <LockIcon size={15} /> : <LockOpenIcon size={15} />}
              </IconButton>
            </Stack>
          </ListItem>

          {renderTreeNodes(item.id, depth + 1)}
        </React.Fragment>
      );
    });
  };

  // Layer Ordering & Delete
  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      updateHierarchyList();
    }
  };

  const handleClearCanvas = () => {
    if (!window.confirm('¿Estás seguro de borrar todos los objetos del mapa?')) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';
    canvas.renderAll();
    setHasSelection(false);
    updateHierarchyList();
  };

  const handleBringToFront = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.bringObjectToFront(activeObj);
      canvas.renderAll();
    }
  };

  const handleSendToBack = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.sendObjectToBack(activeObj);
      canvas.renderAll();
    }
  };

  // Save & Export
  const handleSaveMap = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const jsonMap = JSON.stringify((canvas as any).toJSON(['customId', 'customName', 'parentId', 'lockMovementX', 'lockMovementY']));
      await apiClient.put(`/Stores/${storeId}`, {
        name: storeName,
        code: storeCode,
        mapData: jsonMap,
      });

      setToast({
        open: true,
        message: '¡El mapa se guardó exitosamente en la sucursal!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to save map', err);
      setToast({
        open: true,
        message: 'Ocurrió un error al guardar el mapa.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportImage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = `Mapa-${storeCode || storeId}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (loading) {
    return (
      <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center">
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Cargando Diseñador de Mapa Fabric.js...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f1f5f9', py: 3, px: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header Bar */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid var(--mui-palette-divider)' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton color="default" onClick={() => router.push('/dashboard/stores')}>
                  <ArrowLeftIcon size={24} />
                </IconButton>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Diseñador de Mapa — {storeName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Código: <strong>{storeCode}</strong> | Paneo con Botón Central | Copiar (Ctrl+C) y Pegar (Ctrl+V)
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ExportIcon size={20} />}
                  onClick={handleExportImage}
                  sx={{ borderRadius: 2 }}
                >
                  Exportar PNG
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon size={20} />}
                  onClick={handleSaveMap}
                  disabled={saving}
                  sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                >
                  {saving ? 'Guardando...' : 'Guardar Mapa'}
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  startIcon={<CloseIcon size={20} />}
                  onClick={() => window.close()}
                  sx={{ borderRadius: 2 }}
                >
                  Cerrar Pestaña
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* 3-Column Responsive Workspace Layout */}
          <Grid container spacing={2.5} alignItems="stretch">
            {/* 1. Left Toolbar */}
            <Grid size={{ xs: 12, md: 3, lg: 2.5 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    🛠️ Herramientas
                  </Typography>

                  {/* Add Shapes */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      AGREGAR FORMAS
                    </Typography>

                    <Button
                      variant="outlined"
                      startIcon={<RectIcon size={18} />}
                      onClick={handleAddRectangle}
                      fullWidth
                      sx={{ borderRadius: 2, justifyContent: 'flex-start', py: 1 }}
                    >
                      Agregar Rectángulo
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<TextIcon size={18} />}
                      onClick={handleAddText}
                      fullWidth
                      sx={{ borderRadius: 2, justifyContent: 'flex-start', py: 1 }}
                    >
                      Agregar Texto
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CardsIcon size={18} />}
                      onClick={handleAddBoxWithText}
                      fullWidth
                      sx={{ borderRadius: 2, justifyContent: 'flex-start', py: 1, fontWeight: 700 }}
                    >
                      Caja con Texto
                    </Button>
                  </Stack>

                  <Divider />

                  {/* Copy & Paste Tools */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      PORTAPAPELES (EDITAR)
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!hasSelection}
                        onClick={handleCopy}
                        startIcon={<CopyIcon size={16} />}
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Copiar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!clipboardRef.current}
                        onClick={handlePaste}
                        startIcon={<PasteIcon size={16} />}
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Pegar
                      </Button>
                    </Stack>
                  </Stack>

                  <Divider />

                  {/* Edit Selected Object Text */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      EDITAR TEXTO DEL OBJETO
                    </Typography>
                    <OutlinedInput
                      size="small"
                      placeholder="Nombre / Texto de la zona..."
                      disabled={!hasSelection}
                      value={selectedObjText}
                      onChange={(e) => handleTextContentChange(e.target.value)}
                      sx={{ bgcolor: '#ffffff', borderRadius: 2, fontSize: 13 }}
                    />
                  </Stack>

                  <Divider />

                  {/* Shape Fill Color Palette */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      COLOR DE RELLENO (CAJA)
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {COLOR_PALETTE.map((color) => (
                        <Box
                          key={color}
                          onClick={() => handleColorChange(color)}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: color,
                            cursor: 'pointer',
                            border: selectedColor === color ? '3px solid #1e293b' : '1px solid rgba(0,0,0,0.1)',
                            transition: 'transform 0.1s',
                            '&:hover': { transform: 'scale(1.15)' },
                          }}
                        />
                      ))}
                    </Box>
                  </Stack>

                  <Divider />

                  {/* Text Color Palette */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      COLOR DE TEXTO
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {['#ffffff', '#1e293b', '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000'].map((color) => (
                        <Box
                          key={`text_${color}`}
                          onClick={() => handleTextColorChange(color)}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: color,
                            cursor: 'pointer',
                            border: selectedTextColor === color ? '3px solid #2563eb' : '1px solid rgba(0,0,0,0.2)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'transform 0.1s',
                            '&:hover': { transform: 'scale(1.15)' },
                          }}
                        />
                      ))}
                    </Box>
                  </Stack>

                  <Divider />

                  {/* Layer Actions */}
                  <Stack spacing={1.2}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      CAPAS Y ACCIONES
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!hasSelection}
                        onClick={handleBringToFront}
                        startIcon={<BringFrontIcon size={16} />}
                        fullWidth
                      >
                        Frente
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!hasSelection}
                        onClick={handleSendToBack}
                        startIcon={<SendBackIcon size={16} />}
                        fullWidth
                      >
                        Fondo
                      </Button>
                    </Stack>

                    <Button
                      variant="outlined"
                      color="error"
                      disabled={!hasSelection}
                      startIcon={<TrashIcon size={16} />}
                      onClick={handleDeleteSelected}
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      Eliminar Selección
                    </Button>
                  </Stack>

                  <Divider />

                  <Button
                    variant="text"
                    color="error"
                    startIcon={<ClearIcon size={16} />}
                    onClick={handleClearCanvas}
                    fullWidth
                  >
                    Limpiar Lienzo
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            {/* 2. Center Responsive Fabric Canvas + Zoom & Panning */}
            <Grid size={{ xs: 12, md: 6, lg: 6.5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid var(--mui-palette-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  bgcolor: '#ffffff',
                  minHeight: 620,
                  position: 'relative',
                  width: '100%',
                }}
              >
                {/* Floating Canvas Zoom Bar */}
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    zIndex: 10,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--mui-palette-divider)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Tooltip title="Alejar (Zoom Out)">
                    <IconButton size="small" onClick={handleZoomOut}>
                      <ZoomOutIcon size={18} />
                    </IconButton>
                  </Tooltip>

                  <Chip
                    label={`${Math.round(zoomLevel * 100)}%`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: 11, height: 24 }}
                  />

                  <Tooltip title="Acercar (Zoom In)">
                    <IconButton size="small" onClick={handleZoomIn}>
                      <ZoomInIcon size={18} />
                    </IconButton>
                  </Tooltip>

                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                  <Tooltip title="Restablecer Zoom (100%)">
                    <IconButton size="small" onClick={handleZoomReset}>
                      <ZoomResetIcon size={18} />
                    </IconButton>
                  </Tooltip>
                </Paper>

                <Typography variant="caption" color="text.secondary" mb={2}>
                  🖱️ Haz clic central para panear el lienzo | ⌨️ Ctrl+C / Ctrl+V para copiar/pegar
                </Typography>

                {/* Canvas Responsive Wrapper */}
                <Box
                  ref={canvasContainerRef}
                  onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
                  onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                  sx={{
                    width: '100%',
                    maxWidth: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '2px dashed #cbd5e1',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    bgcolor: '#f8fafc',
                    '& .canvas-container': {
                      maxWidth: '100% !important',
                    },
                  }}
                >
                  <canvas ref={canvasRef} />
                </Box>
              </Paper>
            </Grid>

            {/* 3. Right Photoshop Drag & Drop Hierarchy Panel */}
            <Grid size={{ xs: 12, md: 3, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid var(--mui-palette-divider)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Stack spacing={2} sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <HierarchyIcon size={22} color="#2563eb" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Jerarquía(Drag & Drop)
                    </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    <strong>Arrastra</strong> cualquier elemento y <strong>suéltalo sobre otro</strong> para convertirlo en su hijo, o suéltalo arriba para desasociarlo.
                  </Typography>

                  {/* Drop zone to unparent items */}
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsRootDropActive(true);
                    }}
                    onDragLeave={() => setIsRootDropActive(false)}
                    onDrop={handleDropOnRoot}
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: '2px dashed',
                      borderColor: isRootDropActive ? 'primary.main' : '#cbd5e1',
                      bgcolor: isRootDropActive ? '#dbeafe' : '#f8fafc',
                      textAlign: 'center',
                      transition: 'all 0.15s ease-in-out',
                      cursor: 'pointer',
                    }}
                  >
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <RootDropIcon size={18} color="#2563eb" />
                      <Typography variant="caption" fontWeight={700} color={isRootDropActive ? 'primary.main' : 'text.secondary'}>
                        📍 Soltar aquí para Nivel Raíz (Sin Padre)
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box sx={{ overflowY: 'auto', maxHeight: 480, pr: 0.5 }}>
                    {hierarchyItems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No hay objetos en el mapa. Agrega rectángulos o texto para comenzar.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {renderTreeNodes(null, 0)}
                      </List>
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
