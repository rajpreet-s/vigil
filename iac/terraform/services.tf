locals {
  services = [
    "compute.googleapis.com",              # Compute Engine (required for GKE networking)
    "container.googleapis.com",            # Kubernetes Engine API
    "artifactregistry.googleapis.com",     # Artifact Registry API
    "cloudresourcemanager.googleapis.com", # Resource Manager (for IAM)
    "iam.googleapis.com"                   # Identity & Access Management
  ]
}

resource "google_project_service" "enabled_services" {
  for_each                   = toset(local.services)
  project                    = var.project_id
  service                    = each.key
  disable_on_destroy         = false
  disable_dependent_services = false
}