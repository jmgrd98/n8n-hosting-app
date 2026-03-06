export type TemplateCategory = 'Communication' | 'Automation' | 'Data' | 'Monitoring';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  nodes: object[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'webhook-to-slack',
    name: 'Webhook → Slack Notification',
    description: 'Receive an HTTP webhook and forward the payload as a Slack message to a channel.',
    category: 'Communication',
    nodes: [
      {
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          path: 'my-webhook',
          responseMode: 'onReceived',
          responseData: 'allEntries',
        },
      },
      {
        id: 'slack',
        name: 'Slack',
        type: 'n8n-nodes-base.slack',
        typeVersion: 1,
        position: [500, 300],
        parameters: {
          operation: 'postMessage',
          channel: '#general',
          text: '={{ $json.message || JSON.stringify($json) }}',
        },
      },
    ],
    connections: {
      Webhook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  },
  {
    id: 'scheduled-report',
    name: 'Scheduled Weekly Report',
    description: 'Every Monday at 9am, fetch data from an API and send an email summary.',
    category: 'Automation',
    nodes: [
      {
        id: 'schedule',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          rule: {
            interval: [{ field: 'weeks', daysOfWeek: [1], triggerAtHour: 9 }],
          },
        },
      },
      {
        id: 'http',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [500, 300],
        parameters: {
          url: 'https://api.example.com/report',
          method: 'GET',
        },
      },
      {
        id: 'email',
        name: 'Send Email',
        type: 'n8n-nodes-base.emailSend',
        typeVersion: 2,
        position: [750, 300],
        parameters: {
          toEmail: 'team@example.com',
          subject: 'Weekly Report - {{ $now.format("yyyy-MM-dd") }}',
          emailType: 'html',
          html: '<pre>{{ JSON.stringify($json, null, 2) }}</pre>',
        },
      },
    ],
    connections: {
      'Schedule Trigger': { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
      'HTTP Request': { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  },
  {
    id: 'github-to-notion',
    name: 'GitHub Issues → Notion',
    description: 'When a new GitHub issue is opened, automatically create a page in a Notion database.',
    category: 'Automation',
    nodes: [
      {
        id: 'github-trigger',
        name: 'GitHub Trigger',
        type: 'n8n-nodes-base.githubTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          owner: 'your-org',
          repository: 'your-repo',
          events: ['issues'],
        },
      },
      {
        id: 'notion',
        name: 'Notion',
        type: 'n8n-nodes-base.notion',
        typeVersion: 2,
        position: [500, 300],
        parameters: {
          operation: 'create',
          resource: 'databasePage',
          databaseId: 'your-database-id',
          title: '={{ $json.issue.title }}',
          propertiesUi: {
            propertyValues: [
              { key: 'Status', textValue: 'Open' },
              { key: 'URL', urlValue: '={{ $json.issue.html_url }}' },
            ],
          },
        },
      },
    ],
    connections: {
      'GitHub Trigger': { main: [[{ node: 'Notion', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  },
  {
    id: 'form-to-sheets',
    name: 'Form Submission → Google Sheets',
    description: 'Accept form submissions via webhook and append each row to a Google Sheet.',
    category: 'Data',
    nodes: [
      {
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          path: 'form-submit',
          responseMode: 'onReceived',
        },
      },
      {
        id: 'sheets',
        name: 'Google Sheets',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4,
        position: [500, 300],
        parameters: {
          operation: 'appendOrUpdate',
          documentId: 'your-spreadsheet-id',
          sheetName: 'Sheet1',
          columns: {
            mappingMode: 'autoMapInputData',
          },
        },
      },
    ],
    connections: {
      Webhook: { main: [[{ node: 'Google Sheets', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  },
  {
    id: 'rss-to-telegram',
    name: 'RSS Feed → Telegram',
    description: 'Poll an RSS feed every hour and send new articles to a Telegram chat.',
    category: 'Communication',
    nodes: [
      {
        id: 'schedule',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          rule: { interval: [{ field: 'hours', minutesInterval: 60 }] },
        },
      },
      {
        id: 'rss',
        name: 'RSS Feed Read',
        type: 'n8n-nodes-base.rssFeedRead',
        typeVersion: 1,
        position: [500, 300],
        parameters: { url: 'https://feeds.example.com/rss.xml' },
      },
      {
        id: 'telegram',
        name: 'Telegram',
        type: 'n8n-nodes-base.telegram',
        typeVersion: 1,
        position: [750, 300],
        parameters: {
          operation: 'sendMessage',
          chatId: 'your-chat-id',
          text: '📰 *{{ $json.title }}*\n{{ $json.link }}',
          additionalFields: { parse_mode: 'Markdown' },
        },
      },
    ],
    connections: {
      'Schedule Trigger': { main: [[{ node: 'RSS Feed Read', type: 'main', index: 0 }]] },
      'RSS Feed Read': { main: [[{ node: 'Telegram', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  },
  {
    id: 'uptime-monitor',
    name: 'Uptime Monitor',
    description: 'Check a URL every 5 minutes and send a Slack alert if it goes down.',
    category: 'Monitoring',
    nodes: [
      {
        id: 'schedule',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] },
        },
      },
      {
        id: 'http',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [500, 300],
        parameters: {
          url: 'https://your-site.com',
          method: 'GET',
          options: { timeout: 5000 },
          continueOnFail: true,
        },
      },
      {
        id: 'if',
        name: 'Check Status',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [750, 300],
        parameters: {
          conditions: {
            number: [{ value1: '={{ $json.statusCode }}', operation: 'notEqual', value2: 200 }],
          },
        },
      },
      {
        id: 'slack',
        name: 'Slack Alert',
        type: 'n8n-nodes-base.slack',
        typeVersion: 1,
        position: [1000, 200],
        parameters: {
          operation: 'postMessage',
          channel: '#alerts',
          text: '🚨 Site is DOWN! Status: {{ $json.statusCode ?? "unreachable" }}',
        },
      },
    ],
    connections: {
      'Schedule Trigger': { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
      'HTTP Request': { main: [[{ node: 'Check Status', type: 'main', index: 0 }]] },
      'Check Status': { main: [[{ node: 'Slack Alert', type: 'main', index: 0 }], []] },
    },
    settings: { executionOrder: 'v1' },
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Communication', 'Automation', 'Data', 'Monitoring'];

export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  Communication: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Automation:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Data:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Monitoring:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};
