export const indiaStates = [
  { id: 'MH', name: 'Maharashtra', rainfallMM: 120, riskLevel: 'high', forecastIcon: 'rain', impactScore: 8.5 },
  { id: 'GJ', name: 'Gujarat', rainfallMM: 45, riskLevel: 'low', forecastIcon: 'clear', impactScore: 2.1 },
  { id: 'RJ', name: 'Rajasthan', rainfallMM: 15, riskLevel: 'low', forecastIcon: 'clear', impactScore: 1.5 },
  { id: 'MP', name: 'Madhya Pradesh', rainfallMM: 85, riskLevel: 'medium', forecastIcon: 'rain', impactScore: 5.4 },
  { id: 'UP', name: 'Uttar Pradesh', rainfallMM: 65, riskLevel: 'medium', forecastIcon: 'rain', impactScore: 4.8 },
  { id: 'DL', name: 'Delhi', rainfallMM: 30, riskLevel: 'low', forecastIcon: 'clear', impactScore: 2.5 },
  { id: 'PB', name: 'Punjab', rainfallMM: 20, riskLevel: 'low', forecastIcon: 'clear', impactScore: 1.8 },
  { id: 'KA', name: 'Karnataka', rainfallMM: 95, riskLevel: 'medium', forecastIcon: 'rain', impactScore: 6.2 },
  { id: 'TN', name: 'Tamil Nadu', rainfallMM: 110, riskLevel: 'high', forecastIcon: 'rain', impactScore: 7.8 },
  { id: 'AP', name: 'Andhra Pradesh', rainfallMM: 105, riskLevel: 'high', forecastIcon: 'rain', impactScore: 7.5 },
  { id: 'TG', name: 'Telangana', rainfallMM: 90, riskLevel: 'medium', forecastIcon: 'rain', impactScore: 5.9 },
  { id: 'OD', name: 'Odisha', rainfallMM: 165, riskLevel: 'extreme', forecastIcon: 'cyclone', impactScore: 9.8 },
  { id: 'WB', name: 'West Bengal', rainfallMM: 135, riskLevel: 'high', forecastIcon: 'rain', impactScore: 8.2 },
  { id: 'BR', name: 'Bihar', rainfallMM: 75, riskLevel: 'medium', forecastIcon: 'rain', impactScore: 4.9 },
  { id: 'KL', name: 'Kerala', rainfallMM: 145, riskLevel: 'high', forecastIcon: 'rain', impactScore: 8.8 }
];

export const weatherForecast = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date(2025, 5, 20 + i);
  return {
    date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    region: ['Maharashtra', 'Gujarat', 'Odisha', 'Delhi', 'Karnataka'][Math.floor(Math.random() * 5)],
    condition: ['rain', 'clear', 'cyclone', 'cloudy'][Math.floor(Math.random() * 4)],
    rainfall: Math.floor(Math.random() * 150),
    impact: Math.random() > 0.8 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
  };
});

export const weatherImpactCards = [
  { region: 'Odisha', impact: 'Cyclone Alert', recommendation: 'Activate contingency plan. 3 supplier locations affected.', affectedMaterials: ['Steel', 'Coal'] },
  { region: 'Maharashtra', impact: 'Heavy Monsoon', recommendation: 'Delay cement deliveries 5-7 days. Pre-stock 20%.', affectedMaterials: ['Cement', 'Sand'] },
  { region: 'Gujarat', impact: 'Clear', recommendation: 'Optimal procurement window Jun 25-Jul 5.', affectedMaterials: ['All'] },
  { region: 'Rajasthan', impact: 'Extreme Heat', recommendation: 'Diesel fuel quality risk. Store in cooled facility.', affectedMaterials: ['Diesel'] },
  { region: 'Kerala', impact: 'Heavy Rains', recommendation: 'Port operations slowed. Expect 3-day delays.', affectedMaterials: ['Imported Electronics'] }
];

export const weatherDemandCorrelation = Array.from({ length: 50 }).map(() => ({
  rainfall: Math.floor(Math.random() * 200),
  demand: 2500 - (Math.random() * 1000) - (Math.random() * 500),
  region: ['Maharashtra', 'Odisha', 'Gujarat'][Math.floor(Math.random() * 3)]
}));
