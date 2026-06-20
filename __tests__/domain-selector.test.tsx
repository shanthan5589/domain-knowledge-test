import { render, screen, fireEvent } from '@testing-library/react'
import DomainSelector from '@/components/DomainSelector'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('DomainSelector', () => {
  it('renders all 5 domains', () => {
    render(<DomainSelector />)
    expect(screen.getByText('Artificial Intelligence & Generative AI')).toBeInTheDocument()
    expect(screen.getByText('Cloud Computing')).toBeInTheDocument()
    expect(screen.getByText('Cybersecurity')).toBeInTheDocument()
    expect(screen.getByText('DevOps & CI/CD')).toBeInTheDocument()
    expect(screen.getByText('Data Science, Analytics & Big Data')).toBeInTheDocument()
  })

  it('shows confirmation modal when a domain is selected', () => {
    render(<DomainSelector />)
    fireEvent.click(screen.getByText('Cybersecurity'))
    expect(screen.getByText('Ready to start?')).toBeInTheDocument()
    expect(screen.getByText('10 questions · 5 minute timer · Cannot pause')).toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', () => {
    render(<DomainSelector />)
    fireEvent.click(screen.getByText('Cloud Computing'))
    expect(screen.getByText('Ready to start?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Ready to start?')).not.toBeInTheDocument()
  })

  it('navigates to test page when Start Test is clicked', () => {
    const push = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push })
    render(<DomainSelector />)
    fireEvent.click(screen.getByText('DevOps & CI/CD'))
    fireEvent.click(screen.getByText('Start Test'))
    expect(push).toHaveBeenCalledWith('/test/devops')
  })
})
