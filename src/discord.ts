import * as path from 'path';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { GameServer } from '.';
import { DiscordStateMachine } from './discord-state-machine';
import { DiscordBotCustomResource } from './discord_bot_custom_resource';

export interface DiscordBotProps {
  /**
   * The game servers that the discord bot will manage
   */
  readonly gameServers: GameServer[];

  /**
   * The name of the slash command that will appear in Discord. For example: `/servers start [server-name]` or `/satifactory status [server-name]`
   */
  readonly commandName: string;

  /**
   * @see https://github.com/raykrueger/cdk-game-server#setting-up-discord}
   */
  readonly secretName: string;
}

/**
 * Runs a server-less Discord bot that manages Game Servers
 */
export class DiscordBot extends Construct {
  constructor(scope: Construct, id: string, props: DiscordBotProps) {
    super(scope, id);

    const secret = Secret.fromSecretNameV2(this, 'SecretLookup', props.secretName);

    const serviceNames = props.gameServers.map(server => server.service.serviceName);

    new DiscordBotCustomResource(this, 'DiscordBotSetup', {
      commandName: props.commandName,
      serviceNames,
      secret,
    });

    const clusterArns = props.gameServers.map(server => server.cluster.clusterArn);
    const serviceArns = props.gameServers.map(server => server.service.serviceArn);

    const f = new Function(this, 'DiscordBotFunction', {
      runtime: Runtime.PYTHON_3_9,
      code: Code.fromAsset(path.join(__dirname, '../resources/functions/discord'), {
        bundling: {
          image: Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
        },
      }),
      handler: 'discord.handler',
      environment: {
        CLUSTER_ARN: clusterArns.toString(),
        SERVICE_ARN: serviceArns.toString(),
        SECRET_NAME: secret.secretName,
      },
    });

    props.gameServers.forEach(function (gameServer) {
      f.addToRolePolicy(new PolicyStatement({
        actions: ['ecs:DescribeServices', 'ecs:UpdateService'],
        resources: [gameServer.service.serviceArn],
      }));
    });

    secret.grantRead(f);

    new ApiGatewayToLambda(this, 'DiscordBotListener', {
      existingLambdaObj: f,
      apiGatewayProps: {
        defaultMethodOptions: {
          authorizationType: AuthorizationType.NONE,
        },
      },
    });

    const dsm = new DiscordStateMachine(this, 'DiscordBotStateMachine', {
      gameServers: props.gameServers,
      discordSecret: secret,
    });

    dsm.stateMachine.grantStartExecution(f);
    f.addEnvironment('STATE_MACHINE', dsm.stateMachine.stateMachineArn);
  }
}