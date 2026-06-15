#!/bin/bash

# Check for input
if [ -z "$1" ]; then
    echo "Usage: $0 '<pet object in JSON>'"
    exit 1
fi

PET_DATA="$1"

API_URL="https://petstore.swagger.io/v2/pet"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PET_DATA"
