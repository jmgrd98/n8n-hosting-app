// // lib/security/isolation.ts
// export function generateTerraformConfig(instanceId: string) {
//   return {
//     vpc: {
//       cidr: calculateUniqueSubnet(instanceId),
//       enable_dns: true,
//       enable_nat: true
//     },
//     security_groups: [
//       {
//         name: `n8n-sg-${instanceId}`,
//         rules: [
//           {
//             type: 'ingress',
//             port: 5678,
//             protocol: 'tcp',
//             source: '0.0.0.0/0'  // Restrict this based on requirements
//           }
//         ]
//       }
//     ],
//     iam_role: {
//       name: `n8n-role-${instanceId}`,
//       policies: ['s3:limited', 'ses:send']  // Minimal required permissions
//     }
//   };
// }