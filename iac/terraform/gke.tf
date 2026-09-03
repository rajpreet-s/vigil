resource "google_container_cluster" "primary" {
  name             = var.cluster_name
  location         = var.region
  enable_autopilot = true

  # Wait until all APIs are enabled before creating the cluster
  depends_on = [google_project_service.enabled_services]

  # Clean up default node pool on creation
  ip_allocation_policy {}

  # Protect against accidental deletion in production
  deletion_protection = false
}
