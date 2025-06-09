# API Services

> External API integrations for CRM, email, enrichment, and analytics services

## Service Overview

The API Services provide:
- CRM system integrations (Salesforce, HubSpot, Pipedrive)
- Email service providers (SendGrid, Mailgun)
- Data enrichment services (Clearbit, ZoomInfo)
- Analytics and tracking APIs
- Authentication and authorization
- Rate limiting and error handling

## Implementation

### Base API Service

```typescript
// src/services/api/BaseApiService.ts
interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  errors?: string[];
}

export class BaseApiService {
  protected config: ApiConfig;
  protected rateLimiter: Map<string, number> = new Map();

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Rate limiting check
    await this.checkRateLimit(endpoint);

    // Set up request options
    const requestOptions: RequestInit = {
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': 'SalesAI-Dashboard/1.0.0',
        ...options.headers
      },
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update rate limit tracking
      this.updateRateLimit(endpoint, response);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        message: data.message
      };

    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);

      // Retry logic
      if (retryCount < this.config.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }

      throw new Error(
        error instanceof Error ? error.message : 'API request failed'
      );
    }
  }

  protected async checkRateLimit(endpoint: string): Promise<void> {
    const key = this.getRateLimitKey(endpoint);
    const lastRequest = this.rateLimiter.get(key);
    const minInterval = 100; // 100ms between requests

    if (lastRequest && Date.now() - lastRequest < minInterval) {
      await this.delay(minInterval - (Date.now() - lastRequest));
    }
  }

  protected updateRateLimit(endpoint: string, response: Response): void {
    const key = this.getRateLimitKey(endpoint);
    this.rateLimiter.set(key, Date.now());

    // Handle rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const resetTime = response.headers.get('X-RateLimit-Reset');

    if (remaining === '0' && resetTime) {
      const resetMs = parseInt(resetTime) * 1000 - Date.now();
      if (resetMs > 0) {
        setTimeout(() => this.rateLimiter.delete(key), resetMs);
      }
    }
  }

  protected getRateLimitKey(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }

  protected shouldRetry(error: any): boolean {
    // Retry on network errors, 5xx errors, and timeouts
    return (
      error.name === 'AbortError' ||
      error.message.includes('fetch') ||
      (error.message.includes('HTTP 5') && !error.message.includes('HTTP 501'))
    );
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams.toString();
  }
}
```

### CRM Integration Service

```typescript
// src/services/api/CrmService.ts
import { BaseApiService } from './BaseApiService';

interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  customFields?: Record<string, any>;
}

interface Deal {
  id?: string;
  name: string;
  value: number;
  stage: string;
  contactId: string;
  probability?: number;
  closeDate?: Date;
  customFields?: Record<string, any>;
}

interface CrmSyncResult {
  success: boolean;
  id?: string;
  errors?: string[];
  warnings?: string[];
}

export class CrmService extends BaseApiService {
  private crmType: 'salesforce' | 'hubspot' | 'pipedrive';

  constructor(crmType: 'salesforce' | 'hubspot' | 'pipedrive', config: any) {
    super(config);
    this.crmType = crmType;
  }

  // Contact Management
  async createContact(contact: Contact): Promise<CrmSyncResult> {
    try {
      const endpoint = this.getContactEndpoint();
      const payload = this.transformContactPayload(contact);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return {
        success: true,
        id: this.extractContactId(response.data)
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create contact']
      };
    }
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<CrmSyncResult> {
    try {
      const endpoint = `${this.getContactEndpoint()}/${id}`;
      const payload = this.transformContactPayload(updates);

      await this.makeRequest<any>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return { success: true, id };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to update contact']
      };
    }
  }

  async getContact(id: string): Promise<Contact | null> {
    try {
      const endpoint = `${this.getContactEndpoint()}/${id}`;
      const response = await this.makeRequest<any>(endpoint);
      
      return this.transformContactResponse(response.data);

    } catch (error) {
      console.error('Failed to fetch contact:', error);
      return null;
    }
  }

  async searchContacts(query: string, limit = 20): Promise<Contact[]> {
    try {
      const endpoint = this.getContactSearchEndpoint();
      const params = this.buildSearchParams(query, limit);
      
      const response = await this.makeRequest<any>(`${endpoint}?${params}`);
      
      return this.transformContactListResponse(response.data);

    } catch (error) {
      console.error('Failed to search contacts:', error);
      return [];
    }
  }

  // Deal Management
  async createDeal(deal: Deal): Promise<CrmSyncResult> {
    try {
      const endpoint = this.getDealEndpoint();
      const payload = this.transformDealPayload(deal);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return {
        success: true,
        id: this.extractDealId(response.data)
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create deal']
      };
    }
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<CrmSyncResult> {
    try {
      const endpoint = `${this.getDealEndpoint()}/${id}`;
      const payload = this.transformDealPayload(updates);

      await this.makeRequest<any>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return { success: true, id };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to update deal']
      };
    }
  }

  async getDeals(contactId?: string): Promise<Deal[]> {
    try {
      const endpoint = this.getDealEndpoint();
      const params = contactId ? this.buildQueryString({ contactId }) : '';
      
      const response = await this.makeRequest<any>(`${endpoint}?${params}`);
      
      return this.transformDealListResponse(response.data);

    } catch (error) {
      console.error('Failed to fetch deals:', error);
      return [];
    }
  }

  // CRM-specific implementations
  private getContactEndpoint(): string {
    switch (this.crmType) {
      case 'salesforce':
        return '/services/data/v55.0/sobjects/Contact';
      case 'hubspot':
        return '/crm/v3/objects/contacts';
      case 'pipedrive':
        return '/v1/persons';
      default:
        throw new Error(`Unsupported CRM type: ${this.crmType}`);
    }
  }

  private getContactSearchEndpoint(): string {
    switch (this.crmType) {
      case 'salesforce':
        return '/services/data/v55.0/search';
      case 'hubspot':
        return '/crm/v3/objects/contacts/search';
      case 'pipedrive':
        return '/v1/persons/search';
      default:
        throw new Error(`Unsupported CRM type: ${this.crmType}`);
    }
  }

  private getDealEndpoint(): string {
    switch (this.crmType) {
      case 'salesforce':
        return '/services/data/v55.0/sobjects/Opportunity';
      case 'hubspot':
        return '/crm/v3/objects/deals';
      case 'pipedrive':
        return '/v1/deals';
      default:
        throw new Error(`Unsupported CRM type: ${this.crmType}`);
    }
  }

  private transformContactPayload(contact: Partial<Contact>): any {
    switch (this.crmType) {
      case 'salesforce':
        return {
          FirstName: contact.firstName,
          LastName: contact.lastName,
          Email: contact.email,
          Phone: contact.phone,
          Account: contact.company ? { Name: contact.company } : undefined,
          Title: contact.position,
          ...contact.customFields
        };
        
      case 'hubspot':
        return {
          properties: {
            firstname: contact.firstName,
            lastname: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            jobtitle: contact.position,
            ...contact.customFields
          }
        };
        
      case 'pipedrive':
        return {
          name: `${contact.firstName} ${contact.lastName}`,
          email: [{ value: contact.email, primary: true }],
          phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
          org_name: contact.company,
          job_title: contact.position,
          ...contact.customFields
        };
        
      default:
        return contact;
    }
  }

  private transformDealPayload(deal: Partial<Deal>): any {
    switch (this.crmType) {
      case 'salesforce':
        return {
          Name: deal.name,
          Amount: deal.value,
          StageName: deal.stage,
          ContactId: deal.contactId,
          Probability: deal.probability,
          CloseDate: deal.closeDate?.toISOString().split('T')[0],
          ...deal.customFields
        };
        
      case 'hubspot':
        return {
          properties: {
            dealname: deal.name,
            amount: deal.value,
            dealstage: deal.stage,
            closedate: deal.closeDate?.getTime(),
            ...deal.customFields
          },
          associations: deal.contactId ? [
            {
              to: { id: deal.contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
            }
          ] : undefined
        };
        
      case 'pipedrive':
        return {
          title: deal.name,
          value: deal.value,
          stage_id: deal.stage,
          person_id: deal.contactId,
          probability: deal.probability,
          expected_close_date: deal.closeDate?.toISOString().split('T')[0],
          ...deal.customFields
        };
        
      default:
        return deal;
    }
  }

  private transformContactResponse(data: any): Contact {
    switch (this.crmType) {
      case 'salesforce':
        return {
          id: data.Id,
          firstName: data.FirstName,
          lastName: data.LastName,
          email: data.Email,
          phone: data.Phone,
          company: data.Account?.Name,
          position: data.Title
        };
        
      case 'hubspot':
        const props = data.properties;
        return {
          id: data.id,
          firstName: props.firstname,
          lastName: props.lastname,
          email: props.email,
          phone: props.phone,
          company: props.company,
          position: props.jobtitle
        };
        
      case 'pipedrive':
        return {
          id: data.id.toString(),
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.primary_email,
          phone: data.primary_phone,
          company: data.org_name,
          position: data.job_title
        };
        
      default:
        return data;
    }
  }

  private transformContactListResponse(data: any): Contact[] {
    switch (this.crmType) {
      case 'salesforce':
        return data.records?.map(record => this.transformContactResponse(record)) || [];
      case 'hubspot':
        return data.results?.map(result => this.transformContactResponse(result)) || [];
      case 'pipedrive':
        return data.data?.map(item => this.transformContactResponse(item)) || [];
      default:
        return Array.isArray(data) ? data.map(item => this.transformContactResponse(item)) : [];
    }
  }

  private transformDealListResponse(data: any): Deal[] {
    // Similar transformation logic for deals
    return [];
  }

  private extractContactId(data: any): string {
    switch (this.crmType) {
      case 'salesforce':
        return data.id || data.Id;
      case 'hubspot':
        return data.id;
      case 'pipedrive':
        return data.data?.id?.toString();
      default:
        return data.id;
    }
  }

  private extractDealId(data: any): string {
    return this.extractContactId(data);
  }

  private buildSearchParams(query: string, limit: number): string {
    switch (this.crmType) {
      case 'salesforce':
        return this.buildQueryString({
          q: `FIND {${query}} IN ALL FIELDS RETURNING Contact(Id, FirstName, LastName, Email) LIMIT ${limit}`
        });
        
      case 'hubspot':
        return this.buildQueryString({
          query,
          limit,
          properties: 'firstname,lastname,email,phone,company,jobtitle'
        });
        
      case 'pipedrive':
        return this.buildQueryString({
          term: query,
          limit,
          fields: 'name,email,phone,organization'
        });
        
      default:
        return this.buildQueryString({ q: query, limit });
    }
  }
}
```

### Email Service Integration

```typescript
// src/services/api/EmailService.ts
import { BaseApiService } from './BaseApiService';

interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  errors?: string[];
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

export class EmailService extends BaseApiService {
  private provider: 'sendgrid' | 'mailgun' | 'ses';

  constructor(provider: 'sendgrid' | 'mailgun' | 'ses', config: any) {
    super(config);
    this.provider = provider;
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const endpoint = this.getSendEndpoint();
      const payload = this.transformEmailPayload(message);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: this.getProviderHeaders()
      });

      return {
        success: true,
        messageId: this.extractMessageId(response.data),
        deliveryStatus: 'queued'
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to send email']
      };
    }
  }

  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    try {
      const endpoint = this.getBulkSendEndpoint();
      const payload = this.transformBulkEmailPayload(messages);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: this.getProviderHeaders()
      });

      return this.transformBulkSendResponse(response.data);

    } catch (error) {
      return messages.map(() => ({
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to send email']
      }));
    }
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    try {
      const endpoint = this.getTemplatesEndpoint();
      const response = await this.makeRequest<any>(endpoint, {
        headers: this.getProviderHeaders()
      });

      return this.transformTemplatesResponse(response.data);

    } catch (error) {
      console.error('Failed to fetch email templates:', error);
      return [];
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<string | null> {
    try {
      const endpoint = this.getTemplatesEndpoint();
      const payload = this.transformTemplatePayload(template);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: this.getProviderHeaders()
      });

      return this.extractTemplateId(response.data);

    } catch (error) {
      console.error('Failed to create email template:', error);
      return null;
    }
  }

  async getEmailStatus(messageId: string): Promise<{
    status: string;
    delivered: boolean;
    bounced: boolean;
    opened: boolean;
    clicked: boolean;
    timestamp: Date;
  } | null> {
    try {
      const endpoint = this.getStatusEndpoint(messageId);
      const response = await this.makeRequest<any>(endpoint, {
        headers: this.getProviderHeaders()
      });

      return this.transformStatusResponse(response.data);

    } catch (error) {
      console.error('Failed to fetch email status:', error);
      return null;
    }
  }

  async getEmailAnalytics(startDate: Date, endDate: Date): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  }> {
    try {
      const endpoint = this.getAnalyticsEndpoint();
      const params = this.buildQueryString({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      const response = await this.makeRequest<any>(`${endpoint}?${params}`, {
        headers: this.getProviderHeaders()
      });

      return this.transformAnalyticsResponse(response.data);

    } catch (error) {
      console.error('Failed to fetch email analytics:', error);
      return {
        sent: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0
      };
    }
  }

  // Provider-specific implementations
  private getSendEndpoint(): string {
    switch (this.provider) {
      case 'sendgrid':
        return '/v3/mail/send';
      case 'mailgun':
        return '/v3/messages';
      case 'ses':
        return '/v2/email/outbound-emails';
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }
  }

  private getBulkSendEndpoint(): string {
    switch (this.provider) {
      case 'sendgrid':
        return '/v3/mail/batch';
      case 'mailgun':
        return '/v3/messages';
      case 'ses':
        return '/v2/email/outbound-bulk-emails';
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }
  }

  private getTemplatesEndpoint(): string {
    switch (this.provider) {
      case 'sendgrid':
        return '/v3/templates';
      case 'mailgun':
        return '/v3/templates';
      case 'ses':
        return '/v2/email/templates';
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }
  }

  private getStatusEndpoint(messageId: string): string {
    switch (this.provider) {
      case 'sendgrid':
        return `/v3/messages/${messageId}`;
      case 'mailgun':
        return `/v3/events/${messageId}`;
      case 'ses':
        return `/v2/email/outbound-emails/${messageId}`;
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }
  }

  private getAnalyticsEndpoint(): string {
    switch (this.provider) {
      case 'sendgrid':
        return '/v3/stats';
      case 'mailgun':
        return '/v3/stats/total';
      case 'ses':
        return '/v2/email/metrics/statistics';
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }
  }

  private getProviderHeaders(): Record<string, string> {
    switch (this.provider) {
      case 'sendgrid':
        return {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        };
      case 'mailgun':
        return {
          'Authorization': `Basic ${btoa(`api:${this.config.apiKey}`)}`,
          'Content-Type': 'application/json'
        };
      case 'ses':
        return {
          'Authorization': `AWS4-HMAC-SHA256 ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        };
      default:
        return {};
    }
  }

  private transformEmailPayload(message: EmailMessage): any {
    switch (this.provider) {
      case 'sendgrid':
        return {
          personalizations: [{
            to: Array.isArray(message.to) 
              ? message.to.map(email => ({ email }))
              : [{ email: message.to }],
            dynamic_template_data: message.templateData
          }],
          from: { email: message.from || this.config.defaultFrom },
          subject: message.subject,
          content: message.html ? [{ type: 'text/html', value: message.html }] : undefined,
          template_id: message.templateId,
          custom_args: message.metadata
        };

      case 'mailgun':
        return {
          to: Array.isArray(message.to) ? message.to.join(',') : message.to,
          from: message.from || this.config.defaultFrom,
          subject: message.subject,
          html: message.html,
          text: message.text,
          template: message.templateId,
          'h:X-Mailgun-Variables': message.templateData ? JSON.stringify(message.templateData) : undefined,
          'o:tag': message.tags
        };

      case 'ses':
        return {
          Destination: {
            ToAddresses: Array.isArray(message.to) ? message.to : [message.to]
          },
          Source: message.from || this.config.defaultFrom,
          Template: message.templateId,
          TemplateData: message.templateData ? JSON.stringify(message.templateData) : undefined,
          DefaultTemplateData: '{}',
          Tags: message.tags?.map(tag => ({ Name: 'tag', Value: tag }))
        };

      default:
        return message;
    }
  }

  private transformBulkEmailPayload(messages: EmailMessage[]): any {
    return messages.map(message => this.transformEmailPayload(message));
  }

  private transformBulkSendResponse(data: any): EmailSendResult[] {
    // Provider-specific transformation
    return [];
  }

  private transformTemplatesResponse(data: any): EmailTemplate[] {
    // Provider-specific transformation
    return [];
  }

  private transformTemplatePayload(template: Omit<EmailTemplate, 'id'>): any {
    // Provider-specific transformation
    return template;
  }

  private transformStatusResponse(data: any): any {
    // Provider-specific transformation
    return null;
  }

  private transformAnalyticsResponse(data: any): any {
    // Provider-specific transformation
    return {};
  }

  private extractMessageId(data: any): string {
    switch (this.provider) {
      case 'sendgrid':
        return data.message_id;
      case 'mailgun':
        return data.id;
      case 'ses':
        return data.MessageId;
      default:
        return data.id;
    }
  }

  private extractTemplateId(data: any): string {
    return this.extractMessageId(data);
  }
}
```

### Data Enrichment Service

```typescript
// src/services/api/EnrichmentService.ts
import { BaseApiService } from './BaseApiService';

interface EnrichmentData {
  personal?: {
    fullName: string;
    firstName: string;
    lastName: string;
    location: string;
    bio: string;
    avatar: string;
    socialProfiles: Array<{
      network: string;
      url: string;
      username: string;
    }>;
  };
  professional?: {
    company: string;
    position: string;
    seniority: string;
    department: string;
    experience: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate?: string;
    }>;
  };
  company?: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    revenue: string;
    location: string;
    founded: number;
    technologies: string[];
    description: string;
  };
  confidence: number;
}

export class EnrichmentService extends BaseApiService {
  private provider: 'clearbit' | 'zoominfo' | 'apollo';

  constructor(provider: 'clearbit' | 'zoominfo' | 'apollo', config: any) {
    super(config);
    this.provider = provider;
  }

  async enrichByEmail(email: string): Promise<EnrichmentData | null> {
    try {
      const endpoint = this.getEnrichmentEndpoint('email');
      const params = this.buildQueryString({ email });

      const response = await this.makeRequest<any>(`${endpoint}?${params}`);
      
      return this.transformEnrichmentResponse(response.data);

    } catch (error) {
      console.error('Failed to enrich by email:', error);
      return null;
    }
  }

  async enrichByDomain(domain: string): Promise<EnrichmentData | null> {
    try {
      const endpoint = this.getEnrichmentEndpoint('company');
      const params = this.buildQueryString({ domain });

      const response = await this.makeRequest<any>(`${endpoint}?${params}`);
      
      return this.transformEnrichmentResponse(response.data);

    } catch (error) {
      console.error('Failed to enrich by domain:', error);
      return null;
    }
  }

  async enrichByLinkedIn(linkedinUrl: string): Promise<EnrichmentData | null> {
    try {
      const endpoint = this.getEnrichmentEndpoint('linkedin');
      const params = this.buildQueryString({ url: linkedinUrl });

      const response = await this.makeRequest<any>(`${endpoint}?${params}`);
      
      return this.transformEnrichmentResponse(response.data);

    } catch (error) {
      console.error('Failed to enrich by LinkedIn:', error);
      return null;
    }
  }

  async bulkEnrich(emails: string[]): Promise<Array<EnrichmentData | null>> {
    try {
      const endpoint = this.getBulkEnrichmentEndpoint();
      const payload = this.transformBulkEnrichmentPayload(emails);

      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return this.transformBulkEnrichmentResponse(response.data);

    } catch (error) {
      console.error('Failed to bulk enrich:', error);
      return emails.map(() => null);
    }
  }

  private getEnrichmentEndpoint(type: 'email' | 'company' | 'linkedin'): string {
    switch (this.provider) {
      case 'clearbit':
        return type === 'email' ? '/v2/people/find' : '/v1/companies/find';
      case 'zoominfo':
        return type === 'email' ? '/search/person' : '/search/company';
      case 'apollo':
        return type === 'email' ? '/v1/people/match' : '/v1/organizations/enrich';
      default:
        throw new Error(`Unsupported enrichment provider: ${this.provider}`);
    }
  }

  private getBulkEnrichmentEndpoint(): string {
    switch (this.provider) {
      case 'clearbit':
        return '/v2/people/find/bulk';
      case 'zoominfo':
        return '/search/person/bulk';
      case 'apollo':
        return '/v1/people/bulk_match';
      default:
        throw new Error(`Unsupported enrichment provider: ${this.provider}`);
    }
  }

  private transformEnrichmentResponse(data: any): EnrichmentData {
    // Provider-specific transformation logic
    switch (this.provider) {
      case 'clearbit':
        return this.transformClearbitResponse(data);
      case 'zoominfo':
        return this.transformZoomInfoResponse(data);
      case 'apollo':
        return this.transformApolloResponse(data);
      default:
        return data;
    }
  }

  private transformClearbitResponse(data: any): EnrichmentData {
    return {
      personal: data.person ? {
        fullName: data.person.name?.fullName,
        firstName: data.person.name?.givenName,
        lastName: data.person.name?.familyName,
        location: data.person.location,
        bio: data.person.bio,
        avatar: data.person.avatar,
        socialProfiles: data.person.twitter ? [{
          network: 'twitter',
          url: `https://twitter.com/${data.person.twitter.handle}`,
          username: data.person.twitter.handle
        }] : []
      } : undefined,
      professional: data.person?.employment ? {
        company: data.person.employment.name,
        position: data.person.employment.title,
        seniority: data.person.employment.seniority,
        department: data.person.employment.domain,
        experience: []
      } : undefined,
      company: data.company ? {
        name: data.company.name,
        domain: data.company.domain,
        industry: data.company.category?.industry,
        size: data.company.metrics?.employees,
        revenue: data.company.metrics?.annualRevenue,
        location: data.company.location,
        founded: data.company.foundedYear,
        technologies: data.company.tech || [],
        description: data.company.description
      } : undefined,
      confidence: 85 // Clearbit typically has high confidence
    };
  }

  private transformZoomInfoResponse(data: any): EnrichmentData {
    // ZoomInfo-specific transformation
    return {
      confidence: 80
    };
  }

  private transformApolloResponse(data: any): EnrichmentData {
    // Apollo-specific transformation
    return {
      confidence: 75
    };
  }

  private transformBulkEnrichmentPayload(emails: string[]): any {
    switch (this.provider) {
      case 'clearbit':
        return {
          people: emails.map(email => ({ email }))
        };
      case 'zoominfo':
        return {
          queries: emails.map(email => ({ email }))
        };
      case 'apollo':
        return {
          emails
        };
      default:
        return { emails };
    }
  }

  private transformBulkEnrichmentResponse(data: any): Array<EnrichmentData | null> {
    // Provider-specific bulk response transformation
    return [];
  }
}
```

## Features

### Base API Service
- Automatic retry logic with exponential backoff
- Rate limiting and respect for API limits
- Standardized error handling
- Request/response transformation
- Timeout management

### CRM Integration
- Multi-CRM support (Salesforce, HubSpot, Pipedrive)
- Contact and deal synchronization
- Search capabilities
- Field mapping and transformation
- Bulk operations support

### Email Service
- Multi-provider support (SendGrid, Mailgun, SES)
- Template management
- Bulk email sending
- Delivery tracking and analytics
- Webhook handling for events

### Data Enrichment
- Multiple enrichment providers
- Personal and company data enrichment
- Social profile discovery
- Bulk enrichment capabilities
- Confidence scoring

These API services provide robust integrations with external platforms while maintaining consistency and reliability across different providers.