variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "project-60bff6c1-455a-4a5c-b3d"
}

variable "region" {
  description = "The GCP region to deploy resources in"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "The name of the GKE cluster"
  type        = string
  default     = "web-cluster"
}

variable "repository_name" {
  description = "The name of the Artifact Registry repository"
  type        = string
  default     = "vigil-repo"
}