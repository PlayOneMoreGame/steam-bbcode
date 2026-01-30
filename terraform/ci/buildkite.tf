#########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

# Copyright (C) 2022 One More Game - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

resource "buildkite_pipeline" "this" {
  name                                     = "steam-bbcode"
  repository                               = github_repository.this.ssh_clone_url
  branch_configuration                     = "!wip-*"
  cancel_intermediate_builds               = true
  cancel_intermediate_builds_branch_filter = "!main"
  default_branch                           = "main"
  skip_intermediate_builds                 = true
  skip_intermediate_builds_branch_filter   = "main"
  steps                                    = <<EOH
steps:
  - command: "buildkite-agent pipeline upload .buildkite/pipelines/main.yml"
    label: ":pipeline:"
    env:
      USE_DEVCONTAINER: false
    agents:
      os: linux
EOH
}

resource "buildkite_pipeline_team" "omg" {
  pipeline_id  = buildkite_pipeline.this.id
  team_id      = data.terraform_remote_state.buildkite.outputs.omg_team_id
  access_level = "BUILD_AND_READ"
}
