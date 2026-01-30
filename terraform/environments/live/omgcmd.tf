#########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

# Copyright (C) 2022 One More Game - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tf-root"
    storage_account_name = "omgtfroot"
    container_name       = "tfstate"
    key                  = "steam-bbcode.environments.live.tfstate"
  }

  required_version = ">= 0.13"

  required_providers {
    acme = {
      source  = "vancluever/acme"
      version = "~> 2.20"
    }
    aws = {
      version = "~> 5.10"
    }
    rollbar = {
      source  = "rollbar/rollbar"
      version = "~> 1.15.0"
    }
  }
}

provider "acme" {
  server_url = "https://acme-v02.api.letsencrypt.org/directory"
}

provider "aws" {
  region  = "us-west-2"
  profile = var.use_assume_role ? null : "prod"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["prod"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["prod"]
      build_role_arn = module.const.build_role_arns["prod"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "us_east"
  region  = "us-east-1"
  profile = var.use_assume_role ? null : "prod"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["prod"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["prod"]
      build_role_arn = module.const.build_role_arns["prod"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "eu_north"
  region  = "eu-north-1"
  profile = var.use_assume_role ? null : "prod"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["prod"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["prod"]
      build_role_arn = module.const.build_role_arns["prod"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "core"
  region  = "us-west-2"
  profile = var.use_assume_role ? null : "core"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["core"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["core"]
      build_role_arn = module.const.build_role_arns["core"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "rollbar" {
  api_key = data.vault_generic_secret.rollbar.data["api_key"]
}

locals {
  project_name           = "steam-bbcode"
  project_description    = "Markdown to Steam BBCode editor with live preview"
  environment_name       = "live"
  infra_environment_name = "prod"
  assume_role_type       = var.buildserver ? "build_role_arn" : "admin_role_arn"

  tags = {
    Environment      = "live"
    InfraEnvironment = "prod"
    Project          = "steam-bbcode"
  }
}

module "const" {
  source = "git@github.com:PlayOneMoreGame/terraform-modules//const"
}

module "locals" {
  source = "./modules/locals"
}

variable "buildserver" {
  description = "Whether or not the terraform run is happening on a build server."
  type        = bool
  default     = false
}

variable "use_assume_role" {
  description = "Whether or not to assume_role in AWS providers or just use current AWS login context."
  type        = bool
  default     = false
}
