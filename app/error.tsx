'use client'

export interface ErrorProps {
  error: Error
  reset: () => void
}

export default function Error(props: ErrorProps) {
  const { error, reset } = props

  return (
    <div>
      <p>Something went wrong!</p>
      <p>{JSON.stringify(error)}</p>
      <button onClick={() => reset()}>Reset error boundary</button>
    </div>
  )
}
