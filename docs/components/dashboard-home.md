# Dashboard Home Component

> Main dashboard component with real-time metrics, AI insights, and quick actions

## Component Overview

The DashboardHome component serves as the central hub for sales teams, providing:
- Real-time metrics and KPIs
- AI-generated insights and recommendations
- Quick action buttons for common tasks
- Live notifications from AI agents
- Pipeline health overview

## Implementation

### Core Component

```typescript
// src/pages/Dashboard/DashboardHome.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  Email,
  Phone,
  Analytics,
  AutoAwesome,
  Notifications,
  Settings
} from '@mui/icons-material';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { useDashboardData } from '../../hooks/useDashboardData';
import { AIInsightCard } from '../../components/ai-assistant/AIInsightCard';
import { QuickActionButton } from '../../components/common/QuickActionButton';
import { MetricCard } from '../../components/common/MetricCard';
import { LiveNotificationPanel } from '../../components/common/LiveNotificationPanel';

interface DashboardHomeProps {
  user: User;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ user }) => {
  const [isCoachingActive, setIsCoachingActive] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Custom hooks for data and agent communication
  const { 
    dailyInsights, 
    topLeads, 
    pipelineHealth, 
    todayMetrics,
    loading 
  } = useDashboardData(user.id);
  
  const { 
    sendToAgent, 
    subscribeToEvents, 
    agentStatus 
  } = useAgentCommunication();

  useEffect(() => {
    // Subscribe to real-time agent events
    const unsubscribe = subscribeToEvents([
      'lead.scored',
      'lead.high_value_detected',
      'email.response_received',
      'coaching.suggestion_generated'
    ], handleAgentEvent);

    return unsubscribe;
  }, []);

  const handleAgentEvent = (event: AgentEvent) => {
    switch (event.type) {
      case 'lead.scored':
        if (event.data.score >= 80) {
          addNotification({
            type: 'high_value_lead',
            message: `High-value lead detected: ${event.data.leadName}`,
            priority: 'high',
            actions: [{ label: 'View Lead', action: () => navigateToLead(event.data.leadId) }]
          });
        }
        break;
      
      case 'coaching.suggestion_generated':
        addNotification({
          type: 'coaching_tip',
          message: event.data.suggestion,
          priority: 'medium',
          actions: [{ label: 'Apply Tip', action: () => applyCoachingSuggestion(event.data) }]
        });
        break;
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
  };

  const startAICoaching = async () => {
    setIsCoachingActive(true);
    try {
      await sendToAgent('conversation-agent', {
        action: 'start_coaching_session',
        userId: user.id,
        context: 'dashboard_initiated'
      });
    } catch (error) {
      console.error('Failed to start AI coaching:', error);
      setIsCoachingActive(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Good {getTimeOfDay()}, {user.firstName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your sales pipeline today
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <Tooltip title="Agent Status">
            <Chip
              icon={<Psychology />}
              label={`AI Agents: ${Object.values(agentStatus).filter(Boolean).length}/4 Active`}
              color={Object.values(agentStatus).every(Boolean) ? "success" : "warning"}
              variant="outlined"
            />
          </Tooltip>
          
          <Button
            variant={isCoachingActive ? "outlined" : "contained"}
            startIcon={<AutoAwesome />}
            onClick={startAICoaching}
            disabled={isCoachingActive}
          >
            {isCoachingActive ? 'Coaching Active' : 'Start AI Coaching'}
          </Button>
        </Box>
      </Box>

      {/* Today's Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Today's Calls"
            value={todayMetrics.calls}
            change={todayMetrics.callsChange}
            icon={<Phone />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Emails Sent"
            value={todayMetrics.emails}
            change={todayMetrics.emailsChange}
            icon={<Email />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="New Leads"
            value={todayMetrics.leads}
            change={todayMetrics.leadsChange}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Pipeline Value"
            value={`$${formatNumber(todayMetrics.pipelineValue)}`}
            change={todayMetrics.pipelineChange}
            icon={<Analytics />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* AI Insights Section */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Psychology color="primary" />
                AI Insights & Recommendations
              </Typography>
              
              <Grid container spacing={2}>
                {dailyInsights.map((insight, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <AIInsightCard
                      insight={insight}
                      onAction={(action) => handleInsightAction(insight, action)}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <QuickActionButton
                    icon={<Phone />}
                    label="Start Call"
                    description="Begin coached call"
                    onClick={() => navigateTo('/conversations/new')}
                    color="primary"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <QuickActionButton
                    icon={<Email />}
                    label="Create Sequence"
                    description="New email automation"
                    onClick={() => navigateTo('/sequences/new')}
                    color="secondary"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <QuickActionButton
                    icon={<TrendingUp />}
                    label="Add Lead"
                    description="Import new prospect"
                    onClick={() => navigateTo('/leads/new')}
                    color="success"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <QuickActionButton
                    icon={<Analytics />}
                    label="View Forecast"
                    description="Pipeline analytics"
                    onClick={() => navigateTo('/forecasting')}
                    color="warning"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Live Notifications */}
          <LiveNotificationPanel
            notifications={notifications}
            onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
            onAction={(notification, action) => action.action()}
          />

          {/* Top Leads */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Top Leads
              </Typography>
              
              {topLeads.map((lead, index) => (
                <Box
                  key={lead.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  py={1}
                  px={2}
                  mb={1}
                  sx={{
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => navigateToLead(lead.id)}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={lead.avatar} sx={{ width: 32, height: 32 }}>
                      {lead.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {lead.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lead.company}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Chip
                    label={lead.score}
                    size="small"
                    color={lead.score >= 80 ? "success" : lead.score >= 60 ? "warning" : "default"}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Pipeline Health */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline Health
              </Typography>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Qualification</Typography>
                  <Typography variant="body2">{pipelineHealth.qualification}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pipelineHealth.qualification}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Proposal</Typography>
                  <Typography variant="body2">{pipelineHealth.proposal}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pipelineHealth.proposal}
                  color="secondary"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Closing</Typography>
                  <Typography variant="body2">{pipelineHealth.closing}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pipelineHealth.closing}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper functions
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
};

export default DashboardHome;
```

### Supporting Types

```typescript
// src/types/dashboard.types.ts
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  permissions: string[];
}

export interface Notification {
  id: string;
  type: 'high_value_lead' | 'coaching_tip' | 'email_response' | 'system_alert';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface DashboardMetrics {
  calls: number;
  callsChange: number;
  emails: number;
  emailsChange: number;
  leads: number;
  leadsChange: number;
  pipelineValue: number;
  pipelineChange: number;
}

export interface TopLead {
  id: string;
  name: string;
  company: string;
  score: number;
  avatar?: string;
}

export interface PipelineHealth {
  qualification: number;
  proposal: number;
  closing: number;
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actions: Array<{
    label: string;
    type: 'primary' | 'secondary';
    action: string;
  }>;
}

export interface AgentEvent {
  type: string;
  agentId: string;
  timestamp: string;
  data: any;
}

export interface AgentStatus {
  'lead-scoring': boolean;
  'conversation': boolean;
  'email': boolean;
  'forecasting': boolean;
}
```

## Usage

```typescript
import { DashboardHome } from './pages/Dashboard/DashboardHome';

// In your main App component
<Route path="/dashboard" element={<DashboardHome user={currentUser} />} />
```

## Features

### Real-time Agent Communication
- WebSocket connection to all 4 Voltagent agents
- Live notifications for high-value leads, coaching tips, and system alerts
- Agent status monitoring and health checks

### Interactive Metrics
- Today's performance metrics with trend indicators
- Pipeline health visualization
- Quick access to detailed analytics

### AI-Powered Insights
- Machine learning-generated recommendations
- Risk assessment and opportunity identification
- Actionable coaching suggestions

### Quick Actions
- One-click access to core features
- Context-aware action recommendations
- Mobile-optimized touch targets

## Performance Considerations

- Lazy loading of heavy components
- Efficient WebSocket event handling
- Optimized re-renders with React.memo
- Local state management for UI interactions

## Testing

```typescript
// src/pages/Dashboard/__tests__/DashboardHome.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardHome } from '../DashboardHome';
import { mockUser, mockDashboardData } from '../../__mocks__';

describe('DashboardHome', () => {
  it('renders dashboard metrics correctly', () => {
    render(<DashboardHome user={mockUser} />);
    
    expect(screen.getByText('Today\'s Calls')).toBeInTheDocument();
    expect(screen.getByText('Emails Sent')).toBeInTheDocument();
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Value')).toBeInTheDocument();
  });

  it('handles AI coaching activation', async () => {
    render(<DashboardHome user={mockUser} />);
    
    const coachingButton = screen.getByText('Start AI Coaching');
    fireEvent.click(coachingButton);
    
    await waitFor(() => {
      expect(screen.getByText('Coaching Active')).toBeInTheDocument();
    });
  });
});
```

This component serves as the central hub for sales teams, providing comprehensive insights and quick access to all major features while maintaining real-time communication with AI agents.