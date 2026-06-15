#!/bin/bash

# Check for required arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <status>"
    exit 1
fi

STATUS="$1"

API_URL="https://petstore.swagger.io/v2/pet/findByStatus"

curl -X GET "${API_URL}?status=${STATUS}" \
  -H "Content-Type: application/json"
