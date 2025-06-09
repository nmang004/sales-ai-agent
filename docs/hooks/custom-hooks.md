# Custom React Hooks

> Reusable hooks for data management, agent communication, and UI state

## Data Management Hooks

### useDashboardData Hook

```typescript
// src/hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import { useAgentCommunication } from './useAgentCommunication';

interface DashboardData {
  dailyInsights: AIInsight[];
  topLeads: TopLead[];
  pipelineHealth: PipelineHealth;
  todayMetrics: DashboardMetrics;
}

export const useDashboardData = (userId: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { sendToAgent } = useAgentCommunication();

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple agents in parallel
      const [insights, leads, pipeline, metrics] = await Promise.all([
        sendToAgent('lead-scoring-agent', {
          type: 'get_daily_insights',
          userId
        }),
        sendToAgent('lead-scoring-agent', {
          type: 'get_top_leads',
          userId,
          limit: 5
        }),
        sendToAgent('forecasting-agent', {
          type: 'get_pipeline_health',
          userId
        }),
        fetchTodayMetrics(userId)
      ]);

      setData({
        dailyInsights: insights.data.insights,
        topLeads: leads.data.leads,
        pipelineHealth: pipeline.data.health,
        todayMetrics: metrics
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayMetrics = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // This would typically call your API
    return {
      calls: Math.floor(Math.random() * 50) + 10,
      callsChange: Math.floor(Math.random() * 20) - 10,
      emails: Math.floor(Math.random() * 100) + 20,
      emailsChange: Math.floor(Math.random() * 30) - 15,
      leads: Math.floor(Math.random() * 20) + 5,
      leadsChange: Math.floor(Math.random() * 40) - 20,
      pipelineValue: Math.floor(Math.random() * 100000) + 50000,
      pipelineChange: Math.floor(Math.random() * 25) - 12
    };
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    ...data,
    loading,
    error,
    refreshData
  };
};
```

### useLeadsData Hook

```typescript
// src/hooks/useLeadsData.ts
import { useState, useCallback } from 'react';
import { useAgentCommunication } from './useAgentCommunication';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  score: number;
  status: string;
  // ... other lead properties
}

export const useLeadsData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendToAgent } = useAgentCommunication();

  const fetchLeads = useCallback(async (filters?: any): Promise<Lead[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await sendToAgent('lead-scoring-agent', {
        type: 'get_leads',
        filters
      });

      return response.data.leads;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
      return [];
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const createLead = useCallback(async (leadData: Partial<Lead>): Promise<Lead> => {
    try {
      setLoading(true);
      setError(null);

      // Create lead via API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        throw new Error('Failed to create lead');
      }

      const newLead = await response.json();

      // Trigger AI scoring
      await sendToAgent('lead-scoring-agent', {
        type: 'score_lead',
        leadId: newLead.id,
        leadData: newLead
      });

      return newLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>): Promise<Lead> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      const updatedLead = await response.json();

      // Re-score if significant changes
      if (updates.company || updates.position || updates.email) {
        await sendToAgent('lead-scoring-agent', {
          type: 'score_lead',
          leadId: updatedLead.id,
          leadData: updatedLead
        });
      }

      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const deleteLead = useCallback(async (leadId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkUpdateLeads = useCallback(async (leadIds: string[], updates: Partial<Lead>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all(
        leadIds.map(id => updateLead(id, updates))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update leads');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateLead]);

  return {
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    bulkUpdateLeads,
    loading,
    error
  };
};
```

### useEmailSequences Hook

```typescript
// src/hooks/useEmailSequences.ts
import { useState, useCallback } from 'react';
import { useAgentCommunication } from './useAgentCommunication';

interface EmailSequence {
  id: string;
  name: string;
  status: string;
  steps: any[];
  // ... other sequence properties
}

export const useEmailSequences = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendToAgent } = useAgentCommunication();

  const fetchSequences = useCallback(async (): Promise<EmailSequence[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sequences');
      if (!response.ok) {
        throw new Error('Failed to fetch sequences');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sequences');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createSequence = useCallback(async (sequenceData: Partial<EmailSequence>): Promise<EmailSequence> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sequenceData)
      });

      if (!response.ok) {
        throw new Error('Failed to create sequence');
      }

      const newSequence = await response.json();

      // Enhance with AI if requested
      if (sequenceData.useAI) {
        await sendToAgent('email-agent', {
          type: 'enhance_sequence',
          sequenceId: newSequence.id
        });
      }

      return newSequence;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const startSequence = useCallback(async (sequenceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await sendToAgent('email-agent', {
        type: 'start_sequence',
        sequenceId
      });

      // Update sequence status
      await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sequence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const pauseSequence = useCallback(async (sequenceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await sendToAgent('email-agent', {
        type: 'pause_sequence',
        sequenceId
      });

      await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause sequence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const stopSequence = useCallback(async (sequenceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await sendToAgent('email-agent', {
        type: 'stop_sequence',
        sequenceId
      });

      await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'stopped' })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop sequence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const deleteSequence = useCallback(async (sequenceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete sequence');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sequence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchSequences,
    createSequence,
    startSequence,
    pauseSequence,
    stopSequence,
    deleteSequence,
    loading,
    error
  };
};
```

## Audio & Media Hooks

### useAudioCapture Hook

```typescript
// src/hooks/useAudioCapture.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioCaptureState {
  isCapturing: boolean;
  audioLevel: number;
  error: string | null;
}

export const useAudioCapture = () => {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    audioLevel: 0,
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average amplitude
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = (average / 255) * 100;

    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Handle audio data - send to transcription service
          handleAudioData(event.data);
        }
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      setState(prev => ({ ...prev, isCapturing: true }));
      
      // Start audio level monitoring
      updateAudioLevel();

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start audio capture'
      }));
    }
  }, [updateAudioLevel]);

  const stopCapture = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isCapturing: false,
      audioLevel: 0
    }));
  }, []);

  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    try {
      // Convert to base64 and send to transcription service
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        // Send to conversation agent for transcription
        window.dispatchEvent(new CustomEvent('audioData', { 
          detail: { audioData: base64Audio } 
        }));
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Failed to process audio data:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing: state.isCapturing,
    audioLevel: state.audioLevel,
    error: state.error,
    startCapture,
    stopCapture
  };
};
```

## UI State Hooks

### useLocalStorage Hook

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
};
```

### useDebounce Hook

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

### usePagination Hook

```typescript
// src/hooks/usePagination.ts
import { useState, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

export const usePagination = ({ 
  totalItems, 
  itemsPerPage, 
  initialPage = 1 
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
      currentPage,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    };
  }, [currentPage, totalItems, itemsPerPage]);

  const goToPage = (page: number) => {
    const boundedPage = Math.max(1, Math.min(page, paginationData.totalPages));
    setCurrentPage(boundedPage);
  };

  const nextPage = () => {
    if (paginationData.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (paginationData.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const reset = () => {
    setCurrentPage(initialPage);
  };

  return {
    ...paginationData,
    goToPage,
    nextPage,
    previousPage,
    reset
  };
};
```

### useForecastingData Hook

```typescript
// src/hooks/useForecastingData.ts
import { useState, useCallback } from 'react';
import { useAgentCommunication } from './useAgentCommunication';

export const useForecastingData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendToAgent } = useAgentCommunication();

  const generateForecast = useCallback(async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await sendToAgent('forecasting-agent', {
        type: 'generate_forecast',
        period,
        includeRisks: true,
        includeOpportunities: true
      });

      return response.data.forecast;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  const fetchHistoricalData = useCallback(async (period: string) => {
    try {
      const response = await fetch(`/api/analytics/historical?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
      return [];
    }
  }, []);

  const fetchPipelineAnalytics = useCallback(async () => {
    try {
      const response = await sendToAgent('forecasting-agent', {
        type: 'analyze_pipeline'
      });
      return response.data.analytics;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline analytics');
      return [];
    }
  }, [sendToAgent]);

  const updateForecastSettings = useCallback(async (settings: any) => {
    try {
      setLoading(true);
      setError(null);

      await sendToAgent('forecasting-agent', {
        type: 'update_settings',
        settings
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sendToAgent]);

  return {
    generateForecast,
    fetchHistoricalData,
    fetchPipelineAnalytics,
    updateForecastSettings,
    loading,
    error
  };
};
```

## Usage Examples

### Dashboard Data Hook
```typescript
const Dashboard = () => {
  const { dailyInsights, topLeads, loading, error, refreshData } = useDashboardData(user.id);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <Alert severity="error">{error}</Alert>;
  
  return (
    <Grid container spacing={3}>
      {/* Render dashboard content */}
    </Grid>
  );
};
```

### Audio Capture Hook
```typescript
const LiveCoaching = () => {
  const { isCapturing, audioLevel, error, startCapture, stopCapture } = useAudioCapture();
  
  return (
    <Box>
      <Button onClick={isCapturing ? stopCapture : startCapture}>
        {isCapturing ? 'Stop Recording' : 'Start Recording'}
      </Button>
      <LinearProgress variant="determinate" value={audioLevel} />
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};
```

These hooks provide a clean, reusable foundation for managing data, state, and side effects throughout the Sales AI Dashboard application.