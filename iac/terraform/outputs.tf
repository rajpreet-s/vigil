output "artifact_registry_url" {
  description = "Docker push/pull URL prefix for Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_name}"
}

output "gke_connect_command" {
  description = "Command to connect kubectl to your GKE cluster"
  value       = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}
