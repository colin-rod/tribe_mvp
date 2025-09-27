import { useState } from 'react'
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Alert,
  Container,
  Grid,
  GridItem,
} from '@/components/ui'

/**
 * Example design system compositions used for documentation and visual testing.
 */
export const BabyUpdateCard = () => {
  const [likes, setLikes] = useState(0)

  return (
    <Card hover className="max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Emma&apos;s First Steps! 👶</CardTitle>
          <Badge variant="success" dot>
            New
          </Badge>
        </div>
        <CardDescription>Shared by Sarah • 2 hours ago</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-neutral-700 mb-4">
          Emma took three steps today all on her own. She laughed the whole time, and so did we!
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">First steps</Badge>
          <Badge variant="secondary" outline>
            Milestone
          </Badge>
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLikes((prev) => prev + 1)}
            >
              ❤️ {likes}
            </Button>
            <Button variant="ghost" size="sm">
              Comment
            </Button>
          </div>
          <Button variant="outline" size="sm">
            Share
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export const CreateUpdateForm = () => {
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2500)
    }, 1200)
  }

  return (
    <Container size="md">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Share a New Update</CardTitle>
          <CardDescription>{"Let everyone know what&apos;s new"}</CardDescription>
        </CardHeader>
        <CardContent>
          {showSuccess && (
            <Alert
              variant="success"
              className="mb-6"
              dismissible
              onDismiss={() => setShowSuccess(false)}
            >
              Update shared successfully!
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Title" placeholder="What happened today?" required />
            <Textarea
              label="Details"
              placeholder="Tell the story..."
              maxLength={500}
              showCharCount
              rows={4}
              helperText="Highlight the moments that matter."
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline">
                Save Draft
              </Button>
              <Button type="submit" loading={submitting}>
                Share Update
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  )
}

export const LayoutShowcase = () => (
  <Grid cols={3} responsive={{ md: 2, sm: 1 }} gap="lg" className="max-w-4xl mx-auto">
    {[1, 2, 3, 4, 5, 6].map((block) => (
      <GridItem key={block} span={block === 1 ? 'full' : undefined}>
        <Card>
          <CardContent className="h-32 flex items-center justify-center text-neutral-500">
            Grid item {block}
          </CardContent>
        </Card>
      </GridItem>
    ))}
  </Grid>
)
