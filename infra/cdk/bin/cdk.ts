#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { BastionStack } from '../lib/bastion-stack';
import { StatefulStack } from '../lib/stateful-stack';
import { StatelessStack } from '../lib/stateless-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const stateful = new StatefulStack(app, 'CompassStateful', { env });

new StatelessStack(app, 'CompassStateless', {
  env,
  vpc: stateful.vpc,
  database: stateful.database,
  databaseSecret: stateful.databaseSecret,
  dbSecurityGroup: stateful.dbSecurityGroup,
});

new BastionStack(app, 'CompassBastion', {
  env,
  vpc: stateful.vpc,
  dbSecurityGroup: stateful.dbSecurityGroup,
});
