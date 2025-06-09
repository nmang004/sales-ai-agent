# Leads Management Page

> Comprehensive lead management with AI scoring, filtering, and bulk operations

## Component Overview

The LeadsDashboard provides:
- Real-time lead scoring and insights
- Advanced filtering and search
- Bulk operations for lead management
- AI-powered lead analysis
- Import/export functionality
- Lead creation and editing

## Implementation

### Main Component

```typescript
// src/pages/Leads/LeadsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  LinearProgress,
  Alert,
  Dialog,
  Grid,
  Fab
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  MoreVert,
  Add,
  Download,
  Upload,
  Psychology,
  Star,
  StarBorder,
  Edit,
  Delete,
  Phone,
  Email,
  LinkedIn
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridSelectionModel } from '@mui/x-data-grid';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { useLeadsData } from '../../hooks/useLeadsData';
import { LeadCreationModal } from '../../components/leads/LeadCreationModal';
import { BulkImportModal } from '../../components/leads/BulkImportModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { AIInsightPanel } from '../../components/ai-assistant/AIInsightPanel';
import { FilterPanel } from '../../components/leads/FilterPanel';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company: string;
  position: string;
  location?: string;
  score: number;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed' | 'lost';
  source: string;
  lastContact?: string;
  notes?: string;
  linkedinUrl?: string;
  profileImageUrl?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  aiInsights?: {
    factors: string[];
    risks: string[];
    opportunities: string[];
    nextBestAction: string;
  };
}

export const LeadsDashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<GridSelectionModel>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState({
    scoreRange: [0, 100],
    status: [],
    source: [],
    assignedTo: []
  });

  const { sendToAgent, subscribeToEvents } = useAgentCommunication();
  const { 
    fetchLeads, 
    createLead, 
    updateLead, 
    deleteLead,
    bulkUpdateLeads 
  } = useLeadsData();

  useEffect(() => {
    loadLeads();
    
    // Subscribe to real-time lead scoring events
    const unsubscribe = subscribeToEvents(['lead_scored', 'lead_analyzed'], handleLeadEvent);
    return unsubscribe;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, searchTerm, filters]);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const leadsData = await fetchLeads();
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadEvent = (event: any) => {
    if (event.type === 'lead_scored') {
      setLeads(prev => prev.map(lead => 
        lead.id === event.data.leadId 
          ? { ...lead, score: event.data.score, aiInsights: event.data.insights }
          : lead
      ));
    }
  };

  const applyFilters = () => {
    let filtered = leads;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.company.toLowerCase().includes(term)
      );
    }

    // Score range filter
    filtered = filtered.filter(lead =>
      lead.score >= filters.scoreRange[0] && lead.score <= filters.scoreRange[1]
    );

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(lead => filters.status.includes(lead.status));
    }

    // Source filter
    if (filters.source.length > 0) {
      filtered = filtered.filter(lead => filters.source.includes(lead.source));
    }

    setFilteredLeads(filtered);
  };

  const handleScoreLeads = async (leadIds: string[]) => {
    try {
      const leadsToScore = leads.filter(lead => leadIds.includes(lead.id));
      await sendToAgent('lead-scoring-agent', {
        type: 'batch_score',
        leads: leadsToScore
      });
    } catch (error) {
      console.error('Failed to score leads:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    const selectedLeadIds = selectedLeads as string[];
    setBulkActionAnchor(null);

    switch (action) {
      case 'score':
        await handleScoreLeads(selectedLeadIds);
        break;
      case 'qualify':
        await bulkUpdateLeads(selectedLeadIds, { status: 'qualified' });
        await loadLeads();
        break;
      case 'delete':
        if (confirm(`Delete ${selectedLeadIds.length} leads?`)) {
          await Promise.all(selectedLeadIds.map(id => deleteLead(id)));
          await loadLeads();
        }
        break;
      case 'export':
        exportLeads(selectedLeadIds);
        break;
    }
    setSelectedLeads([]);
  };

  const exportLeads = (leadIds: string[]) => {
    const leadsToExport = leads.filter(lead => leadIds.includes(lead.id));
    const csv = convertToCSV(leadsToExport);
    downloadCSV(csv, 'leads-export.csv');
  };

  const convertToCSV = (data: Lead[]) => {
    const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Position', 'Score', 'Status'];
    const rows = data.map(lead => [
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.company,
      lead.position,
      lead.score,
      lead.status
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'default',
      contacted: 'info',
      qualified: 'primary',
      proposal: 'secondary',
      closed: 'success',
      lost: 'error'
    };
    return colors[status] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            src={params.row.profileImageUrl}
            sx={{ width: 32, height: 32 }}
          >
            {params.row.firstName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {`${params.row.firstName} ${params.row.lastName}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.position}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'company',
      headerName: 'Company',
      width: 150
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200
    },
    {
      field: 'score',
      headerName: 'Score',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getScoreColor(params.value)}
          size="small"
          icon={<Psychology />}
        />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 120
    },
    {
      field: 'lastContact',
      headerName: 'Last Contact',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value ? new Date(params.value).toLocaleDateString() : 'Never'}
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
            onClick={() => window.open(`tel:${params.row.phone}`)}
            disabled={!params.row.phone}
          >
            <Phone fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => window.open(`mailto:${params.row.email}`)}
          >
            <Email fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setSelectedLead(params.row)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Leads</Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setShowBulkImport(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Lead
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              placeholder="Search leads..."
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
            
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            
            {selectedLeads.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<MoreVert />}
                onClick={(e) => setBulkActionAnchor(e.currentTarget)}
              >
                Actions ({selectedLeads.length})
              </Button>
            )}
          </Box>
          
          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              leads={leads}
            />
          )}
        </CardContent>
      </Card>

      {/* Leads Grid */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={filteredLeads}
            columns={columns}
            checkboxSelection
            selectionModel={selectedLeads}
            onSelectionModelChange={setSelectedLeads}
            loading={isLoading}
            autoHeight
            pageSize={25}
            rowsPerPageOptions={[25, 50, 100]}
            disableSelectionOnClick
            onRowDoubleClick={(params) => setSelectedLead(params.row)}
          />
        </CardContent>
      </Card>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkActionAnchor}
        open={Boolean(bulkActionAnchor)}
        onClose={() => setBulkActionAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkAction('score')}>
          <Psychology sx={{ mr: 1 }} />
          Score with AI
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('qualify')}>
          <Star sx={{ mr: 1 }} />
          Mark as Qualified
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('export')}>
          <Download sx={{ mr: 1 }} />
          Export
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('delete')}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Floating Action Button for Quick Add */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowCreateModal(true)}
      >
        <Add />
      </Fab>

      {/* Modals */}
      <LeadCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (leadData) => {
          await createLead(leadData);
          await loadLeads();
          setShowCreateModal(false);
        }}
      />

      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={async (leads) => {
          await Promise.all(leads.map(lead => createLead(lead)));
          await loadLeads();
          setShowBulkImport(false);
        }}
      />

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          open={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          onUpdate={async (updatedLead) => {
            await updateLead(updatedLead.id, updatedLead);
            await loadLeads();
            setSelectedLead(null);
          }}
        />
      )}
    </Box>
  );
};

export default LeadsDashboard;
```

### Filter Panel Component

```typescript
// src/components/leads/FilterPanel.tsx
import React from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput
} from '@mui/material';

interface FilterPanelProps {
  filters: {
    scoreRange: number[];
    status: string[];
    source: string[];
    assignedTo: string[];
  };
  onChange: (filters: any) => void;
  leads: any[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onChange, leads }) => {
  const statusOptions = ['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'];
  const sourceOptions = [...new Set(leads.map(lead => lead.source))];
  const assigneeOptions = [...new Set(leads.map(lead => lead.assignedTo).filter(Boolean))];

  const handleScoreRangeChange = (event: Event, newValue: number | number[]) => {
    onChange({ ...filters, scoreRange: newValue as number[] });
  };

  const handleMultiSelectChange = (field: string) => (event: any) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Advanced Filters
      </Typography>
      
      <Box display="flex" gap={3} flexWrap="wrap">
        {/* Score Range */}
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="body2" gutterBottom>
            Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}
          </Typography>
          <Slider
            value={filters.scoreRange}
            onChange={handleScoreRangeChange}
            valueLabelDisplay="auto"
            min={0}
            max={100}
          />
        </Box>

        {/* Status Filter */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filters.status}
            onChange={handleMultiSelectChange('status')}
            input={<OutlinedInput label="Status" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Source Filter */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Source</InputLabel>
          <Select
            multiple
            value={filters.source}
            onChange={handleMultiSelectChange('source')}
            input={<OutlinedInput label="Source" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {sourceOptions.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
```

### Lead Detail Modal

```typescript
// src/components/leads/LeadDetailModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { Psychology, LinkedIn, Phone, Email } from '@mui/icons-material';

interface LeadDetailModalProps {
  lead: any;
  open: boolean;
  onClose: () => void;
  onUpdate: (lead: any) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  open,
  onClose,
  onUpdate
}) => {
  const [editedLead, setEditedLead] = useState(lead);

  const handleSubmit = () => {
    onUpdate(editedLead);
  };

  const handleChange = (field: string) => (event: any) => {
    setEditedLead({ ...editedLead, [field]: event.target.value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={lead.profileImageUrl} sx={{ width: 48, height: 48 }}>
            {lead.firstName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {lead.firstName} {lead.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lead.position} at {lead.company}
            </Typography>
          </Box>
          <Chip
            icon={<Psychology />}
            label={`Score: ${lead.score}`}
            color={lead.score >= 80 ? 'success' : lead.score >= 60 ? 'warning' : 'error'}
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={editedLead.firstName}
                      onChange={handleChange('firstName')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={editedLead.lastName}
                      onChange={handleChange('lastName')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={editedLead.email}
                      onChange={handleChange('email')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={editedLead.phone || ''}
                      onChange={handleChange('phone')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Professional Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Professional Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Company"
                      value={editedLead.company}
                      onChange={handleChange('company')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={editedLead.position}
                      onChange={handleChange('position')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={editedLead.status}
                        onChange={handleChange('status')}
                      >
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="contacted">Contacted</MenuItem>
                        <MenuItem value="qualified">Qualified</MenuItem>
                        <MenuItem value="proposal">Proposal</MenuItem>
                        <MenuItem value="closed">Closed</MenuItem>
                        <MenuItem value="lost">Lost</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Source"
                      value={editedLead.source}
                      onChange={handleChange('source')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* AI Insights */}
          {lead.aiInsights && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <Psychology color="primary" />
                    AI Insights
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Key Factors
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {lead.aiInsights.factors.map((factor: string, index: number) => (
                        <Chip key={index} label={factor} size="small" color="primary" />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Opportunities
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {lead.aiInsights.opportunities.map((opp: string, index: number) => (
                        <Chip key={index} label={opp} size="small" color="success" />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Next Best Action
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lead.aiInsights.nextBestAction}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={editedLead.notes || ''}
              onChange={handleChange('notes')}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Update Lead
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

## Features

### AI-Powered Lead Scoring
- Real-time scoring with Voltagent Lead Scoring Agent
- Batch scoring for multiple leads
- Confidence intervals and scoring factors

### Advanced Filtering
- Score range sliders
- Multi-select status and source filters
- Real-time search across all fields

### Bulk Operations
- Batch scoring with AI
- Status updates for multiple leads
- CSV export functionality
- Bulk delete with confirmation

### Lead Management
- Detailed lead editing
- AI insights display
- Contact integration (phone, email)
- LinkedIn profile linking

## Usage

```typescript
import { LeadsDashboard } from './pages/Leads/LeadsDashboard';

// In your routing configuration
<Route path="/leads" element={<LeadsDashboard />} />
```

This comprehensive leads management system provides all the functionality needed for modern sales teams to manage their prospects effectively with AI assistance.