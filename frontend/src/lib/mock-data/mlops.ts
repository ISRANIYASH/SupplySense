export const experiments = [
  { id: 'EXP-015', name: 'TFT Multi-Region v4', model: 'TFT', status: 'running', mape: 0, mae: 0, rmse: 0, params: { epochs: 200, lr: 0.001, batchSize: 64 }, startTime: '2h ago', duration: '-', tags: ['production', 'v4'] },
  { id: 'EXP-014', name: 'LSTM Demand Forecaster', model: 'LSTM', status: 'completed', mape: 5.82, mae: 67.4, rmse: 89.2, params: { epochs: 150, lr: 0.002, batchSize: 32 }, startTime: '1d ago', duration: '4.2h', tags: ['staging'] },
  { id: 'EXP-013', name: 'GRU Seasonal', model: 'GRU', status: 'completed', mape: 6.14, mae: 72.1, rmse: 94.8, params: { epochs: 120, lr: 0.001, batchSize: 64 }, startTime: '2d ago', duration: '3.1h', tags: ['experiment'] },
  { id: 'EXP-012', name: 'Ensemble Stacking', model: 'XGBoost', status: 'completed', mape: 5.94, mae: 69.8, rmse: 91.4, params: { epochs: 300, lr: 0.01, batchSize: 128 }, startTime: '3d ago', duration: '2.8h', tags: ['production'] },
  { id: 'EXP-011', name: 'XGBoost Baseline', model: 'XGBoost', status: 'failed', mape: 0, mae: 0, rmse: 0, params: { epochs: 500, lr: 0.01, batchSize: 256 }, startTime: '4d ago', duration: '0.5h', tags: ['failed'] }
];

export const modelRegistry = [
  { id: 'MOD-005', name: 'LSTM Demand Forecaster', version: 'v2.4.1', stage: 'Production', mape: 5.82, createdAt: 'Jun 15, 2025', updatedAt: 'Jun 16, 2025' },
  { id: 'MOD-004', name: 'TFT Multi-Region', version: 'v2.4.0', stage: 'Staging', mape: 5.94, createdAt: 'Jun 12, 2025', updatedAt: 'Jun 13, 2025' },
  { id: 'MOD-003', name: 'GRU Seasonal', version: 'v2.3.8', stage: 'Staging', mape: 6.14, createdAt: 'Jun 8, 2025', updatedAt: 'Jun 9, 2025' },
  { id: 'MOD-002', name: 'Ensemble Stacking', version: 'v2.3.5', stage: 'Archived', mape: 6.48, createdAt: 'Jun 1, 2025', updatedAt: 'Jun 2, 2025' },
  { id: 'MOD-001', name: 'LSTM Baseline', version: 'v2.2.0', stage: 'Archived', mape: 8.34, createdAt: 'May 20, 2025', updatedAt: 'May 21, 2025' }
];

export const dagSteps = [
  { id: 'DAG-1', name: 'Data Ingestion', status: 'success', duration: '45m', lastRun: '2h ago' },
  { id: 'DAG-2', name: 'Feature Engineering', status: 'success', duration: '28m', lastRun: '2h ago' },
  { id: 'DAG-3', name: 'Model Training', status: 'running', duration: '-', lastRun: 'started 2h ago' },
  { id: 'DAG-4', name: 'Evaluation', status: 'pending', duration: '-', lastRun: '-' },
  { id: 'DAG-5', name: 'Staging Deploy', status: 'pending', duration: '-', lastRun: '-' },
  { id: 'DAG-6', name: 'A/B Test', status: 'pending', duration: '-', lastRun: '-' },
  { id: 'DAG-7', name: 'Production Deploy', status: 'pending', duration: '-', lastRun: '-' }
];

export const monitoringData = {
  mapeOverTime: Array.from({length: 30}).map((_, i) => ({ date: `Jun ${i+1}`, value: 6.5 - (i * 0.02) + (Math.random() * 0.3) })),
  driftScore: Array.from({length: 30}).map((_, i) => ({ date: `Jun ${i+1}`, value: 0.1 + (Math.random() * 0.15) + (i === 15 ? 0.2 : 0) }))
};
