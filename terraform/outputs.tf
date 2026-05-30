output "site_url" {
  description = "Primary site URL."
  value       = "https://${var.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation on deploy)."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.site.domain_name
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "api_endpoint" {
  description = "Direct API Gateway endpoint (CloudFront also proxies it at /api/*)."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}
