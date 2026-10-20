let
  pinned = (builtins.fromJSON (builtins.readFile ./.nixpkgs-version.json)).nixpkgs;
  nixpkgs = import (builtins.fetchGit { inherit (pinned) url rev ref; }) { };
in
{ pkgs ? nixpkgs }:
with pkgs;
mkShell {
  buildInputs = [
    bash
    cacert
    curl
    git
    git-lfs
    github-cli
    jq
    nodejs
    shellcheck
    shfmt
  ];
}
