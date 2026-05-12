"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Типы ---
interface Node { id: number; x: number; y: number; }
interface Edge { a: number; b: number; }

interface Level {
  name: string;
  nodes: Node[];
  edges: Edge[];
}

const WIDTH = 600;
const HEIGHT = 500;
const NODE_RADIUS = 15;

// --- Конфигурация уровней ---
const LEVELS: Level[] = [
  {
    name: "Уровень 1: Простой перекресток",
    nodes: [
      { id: 1, x: 150, y: 150 }, { id: 2, x: 450, y: 150 },
      { id: 3, x: 150, y: 350 }, { id: 4, x: 450, y: 350 },
    ],
    edges: [{ a: 1, b: 4 }, { a: 2, b: 3 }, { a: 1, b: 2 }, { a: 3, b: 4 }]
  },
  {
    name: "Уровень 2: Пятиконечная звезда",
    nodes: [
      { id: 11, x: 300, y: 80 }, { id: 12, x: 480, y: 220 },
      { id: 13, x: 400, y: 420 }, { id: 14, x: 200, y: 420 },
      { id: 15, x: 120, y: 220 },
    ],
    edges: [
      { a: 11, b: 13 }, { a: 11, b: 14 }, { a: 12, b: 14 }, 
      { a: 12, b: 15 }, { a: 13, b: 15 }
    ]
  },
  {
    name: "Уровень 3: Запутанный конверт",
    nodes: [
      { id: 21, x: 200, y: 200 }, { id: 22, x: 400, y: 200 },
      { id: 23, x: 200, y: 400 }, { id: 24, x: 400, y: 400 },
      { id: 25, x: 300, y: 100 },
    ],
    edges: [
      { a: 21, b: 22 }, { a: 22, b: 24 }, { a: 24, b: 23 }, { a: 23, b: 21 },
      { a: 21, b: 24 }, { a: 22, b: 23 }, { a: 21, b: 25 }, { a: 22, b: 25 }
    ]
  },
  {
    name: "Уровень 4: Гексагон",
    nodes: [
      { id: 31, x: 300, y: 120 }, { id: 32, x: 450, y: 200 },
      { id: 33, x: 450, y: 350 }, { id: 34, x: 300, y: 430 },
      { id: 35, x: 150, y: 350 }, { id: 36, x: 150, y: 200 },
    ],
    edges: [
      { a: 31, b: 34 }, { a: 32, b: 35 }, { a: 33, b: 36 },
      { a: 31, b: 32 }, { a: 32, b: 33 }, { a: 33, b: 34 },
      { a: 34, b: 35 }, { a: 35, b: 36 }, { a: 36, b: 31 }
    ]
  },
  {
    name: "Уровень 5: Паутина",
    nodes: [
      { id: 41, x: 300, y: 250 }, { id: 42, x: 300, y: 100 },
      { id: 43, x: 450, y: 350 }, { id: 44, x: 150, y: 350 },
      { id: 45, x: 150, y: 150 }, { id: 46, x: 450, y: 150 },
    ],
    edges: [
      { a: 41, b: 42 }, { a: 41, b: 43 }, { a: 41, b: 44 },
      { a: 42, b: 43 }, { a: 43, b: 44 }, { a: 44, b: 42 },
      { a: 45, b: 46 }, { a: 46, b: 43 }, { a: 45, b: 44 }
    ]
  }
];

export default function TangleGame() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [nodes, setNodes] = useState<Node[]>(LEVELS[0].nodes);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isWin, setIsWin] = useState(false);
  const containerRef = useRef<SVGSVGElement>(null);

  const currentLevel = LEVELS[levelIdx];

  // Математика: проверка пересечения двух отрезков
  const checkIntersection = (p1: Node, p2: Node, p3: Node, p4: Node) => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false;
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  };

  const updateWinStatus = useCallback(() => {
    let hasIntersect = false;
    const edges = currentLevel.edges;

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i];
        const e2 = edges[j];

        // Игнорируем ребра с общим узлом
        if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;

        const n1 = nodes.find(n => n.id === e1.a);
        const n2 = nodes.find(n => n.id === e1.b);
        const n3 = nodes.find(n => n.id === e2.a);
        const n4 = nodes.find(n => n.id === e2.b);

        if (n1 && n2 && n3 && n4 && checkIntersection(n1, n2, n3, n4)) {
          hasIntersect = true;
          break;
        }
      }
      if (hasIntersect) break;
    }
    setIsWin(!hasIntersect);
  }, [nodes, currentLevel]);

  useEffect(() => {
    updateWinStatus();
  }, [updateWinStatus]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(NODE_RADIUS, Math.min(WIDTH - NODE_RADIUS, e.clientX - rect.left));
    const y = Math.max(NODE_RADIUS, Math.min(HEIGHT - NODE_RADIUS, e.clientY - rect.top));
    
    setNodes(prev => prev.map(n => n.id === draggingId ? { ...n, x, y } : n));
  };

  const nextLevel = () => {
    const nextIdx = (levelIdx + 1) % LEVELS.length;
    setLevelIdx(nextIdx);
    setNodes(LEVELS[nextIdx].nodes);
    setIsWin(false);
    setDraggingId(null);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={{ color: '#00FFCC', marginBottom: '5px' }}>{currentLevel.name}</h2>
        <p style={{ color: isWin ? '#FFF' : '#888', margin: 0 }}>
          {isWin ? "✨ УЗЕЛ РАСПУТАН! ✨" : "Устраните пересечения линий"}
        </p>
      </div>

      <svg
        ref={containerRef}
        width={WIDTH}
        height={HEIGHT}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggingId(null)}
        onMouseLeave={() => setDraggingId(null)}
        style={styles.svg}
      >
        {/* Линии */}
        {currentLevel.edges.map((edge, i) => {
          const n1 = nodes.find(n => n.id === edge.a);
          const n2 = nodes.find(n => n.id === edge.b);
          if (!n1 || !n2) return null;

          return (
            <line
              key={`${levelIdx}-e-${i}`}
              x1={n1.x} y1={n1.y}
              x2={n2.x} y2={n2.y}
              stroke={isWin ? "#00FFCC" : "#FF4444"}
              strokeWidth={isWin ? "4" : "2"}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
          );
        })}

        {/* Узлы */}
        {nodes.map(node => (
          <circle
            key={node.id}
            cx={node.x} cy={node.y}
            r={NODE_RADIUS}
            fill={draggingId === node.id ? "#00FFCC" : "#222"}
            stroke="#fff"
            strokeWidth="2"
            onMouseDown={() => setDraggingId(node.id)}
            style={{ cursor: 'grab', transition: 'fill 0.2s' }}
          />
        ))}
      </svg>

      <div style={{ height: '60px', marginTop: '20px' }}>
        {isWin && (
          <button onClick={nextLevel} style={styles.btn}>
            {levelIdx === LEVELS.length - 1 ? "НАЧАТЬ ЗАНОВО" : "СЛЕДУЮЩИЙ УРОВЕНЬ"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'monospace'
  },
  header: { textAlign: 'center', marginBottom: '20px' },
  svg: {
    backgroundColor: '#111', borderRadius: '12px', border: '1px solid #333',
    touchAction: 'none', boxShadow: '0 0 50px rgba(0, 255, 204, 0.1)'
  },
  btn: {
    padding: '12px 24px', backgroundColor: '#00FFCC', color: '#000',
    border: 'none', borderRadius: '4px', fontWeight: 'bold',
    cursor: 'pointer', fontSize: '14px', letterSpacing: '1px'
  }
};