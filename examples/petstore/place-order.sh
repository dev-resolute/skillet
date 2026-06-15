#!/bin/bash

# Check for input
if [ -z "$1" ]; then
    echo "Usage: $0 '<order object in JSON>'"
    exit 1
fi

ORDER_DATA="$1"

API_URL="https://petstore.swagger.io/v2/store/order"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA"
