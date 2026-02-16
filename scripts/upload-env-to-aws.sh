#!/bin/bash

# Script to upload environment variables to AWS Systems Manager Parameter Store
# Usage: ./upload-env-to-aws.sh [path-to-env-file]

set -e

# Configuration
PROFILE="${AWS_PROFILE:-default}"
REGION="${AWS_REGION:-ap-south-1}"
ENV="${NODE_ENV:-production}"
PREFIX="/travel-hub/$ENV"
ENV_FILE="${1:-.env}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  AWS Parameter Store Environment Upload Tool          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Environment: ${GREEN}$ENV${NC}"
echo -e "  AWS Region: ${GREEN}$REGION${NC}"
echo -e "  AWS Profile: ${GREEN}$PROFILE${NC}"
echo -e "  Parameter Prefix: ${GREEN}$PREFIX${NC}"
echo -e "  Source File: ${GREEN}$ENV_FILE${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: Environment file '$ENV_FILE' not found!${NC}"
  exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}Error: AWS CLI is not installed!${NC}"
  exit 1
fi

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity --profile "$PROFILE" --region "$REGION" &> /dev/null; then
  echo -e "${RED}Error: Invalid AWS credentials!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ AWS credentials validated${NC}"
echo ""

# Counter for uploaded parameters
SUCCESS_COUNT=0
ERROR_COUNT=0

# Read .env file and upload to Parameter Store
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Trim whitespace
  key=$(echo "$key" | xargs)
  
  # Remove quotes from value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | xargs)
  
  # Skip if value is empty
  [[ -z "$value" ]] && continue
  
  # Determine if it's a secret (contains sensitive data)
  if [[ "$key" =~ (PASSWORD|SECRET|KEY|TOKEN|PRIVATE|CREDENTIALS|API_KEY) ]]; then
    PARAM_TYPE="SecureString"
    echo -e "${YELLOW}Uploading SECRET:${NC} $PREFIX/$key"
  else
    PARAM_TYPE="String"
    echo -e "${GREEN}Uploading PARAMETER:${NC} $PREFIX/$key"
  fi
  
  # Upload to Parameter Store
  if aws ssm put-parameter \
    --name "$PREFIX/$key" \
    --value "$value" \
    --type "$PARAM_TYPE" \
    --overwrite \
    --profile "$PROFILE" \
    --region "$REGION" \
    --tags "Key=Environment,Value=$ENV" "Key=ManagedBy,Value=Script" &> /dev/null; then
    echo -e "${GREEN}  ✓ Successfully uploaded${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}  ✗ Failed to upload${NC}"
    ((ERROR_COUNT++))
  fi
  
done < "$ENV_FILE"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Upload Summary                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "  ${GREEN}Successful:${NC} $SUCCESS_COUNT parameters"
echo -e "  ${RED}Failed:${NC} $ERROR_COUNT parameters"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All environment variables uploaded successfully!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some parameters failed to upload. Please check the errors above.${NC}"
  exit 1
fi
