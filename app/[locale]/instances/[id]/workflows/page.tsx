// app/)/instances/[id]/workflows/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
  Plus,
  ExternalLink,
  Trash2,
  GitBranch,
  Zap,
  Clock,
} from 'lucide-react';

// Import types
import type {
  ApiKey,
  GeneratedWorkflow,
  WorkflowListItem,
  Instance,
} from '@/types/n8n';
import {
  WORKFLOW_TEMPLATES,
  CATEGORY_COLORS,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from '@/lib/workflow-templates';

export default function AIWorkflowGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations('workflows');
  const tc = useTranslations('common');

  const instanceId = params.id as string;

  // State with proper typing
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | 'All'>('All');

  // Example prompts
  const examplePrompts: string[] = [
    t('examplePrompt1'),
    t('examplePrompt2'),
    t('examplePrompt3'),
    t('examplePrompt4'),
    t('examplePrompt5'),
  ];

  const fetchApiKeys = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/api-keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
        if (data.apiKeys?.length > 0) {
          setSelectedApiKeyId(data.apiKeys[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  const fetchInstance = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/instances/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        setInstance(data.instance);
      }
    } catch (error) {
      console.error('Error fetching instance:', error);
    }
  }, [instanceId]);

  const fetchWorkflows = useCallback(async (): Promise<void> => {
    if (!selectedApiKeyId) return;

    try {
      const response = await fetch(`/api/instances/${instanceId}/workflows`, {
        headers: {
          'X-API-Key-ID': selectedApiKeyId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  }, [instanceId, selectedApiKeyId]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchInstance();
      fetchApiKeys();
      fetchWorkflows();
    }
  }, [session, sessionStatus, instanceId, router, fetchInstance, fetchApiKeys, fetchWorkflows]);

  const handleGenerateWorkflow = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError(t('pleaseEnterDescription'));
      return;
    }

    if (!selectedApiKeyId) {
      setError(t('pleaseSelectApiKey'));
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    setGeneratedWorkflow(null);

    try {
      const response = await fetch(`/api/instances/${instanceId}/generate-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          apiKeyId: selectedApiKeyId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate workflow');
      }

      const data = await response.json();
      setGeneratedWorkflow(data.workflow);
      setSuccess(t('workflowGeneratedSuccess'));
    } catch (error) {
      console.error('Error generating workflow:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate workflow');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateWorkflow = async (): Promise<void> => {
    if (!generatedWorkflow) return;

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      console.log('Creating workflow in n8n...', {
        instanceId,
        apiKeyId: selectedApiKeyId,
        workflowName: generatedWorkflow.name,
      });

      const response = await fetch(`/api/instances/${instanceId}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': selectedApiKeyId,
        },
        body: JSON.stringify({
          workflow: generatedWorkflow,
          originalPrompt: prompt,
        }),
      });

      const data = await response.json();
      console.log('Response from API:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create workflow');
      }

      setSuccess(
        data.message ||
        t('workflowCreatedSuccess', { name: generatedWorkflow.name })
      );

      // Clear the generated workflow
      setGeneratedWorkflow(null);
      setPrompt('');

      // Refresh the workflows list
      await fetchWorkflows();

      // Scroll to workflows section
      setTimeout(() => {
        const workflowsSection = document.getElementById('workflows-list');
        workflowsSection?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } catch (error) {
      console.error('Error creating workflow:', error);

      // More detailed error messages
      let errorMessage = t('failedToCreateWorkflow');

      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = t('invalidApiKey');
        } else if (error.message.includes('404')) {
          errorMessage = t('instanceNotFound');
        } else if (error.message.includes('URL not available')) {
          errorMessage = t('instanceNotRunning');
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, workflowName: string): Promise<void> => {
    if (!confirm(t('confirmDelete', { name: workflowName }))) return;

    setError('');

    try {
      console.log('Deleting workflow:', workflowId);

      const response = await fetch(
        `/api/instances/${instanceId}/workflows/${workflowId}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key-ID': selectedApiKeyId,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete workflow');
      }

      setSuccess(t('workflowDeletedSuccess', { name: workflowName }));
      await fetchWorkflows();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete workflow');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/instances/${instanceId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToInstance')}
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* API Key Check */}
        {apiKeys.length === 0 ? (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('noApiKeys')}</AlertTitle>
            <AlertDescription>
              {t('noApiKeysDescription')}{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push(`/instances/${instanceId}?tab=api-keys`)}
              >
                {t('addApiKey')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Status Messages */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Templates Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Workflow Templates</h2>
                  <p className="text-sm text-gray-600">Deploy a pre-built workflow to your instance in one click.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={templateCategory === 'All' ? 'default' : 'outline'}
                    onClick={() => setTemplateCategory('All')}
                  >
                    All
                  </Button>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={templateCategory === cat ? 'default' : 'outline'}
                      onClick={() => setTemplateCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WORKFLOW_TEMPLATES
                  .filter(tpl => templateCategory === 'All' || tpl.category === templateCategory)
                  .map((tpl) => (
                    <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-tight">{tpl.name}</CardTitle>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${CATEGORY_COLORS[tpl.category]}`}>
                            {tpl.category}
                          </span>
                        </div>
                        <CardDescription className="text-xs">{tpl.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={!selectedApiKeyId}
                          onClick={() => {
                            setGeneratedWorkflow({
                              name: tpl.name,
                              description: tpl.description,
                              nodes: tpl.nodes,
                              connections: tpl.connections,
                              settings: tpl.settings,
                            } as GeneratedWorkflow);
                            setSuccess('');
                            setError('');
                            setTimeout(() => {
                              document.getElementById('generated-workflow-preview')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Generator Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  {t('generateWorkflow')}
                </CardTitle>
                <CardDescription>
                  {t('describeAutomation')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Key Selection */}
                <div className="space-y-2">
                  <Label htmlFor="api-key">{t('n8nApiKey')}</Label>
                  <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectApiKey')} />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">{t('whatToAutomate')}</Label>
                  <Textarea
                    id="prompt"
                    placeholder={t('promptPlaceholder')}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    disabled={generating}
                  />
                </div>

                {/* Example Prompts */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t('tryExamples')}</p>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(example)}
                        disabled={generating}
                        className="text-xs"
                      >
                        {example.substring(0, 50)}...
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateWorkflow}
                  disabled={generating || !prompt.trim() || !selectedApiKeyId}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('generatingWithAI')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('generateWorkflow')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Workflow Preview */}
            {generatedWorkflow && (
              <Card id="generated-workflow-preview" className="mb-8 border-purple-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        {t('generatedWorkflow')}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {t('reviewAndDeploy')}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleCreateWorkflow}
                      disabled={creating}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('creating')}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          {t('createInN8n')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
        <h3 className="font-semibold text-lg mb-1">
          {typeof generatedWorkflow.name === 'string'
            ? generatedWorkflow.name
            : t('generatedWorkflow')}
        </h3>
        <p className="text-gray-600">
          {typeof generatedWorkflow.description === 'string'
            ? generatedWorkflow.description
            : 'AI-generated workflow'}
        </p>
      </div>

      {/* Only show structure if nodes is an array and has items */}
      {Array.isArray(generatedWorkflow.nodes) && generatedWorkflow.nodes.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            {t('workflowStructure', { count: generatedWorkflow.nodes.length })}
          </h4>
          <div className="space-y-2">
            {generatedWorkflow.nodes.map((node, index) => {
              // Safely extract node properties
              const nodeName = node?.name || node?.parameters?.name || `Node ${index + 1}`;
              const nodeType = node?.type || 'Unknown';
              const nodeId = node?.id || index;

              return (
                <div key={nodeId} className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">
                    {String(nodeName)}
                  </span>
                  <span className="text-gray-500">
                    ({String(nodeType)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
        <pre>{JSON.stringify(generatedWorkflow, null, 2)}</pre>
      </div>
    </CardContent>
  </Card>
)}

            {/* Existing Workflows */}
            <Card id="workflows-list">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('yourWorkflows')}</CardTitle>
                    <CardDescription>
                      {t('workflowCount', { count: workflows.length })}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={fetchWorkflows} size="sm">
                    <Loader2 className="w-4 h-4 mr-2" />
                    {tc('refresh')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {workflows.length === 0 ? (
                  <div className="text-center py-12">
                    <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">{t('noWorkflows')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workflows.map((workflow) => (
                      <div key={workflow.id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{workflow.name}</h3>
                              <Badge variant={workflow.active ? 'default' : 'secondary'}>
                                {workflow.active ? t('active') : t('inactive')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <GitBranch className="w-4 h-4" />
                                {t('nodes', { count: workflow.nodes })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {t('updated', { date: new Date(workflow.updatedAt).toLocaleDateString() })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`${instance?.access?.url}/workflow/${workflow.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
