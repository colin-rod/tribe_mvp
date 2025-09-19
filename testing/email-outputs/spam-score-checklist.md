# 🛡️ Email Spam Score Checklist

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
