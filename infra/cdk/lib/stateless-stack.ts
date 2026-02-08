import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface StatelessStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
  databaseSecret: secretsmanager.ISecret;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class StatelessStack extends cdk.Stack {
  public readonly repository: ecr.Repository;
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props: StatelessStackProps) {
    super(scope, id, props);

    const { vpc, database, databaseSecret, dbSecurityGroup } = props;

    // ECR repository
    this.repository = new ecr.Repository(this, 'Repo', {
      repositoryName: 'compass-cloud',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: 'Keep last 10 images',
        },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'compass',
    });

    // Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    // Build DATABASE_URL from secret fields
    const dbHost = database.dbInstanceEndpointAddress;
    const dbPort = database.dbInstanceEndpointPort;

    const container = taskDef.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'compass',
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        DB_HOST: dbHost,
        DB_PORT: dbPort,
        DB_NAME: 'compass',
        DB_SSLMODE: 'no-verify',
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(databaseSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseSecret, 'password'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'JwtSecret', {
            secretName: 'compass/jwt-secret',
            generateSecretString: {
              excludePunctuation: true,
              passwordLength: 64,
            },
          })
        ),
      },
      portMappings: [{ containerPort: 3000 }],
      healthCheck: {
        command: ['CMD-SHELL', 'wget -q --spider http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // ECS Service security group
    const serviceSg = new ec2.SecurityGroup(this, 'ServiceSg', {
      vpc,
      description: 'Security group for ECS service',
    });

    // Allow ECS -> RDS (CfnSecurityGroupIngress avoids cross-stack cyclic ref)
    new ec2.CfnSecurityGroupIngress(this, 'DbIngressFromEcs', {
      groupId: dbSecurityGroup.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      sourceSecurityGroupId: serviceSg.securityGroupId,
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // ECS Fargate Service
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 2,
      securityGroups: [serviceSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    // ALB Listener + Target Group
    const listener = alb.addListener('HttpListener', {
      port: 80,
    });

    const targetGroup = listener.addTargets('EcsTargets', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Auto-scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup,
    });

    // Outputs
    this.albDnsName = alb.loadBalancerDnsName;

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'EcrRepoUri', {
      value: this.repository.repositoryUri,
    });
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });
    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
    });
  }
}
