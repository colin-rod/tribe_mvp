'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import {
  ShieldCheckIcon,
  HeartIcon,
  UsersIcon,
  ChartBarIcon,
  LockClosedIcon,
  CheckIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import { useState } from 'react'
import { ConversionTracker, useConversionTracking } from '@/components/analytics/ConversionTracker'
import { SmoothScroll } from '@/components/ui/SmoothScroll'
import { LandingNavigation } from '@/components/navigation/LandingNavigation'
import { FadeUpSection, SlideLeftSection, SlideRightSection } from '@/components/ui/AnimatedSection'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    id: 'what-is-tribe',
    question: 'What is Tribe and how does it work?',
    answer: 'Tribe is a secure baby update app designed specifically for private family sharing. Unlike social media, Tribe creates a private, ad-free environment where you can share your baby\'s photos, milestones, and moments with only the people you choose. Your updates are automatically organized and shared with the right family members at the right time.'
  },
  {
    id: 'privacy-security',
    question: 'How secure is my baby\'s information on Tribe?',
    answer: 'Security is our top priority. Tribe is SOC 2 certified and uses bank-level encryption to protect your family\'s photos and information. Your data is never sold to advertisers, and only invited family members can see your updates. We\'re committed to keeping your precious moments private and secure.'
  },
  {
    id: 'family-sharing-app',
    question: 'Can distant family members easily stay connected?',
    answer: 'Absolutely! Tribe is designed to bridge the distance between family members. Grandparents, aunts, uncles, and other loved ones receive real-time notifications when you share new updates. They can comment, react, and feel connected to your baby\'s journey, no matter how far away they are.'
  },
  {
    id: 'milestone-tracking',
    question: 'Does Tribe help track baby milestones automatically?',
    answer: 'Yes! Tribe includes intelligent milestone tracking that helps you capture and remember important moments like first steps, first words, and growth milestones. Our app suggests milestone moments and helps organize them into a beautiful timeline you can treasure forever.'
  },
  {
    id: 'photo-sharing-limits',
    question: 'Are there limits on photos and storage?',
    answer: 'Tribe offers generous storage for your family photos and videos. You can share unlimited updates with your family circle, and all content is automatically backed up securely in the cloud. Your memories are safe and accessible whenever you need them.'
  },
  {
    id: 'group-communication',
    question: 'How does Tribe solve chaotic group texting?',
    answer: 'Tribe eliminates the chaos of group texts by creating organized, topic-specific conversations around your updates. Instead of scattered messages across multiple platforms, all family discussions about your baby happen in one secure, organized space that everyone can easily follow.'
  },
  {
    id: 'getting-started',
    question: 'How quickly can I start sharing with Tribe?',
    answer: 'Getting started with Tribe takes less than 2 minutes! Simply download the app, create your family circle by inviting your loved ones, and start sharing immediately. Our intuitive interface means you can begin creating memories right away, without any learning curve.'
  }
]

function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const { trackFaqOpened } = useConversionTracking()

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
        // Track FAQ interaction
        const question = faqItems.find(item => item.id === id)?.question || ''
        trackFaqOpened(question)
      }
      return newSet
    })
  }

  return (
    <section
      id="faq"
      className="py-16 lg:py-24 bg-white"
      aria-labelledby="faq-heading"
    >
      <Container>
        <div className="text-center mb-12">
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about sharing your baby's precious moments securely
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {faqItems.map((item) => {
            const isOpen = openItems.has(item.id)
            return (
              <Card key={item.id} className="mb-4 overflow-hidden">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 pr-8">
                      {item.question}
                    </h3>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200"
                  >
                    <p className="text-gray-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

function Home() {
  const { trackSignupStarted, trackDemoRequested, trackFeaturesExplored } = useConversionTracking()

  return (
    <>
      <LandingNavigation />
      <SmoothScroll />

      {/* Skip Link for Screen Readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Skip to main content
      </a>

      {/* Hero Section */}
      <main id="main-content">
        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-indigo-100 py-16 lg:py-24 pt-24"
          aria-labelledby="hero-heading"
        >
        <Container>
          <div className="text-center">

            <h1
              id="hero-heading"
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              The Memories App
              <br />
              <span className="text-primary-600">Built for People</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Stay close by sharing photos, milestones, and little life updates with your friends and community.
              AI helps prompt meaningful moments—no algorithm, no endless feed.
              Celebrate milestones, share real moments, and stay connected in a more authentic way.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="xl"
                className="w-full sm:w-auto"
                onClick={trackSignupStarted}
              >
                <Link href="/signup" className="flex items-center">
                  Start Free Family Circle
                  <HeartIcon className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={trackDemoRequested}
              >
                <Link href="#demo">Watch 2-Min Demo</Link>
              </Button>
            </div>

          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-16 lg:py-24 bg-white"
        aria-labelledby="features-heading"
      >
        <Container>
          <div className="text-center mb-16">
            <h2
              id="features-heading"
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Everything You Need for Meaningful Sharing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built people who want to stay close with friends, family, and community in a more intentional way.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            onMouseEnter={trackFeaturesExplored}
          >

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <CardHeader>
                <CardTitle>Smart Milestone Tracking</CardTitle>
                <CardDescription>
                  Celebrate life’s moments—big and small. From birthdays to everyday wins, everything is automatically organized into a timeline you’ll actually want to look back on.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UsersIcon className="w-8 h-8 text-purple-600" />
              </div>
              <CardHeader>
                <CardTitle>Flexible Sharing</CardTitle>
                <CardDescription>
                  Post updates however it’s easiest—email, SMS, or WhatsApp. Share text, photos, or even voice notes. Your recipients receive simple digests at the pace they choose—instantly,daily, or weekly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <HeartIcon className="w-8 h-8 text-orange-600" />
              </div>
              <CardHeader>
                <CardTitle>Ad-Free Experience</CardTitle>
                <CardDescription>
                  No distracting ads or sponsored content. Focus on what matters: sharing precious moments with loved ones.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckIcon className="w-8 h-8 text-red-600" />
              </div>
              <CardHeader>
                <CardTitle>Simple Setup</CardTitle>
                <CardDescription>
                  Get started in minutes. Create your circle, invite your people, and start sharing right away.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </Container>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        className="py-16 lg:py-24 bg-gray-50"
        aria-labelledby="benefits-heading"
      >
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <SlideLeftSection>
              <h2
                id="benefits-heading"
                className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
              >
                Solve Your Biggest Connection Challenges
              </h2>

              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <XMarkIcon className="w-4 h-4 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Overloaded Social Feeds</h3>
                    <p className="text-gray-600">Skip the noise and clutter of traditional social media. Share what matters without getting lost in the feed.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <XMarkIcon className="w-4 h-4 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Feeling Out of the Loop</h3>
                    <p className="text-gray-600">Make sure your friends, family, and community never miss the moments that matter—no matter where they are.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <XMarkIcon className="w-4 h-4 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Scattered Group Chats</h3>
                    <p className="text-gray-600">No more juggling texts, DMs, and endless notifications. Keep your important memories organized in one place.</p>
                  </div>
                </div>
              </div>
            </SlideLeftSection>

            <SlideRightSection>
              <Card className="p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HeartIcon className="w-10 h-10 text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">The Tribe Solution</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">Share on your terms: text, photos, or voice notes</span>
                  </div>
                  <div className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">Digests delivered at the pace people choose</span>
                  </div>
                  <div className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">Organized conversations that enable human connection</span>
                  </div>
                  <div className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">Celebrate and share milestones</span>
                  </div>
                  <div className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">No ads, no algorithms—just genuine connection</span>
                  </div>
                </div>
              </Card>
            </SlideRightSection>
          </div>
        </Container>
      </section>
      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <section
        id="signup"
        className="py-16 lg:py-24 bg-primary-600"
        aria-labelledby="cta-heading"
      >
        <Container>
          <div className="text-center text-white">
            <h2
              id="cta-heading"
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Ready to Build Your Tribe?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              Join members who trust Tribe o share moments, milestones, and memories with the people who matter most. 
              Get started and start connecting in under 2 minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="xl"
                variant="secondary"
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-gray-50"
                onClick={trackSignupStarted}
              >
                <Link href="/signup">Start Your Free Family Circle</Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary-600"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>

            <p className="text-sm opacity-75 mt-6">
              Free to start • No credit card required • Cancel anytime
            </p>
          </div>
        </Container>
      </section>
      </main>
    </>
  )
}

// Wrap the component with ConversionTracker and export as default
export default function HomePage() {
  return (
    <ConversionTracker>
      <Home />
    </ConversionTracker>
  )
}
