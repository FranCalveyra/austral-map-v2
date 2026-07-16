"use client";

import React, { useCallback } from 'react';
import { SubjectNode, Connection, SubjectStatus } from '@/types/curriculum';
import { getConnections, getColumns, LAYOUT } from '@/lib/curriculum-parser';
import { SubjectNodeComponent } from './subject-node';
import { Connections } from './connection/connections';
import { Legend } from './legend/legend';
import { NODE_HEIGHT_CLASS } from '../constants';
import { Minus, Plus } from 'lucide-react';


interface CurriculumGraphProps {
  nodes: SubjectNode[];
  selectedSubject: SubjectNode | null;
  showLegend: boolean;
  showElectives: boolean;
  showOtros: boolean;
  fitRevision: number;
  onSubjectSelect: (subject: SubjectNode | null) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
}

export function CurriculumGraph({ nodes, selectedSubject, showLegend, showElectives, showOtros, fitRevision, onSubjectSelect, onDrag, onStatusChange }: CurriculumGraphProps) {
  // Same layout constants as in parser
  const startX = LAYOUT.startX;
  const columnWidth = LAYOUT.columnWidth;
  const nodeHeight = LAYOUT.nodeHeight;
  
  // Zoom and pan state
  const [zoom, setZoom] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  // Loaded state for fade-in
  const [loaded, setLoaded] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPoint, setLastPanPoint] = React.useState({ x: 0, y: 0 });
  const [viewportRevision, setViewportRevision] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastAutoFitSignatureRef = React.useRef<string | null>(null);
  const zoomRef = React.useRef(1);
  const panOffsetRef = React.useRef({ x: 0, y: 0 });
  const pinchRef = React.useRef<{
    distance: number;
    zoom: number;
  } | null>(null);

  const clampZoom = (value: number) => Math.min(Math.max(0.5, value), 3);

  const applyZoomAt = useCallback((requestedZoom: number, clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const focalX = clientX - rect.left;
    const focalY = clientY - rect.top;
    const previousZoom = zoomRef.current;
    const nextZoom = clampZoom(requestedZoom);
    const previousPan = panOffsetRef.current;
    const graphX = (focalX - previousPan.x) / previousZoom;
    const graphY = (focalY - previousPan.y) / previousZoom;
    const nextPan = {
      x: focalX - graphX * nextZoom,
      y: focalY - graphY * nextZoom,
    };

    zoomRef.current = nextZoom;
    panOffsetRef.current = nextPan;
    setZoom(nextZoom);
    setPanOffset(nextPan);
  }, []);

  // The graph owns its viewport. Recalculate when a phone rotates or a tablet
  // changes split-screen size; relying only on the initial fit leaves the map
  // at the wrong scale after either event.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      setViewportRevision((revision) => revision + 1);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter nodes based on display settings
  const coreNodes = React.useMemo(() => {
    const filtered = nodes.filter(node => {
      // Exclude electives from main graph unless toggled on
      if (node.isElective && !showElectives) return false;

      // El curso de ingreso no forma parte de la estructura real del mapa.
      if (node.Year === 0) return false;

      // Filter "Otros Requisitos" (Year 'Otros') based on toggle
      if (!showOtros && node.Year === 'Otros') return false;

      return true;
    });
    return filtered;
  }, [nodes, showElectives, showOtros]);

  // Columnas desde el set COMPLETO (misma fuente que el parser para asignar la x),
  // así los headers quedan siempre alineados con los nodos aunque se togglee una columna.
  const allColumns = React.useMemo(() => getColumns(nodes), [nodes]);
  const columns = React.useMemo(
    () =>
      allColumns.filter((c) => {
        if (c.key === 'ingreso') return false;
        if (c.key === 'otros') return showOtros;
        if (c.key === 'electives') return showElectives;
        return true;
      }),
    [allColumns, showOtros, showElectives]
  );

  const autoFitSignature = React.useMemo(
    () => `${fitRevision}:${viewportRevision}`,
    [fitRevision, viewportRevision]
  );

  // Auto-fit view: compute zoom and panOffset to show all nodes
  React.useLayoutEffect(() => {
    if (!containerRef.current || coreNodes.length === 0) return;
    if (lastAutoFitSignatureRef.current === autoFitSignature) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coreNodes.forEach(node => {
      const width = node.width ?? LAYOUT.nodeWidth;
      const height = nodeHeight;
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + width);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + height);
    });
    // Incluir la banda de headers de columna (arriba de los nodos) para que no se corte.
    minY = Math.min(minY, 8);
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    // Add padding around content
    const padding = 40;
    const scaleX = containerRect.width / (contentWidth + padding * 2);
    const scaleY = containerRect.height / (contentHeight + padding * 2);
    const naturalFitZoom = Math.min(scaleX, scaleY, 1);
    // A complete five-year plan is much wider than a phone. Fully fitting it
    // makes nodes unreadable, so compact viewports keep a legible scale and
    // deliberately expose panning instead of turning the map into a thumbnail.
    const isCompactViewport = containerRect.width < 1024;
    const fitZoom = isCompactViewport ? Math.max(naturalFitZoom, 0.68) : naturalFitZoom;
    zoomRef.current = fitZoom;
    setZoom(fitZoom);
    // On phones/tablets start from the first year. Centering a wide plan lands
    // users in the middle of the curriculum without context.
    const offsetX = isCompactViewport
      ? 16 - minX * fitZoom
      : -minX * fitZoom + (containerRect.width - contentWidth * fitZoom) / 2;
    const offsetY = -minY * fitZoom + (containerRect.height - contentHeight * fitZoom) / 2;
    const nextPanOffset = { x: offsetX, y: offsetY };
    panOffsetRef.current = nextPanOffset;
    setPanOffset(nextPanOffset);
    lastAutoFitSignatureRef.current = autoFitSignature;
  }, [autoFitSignature, coreNodes, nodeHeight]);

  // Trigger fade-in after initial layout
  React.useEffect(() => {
    // Delay visibility until after auto-fit
    setLoaded(true);
  }, []);
  
  const connections = React.useMemo(() => {
    return getConnections(coreNodes);
  }, [coreNodes]);

  // Calculate reduced connections (same logic as in Connections component)
  const reducedConnections = React.useMemo(() => {
    // First deduplicate multiple relations between the same nodes
    const seen = new Set<string>();
    const uniqueConnections = connections.filter(conn => {
      const key = `${conn.from}-${conn.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Remove transitive edges to only show direct prerequisite relations
    const adjMap = new Map<string, string[]>();
    uniqueConnections.forEach(conn => {
      const { from, to } = conn;
      if (!adjMap.has(from)) adjMap.set(from, []);
      adjMap.get(from)!.push(to);
    });
    
    const result: Connection[] = [];
    uniqueConnections.forEach(conn => {
      const { from, to } = conn;
      // Temporarily remove this direct edge
      const neighbors = adjMap.get(from) || [];
      const filtered = neighbors.filter(n => n !== to);
      adjMap.set(from, filtered);
      
      // DFS to check indirect reachability
      const stack = [...filtered];
      const visited = new Set<string>();
      let found = false;
      while (stack.length && !found) {
        const current = stack.pop()!;
        if (current === to) {
          found = true;
          break;
        }
        if (!visited.has(current)) {
          visited.add(current);
          (adjMap.get(current) || []).forEach(n => {
            if (!visited.has(n)) stack.push(n);
          });
        }
      }
      
      // Restore the direct edge
      adjMap.set(from, neighbors);
      if (!found) {
        result.push(conn);
      }
    });
    return result;
  }, [connections]);

  // Background click clears selection
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!isPanning) {
      onSubjectSelect(null);
    }
  }, [onSubjectSelect, isPanning]);

  // Handle wheel event for zooming (only when no subject is selected)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!selectedSubject) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      applyZoomAt(zoomRef.current + delta, e.clientX, e.clientY);
    }
  }, [applyZoomAt, selectedSubject]);

  // Handle mouse events for panning (only when no subject is selected)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !selectedSubject) { // Left mouse button and no subject selected
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [selectedSubject]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      const nextPanOffset = {
        x: panOffsetRef.current.x + deltaX,
        y: panOffsetRef.current.y + deltaY,
      };
      panOffsetRef.current = nextPanOffset;
      setPanOffset(nextPanOffset);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Pinch zoom and one-finger pan are handled explicitly because touch-none
  // disables the browser's native page zoom inside the map.
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPanning(false);
      const [first, second] = [e.touches[0], e.touches[1]];
      pinchRef.current = {
        distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
        zoom: zoomRef.current,
      };
      return;
    }
    if (!selectedSubject && e.touches.length === 1) {
      setIsPanning(true);
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [selectedSubject]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [first, second] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const centerX = (first.clientX + second.clientX) / 2;
      const centerY = (first.clientY + second.clientY) / 2;
      applyZoomAt(pinchRef.current.zoom * (distance / pinchRef.current.distance), centerX, centerY);
      return;
    }
    if (isPanning && e.touches.length === 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      const nextPanOffset = {
        x: panOffsetRef.current.x + deltaX,
        y: panOffsetRef.current.y + deltaY,
      };
      panOffsetRef.current = nextPanOffset;
      setPanOffset(nextPanOffset);
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [applyZoomAt, isPanning, lastPanPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    setIsPanning(false);
  }, []);

  const changeZoom = useCallback((delta: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    applyZoomAt(zoomRef.current + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [applyZoomAt]);

  // Set up global mouse event listeners
  React.useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // User clicked a node
  const handleSubjectClick = useCallback((subject: SubjectNode) => {
    onSubjectSelect(subject);
  }, [onSubjectSelect]);

  // Double click toggles approved status
  const handleSubjectDoubleClick = useCallback((subject: SubjectNode) => {
    onStatusChange(subject.ID, subject.status === 'APROBADA' ? 'DISPONIBLE' : 'APROBADA');
  }, [onStatusChange]);

  // Determine which nodes to dim: non-selected and non-connected (using reduced connections for direct relations only)
  const connectedIds = React.useMemo(() => {
    const set = new Set<string>();
    if (selectedSubject) {
      set.add(selectedSubject.ID);
      reducedConnections.forEach(conn => {
        if (conn.from === selectedSubject.ID) set.add(conn.to);
        if (conn.to === selectedSubject.ID) set.add(conn.from);
      });
    }
    return set;
  }, [selectedSubject, reducedConnections]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none"
      style={{ backgroundColor: '#21262d', cursor: isPanning ? 'grabbing' : (selectedSubject ? 'default' : 'grab') }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleBackgroundClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          opacity: loaded ? 1 : 0,
          transition: loaded ? 'opacity 0.5s ease' : 'none'
        }}
      >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Column headers — cada año puede contener 1er y 2do cuatrimestre */}
      <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none">
        {columns.map((col) => {
          const x = startX + col.index * columnWidth;
          const style =
            col.key === 'ingreso'
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : col.key === 'electives'
              ? 'border-cyan-500 text-cyan-400'
              : col.key === 'otros'
              ? 'border-purple-500 text-purple-300'
              : 'border-gray-600 text-white';
          const bg = col.key === 'ingreso' ? undefined : '#21262d';
          const isYear = col.key.startsWith('y');
          return (
            <div key={col.key} className="absolute" style={{ left: x }}>
              <div
                className={`rounded-lg shadow-md border p-3 ${NODE_HEIGHT_CLASS} flex flex-col items-center justify-center ${style}`}
                style={{ ...(bg ? { backgroundColor: bg } : {}), width: isYear ? LAYOUT.annualNodeWidth : LAYOUT.nodeWidth }}
              >
                <div className="font-semibold text-center">{col.label}</div>
                {isYear && <div className="mt-1 text-xs font-normal opacity-70">1er cuatri · 2do cuatri</div>}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Connections */}
      <Connections nodes={coreNodes} connections={reducedConnections} selectedSubject={selectedSubject} />
      
      {/* Subject nodes */}
      {coreNodes.map(subject => {
        const isDimmed = selectedSubject ? !connectedIds.has(subject.ID) : false;
        const isSelected = selectedSubject?.ID === subject.ID;
        return (
          <SubjectNodeComponent
            key={subject.ID}
            subject={subject}
            onDrag={onDrag}
            onClick={handleSubjectClick}
            onDoubleClick={handleSubjectDoubleClick}
            zoom={zoom}
            panOffset={panOffset}
            isDimmed={isDimmed}
            isSelected={isSelected}
          />
        );
      })}
      
      </div>
      
      {/* Zoom Indicator */}
      <div className="fixed bottom-[calc(20vh+1rem)] right-4 z-50 flex items-center overflow-hidden rounded-lg border border-gray-600 bg-gray-800 text-white lg:bottom-24">
        <button
          type="button"
          aria-label="Alejar mapa"
          onClick={() => changeZoom(-0.15)}
          className="p-2 hover:bg-gray-700"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="border-x border-gray-600 px-2 py-2 text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          aria-label="Acercar mapa"
          onClick={() => changeZoom(0.15)}
          className="p-2 hover:bg-gray-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* Legend - Fixed position */}
      <Legend showLegend={showLegend} />
    </div>
  );
}
