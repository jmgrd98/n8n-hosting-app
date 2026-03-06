// components/create-instance-dialog.tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  AlertCircle, 
  Check,
  Cpu,
  HardDrive,
  Activity,
  // DollarSign,
  Info,
  Zap,
  Server,
  // Database
} from 'lucide-react';

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const INSTANCE_SIZES = [
  {
    id: 'small',
    name: 'Small',
    description: 'Perfect for testing and small workflows',
    cpu: '0.5 vCPU',
    memory: '1GB RAM',
    storage: '20GB',
    executions: '5,000/month',
    price: 49,
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Great for small teams',
    cpu: '1 vCPU',
    memory: '2GB RAM',
    storage: '50GB',
    executions: '20,000/month',
    price: 99,
  },
  {
    id: 'large',
    name: 'Large',
    description: 'For production workloads',
    cpu: '2 vCPU',
    memory: '4GB RAM',
    storage: '100GB',
    executions: '50,000/month',
    price: 199,
  },
  {
    id: 'xlarge',
    name: 'X-Large',
    description: 'Enterprise-grade performance',
    cpu: '4 vCPU',
    memory: '8GB RAM',
    storage: '200GB',
    executions: 'Unlimited',
    price: 399,
  },
];

const AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', flag: '🇺🇸' },
  { id: 'us-west-2', name: 'US West (Oregon)', flag: '🇺🇸' },
  { id: 'eu-west-1', name: 'EU (Ireland)', flag: '🇮🇪' },
  { id: 'eu-central-1', name: 'EU (Frankfurt)', flag: '🇩🇪' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵' },
  { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳' },
  { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷' },
];

const N8N_VERSIONS = [
  { id: 'latest', name: 'Latest (Recommended)', description: 'Always use the latest stable version' },
  { id: '1.37.0', name: 'v1.37.0', description: 'Latest stable release' },
  { id: '1.36.0', name: 'v1.36.0', description: 'Previous stable release' },
  { id: '1.35.0', name: 'v1.35.0', description: 'Legacy stable release' },
];

export function CreateInstanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInstanceDialogProps) {
  const router = useRouter();
  const t = useTranslations('createInstance');
  const tc = useTranslations('common');
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [instanceName, setInstanceName] = useState('');
  const [selectedSize, setSelectedSize] = useState('small');
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [selectedVersion, setSelectedVersion] = useState('latest');
  
  const handleCreate = async () => {
    if (!instanceName.trim()) {
      setError(t('pleaseEnterName'));
      return;
    }
    
    setCreating(true);
    setError('');
    
    try {
      const response = await fetch('/api/instances/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: instanceName,
          config: {
            size: selectedSize,
            region: selectedRegion,
            version: selectedVersion,
          },
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'PAYMENT_METHOD_REQUIRED') {
          setError(data.message);
          setCreating(false);
          return;
        }
        throw new Error(data.error || 'Failed to create instance');
      }
      
      const { instance } = await response.json();
      
      // Success
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setInstanceName('');
      setSelectedSize('small');
      setSelectedRegion('us-east-1');
      setSelectedVersion('latest');
      setStep(1);
      
      // Navigate to instance details
      router.push(`/instances/${instance.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };
  
  const selectedSizeDetails = INSTANCE_SIZES.find(s => s.id === selectedSize);
  const selectedRegionDetails = AWS_REGIONS.find(r => r.id === selectedRegion);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-2 my-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <div className={`w-20 h-1 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            3
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">{t('instanceName')}</Label>
              <Input
                id="name"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder={t('instanceNamePlaceholder')}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('instanceNameHint')}
              </p>
            </div>
            
            <div>
              <Label>{t('selectSize')}</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {INSTANCE_SIZES.map((size) => (
                  <Card
                    key={size.id}
                    className={`cursor-pointer transition-all ${
                      selectedSize === size.id 
                        ? 'border-orange-600 shadow-md' 
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedSize(size.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{t(`sizes.${size.id}.name`)}</CardTitle>
                        <Badge variant="secondary">${size.price}/mo</Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {t(`sizes.${size.id}.description`)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Cpu className="w-3 h-3" />
                        <span>{size.cpu}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Server className="w-3 h-3" />
                        <span>{size.memory}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <HardDrive className="w-3 h-3" />
                        <span>{size.storage}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Activity className="w-3 h-3" />
                        <span>{size.executions}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="region">{t('awsRegion')}</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      <span className="flex items-center gap-2">
                        <span>{region.flag}</span>
                        <span>{t(`regions.${region.id}`)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                {t('regionHint')}
              </p>
            </div>
            
            <div>
              <Label htmlFor="version">{t('n8nVersion')}</Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {N8N_VERSIONS.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      <div>
                        <div className="font-medium">{t(`versions.${version.id.replace(/\./g, '_')}.name`)}</div>
                        <div className="text-xs text-gray-500">{t(`versions.${version.id.replace(/\./g, '_')}.description`)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('deployNote')}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('reviewConfig')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">{t('instanceName')}</span>
                  <span className="font-medium">{instanceName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">{t('selectSize')}</span>
                  <span className="font-medium">{t(`sizes.${selectedSize}.name`)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">{t('awsRegion')}</span>
                  <span className="font-medium">
                    {selectedRegionDetails?.flag} {t(`regions.${selectedRegion}`)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">{t('n8nVersion')}</span>
                  <span className="font-medium">{t(`versions.${selectedVersion.replace(/\./g, '_')}.name`)}</span>
                </div>
                <div className="flex justify-between py-2 pt-4">
                  <span className="text-lg font-semibold">{t('monthlyCost')}</span>
                  <span className="text-lg font-bold text-orange-600">
                    ${selectedSizeDetails?.price}/month
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                {t('readyNote')}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={creating}
                >
                  {tc('previous')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                {tc('cancel')}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !instanceName.trim()}
                >
                  {tc('next')}
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('creatingInstance')}
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {t('createInstance')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}