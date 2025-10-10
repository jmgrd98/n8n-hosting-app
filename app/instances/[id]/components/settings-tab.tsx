import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface SettingsInstance {
  name: string;
  monitoring?: {
    metricsEnabled: boolean;
    logsRetention: number;
    alertsEnabled: boolean;
  };
}

interface SettingsTabProps {
  instance: SettingsInstance;
  onDelete: () => void;
}

export function SettingsTab({ instance, onDelete }: SettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Settings</CardTitle>
        <CardDescription>
          Configure your n8n instance settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">Monitoring</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Metrics</p>
                <p className="text-sm text-gray-600">Collect performance metrics</p>
              </div>
              <Badge>{instance.monitoring?.metricsEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Alerts</p>
                <p className="text-sm text-gray-600">Receive notifications for issues</p>
              </div>
              <Badge>{instance.monitoring?.alertsEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Logs Retention</p>
                <p className="text-sm text-gray-600">How long to keep logs</p>
              </div>
              <Badge>{instance.monitoring?.logsRetention} days</Badge>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-3">Danger Zone</h4>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting an instance is permanent and cannot be undone. All data will be lost.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Instance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}