#########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BIN_DIR := $(ROOT_DIR)/bin
SRC_DIR := $(ROOT_DIR)/src
TF_DIR := $(ROOT_DIR)/terraform

CORES ?= $(shell sysctl -n hw.ncpu || echo 4)

.DEFAULT_GOAL := list
.ONESHELL:

###############################################################################
#                                  Templates                                  #
###############################################################################
update-templates:
	@cd $(ROOT_DIR)
	omg update
	omg proj
	omg env

###############################################################################
#                                   Build                                     #
###############################################################################
ci:
	npm ci --quiet --no-progress

clean:
	$(BIN_DIR)/clean

build:
	$(BIN_DIR)/build

test:
	$(BIN_DIR)/test

package:
	mkdir -p pkg
	tar zcf "pkg/steam_bbcode.tar.gz" dist

pipeline-pull:
	mkdir -p pkg
	buildkite-agent artifact download "pkg/steam_bbcode.tar.gz" pkg/
	cat "pkg/steam_bbcode.tar.gz" | tar -xzf - -i

###############################################################################
#                                 Terraform                                   #
###############################################################################
tf-ci: tf-ci-init
	@cd $(TF_DIR)/ci
	terraform plan

tf-ci-init:
	@cd $(TF_DIR)/ci
	terraform init

tf-ci-apply: tf-ci-init
	@cd $(TF_DIR)/ci
	terraform apply -auto-approve

tf-ci-upgrade:
	@cd $(TF_DIR)/ci
	terraform init -upgrade

tf-ci-output:
	@cd $(TF_DIR)/ci
	@terraform output -json

###############################################################################
#                                  Deploy                                     #
###############################################################################
deploy:
	aws s3 sync "$(ROOT_DIR)/dist" "s3://$${AWS_S3_BUCKET}/" --delete
	@if [ -n "$${AWS_CLOUDFRONT_DIST_ID:-}" ]; then \
		echo "Invalidating CloudFront distribution $${AWS_CLOUDFRONT_DIST_ID}..."; \
		aws cloudfront create-invalidation --distribution-id "$${AWS_CLOUDFRONT_DIST_ID}" --paths "/*"; \
	fi

###############################################################################
#                            Terraform (staging)                              #
###############################################################################
tf-staging: tf-staging-init
	@cd $(TF_DIR)/environments/staging
	terraform plan

tf-staging-init:
	@cd $(TF_DIR)/environments/staging
	terraform init

tf-staging-apply: tf-staging-init
	@cd $(TF_DIR)/environments/staging
	terraform apply -auto-approve

tf-staging-upgrade:
	@cd $(TF_DIR)/environments/staging
	terraform init -upgrade

tf-staging-bootstrap: tf-staging-upgrade
	@cd $(TF_DIR)/environments/staging
	terraform apply -auto-approve

###############################################################################
#                             Terraform (live)                                #
###############################################################################
tf-live: tf-live-init
	@cd $(TF_DIR)/environments/live
	terraform plan

tf-live-init:
	@cd $(TF_DIR)/environments/live
	terraform init

tf-live-apply: tf-live-init
	@cd $(TF_DIR)/environments/live
	terraform apply -auto-approve

tf-live-upgrade:
	@cd $(TF_DIR)/environments/live
	terraform init -upgrade

tf-live-bootstrap: tf-live-upgrade
	@cd $(TF_DIR)/environments/live
	terraform apply -auto-approve

###############################################################################
#                                 Utilities                                   #
###############################################################################

# https://stackoverflow.com/a/26339924/11547115
.PHONY: list
list:
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$'

