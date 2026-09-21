output "artifact_registry_url" {
  description = "Docker push/pull URL prefix for Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_name}"
}

output "gke_connect_command" {
  description = "Command to connect kubectl to your GKE cluster"
  value       = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}

output "workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "deployer_service_account_email" {
  description = "Service Account email for GitHub Actions"
  value       = google_service_account.github_deployer.email
}
