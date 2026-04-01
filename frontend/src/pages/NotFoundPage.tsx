import { Link } from 'react-router-dom'
import { MessageCircle, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary px-4">
      <div className="text-center">
        <MessageCircle className="h-16 w-16 text-accent/40 mx-auto mb-6" />
        <h1 className="text-8xl font-bold text-gradient mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Page not found</h2>
        <p className="text-text-secondary mb-8 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 btn-primary"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
