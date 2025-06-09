# Forecasting Analytics Page

> AI-powered sales forecasting with pipeline intelligence and deal prediction

## Component Overview

The ForecastingDashboard provides:
- Real-time pipeline analytics
- AI-powered deal predictions
- Revenue forecasting models
- Risk assessment and opportunity identification
- Interactive charts and visualizations
- Historical trend analysis

## Implementation

### Main Component

```typescript
// src/pages/Forecasting/ForecastingDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tab,
  Tabs,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Psychology,
  Analytics,
  Timeline,
  PieChart,
  Assessment,
  Refresh,
  Download,
  CalendarToday
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';
import { useForecastingData } from '../../hooks/useForecastingData';
import { ForecastSettings } from '../../components/forecasting/ForecastSettings';
import { DealRiskAnalysis } from '../../components/forecasting/DealRiskAnalysis';
import { OpportunityIdentifier } from '../../components/forecasting/OpportunityIdentifier';
import { PipelineHealthMeter } from '../../components/forecasting/PipelineHealthMeter';

interface ForecastData {
  period: string;
  predictedRevenue: number;
  actualRevenue?: number;
  confidence: number;
  factors: string[];
  risks: RiskFactor[];
  opportunities: Opportunity[];
}

interface RiskFactor {
  id: string;
  dealId: string;
  dealName: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  impact: number;
  probability: number;
  mitigationSuggestions: string[];
}

interface Opportunity {
  id: string;
  type: 'upsell' | 'cross_sell' | 'acceleration' | 'new_deal';
  description: string;
  potentialValue: number;
  probability: number;
  timeframe: string;
  actions: string[];
}

export const ForecastingDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('quarter');
  const [selectedTab, setSelectedTab] = useState(0);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { sendToAgent, subscribeToEvents } = useAgentCommunication();
  const {
    generateForecast,
    fetchHistoricalData,
    fetchPipelineAnalytics,
    updateForecastSettings
  } = useForecastingData();

  useEffect(() => {
    loadForecastData();
    
    // Subscribe to forecast events
    const unsubscribe = subscribeToEvents([
      'forecast_updated',
      'deal_risk_identified',
      'opportunity_detected'
    ], handleForecastEvent);
    
    return unsubscribe;
  }, [selectedPeriod]);

  const loadForecastData = async () => {
    try {
      setLoading(true);
      
      const [forecastData, historical, pipeline] = await Promise.all([
        generateForecast(selectedPeriod),
        fetchHistoricalData(selectedPeriod),
        fetchPipelineAnalytics()
      ]);
      
      setForecast(forecastData);
      setHistoricalData(historical);
      setPipelineData(pipeline);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to load forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForecastEvent = (event: any) => {
    switch (event.type) {
      case 'forecast_updated':
        setForecast(prev => ({
          ...prev,
          ...event.data.forecast
        }));
        break;
      
      case 'deal_risk_identified':
        // Update risk factors
        break;
      
      case 'opportunity_detected':
        // Add new opportunity
        break;
    }
  };

  const refreshForecast = async () => {
    await sendToAgent('forecasting-agent', {
      type: 'regenerate_forecast',
      period: selectedPeriod,
      includeRisks: true,
      includeOpportunities: true
    });
    
    await loadForecastData();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const monthlyTrendData = [
    { month: 'Jan', predicted: 450000, actual: 420000, pipeline: 380000 },
    { month: 'Feb', predicted: 520000, actual: 510000, pipeline: 480000 },
    { month: 'Mar', predicted: 580000, actual: 570000, pipeline: 550000 },
    { month: 'Apr', predicted: 640000, actual: null, pipeline: 610000 },
    { month: 'May', predicted: 720000, actual: null, pipeline: 680000 },
    { month: 'Jun', predicted: 800000, actual: null, pipeline: 750000 }
  ];

  const pipelineStageData = [
    { stage: 'Prospecting', value: 1200000, deals: 45, color: '#8884d8' },
    { stage: 'Qualification', value: 950000, deals: 32, color: '#82ca9d' },
    { stage: 'Proposal', value: 640000, deals: 18, color: '#ffc658' },
    { stage: 'Negotiation', value: 420000, deals: 12, color: '#ff7c7c' },
    { stage: 'Closing', value: 280000, deals: 8, color: '#8dd1e1' }
  ];

  const performanceMetrics = [
    {
      label: 'Forecast Accuracy',
      value: 87,
      change: +5,
      icon: <Assessment />
    },
    {
      label: 'Pipeline Velocity',
      value: 23,
      change: +12,
      icon: <Timeline />,
      suffix: ' days'
    },
    {
      label: 'Win Rate',
      value: 34,
      change: -2,
      icon: <TrendingUp />,
      suffix: '%'
    },
    {
      label: 'Deal Size Growth',
      value: 18,
      change: +8,
      icon: <Analytics />,
      suffix: '%'
    }
  ];

  const tabs = [
    { label: 'Overview', icon: <Analytics /> },
    { label: 'Pipeline Analysis', icon: <PieChart /> },
    { label: 'Risk Assessment', icon: <Psychology /> },
    { label: 'Opportunities', icon: <TrendingUp /> }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Forecasting</Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Forecast">
            <IconButton onClick={refreshForecast} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Button variant="outlined" startIcon={<Download />}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Predicted Revenue
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {forecast ? formatCurrency(forecast.predictedRevenue) : '...'}
                  </Typography>
                  {forecast && (
                    <Chip
                      label={`${forecast.confidence}% confidence`}
                      color={getConfidenceColor(forecast.confidence)}
                      size="small"
                    />
                  )}
                </Box>
                <Box sx={{ p: 1, bgcolor: 'primary.100', borderRadius: 1 }}>
                  <Psychology color="primary" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {performanceMetrics.map((metric, index) => (
          <Grid item xs={12} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.label}
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      {metric.value}{metric.suffix || ''}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {metric.change >= 0 ? (
                        <TrendingUp fontSize="small" color="success" />
                      ) : (
                        <TrendingDown fontSize="small" color="error" />
                      )}
                      <Typography
                        variant="caption"
                        color={metric.change >= 0 ? 'success.main' : 'error.main'}
                      >
                        {Math.abs(metric.change)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 1, bgcolor: 'secondary.100', borderRadius: 1 }}>
                    {metric.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Last Updated Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <CalendarToday fontSize="small" />
          Last updated: {lastUpdated.toLocaleString()} - 
          Next auto-refresh in {Math.floor(Math.random() * 30) + 10} minutes
        </Box>
      </Alert>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        <CardContent>
          {selectedTab === 0 && (
            <Grid container spacing={3}>
              {/* Revenue Trend Chart */}
              <Grid item xs={12} lg={8}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Revenue Trend & Forecast
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#8884d8"
                          name="Actual Revenue"
                          strokeWidth={3}
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#82ca9d"
                          strokeDasharray="5 5"
                          name="Predicted Revenue"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="pipeline"
                          stroke="#ffc658"
                          name="Pipeline Value"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Pipeline Health */}
              <Grid item xs={12} lg={4}>
                <PipelineHealthMeter
                  stages={pipelineStageData}
                  totalValue={pipelineStageData.reduce((sum, stage) => sum + stage.value, 0)}
                />
              </Grid>

              {/* AI Insights */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                      <Psychology color="primary" />
                      AI Forecast Insights
                    </Typography>
                    
                    {forecast?.factors && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Factors
                          </Typography>
                          {forecast.factors.map((factor, index) => (
                            <Chip
                              key={index}
                              label={factor}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom>
                            Risk Factors ({forecast.risks?.length || 0})
                          </Typography>
                          {forecast.risks?.slice(0, 3).map((risk, index) => (
                            <Chip
                              key={index}
                              label={risk.description}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              color="error"
                              variant="outlined"
                            />
                          ))}
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom>
                            Opportunities ({forecast.opportunities?.length || 0})
                          </Typography>
                          {forecast.opportunities?.slice(0, 3).map((opp, index) => (
                            <Chip
                              key={index}
                              label={opp.description}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              color="success"
                              variant="outlined"
                            />
                          ))}
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {selectedTab === 1 && (
            <Grid container spacing={3}>
              {/* Pipeline Distribution */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Pipeline by Stage
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <RechartsPieChart>
                        <RechartsPieChart
                          data={pipelineStageData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({name, value}) => `${name}: ${formatCurrency(value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pipelineStageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </RechartsPieChart>
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Stage Conversion */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Stage Conversion Rates
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={pipelineStageData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="deals" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {selectedTab === 2 && forecast?.risks && (
            <DealRiskAnalysis risks={forecast.risks} />
          )}

          {selectedTab === 3 && forecast?.opportunities && (
            <OpportunityIdentifier opportunities={forecast.opportunities} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForecastingDashboard;
```

### Pipeline Health Meter Component

```typescript
// src/components/forecasting/PipelineHealthMeter.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { TrendingUp, Warning, CheckCircle } from '@mui/icons-material';

interface PipelineStage {
  stage: string;
  value: number;
  deals: number;
  color: string;
}

interface PipelineHealthMeterProps {
  stages: PipelineStage[];
  totalValue: number;
}

export const PipelineHealthMeter: React.FC<PipelineHealthMeterProps> = ({
  stages,
  totalValue
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const getHealthStatus = () => {
    const prosperctingRatio = stages[0]?.value / totalValue || 0;
    const closingRatio = stages[stages.length - 1]?.value / totalValue || 0;
    
    if (prosperctingRatio > 0.4 && closingRatio > 0.15) {
      return { status: 'healthy', color: 'success', icon: <CheckCircle /> };
    } else if (prosperctingRatio > 0.3 || closingRatio > 0.1) {
      return { status: 'warning', color: 'warning', icon: <Warning /> };
    } else {
      return { status: 'critical', color: 'error', icon: <TrendingUp /> };
    }
  };

  const health = getHealthStatus();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Pipeline Health</Typography>
          <Chip
            icon={health.icon}
            label={health.status}
            color={health.color}
            size="small"
          />
        </Box>

        <Typography variant="h4" gutterBottom>
          {formatCurrency(totalValue)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={3}>
          Total Pipeline Value
        </Typography>

        {stages.map((stage, index) => {
          const percentage = (stage.value / totalValue) * 100;
          
          return (
            <Box key={stage.stage} mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" fontWeight="medium">
                  {stage.stage}
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(stage.value)} ({stage.deals})
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: stage.color,
                    borderRadius: 4
                  }
                }}
              />
              
              <Typography variant="caption" color="text.secondary">
                {percentage.toFixed(1)}% of pipeline
              </Typography>
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
};
```

### Deal Risk Analysis Component

```typescript
// src/components/forecasting/DealRiskAnalysis.tsx
import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { Warning, Error, Info, TrendingDown, Psychology } from '@mui/icons-material';

interface RiskFactor {
  id: string;
  dealId: string;
  dealName: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  impact: number;
  probability: number;
  mitigationSuggestions: string[];
}

interface DealRiskAnalysisProps {
  risks: RiskFactor[];
}

export const DealRiskAnalysis: React.FC<DealRiskAnalysisProps> = ({ risks }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <Error />;
      case 'medium': return <Warning />;
      default: return <Info />;
    }
  };

  const highRiskDeals = risks.filter(r => r.riskLevel === 'high');
  const mediumRiskDeals = risks.filter(r => r.riskLevel === 'medium');
  const lowRiskDeals = risks.filter(r => r.riskLevel === 'low');

  const totalRiskImpact = risks.reduce((sum, risk) => sum + risk.impact, 0);

  return (
    <Grid container spacing={3}>
      {/* Risk Summary */}
      <Grid item xs={12}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {highRiskDeals.length} high-risk deals identified with potential impact of ${totalRiskImpact.toLocaleString()}
          </Typography>
        </Alert>
      </Grid>

      {/* Risk Categories */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Error color="error" />
              <Typography variant="h6">High Risk</Typography>
              <Chip label={highRiskDeals.length} color="error" size="small" />
            </Box>
            
            {highRiskDeals.map((risk) => (
              <Box key={risk.id} sx={{ mb: 2, p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="medium">
                  {risk.dealName}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {risk.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption">Impact: ${risk.impact.toLocaleString()}</Typography>
                  <Typography variant="caption">Probability: {risk.probability}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={risk.probability}
                  color="error"
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Warning color="warning" />
              <Typography variant="h6">Medium Risk</Typography>
              <Chip label={mediumRiskDeals.length} color="warning" size="small" />
            </Box>
            
            {mediumRiskDeals.map((risk) => (
              <Box key={risk.id} sx={{ mb: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="medium">
                  {risk.dealName}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {risk.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption">Impact: ${risk.impact.toLocaleString()}</Typography>
                  <Typography variant="caption">Probability: {risk.probability}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={risk.probability}
                  color="warning"
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Info color="info" />
              <Typography variant="h6">Low Risk</Typography>
              <Chip label={lowRiskDeals.length} color="info" size="small" />
            </Box>
            
            {lowRiskDeals.slice(0, 3).map((risk) => (
              <Box key={risk.id} sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="medium">
                  {risk.dealName}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {risk.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption">Impact: ${risk.impact.toLocaleString()}</Typography>
                  <Typography variant="caption">Probability: {risk.probability}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={risk.probability}
                  color="info"
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* AI Mitigation Suggestions */}
      {highRiskDeals.length > 0 && (
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Psychology color="primary" />
                AI Mitigation Suggestions
              </Typography>
              
              {highRiskDeals.slice(0, 2).map((risk) => (
                <Box key={risk.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="medium" mb={1}>
                    {risk.dealName} - Risk Mitigation
                  </Typography>
                  
                  <List dense>
                    {risk.mitigationSuggestions.map((suggestion, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <TrendingDown color="success" />
                        </ListItemIcon>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Psychology />}
                    sx={{ mt: 1 }}
                  >
                    Apply AI Recommendations
                  </Button>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};
```

## Features

### AI-Powered Forecasting
- Machine learning revenue predictions
- Confidence intervals and accuracy tracking
- Multi-period forecasting (month, quarter, year)
- Historical trend analysis

### Pipeline Intelligence
- Stage-by-stage conversion analysis
- Health scoring and risk identification
- Velocity tracking and optimization
- Bottleneck detection

### Risk Assessment
- Deal-specific risk factors
- Impact and probability analysis
- AI-generated mitigation strategies
- Early warning systems

### Opportunity Identification
- Upsell and cross-sell detection
- Deal acceleration opportunities
- Market trend analysis
- Revenue optimization suggestions

This forecasting system provides sales teams with powerful AI-driven insights to predict revenue, identify risks, and optimize their sales pipeline for maximum performance.