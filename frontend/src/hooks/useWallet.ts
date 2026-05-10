import { useEffect, useState, useCallback } from 'react'
import { useWallet as useMeshWallet } from '@meshsdk/react'

const VOTE_POLICY_ID      = '4e1cdbfe3e52395946921cf56878719cdfe211dde196a337df118864'
const VOTE_TOKEN_NAME_HEX = '564f54455f323032355f5048' // hex of "VOTE_2025_PH"
const VOTE_ASSET_UNIT     = VOTE_POLICY_ID + VOTE_TOKEN_NAME_HEX

export interface WalletAsset {
  unit: string
  quantity: string
}

export interface UseWalletReturn {
  isConnected: boolean
  address: string
  networkId: number | null
  assets: WalletAsset[]
  wallet: any
  connectWallet: (walletName: string) => Promise<void>
  disconnectWallet: () => void
  hasVoteToken: boolean
  isLoading: boolean
}

export function useWallet(): UseWalletReturn {
  const meshWallet = useMeshWallet()

  const [address, setAddress]           = useState<string>('')
  const [networkId, setNetworkId]       = useState<number | null>(null)
  const [assets, setAssets]             = useState<WalletAsset[]>([])
  const [hasVoteToken, setHasVoteToken] = useState<boolean>(false)
  const [isLoading, setIsLoading]       = useState<boolean>(false)

  useEffect(() => {
    if (!meshWallet.connected || !meshWallet.wallet) {
      setAddress('')
      setNetworkId(null)
      setAssets([])
      setHasVoteToken(false)
      return
    }

    const fetchWalletData = async () => {
      setIsLoading(true)
      try {
        // 1. Get wallet address
        const addr = await meshWallet.wallet.getChangeAddress()
        setAddress(addr)

        // 2. Get network ID (0 = testnet, 1 = mainnet)
        const netId = await meshWallet.wallet.getNetworkId()
        setNetworkId(netId)

        // 3. getBalanceMesh() returns Asset[] — { unit: string, quantity: string }
        const balance: WalletAsset[] = await meshWallet.wallet.getBalanceMesh()
        setAssets(balance)

        // 4. Check if wallet holds the VOTE_2025_PH token
        const hasToken = balance.some(
          (asset) =>
            asset.unit === VOTE_ASSET_UNIT &&
            parseInt(asset.quantity) > 0
        )
        setHasVoteToken(hasToken)

        console.log('Address:', addr)
        console.log('Network ID:', netId)
        console.log('Balance:', balance)
        console.log('Has Vote Token:', hasToken)

      } catch (err) {
        console.error('[useWallet] Error fetching wallet data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWalletData()
  }, [meshWallet.connected, meshWallet.wallet])

  const connectWallet = useCallback(async (walletName: string) => {
    try {
      await meshWallet.connect(walletName)
    } catch (err) {
      console.error('[useWallet] Failed to connect wallet:', err)
    }
  }, [meshWallet])

  const disconnectWallet = useCallback(() => {
    meshWallet.disconnect()
    setAddress('')
    setNetworkId(null)
    setAssets([])
    setHasVoteToken(false)
  }, [meshWallet])

  return {
    isConnected: meshWallet.connected,
    address,
    networkId,
    assets,
    wallet: meshWallet.wallet,
    connectWallet,
    disconnectWallet,
    hasVoteToken,
    isLoading,
  }
}