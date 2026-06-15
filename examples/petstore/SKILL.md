---
name: petstore
description: Interact with the Swagger Petstore API to manage pets and inventory. Use for retrieving pets by status, ID, managing inventory, and placing orders.
---

# Petstore

Interact with the Swagger Petstore API to manage pets and inventory.

## Setup

1. Create an account at https://petstore.swagger.io/v2  
2. Use the API key `special-key` for test purposes.  
3. Add to your shell profile (`~/.profile` or `~/.zprofile` for zsh):  

```bash
export PETSTORE_API_KEY="special-key"
```

## Find Pets by Status

```bash
{baseDir}/find-pets-by-status.sh "available"  # Find pets that are available
{baseDir}/find-pets-by-status.sh "pending"    # Find pets that are pending
```

### Options
- Accepts multiple statuses as comma-separated values.

## Find Pet by ID

```bash
{baseDir}/find-pet-by-id.sh "1"  # Get pet details by ID
```

### Options
- Requires pet ID as an argument.

## Get Store Inventory

```bash
{baseDir}/get-store-inventory.sh  # Retrieve store inventory
```

## Add a New Pet

```bash
{baseDir}/add-new-pet.sh '{"id": 0, "name": "Doggie", "status": "available"}'  # Add a new pet to the store
```

### Options
- Requires a JSON object representing the pet to be added.
- Generated from spec, not live-verified (mutating operation).

## Place an Order

```bash
{baseDir}/place-order.sh '{"petId": 1, "quantity": 1, "shipDate": "2023-10-13T00:00:00Z", "status": "placed", "complete": true}'  # Place an order for a pet
```

### Options
- Requires a JSON object representing the order to be placed.
- Generated from spec, not live-verified (mutating operation).

## Output Format

The API typically returns a JSON object with details based on the operation:
- Pets returned have details such as `id`, `name`, and `status`.
- Inventory returns a JSON object indicating quantities of each pet status.
- Adding pets and placing orders return confirmation messages.