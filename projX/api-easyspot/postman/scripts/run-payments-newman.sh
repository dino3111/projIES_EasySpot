#!/bin/bash
newman run ../EasySpot_Stripe_Payments.postman_collection.json \
    --env-var baseUrl=http://localhost:8080 \
    --env-var token=your_mock_token \
    --env-var reservationId=$(uuidgen)
