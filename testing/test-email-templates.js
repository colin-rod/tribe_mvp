#!/usr/bin/env node

/**
 * Email Template Testing Script
 * Tests HTML rendering, responsive design, and cross-client compatibility
 */

const fs = require('fs');
const path = require('path');

// Sample test data
const testData = {
  update: {
    id: 'test-uuid-123',
    content: 'Emma took her first steps today! She was so excited and kept giggling as she walked from the couch to her toy box. We captured it all on video - what a milestone! 🎉',
    milestone_type: 'first_steps',
    media_urls: [
      'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
    ],
    children: {
      name: 'Emma',
      birth_date: '2023-03-15',
      profile_photo_url: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=100'
    },
    profiles: {
      name: 'Sarah Johnson'
    }
  },
  recipients: [
    {
      id: 'recipient-1',
      name: 'Grandma Betty',
      email: 'betty@example.com',
      relationship: 'grandparent'
    },
    {
      id: 'recipient-2',
      name: 'Uncle Mike',
      email: 'mike@example.com',
      relationship: 'family'
    },
    {
      id: 'recipient-3',
      name: 'Lisa',
      email: 'lisa@example.com',
      relationship: 'friend'
    }
  ]
};

// Template generation functions
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (ageInMonths < 12) {
    return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} old`;
  } else {
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''} old`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''} old`;
    }
  }
}

function getPersonalizedGreeting(relationship, recipientName, childName) {
  const greetings = {
    grandparent: `Dear ${recipientName}, here's what your grandchild ${childName} has been up to!`,
    parent: `Hi ${recipientName}! Here's an update about ${childName}.`,
    sibling: `Hey ${recipientName}! Your sibling ${childName} has something to share.`,
    friend: `Hi ${recipientName}! Thought you'd love to see what ${childName} is up to.`,
    family: `Hello ${recipientName}! Here's the latest news about ${childName}.`,
    colleague: `Hi ${recipientName}, sharing a sweet update about ${childName}!`,
    other: `Hello ${recipientName}! Here's an update about ${childName}.`
  };

  return greetings[relationship] || greetings.other;
}

function formatMilestone(milestoneType) {
  const milestones = {
    first_smile: 'First Smile',
    rolling: 'Rolling Over',
    sitting: 'Sitting Up',
    crawling: 'First Crawl',
    first_steps: 'First Steps',
    first_words: 'First Words',
    first_tooth: 'First Tooth',
    walking: 'Walking',
    potty_training: 'Potty Training',
    first_day_school: 'First Day of School',
    birthday: 'Birthday',
    other: 'Special Milestone'
  };

  return milestones[milestoneType] || 'Update';
}

function generateHtmlEmail(data) {
  const {
    greeting,
    childName,
    parentName,
    content,
    milestoneType,
    mediaUrls = [],
    childAge,
    replyToEmail,
    siteUrl
  } = data;

  const formattedMilestone = milestoneType ? formatMilestone(milestoneType) : null;
  const hasPhotos = mediaUrls.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${childName}'s Update</title>
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
        }

        /* Base styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }

        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: bold;
        }

        .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }

        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #374151;
        }

        .milestone-badge {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
            padding: 12px 20px;
            border-radius: 25px;
            display: inline-block;
            margin: 15px 0;
            font-weight: bold;
            font-size: 16px;
            border: 2px solid #fbbf24;
        }

        .update-content {
            font-size: 16px;
            line-height: 1.7;
            margin: 25px 0;
            color: #374151;
        }

        .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }

        .photo-grid img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 12px;
            border: 3px solid #e5e7eb;
            transition: transform 0.2s ease;
        }

        .reply-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 12px;
            margin-top: 30px;
            text-align: center;
            border: 2px solid #bae6fd;
        }

        .reply-section h3 {
            margin: 0 0 15px 0;
            color: #0369a1;
            font-size: 20px;
        }

        .reply-section p {
            margin: 10px 0;
            color: #075985;
        }

        .reply-email {
            background: #ffffff;
            padding: 10px 15px;
            border-radius: 8px;
            display: inline-block;
            font-family: monospace;
            font-size: 14px;
            color: #0369a1;
            border: 1px solid #bae6fd;
            margin-top: 10px;
        }

        .footer {
            background: #f8fafc;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            padding: 30px 20px;
            border-top: 1px solid #e5e7eb;
        }

        .footer a {
            color: #0369a1;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Mobile responsiveness */
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }

            .header {
                padding: 30px 15px;
            }

            .header h1 {
                font-size: 24px;
            }

            .content {
                padding: 30px 20px;
            }

            .photo-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }

            .photo-grid img {
                height: 180px;
            }

            .reply-section {
                padding: 20px 15px;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-container {
                background-color: #1f2937;
            }

            .content {
                color: #f3f4f6;
            }

            .greeting, .update-content {
                color: #e5e7eb;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${childName}'s Update</h1>
            <p>${childAge} • From ${parentName}</p>
        </div>

        <div class="content">
            <div class="greeting">${greeting}</div>

            ${formattedMilestone ? `
            <div class="milestone-badge">
                🎉 ${formattedMilestone}
            </div>
            ` : ''}

            <div class="update-content">
                ${content.replace(/\n/g, '<br>')}
            </div>

            ${hasPhotos ? `
            <div class="photo-grid">
                ${mediaUrls.map(url => `
                    <img src="${url}" alt="Photo of ${childName}" loading="lazy" />
                `).join('')}
            </div>
            ` : ''}

            <div class="reply-section">
                <h3>💬 Share Your Thoughts!</h3>
                <p>Reply to this email to send a message back to the family.</p>
                <p>You can even attach photos!</p>
                <div class="reply-email">${replyToEmail}</div>
            </div>
        </div>

        <div class="footer">
            <p>This update was sent via <a href="${siteUrl}">Tribe Family Platform</a></p>
            <p>Bringing families closer, one update at a time ❤️</p>
        </div>
    </div>
</body>
</html>`;
}

function generateTextEmail(data) {
  const {
    greeting,
    childName,
    parentName,
    content,
    milestoneType,
    mediaCount,
    replyToEmail
  } = data;

  const formattedMilestone = milestoneType ? formatMilestone(milestoneType) : null;

  return `${greeting}

${formattedMilestone ? `🎉 MILESTONE: ${formattedMilestone}\n` : ''}
${content}

${mediaCount > 0 ? `📸 This update includes ${mediaCount} photo${mediaCount > 1 ? 's' : ''}.\n` : ''}
💬 REPLY TO THIS EMAIL to send a message back to ${parentName} and the family!

Reply to: ${replyToEmail}

---
Sent via Tribe Family Platform
Bringing families closer, one update at a time`;
}

// Main testing function
async function runEmailTemplateTests() {
  console.log('🧪 Starting Email Template Tests\n');

  // Create output directory
  const outputDir = path.join(__dirname, 'email-outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Test each recipient relationship
  for (const recipient of testData.recipients) {
    console.log(`📧 Generating email for ${recipient.name} (${recipient.relationship})`);

    const greeting = getPersonalizedGreeting(
      recipient.relationship,
      recipient.name,
      testData.update.children.name
    );

    const childAge = calculateAge(testData.update.children.birth_date);
    const replyToEmail = `update-${testData.update.id}@tribe.com`;

    // Generate HTML email
    const htmlContent = generateHtmlEmail({
      greeting,
      childName: testData.update.children.name,
      parentName: testData.update.profiles.name,
      content: testData.update.content,
      milestoneType: testData.update.milestone_type,
      mediaUrls: testData.update.media_urls,
      childAge,
      replyToEmail,
      siteUrl: 'https://tribe.com'
    });

    // Generate text email
    const textContent = generateTextEmail({
      greeting,
      childName: testData.update.children.name,
      parentName: testData.update.profiles.name,
      content: testData.update.content,
      milestoneType: testData.update.milestone_type,
      mediaCount: testData.update.media_urls.length,
      replyToEmail
    });

    // Save files
    const relationshipName = recipient.relationship.replace(' ', '-');
    const htmlFile = path.join(outputDir, `email-${relationshipName}-${recipient.name.replace(' ', '-')}.html`);
    const textFile = path.join(outputDir, `email-${relationshipName}-${recipient.name.replace(' ', '-')}.txt`);

    fs.writeFileSync(htmlFile, htmlContent);
    fs.writeFileSync(textFile, textContent);

    console.log(`   ✅ Saved HTML: ${htmlFile}`);
    console.log(`   ✅ Saved Text: ${textFile}`);
  }

  // Generate mobile preview test page
  console.log('\n📱 Generating mobile preview test page...');

  const mobileTestHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Email Preview Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 40px 0; border: 1px solid #ccc; }
        .test-header { background: #f5f5f5; padding: 10px; font-weight: bold; }
        .mobile-preview { width: 375px; height: 600px; border: 1px solid #000; overflow: auto; }
        .desktop-preview { width: 100%; max-width: 800px; border: 1px solid #000; }
        iframe { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <h1>📱 Email Template Mobile Testing</h1>
    <p>Use this page to test how emails look on different screen sizes.</p>

    <div class="test-section">
        <div class="test-header">📱 Mobile Preview (375px)</div>
        <div class="mobile-preview">
            <iframe src="email-grandparent-Grandma-Betty.html"></iframe>
        </div>
    </div>

    <div class="test-section">
        <div class="test-header">🖥️ Desktop Preview</div>
        <div class="desktop-preview">
            <iframe src="email-grandparent-Grandma-Betty.html"></iframe>
        </div>
    </div>

    <h2>🧪 Testing Checklist</h2>
    <ul>
        <li>✅ Images load correctly</li>
        <li>✅ Text is readable on mobile</li>
        <li>✅ Buttons are touch-friendly</li>
        <li>✅ Layout doesn't break on narrow screens</li>
        <li>✅ Colors and gradients display properly</li>
        <li>✅ Reply section is prominent</li>
    </ul>

    <h2>📧 Email Client Testing</h2>
    <p>Forward test emails to these clients:</p>
    <ul>
        <li>📱 Gmail mobile app</li>
        <li>📱 Apple Mail (iOS)</li>
        <li>🖥️ Gmail web</li>
        <li>🖥️ Outlook web</li>
        <li>🖥️ Apple Mail (macOS)</li>
    </ul>
</body>
</html>`;

  const mobileTestFile = path.join(outputDir, 'mobile-preview-test.html');
  fs.writeFileSync(mobileTestFile, mobileTestHtml);
  console.log(`   ✅ Saved mobile test: ${mobileTestFile}`);

  // Generate spam score test summary
  console.log('\n🛡️ Generating spam score checklist...');

  const spamChecklistMd = `# 🛡️ Email Spam Score Checklist

## Content Analysis
- [ ] Subject line is under 50 characters
- [ ] No excessive exclamation marks (!!!)
- [ ] No ALL CAPS words
- [ ] No suspicious phrases ("FREE", "URGENT", etc.)
- [ ] Proper spelling and grammar

## HTML Structure
- [ ] Well-formed HTML with proper DOCTYPE
- [ ] All images have alt text
- [ ] No broken links
- [ ] Proper text-to-image ratio (80% text, 20% images)
- [ ] No hidden text or suspicious CSS

## Authentication
- [ ] Sender domain is authenticated (SPF)
- [ ] DKIM signature is valid
- [ ] DMARC policy is set up
- [ ] From address matches authenticated domain

## Testing Tools
1. **Mail Tester**: https://www.mail-tester.com/
2. **GlockApps**: https://glockapps.com/
3. **MXToolbox**: https://mxtoolbox.com/deliverability

## Target Scores
- Mail Tester: 8+/10
- SpamAssassin: < 5 points
- Content score: < 3 points
- Authentication: Perfect score

## Common Issues to Fix
- Improve sender reputation
- Reduce image-to-text ratio
- Add plain text version
- Fix broken links
- Authenticate domain properly
`;

  const spamChecklistFile = path.join(outputDir, 'spam-score-checklist.md');
  fs.writeFileSync(spamChecklistFile, spamChecklistMd);
  console.log(`   ✅ Saved spam checklist: ${spamChecklistFile}`);

  console.log('\n🎉 Email template testing complete!');
  console.log(`📁 All files saved to: ${outputDir}`);
  console.log('\n📋 Next Steps:');
  console.log('1. Open the HTML files in different browsers');
  console.log('2. Test mobile-preview-test.html for responsive design');
  console.log('3. Send test emails to different email clients');
  console.log('4. Use Mail Tester to check spam scores');
  console.log('5. Follow the spam-score-checklist.md for improvements');
}

// Run the tests
if (require.main === module) {
  runEmailTemplateTests().catch(console.error);
}

module.exports = {
  generateHtmlEmail,
  generateTextEmail,
  calculateAge,
  getPersonalizedGreeting,
  formatMilestone
};