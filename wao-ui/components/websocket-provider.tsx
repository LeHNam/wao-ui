"use client"

import { createContext, useContext, useEffect, useState } from "react"
import useWebSocket, { ReadyState } from "react-use-websocket"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Package, Eye } from 'lucide-react'

interface WebSocketMessage {
  event: string
  data?: any
  message?: string
}

interface ProductCreatedData {
  id: string
  code: string
  name: string
  img: string
  options: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}
interface OrderUpdatedData {
  id: string
  order_number: string
  status: string
}

interface WebSocketContextType {
  connectionStatus: ReadyState
  lastMessage: WebSocketMessage | null
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider")
  }
  return context
}

interface ProductNotificationProps {
  product: ProductCreatedData
  onClose: () => void
  onView: () => void
}

function ProductNotification({ product, onClose, onView }: ProductNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-right duration-300">
      <Card className="shadow-lg border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">New Product Available!</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>A new product has been added to the marketplace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={product.img || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{product.name}</h4>
              <p className="text-xs text-gray-500 mb-2">{product.code}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {product.options?.length || 0} options
                </Badge>
                {product.options && product.options.length > 0 && (
                  <span className="text-xs text-gray-600">
                    From ¥{Math.min(...product.options.map((o) => o.price)).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={onView} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              View Product
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface OrderNotificationProps {
  order: OrderUpdatedData
  onClose: () => void
  onView: () => void
}

function OrderNotification({ order, onClose, onView }: OrderNotificationProps) {
  return (
      <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-right duration-300">
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Order Updated</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Order #{order.order_number} has been updated to status: {order.status}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button size="sm" onClick={onView} className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Order
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
interface WebSocketProviderProps {
  children: React.ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [newProduct, setNewProduct] = useState<ProductCreatedData | null>(null)
  const { toast } = useToast()
  const [showOrderNotification, setShowOrderNotification] = useState(false)
  const [updatedOrder, setUpdatedOrder] = useState<OrderUpdatedData | null>(null)

  // Check user role on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split(".")[1]))
        setUserRole(tokenPayload.role)
      } catch (error) {
        console.error("Failed to parse token:", error)
      }
    }
  }, [])

  const { lastMessage, readyState } = useWebSocket(
    "ws://localhost:8080/ws",
    {
      onOpen: () => {
        console.log("WebSocket connected")
        toast({
          title: "Connected",
          description: "Real-time notifications enabled",
        })
      },
      onClose: () => {
        console.log("WebSocket disconnected")
      },
      onError: (error) => {
        console.error("WebSocket error:", error)
        toast({
          title: "Connection Error",
          description: "Failed to connect to real-time notifications",
          variant: "destructive",
        })
      },
      shouldReconnect: (closeEvent) => true, // Auto-reconnect
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    },
    userRole === "buyer", // Only connect if user is a buyer
  )

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage !== null && userRole === "buyer") {
      try {
        const message: WebSocketMessage = JSON.parse(lastMessage.data)
        console.log("Received WebSocket message:", message)

        if (message.event === "product_created" && message.data) {
          const productData = message.data as ProductCreatedData
          setNewProduct(productData)
          setShowNotification(true)

          setTimeout(() => {
            setShowNotification(false)
          }, 100000)
        }
        if (message.event === "order_updated" && message.data) {
          const orderData = message.data as OrderUpdatedData
          setUpdatedOrder(orderData)
          setShowOrderNotification(true)

          setTimeout(() => {
            setShowOrderNotification(false)
          }, 100000)
        }

      } catch (error) {
        console.error("Failed to parse WebSocket message:", error)
      }
    }
  }, [lastMessage, userRole])

  const handleCloseNotification = () => {
    setShowNotification(false)
  }

  const handleViewProduct = () => {
    setShowNotification(false)
    // Refresh the page to show the new product
    window.location.href = `/buyer/product/${newProduct?.id}`
  }

  const connectionStatus = readyState
  const handleCloseOrderNotification = () => {
    setShowOrderNotification(false)
  }

  const handleViewOrder = () => {
    setShowOrderNotification(false)
    // Navigate to the order details page
    window.location.href = `/buyer/orders/${updatedOrder?.id}`
  }

  return (
    <WebSocketContext.Provider value={{ connectionStatus, lastMessage: lastMessage ? JSON.parse(lastMessage.data) : null }}>
      {children}
      {showNotification && newProduct && (
        <ProductNotification
          product={newProduct}
          onClose={handleCloseNotification}
          onView={handleViewProduct}
        />
      )}
      {showOrderNotification && updatedOrder && (
          <OrderNotification
              order={updatedOrder}
              onClose={handleCloseOrderNotification}
              onView={handleViewOrder}
          />
      )}

    </WebSocketContext.Provider>
  )
}
