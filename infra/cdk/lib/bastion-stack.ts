import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface BastionStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class BastionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BastionStackProps) {
    super(scope, id, props);

    const { vpc, dbSecurityGroup } = props;

    const bastionSg = new ec2.SecurityGroup(this, 'BastionSg', {
      vpc,
      description: 'Tailscale bastion, no inbound, all outbound',
      allowAllOutbound: true,
    });

    // Allow bastion to reach RDS
    new ec2.CfnSecurityGroupIngress(this, 'DbIngressFromBastion', {
      groupId: dbSecurityGroup.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      sourceSecurityGroupId: bastionSg.securityGroupId,
    });

    const role = new iam.Role(this, 'BastionRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    const tailscaleSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'TailscaleAuthKey', 'compass/tailscale-auth-key',
    );
    tailscaleSecret.grantRead(role);

    const bastion = new ec2.Instance(this, 'TailscaleBastion', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: bastionSg,
      role,
      associatePublicIpAddress: true,
    });

    bastion.addUserData(
      'yum install -y jq',
      'curl -fsSL https://tailscale.com/install.sh | sh',
      'TS_AUTH_KEY=$(aws secretsmanager get-secret-value --secret-id compass/tailscale-auth-key --region eu-west-2 --query SecretString --output text)',
      'echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-tailscale.conf',
      'echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.d/99-tailscale.conf',
      'sysctl -p /etc/sysctl.d/99-tailscale.conf',
      'tailscale up --authkey="$TS_AUTH_KEY" --advertise-routes=10.0.0.0/16 --hostname=compass-bastion',
    );

    new cdk.CfnOutput(this, 'BastionInstanceId', {
      value: bastion.instanceId,
    });
  }
}
