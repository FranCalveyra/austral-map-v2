"use client";

import React from 'react';
import { SubjectNode, Connection } from '@/types/curriculum';

// Numeric node size for centering arrows
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

interface ConnectionsProps {
  nodes: SubjectNode[];
  connections: Connection[];
  selectedSubject: SubjectNode | null;
}

export function Connections({ nodes, connections, selectedSubject }: ConnectionsProps) {


  // Deduplicate multiple relations between the same nodes
  const uniqueConnections = React.useMemo(() => {
    const seen = new Set<string>();
    return connections.filter(conn => {
      const key = `${conn.from}-${conn.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [connections]);

  // Remove transitive edges to only show direct prerequisite relations (transitive reduction)
  const reducedConnections = React.useMemo(() => {
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
  }, [uniqueConnections]);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.ID === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + NODE_WIDTH / 2,
      y: node.y + NODE_HEIGHT / 2
    };
  };

  // Use a smooth cubic Bezier curve for all connections with ~30° initial angle
  const createCurvedPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const curvature = 0.3;
    const xOffset = dx * curvature;
    // 30° in radians => tan(30°) ~0.577
    const angleFactor = Math.tan(Math.PI / 6);
    const yOffset = xOffset * angleFactor;
    const cx1 = from.x + xOffset;
    const cy1 = from.y + yOffset;
    const cx2 = to.x - xOffset;
    const cy2 = to.y - yOffset;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${to.x} ${to.y}`;
  };

  const getConnectionColor = (fromStatus: string) => {
    let color;
    switch (fromStatus) {
      case 'APROBADA':
        color = '#16a34a'; // green
        break;
      case 'CURSANDO':
        color = '#3b82f6'; // blue
        break;
      case 'EN_FINAL':
        color = '#eab308'; // yellow
        break;
      case 'DESAPROBADA':
        color = '#dc2626'; // red
        break;
      default:
        color = '#6b7280'; // gray
        break;
    }
    
    return color;
  };

  // Determine SVG bounding box to include all nodes
  const nodeWidth = 200;
  const nodeHeight = 100;
  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x)) + nodeWidth : 0;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y)) + nodeHeight : 0;
  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: 1 }}
      width={maxX}
      height={maxY}
    >
      {/* Define arrow markers for different colors */}
      <defs>
        <marker
          id="arrow-green"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0,0 0,6 6,3" fill="#16a34a" />
        </marker>
        <marker
          id="arrow-blue"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0,0 0,6 6,3" fill="#3b82f6" />
        </marker>
        <marker
          id="arrow-yellow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0,0 0,6 6,3" fill="#eab308" />
        </marker>
        <marker
          id="arrow-red"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0,0 0,6 6,3" fill="#dc2626" />
        </marker>
        <marker
          id="arrow-gray"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0,0 0,6 6,3" fill="#6b7280" />
        </marker>
      </defs>

      {reducedConnections.map((connection, index) => {
        const fromPos = getNodePosition(connection.from);
        const toPos = getNodePosition(connection.to);
        
        const strokeColor = getConnectionColor(connection.fromStatus);
        const strokeWidth = ['APROBADA', 'CURSANDO', 'EN_FINAL'].includes(connection.fromStatus) ? 2.5 : 1.5;
        
        // Determine marker ID based on color
        let markerId = 'arrow-gray';
        if (strokeColor === '#16a34a') markerId = 'arrow-green';
        else if (strokeColor === '#3b82f6') markerId = 'arrow-blue';
        else if (strokeColor === '#eab308') markerId = 'arrow-yellow';
        else if (strokeColor === '#dc2626') markerId = 'arrow-red';
        
        return (
          <g key={`${connection.from}-${connection.to}-${index}`}>
            {/* Connection line */}
            <path
              d={createCurvedPath(fromPos, toPos)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray="none"
              opacity={(!selectedSubject || connection.from === selectedSubject.ID || connection.to === selectedSubject.ID) ? 0.8 : 0.1}
              markerEnd={`url(#${markerId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}