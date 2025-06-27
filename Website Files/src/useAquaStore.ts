

import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'https://aquafix-backend.onrender.com/api';

// Default values for water parameters
const DEFAULT_WATER_PARAMS = {
  pH: 7.0,
  ammonia: 0,
  turbidity: 0,
  temperature: 20,
  dissolvedOxygen: 7
};

export interface WaterParams {
  pH: number;
  ammonia: number;
  turbidity: number;
  temperature: number;
  dissolvedOxygen?: number;
}

interface Alert {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'normal';
  timestamp: Date;
  resolved: boolean;
}

interface AquaState {
  waterParams: WaterParams;
  alerts: Alert[];
  pumpStatus: boolean;
  aeratorStatus: boolean;
  isLoading: boolean;
  error: string | null;
  fetchSensorData: () => Promise<void>;
  checkAlerts: (data: WaterParams) => void;
  addAlert: (message: string, severity: 'critical' | 'warning' | 'normal') => void;
  resolveAlert: (id: string) => void;
  togglePump: () => Promise<void>;
  toggleAerator: () => Promise<void>;
  clearError: () => void;
}

export const useAquaStore = create<AquaState>((set, get) => ({
  waterParams: DEFAULT_WATER_PARAMS,
  alerts: [],
  pumpStatus: false,
  aeratorStatus: true,
  isLoading: false,
  error: null,

  // Fetch latest sensor data with proper error handling
  fetchSensorData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/sensor-data`, {
        timeout: 5000 // 5 second timeout
      });

      if (response.data) {
        const validatedData = {
          ...DEFAULT_WATER_PARAMS,
          ...response.data,
          pH: parseFloat(response.data.pH?.toString()) || DEFAULT_WATER_PARAMS.pH,
          ammonia: parseFloat(response.data.ammonia?.toString()) || DEFAULT_WATER_PARAMS.ammonia,
          turbidity: parseFloat(response.data.turbidity?.toString()) || DEFAULT_WATER_PARAMS.turbidity,
          temperature: parseFloat(response.data.temperature?.toString()) || DEFAULT_WATER_PARAMS.temperature
        };

        set({ 
          waterParams: validatedData,
          isLoading: false 
        });
        get().checkAlerts(validatedData);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      set({ 
        error: 'Failed to fetch sensor data',
        isLoading: false,
        waterParams: DEFAULT_WATER_PARAMS // Fallback to defaults
      });
    }
  },

  // Check for alerts based on sensor data
  checkAlerts: (data) => {
    const { addAlert } = get();
    
    if (data.ammonia > 1.5) {
      addAlert(`Ammonia level critical (${data.ammonia.toFixed(2)} ppm)`, 'critical');
    }
    if (data.temperature > 18) {
      addAlert(`Water temperature high (${data.temperature.toFixed(1)}°C)`, 'warning');
    }
    if (data.pH < 6.0) {
      addAlert(`pH level too low (${data.pH.toFixed(2)})`, 'warning');
    }
    if (data.pH > 8.5) {
      addAlert(`pH level too high (${data.pH.toFixed(2)})`, 'warning');
    }
  },

  // Add new alert with deduplication
  addAlert: (message, severity) => {
    set((state) => {
      // Check if identical alert already exists and isn't resolved
      const existingAlert = state.alerts.find(
        alert => alert.message === message && 
                alert.severity === severity && 
                !alert.resolved
      );
      
      if (existingAlert) {
        return state; // Don't add duplicate alert
      }

      return {
        alerts: [
          ...state.alerts,
          {
            id: Math.random().toString(36).substring(2, 9),
            message,
            severity,
            timestamp: new Date(),
            resolved: false
          }
        ].slice(-20) // Keep last 20 alerts
      };
    });
  },

  // Mark alert as resolved
  resolveAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map(alert => 
        alert.id === id ? { ...alert, resolved: true } : alert
      )
    }));
  },

  // Toggle pump status with error handling
  togglePump: async () => {
    const newStatus = !get().pumpStatus;
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/device/pump`, 
        { status: newStatus },
        { timeout: 3000 }
      );
      set({ pumpStatus: newStatus, isLoading: false });
    } catch (error) {
      console.error('Error toggling pump:', error);
      set({ 
        error: 'Failed to control pump',
        isLoading: false 
      });
    }
  },

  // Toggle aerator status with error handling
  toggleAerator: async () => {
    const newStatus = !get().aeratorStatus;
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/device/aerator`, 
        { status: newStatus },
        { timeout: 3000 }
      );
      set({ aeratorStatus: newStatus, isLoading: false });
    } catch (error) {
      console.error('Error toggling aerator:', error);
      set({ 
        error: 'Failed to control aerator',
        isLoading: false 
      });
    }
  },

  // Clear error state
  clearError: () => set({ error: null })
}));