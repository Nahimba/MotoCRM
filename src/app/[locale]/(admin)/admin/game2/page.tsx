"use client";

import React, { useState, useEffect, useCallback } from 'react';

// --- Типы ---
type AtomType = 'H' | 'O' | 'C';

interface Atom {
  id: number;
  type: AtomType;
  x: number;
  y: number;
}

interface Level {
  name: string;
  goal: string;
  startAtoms: Atom[];
  checkWin: (atoms: Atom[]) => boolean;
}

const GRID_SIZE = 8;
const CELL_SIZE = 60;

const ATOM_DATA: Record<AtomType, { color: string; label: string }> = {
  H: { color: '#E0E0E0', label: 'H' },
  O: { color: '#FF5252', label: 'O' },
  C: { color: '#444444', label: 'C' },
};

// --- Уровни ---
const LEVELS: Level[] = [
    {
      name: "Уровень 1: Вода",
      goal: "H-O-H (Г-образная форма)",
      startAtoms: [
        { id: 1, type: 'O', x: 2, y: 2 },
        { id: 2, type: 'H', x: 5, y: 1 },
        { id: 3, type: 'H', x: 2, y: 5 },
      ],
      checkWin: (atoms) => {
        const o = atoms.find(a => a.type === 'O');
        const h1 = atoms.find(a => a.id === 2);
        const h2 = atoms.find(a => a.id === 3);
        
        // Добавляем проверку на существование всех частей
        if (!o || !h1 || !h2) return false;
  
        const match1 = (h1.x === o.x + 1 && h1.y === o.y) && (h2.x === o.x && h2.y === o.y + 1);
        const match2 = (h2.x === o.x + 1 && h2.y === o.y) && (h1.x === o.x && h1.y === o.y + 1);
        return match1 || match2;
      }
    },
    {
      name: "Уровень 2: Угарный газ",
      goal: "C-O (Рядом друг с другом)",
      startAtoms: [
        { id: 4, type: 'C', x: 1, y: 1 }, // Используем уникальные ID для нового уровня
        { id: 5, type: 'O', x: 6, y: 6 },
      ],
      checkWin: (atoms) => {
        const c = atoms.find(a => a.type === 'C');
        const o = atoms.find(a => a.type === 'O');
        
        // Защита от undefined: проверяем c и o перед доступом к .x
        if (!c || !o) return false;
  
        const dist = Math.abs(c.x - o.x) + Math.abs(c.y - o.y);
        return dist === 1;
      }
    }
  ];

export default function MoleculePuzzle() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [atoms, setAtoms] = useState<Atom[]>(LEVELS[0].startAtoms);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isWin, setIsWin] = useState(false);

  const currentLevel = LEVELS[levelIdx];

  // Сброс при смене уровня
  useEffect(() => {
    setAtoms(currentLevel.startAtoms);
    setIsWin(false);
    setSelectedId(null);
  }, [levelIdx, currentLevel]);

  // Проверка победы
  useEffect(() => {
    if (currentLevel.checkWin(atoms)) {
      setIsWin(true);
    }
  }, [atoms, currentLevel]);

  const moveAtom = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (selectedId === null || isWin) return;

    setAtoms(prev => {
      const idx = prev.findIndex(a => a.id === selectedId);
      if (idx === -1) return prev;
      
      const atom = prev[idx];
      let nx = atom.x, ny = atom.y;

      if (direction === 'UP') ny -= 1;
      if (direction === 'DOWN') ny += 1;
      if (direction === 'LEFT') nx -= 1;
      if (direction === 'RIGHT') nx += 1;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return prev;
      if (prev.some(a => a.id !== selectedId && a.x === nx && a.y === ny)) return prev;

      const updated = [...prev];
      updated[idx] = { ...atom, x: nx, y: ny };
      return updated;
    });
  }, [selectedId, isWin]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') moveAtom('UP');
      if (e.key === 'ArrowDown') moveAtom('DOWN');
      if (e.key === 'ArrowLeft') moveAtom('LEFT');
      if (e.key === 'ArrowRight') moveAtom('RIGHT');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveAtom]);

  const nextLevel = () => {
    const nextIdx = (levelIdx + 1) % LEVELS.length;
    setIsWin(false); // Сначала сбрасываем победу
    setSelectedId(null);
    setAtoms(LEVELS[nextIdx].startAtoms); // Обновляем атомы
    setLevelIdx(nextIdx); // Переключаем индекс уровня в конце
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.info}>
        <h1 style={{ margin: '0 0 10px 0' }}>{currentLevel.name}</h1>
        <p style={{ color: '#aaa' }}>Цель: {currentLevel.goal}</p>
        {isWin && (
          <div style={styles.winBanner}>
            <p>Связь установлена! 🎉</p>
            <button onClick={nextLevel} style={styles.nextBtn}>
                Следующий уровень
            </button>
          </div>
        )}
      </div>

      <div style={{ ...styles.grid, width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <div key={i} style={styles.cell} />
        ))}

        {atoms.map(atom => {
          // Коннекторы рисуем только если есть сосед
          const hasRight = atoms.find(a => a.x === atom.x + 1 && a.y === atom.y);
          const hasBottom = atoms.find(a => a.x === atom.x && a.y === atom.y + 1);

          return (
            <React.Fragment key={atom.id}>
              {hasRight && (
                <div style={{
                  ...styles.connector,
                  width: CELL_SIZE, height: '6px',
                  left: atom.x * CELL_SIZE + CELL_SIZE / 2,
                  top: atom.y * CELL_SIZE + CELL_SIZE / 2 - 3,
                }} />
              )}
              {hasBottom && (
                <div style={{
                  ...styles.connector,
                  width: '6px', height: CELL_SIZE,
                  left: atom.x * CELL_SIZE + CELL_SIZE / 2 - 3,
                  top: atom.y * CELL_SIZE + CELL_SIZE / 2,
                }} />
              )}
              <div
                onClick={() => setSelectedId(atom.id)}
                style={{
                  ...styles.atom,
                  backgroundColor: ATOM_DATA[atom.type].color,
                  left: atom.x * CELL_SIZE + 5,
                  top: atom.y * CELL_SIZE + 5,
                  outline: selectedId === atom.id ? '4px solid #00E5FF' : 'none',
                  boxShadow: isWin ? `0 0 20px ${ATOM_DATA[atom.type].color}` : 'none',
                  zIndex: 10
                }}
              >
                <span style={{ color: atom.type === 'H' ? '#000' : '#fff' }}>{atom.type}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', backgroundColor: '#0F1114', color: '#fff', fontFamily: 'monospace'
  },
  info: { textAlign: 'center', marginBottom: '30px', height: '120px' },
  winBanner: { marginTop: '10px', color: '#00FF88' },
  nextBtn: {
    padding: '8px 16px', backgroundColor: '#00FF88', border: 'none', borderRadius: '4px',
    cursor: 'pointer', fontWeight: 'bold', color: '#000', marginTop: '5px'
  },
  grid: { position: 'relative', backgroundColor: '#1A1D23', border: '2px solid #333' },
  cell: { border: '1px solid rgba(255,255,255,0.02)' },
  atom: {
    position: 'absolute', width: '50px', height: '50px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
    cursor: 'pointer', transition: 'all 0.1s ease-out'
  },
  connector: { position: 'absolute', backgroundColor: '#444', zIndex: 5, pointerEvents: 'none' }
};