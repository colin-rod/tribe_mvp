// Inline Image Processing for Email Webhook
// Add this to your email-processing.ts file

/**
 * Processes inline images from email HTML content
 * Extracts cid: references, uploads images to storage, and updates HTML with public URLs
 */
export async function processInlineImages(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<{ updatedHtml: string; mediaUrls: string[] }> {
  console.log('=== INLINE IMAGE PROCESSING DEBUG: Starting ===')

  let updatedHtml = emailData.html || ''
  const mediaUrls: string[] = []

  if (!updatedHtml || !updatedHtml.includes('cid:')) {
    console.log('No inline images found in HTML content')
    return { updatedHtml, mediaUrls }
  }

  console.log('HTML contains cid: references, processing...')

  // Find all cid: references in the HTML
  const cidMatches = updatedHtml.match(/src="cid:([^"]+)"/g)
  if (!cidMatches) {
    console.log('No cid: matches found in regex')
    return { updatedHtml, mediaUrls }
  }

  console.log('Found CID references:', cidMatches)

  // Process each cid: reference
  for (const cidMatch of cidMatches) {
    const cidValue = cidMatch.match(/cid:([^"]+)/)?.[1]
    if (!cidValue) continue

    console.log(`Processing CID: ${cidValue}`)

    // Find the corresponding attachment by content-id
    let matchingAttachment: AttachmentInfo | null = null
    let attachmentFilename = ''

    for (const [filename, attachment] of Object.entries(emailData.attachment_info || {})) {
      console.log(`Checking attachment "${filename}":`, {
        contentId: attachment['content-id'],
        targetCid: cidValue
      })

      if (attachment['content-id'] === cidValue) {
        matchingAttachment = attachment
        attachmentFilename = filename
        break
      }
    }

    if (!matchingAttachment) {
      console.log(`❌ No attachment found for CID: ${cidValue}`)
      continue
    }

    console.log(`✓ Found matching attachment: ${attachmentFilename}`)

    // Upload the inline image
    const publicUrl = await uploadAttachmentToStorage(matchingAttachment, parentId, supabase)

    if (publicUrl) {
      console.log(`✅ Uploaded inline image: ${publicUrl}`)

      // Replace the cid: reference with the public URL
      updatedHtml = updatedHtml.replace(cidMatch, `src="${publicUrl}"`)
      mediaUrls.push(publicUrl)

      console.log(`Updated HTML: replaced ${cidMatch} with src="${publicUrl}"`)
    } else {
      console.log(`❌ Failed to upload inline image for CID: ${cidValue}`)
    }
  }

  console.log('=== INLINE IMAGE PROCESSING DEBUG: Completed ===')
  console.log(`Processed ${mediaUrls.length} inline images`)
  console.log('Final media URLs:', mediaUrls)

  return { updatedHtml, mediaUrls }
}

/**
 * Enhanced processEmailAttachments that handles both regular attachments and inline images
 */
export async function processEmailAttachmentsAndInlineImages(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<{ mediaUrls: string[]; updatedHtml: string }> {
  console.log('=== ENHANCED ATTACHMENT PROCESSING: Starting ===')

  const allMediaUrls: string[] = []

  // 1. Process regular attachments (non-inline)
  const regularAttachments = await processEmailAttachments(emailData, parentId, supabase)
  allMediaUrls.push(...regularAttachments)

  console.log(`Regular attachments processed: ${regularAttachments.length}`)

  // 2. Process inline images from HTML
  const { updatedHtml, mediaUrls: inlineImageUrls } = await processInlineImages(emailData, parentId, supabase)
  allMediaUrls.push(...inlineImageUrls)

  console.log(`Inline images processed: ${inlineImageUrls.length}`)

  console.log('=== ENHANCED ATTACHMENT PROCESSING: Completed ===')
  console.log(`Total media URLs: ${allMediaUrls.length}`)

  return {
    mediaUrls: allMediaUrls,
    updatedHtml: updatedHtml
  }
}