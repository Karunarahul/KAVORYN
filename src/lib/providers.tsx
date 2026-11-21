import React, { type ReactNode } from 'react'
import { ClerkProvider, useAuth } from "@clerk/react"
import { ConvexProvider } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { convexClient } from './convex-client'
import { clerkPubKey, isClerkConfigured, isConvexConfigured } from './env'

interface ProvidersProps {
  children: ReactNode
}

export const AppProviders: React.FC<ProvidersProps> = ({ children }) => {
  // Case 1: Both Clerk and Convex configured
  if (isClerkConfigured && isConvexConfigured && convexClient) {
    return (
      <ClerkProvider publishableKey={clerkPubKey!}>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    )
  }

  // Case 2: Only Clerk configured
  if (isClerkConfigured) {
    return <ClerkProvider publishableKey={clerkPubKey!}>{children}</ClerkProvider>
  }

  // Case 3: Only Convex configured
  if (isConvexConfigured && convexClient) {
    return <ConvexProvider client={convexClient}>{children}</ConvexProvider>
  }

  // Case 4: Local development mode with graceful fallback
  return <>{children}</>
}
