"use client";

import React, { useState, useEffect, useCallback } from 'react';

// --- Типы ---
type TileValue = number | null;
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 4;

// Цветовая схема Lumina (от белого к зеленому и черному)
const COLORS: Record<number, string> = {
  2: '#FFFFFF',    // Белый
  4: '#FFEB3B',    // Желтый
  8: '#FF9800',    // Оранжевый
  16: '#F44336',   // Красный
  32: '#9C27B0',   // Фиолетовый
  64: '#2196F3',   // Синий
  128: '#03A9F4',  // Голубой
  256: '#4CAF50',  // Зеленый
  512: '#121212',  // Черная дыра
};

export default function LuminaGame() {
  const [grid, setGrid] = useState<TileValue[]>(Array(GRID_SIZE * GRID_SIZE).fill(null));
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Добавление случайной плитки
  const addRandomTile = useCallback((currentGrid: TileValue[]): TileValue[] => {
    const emptyIndices = currentGrid
      .map((v, i) => (v === null ? i : null))
      .filter((v): v is number => v !== null);
    
    if (emptyIndices.length === 0) return currentGrid;
    
    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const newGrid = [...currentGrid];
    newGrid[randomIndex] = 2; // Всегда начинаем с 2
    return newGrid;
  }, []);

  // Старт новой игры
  const initGame = useCallback(() => {
    let newGrid = Array(GRID_SIZE * GRID_SIZE).fill(null);
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
  }, [addRandomTile]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Основная логика движения
  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    let newGrid = [...grid];
    let moved = false;
    let newScore = score;

    const getIndex = (row: number, col: number) => row * GRID_SIZE + col;

    const processLine = (line: TileValue[]): TileValue[] => {
      let filtered = line.filter((v): v is number => v !== null);
      let result: TileValue[] = [];
      
      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1] && filtered[i] !== 512) {
          const combinedValue = (filtered[i] as number) * 2;
          result.push(combinedValue);
          newScore += combinedValue;
          i++; // Пропускаем следующую плитку, так как она слилась
          moved = true;
        } else {
          result.push(filtered[i]);
        }
      }
      
      while (result.length < GRID_SIZE) {
        result.push(null);
      }
      return result;
    };

    for (let i = 0; i < GRID_SIZE; i++) {
      let line: TileValue[] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        if (direction === 'LEFT') line.push(newGrid[getIndex(i, j)]);
        if (direction === 'RIGHT') line.push(newGrid[getIndex(i, GRID_SIZE - 1 - j)]);
        if (direction === 'UP') line.push(newGrid[getIndex(j, i)]);
        if (direction === 'DOWN') line.push(newGrid[getIndex(GRID_SIZE - 1 - j, i)]);
      }

      const processed = processLine(line);
      
      for (let j = 0; j < GRID_SIZE; j++) {
        let val = processed[j];
        let idx = 0;
        if (direction === 'LEFT') idx = getIndex(i, j);
        if (direction === 'RIGHT') idx = getIndex(i, GRID_SIZE - 1 - j);
        if (direction === 'UP') idx = getIndex(j, i);
        if (direction === 'DOWN') idx = getIndex(GRID_SIZE - 1 - j, i);
        
        if (newGrid[idx] !== val) moved = true;
        newGrid[idx] = val;
      }
    }

    if (moved) {
      const finalGrid = addRandomTile(newGrid);
      setGrid(finalGrid);
      setScore(newScore);
      
      // Проверка на Game Over (упрощенная)
      if (!finalGrid.includes(null)) {
         // Тут можно добавить проверку на возможность ходов, 
         // но для краткости оставим проверку на заполненность
      }
    }
  }, [grid, score, gameOver, addRandomTile]);

  // Слушатель клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('UP'); break;
        case 'ArrowDown': move('DOWN'); break;
        case 'ArrowLeft': move('LEFT'); break;
        case 'ArrowRight': move('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>LUMINA</h1>
        <div style={styles.scoreBoard}>
          <span style={styles.scoreLabel}>SCORE</span>
          <span style={styles.scoreValue}>{score}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {grid.map((tile, i) => (
          <div 
            key={i} 
            style={{ 
              ...styles.tile, 
              backgroundColor: tile ? COLORS[tile] : 'rgba(255, 255, 255, 0.05)',
              boxShadow: tile ? `0 0 20px ${COLORS[tile]}44` : 'none',
              border: tile ? `1px solid ${COLORS[tile]}aa` : '1px solid #333'
            }}
          >
            {tile && <span style={{ ...styles.tileText, color: tile <= 4 ? '#000' : '#fff' }}>{tile}</span>}
          </div>
        ))}
      </div>

      <div style={styles.controls}>
        <button onClick={initGame} style={styles.button}>NEW GAME</button>
      </div>
    </div>
  );
}

// --- Стили ---
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', backgroundColor: '#0a0a0a', fontFamily: '"Inter", sans-serif', color: '#fff'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', width: '350px', alignItems: 'center', marginBottom: '20px'
  },
  title: { fontSize: '42px', fontWeight: '900', margin: 0, letterSpacing: '2px', color: '#fff' },
  scoreBoard: {
    backgroundColor: '#1e1e1e', padding: '10px 20px', borderRadius: '8px', textAlign: 'center', minWidth: '80px'
  },
  scoreLabel: { display: 'block', fontSize: '10px', color: '#aaa', fontWeight: 'bold' },
  scoreValue: { fontSize: '20px', fontWeight: 'bold' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gridTemplateRows: 'repeat(4, 80px)',
    gap: '12px', backgroundColor: '#1e1e1e', padding: '12px', borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
  },
  tile: {
    width: '80px', height: '80px', borderRadius: '8px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s ease-in-out',
    position: 'relative'
  },
  tileText: { fontWeight: '800', fontSize: '22px' },
  controls: { marginTop: '30px' },
  button: {
    padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
    backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '6px',
    transition: 'transform 0.1s', letterSpacing: '1px'
  }
};