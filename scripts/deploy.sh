#!/bin/bash

# Run database migrations
echo "Running database migrations..."
yarn prisma migrate deploy

# Set up admin user if not exists
echo "Setting up admin user..."
yarn setup-admin

# Build the application
echo "Building application..."
yarn build

# Start the application
echo "Starting application..."
yarn start
