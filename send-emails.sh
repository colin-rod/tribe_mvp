# Your anon key
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Recipient UUID
RECIPIENT_UUID="7a1b7f77-4317-43aa-a952-619986c20b28"

# Update ID (can be the same or different for each email)
UPDATE_ID="421c157f-f4b6-435c-9317-36fa20a22270"

# Directory containing your HTML files
HTML_DIR="/Users/colinrodrigues/tribe_mvp/testing/email-outputs"

# Loop over all HTML files in the folder
for file in "$HTML_DIR"/*.html; do
  echo "Sending email for $file..."

  # Read the file content and escape quotes for JSON
  HTML_CONTENT=$(sed 's/"/\\"/g' "$file" | tr -d '\n')

  # Send the email
  curl -X POST 'http://127.0.0.1:54321/functions/v1/distribute-email' \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"update_id\": \"$UPDATE_ID\",
      \"recipient_ids\": [\"$RECIPIENT_UUID\"],
      \"html_content\": \"$HTML_CONTENT\"
    }"

  echo -e "\nDone.\n"
done
