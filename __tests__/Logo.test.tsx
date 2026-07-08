import { render, screen } from '@testing-library/react'
import Logo from '@/components/Logo'

describe('Logo', () => {
  it('renders the logo image with the expected src and alt text', () => {
    render(<Logo />)
    const img = screen.getByAltText('Edu by Castor AI')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('logo.jpg'))
  })
})
