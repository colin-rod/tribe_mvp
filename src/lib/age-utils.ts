export interface Age {
  years: number
  months: number
  totalMonths: number
}

export function calculateAge(birthDate: string): Age {
  const birth = new Date(birthDate)
  const today = new Date()

  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  // Handle case where the day hasn't occurred yet this month
  if (today.getDate() < birth.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  const totalMonths = years * 12 + months

  return { years, months, totalMonths }
}

export function formatAge(age: Age): string {
  if (age.years === 0) {
    return `${age.months} month${age.months !== 1 ? 's' : ''}`
  } else if (age.months === 0) {
    return `${age.years} year${age.years !== 1 ? 's' : ''}`
  } else {
    return `${age.years} year${age.years !== 1 ? 's' : ''}, ${age.months} month${age.months !== 1 ? 's' : ''}`
  }
}

export function formatAgeShort(age: Age): string {
  if (age.years === 0) {
    return `${age.months}mo`
  } else if (age.months === 0) {
    return `${age.years}y`
  } else {
    return `${age.years}y ${age.months}mo`
  }
}

export function getAgeInDays(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - birth.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getAgeInMonths(birthDate: string): number {
  const age = calculateAge(birthDate)
  return age.totalMonths
}