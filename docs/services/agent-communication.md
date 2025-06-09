# Agent Communication Service

> Voltagent integration service for real-time AI agent communication

## Service Overview

The VoltagentIntegrationService provides:
- WebSocket connections to all AI agents
- Event-driven communication patterns
- Automatic reconnection and error handling
- Real-time data streaming
- Agent status monitoring

## Implementation

### Core Service

```typescript
// src/services/VoltagentIntegrationService.ts
import { EventEmitter } from 'events';

export interface AgentConfig {
  id: string;
  name: string;
  endpoint: string;
  capabilities: string[];
  priority: number;
}

export interface AgentMessage {
  agentId: string;
  type: string;
  data: any;
  timestamp: string;
  correlationId?: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  agentId: string;
  processingTime: number;
}

export class VoltagentIntegrationService extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private isConnected: boolean = false;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private agents: AgentConfig[] = [
    {
      id: 'lead-scoring-agent',
      name: 'Lead Scoring Agent',
      endpoint: 'ws://localhost:8001/ws',
      capabilities: ['score_lead', 'analyze_lead', 'batch_score'],
      priority: 1
    },
    {
      id: 'conversation-agent',
      name: 'Conversation Agent',
      endpoint: 'ws://localhost:8002/ws',
      capabilities: ['live_coaching', 'transcription', 'sentiment_analysis'],
      priority: 2
    },
    {
      id: 'email-agent',
      name: 'Email Agent',
      endpoint: 'ws://localhost:8003/ws',
      capabilities: ['send_sequence', 'personalize_email', 'analyze_response'],
      priority: 3
    },
    {
      id: 'forecasting-agent',
      name: 'Forecasting Agent',
      endpoint: 'ws://localhost:8004/ws',
      capabilities: ['generate_forecast', 'analyze_pipeline', 'predict_deal'],
      priority: 4
    }
  ];

  constructor() {
    super();
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      await Promise.all(
        this.agents.map(agent => this.connectToAgent(agent))
      );
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      console.error('Failed to initialize agent connections:', error);
      this.emit('error', error);
    }
  }

  private async connectToAgent(agent: AgentConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(agent.endpoint);
        let reconnectAttempts = 0;

        ws.onopen = () => {
          console.log(`Connected to ${agent.name}`);
          this.connections.set(agent.id, ws);
          
          // Send queued messages
          const queuedMessages = this.messageQueue.get(agent.id) || [];
          queuedMessages.forEach(message => this.sendMessage(agent.id, message));
          this.messageQueue.set(agent.id, []);
          
          this.emit('agent_connected', agent.id);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleAgentMessage(agent.id, message);
          } catch (error) {
            console.error(`Failed to parse message from ${agent.name}:`, error);
          }
        };

        ws.onclose = (event) => {
          console.log(`Connection to ${agent.name} closed:`, event.code, event.reason);
          this.connections.delete(agent.id);
          this.emit('agent_disconnected', agent.id);
          
          // Attempt reconnection
          if (reconnectAttempts < this.maxReconnectAttempts) {
            const timeout = setTimeout(() => {
              reconnectAttempts++;
              this.connectToAgent(agent);
            }, this.reconnectDelay * Math.pow(2, reconnectAttempts));
            
            this.reconnectTimeouts.set(agent.id, timeout);
          }
        };

        ws.onerror = (error) => {
          console.error(`WebSocket error for ${agent.name}:`, error);
          this.emit('agent_error', { agentId: agent.id, error });
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleAgentMessage(agentId: string, message: any): void {
    const agentMessage: AgentMessage = {
      agentId,
      type: message.type || 'unknown',
      data: message.data || message,
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId
    };

    // Emit specific event types
    this.emit(`agent_message:${agentId}`, agentMessage);
    this.emit(`message_type:${message.type}`, agentMessage);
    this.emit('agent_message', agentMessage);

    // Handle specific message types
    switch (message.type) {
      case 'lead_scored':
        this.emit('lead_scored', { 
          leadId: message.data.leadId, 
          score: message.data.score,
          insights: message.data.insights 
        });
        break;
      
      case 'coaching_suggestion':
        this.emit('coaching_suggestion', {
          suggestion: message.data.suggestion,
          priority: message.data.priority,
          context: message.data.context
        });
        break;
      
      case 'email_response':
        this.emit('email_response', {
          emailId: message.data.emailId,
          leadId: message.data.leadId,
          response: message.data.response,
          sentiment: message.data.sentiment
        });
        break;
      
      case 'forecast_updated':
        this.emit('forecast_updated', {
          forecast: message.data.forecast,
          confidence: message.data.confidence,
          factors: message.data.factors
        });
        break;
    }
  }

  public async sendToAgent(agentId: string, message: any): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const connection = this.connections.get(agentId);
      
      if (!connection || connection.readyState !== WebSocket.OPEN) {
        // Queue message for when connection is restored
        const queuedMessages = this.messageQueue.get(agentId) || [];
        queuedMessages.push({
          agentId,
          type: message.type || 'command',
          data: message,
          timestamp: new Date().toISOString()
        });
        this.messageQueue.set(agentId, queuedMessages);
        
        reject(new Error(`Agent ${agentId} is not connected`));
        return;
      }

      const correlationId = generateCorrelationId();
      const startTime = Date.now();
      
      const agentMessage: AgentMessage = {
        agentId,
        type: message.type || 'command',
        data: message,
        timestamp: new Date().toISOString(),
        correlationId
      };

      // Set up response handler
      const responseHandler = (response: any) => {
        if (response.correlationId === correlationId) {
          this.off(`agent_message:${agentId}`, responseHandler);
          resolve({
            success: response.success !== false,
            data: response.data,
            error: response.error,
            agentId,
            processingTime: Date.now() - startTime
          });
        }
      };

      this.on(`agent_message:${agentId}`, responseHandler);
      
      // Send message
      try {
        connection.send(JSON.stringify(agentMessage));
      } catch (error) {
        this.off(`agent_message:${agentId}`, responseHandler);
        reject(error);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        this.off(`agent_message:${agentId}`, responseHandler);
        reject(new Error(`Timeout waiting for response from ${agentId}`));
      }, 30000);
    });
  }

  public subscribeToEvents(eventTypes: string[], handler: (event: AgentMessage) => void): () => void {
    eventTypes.forEach(eventType => {
      this.on(`message_type:${eventType}`, handler);
    });

    // Return unsubscribe function
    return () => {
      eventTypes.forEach(eventType => {
        this.off(`message_type:${eventType}`, handler);
      });
    };
  }

  public getAgentStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.agents.forEach(agent => {
      const connection = this.connections.get(agent.id);
      status[agent.id] = connection?.readyState === WebSocket.OPEN;
    });
    return status;
  }

  public async scoreLeads(leads: any[]): Promise<any[]> {
    try {
      const response = await this.sendToAgent('lead-scoring-agent', {
        type: 'batch_score',
        leads
      });
      return response.data.scores;
    } catch (error) {
      console.error('Failed to score leads:', error);
      throw error;
    }
  }

  public async startCoachingSession(callData: any): Promise<string> {
    try {
      const response = await this.sendToAgent('conversation-agent', {
        type: 'start_coaching',
        callData
      });
      return response.data.sessionId;
    } catch (error) {
      console.error('Failed to start coaching session:', error);
      throw error;
    }
  }

  public async sendEmail(emailData: any): Promise<string> {
    try {
      const response = await this.sendToAgent('email-agent', {
        type: 'send_email',
        emailData
      });
      return response.data.emailId;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  public async generateForecast(pipelineData: any): Promise<any> {
    try {
      const response = await this.sendToAgent('forecasting-agent', {
        type: 'generate_forecast',
        pipelineData
      });
      return response.data.forecast;
    } catch (error) {
      console.error('Failed to generate forecast:', error);
      throw error;
    }
  }

  public disconnect(): void {
    this.connections.forEach((connection, agentId) => {
      connection.close();
      const timeout = this.reconnectTimeouts.get(agentId);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(agentId);
      }
    });
    
    this.connections.clear();
    this.messageQueue.clear();
    this.isConnected = false;
    this.emit('disconnected');
  }
}

// Utility functions
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Singleton instance
export const voltagentService = new VoltagentIntegrationService();
```

### React Hook Integration

```typescript
// src/hooks/useAgentCommunication.ts
import { useState, useEffect, useCallback } from 'react';
import { voltagentService, AgentMessage, AgentResponse } from '../services/VoltagentIntegrationService';

export const useAgentCommunication = () => {
  const [agentStatus, setAgentStatus] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<AgentMessage | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setAgentStatus(voltagentService.getAgentStatus());
    };

    const handleConnected = () => {
      setIsConnected(true);
      updateStatus();
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      updateStatus();
    };

    const handleAgentConnected = () => {
      updateStatus();
    };

    const handleAgentDisconnected = () => {
      updateStatus();
    };

    const handleMessage = (message: AgentMessage) => {
      setLastMessage(message);
    };

    // Set up event listeners
    voltagentService.on('connected', handleConnected);
    voltagentService.on('disconnected', handleDisconnected);
    voltagentService.on('agent_connected', handleAgentConnected);
    voltagentService.on('agent_disconnected', handleAgentDisconnected);
    voltagentService.on('agent_message', handleMessage);

    // Initial status check
    updateStatus();

    return () => {
      voltagentService.off('connected', handleConnected);
      voltagentService.off('disconnected', handleDisconnected);
      voltagentService.off('agent_connected', handleAgentConnected);
      voltagentService.off('agent_disconnected', handleAgentDisconnected);
      voltagentService.off('agent_message', handleMessage);
    };
  }, []);

  const sendToAgent = useCallback(async (agentId: string, message: any): Promise<AgentResponse> => {
    return voltagentService.sendToAgent(agentId, message);
  }, []);

  const subscribeToEvents = useCallback((eventTypes: string[], handler: (event: AgentMessage) => void) => {
    return voltagentService.subscribeToEvents(eventTypes, handler);
  }, []);

  return {
    agentStatus,
    isConnected,
    lastMessage,
    sendToAgent,
    subscribeToEvents,
    scoreLeads: voltagentService.scoreLeads.bind(voltagentService),
    startCoachingSession: voltagentService.startCoachingSession.bind(voltagentService),
    sendEmail: voltagentService.sendEmail.bind(voltagentService),
    generateForecast: voltagentService.generateForecast.bind(voltagentService)
  };
};
```

### Event Types

```typescript
// src/types/agent.types.ts
export interface LeadScoredEvent {
  leadId: string;
  score: number;
  insights: {
    factors: string[];
    risks: string[];
    opportunities: string[];
  };
}

export interface CoachingSuggestionEvent {
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  context: string;
  actions?: string[];
}

export interface EmailResponseEvent {
  emailId: string;
  leadId: string;
  response: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
}

export interface ForecastUpdatedEvent {
  forecast: {
    totalValue: number;
    closeProbability: number;
    timeframe: string;
  };
  confidence: number;
  factors: string[];
}
```

## Usage Examples

### Basic Agent Communication

```typescript
import { useAgentCommunication } from '../hooks/useAgentCommunication';

const MyComponent = () => {
  const { sendToAgent, agentStatus, subscribeToEvents } = useAgentCommunication();

  useEffect(() => {
    const unsubscribe = subscribeToEvents(['lead_scored'], (event) => {
      console.log('Lead scored:', event.data);
    });

    return unsubscribe;
  }, []);

  const handleScoreLead = async (leadData) => {
    try {
      const response = await sendToAgent('lead-scoring-agent', {
        type: 'score_lead',
        leadData
      });
      console.log('Lead score:', response.data.score);
    } catch (error) {
      console.error('Failed to score lead:', error);
    }
  };
};
```

### Real-time Coaching

```typescript
const CoachingComponent = () => {
  const { startCoachingSession, subscribeToEvents } = useAgentCommunication();

  useEffect(() => {
    const unsubscribe = subscribeToEvents(['coaching_suggestion'], (event) => {
      showCoachingTip(event.data.suggestion);
    });

    return unsubscribe;
  }, []);

  const startCall = async () => {
    const sessionId = await startCoachingSession({
      leadId: 'lead-123',
      callType: 'discovery'
    });
    console.log('Coaching session started:', sessionId);
  };
};
```

## Error Handling

The service includes comprehensive error handling:
- Automatic reconnection with exponential backoff
- Message queuing during disconnections
- Timeout handling for long-running operations
- Event-driven error notifications

## Performance Considerations

- Connection pooling for multiple agents
- Message queuing to prevent data loss
- Efficient event handling with EventEmitter
- Automatic cleanup of event listeners

This service provides robust, real-time communication with all Voltagent AI agents while maintaining reliability and performance.