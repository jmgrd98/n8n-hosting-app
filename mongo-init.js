// mongo-init.js
db = db.getSiblingDB('n8n_platform');

db.createUser({
  user: 'n8n_user',
  pwd: 'n8n_password',
  roles: [
    {
      role: 'readWrite',
      db: 'n8n_platform',
    },
  ],
});

// Create indexes for better performance
db.instances.createIndex({ userId: 1 });
db.instances.createIndex({ status: 1 });
db.instances.createIndex({ createdAt: -1 });
db.instances.createIndex({ 'config.region': 1 });

db.metrics.createIndex({ instanceId: 1, timestamp: -1 });
db.instance_logs.createIndex({ instanceId: 1, timestamp: -1 });
db.activity_logs.createIndex({ userId: 1, createdAt: -1 });
db.deployments.createIndex({ instanceId: 1 });
db.backups.createIndex({ instanceId: 1 });