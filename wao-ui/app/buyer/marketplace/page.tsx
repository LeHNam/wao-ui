"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = "http://localhost:8080/api/v1"

interface ProductOption {
  id: string
  code: string
  name: string
  price: number
  quantity: number
}

interface Product {
  id: string
  code: string
  name: string
  img: string
  options: ProductOption[]
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

interface ProductsResponse {
  items: Product[]
  "limit": number
  "page": number
  "pages": number
  "total": number
}

interface CartItem {
  productId: string
  productName: string
  productCode: string
  optionId: string
  optionName: string
  price: number
  quantity: number
  maxQuantity: number
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [productFilter, setProductFilter] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedOptions, setSelectedOptions] = useState<{ [productId: string]: string }>({})
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>({})
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  const handleCreateOrder = async () => {
    if (cart.length === 0) return

    setIsCreatingOrder(true)
    try {
      const orderItems = cart.map(item => ({
        product_id: item.productId,
        product_option_id: item.optionId,
        quantity: item.quantity,
        currency: "JPY"
      }))

      const response = await fetch(`${API_BASE_URL}/purchase-order`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          items: orderItems
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: "Order created successfully",
        })
        // Navigate to order detail page
        router.push(`/buyer/orders/${data.id}`)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to create order",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }

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

    fetchProducts()
  }, [router, pagination.currentPage, searchTerm, productFilter])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: "12",
        ...(searchTerm && { search: searchTerm }),
        ...(productFilter && { category: productFilter }),
      })

      const response = await fetch(`${API_BASE_URL}/product?${queryParams}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data: ProductsResponse = await response.json()
        setProducts(data.items || [])
        setPagination({
          currentPage: data.page,
          totalPages: data.pages,
          totalItems: data.total,
          itemsPerPage: data.limit,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }))
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPagination((prev) => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleProductFilterChange = (value: string) => {
    setProductFilter(value === "all" ? "" : value)
    setPagination((prev) => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleOptionSelect = (productId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [productId]: optionId }))
    setQuantities((prev) => ({ ...prev, [productId]: 1 }))
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId)
    const selectedOptionId = selectedOptions[productId]
    const selectedOption = product?.options.find((opt) => opt.id === selectedOptionId)

    if (selectedOption && quantity <= selectedOption.quantity && quantity >= 1) {
      setQuantities((prev) => ({ ...prev, [productId]: quantity }))
    }
  }

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    const selectedOptionId = selectedOptions[productId]
    const selectedOption = product?.options.find((opt) => opt.id === selectedOptionId)
    const quantity = quantities[productId] || 1

    if (!product || !selectedOption) {
      toast({
        title: "Error",
        description: "Please select a product option",
        variant: "destructive",
      })
      return
    }

    const existingItemIndex = cart.findIndex(
        (item) => item.productId === productId && item.optionId === selectedOptionId,
    )

    if (existingItemIndex >= 0) {
      // Update existing item
      const newCart = [...cart]
      newCart[existingItemIndex].quantity += quantity
      setCart(newCart)
    } else {
      // Add new item
      const newItem: CartItem = {
        productId,
        productName: product.name,
        productCode: product.code,
        optionId: selectedOptionId,
        optionName: selectedOption.name,
        price: selectedOption.price,
        quantity,
        maxQuantity: selectedOption.quantity,
      }
      setCart([...cart, newItem])
    }

    toast({
      title: "Added to cart",
      description: `${product.name} - ${selectedOption.name}`,
    })

    // Reset selection
    setSelectedOptions((prev) => ({ ...prev, [productId]: "" }))
    setQuantities((prev) => ({ ...prev, [productId]: 1 }))
  }

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index)
    setCart(newCart)
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const handleReset = () => {
    setSearchTerm("")
    setProductFilter("")
    setPagination((prev) => ({ ...prev, currentPage: 1 }))
  }

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={handleLogout} variant="outline">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Products Section */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Products</h2>
                      <Badge variant="secondary">{pagination.totalItems} items</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push("/buyer/orders")}>
                      Orders
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                          placeholder="Search Supplier or product"
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="w-full"
                      />
                    </div>
                    <Select value={productFilter || "all"} onValueChange={handleProductFilterChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="keyboard">Keyboard</SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                        <SelectItem value="watch">Watch</SelectItem>
                        <SelectItem value="tv">TV</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <Card key={product.id} className="overflow-hidden">
                          <div className="aspect-square bg-gray-100 flex items-center justify-center">
                            <img
                                src={product.img || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                            <p className="text-xs text-gray-500 mb-2">{product.code}</p>

                            {product.options && product.options.length > 0 && (
                                <>
                                  <div className="mb-2">
                                    <Select
                                        value={selectedOptions[product.id] || ""}
                                        onValueChange={(value) => handleOptionSelect(product.id, value)}
                                    >
                                      <SelectTrigger className="w-full text-xs">
                                        <SelectValue placeholder="Select option" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {product.options.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                              <div className="flex flex-col">
                                                <span>{option.name}</span>
                                                <span className="text-xs text-gray-500">
                                          ¥{option.price.toLocaleString()} - Qty: {option.quantity}
                                        </span>
                                              </div>
                                            </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {selectedOptions[product.id] && (
                                      <>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) - 1)}
                                              disabled={!quantities[product.id] || quantities[product.id] <= 1}
                                          >
                                            <Minus className="h-3 w-3" />
                                          </Button>
                                          <Input
                                              type="number"
                                              value={quantities[product.id] || 1}
                                              onChange={(e) =>
                                                  handleQuantityChange(product.id, Number.parseInt(e.target.value) || 1)
                                              }
                                              className="w-16 text-center text-xs"
                                              min="1"
                                          />
                                          <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) + 1)}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <Button size="sm" className="w-full" onClick={() => addToCart(product.id)}>
                                          Add
                                        </Button>
                                      </>
                                  )}
                                </>
                            )}
                          </CardContent>
                        </Card>
                    ))}
                  </div>

                  {products.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-lg font-medium">No products found</div>
                        <div className="text-sm">Try adjusting your search or filters</div>
                      </div>
                  )}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-8 pt-6 border-t">
                        <div className="text-sm text-gray-500">
                          Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
                          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                          {pagination.totalItems} products
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(pagination.currentPage - 1)}
                              disabled={pagination.currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>

                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                              let pageNum
                              if (pagination.totalPages <= 5) {
                                pageNum = i + 1
                              } else {
                                const start = Math.max(1, pagination.currentPage - 2)
                                pageNum = start + i
                                if (pageNum > pagination.totalPages) return null
                              }

                              return (
                                  <Button
                                      key={pageNum}
                                      variant={pagination.currentPage === pageNum ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handlePageChange(pageNum)}
                                  >
                                    {pageNum}
                                  </Button>
                              )
                            })}
                          </div>

                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(pagination.currentPage + 1)}
                              disabled={pagination.currentPage >= pagination.totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4" />
                      <CardTitle className="text-lg">Order Items</CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {cart.length} item{cart.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-2">Your cart is empty</p>
                        <p className="text-sm text-gray-400">Add products to your order</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        {cart.map((item, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{item.productName}</h4>
                                  <p className="text-xs text-gray-500">{item.optionName}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFromCart(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </Button>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Qty: {item.quantity}</span>
                                <span className="font-medium">¥{(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            </div>
                        ))}

                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center font-semibold">
                            <span>Total:</span>
                            <span>¥{getTotalAmount().toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                  )}

                  <Button
                      className="w-full mt-4"
                      disabled={cart.length === 0}
                      size="lg"
                      onClick={handleCreateOrder}
                  >
                    {isCreatingOrder ? "Creating Order..." : "Order"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  )
}
