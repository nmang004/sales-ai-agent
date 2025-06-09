# LinkedIn Browser Extension

> Browser extension for capturing LinkedIn profiles directly into the Sales AI dashboard

## Extension Overview

The LinkedIn Browser Extension provides:
- One-click profile capture from LinkedIn
- Automatic data extraction and parsing
- AI-powered data enrichment
- Direct integration with dashboard
- Real-time sync and notifications

## Implementation

### Extension Manifest

```json
// extension/manifest.json
{
  "manifest_version": 3,
  "name": "Sales AI - LinkedIn Lead Capture",
  "version": "1.0.0",
  "description": "Capture LinkedIn profiles directly into your Sales AI dashboard",
  
  "permissions": [
    "storage",
    "notifications",
    "contextMenus",
    "activeTab",
    "scripting"
  ],
  
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://*.your-sales-ai-dashboard.com/*"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content-script.js"],
      "run_at": "document_end"
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "Sales AI Extension",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "options_page": "options.html",
  
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "capture-button.css"],
      "matches": ["https://www.linkedin.com/*"]
    }
  ]
}
```

### Content Script

```typescript
// extension/content-script.ts
interface LinkedInProfile {
  fullName: string;
  headline: string;
  location: string;
  profileUrl: string;
  profileImageUrl?: string;
  connections?: string;
  company?: {
    name: string;
    position: string;
    duration: string;
    companyUrl?: string;
  };
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field: string;
    years: string;
  }>;
  skills?: string[];
  about?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

interface ExtractionResult {
  profile: LinkedInProfile;
  extractedAt: string;
  confidence: number;
  errors?: string[];
}

class LinkedInExtractor {
  private selectors = {
    // Profile header selectors
    name: 'h1.text-heading-xlarge, h1.artdeco-entity-lockup__title',
    headline: '.text-body-medium.break-words, .artdeco-entity-lockup__subtitle',
    location: '.text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel .geo-information',
    profileImage: '.pv-top-card-profile-picture__image, .artdeco-entity-lockup__image img',
    connections: '.t-black--light.t-normal span, .pv-top-card__connections',
    
    // Company info selectors
    company: '.text-body-medium.break-words, .artdeco-entity-lockup__subtitle',
    companyLink: 'a[href*="/company/"]',
    
    // About section
    about: '.pv-about__text .inline-show-more-text, .core-section-container__content .break-words',
    
    // Experience section
    experience: '.pvs-list__item--line-separated .pvs-entity, .experience-section .pv-entity__summary-info',
    experienceTitle: '.mr1.t-bold span, .pv-entity__summary-info h3',
    experienceCompany: '.t-14.t-normal span, .pv-entity__secondary-title',
    experienceDuration: '.t-14.t-normal.t-black--light span, .pv-entity__bullet-item',
    experienceDescription: '.inline-show-more-text, .pv-entity__description',
    
    // Education section
    education: '.pvs-list__item--line-separated .pvs-entity, .education-section .pv-entity__summary-info',
    educationSchool: '.mr1.t-bold span, .pv-entity__school-name',
    educationDegree: '.t-14.t-normal span, .pv-entity__degree-name',
    educationYears: '.t-14.t-normal.t-black--light span, .pv-entity__dates',
    
    // Skills section
    skills: '.pvs-skill-category-entity__name, .skill-category-entity__name',
    
    // Contact info
    contactSection: '[data-section="contactInfo"], .pv-contact-info',
    email: 'a[href^="mailto:"]',
    phone: 'span[dir="ltr"]',
    website: 'a[href^="http"]:not([href*="linkedin.com"])'
  };

  extractProfile(): LinkedInProfile {
    try {
      const profile: LinkedInProfile = {
        fullName: this.extractText(this.selectors.name),
        headline: this.extractText(this.selectors.headline),
        location: this.extractText(this.selectors.location),
        profileUrl: this.cleanUrl(window.location.href),
        profileImageUrl: this.extractImageUrl(this.selectors.profileImage),
        connections: this.extractConnections(),
        company: this.extractCurrentCompany(),
        experience: this.extractExperience(),
        education: this.extractEducation(),
        skills: this.extractSkills(),
        about: this.extractText(this.selectors.about),
        contactInfo: this.extractContactInfo()
      };

      return profile;
    } catch (error) {
      console.error('LinkedIn extraction error:', error);
      throw new Error('Failed to extract LinkedIn profile data');
    }
  }

  private extractText(selector: string): string {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() || '';
  }

  private extractImageUrl(selector: string): string | undefined {
    const img = document.querySelector(selector) as HTMLImageElement;
    return img?.src;
  }

  private cleanUrl(url: string): string {
    // Remove query parameters and fragments
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  }

  private extractConnections(): string {
    const connectionEl = document.querySelector(this.selectors.connections);
    const text = connectionEl?.textContent?.trim();
    
    // Extract number from text like "500+ connections"
    const match = text?.match(/(\d+(?:,\d+)*|\d+\+)/);
    return match?.[1] || '';
  }

  private extractCurrentCompany(): LinkedInProfile['company'] {
    // Try multiple selectors for company info
    const companySection = document.querySelector(this.selectors.company);
    if (!companySection) return undefined;

    const text = companySection.textContent?.trim();
    const lines = text?.split('\n').filter(line => line.trim());
    
    if (lines && lines.length >= 2) {
      return {
        name: lines[1]?.trim() || '',
        position: lines[0]?.trim() || '',
        duration: lines[2]?.trim() || '',
        companyUrl: this.extractCompanyUrl()
      };
    }
    return undefined;
  }

  private extractCompanyUrl(): string | undefined {
    const companyLink = document.querySelector(this.selectors.companyLink) as HTMLAnchorElement;
    return companyLink?.href;
  }

  private extractExperience(): LinkedInProfile['experience'] {
    const experienceItems = document.querySelectorAll(this.selectors.experience);
    const experience: NonNullable<LinkedInProfile['experience']> = [];

    experienceItems.forEach(item => {
      const titleEl = item.querySelector(this.selectors.experienceTitle);
      const companyEl = item.querySelector(this.selectors.experienceCompany);
      const durationEl = item.querySelector(this.selectors.experienceDuration);
      const descEl = item.querySelector(this.selectors.experienceDescription);

      if (titleEl && companyEl) {
        experience.push({
          title: titleEl.textContent?.trim() || '',
          company: companyEl.textContent?.trim() || '',
          duration: durationEl?.textContent?.trim() || '',
          description: descEl?.textContent?.trim()
        });
      }
    });

    return experience.slice(0, 5); // Limit to 5 most recent
  }

  private extractEducation(): LinkedInProfile['education'] {
    const educationItems = document.querySelectorAll(this.selectors.education);
    const education: NonNullable<LinkedInProfile['education']> = [];

    educationItems.forEach(item => {
      const schoolEl = item.querySelector(this.selectors.educationSchool);
      const degreeEl = item.querySelector(this.selectors.educationDegree);
      const yearsEl = item.querySelector(this.selectors.educationYears);

      if (schoolEl) {
        const degreeText = degreeEl?.textContent?.trim() || '';
        const [degree, field] = degreeText.split(',').map(s => s.trim());
        
        education.push({
          school: schoolEl.textContent?.trim() || '',
          degree: degree || '',
          field: field || '',
          years: yearsEl?.textContent?.trim() || ''
        });
      }
    });

    return education.slice(0, 3); // Limit to 3 most recent
  }

  private extractSkills(): string[] {
    const skillElements = document.querySelectorAll(this.selectors.skills);
    const skills = Array.from(skillElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean) as string[];
    
    return skills.slice(0, 10); // Limit to 10 skills
  }

  private extractContactInfo(): LinkedInProfile['contactInfo'] {
    const contactSection = document.querySelector(this.selectors.contactSection);
    if (!contactSection) return {};

    const emailEl = contactSection.querySelector(this.selectors.email) as HTMLAnchorElement;
    const phoneEl = contactSection.querySelector(this.selectors.phone);
    const websiteEl = contactSection.querySelector(this.selectors.website) as HTMLAnchorElement;

    return {
      email: emailEl?.href?.replace('mailto:', ''),
      phone: phoneEl?.textContent?.trim(),
      website: websiteEl?.href
    };
  }
}

// Capture button creation and management
class CaptureButtonManager {
  private button: HTMLElement | null = null;
  private extractor = new LinkedInExtractor();

  init() {
    if (!this.isProfilePage()) return;
    
    this.removeExistingButton();
    this.createCaptureButton();
  }

  private isProfilePage(): boolean {
    return window.location.hostname === 'www.linkedin.com' && 
           window.location.pathname.includes('/in/');
  }

  private removeExistingButton() {
    const existingButton = document.getElementById('sales-ai-capture-btn');
    if (existingButton) existingButton.remove();
  }

  private createCaptureButton() {
    this.button = document.createElement('div');
    this.button.id = 'sales-ai-capture-btn';
    
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('capture-button.css');
    document.head.appendChild(link);
    
    this.button.innerHTML = `
      <div class="sales-ai-capture-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>Add to Sales AI</span>
      </div>
    `;

    this.button.addEventListener('click', this.handleCapture.bind(this));
    document.body.appendChild(this.button);
  }

  private async handleCapture() {
    if (!this.button) return;

    try {
      this.setButtonState('loading');
      
      const profile = this.extractor.extractProfile();
      const extractionResult: ExtractionResult = {
        profile,
        extractedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(profile),
        errors: []
      };

      // Send to background script
      await chrome.runtime.sendMessage({
        type: 'LINKEDIN_PROFILE_CAPTURED',
        data: extractionResult
      });

      this.setButtonState('success');
      
      setTimeout(() => {
        this.setButtonState('default');
      }, 2000);

    } catch (error) {
      console.error('Capture failed:', error);
      this.setButtonState('error');
      
      setTimeout(() => {
        this.setButtonState('default');
      }, 2000);
    }
  }

  private setButtonState(state: 'default' | 'loading' | 'success' | 'error') {
    if (!this.button) return;

    const buttonEl = this.button.querySelector('.sales-ai-capture-button');
    if (!buttonEl) return;

    // Reset classes
    buttonEl.classList.remove('loading', 'success', 'error');
    
    switch (state) {
      case 'loading':
        buttonEl.classList.add('loading');
        buttonEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spin">
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
          </svg>
          <span>Capturing...</span>
        `;
        break;
        
      case 'success':
        buttonEl.classList.add('success');
        buttonEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>Captured!</span>
        `;
        break;
        
      case 'error':
        buttonEl.classList.add('error');
        buttonEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          <span>Error</span>
        `;
        break;
        
      default:
        buttonEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>Add to Sales AI</span>
        `;
    }
  }

  private calculateConfidence(profile: LinkedInProfile): number {
    let score = 0;
    const weights = {
      fullName: 20,
      headline: 15,
      location: 10,
      company: 20,
      experience: 15,
      education: 10,
      skills: 5,
      about: 5
    };

    if (profile.fullName) score += weights.fullName;
    if (profile.headline) score += weights.headline;
    if (profile.location) score += weights.location;
    if (profile.company?.name) score += weights.company;
    if (profile.experience && profile.experience.length > 0) score += weights.experience;
    if (profile.education && profile.education.length > 0) score += weights.education;
    if (profile.skills && profile.skills.length > 0) score += weights.skills;
    if (profile.about) score += weights.about;

    return score;
  }
}

// Initialize capture button manager
const captureManager = new CaptureButtonManager();

// Initialize on page load
captureManager.init();

// Handle SPA navigation
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    setTimeout(() => captureManager.init(), 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_CAPTURE') {
    captureManager.init();
    sendResponse({ success: true });
  }
});
```

### Background Script

```typescript
// extension/background.ts
interface ExtensionStorage {
  profileData?: ExtractionResult;
  apiKey?: string;
  dashboardUrl?: string;
  settings?: {
    autoCapture: boolean;
    notifications: boolean;
    syncFrequency: number;
  };
}

class SalesAIExtensionBackground {
  private storage: ExtensionStorage = {};
  private defaultDashboardUrl = 'https://your-sales-ai-dashboard.com';

  constructor() {
    this.initializeStorage();
    this.setupMessageHandlers();
    this.setupContextMenus();
    this.setupAlarms();
  }

  private async initializeStorage() {
    const stored = await chrome.storage.sync.get([
      'apiKey', 
      'dashboardUrl', 
      'settings'
    ]);
    
    this.storage = {
      ...this.storage,
      ...stored,
      settings: {
        autoCapture: true,
        notifications: true,
        syncFrequency: 30,
        ...stored.settings
      }
    };
    
    if (!this.storage.dashboardUrl) {
      this.storage.dashboardUrl = this.defaultDashboardUrl;
      await chrome.storage.sync.set({ dashboardUrl: this.defaultDashboardUrl });
    }
  }

  private setupMessageHandlers() {
    chrome.runtime.onMessage.addListener(
      async (message, sender, sendResponse) => {
        try {
          switch (message.type) {
            case 'LINKEDIN_PROFILE_CAPTURED':
              await this.handleProfileCapture(message.data);
              sendResponse({ success: true });
              break;
              
            case 'GET_SETTINGS':
              sendResponse({ settings: this.storage.settings });
              break;
              
            case 'UPDATE_SETTINGS':
              await this.updateSettings(message.settings);
              sendResponse({ success: true });
              break;
              
            default:
              sendResponse({ error: 'Unknown message type' });
          }
        } catch (error) {
          sendResponse({ error: error.message });
        }
        return true; // Keep message channel open for async response
      }
    );
  }

  private setupContextMenus() {
    chrome.contextMenus.create({
      id: 'sales-ai-capture',
      title: 'Add to Sales AI',
      contexts: ['page'],
      documentUrlPatterns: ['https://www.linkedin.com/in/*']
    });

    chrome.contextMenus.create({
      id: 'sales-ai-settings',
      title: 'Extension Settings',
      contexts: ['action']
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      switch (info.menuItemId) {
        case 'sales-ai-capture':
          if (tab?.id) {
            await this.triggerCapture(tab.id);
          }
          break;
          
        case 'sales-ai-settings':
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
          break;
      }
    });
  }

  private setupAlarms() {
    // Set up periodic sync alarm
    chrome.alarms.create('sync-data', {
      periodInMinutes: this.storage.settings?.syncFrequency || 30
    });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'sync-data') {
        await this.performPeriodicSync();
      }
    });
  }

  private async triggerCapture(tabId: number) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_CAPTURE' });
    } catch (error) {
      console.error('Failed to trigger capture:', error);
      this.showNotification('Failed to capture profile', 'error');
    }
  }

  private async handleProfileCapture(data: ExtractionResult) {
    try {
      // Store the captured data
      this.storage.profileData = data;
      await chrome.storage.local.set({ 
        profileData: data,
        lastCaptureTime: new Date().toISOString()
      });

      // Send to dashboard
      const result = await this.sendToDashboard(data);
      
      if (result.success) {
        this.showNotification('Profile captured successfully!', 'success');
        
        // Open dashboard if enabled
        if (this.storage.settings?.autoOpenDashboard) {
          chrome.tabs.create({
            url: `${this.storage.dashboardUrl}/leads/${result.leadId}?from=extension`
          });
        }
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }

    } catch (error) {
      console.error('Profile capture handling failed:', error);
      this.showNotification('Failed to process profile data', 'error');
    }
  }

  private async sendToDashboard(data: ExtractionResult): Promise<{success: boolean, leadId?: string, error?: string}> {
    if (!this.storage.apiKey) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      return { success: false, error: 'API key not configured' };
    }

    try {
      const response = await fetch(`${this.storage.dashboardUrl}/api/leads/import-linkedin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.storage.apiKey}`,
          'User-Agent': 'SalesAI-Extension/1.0.0'
        },
        body: JSON.stringify({
          linkedinData: data,
          source: 'browser_extension',
          capturedAt: new Date().toISOString(),
          extensionVersion: chrome.runtime.getManifest().version
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Store successful capture
      await chrome.storage.local.set({
        lastSuccessfulSync: new Date().toISOString(),
        totalCaptured: await this.incrementCaptureCount()
      });

      return { success: true, leadId: result.leadId };

    } catch (error) {
      console.error('Dashboard communication failed:', error);
      
      // Store failed capture for retry
      await this.storeFallbackData(data);
      
      return { success: false, error: error.message };
    }
  }

  private async storeFallbackData(data: ExtractionResult) {
    const failedCaptures = await chrome.storage.local.get('failedCaptures');
    const captures = failedCaptures.failedCaptures || [];
    
    captures.push({
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    
    await chrome.storage.local.set({ failedCaptures: captures });
  }

  private async performPeriodicSync() {
    try {
      // Retry failed captures
      const { failedCaptures } = await chrome.storage.local.get('failedCaptures');
      
      if (failedCaptures && failedCaptures.length > 0) {
        const retryResults = await Promise.allSettled(
          failedCaptures.map(capture => this.retryFailedCapture(capture))
        );
        
        // Remove successful retries
        const stillFailed = failedCaptures.filter((_, index) => 
          retryResults[index].status === 'rejected'
        );
        
        await chrome.storage.local.set({ failedCaptures: stillFailed });
        
        if (stillFailed.length < failedCaptures.length) {
          this.showNotification(`Synced ${failedCaptures.length - stillFailed.length} pending captures`, 'success');
        }
      }
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  private async retryFailedCapture(capture: any) {
    const result = await this.sendToDashboard(capture.data);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  private async incrementCaptureCount(): Promise<number> {
    const { totalCaptured = 0 } = await chrome.storage.local.get('totalCaptured');
    return totalCaptured + 1;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    if (!this.storage.settings?.notifications) return;

    const iconMap = {
      success: 'icons/success-48.png',
      error: 'icons/error-48.png',
      info: 'icons/info-48.png'
    };

    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconMap[type] || iconMap.info,
      title: 'Sales AI Extension',
      message,
      contextMessage: type === 'success' ? 'Profile added to dashboard' : undefined
    });
  }

  private async updateSettings(newSettings: Partial<ExtensionStorage['settings']>) {
    this.storage.settings = { ...this.storage.settings, ...newSettings };
    await chrome.storage.sync.set({ settings: this.storage.settings });
    
    // Update alarm frequency if changed
    if (newSettings.syncFrequency) {
      chrome.alarms.clear('sync-data');
      chrome.alarms.create('sync-data', {
        periodInMinutes: newSettings.syncFrequency
      });
    }
  }
}

// Initialize background script
new SalesAIExtensionBackground();
```

### Extension Popup

```html
<!-- extension/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      min-height: 400px;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    
    .logo {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .subtitle {
      font-size: 12px;
      opacity: 0.9;
    }
    
    .content {
      padding: 20px;
    }
    
    .status-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .status-label {
      font-size: 14px;
      color: #666;
    }
    
    .status-value {
      font-size: 14px;
      font-weight: 500;
    }
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 8px;
    }
    
    .status-connected {
      background: #10b981;
    }
    
    .status-disconnected {
      background: #ef4444;
    }
    
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .btn {
      padding: 12px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
    }
    
    .btn-primary:hover {
      background: #5a6fd8;
    }
    
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #d1d5db;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .footer {
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Sales AI</div>
    <div class="subtitle">LinkedIn Lead Capture</div>
  </div>
  
  <div class="content">
    <div class="status-card">
      <div class="status-row">
        <span class="status-label">Dashboard Connection</span>
        <div style="display: flex; align-items: center;">
          <span class="status-value" id="connection-status">Checking...</span>
          <div class="status-indicator" id="connection-indicator"></div>
        </div>
      </div>
      
      <div class="status-row">
        <span class="status-label">Profiles Captured</span>
        <span class="status-value" id="capture-count">0</span>
      </div>
      
      <div class="status-row">
        <span class="status-label">Last Sync</span>
        <span class="status-value" id="last-sync">Never</span>
      </div>
    </div>
    
    <div class="action-buttons">
      <button class="btn btn-primary" id="capture-btn" disabled>
        Capture Current Profile
      </button>
      
      <button class="btn btn-secondary" id="dashboard-btn">
        Open Dashboard
      </button>
      
      <button class="btn btn-secondary" id="settings-btn">
        Settings
      </button>
    </div>
  </div>
  
  <div class="footer">
    Version 1.0.0 | <a href="#" id="help-link">Help</a>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup Script

```typescript
// extension/popup.ts
interface PopupState {
  isConnected: boolean;
  captureCount: number;
  lastSync: string | null;
  currentTab: chrome.tabs.Tab | null;
}

class PopupManager {
  private state: PopupState = {
    isConnected: false,
    captureCount: 0,
    lastSync: null,
    currentTab: null
  };

  async init() {
    await this.loadState();
    this.setupEventListeners();
    this.updateUI();
    this.checkCurrentTab();
  }

  private async loadState() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.state.currentTab = tab;

    // Load stored data
    const storage = await chrome.storage.local.get([
      'totalCaptured',
      'lastSuccessfulSync',
      'connectionStatus'
    ]);

    this.state.captureCount = storage.totalCaptured || 0;
    this.state.lastSync = storage.lastSuccessfulSync;
    this.state.isConnected = await this.checkConnection();
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const { apiKey, dashboardUrl } = await chrome.storage.sync.get(['apiKey', 'dashboardUrl']);
      
      if (!apiKey || !dashboardUrl) return false;

      const response = await fetch(`${dashboardUrl}/api/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private setupEventListeners() {
    // Capture button
    document.getElementById('capture-btn')?.addEventListener('click', () => {
      this.triggerCapture();
    });

    // Dashboard button
    document.getElementById('dashboard-btn')?.addEventListener('click', async () => {
      const { dashboardUrl } = await chrome.storage.sync.get('dashboardUrl');
      chrome.tabs.create({ url: dashboardUrl || 'https://your-sales-ai-dashboard.com' });
    });

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    });

    // Help link
    document.getElementById('help-link')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://docs.your-sales-ai-dashboard.com/extension' });
    });
  }

  private updateUI() {
    // Connection status
    const statusEl = document.getElementById('connection-status');
    const indicatorEl = document.getElementById('connection-indicator');
    
    if (statusEl && indicatorEl) {
      statusEl.textContent = this.state.isConnected ? 'Connected' : 'Disconnected';
      indicatorEl.className = `status-indicator ${this.state.isConnected ? 'status-connected' : 'status-disconnected'}`;
    }

    // Capture count
    const countEl = document.getElementById('capture-count');
    if (countEl) {
      countEl.textContent = this.state.captureCount.toString();
    }

    // Last sync
    const syncEl = document.getElementById('last-sync');
    if (syncEl) {
      syncEl.textContent = this.state.lastSync 
        ? this.formatRelativeTime(this.state.lastSync)
        : 'Never';
    }

    // Capture button state
    const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
    if (captureBtn) {
      const canCapture = this.state.isConnected && this.isLinkedInProfile();
      captureBtn.disabled = !canCapture;
      captureBtn.textContent = canCapture 
        ? 'Capture Current Profile'
        : this.isLinkedInProfile() 
          ? 'Connect Dashboard First'
          : 'Navigate to LinkedIn Profile';
    }
  }

  private isLinkedInProfile(): boolean {
    return this.state.currentTab?.url?.includes('linkedin.com/in/') || false;
  }

  private async checkCurrentTab() {
    if (!this.state.currentTab) return;

    // Check if we're on a LinkedIn profile page
    if (this.isLinkedInProfile()) {
      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.state.currentTab.id! },
          files: ['content-script.js']
        });
      } catch (error) {
        console.log('Content script already injected or failed to inject');
      }
    }
  }

  private async triggerCapture() {
    if (!this.state.currentTab?.id) return;

    try {
      const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
      captureBtn.textContent = 'Capturing...';
      captureBtn.disabled = true;

      await chrome.tabs.sendMessage(this.state.currentTab.id, {
        type: 'TRIGGER_CAPTURE'
      });

      // Update capture count
      this.state.captureCount++;
      await chrome.storage.local.set({ totalCaptured: this.state.captureCount });
      
      captureBtn.textContent = 'Captured!';
      setTimeout(() => {
        captureBtn.textContent = 'Capture Current Profile';
        captureBtn.disabled = false;
        this.updateUI();
      }, 2000);

    } catch (error) {
      console.error('Capture failed:', error);
      const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
      captureBtn.textContent = 'Capture Failed';
      setTimeout(() => {
        captureBtn.textContent = 'Capture Current Profile';
        captureBtn.disabled = false;
      }, 2000);
    }
  }

  private formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager().init();
});
```

## Features

### Automatic Profile Detection
- Detects LinkedIn profile pages automatically
- Extracts comprehensive profile data
- Calculates extraction confidence scores
- Handles various LinkedIn page layouts

### Seamless Dashboard Integration
- Direct API integration with Sales AI dashboard
- Real-time sync with retry mechanisms
- Automatic lead creation and scoring
- Failure handling with offline storage

### User Experience
- One-click capture with visual feedback
- Non-intrusive floating button design
- Status notifications and progress updates
- Comprehensive settings and configuration

### Reliability
- Robust error handling and recovery
- Automatic retry for failed captures
- Periodic sync for offline captures
- Version compatibility checking

This LinkedIn extension provides sales teams with a powerful tool to quickly capture and process LinkedIn profiles directly into their Sales AI dashboard with minimal friction and maximum reliability.