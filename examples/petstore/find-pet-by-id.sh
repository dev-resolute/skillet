#!/bin/bash

# Check for required arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <petId>"
    exit 1
fi

PET_ID="$1"

API_URL="https://petstore.swagger.io/v2/pet/$PET_ID"

curl -X GET "$API_URL" \
  -H "Content-Type: application/json"
