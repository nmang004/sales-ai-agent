# Email Automation Page

> Email sequence management with AI personalization and analytics

## Component Overview

The SequencesDashboard provides:
- Email sequence creation and management
- AI-powered personalization
- A/B testing capabilities
- Performance analytics and tracking
- Template management
- Automated follow-up scheduling

## Implementation

### Main Component

```typescript
// src/pages/Sequences/SequencesDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import {
  Add,
  Email,
  PlayArrow,
  Pause,
  Stop,
  Analytics,
  Psychology,
  Schedule,
  People,
  TrendingUp,
  Edit,
  Delete,
  ContentCopy
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { useEmailSequences } from '../../hooks/useEmailSequences';
import { SequenceCreationModal } from '../../components/sequences/SequenceCreationModal';
import { SequenceAnalytics } from '../../components/sequences/SequenceAnalytics';
import { TemplateLibrary } from '../../components/sequences/TemplateLibrary';
import { ABTestManager } from '../../components/sequences/ABTestManager';

interface EmailSequence {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  steps: EmailStep[];
  enrolledCount: number;
  completedCount: number;
  responseRate: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  abTest?: {
    isActive: boolean;
    variants: string[];
    winningVariant?: string;
  };
}

interface EmailStep {
  id: string;
  order: number;
  templateId: string;
  subject: string;
  delay: number; // in hours
  delayType: 'hours' | 'days' | 'business_days';
  conditions?: {
    ifOpened?: boolean;
    ifClicked?: boolean;
    ifReplied?: boolean;
  };
}

export const SequencesDashboard: React.FC = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);
  const [actionSequenceId, setActionSequenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { sendToAgent, subscribeToEvents } = useAgentCommunication();
  const {
    fetchSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    startSequence,
    pauseSequence,
    stopSequence
  } = useEmailSequences();

  useEffect(() => {
    loadSequences();
    
    // Subscribe to email events
    const unsubscribe = subscribeToEvents([
      'email_sent',
      'email_opened',
      'email_clicked',
      'email_replied',
      'sequence_completed'
    ], handleEmailEvent);
    
    return unsubscribe;
  }, []);

  const loadSequences = async () => {
    try {
      setLoading(true);
      const data = await fetchSequences();
      setSequences(data);
    } catch (error) {
      console.error('Failed to load sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailEvent = (event: any) => {
    // Update sequence metrics in real-time
    setSequences(prev => prev.map(seq => {
      if (seq.id === event.data.sequenceId) {
        return {
          ...seq,
          // Update relevant metrics based on event type
          responseRate: event.type === 'email_replied' 
            ? seq.responseRate + 0.1 
            : seq.responseRate
        };
      }
      return seq;
    }));
  };

  const handleSequenceAction = async (action: string, sequenceId: string) => {
    setActionAnchor(null);
    
    try {
      switch (action) {
        case 'start':
          await startSequence(sequenceId);
          break;
        case 'pause':
          await pauseSequence(sequenceId);
          break;
        case 'stop':
          await stopSequence(sequenceId);
          break;
        case 'duplicate':
          const originalSeq = sequences.find(s => s.id === sequenceId);
          if (originalSeq) {
            await createSequence({
              ...originalSeq,
              name: `${originalSeq.name} (Copy)`,
              status: 'draft'
            });
          }
          break;
        case 'delete':
          if (confirm('Delete this sequence?')) {
            await deleteSequence(sequenceId);
          }
          break;
      }
      await loadSequences();
    } catch (error) {
      console.error(`Failed to ${action} sequence:`, error);
    }
  };

  const personalizeSequence = async (sequenceId: string) => {
    try {
      await sendToAgent('email-agent', {
        type: 'personalize_sequence',
        sequenceId,
        useAI: true
      });
    } catch (error) {
      console.error('Failed to personalize sequence:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayArrow />;
      case 'paused': return <Pause />;
      case 'completed': return <Stop />;
      default: return <Edit />;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Sequence Name',
      width: 250,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.steps.length} steps
          </Typography>
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={getStatusIcon(params.value)}
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'enrolledCount',
      headerName: 'Enrolled',
      width: 100,
      align: 'center'
    },
    {
      field: 'responseRate',
      headerName: 'Response Rate',
      width: 130,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={params.value}
            sx={{ width: 60, height: 6 }}
          />
          <Typography variant="caption">
            {params.value.toFixed(1)}%
          </Typography>
        </Box>
      )
    },
    {
      field: 'abTest',
      headerName: 'A/B Test',
      width: 100,
      renderCell: (params) => (
        params.row.abTest?.isActive ? (
          <Chip label="Testing" color="secondary" size="small" />
        ) : null
      )
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 130,
      renderCell: (params) => (
        <Typography variant="caption">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => personalizeSequence(params.row.id)}
            title="AI Personalize"
          >
            <Psychology />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setSelectedSequence(params.row)}
            title="View Analytics"
          >
            <Analytics />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              setActionAnchor(e.currentTarget);
              setActionSequenceId(params.row.id);
            }}
          >
            <Edit />
          </IconButton>
        </Box>
      )
    }
  ];

  const tabPanels = [
    { label: 'All Sequences', value: 0 },
    { label: 'Active', value: 1 },
    { label: 'Templates', value: 2 },
    { label: 'A/B Tests', value: 3 }
  ];

  const filteredSequences = React.useMemo(() => {
    switch (selectedTab) {
      case 1: return sequences.filter(s => s.status === 'active');
      default: return sequences;
    }
  }, [sequences, selectedTab]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Email Sequences</Typography>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Sequence
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1, bgcolor: 'primary.100', borderRadius: 1 }}>
                  <Email color="primary" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {sequences.filter(s => s.status === 'active').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Sequences
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1, bgcolor: 'success.100', borderRadius: 1 }}>
                  <People color="success" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {sequences.reduce((sum, s) => sum + s.enrolledCount, 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Enrolled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1, bgcolor: 'warning.100', borderRadius: 1 }}>
                  <TrendingUp color="warning" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {(sequences.reduce((sum, s) => sum + s.responseRate, 0) / sequences.length || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Response Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1, bgcolor: 'secondary.100', borderRadius: 1 }}>
                  <Schedule color="secondary" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {sequences.filter(s => s.abTest?.isActive).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    A/B Tests Running
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
            {tabPanels.map((tab) => (
              <Tab key={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {selectedTab === 0 || selectedTab === 1 ? (
            <DataGrid
              rows={filteredSequences}
              columns={columns}
              loading={loading}
              autoHeight
              pageSize={25}
              rowsPerPageOptions={[25, 50, 100]}
              disableSelectionOnClick
              onRowDoubleClick={(params) => setSelectedSequence(params.row)}
            />
          ) : selectedTab === 2 ? (
            <TemplateLibrary />
          ) : (
            <ABTestManager sequences={sequences.filter(s => s.abTest?.isActive)} />
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={() => setActionAnchor(null)}
      >
        <MenuItem onClick={() => handleSequenceAction('start', actionSequenceId!)}>
          <PlayArrow sx={{ mr: 1 }} />
          Start
        </MenuItem>
        <MenuItem onClick={() => handleSequenceAction('pause', actionSequenceId!)}>
          <Pause sx={{ mr: 1 }} />
          Pause
        </MenuItem>
        <MenuItem onClick={() => handleSequenceAction('stop', actionSequenceId!)}>
          <Stop sx={{ mr: 1 }} />
          Stop
        </MenuItem>
        <MenuItem onClick={() => handleSequenceAction('duplicate', actionSequenceId!)}>
          <ContentCopy sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => handleSequenceAction('delete', actionSequenceId!)}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Modals */}
      <SequenceCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (sequenceData) => {
          await createSequence(sequenceData);
          await loadSequences();
          setShowCreateModal(false);
        }}
      />

      {selectedSequence && (
        <Dialog
          open={Boolean(selectedSequence)}
          onClose={() => setSelectedSequence(null)}
          maxWidth="lg"
          fullWidth
        >
          <SequenceAnalytics
            sequence={selectedSequence}
            onClose={() => setSelectedSequence(null)}
          />
        </Dialog>
      )}
    </Box>
  );
};

export default SequencesDashboard;
```

### Template Library Component

```typescript
// src/components/sequences/TemplateLibrary.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  ContentCopy,
  Psychology,
  TrendingUp,
  Email
} from '@mui/icons-material';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'prospecting' | 'follow_up' | 'nurture' | 'closing';
  industry?: string;
  personalization: {
    hasAI: boolean;
    variables: string[];
  };
  performance: {
    openRate: number;
    responseRate: number;
    usageCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);
  const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'prospecting', label: 'Prospecting' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'nurture', label: 'Nurture' },
    { value: 'closing', label: 'Closing' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prospecting': return 'primary';
      case 'follow_up': return 'secondary';
      case 'nurture': return 'success';
      case 'closing': return 'warning';
      default: return 'default';
    }
  };

  const enhanceWithAI = async (templateId: string) => {
    // Call AI agent to enhance template
    console.log('Enhancing template with AI:', templateId);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header & Search */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Template Library</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Template
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ flexGrow: 1 }}
        />
        
        <Box display="flex" gap={1}>
          {categories.map((category) => (
            <Chip
              key={category.value}
              label={category.label}
              onClick={() => setSelectedCategory(category.value)}
              color={selectedCategory === category.value ? 'primary' : 'default'}
              variant={selectedCategory === category.value ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card sx={{ height: '100%', position: 'relative' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Chip
                      label={template.category}
                      color={getCategoryColor(template.category)}
                      size="small"
                    />
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setActionAnchor(e.currentTarget);
                      setActionTemplateId(template.id);
                    }}
                  >
                    <Edit />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  Subject: {template.subject}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    mb: 2
                  }}
                >
                  {template.content}
                </Typography>

                {/* Performance Metrics */}
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Open Rate
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {template.performance.openRate}%
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Response Rate
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {template.performance.responseRate}%
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Used
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {template.performance.usageCount}x
                    </Typography>
                  </Box>
                </Box>

                {/* AI Features */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {template.personalization.hasAI && (
                    <Chip
                      icon={<Psychology />}
                      label="AI Enhanced"
                      color="secondary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  
                  <Button
                    size="small"
                    startIcon={<Psychology />}
                    onClick={() => enhanceWithAI(template.id)}
                  >
                    Enhance
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={() => setActionAnchor(null)}
      >
        <MenuItem onClick={() => console.log('Edit template')}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => console.log('Duplicate template')}>
          <ContentCopy sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => console.log('Delete template')}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};
```

### Sequence Analytics Component

```typescript
// src/components/sequences/SequenceAnalytics.tsx
import React from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  Email,
  OpenInNew,
  Reply,
  Schedule
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SequenceAnalyticsProps {
  sequence: any;
  onClose: () => void;
}

export const SequenceAnalytics: React.FC<SequenceAnalyticsProps> = ({
  sequence,
  onClose
}) => {
  const performanceData = [
    { day: 'Day 1', sent: 100, opened: 25, clicked: 8, replied: 3 },
    { day: 'Day 2', sent: 95, opened: 28, clicked: 12, replied: 5 },
    { day: 'Day 3', sent: 90, opened: 32, clicked: 15, replied: 8 },
    { day: 'Day 4', sent: 85, opened: 30, clicked: 18, replied: 12 },
    { day: 'Day 5', sent: 80, opened: 35, clicked: 22, replied: 15 }
  ];

  const stepMetrics = sequence.steps.map((step: any, index: number) => ({
    step: index + 1,
    subject: step.subject,
    sent: Math.floor(Math.random() * 100) + 50,
    opened: Math.floor(Math.random() * 30) + 20,
    clicked: Math.floor(Math.random() * 15) + 5,
    replied: Math.floor(Math.random() * 10) + 2
  }));

  return (
    <>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">{sequence.name} - Analytics</Typography>
          <Chip
            label={sequence.status}
            color={sequence.status === 'active' ? 'success' : 'default'}
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Overview Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Email color="primary" />
                  <Box>
                    <Typography variant="h6">{sequence.enrolledCount}</Typography>
                    <Typography variant="caption">Enrolled</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <OpenInNew color="info" />
                  <Box>
                    <Typography variant="h6">
                      {Math.floor(sequence.enrolledCount * 0.3)}
                    </Typography>
                    <Typography variant="caption">Opens</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color="success" />
                  <Box>
                    <Typography variant="h6">
                      {Math.floor(sequence.enrolledCount * 0.15)}
                    </Typography>
                    <Typography variant="caption">Clicks</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Reply color="warning" />
                  <Box>
                    <Typography variant="h6">
                      {Math.floor(sequence.enrolledCount * sequence.responseRate / 100)}
                    </Typography>
                    <Typography variant="caption">Replies</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Performance Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="opened" stroke="#8884d8" name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#82ca9d" name="Clicked" />
                <Line type="monotone" dataKey="replied" stroke="#ffc658" name="Replied" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Step-by-Step Performance */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Step Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Step</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell align="center">Sent</TableCell>
                    <TableCell align="center">Opened</TableCell>
                    <TableCell align="center">Clicked</TableCell>
                    <TableCell align="center">Replied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stepMetrics.map((step) => (
                    <TableRow key={step.step}>
                      <TableCell>{step.step}</TableCell>
                      <TableCell>{step.subject}</TableCell>
                      <TableCell align="center">{step.sent}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          {step.opened}
                          <LinearProgress
                            variant="determinate"
                            value={(step.opened / step.sent) * 100}
                            sx={{ width: 40, height: 4 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          {step.clicked}
                          <LinearProgress
                            variant="determinate"
                            value={(step.clicked / step.opened) * 100}
                            sx={{ width: 40, height: 4 }}
                            color="secondary"
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          {step.replied}
                          <LinearProgress
                            variant="determinate"
                            value={(step.replied / step.sent) * 100}
                            sx={{ width: 40, height: 4 }}
                            color="success"
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained">Export Report</Button>
      </DialogActions>
    </>
  );
};
```

## Features

### Email Sequence Management
- Visual sequence builder with drag-and-drop
- Conditional logic based on engagement
- Automated scheduling and timing
- Real-time performance tracking

### AI-Powered Personalization
- Dynamic content generation
- Industry-specific templates
- Behavioral personalization
- A/B testing optimization

### Analytics & Optimization
- Comprehensive performance metrics
- Step-by-step funnel analysis
- Engagement tracking
- ROI measurement

### Template Library
- Categorized template collection
- Performance-based recommendations
- AI enhancement capabilities
- Custom variable support

This email automation system provides sales teams with sophisticated tools to create, manage, and optimize email sequences while leveraging AI for maximum personalization and effectiveness.