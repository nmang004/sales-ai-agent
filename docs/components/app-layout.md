# App Layout Component

> Responsive navigation layout with theme support and user management

## Component Overview

The AppLayout provides:
- Responsive sidebar navigation
- Top header with user controls
- Theme switching capabilities
- Breadcrumb navigation
- Mobile-optimized menu
- Real-time notification system

## Implementation

### Main Layout Component

```typescript
// src/components/layout/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  People,
  Phone,
  Email,
  Analytics,
  Settings,
  Notifications,
  AccountCircle,
  Logout,
  DarkMode,
  LightMode,
  Search,
  Add
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavigationItem } from './NavigationItem';
import { NotificationPanel } from './NotificationPanel';
import { SearchDialog } from './SearchDialog';
import { QuickActionsMenu } from './QuickActionsMenu';
import { useAgentCommunication } from '../../hooks/useAgentCommunication';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  darkMode: boolean;
  onThemeToggle: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  user,
  darkMode,
  onThemeToggle
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsAnchor, setQuickActionsAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { subscribeToEvents, agentStatus } = useAgentCommunication();

  useEffect(() => {
    // Subscribe to agent notifications
    const unsubscribe = subscribeToEvents([
      'lead_scored',
      'call_completed',
      'email_sent',
      'forecast_updated'
    ], handleAgentNotification);

    return unsubscribe;
  }, []);

  const handleAgentNotification = (event: any) => {
    const notification = {
      id: Date.now().toString(),
      type: event.type,
      message: event.data.message,
      timestamp: new Date(),
      read: false,
      severity: event.data.severity || 'info'
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    setUnreadCount(prev => prev + 1);
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: <Home />,
      path: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      label: 'Leads',
      icon: <People />,
      path: '/leads',
      active: location.pathname.startsWith('/leads'),
      badge: agentStatus['lead-scoring-agent']?.queueSize || 0
    },
    {
      label: 'Conversations',
      icon: <Phone />,
      path: '/conversations',
      active: location.pathname.startsWith('/conversations'),
      indicator: agentStatus['conversation-agent']?.isActive
    },
    {
      label: 'Email Sequences',
      icon: <Email />,
      path: '/sequences',
      active: location.pathname.startsWith('/sequences')
    },
    {
      label: 'Forecasting',
      icon: <Analytics />,
      path: '/forecasting',
      active: location.pathname.startsWith('/forecasting')
    },
    {
      label: 'Settings',
      icon: <Settings />,
      path: '/settings',
      active: location.pathname.startsWith('/settings')
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleQuickActionsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setQuickActionsAnchor(event.currentTarget);
  };

  const handleQuickActionsClose = () => {
    setQuickActionsAnchor(null);
  };

  const handleLogout = () => {
    // Implement logout logic
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', path: '/dashboard' }
    ];

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const navItem = navigationItems.find(item => item.path === currentPath);
      
      if (navItem) {
        breadcrumbs.push({
          label: navItem.label,
          path: currentPath
        });
      } else {
        // Handle dynamic routes like /leads/:id
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentPath
        });
      }
    });

    return breadcrumbs;
  };

  const drawer = (
    <Box>
      {/* Logo Section */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" noWrap component="div" color="primary" fontWeight="bold">
          Sales AI
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Powered by Voltagent
        </Typography>
      </Box>
      
      <Divider />

      {/* Navigation */}
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.path}
            {...item}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
          />
        ))}
      </List>

      <Divider />

      {/* Agent Status */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Agent Status
        </Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          {Object.entries(agentStatus).map(([agentId, status]: [string, any]) => (
            <Box key={agentId} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption">
                {agentId.replace('-agent', '')}
              </Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: status?.isActive ? 'success.main' : 'grey.400'
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          boxShadow: 'none'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs aria-label="breadcrumb">
              {getBreadcrumbs().map((crumb, index) => (
                <Link
                  key={crumb.path}
                  color={index === getBreadcrumbs().length - 1 ? 'text.primary' : 'inherit'}
                  href={crumb.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(crumb.path);
                  }}
                  sx={{ 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Action Buttons */}
          <Box display="flex" alignItems="center" gap={1}>
            {/* Search */}
            <Tooltip title="Search">
              <IconButton onClick={() => setSearchOpen(true)}>
                <Search />
              </IconButton>
            </Tooltip>

            {/* Quick Actions */}
            <Tooltip title="Quick Actions">
              <IconButton onClick={handleQuickActionsOpen}>
                <Add />
              </IconButton>
            </Tooltip>

            {/* Theme Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={onThemeToggle}
                  icon={<LightMode />}
                  checkedIcon={<DarkMode />}
                />
              }
              label=""
              sx={{ m: 0 }}
            />

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton onClick={handleNotificationOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account settings">
              <IconButton onClick={handleUserMenuOpen}>
                <Avatar 
                  src={user.avatar} 
                  sx={{ width: 32, height: 32 }}
                  alt={user.name}
                >
                  {user.name.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` }
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { navigate('/profile'); handleUserMenuClose(); }}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleUserMenuClose(); }}>
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Notification Panel */}
      <NotificationPanel
        anchor={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        notifications={notifications}
      />

      {/* Search Dialog */}
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Quick Actions Menu */}
      <QuickActionsMenu
        anchor={quickActionsAnchor}
        open={Boolean(quickActionsAnchor)}
        onClose={handleQuickActionsClose}
      />
    </Box>
  );
};

export default AppLayout;
```

### Navigation Item Component

```typescript
// src/components/layout/NavigationItem.tsx
import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  alpha
} from '@mui/material';

interface NavigationItemProps {
  label: string;
  icon: React.ReactNode;
  path: string;
  active: boolean;
  badge?: number;
  indicator?: boolean;
  onClick: () => void;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  label,
  icon,
  active,
  badge,
  indicator,
  onClick
}) => {
  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={onClick}
        sx={{
          borderRadius: 1,
          mx: 0.5,
          mb: 0.5,
          ...(active && {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15)
            }
          })
        }}
      >
        <ListItemIcon sx={{ color: active ? 'primary.main' : 'inherit' }}>
          <Box position="relative">
            {icon}
            {indicator && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  border: '2px solid',
                  borderColor: 'background.paper'
                }}
              />
            )}
          </Box>
        </ListItemIcon>
        <ListItemText 
          primary={label}
          primaryTypographyProps={{
            fontSize: '14px',
            fontWeight: active ? 600 : 400
          }}
        />
        {badge && badge > 0 && (
          <Badge badgeContent={badge} color="primary" max={99} />
        )}
      </ListItemButton>
    </ListItem>
  );
};
```

### Notification Panel Component

```typescript
// src/components/layout/NotificationPanel.tsx
import React from 'react';
import {
  Menu,
  MenuList,
  MenuItem,
  Typography,
  Box,
  Avatar,
  Divider,
  Button,
  Chip
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationPanelProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  anchor,
  open,
  onClose,
  notifications
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  return (
    <Menu
      anchorEl={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 360, maxHeight: 400 }
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Notifications</Typography>
      </Box>
      
      <Divider />
      
      <MenuList sx={{ py: 0 }}>
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem key={notification.id} sx={{ alignItems: 'flex-start', py: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, mr: 2, mt: 0.5 }}>
                <Box sx={{ fontSize: 16 }}>🤖</Box>
              </Avatar>
              
              <Box sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Chip
                    label={notification.type.replace('_', ' ')}
                    color={getSeverityColor(notification.severity)}
                    size="small"
                  />
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main'
                      }}
                    />
                  )}
                </Box>
                
                <Typography variant="body2">
                  {notification.message}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </MenuList>
      
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1 }}>
            <Button fullWidth size="small">
              View All Notifications
            </Button>
          </Box>
        </>
      )}
    </Menu>
  );
};
```

## Features

### Responsive Design
- Mobile-first approach with collapsible sidebar
- Touch-friendly navigation on mobile devices
- Optimized spacing and typography for all screen sizes
- Drawer overlay on mobile, persistent on desktop

### Real-time Integration
- Live agent status indicators
- Real-time notification system
- WebSocket connection monitoring
- Queue size and activity badges

### User Experience
- Breadcrumb navigation for context
- Quick action shortcuts
- Theme switching capability
- Search functionality integration

### Accessibility
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast theme support

This layout provides a solid foundation for the Sales AI dashboard with modern design patterns and seamless integration with the Voltagent agent system.