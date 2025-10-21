#!/bin/bash

# Script to quickly change the test recipient email address

if [ -z "$1" ]; then
    echo "Usage: $0 <email-address>"
    echo "Examples:"
    echo "  $0 colin.rods@gmail.com"
    echo "  $0 test-ocfgm2x23@srv1.mail-tester.com"
    exit 1
fi

EMAIL=$1
echo "Setting test recipient email to: $EMAIL"

psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
UPDATE recipients
SET email = '$EMAIL'
WHERE id = '7a1b7f77-4317-43aa-a952-619986c20b28';

SELECT 'Updated recipient:', name, email FROM recipients WHERE id = '7a1b7f77-4317-43aa-a952-619986c20b28';
"

echo ""
echo "Test recipient email updated to: $EMAIL"
echo "Run ./scripts/legacy/test-with-real-data.sh to send test email"
