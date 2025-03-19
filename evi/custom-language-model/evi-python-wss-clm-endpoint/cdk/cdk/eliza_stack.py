import aws_cdk as cdk
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecs_patterns as ecs_patterns
from aws_cdk.aws_ecr_assets import DockerImageAsset
import os


class ElizaStack(cdk.Stack):
    # https://medium.com/@jolodev/demystifying-aws-cdks-ecs-pattern-e58315972544
    def __init__(self, scope: cdk.App, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        image = DockerImageAsset(
            self,
            "BackendImage",
            directory=os.path.join(os.path.dirname(__file__), "..", ".."),
        )

        vpc = ec2.Vpc(self, "ApplicationVpc", max_azs=2)

        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)

        ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            "ApplicationFargateService",
            cluster=cluster,
            cpu=256,
            desired_count=1,
            task_image_options={
                "image": ecs.ContainerImage.from_docker_image_asset(image),
                "container_port": 8000,
            },
            memory_limit_mib=512,
            public_load_balancer=True,
        )

        cdk.CfnOutput(self, "LoadBalancerDNS", value=cluster.cluster_name)
