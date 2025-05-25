"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, Package } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = "http://localhost:8080/api/v1"

interface PurchaseOrderItem {
  id: string
  product_id: string
  product_option_id: string
  product_name: string
  product_option_name: string
  unit_price: number
  total_price: number
  quantity: number
  currency: string
}

interface PurchaseOrder {
  id: string
  order_number: string
  status: string
  order_date: string
  total_amount: number
  currency: string
  notes?: string
  items: PurchaseOrderItem[]
}

export default function BuyerOrderDetailPage() {
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }

    // Parse token to check role
    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]))
      if (tokenPayload.role !== "buyer") {
        router.push("/")
        return
      }
    } catch (error) {
      router.push("/")
      return
    }

    if (params.id) {
      fetchOrderDetail()
    }
  }, [router, params.id])

  const fetchOrderDetail = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-order/${params.id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        })
        router.push("/buyer/orders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusSteps = () => {
    const steps = ["Draft", "Accepted", "Delivering", "Received", "Finished"]
    const currentIndex = steps.findIndex((step) => step.toLowerCase() === order?.status.toLowerCase())
    return steps.map((step, index) => ({
      name: step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }))
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading order details...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Order not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/buyer/orders")} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Order Details</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Order Number #{order.order_number}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Status Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                {getStatusSteps().map((step, index) => (
                  <div key={step.name} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.completed
                          ? "bg-green-600 text-white"
                          : step.current
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900">{step.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Option</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.product_id}</TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_option_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.currency} {item.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.currency} {item.total_price.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    Total: {order.currency} {order.total_amount.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
