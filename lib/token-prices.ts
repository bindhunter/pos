import { ChainId } from "@/constants/ChainToken"

interface TokenPriceResponse {
  symbol: string
  decimals: number
  name: string
  logoURI: string
  priceUSD: number
}

export async function getTokenPrice(chainId: ChainId, tokenAddress: string): Promise<TokenPriceResponse> {
  try {
    const response = await fetch(
      `https://li.quest/v1/token?chain=${chainId}&token=${tokenAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return {
      symbol: data.symbol,
      decimals: data.decimals,
      name: data.name,
      logoURI: data.logoURI || '',
      priceUSD: Number(data.priceUSD)
    }
  } catch (error) {
    console.error(`Error fetching price for token ${tokenAddress} on chain ${chainId}:`, error)
    throw error
  }
}

export async function getTokenPrices(tokens: { chainId: ChainId, address: string }[]): Promise<Record<string, number>> {
  try {
    const prices: Record<string, number> = {}
    
    await Promise.all(
      tokens.map(async ({ chainId, address }) => {
        try {
          const data = await getTokenPrice(chainId, address)
          // Use chainId_address as key to ensure uniqueness across chains
          prices[`${chainId}_${address}`] = data.priceUSD
        } catch (error) {
          // If one token fails, continue with others
          console.error(`Failed to fetch price for ${address} on chain ${chainId}:`, error)
          prices[`${chainId}_${address}`] = 0
        }
      })
    )
    
    return prices
  } catch (error) {
    console.error('Error fetching token prices:', error)
    return {}
  }
}