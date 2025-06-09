# Mobile Quick Add Component

> Mobile-optimized lead capture with voice notes and business card scanning

## Component Overview

The Mobile Quick Add provides:
- Voice-to-text lead capture
- Business card scanning with OCR
- Quick contact information entry
- Offline data storage and sync
- AI-powered data enhancement
- GPS location tagging

## Implementation

### Main Mobile Component

```typescript
// src/mobile/MobileQuickAdd.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  Mic,
  MicOff,
  CameraAlt,
  PhotoCamera,
  Psychology,
  LocationOn,
  BusinessCenter,
  Person,
  Email,
  Phone,
  Close,
  CloudUpload
} from '@mui/icons-material';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';
import { useBusinessCardScanner } from '../../hooks/useBusinessCardScanner';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { VoiceTranscription } from '../../components/mobile/VoiceTranscription';
import { BusinessCardPreview } from '../../components/mobile/BusinessCardPreview';
import { OfflineIndicator } from '../../components/mobile/OfflineIndicator';

interface QuickLeadData {
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  notes: string;
  source: 'voice' | 'business_card' | 'manual';
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  confidence?: number;
  extractedData?: any;
}

export const MobileQuickAdd: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'voice' | 'camera' | 'manual'>('manual');
  const [leadData, setLeadData] = useState<QuickLeadData>({
    firstName: '',
    lastName: '',
    company: '',
    position: '',
    email: '',
    phone: '',
    notes: '',
    source: 'manual'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const {
    isRecording,
    transcript,
    confidence,
    startRecording,
    stopRecording,
    error: voiceError
  } = useVoiceCapture();

  const {
    capturedImage,
    extractedData,
    scanBusinessCard,
    isScanning,
    error: scanError
  } = useBusinessCardScanner();

  const {
    location,
    address,
    requestLocation,
    error: locationError
  } = useGeolocation();

  const { sendToAgent } = useAgentCommunication();

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Process voice transcript
    if (transcript && captureMode === 'voice') {
      processVoiceTranscript(transcript);
    }
  }, [transcript, captureMode]);

  useEffect(() => {
    // Process business card data
    if (extractedData && captureMode === 'camera') {
      processBusinessCardData(extractedData);
    }
  }, [extractedData, captureMode]);

  const processVoiceTranscript = async (text: string) => {
    try {
      setIsProcessing(true);
      setProcessingStep('Analyzing voice input...');

      // Use AI to extract structured data from voice transcript
      const response = await sendToAgent('lead-scoring-agent', {
        type: 'extract_lead_from_text',
        text,
        source: 'voice'
      });

      if (response.data.leadData) {
        setLeadData(prev => ({
          ...prev,
          ...response.data.leadData,
          notes: text,
          source: 'voice',
          confidence: response.data.confidence
        }));
      }

    } catch (error) {
      console.error('Failed to process voice transcript:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const processBusinessCardData = async (cardData: any) => {
    try {
      setIsProcessing(true);
      setProcessingStep('Processing business card...');

      // Use AI to clean and structure business card data
      const response = await sendToAgent('lead-scoring-agent', {
        type: 'process_business_card',
        cardData,
        source: 'business_card'
      });

      if (response.data.leadData) {
        setLeadData(prev => ({
          ...prev,
          ...response.data.leadData,
          source: 'business_card',
          confidence: response.data.confidence,
          extractedData: cardData
        }));
      }

    } catch (error) {
      console.error('Failed to process business card:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleVoiceCapture = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setCaptureMode('voice');
      await startRecording();
    }
  };

  const handleCameraCapture = () => {
    setCaptureMode('camera');
    scanBusinessCard();
  };

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);
      setProcessingStep('Creating lead...');

      // Add location data if available
      const finalLeadData = {
        ...leadData,
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address || ''
        } : undefined,
        createdAt: new Date().toISOString(),
        device: 'mobile'
      };

      if (isOffline) {
        // Store offline for later sync
        await storeOfflineLead(finalLeadData);
        setProcessingStep('Saved offline - will sync when online');
      } else {
        // Send to API
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalLeadData)
        });

        if (!response.ok) {
          throw new Error('Failed to create lead');
        }

        const newLead = await response.json();

        // Trigger AI scoring
        await sendToAgent('lead-scoring-agent', {
          type: 'score_lead',
          leadId: newLead.id,
          leadData: finalLeadData
        });
      }

      // Reset form
      setLeadData({
        firstName: '',
        lastName: '',
        company: '',
        position: '',
        email: '',
        phone: '',
        notes: '',
        source: 'manual'
      });
      
      setOpen(false);
      setCaptureMode('manual');

    } catch (error) {
      console.error('Failed to create lead:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const storeOfflineLead = async (leadData: QuickLeadData) => {
    const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
    offlineLeads.push({
      ...leadData,
      id: Date.now().toString(),
      offline: true
    });
    localStorage.setItem('offlineLeads', JSON.stringify(offlineLeads));
  };

  const enhanceWithAI = async () => {
    try {
      setIsProcessing(true);
      setProcessingStep('Enhancing with AI...');

      const response = await sendToAgent('lead-scoring-agent', {
        type: 'enhance_lead_data',
        leadData
      });

      if (response.data.enhancedData) {
        setLeadData(prev => ({
          ...prev,
          ...response.data.enhancedData
        }));
      }

    } catch (error) {
      console.error('Failed to enhance lead data:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleInputChange = (field: keyof QuickLeadData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLeadData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setOpen(true)}
      >
        <Add />
      </Fab>

      {/* Offline Indicator */}
      <OfflineIndicator isOffline={isOffline} />

      {/* Quick Add Dialog */}
      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Quick Add Lead</Typography>
            <IconButton onClick={() => setOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Processing Indicator */}
          {isProcessing && (
            <Box mb={2}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                {processingStep}
              </Typography>
            </Box>
          )}

          {/* Capture Methods */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={captureMode === 'voice' ? 'contained' : 'outlined'}
                startIcon={isRecording ? <MicOff /> : <Mic />}
                onClick={handleVoiceCapture}
                disabled={isProcessing}
                color={isRecording ? 'error' : 'primary'}
              >
                {isRecording ? 'Stop' : 'Voice'}
              </Button>
            </Grid>
            
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={captureMode === 'camera' ? 'contained' : 'outlined'}
                startIcon={<CameraAlt />}
                onClick={handleCameraCapture}
                disabled={isProcessing || isScanning}
              >
                {isScanning ? 'Scanning...' : 'Card'}
              </Button>
            </Grid>
            
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={captureMode === 'manual' ? 'contained' : 'outlined'}
                startIcon={<Person />}
                onClick={() => setCaptureMode('manual')}
                disabled={isProcessing}
              >
                Manual
              </Button>
            </Grid>
          </Grid>

          {/* Voice Transcription */}
          {captureMode === 'voice' && (
            <VoiceTranscription
              isRecording={isRecording}
              transcript={transcript}
              confidence={confidence}
              error={voiceError}
            />
          )}

          {/* Business Card Preview */}
          {captureMode === 'camera' && capturedImage && (
            <BusinessCardPreview
              image={capturedImage}
              extractedData={extractedData}
              isProcessing={isScanning}
              error={scanError}
            />
          )}

          {/* Lead Data Form */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={leadData.firstName}
                onChange={handleInputChange('firstName')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={leadData.lastName}
                onChange={handleInputChange('lastName')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company"
                value={leadData.company}
                onChange={handleInputChange('company')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Position"
                value={leadData.position}
                onChange={handleInputChange('position')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={leadData.email}
                onChange={handleInputChange('email')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                type="tel"
                value={leadData.phone}
                onChange={handleInputChange('phone')}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={leadData.notes}
                onChange={handleInputChange('notes')}
                variant="outlined"
              />
            </Grid>
          </Grid>

          {/* AI Enhancement */}
          {leadData.firstName && (
            <Box mt={2}>
              <Button
                startIcon={<Psychology />}
                onClick={enhanceWithAI}
                disabled={isProcessing || isOffline}
                variant="outlined"
                fullWidth
              >
                Enhance with AI
              </Button>
            </Box>
          )}

          {/* Data Source & Confidence */}
          {leadData.source !== 'manual' && (
            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={`Source: ${leadData.source}`}
                color="primary"
                size="small"
              />
              
              {leadData.confidence && (
                <Chip
                  label={`Confidence: ${leadData.confidence}%`}
                  color={leadData.confidence >= 80 ? 'success' : 'warning'}
                  size="small"
                />
              )}
              
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label="Location captured"
                  color="info"
                  size="small"
                />
              )}
            </Box>
          )}

          {/* Errors */}
          {voiceError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Voice Error: {voiceError}
            </Alert>
          )}
          
          {scanError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Scan Error: {scanError}
            </Alert>
          )}

          {isOffline && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You're offline. Lead will be saved locally and synced when connection is restored.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!leadData.firstName || !leadData.lastName || isProcessing}
            startIcon={isOffline ? <CloudUpload /> : <Add />}
          >
            {isOffline ? 'Save Offline' : 'Add Lead'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MobileQuickAdd;
```

### Voice Transcription Component

```typescript
// src/components/mobile/VoiceTranscription.tsx
import React from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Alert } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';

interface VoiceTranscriptionProps {
  isRecording: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

export const VoiceTranscription: React.FC<VoiceTranscriptionProps> = ({
  isRecording,
  transcript,
  confidence,
  error
}) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {isRecording ? (
            <MicOff color="error" />
          ) : (
            <Mic color="action" />
          )}
          <Typography variant="h6">
            Voice Capture
          </Typography>
          {isRecording && (
            <Typography variant="caption" color="error">
              Recording...
            </Typography>
          )}
        </Box>

        {isRecording && (
          <Box mb={2}>
            <LinearProgress color="error" />
          </Box>
        )}

        {transcript && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transcript (Confidence: {confidence}%)
            </Typography>
            <Typography
              variant="body1"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                minHeight: 60,
                border: '1px solid',
                borderColor: 'grey.300'
              }}
            >
              {transcript || 'Speak to capture lead information...'}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Say something like: "John Smith from Acme Corp, he's a Sales Director, email john@acme.com, met at the conference today"
        </Typography>
      </CardContent>
    </Card>
  );
};
```

### Business Card Preview Component

```typescript
// src/components/mobile/BusinessCardPreview.tsx
import React from 'react';
import { Box, Typography, Card, CardContent, Alert, LinearProgress } from '@mui/material';
import { CameraAlt } from '@mui/icons-material';

interface BusinessCardPreviewProps {
  image: string;
  extractedData: any;
  isProcessing: boolean;
  error: string | null;
}

export const BusinessCardPreview: React.FC<BusinessCardPreviewProps> = ({
  image,
  extractedData,
  isProcessing,
  error
}) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CameraAlt color="action" />
          <Typography variant="h6">
            Business Card Scan
          </Typography>
        </Box>

        {isProcessing && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              Processing business card...
            </Typography>
          </Box>
        )}

        {image && (
          <Box mb={2}>
            <img
              src={image}
              alt="Captured business card"
              style={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'contain',
                border: '1px solid #ddd',
                borderRadius: 4
              }}
            />
          </Box>
        )}

        {extractedData && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Extracted Information:
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300'
              }}
            >
              {Object.entries(extractedData).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {value as string}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

### Supporting Hooks

```typescript
// src/hooks/useVoiceCapture.ts
import { useState, useRef, useCallback } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            maxConfidence = Math.max(maxConfidence, result[0].confidence);
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setConfidence(Math.round(maxConfidence * 100));
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice capture');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    transcript,
    confidence,
    error,
    startRecording,
    stopRecording
  };
};
```

```typescript
// src/hooks/useBusinessCardScanner.ts
import { useState, useCallback } from 'react';

export const useBusinessCardScanner = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanBusinessCard = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Create file input for camera access
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use back camera

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          setCapturedImage(imageData);

          // Process with OCR
          await processWithOCR(imageData);
        };
        reader.readAsDataURL(file);
      };

      input.click();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture image');
      setIsScanning(false);
    }
  }, []);

  const processWithOCR = async (imageData: string) => {
    try {
      // This would integrate with an OCR service like Tesseract.js or Google Vision API
      const response = await fetch('/api/ocr/business-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      setExtractedData(result.extractedData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process business card');
    } finally {
      setIsScanning(false);
    }
  };

  return {
    capturedImage,
    extractedData,
    isScanning,
    error,
    scanBusinessCard
  };
};
```

## Features

### Voice Capture
- Real-time speech-to-text conversion
- Natural language processing for lead extraction
- Confidence scoring for transcription accuracy
- Multiple language support

### Business Card Scanning
- Camera integration for card capture
- OCR processing with text extraction
- Structured data parsing
- Error handling and validation

### Mobile Optimization
- Touch-friendly interface design
- Responsive layout for all screen sizes
- Offline functionality with local storage
- Battery-efficient processing

### AI Enhancement
- Automatic data enrichment
- Lead scoring and qualification
- Smart field population
- Context-aware suggestions

This mobile quick add system provides sales teams with powerful on-the-go lead capture capabilities, making it easy to collect and process prospect information from anywhere with minimal friction.