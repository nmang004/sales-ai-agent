# Common Components

> Reusable UI components for the Sales AI Dashboard

## Component Library

### MetricCard Component

```typescript
// src/components/common/MetricCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'primary',
  loading = false
}) => {
  const formatChange = (change: number) => {
    const absChange = Math.abs(change);
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${absChange}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success' : 'error';
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" gutterBottom>
              {loading ? '...' : value}
            </Typography>
            {change !== undefined && (
              <Box display="flex" alignItems="center" gap={0.5}>
                {change >= 0 ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Chip
                  label={formatChange(change)}
                  size="small"
                  color={getChangeColor(change)}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: `${color}.50`,
              color: `${color}.main`
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### QuickActionButton Component

```typescript
// src/components/common/QuickActionButton.tsx
import React from 'react';
import { Card, CardContent, Box, Typography, IconButton } from '@mui/material';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  description,
  onClick,
  color = 'primary',
  disabled = false
}) => {
  return (
    <Card
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': disabled ? {} : {
          transform: 'translateY(-2px)',
          boxShadow: 3
        },
        opacity: disabled ? 0.6 : 1
      }}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            mx: 'auto',
            mb: 2,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: `${color}.100`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: `${color}.main`
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};
```

### LiveNotificationPanel Component

```typescript
// src/components/common/LiveNotificationPanel.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Box,
  Chip,
  Collapse,
  Alert
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Close,
  ExpandMore,
  ExpandLess,
  Psychology,
  TrendingUp,
  Email,
  Warning
} from '@mui/icons-material';

interface Notification {
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

interface LiveNotificationPanelProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onAction: (notification: Notification, action: any) => void;
}

export const LiveNotificationPanel: React.FC<LiveNotificationPanelProps> = ({
  notifications,
  onDismiss,
  onAction
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'high_value_lead': return <TrendingUp color="success" />;
      case 'coaching_tip': return <Psychology color="primary" />;
      case 'email_response': return <Email color="info" />;
      case 'system_alert': return <Warning color="warning" />;
      default: return <Notifications />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardContent sx={{ pb: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => setCollapsed(!collapsed)}
          sx={{ cursor: 'pointer', mb: collapsed ? 0 : 2 }}
        >
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <NotificationsActive color="primary" />
            Live Notifications
            {notifications.length > 0 && (
              <Chip
                label={notifications.length}
                size="small"
                color="primary"
              />
            )}
          </Typography>
          
          <IconButton size="small">
            {collapsed ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Box>

        <Collapse in={!collapsed}>
          {notifications.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              No new notifications
            </Alert>
          ) : (
            <List sx={{ py: 0 }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    p: 2,
                    bgcolor: notification.priority === 'high' ? 'error.50' : 'background.paper'
                  }}
                >
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {notification.message}
                        </Typography>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                        
                        {notification.actions && (
                          <Box display="flex" gap={1} mt={1}>
                            {notification.actions.map((action, index) => (
                              <Button
                                key={index}
                                size="small"
                                variant="outlined"
                                onClick={() => onAction(notification, action)}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDismiss(notification.id)}
                  >
                    <Close />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};
```

### DataTable Component

```typescript
// src/components/common/DataTable.tsx
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { MoreVert, FilterList } from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  selectable = false,
  onSelectionChange,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map(row => row.id);
      setSelected(newSelected);
      onSelectionChange?.(newSelected);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  };

  const handleSelect = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const sortedRows = React.useMemo(() => {
    if (!orderBy) return rows;
    
    return [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (bValue < aValue) {
        return order === 'desc' ? -1 : 1;
      }
      if (bValue > aValue) {
        return order === 'desc' ? 1 : -1;
      }
      return 0;
    });
  }, [rows, order, orderBy]);

  const paginatedRows = sortedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              
              <TableCell align="center" style={{ width: 60 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 2 : 1)} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 2 : 1)} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const isSelected = selected.indexOf(row.id) !== -1;
                
                return (
                  <TableRow
                    hover
                    key={row.id}
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(row.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value) : value}
                        </TableCell>
                      );
                    })}
                    
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAnchor(e.currentTarget);
                          setMenuRowId(row.id);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => console.log('Edit', menuRowId)}>
          Edit
        </MenuItem>
        <MenuItem onClick={() => console.log('Delete', menuRowId)}>
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};
```

### SearchInput Component

```typescript
// src/components/common/SearchInput.tsx
import React, { useState, useEffect } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  fullWidth?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSearch,
  debounceMs = 300,
  fullWidth = false
}) => {
  const [searchValue, setSearchValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) {
        onChange(searchValue);
      }
      if (onSearch) {
        onSearch(searchValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, debounceMs, onChange, onSearch]);

  const handleClear = () => {
    setSearchValue('');
  };

  return (
    <TextField
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
        endAdornment: searchValue && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}>
              <Clear />
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  );
};
```

### LoadingSpinner Component

```typescript
// src/components/common/LoadingSpinner.tsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 40,
  fullScreen = false
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
    >
      <CircularProgress size={size} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="rgba(255, 255, 255, 0.8)"
        zIndex={9999}
      >
        {content}
      </Box>
    );
  }

  return content;
};
```

## Usage Examples

### MetricCard
```typescript
<MetricCard
  title="Today's Calls"
  value={25}
  change={12.5}
  icon={<Phone />}
  color="primary"
/>
```

### DataTable
```typescript
<DataTable
  columns={[
    { id: 'name', label: 'Name', sortable: true },
    { id: 'email', label: 'Email' },
    { id: 'score', label: 'Score', align: 'center' }
  ]}
  rows={leads}
  selectable
  onSelectionChange={setSelectedLeads}
  onRowClick={handleRowClick}
/>
```

### SearchInput
```typescript
<SearchInput
  placeholder="Search leads..."
  onChange={handleSearch}
  fullWidth
/>
```

These common components provide a consistent, reusable foundation for the entire dashboard while maintaining design system standards and TypeScript safety.