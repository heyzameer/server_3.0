#!/bin/bash

# Script to fetch environment variables from AWS Systems Manager Parameter Store
# Usage: ./fetch-env-from-aws.sh

set -e

# Configuration
REGION="${AWS_REGION:-ap-south-1}"
ENV="${NODE_ENV:-production}"
PREFIX="/travel-hub/$ENV"
OUTPUT_FILE=".env"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  AWS Parameter Store Environment Fetch Tool           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Environment: ${GREEN}$ENV${NC}"
echo -e "  AWS Region: ${GREEN}$REGION${NC}"
echo -e "  Parameter Prefix: ${GREEN}$PREFIX${NC}"
echo -e "  Output File: ${GREEN}$OUTPUT_FILE${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}Error: AWS CLI is not installed!${NC}"
  exit 1
fi

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
  echo -e "${RED}Error: Invalid AWS credentials!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ AWS credentials validated${NC}"
echo ""

# Backup existing .env file if it exists
if [ -f "$OUTPUT_FILE" ]; then
  BACKUP_FILE="${OUTPUT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}Backing up existing .env file to: $BACKUP_FILE${NC}"
  cp "$OUTPUT_FILE" "$BACKUP_FILE"
fi

# Fetch all parameters with the prefix
echo -e "${YELLOW}Fetching environment variables from AWS Parameter Store...${NC}"

# Create temporary file
TEMP_FILE=$(mktemp)

# Fetch parameters
if aws ssm get-parameters-by-path \
  --path "$PREFIX" \
  --with-decryption \
  --region "$REGION" \
  --query "Parameters[*].[Name,Value]" \
  --output text > "$TEMP_FILE" 2>/dev/null; then
  
  # Count parameters
  PARAM_COUNT=$(wc -l < "$TEMP_FILE")
  
  if [ "$PARAM_COUNT" -eq 0 ]; then
    echo -e "${RED}Error: No parameters found at path: $PREFIX${NC}"
    rm -f "$TEMP_FILE"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Found $PARAM_COUNT parameters${NC}"
  echo ""
  
  # Clear output file
  > "$OUTPUT_FILE"
  
  # Add header
  echo "# Environment variables fetched from AWS Parameter Store" >> "$OUTPUT_FILE"
  echo "# Generated at: $(date)" >> "$OUTPUT_FILE"
  echo "# Environment: $ENV" >> "$OUTPUT_FILE"
  echo "# Region: $REGION" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Process each parameter
  while read -r name value; do
    # Extract key name (remove prefix)
    key=$(echo "$name" | sed "s|$PREFIX/||")
    
    # Escape special characters in value
    value=$(echo "$value" | sed 's/"/\\"/g')
    
    # Write to .env file
    echo "$key=\"$value\"" >> "$OUTPUT_FILE"
    echo -e "${GREEN}  ✓${NC} $key"
  done < "$TEMP_FILE"
  
  # Clean up
  rm -f "$TEMP_FILE"
  
  echo ""
  echo -e "${GREEN}✓ Environment variables fetched and saved to $OUTPUT_FILE${NC}"
  echo -e "${YELLOW}Note: Make sure to keep this file secure and never commit it to version control!${NC}"
  
else
  echo -e "${RED}Error: Failed to fetch parameters from AWS Parameter Store${NC}"
  rm -f "$TEMP_FILE"
  exit 1
fi
