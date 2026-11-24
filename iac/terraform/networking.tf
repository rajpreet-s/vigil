resource "google_compute_global_address" "ingress_ip" {
  project = var.project_id
  name    = "vigil-static-ip"
}

output "ingress_ip_address" {
  value = google_compute_global_address.ingress_ip.address
}