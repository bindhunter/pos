import { useEffect, useState, useRef } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { toast } from 'sonner'

interface UseAutoChainSwitchProps {
  selectedChainId?: number
  isConnected: boolean
}

export function useAutoChainSwitch({ selectedChainId, isConnected }: UseAutoChainSwitchProps) {
  const currentChainId = useChainId()
  const [isChainSwitching, setIsChainSwitching] = useState(false)
  const { switchChainAsync } = useSwitchChain()
  const lastAttemptedChainId = useRef<number | null>(null)
  const attemptCount = useRef(0)
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timeout on dependency changes
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current)
      switchTimeoutRef.current = null
    }
    
    const handleAutoChainSwitch = async () => {

      if (!selectedChainId || !isConnected) return
      
      if (selectedChainId === currentChainId) return
      
      if (isChainSwitching) return
      
      // Prevent too many consecutive attempts for the same chain
      if (lastAttemptedChainId.current === selectedChainId) {
        attemptCount.current += 1
        
        if (attemptCount.current > 3) {
          console.log('Too many attempts to switch to chain:', selectedChainId)
          toast.error('Unable to switch network automatically. Please switch manually.')
          return
        }
      } else {
        lastAttemptedChainId.current = selectedChainId
        attemptCount.current = 1
      }
      
      console.log('Attempting to switch from', currentChainId, 'to', selectedChainId)
      
      setIsChainSwitching(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        await switchChainAsync({ 
          chainId: selectedChainId
        })
        
        console.log('Chain switch successful to', selectedChainId)
        
        // Add delay after successful switch to allow for UI updates
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Chain switch error:', error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
          toast.error('Network switch was rejected. Please try again or switch manually.')
        } else {
          toast.error('Failed to switch network. Please try switching manually.')
        }
      } finally {
        setIsChainSwitching(false)
      }
    }

    // Introduce a slight delay before attempting to switch chains
    switchTimeoutRef.current = setTimeout(handleAutoChainSwitch, 1000)
    
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current)
      }
    }
  }, [selectedChainId, currentChainId, isConnected, switchChainAsync, isChainSwitching])

  return { isChainSwitching }
} 