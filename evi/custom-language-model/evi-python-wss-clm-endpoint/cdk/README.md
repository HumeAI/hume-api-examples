# AWS CDK Definition for EVI CLM

This is the AWS CDK definition for the EVI CLM. It defines the infrastructure for the EVI CLM as a ECS Fargate service.

## Prerequisites

1. Install Docker.
2. Install the AWS CDK CLI. You can find instructions [here](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-python.html).
3. Create a virtual environment and install the required dependencies.
4. Configure your AWS credentials.
5. Install the AWS CLI.
6. Run `aws configure` to configure your AWS CLI.
7. Run `cdk bootstrap` to create the required resources in your AWS account.
8. Run 'cdk synth' to generate the CloudFormation template.
9. Run 'cdk deploy' to deploy the stack.

It will output the load balancer URL. You can access the CLM via `ws://<load_balancer_url>/ws`.