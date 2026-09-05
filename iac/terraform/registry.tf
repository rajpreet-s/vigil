resource "google_artifact_registry_repository" "vigil_repo" {
  depends_on    = [google_project_service.enabled_services]
  location      = var.region
  repository_id = var.repository_name
  description   = "Docker repository for Vigil microservices (API, Agent, Web)"
  format        = "DOCKER"
}
