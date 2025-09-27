import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EnvelopeIcon, UserIcon, MagnifyingGlassIcon, LockClosedIcon } from '@heroicons/react/24/outline'

import { Input } from './Input'

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile input component with support for labels, icons, validation states, and password visibility toggle. Features comprehensive accessibility and form integration.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'error', 'success'],
      description: 'Visual state of the input',
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'HTML input type',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the input',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Mark input as required',
    },
    showPassword: {
      control: { type: 'boolean' },
      description: 'Show password visibility toggle (only for password inputs)',
    },
    label: {
      control: { type: 'text' },
      description: 'Input label text',
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text',
    },
    helperText: {
      control: { type: 'text' },
      description: 'Helper text displayed below input',
    },
    errorMessage: {
      control: { type: 'text' },
      description: 'Error message (overrides helperText)',
    },
    leftIcon: {
      control: { type: 'boolean' },
      description: 'Show left icon (demo purposes)',
      mapping: {
        true: <UserIcon className="h-5 w-5" />,
        false: undefined,
      },
    },
    rightIcon: {
      control: { type: 'boolean' },
      description: 'Show right icon (demo purposes)',
      mapping: {
        true: <MagnifyingGlassIcon className="h-5 w-5" />,
        false: undefined,
      },
    },
  },
  args: {
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

// Basic States
export const Default: Story = {
  args: {
    placeholder: 'Enter your text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
    id: 'full-name',
  },
}

export const Required: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    id: 'email',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'johndoe',
    helperText: 'Choose a unique username between 3-20 characters',
    id: 'username',
  },
}

// Validation States
export const Error: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    value: 'invalid-email',
    errorMessage: 'Please enter a valid email address',
    id: 'email-error',
  },
}

export const Success: Story = {
  args: {
    label: 'Username',
    variant: 'success',
    value: 'johndoe123',
    helperText: 'Username is available!',
    id: 'username-success',
  },
}

// Icons
export const WithLeftIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    leftIcon: <EnvelopeIcon className="h-5 w-5" />,
    placeholder: 'Enter your email',
    id: 'email-with-icon',
  },
}

export const WithRightIcon: Story = {
  args: {
    label: 'Search',
    type: 'search',
    rightIcon: <MagnifyingGlassIcon className="h-5 w-5" />,
    placeholder: 'Search updates...',
    id: 'search',
  },
}

export const WithBothIcons: Story = {
  args: {
    label: 'Account Search',
    leftIcon: <UserIcon className="h-5 w-5" />,
    rightIcon: <MagnifyingGlassIcon className="h-5 w-5" />,
    placeholder: 'Find user account',
    id: 'account-search',
  },
}

// Password Input
export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    showPassword: true,
    id: 'password',
  },
}

export const PasswordWithIcon: Story = {
  args: {
    label: 'New Password',
    type: 'password',
    leftIcon: <LockClosedIcon className="h-5 w-5" />,
    showPassword: true,
    placeholder: 'Choose a strong password',
    helperText: 'Password must be at least 8 characters long',
    id: 'new-password',
  },
}

// States
export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'This input is disabled',
    disabled: true,
    helperText: 'This field cannot be edited',
    id: 'disabled',
  },
}

export const Focus: Story = {
  args: {
    label: 'Focused Input',
    placeholder: 'This input has focus',
    autoFocus: true,
    id: 'focused',
  },
}

// Input Types
export const InputTypes: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <Input
        label="Text"
        type="text"
        placeholder="Enter text"
        id="text-input"
      />
      <Input
        label="Email"
        type="email"
        placeholder="user@example.com"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        id="email-input"
      />
      <Input
        label="Password"
        type="password"
        placeholder="Password"
        showPassword
        leftIcon={<LockClosedIcon className="h-5 w-5" />}
        id="password-input"
      />
      <Input
        label="Number"
        type="number"
        placeholder="123"
        id="number-input"
      />
      <Input
        label="Search"
        type="search"
        placeholder="Search..."
        rightIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
        id="search-input"
      />
      <Input
        label="Phone"
        type="tel"
        placeholder="+1 (555) 123-4567"
        id="phone-input"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different HTML input types with appropriate styling and icons.',
      },
    },
  },
}

// Form Examples
export const LoginForm: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        label="Email"
        type="email"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        placeholder="Enter your email"
        required
        id="login-email"
      />
      <Input
        label="Password"
        type="password"
        leftIcon={<LockClosedIcon className="h-5 w-5" />}
        placeholder="Enter your password"
        showPassword
        required
        id="login-password"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of a typical login form with email and password inputs.',
      },
    },
  },
}

export const ProfileForm: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        label="First Name"
        leftIcon={<UserIcon className="h-5 w-5" />}
        placeholder="John"
        required
        id="first-name"
      />
      <Input
        label="Last Name"
        placeholder="Doe"
        required
        id="last-name"
      />
      <Input
        label="Email"
        type="email"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        placeholder="john@example.com"
        helperText="We'll never share your email with anyone else"
        required
        id="profile-email"
      />
      <Input
        label="Phone (Optional)"
        type="tel"
        placeholder="+1 (555) 123-4567"
        helperText="Used for emergency notifications only"
        id="phone"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example profile form with various input types and helper text.',
      },
    },
  },
}

// Validation Examples
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <Input
        label="Valid Email"
        type="email"
        variant="success"
        value="john@example.com"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        helperText="Email format is correct"
        id="valid-email"
      />
      <Input
        label="Invalid Email"
        type="email"
        variant="error"
        value="invalid-email"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        errorMessage="Please enter a valid email address"
        id="invalid-email"
      />
      <Input
        label="Weak Password"
        type="password"
        variant="error"
        value="123"
        leftIcon={<LockClosedIcon className="h-5 w-5" />}
        showPassword
        errorMessage="Password must be at least 8 characters long"
        id="weak-password"
      />
      <Input
        label="Strong Password"
        type="password"
        variant="success"
        value="MyStr0ngP@ssw0rd!"
        leftIcon={<LockClosedIcon className="h-5 w-5" />}
        showPassword
        helperText="Password strength: Strong"
        id="strong-password"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples of validation states with success and error variants.',
      },
    },
  },
}