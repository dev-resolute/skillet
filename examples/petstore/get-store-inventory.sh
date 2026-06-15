#!/bin/bash

API_URL="https://petstore.swagger.io/v2/store/inventory"

curl -X GET "$API_URL" \
  -H "Content-Type: application/json"
