# ########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

{ pkgs ? import ./default.nix { } }:
let
  nixpkgs = pkgs.nixpkgs;
  omgpkgs = pkgs.omgpkgs;
in with nixpkgs;
mkShell {
  buildInputs = [
    autoconf
    automake
    awscli2
    azure-storage-azcopy
    azure-cli
    bash
    cacert
    curl
    direnv
    docker-compose
    dos2unix
    ffmpeg
    git
    git-lfs
    github-cli
    glibcLocales
    gnumake
    haskellPackages.ShellCheck
    imagemagick
    jq
    libtool
    libpng
    nixfmt
    nix-prefetch-git
    nodejs
    pkg-config
    shfmt
    terraform
    unzip
    which
    wget
    zip
  ];
}
