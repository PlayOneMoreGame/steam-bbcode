#########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

# Copyright (C) 2024 One More Game - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

data "terraform_remote_state" "infra" {
  backend = "azurerm"

  config = {
    resource_group_name  = "rg-tf-root"
    storage_account_name = "omgtfroot"
    container_name       = "tfstate"
    key                  = "core-infrastructure.environments.dev.tfstate"
  }
}

variable "buildserver" {
  description = "Whether or not the terraform run is happening on a build server."
  type        = bool
  default     = false
}

module "const" {
  source = "git@github.com:PlayOneMoreGame/terraform-modules//const?ref=v1.0.0"
}
