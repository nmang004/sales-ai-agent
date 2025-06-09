# Conversation Intelligence Page

> Real-time call coaching with AI-powered transcription and sentiment analysis

## Component Overview

The LiveCoaching component provides:
- Real-time audio capture and transcription
- AI-powered coaching suggestions
- Sentiment analysis and conversation flow
- Call recording and playback
- Performance analytics
- Integration with Conversation Agent

## Implementation

### Main Component

```typescript
// src/pages/Conversations/LiveCoaching.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Grid,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Mic,
  MicOff,
  Phone,
  PhoneDisabled,
  Psychology,
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Pause,
  VolumeUp,
  Settings
} from '@mui/icons-material';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { useAudioCapture } from '../../hooks/useAudioCapture';
import { CoachingSuggestionCard } from '../../components/coaching/CoachingSuggestionCard';
import { TranscriptionDisplay } from '../../components/coaching/TranscriptionDisplay';
import { SentimentMeter } from '../../components/coaching/SentimentMeter';
import { CallMetrics } from '../../components/coaching/CallMetrics';

interface CallSession {
  id: string;
  leadId?: string;
  leadName?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  transcript: TranscriptSegment[];
  coachingSuggestions: CoachingSuggestion[];
  metrics: CallMetrics;
  recording?: string;
}

interface TranscriptSegment {
  id: string;
  speaker: 'agent' | 'prospect';
  text: string;
  timestamp: string;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface CoachingSuggestion {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'question';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  applied?: boolean;
}

export const LiveCoaching: React.FC = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [coachingSuggestions, setCoachingSuggestions] = useState<CoachingSuggestion[]>([]);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [callMetrics, setCallMetrics] = useState({
    talkRatio: 50,
    interruptionCount: 0,
    paceScore: 75,
    energyLevel: 60,
    keywordMatches: []
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [autoCoaching, setAutoCoaching] = useState(true);

  const { sendToAgent, subscribeToEvents } = useAgentCommunication();
  const {
    startCapture,
    stopCapture,
    isCapturing,
    audioLevel,
    error: audioError
  } = useAudioCapture();

  const transcriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to coaching events
    const unsubscribe = subscribeToEvents([
      'transcription_update',
      'coaching_suggestion',
      'sentiment_update',
      'call_metrics_update'
    ], handleCoachingEvent);

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-scroll transcript
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleCoachingEvent = (event: any) => {
    switch (event.type) {
      case 'transcription_update':
        setTranscript(prev => [...prev, event.data.segment]);
        break;
      
      case 'coaching_suggestion':
        if (autoCoaching) {
          setCoachingSuggestions(prev => [event.data, ...prev.slice(0, 4)]);
        }
        break;
      
      case 'sentiment_update':
        setSentiment(event.data.sentiment);
        break;
      
      case 'call_metrics_update':
        setCallMetrics(event.data.metrics);
        break;
    }
  };

  const startCall = async () => {
    try {
      setIsCallActive(true);
      setIsRecording(true);
      
      // Start audio capture
      await startCapture();
      
      // Initialize coaching session
      const sessionData = {
        leadId: selectedLead?.id,
        leadName: selectedLead?.name,
        startTime: new Date().toISOString(),
        autoCoaching
      };

      const response = await sendToAgent('conversation-agent', {
        type: 'start_coaching_session',
        sessionData
      });

      setCurrentSession({
        id: response.data.sessionId,
        ...sessionData,
        transcript: [],
        coachingSuggestions: [],
        metrics: callMetrics
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      setIsCallActive(false);
      setIsRecording(false);
    }
  };

  const endCall = async () => {
    try {
      if (currentSession) {
        await sendToAgent('conversation-agent', {
          type: 'end_coaching_session',
          sessionId: currentSession.id
        });
      }

      stopCapture();
      setIsCallActive(false);
      setIsRecording(false);
      setTranscript([]);
      setCoachingSuggestions([]);
      setCurrentSession(null);
      
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopCapture();
      setIsRecording(false);
    } else {
      await startCapture();
      setIsRecording(true);
    }
  };

  const applySuggestion = async (suggestion: CoachingSuggestion) => {
    try {
      await sendToAgent('conversation-agent', {
        type: 'apply_suggestion',
        sessionId: currentSession?.id,
        suggestionId: suggestion.id
      });

      setCoachingSuggestions(prev =>
        prev.map(s => s.id === suggestion.id ? { ...s, applied: true } : s)
      );
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Live Coaching</Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoCoaching}
                onChange={(e) => setAutoCoaching(e.target.checked)}
              />
            }
            label="Auto Coaching"
          />
          
          <Button
            variant={isCallActive ? "outlined" : "contained"}
            color={isCallActive ? "error" : "primary"}
            startIcon={isCallActive ? <PhoneDisabled /> : <Phone />}
            onClick={isCallActive ? endCall : startCall}
            size="large"
          >
            {isCallActive ? 'End Call' : 'Start Call'}
          </Button>
        </Box>
      </Box>

      {audioError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Audio Error: {audioError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Coaching Panel */}
        <Grid item xs={12} lg={4}>
          {/* Call Status */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Call Status</Typography>
                <Chip
                  label={isCallActive ? 'Active' : 'Inactive'}
                  color={isCallActive ? 'success' : 'default'}
                />
              </Box>
              
              {isCallActive && (
                <>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <IconButton
                      color={isRecording ? "error" : "default"}
                      onClick={toggleRecording}
                    >
                      {isRecording ? <MicOff /> : <Mic />}
                    </IconButton>
                    
                    <Box flex={1}>
                      <LinearProgress
                        variant="determinate"
                        value={audioLevel}
                        color={isRecording ? "primary" : "secondary"}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Duration: {currentSession ? formatDuration(new Date().getTime() - new Date(currentSession.startTime).getTime()) : '00:00'}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversation Sentiment
              </Typography>
              <SentimentMeter sentiment={sentiment} />
            </CardContent>
          </Card>

          {/* Call Metrics */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Call Metrics
              </Typography>
              <CallMetrics metrics={callMetrics} />
            </CardContent>
          </Card>

          {/* Coaching Suggestions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Psychology color="primary" />
                Coaching Suggestions
              </Typography>
              
              {coachingSuggestions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {isCallActive ? 'Listening for coaching opportunities...' : 'Start a call to see suggestions'}
                </Typography>
              ) : (
                <List>
                  {coachingSuggestions.map((suggestion) => (
                    <ListItem key={suggestion.id} sx={{ px: 0 }}>
                      <CoachingSuggestionCard
                        suggestion={suggestion}
                        onApply={() => applySuggestion(suggestion)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Transcription */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '70vh' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Live Transcription</Typography>
                
                {selectedLead && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar src={selectedLead.avatar} sx={{ width: 32, height: 32 }}>
                      {selectedLead.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2">
                      {selectedLead.name} - {selectedLead.company}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box
                ref={transcriptionRef}
                flex={1}
                sx={{
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'background.default'
                }}
              >
                {transcript.length === 0 ? (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    color="text.secondary"
                  >
                    <Typography>
                      {isCallActive ? 'Waiting for speech...' : 'Start a call to see transcription'}
                    </Typography>
                  </Box>
                ) : (
                  <TranscriptionDisplay transcript={transcript} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper functions
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default LiveCoaching;
```

### Supporting Components

```typescript
// src/components/coaching/TranscriptionDisplay.tsx
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Person, RecordVoiceOver } from '@mui/icons-material';

interface TranscriptSegment {
  id: string;
  speaker: 'agent' | 'prospect';
  text: string;
  timestamp: string;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface TranscriptionDisplayProps {
  transcript: TranscriptSegment[];
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcript }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {transcript.map((segment, index) => (
        <Box key={segment.id} sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {segment.speaker === 'agent' ? (
              <RecordVoiceOver color="primary" fontSize="small" />
            ) : (
              <Person color="secondary" fontSize="small" />
            )}
            
            <Typography variant="caption" fontWeight="medium">
              {segment.speaker === 'agent' ? 'You' : 'Prospect'}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              {new Date(segment.timestamp).toLocaleTimeString()}
            </Typography>
            
            <Chip
              label={segment.sentiment}
              size="small"
              color={getSentimentColor(segment.sentiment)}
              variant="outlined"
              sx={{ ml: 'auto' }}
            />
          </Box>
          
          <Typography
            variant="body2"
            sx={{
              p: 1.5,
              bgcolor: segment.speaker === 'agent' ? 'primary.50' : 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {segment.text}
          </Typography>
          
          {segment.confidence < 0.8 && (
            <Typography variant="caption" color="warning.main">
              Low confidence transcription
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};
```

```typescript
// src/components/coaching/CoachingSuggestionCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Button, Chip, Box } from '@mui/material';
import { Psychology, CheckCircle, Warning, TipsAndUpdates, Help } from '@mui/icons-material';

interface CoachingSuggestion {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'question';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  applied?: boolean;
}

interface CoachingSuggestionCardProps {
  suggestion: CoachingSuggestion;
  onApply: () => void;
}

export const CoachingSuggestionCard: React.FC<CoachingSuggestionCardProps> = ({
  suggestion,
  onApply
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'tip': return <TipsAndUpdates color="info" />;
      case 'question': return <Help color="primary" />;
      default: return <Psychology />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card
      sx={{
        width: '100%',
        opacity: suggestion.applied ? 0.7 : 1,
        border: suggestion.priority === 'high' ? '2px solid' : '1px solid',
        borderColor: suggestion.priority === 'high' ? 'error.main' : 'divider'
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="start" gap={1} mb={1}>
          {getTypeIcon(suggestion.type)}
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight="medium">
              {suggestion.title}
            </Typography>
            <Chip
              label={suggestion.priority}
              size="small"
              color={getPriorityColor(suggestion.priority)}
              sx={{ ml: 1 }}
            />
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={2}>
          {suggestion.description}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {new Date(suggestion.timestamp).toLocaleTimeString()}
          </Typography>
          
          {suggestion.applied ? (
            <Chip
              icon={<CheckCircle />}
              label="Applied"
              size="small"
              color="success"
              variant="outlined"
            />
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={onApply}
            >
              Apply
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

## Features

### Real-time Transcription
- Live audio capture and processing
- Speaker identification (agent vs prospect)
- Confidence scoring for transcription accuracy
- Sentiment analysis per segment

### AI Coaching
- Real-time coaching suggestions
- Prioritized recommendations
- Applied suggestion tracking
- Context-aware tips

### Call Analytics
- Talk ratio monitoring
- Interruption tracking
- Pace and energy analysis
- Keyword matching

### Session Management
- Call recording capabilities
- Session persistence
- Lead integration
- Performance metrics

This comprehensive conversation intelligence system provides sales teams with real-time AI coaching to improve their call performance and close more deals.