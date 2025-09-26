/**
 * Style Guide Component
 *
 * A comprehensive showcase of the Tribe MVP design system.
 * This component can be used for development, testing, and documentation.
 */

import React from 'react'
import { Container } from '@/components/ui/Container'
import {
  BabyUpdateCard,
  CreateUpdateForm,
  FamilyDashboard,
  ButtonShowcase,
  TypographyShowcase
} from '@/design-system/examples'

interface StyleGuideProps {
  section?: 'all' | 'typography' | 'components' | 'examples'
}

const SECTIONS = {
  typography: {
    title: 'Typography',
    component: <TypographyShowcase />
  },
  components: {
    title: 'Components',
    component: <ButtonShowcase />
  },
  examples: {
    title: 'Example Implementations',
    component: (
      <div className="space-y-16">
        <div>
          <h2 className="h2 mb-6">Baby Update Card</h2>
          <div className="flex justify-center">
            <BabyUpdateCard />
          </div>
        </div>

        <div>
          <h2 className="h2 mb-6">Create Update Form</h2>
          <CreateUpdateForm />
        </div>

        <div>
          <h2 className="h2 mb-6">Family Dashboard</h2>
          <FamilyDashboard />
        </div>
      </div>
    )
  }
} satisfies Record<string, { title: string; component: React.ReactNode }>

export const StyleGuide: React.FC<StyleGuideProps> = ({ section = 'all' }) => {
  const renderSection = (key: keyof typeof SECTIONS) => {
    const sectionData = SECTIONS[key]
    if (!sectionData) return null

    return (
      <section key={key} className="mb-16">
        <Container>
          <h1 className="h1 mb-8 text-center">{sectionData.title}</h1>
          {sectionData.component}
        </Container>
      </section>
    )
  }

  const renderAll = () => {
    return (Object.keys(SECTIONS) as Array<keyof typeof SECTIONS>).map(renderSection)
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-16">
      {/* Header */}
      <Container className="mb-16">
        <div className="text-center">
          <h1 className="display-lg mb-4 gradient-primary bg-clip-text text-transparent">
            Tribe Design System
          </h1>
          <p className="body-lg text-neutral-600 max-w-2xl mx-auto">
            A comprehensive, family-friendly design system built for the Tribe MVP platform.
            Featuring warm colors, accessibility-first components, and consistent design patterns.
          </p>
        </div>
      </Container>

      {/* Navigation */}
      <Container className="mb-12">
        <div className="flex justify-center">
          <nav className="flex gap-4 p-2 bg-white rounded-lg shadow-sm border border-neutral-200">
            {['all', 'typography', 'components', 'examples'].map((tab) => (
              <span
                key={tab}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  section === tab
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>
      </Container>

      {/* Content */}
      {section === 'all' ? renderAll() : renderSection(section as keyof typeof SECTIONS)}

      {/* Footer */}
      <Container>
        <div className="text-center py-12 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            Built with Next.js, TypeScript, Tailwind CSS, and lots of care
          </p>
        </div>
      </Container>
    </div>
  )
}

export default StyleGuide
