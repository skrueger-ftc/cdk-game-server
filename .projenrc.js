const { awscdk } = require('projen');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Ray Krueger',
  authorAddress: 'raykrueger@gmail.com',
  cdkVersion: '2.69.0',
  defaultReleaseBranch: 'main',
  name: '@raykrueger/cdk-game-server',
  repositoryUrl: 'https://github.com/raykrueger/cdk-game-server.git',
  releaseToNpm: false,
  catalog: {
    announce: false,
    twitter: 'raykrueger',
  },

  deps: [
    '@aws-solutions-constructs/aws-apigateway-lambda',
    '@raykrueger/cdk-fargate-public-dns',
  ],
  bundledDeps: [
    '@matthewbonig/state-machine',
  ],
  devDeps: [
    '@types/node',
  ],

  /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  eslintOptions: {
    ignorePatterns: ['test/'],
  },

});
project.synth();