terraform {
  required_version = ">= 1.3"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# Existing Route53 hosted zone for the domain (created by the registrar).
data "aws_route53_zone" "primary" {
  name         = "${var.domain_name}."
  private_zone = false
}
