variable "aws_region" {
  description = "AWS region. Must be us-east-1 because the CloudFront ACM cert lives here."
  type        = string
  default     = "us-east-1"
}

variable "stage" {
  description = "Deployment stage (used in resource names and the SSM parameter path)."
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Apex domain served by CloudFront."
  type        = string
  default     = "chooseyourprotocol.com"
}

variable "site_bucket_name" {
  description = "S3 bucket holding the built React site."
  type        = string
  default     = "chooseyourprotocol.com"
}

variable "lambda_zip" {
  description = "Path to the prebuilt Lambda function package (code only — deps live in the layer)."
  type        = string
  default     = "../lambda-package.zip"
}

variable "layer_zip" {
  description = "Path to the prebuilt Lambda dependencies layer zip."
  type        = string
  default     = "../lambda-layer.zip"
}
