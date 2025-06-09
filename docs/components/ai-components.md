# AI Components

> Reusable AI insight cards and interaction components

## Component Overview

The AI Components provide:
- AI insight display cards
- Real-time agent status indicators
- Interactive AI coaching panels
- Smart suggestion components
- AI-powered data visualization
- Claude integration UI elements

## Implementation

### AI Insight Card

```typescript
// src/components/ai/AIInsightCard.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Alert,
  LinearProgress,
  Button,
  Tooltip
} from '@mui/material';
import {
  Psychology,
  ExpandMore,
  ExpandLess,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Warning,
  CheckCircle,
  Refresh,
  ThumbUp,
  ThumbDown
} from '@mui/icons-material';

interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'opportunity' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data?: any;
  recommendations?: string[];
  timestamp: Date;
  agentSource: string;
}

interface AIInsightCardProps {
  insight: AIInsight;
  onAccept?: (insight: AIInsight) => void;
  onDismiss?: (insight: AIInsight) => void;
  onRefresh?: (insight: AIInsight) => void;
  expandable?: boolean;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  onAccept,
  onDismiss,
  onRefresh,
  expandable = true
}) => {
  const [expanded, setExpanded] = useState(false);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb color="primary" />;
      case 'warning': return <Warning color="warning" />;
      case 'opportunity': return <TrendingUp color="success" />;
      case 'prediction': return <Psychology color="info" />;
      default: return <Psychology color="primary" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'suggestion': return 'primary';
      case 'warning': return 'warning';
      case 'opportunity': return 'success';
      case 'prediction': return 'info';
      default: return 'primary';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: '1px solid',
        borderColor: `${getInsightColor(insight.type)}.light`,
        '&:hover': {
          boxShadow: 2
        }
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {getInsightIcon(insight.type)}
            <Box>
              <Typography variant="h6" component="div" gutterBottom>
                {insight.title}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  label={insight.type}
                  color={getInsightColor(insight.type)}
                  size="small"
                />
                <Chip
                  label={`${insight.impact} impact`}
                  color={getImpactColor(insight.impact)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${insight.confidence}% confidence`}
                  color={getConfidenceColor(insight.confidence)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {onRefresh && (
              <Tooltip title="Refresh Insight">
                <IconButton size="small" onClick={() => onRefresh(insight)}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            
            {expandable && insight.recommendations && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" mb={2}>
          {insight.description}
        </Typography>

        {/* Confidence Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption">AI Confidence</Typography>
            <Typography variant="caption">{insight.confidence}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={insight.confidence}
            color={getConfidenceColor(insight.confidence)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Expandable Recommendations */}
        {expandable && insight.recommendations && (
          <Collapse in={expanded}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                AI Recommendations:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {insight.recommendations.map((rec, index) => (
                  <li key={index}>
                    <Typography variant="body2">{rec}</Typography>
                  </li>
                ))}
              </ul>
            </Alert>
          </Collapse>
        )}

        {/* Action Buttons */}
        {insight.actionable && (onAccept || onDismiss) && (
          <Box display="flex" gap={1} justifyContent="flex-end">
            {onDismiss && (
              <Button
                size="small"
                startIcon={<ThumbDown />}
                onClick={() => onDismiss(insight)}
              >
                Dismiss
              </Button>
            )}
            {onAccept && (
              <Button
                variant="contained"
                size="small"
                startIcon={<ThumbUp />}
                onClick={() => onAccept(insight)}
                color={getInsightColor(insight.type)}
              >
                Apply
              </Button>
            )}
          </Box>
        )}

        {/* Footer */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={1} sx={{ borderTop: '1px solid', borderTopColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            From {insight.agentSource}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {insight.timestamp.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### Agent Status Panel

```typescript
// src/components/ai/AgentStatusPanel.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Circle,
  Psychology,
  Phone,
  Email,
  Analytics,
  Refresh,
  Settings
} from '@mui/icons-material';

interface AgentStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  isActive: boolean;
  queueSize: number;
  processingRate: number;
  lastUpdate: Date;
  metrics: {
    processed: number;
    success: number;
    errors: number;
  };
}

interface AgentStatusPanelProps {
  agents: AgentStatus[];
  onRefresh?: () => void;
  onConfigureAgent?: (agentId: string) => void;
}

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  agents,
  onRefresh,
  onConfigureAgent
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'busy': return 'warning';
      case 'error': return 'error';
      default: return 'grey';
    }
  };

  const getAgentIcon = (agentId: string) => {
    if (agentId.includes('lead-scoring')) return <Psychology />;
    if (agentId.includes('conversation')) return <Phone />;
    if (agentId.includes('email')) return <Email />;
    if (agentId.includes('forecasting')) return <Analytics />;
    return <Psychology />;
  };

  const calculateSuccessRate = (metrics: AgentStatus['metrics']) => {
    const total = metrics.processed;
    return total > 0 ? Math.round((metrics.success / total) * 100) : 0;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">AI Agent Status</Typography>
          {onRefresh && (
            <IconButton size="small" onClick={onRefresh}>
              <Refresh />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={2}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={3} key={agent.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  {/* Agent Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getAgentIcon(agent.id)}
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {agent.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Circle 
                            sx={{ 
                              fontSize: 8, 
                              color: `${getStatusColor(agent.status)}.main` 
                            }} 
                          />
                          <Typography variant="caption" color="text.secondary">
                            {agent.status}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {onConfigureAgent && (
                      <IconButton 
                        size="small" 
                        onClick={() => onConfigureAgent(agent.id)}
                      >
                        <Settings fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  {/* Status Chip */}
                  <Chip
                    label={agent.isActive ? 'Active' : 'Idle'}
                    color={agent.isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  {/* Queue Info */}
                  {agent.queueSize > 0 && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary">
                        Queue: {agent.queueSize} items
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((agent.queueSize / 100) * 100, 100)}
                        color="warning"
                        sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                      />
                    </Box>
                  )}

                  {/* Performance Metrics */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Success Rate
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {calculateSuccessRate(agent.metrics)}%
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption">
                        Processed: {agent.metrics.processed}
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        Errors: {agent.metrics.errors}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Last Update */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Updated: {agent.lastUpdate.toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
```

### Smart Suggestion Component

```typescript
// src/components/ai/SmartSuggestion.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Collapse,
  IconButton,
  Alert
} from '@mui/material';
import {
  Lightbulb,
  ExpandMore,
  ExpandLess,
  Auto,
  ManualMode
} from '@mui/icons-material';

interface Suggestion {
  id: string;
  text: string;
  confidence: number;
  reasoning: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    action: () => void;
  }>;
  autoApplicable?: boolean;
}

interface SmartSuggestionProps {
  suggestion: Suggestion;
  onApply?: (suggestion: Suggestion) => void;
  onDismiss?: (suggestion: Suggestion) => void;
  compact?: boolean;
}

export const SmartSuggestion: React.FC<SmartSuggestionProps> = ({
  suggestion,
  onApply,
  onDismiss,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Alert
      severity="info"
      sx={{
        mb: 1,
        '& .MuiAlert-message': { width: '100%' }
      }}
    >
      <Box display="flex" alignItems="start" justifyContent="space-between" width="100%">
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Lightbulb color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="medium">
              AI Suggestion
            </Typography>
            <Chip
              label={`${suggestion.confidence}% confidence`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {suggestion.autoApplicable && (
              <Chip
                icon={<Auto />}
                label="Auto-applicable"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          <Typography variant="body2" mb={2}>
            {suggestion.text}
          </Typography>

          {!compact && (
            <>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="caption" color="text.secondary">
                  Reasoning
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={expanded}>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  {suggestion.reasoning}
                </Typography>
              </Collapse>
            </>
          )}

          <Box display="flex" gap={1} flexWrap="wrap">
            {suggestion.actions?.map((action, index) => (
              <Button
                key={index}
                variant={action.type === 'primary' ? 'contained' : 'outlined'}
                size="small"
                onClick={action.action}
              >
                {action.label}
              </Button>
            ))}
            
            {onApply && (
              <Button
                variant="contained"
                size="small"
                startIcon={suggestion.autoApplicable ? <Auto /> : <ManualMode />}
                onClick={() => onApply(suggestion)}
              >
                Apply
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="text"
                size="small"
                onClick={() => onDismiss(suggestion)}
              >
                Dismiss
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Alert>
  );
};
```

### AI Coaching Panel

```typescript
// src/components/ai/AICoachingPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Button,
  IconButton,
  Divider
} from '@mui/material';
import {
  Psychology,
  VolumeUp,
  VolumeOff,
  Pause,
  PlayArrow,
  Stop,
  Settings
} from '@mui/icons-material';
import { SmartSuggestion } from './SmartSuggestion';

interface CoachingInsight {
  type: 'positive' | 'improvement' | 'warning';
  message: string;
  timestamp: Date;
  confidence: number;
}

interface AICoachingPanelProps {
  isActive: boolean;
  insights: CoachingInsight[];
  currentSuggestion?: any;
  onToggleActive: () => void;
  onToggleAudio: () => void;
  audioEnabled: boolean;
}

export const AICoachingPanel: React.FC<AICoachingPanelProps> = ({
  isActive,
  insights,
  currentSuggestion,
  onToggleActive,
  onToggleAudio,
  audioEnabled
}) => {
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'success';
      case 'improvement': return 'info';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Psychology color="primary" />
            <Typography variant="h6">AI Call Coach</Typography>
            <Chip
              label={isActive ? 'Active' : 'Inactive'}
              color={isActive ? 'success' : 'default'}
              size="small"
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              {formatTime(sessionTime)}
            </Typography>
            
            <IconButton
              size="small"
              onClick={onToggleAudio}
              color={audioEnabled ? 'primary' : 'default'}
            >
              {audioEnabled ? <VolumeUp /> : <VolumeOff />}
            </IconButton>

            <Button
              variant={isActive ? "contained" : "outlined"}
              size="small"
              startIcon={isActive ? <Stop /> : <PlayArrow />}
              onClick={onToggleActive}
              color={isActive ? "error" : "primary"}
            >
              {isActive ? 'Stop' : 'Start'}
            </Button>
          </Box>
        </Box>

        {/* Status */}
        {isActive && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Listening for conversation cues...
            </Typography>
            <LinearProgress 
              variant="indeterminate" 
              sx={{ height: 2, borderRadius: 1 }}
            />
          </Box>
        )}

        {/* Current Suggestion */}
        {currentSuggestion && (
          <Box mb={2}>
            <SmartSuggestion
              suggestion={currentSuggestion}
              compact={true}
            />
          </Box>
        )}

        {/* Recent Insights */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Recent Insights
          </Typography>
          
          {insights.length === 0 ? (
            <Alert severity="info">
              No insights yet. Start a call to see AI coaching suggestions.
            </Alert>
          ) : (
            <Box maxHeight={200} sx={{ overflowY: 'auto' }}>
              {insights.slice(0, 5).map((insight, index) => (
                <Box key={index}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" py={1}>
                    <Box flexGrow={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Chip
                          label={insight.type}
                          color={getInsightColor(insight.type)}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {insight.confidence}% confidence
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {insight.message}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {insight.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                  {index < insights.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

## Features

### AI Insight Cards
- Confidence scoring with visual indicators
- Expandable recommendations
- Action buttons for accepting/dismissing
- Multiple insight types (suggestions, warnings, opportunities)

### Agent Status Monitoring
- Real-time status indicators
- Performance metrics display
- Queue monitoring
- Success rate calculations

### Smart Suggestions
- Contextual AI recommendations
- Auto-applicable suggestions
- Confidence scoring
- Reasoning explanation

### Coaching Interface
- Live session monitoring
- Real-time insights display
- Audio feedback controls
- Session timing and metrics

These AI components provide a comprehensive interface for interacting with the Voltagent AI agents, displaying insights, and enabling users to act on AI recommendations effectively.